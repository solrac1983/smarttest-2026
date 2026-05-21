-- Harden demands, exam comments, grades and attendance flows

CREATE OR REPLACE FUNCTION public.create_demand(
  _name text,
  _teacher_id uuid,
  _subject_id uuid,
  _class_groups text[],
  _exam_type text,
  _deadline date,
  _application_date date DEFAULT NULL,
  _notes text DEFAULT '',
  _print_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS public.demands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.demands%ROWTYPE;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem criar avaliações.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = _teacher_id
      AND t.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Professor inválido para esta empresa.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = _subject_id
      AND s.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Disciplina inválida para esta empresa.';
  END IF;

  INSERT INTO public.demands (
    company_id,
    coordinator_id,
    name,
    teacher_id,
    subject_id,
    class_groups,
    exam_type,
    deadline,
    application_date,
    notes,
    status,
    print_settings
  )
  VALUES (
    public.get_my_company_id(),
    auth.uid(),
    _name,
    _teacher_id,
    _subject_id,
    COALESCE(_class_groups, '{}'::text[]),
    _exam_type,
    _deadline,
    _application_date,
    COALESCE(_notes, ''),
    'pending',
    COALESCE(_print_settings, '{}'::jsonb)
  )
  RETURNING * INTO v_demand;

  RETURN v_demand;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_demand_status(
  _demand_id uuid,
  _new_status text,
  _notes text DEFAULT NULL
)
RETURNS public.demands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.demands%ROWTYPE;
  v_teacher_id uuid;
BEGIN
  SELECT *
  INTO v_demand
  FROM public.demands
  WHERE id = _demand_id
    AND company_id = public.get_my_company_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avaliação não encontrada para esta empresa.';
  END IF;

  SELECT t.id
  INTO v_teacher_id
  FROM public.teachers t
  JOIN public.profiles p ON p.email = t.email
  WHERE p.id = auth.uid()
    AND t.company_id = public.get_my_company_id()
  LIMIT 1;

  IF public.has_role(auth.uid(), 'professor'::public.app_role) THEN
    IF v_teacher_id IS NULL OR v_demand.teacher_id <> v_teacher_id THEN
      RAISE EXCEPTION 'Apenas o professor responsável pode alterar esta avaliação.';
    END IF;

    IF NOT (
      (v_demand.status = 'pending' AND _new_status = 'in_progress')
      OR (v_demand.status IN ('in_progress', 'revision_requested') AND _new_status = 'submitted')
    ) THEN
      RAISE EXCEPTION 'Transição de status inválida para professor.';
    END IF;
  ELSIF (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    IF NOT (
      (v_demand.status = 'submitted' AND _new_status IN ('revision_requested', 'approved'))
      OR (v_demand.status = 'approved' AND _new_status = 'final')
    ) THEN
      RAISE EXCEPTION 'Transição de status inválida para coordenação/administração.';
    END IF;

    IF _new_status = 'revision_requested' AND COALESCE(btrim(_notes), '') = '' THEN
      RAISE EXCEPTION 'Informe os ajustes solicitados antes de devolver a avaliação.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Usuário sem permissão para atualizar avaliações.';
  END IF;

  UPDATE public.demands
  SET
    status = _new_status,
    notes = CASE WHEN _notes IS NULL THEN notes ELSE _notes END,
    updated_at = now()
  WHERE id = _demand_id
  RETURNING * INTO v_demand;

  RETURN v_demand;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_demand_print_settings(
  _demand_id uuid,
  _print_settings jsonb
)
RETURNS public.demands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.demands%ROWTYPE;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem alterar impressão.';
  END IF;

  UPDATE public.demands
  SET print_settings = COALESCE(_print_settings, '{}'::jsonb),
      updated_at = now()
  WHERE id = _demand_id
    AND company_id = public.get_my_company_id()
  RETURNING * INTO v_demand;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avaliação não encontrada para esta empresa.';
  END IF;

  RETURN v_demand;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_demand_content(
  _demand_id uuid,
  _content text
)
RETURNS public.demands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand public.demands%ROWTYPE;
  v_teacher_id uuid;
BEGIN
  SELECT *
  INTO v_demand
  FROM public.demands
  WHERE id = _demand_id
    AND company_id = public.get_my_company_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avaliação não encontrada para esta empresa.';
  END IF;

  IF public.has_role(auth.uid(), 'professor'::public.app_role) THEN
    SELECT t.id
    INTO v_teacher_id
    FROM public.teachers t
    JOIN public.profiles p ON p.email = t.email
    WHERE p.id = auth.uid()
      AND t.company_id = public.get_my_company_id()
    LIMIT 1;

    IF v_teacher_id IS NULL OR v_demand.teacher_id <> v_teacher_id THEN
      RAISE EXCEPTION 'Apenas o professor responsável pode salvar a avaliação.';
    END IF;

    IF v_demand.status = 'approved' OR v_demand.status = 'final' THEN
      RAISE EXCEPTION 'A avaliação já foi concluída e não pode ser editada pelo professor.';
    END IF;
  ELSIF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Usuário sem permissão para salvar a avaliação.';
  END IF;

  UPDATE public.demands
  SET content = COALESCE(_content, content),
      updated_at = now()
  WHERE id = _demand_id
  RETURNING * INTO v_demand;

  RETURN v_demand;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_exam_comment(
  _demand_id uuid,
  _text text
)
RETURNS public.exam_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment public.exam_comments%ROWTYPE;
  v_author text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.demands d
    WHERE d.id = _demand_id
      AND d.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Avaliação não encontrada para esta empresa.';
  END IF;

  SELECT COALESCE(NULLIF(btrim(full_name), ''), email)
  INTO v_author
  FROM public.profiles
  WHERE id = auth.uid();

  INSERT INTO public.exam_comments (demand_id, author, text, resolved)
  VALUES (_demand_id::text, COALESCE(v_author, 'Usuário'), _text, false)
  RETURNING * INTO v_comment;

  RETURN v_comment;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_exam_comment_resolved(
  _comment_id uuid
)
RETURNS public.exam_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment public.exam_comments%ROWTYPE;
BEGIN
  UPDATE public.exam_comments ec
  SET resolved = NOT ec.resolved
  WHERE ec.id = _comment_id
    AND ec.demand_id IN (
      SELECT d.id::text FROM public.demands d
      WHERE d.company_id = public.get_my_company_id()
    )
  RETURNING * INTO v_comment;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comentário não encontrado para esta empresa.';
  END IF;

  RETURN v_comment;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_exam_comment_safe(
  _comment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.exam_comments ec
  WHERE ec.id = _comment_id
    AND ec.demand_id IN (
      SELECT d.id::text FROM public.demands d
      WHERE d.company_id = public.get_my_company_id()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comentário não encontrado para esta empresa.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_grade(
  _student_id uuid,
  _subject_id uuid,
  _class_group text,
  _grade_type text,
  _bimester text,
  _score numeric,
  _max_score numeric,
  _evaluation_name text,
  _notes text DEFAULT '',
  _simulado_result_id uuid DEFAULT NULL
)
RETURNS public.grades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade public.grades%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id
      AND s.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Aluno inválido para esta empresa.';
  END IF;

  IF _subject_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = _subject_id
      AND s.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Disciplina inválida para esta empresa.';
  END IF;

  IF _score < 0 OR _max_score <= 0 OR _score > _max_score THEN
    RAISE EXCEPTION 'Nota inválida para a escala informada.';
  END IF;

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
    notes,
    recorded_by
  )
  VALUES (
    _student_id,
    public.get_my_company_id(),
    _subject_id,
    COALESCE(_class_group, ''),
    COALESCE(_grade_type, 'manual'),
    COALESCE(_bimester, '1'),
    _score,
    _max_score,
    COALESCE(_evaluation_name, ''),
    _simulado_result_id,
    COALESCE(_notes, ''),
    auth.uid()
  )
  RETURNING * INTO v_grade;

  RETURN v_grade;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_grades_batch(
  _grades jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_count integer := 0;
BEGIN
  IF jsonb_typeof(COALESCE(_grades, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'As notas devem ser enviadas como um array JSON.';
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(_grades, '[]'::jsonb))
  LOOP
    PERFORM public.record_grade(
      (v_item ->> 'student_id')::uuid,
      NULLIF(v_item ->> 'subject_id', '')::uuid,
      COALESCE(v_item ->> 'class_group', ''),
      COALESCE(v_item ->> 'grade_type', 'manual'),
      COALESCE(v_item ->> 'bimester', '1'),
      COALESCE((v_item ->> 'score')::numeric, 0),
      COALESCE((v_item ->> 'max_score')::numeric, 10),
      COALESCE(v_item ->> 'evaluation_name', ''),
      COALESCE(v_item ->> 'notes', ''),
      NULLIF(v_item ->> 'simulado_result_id', '')::uuid
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_grade_safe(
  _grade_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.grades
  WHERE id = _grade_id
    AND company_id = public.get_my_company_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota não encontrada para esta empresa.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_attendance_batch(
  _items jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_count integer := 0;
BEGIN
  IF jsonb_typeof(COALESCE(_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'A frequência deve ser enviada como um array JSON.';
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb))
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = (v_item ->> 'student_id')::uuid
        AND s.company_id = public.get_my_company_id()
    ) THEN
      RAISE EXCEPTION 'Aluno inválido para esta empresa.';
    END IF;

    IF NULLIF(v_item ->> 'subject_id', '') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = NULLIF(v_item ->> 'subject_id', '')::uuid
        AND s.company_id = public.get_my_company_id()
    ) THEN
      RAISE EXCEPTION 'Disciplina inválida para esta empresa.';
    END IF;

    INSERT INTO public.attendance (
      student_id,
      company_id,
      class_group,
      date,
      status,
      subject_id,
      notes,
      recorded_by
    )
    VALUES (
      (v_item ->> 'student_id')::uuid,
      public.get_my_company_id(),
      COALESCE(v_item ->> 'class_group', ''),
      (v_item ->> 'date')::date,
      COALESCE(v_item ->> 'status', 'present'),
      NULLIF(v_item ->> 'subject_id', '')::uuid,
      COALESCE(v_item ->> 'notes', ''),
      auth.uid()
    )
    ON CONFLICT (student_id, date, subject_id)
    DO UPDATE SET
      class_group = EXCLUDED.class_group,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      recorded_by = auth.uid(),
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_demand(text, uuid, uuid, text[], text, date, date, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_demand_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_demand_print_settings(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_demand_content(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_exam_comment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_exam_comment_resolved(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_exam_comment_safe(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_grade(uuid, uuid, text, text, text, numeric, numeric, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_grades_batch(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_grade_safe(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_attendance_batch(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_demand(text, uuid, uuid, text[], text, date, date, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_demand_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_demand_print_settings(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_demand_content(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_exam_comment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_exam_comment_resolved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_exam_comment_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_grade(uuid, uuid, text, text, text, numeric, numeric, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_grades_batch(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_grade_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_attendance_batch(jsonb) TO authenticated;
