-- RPCs for structural simulado management and bulk approval

CREATE OR REPLACE FUNCTION public.create_simulado_with_subjects(
  _title text,
  _class_groups text[],
  _application_date date DEFAULT NULL,
  _deadline date DEFAULT NULL,
  _format jsonb DEFAULT '{}'::jsonb,
  _subjects jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_simulado_id uuid;
  v_subject jsonb;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem criar simulados.';
  END IF;

  INSERT INTO public.simulados (
    company_id,
    coordinator_id,
    title,
    class_groups,
    application_date,
    deadline,
    format,
    status
  )
  VALUES (
    public.get_my_company_id(),
    auth.uid(),
    _title,
    COALESCE(_class_groups, '{}'::text[]),
    _application_date,
    _deadline,
    COALESCE(_format, '{}'::jsonb),
    'draft'
  )
  RETURNING id INTO v_simulado_id;

  FOR v_subject IN
    SELECT value FROM jsonb_array_elements(COALESCE(_subjects, '[]'::jsonb))
  LOOP
    INSERT INTO public.simulado_subjects (
      simulado_id,
      subject_name,
      question_count,
      type,
      teacher_id,
      sort_order,
      status
    )
    VALUES (
      v_simulado_id,
      COALESCE(v_subject ->> 'subject_name', ''),
      COALESCE((v_subject ->> 'question_count')::integer, 0),
      COALESCE(v_subject ->> 'type', 'objetiva'),
      NULLIF(v_subject ->> 'teacher_id', '')::uuid,
      COALESCE((v_subject ->> 'sort_order')::integer, 0),
      'pending'
    );
  END LOOP;

  RETURN v_simulado_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_simulado_structure(
  _simulado_id uuid,
  _title text,
  _class_groups text[],
  _application_date date DEFAULT NULL,
  _deadline date DEFAULT NULL,
  _format jsonb DEFAULT '{}'::jsonb,
  _subjects jsonb DEFAULT '[]'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject jsonb;
  v_keep_ids uuid[] := ARRAY[]::uuid[];
  v_processed_count integer := 0;
  v_subject_id uuid;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem editar simulados.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.simulados s
    WHERE s.id = _simulado_id
      AND s.company_id = public.get_my_company_id()
  ) THEN
    RAISE EXCEPTION 'Simulado não encontrado para esta empresa.';
  END IF;

  UPDATE public.simulados
  SET
    title = _title,
    class_groups = COALESCE(_class_groups, '{}'::text[]),
    application_date = _application_date,
    deadline = _deadline,
    format = COALESCE(_format, '{}'::jsonb),
    updated_at = now()
  WHERE id = _simulado_id;

  FOR v_subject IN
    SELECT value FROM jsonb_array_elements(COALESCE(_subjects, '[]'::jsonb))
  LOOP
    v_subject_id := NULLIF(v_subject ->> 'id', '')::uuid;

    IF v_subject_id IS NULL THEN
      INSERT INTO public.simulado_subjects (
        simulado_id,
        subject_name,
        question_count,
        type,
        teacher_id,
        sort_order,
        status
      )
      VALUES (
        _simulado_id,
        COALESCE(v_subject ->> 'subject_name', ''),
        COALESCE((v_subject ->> 'question_count')::integer, 0),
        COALESCE(v_subject ->> 'type', 'objetiva'),
        NULLIF(v_subject ->> 'teacher_id', '')::uuid,
        COALESCE((v_subject ->> 'sort_order')::integer, 0),
        'pending'
      )
      RETURNING id INTO v_subject_id;
    ELSE
      UPDATE public.simulado_subjects
      SET
        subject_name = COALESCE(v_subject ->> 'subject_name', subject_name),
        question_count = COALESCE((v_subject ->> 'question_count')::integer, question_count),
        type = COALESCE(v_subject ->> 'type', type),
        teacher_id = NULLIF(v_subject ->> 'teacher_id', '')::uuid,
        sort_order = COALESCE((v_subject ->> 'sort_order')::integer, sort_order),
        updated_at = now()
      WHERE id = v_subject_id
        AND simulado_id = _simulado_id;
    END IF;

    v_keep_ids := array_append(v_keep_ids, v_subject_id);
    v_processed_count := v_processed_count + 1;
  END LOOP;

  DELETE FROM public.simulado_subjects
  WHERE simulado_id = _simulado_id
    AND NOT (id = ANY(v_keep_ids));

  RETURN v_processed_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_simulado_announcement(
  _simulado_id uuid,
  _announcement text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem editar comunicados.';
  END IF;

  UPDATE public.simulados
  SET announcement = COALESCE(_announcement, ''),
      updated_at = now()
  WHERE id = _simulado_id
    AND company_id = public.get_my_company_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulado não encontrado para esta empresa.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_simulado_with_subjects(
  _simulado_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem excluir simulados.';
  END IF;

  DELETE FROM public.simulados
  WHERE id = _simulado_id
    AND company_id = public.get_my_company_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulado não encontrado para esta empresa.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_all_simulado_subjects(
  _simulado_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_count integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem aprovar disciplinas em lote.';
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
      AND ss.status NOT IN ('submitted', 'approved')
  ) THEN
    RAISE EXCEPTION 'A aprovação em lote só pode ocorrer para disciplinas enviadas ou já aprovadas.';
  END IF;

  UPDATE public.simulado_subjects
  SET status = 'approved',
      revision_notes = '',
      updated_at = now()
  WHERE simulado_id = _simulado_id
    AND status = 'submitted';

  GET DIAGNOSTICS v_pending_count = ROW_COUNT;

  UPDATE public.simulados
  SET status = 'complete',
      updated_at = now()
  WHERE id = _simulado_id;

  RETURN v_pending_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_simulado_with_subjects(text, text[], date, date, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_simulado_structure(uuid, text, text[], date, date, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_simulado_announcement(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_simulado_with_subjects(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_all_simulado_subjects(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_simulado_with_subjects(text, text[], date, date, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_simulado_structure(uuid, text, text[], date, date, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_simulado_announcement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_simulado_with_subjects(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_all_simulado_subjects(uuid) TO authenticated;
