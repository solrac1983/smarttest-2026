-- RPCs to harden simulado subject workflow and correction persistence

CREATE OR REPLACE FUNCTION public.get_my_teacher_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.teachers t
  JOIN public.profiles p ON p.email = t.email
  WHERE p.id = auth.uid()
    AND t.company_id = public.get_my_company_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.save_simulado_subject_progress(
  _subject_id uuid,
  _content text,
  _answer_key text DEFAULT NULL
)
RETURNS public.simulado_subjects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid;
  v_subject public.simulado_subjects%ROWTYPE;
BEGIN
  v_teacher_id := public.get_my_teacher_id();

  IF v_teacher_id IS NULL OR NOT public.has_role(auth.uid(), 'professor'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas o professor responsável pode salvar esta disciplina.';
  END IF;

  SELECT *
  INTO v_subject
  FROM public.simulado_subjects
  WHERE id = _subject_id
    AND teacher_id = v_teacher_id
    AND simulado_id IN (
      SELECT id FROM public.simulados WHERE company_id = public.get_my_company_id()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disciplina de simulado não encontrada para este professor.';
  END IF;

  IF v_subject.status = 'approved' THEN
    RAISE EXCEPTION 'A disciplina já foi aprovada e não pode mais ser alterada pelo professor.';
  END IF;

  UPDATE public.simulado_subjects
  SET
    content = COALESCE(_content, content),
    answer_key = COALESCE(_answer_key, answer_key),
    status = CASE
      WHEN status IN ('pending', 'revision_requested') THEN 'in_progress'
      ELSE status
    END,
    updated_at = now()
  WHERE id = _subject_id
  RETURNING * INTO v_subject;

  RETURN v_subject;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_simulado_subject_for_review(
  _subject_id uuid,
  _content text,
  _answer_key text DEFAULT NULL
)
RETURNS public.simulado_subjects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid;
  v_subject public.simulado_subjects%ROWTYPE;
BEGIN
  v_teacher_id := public.get_my_teacher_id();

  IF v_teacher_id IS NULL OR NOT public.has_role(auth.uid(), 'professor'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas o professor responsável pode enviar esta disciplina para revisão.';
  END IF;

  SELECT *
  INTO v_subject
  FROM public.simulado_subjects
  WHERE id = _subject_id
    AND teacher_id = v_teacher_id
    AND simulado_id IN (
      SELECT id FROM public.simulados WHERE company_id = public.get_my_company_id()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disciplina de simulado não encontrada para este professor.';
  END IF;

  IF v_subject.status NOT IN ('pending', 'in_progress', 'revision_requested') THEN
    RAISE EXCEPTION 'A disciplina só pode ser enviada quando estiver pendente, em elaboração ou em revisão.';
  END IF;

  UPDATE public.simulado_subjects
  SET
    content = COALESCE(_content, content),
    answer_key = COALESCE(_answer_key, answer_key),
    status = 'submitted',
    revision_notes = '',
    updated_at = now()
  WHERE id = _subject_id
  RETURNING * INTO v_subject;

  RETURN v_subject;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_simulado_subject(
  _subject_id uuid,
  _approve boolean,
  _revision_notes text DEFAULT NULL
)
RETURNS public.simulado_subjects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject public.simulado_subjects%ROWTYPE;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem revisar disciplinas de simulados.';
  END IF;

  SELECT *
  INTO v_subject
  FROM public.simulado_subjects
  WHERE id = _subject_id
    AND simulado_id IN (
      SELECT id FROM public.simulados WHERE company_id = public.get_my_company_id()
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disciplina de simulado não encontrada para esta empresa.';
  END IF;

  IF v_subject.status <> 'submitted' THEN
    RAISE EXCEPTION 'Apenas disciplinas enviadas podem ser revisadas.';
  END IF;

  IF NOT _approve AND COALESCE(btrim(_revision_notes), '') = '' THEN
    RAISE EXCEPTION 'Informe os ajustes solicitados antes de devolver a disciplina.';
  END IF;

  UPDATE public.simulado_subjects
  SET
    status = CASE WHEN _approve THEN 'approved' ELSE 'revision_requested' END,
    revision_notes = CASE WHEN _approve THEN '' ELSE COALESCE(_revision_notes, '') END,
    updated_at = now()
  WHERE id = _subject_id
  RETURNING * INTO v_subject;

  RETURN v_subject;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_simulado_answer_keys(
  _simulado_id uuid,
  _answer_keys jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject public.simulado_subjects%ROWTYPE;
  v_saved_count integer := 0;
  v_key text;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem consolidar gabaritos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.simulados s
    WHERE s.id = _simulado_id
      AND s.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Simulado não encontrado para esta empresa.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.simulado_subjects ss
    WHERE ss.simulado_id = _simulado_id
      AND (ss.teacher_id IS NULL OR ss.status <> 'approved')
  ) THEN
    RAISE EXCEPTION 'O gabarito só pode ser consolidado após a aprovação de todas as disciplinas atribuídas.';
  END IF;

  FOR v_subject IN
    SELECT *
    FROM public.simulado_subjects ss
    WHERE ss.simulado_id = _simulado_id
      AND ss.type <> 'discursiva'
    ORDER BY ss.sort_order
  LOOP
    v_key := COALESCE(btrim(_answer_keys ->> v_subject.id::text), '');

    IF v_key = '' THEN
      RAISE EXCEPTION 'Preencha o gabarito da disciplina % antes de salvar.', v_subject.subject_name;
    END IF;

    UPDATE public.simulado_subjects
    SET answer_key = v_key,
        updated_at = now()
    WHERE id = v_subject.id;

    v_saved_count := v_saved_count + 1;
  END LOOP;

  RETURN v_saved_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_simulado_ready_for_correction(
  _simulado_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.simulados s
    WHERE s.id = _simulado_id
      AND s.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Simulado não encontrado para esta empresa.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.simulado_subjects ss
    WHERE ss.simulado_id = _simulado_id
      AND ss.teacher_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Todas as disciplinas precisam estar atribuídas antes da correção.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.simulado_subjects ss
    WHERE ss.simulado_id = _simulado_id
      AND ss.status <> 'approved'
  ) THEN
    RAISE EXCEPTION 'Somente simulados finalizados podem ser corrigidos.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.simulado_subjects ss
    WHERE ss.simulado_id = _simulado_id
      AND ss.type <> 'discursiva'
      AND COALESCE(btrim(ss.answer_key), '') = ''
  ) THEN
    RAISE EXCEPTION 'O simulado precisa de gabarito completo antes da correção.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_simulado_correction_result(
  _simulado_id uuid,
  _student_id uuid,
  _answers jsonb,
  _score numeric,
  _correct_count integer,
  _wrong_count integer,
  _total_questions integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id uuid;
  v_company_id uuid;
  v_class_group text;
  v_title text;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem salvar correções.';
  END IF;

  PERFORM public.assert_simulado_ready_for_correction(_simulado_id);

  SELECT s.company_id, s.title
  INTO v_company_id, v_title
  FROM public.simulados s
  WHERE s.id = _simulado_id;

  SELECT st.class_group
  INTO v_class_group
  FROM public.students st
  WHERE st.id = _student_id
    AND st.company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado para a empresa deste simulado.';
  END IF;

  INSERT INTO public.simulado_results (
    simulado_id,
    student_id,
    answers,
    score,
    correct_count,
    wrong_count,
    total_questions,
    updated_at
  )
  VALUES (
    _simulado_id,
    _student_id,
    COALESCE(_answers, '{}'::jsonb),
    _score,
    _correct_count,
    _wrong_count,
    _total_questions,
    now()
  )
  ON CONFLICT (simulado_id, student_id)
  DO UPDATE SET
    answers = EXCLUDED.answers,
    score = EXCLUDED.score,
    correct_count = EXCLUDED.correct_count,
    wrong_count = EXCLUDED.wrong_count,
    total_questions = EXCLUDED.total_questions,
    updated_at = now()
  RETURNING id INTO v_result_id;

  UPDATE public.grades
  SET
    company_id = v_company_id,
    class_group = COALESCE(v_class_group, ''),
    grade_type = 'simulado',
    bimester = '1',
    score = _score / 10,
    max_score = 10,
    evaluation_name = COALESCE(v_title, 'Simulado'),
    recorded_by = auth.uid(),
    updated_at = now()
  WHERE simulado_result_id = v_result_id;

  IF NOT FOUND THEN
    INSERT INTO public.grades (
      student_id,
      company_id,
      subject_id,
      class_group,
      grade_type,
      bimester,
      score,
      max_score,
      evaluation_name,
      simulado_result_id,
      recorded_by
    )
    VALUES (
      _student_id,
      v_company_id,
      NULL,
      COALESCE(v_class_group, ''),
      'simulado',
      '1',
      _score / 10,
      10,
      COALESCE(v_title, 'Simulado'),
      v_result_id,
      auth.uid()
    );
  END IF;

  RETURN v_result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_simulado_correction_results_batch(
  _simulado_id uuid,
  _results jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_saved_count integer := 0;
BEGIN
  IF jsonb_typeof(COALESCE(_results, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Os resultados em lote devem ser enviados como um array JSON.';
  END IF;

  PERFORM public.assert_simulado_ready_for_correction(_simulado_id);

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(_results, '[]'::jsonb))
  LOOP
    PERFORM public.save_simulado_correction_result(
      _simulado_id,
      (v_item ->> 'student_id')::uuid,
      COALESCE(v_item -> 'answers', '{}'::jsonb),
      COALESCE((v_item ->> 'score')::numeric, 0),
      COALESCE((v_item ->> 'correct_count')::integer, 0),
      COALESCE((v_item ->> 'wrong_count')::integer, 0),
      COALESCE((v_item ->> 'total_questions')::integer, 0)
    );
    v_saved_count := v_saved_count + 1;
  END LOOP;

  RETURN v_saved_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_teacher_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_simulado_subject_progress(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_simulado_subject_for_review(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_simulado_subject(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_simulado_answer_keys(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_simulado_ready_for_correction(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_simulado_correction_result(uuid, uuid, jsonb, numeric, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_simulado_correction_results_batch(uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_simulado_subject_progress(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_simulado_subject_for_review(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_simulado_subject(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_simulado_answer_keys(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_simulado_ready_for_correction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_simulado_correction_result(uuid, uuid, jsonb, numeric, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_simulado_correction_results_batch(uuid, jsonb) TO authenticated;
