-- RPC for safe simulado correction result deletion

CREATE OR REPLACE FUNCTION public.delete_simulado_correction_result(
  _result_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_simulado_id uuid;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'coordinator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas coordenação e administração podem excluir correções.';
  END IF;

  SELECT sr.simulado_id
  INTO v_simulado_id
  FROM public.simulado_results sr
  JOIN public.simulados s ON s.id = sr.simulado_id
  WHERE sr.id = _result_id
    AND s.company_id = public.get_my_company_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resultado de simulado não encontrado para esta empresa.';
  END IF;

  PERFORM public.assert_simulado_ready_for_correction(v_simulado_id);

  DELETE FROM public.grades
  WHERE simulado_result_id = _result_id;

  DELETE FROM public.simulado_results
  WHERE id = _result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_simulado_correction_result(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_simulado_correction_result(uuid) TO authenticated;
