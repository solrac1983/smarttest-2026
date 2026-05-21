-- Atualiza a função de sanitização com search_path seguro e revoga execução pública
ALTER FUNCTION public.basic_sanitize_html(text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.basic_sanitize_html(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.basic_sanitize_html(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.basic_sanitize_html(text) TO service_role;

-- Atualiza triggers com search_path seguro
ALTER FUNCTION public.tr_sanitize_demand_content() SET search_path = public;
ALTER FUNCTION public.tr_sanitize_standalone_content() SET search_path = public;
ALTER FUNCTION public.tr_sanitize_simulado_subject_content() SET search_path = public;
