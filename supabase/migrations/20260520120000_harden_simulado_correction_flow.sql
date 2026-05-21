-- Harden simulado correction flow and subject updates

DROP POLICY IF EXISTS "Company users can update simulado_subjects" ON public.simulado_subjects;

CREATE POLICY "Coordinators can update simulado_subjects" ON public.simulado_subjects
  FOR UPDATE TO authenticated
  USING (
    simulado_id IN (
      SELECT id FROM public.simulados
      WHERE company_id = get_my_company_id()
    )
    AND (
      has_role(auth.uid(), 'coordinator'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
  WITH CHECK (
    simulado_id IN (
      SELECT id FROM public.simulados
      WHERE company_id = get_my_company_id()
    )
  );

CREATE POLICY "Professors can update assigned simulado_subjects" ON public.simulado_subjects
  FOR UPDATE TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id
      FROM public.teachers t
      JOIN public.profiles p ON p.email = t.email
      WHERE p.id = auth.uid()
        AND t.company_id = get_my_company_id()
    )
    AND has_role(auth.uid(), 'professor'::app_role)
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id
      FROM public.teachers t
      JOIN public.profiles p ON p.email = t.email
      WHERE p.id = auth.uid()
        AND t.company_id = get_my_company_id()
    )
  );

DROP POLICY IF EXISTS "Admins can manage company grades" ON public.grades;
DROP POLICY IF EXISTS "Professors can manage own grades" ON public.grades;

CREATE POLICY "Coordinators can manage company grades" ON public.grades
  FOR ALL TO authenticated
  USING (
    company_id = get_my_company_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'coordinator'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
  WITH CHECK (
    company_id = get_my_company_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'coordinator'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
