import { useCallback, useEffect } from "react";
import { fetchHeaderTemplateRecords } from "@/lib/editorServices";
import { numberAIQuestions } from "@/lib/examQuestionUtils";
import { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";

interface UseExamDataOptions {
  demandId?: string;
  setContent: (content: string) => void;
  setStoredAIQuestions: (qs: any) => void;
  setAdaptiveInfo: (info: any) => void;
}

export function useExamData({
  demandId,
  setContent,
  setStoredAIQuestions,
  setAdaptiveInfo
}: UseExamDataOptions) {
  // Session storage handlers
  useEffect(() => {
    // Template content
    const templateContent = sessionStorage.getItem("template-content");
    if (templateContent) {
      sessionStorage.removeItem("template-content");
      setContent(templateContent);
    }

    // AI Generated questions
    const stored = sessionStorage.getItem("ai-generated-questions");
    if (stored) {
      sessionStorage.removeItem("ai-generated-questions");
      try {
        const qs: GeneratedQuestion[] = JSON.parse(stored);
        setStoredAIQuestions((prev: any) => [...prev, ...qs]);
        const html = numberAIQuestions(qs, 1); // logic will be handled better when integrating with full state
        setContent(html); 
      } catch (e) { console.error(e); }

    }

    // Adaptive config
    const adaptiveStored = sessionStorage.getItem("adaptive-exam-config");
    if (adaptiveStored) {
      sessionStorage.removeItem("adaptive-exam-config");
      try { setAdaptiveInfo(JSON.parse(adaptiveStored)); } catch (e) { console.error(e); }
    }
  }, [setContent, setStoredAIQuestions, setAdaptiveInfo]);

  const loadHeaderTemplates = useCallback(async (headersLoaded: boolean, setHeadersLoaded: (v: boolean) => void, setHeaderTemplates: (v: any) => void) => {
    if (headersLoaded) return;
    setHeadersLoaded(true);
    const data = await fetchHeaderTemplateRecords();
    setHeaderTemplates(data);
  }, []);

  return { loadHeaderTemplates };
}
