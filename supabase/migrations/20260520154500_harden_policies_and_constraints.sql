-- Tighten remaining policies and add integrity constraints

ALTER TABLE public.grades
  ADD CONSTRAINT grades_score_non_negative CHECK (score >= 0),
  ADD CONSTRAINT grades_max_score_positive CHECK (max_score > 0),
  ADD CONSTRAINT grades_score_lte_max CHECK (score <= max_score);

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_valid CHECK (status IN ('present', 'absent', 'justified', 'late'));

DROP INDEX IF EXISTS public.attendance_student_id_date_subject_id_key;
DROP INDEX IF EXISTS attendance_student_id_date_subject_id_key;
CREATE UNIQUE INDEX attendance_student_date_subject_unique
  ON public.attendance (student_id, date, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid));

DROP POLICY IF EXISTS "Professors can manage own grades" ON public.grades;
DROP POLICY IF EXISTS "Professors can manage own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert exam comments" ON public.exam_comments;
DROP POLICY IF EXISTS "Users can update exam comments" ON public.exam_comments;

CREATE POLICY "Users can insert exam comments"
  ON public.exam_comments FOR INSERT TO authenticated
  WITH CHECK (
    demand_id IN (
      SELECT id::text FROM public.demands
      WHERE company_id = get_my_company_id()
    )
    AND btrim(author) <> ''
    AND btrim(text) <> ''
  );

CREATE POLICY "Users can update exam comments"
  ON public.exam_comments FOR UPDATE TO authenticated
  USING (
    demand_id IN (
      SELECT id::text FROM public.demands
      WHERE company_id = get_my_company_id()
    )
  )
  WITH CHECK (
    demand_id IN (
      SELECT id::text FROM public.demands
      WHERE company_id = get_my_company_id()
    )
    AND btrim(author) <> ''
    AND btrim(text) <> ''
  );
