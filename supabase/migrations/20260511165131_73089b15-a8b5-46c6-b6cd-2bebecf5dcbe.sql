-- Primeiro, criamos uma função simples para remover tags <script> via regex no Postgres
-- Isso serve como uma camada de defesa básica diretamente no banco de dados
CREATE OR REPLACE FUNCTION public.basic_sanitize_html(html text)
RETURNS text AS $$
BEGIN
  IF html IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove tags <script> e seu conteúdo
  html := regexp_replace(html, '<script[^>]*>.*?</script>', '', 'gi');
  -- Remove atributos on* (event handlers)
  html := regexp_replace(html, '\s+on\w+\s*=\s*["''][^"'']*["'']', '', 'gi');
  -- Remove javascript: pseudo-protocolos
  html := regexp_replace(html, 'href\s*=\s*["'']javascript:[^"'']*["'']', 'href="#"', 'gi');
  
  RETURN html;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para tabela de demandas
CREATE OR REPLACE FUNCTION public.tr_sanitize_demand_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content := public.basic_sanitize_html(NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_demand_content ON public.demands;
CREATE TRIGGER trigger_sanitize_demand_content
BEFORE INSERT OR UPDATE OF content ON public.demands
FOR EACH ROW EXECUTE FUNCTION public.tr_sanitize_demand_content();

-- Trigger para tabela de provas avulsas
CREATE OR REPLACE FUNCTION public.tr_sanitize_standalone_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content := public.basic_sanitize_html(NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_standalone_content ON public.standalone_exams;
CREATE TRIGGER trigger_sanitize_standalone_content
BEFORE INSERT OR UPDATE OF content ON public.standalone_exams
FOR EACH ROW EXECUTE FUNCTION public.tr_sanitize_standalone_content();

-- Trigger para tabela de disciplinas de simulados
CREATE OR REPLACE FUNCTION public.tr_sanitize_simulado_subject_content()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content := public.basic_sanitize_html(NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_simulado_subject_content ON public.simulado_subjects;
CREATE TRIGGER trigger_sanitize_simulado_subject_content
BEFORE INSERT OR UPDATE OF content ON public.simulado_subjects
FOR EACH ROW EXECUTE FUNCTION public.tr_sanitize_simulado_subject_content();
