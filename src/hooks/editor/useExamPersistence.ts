import { useState, useCallback, useEffect, useRef } from "react";
import { saveEditorContentToDataSources } from "@/lib/editorServices";
import { DemandStatus } from "@/types";
import { showInvokeSuccess } from "@/lib/invokeFunction";

interface UseExamPersistenceOptions {
  demandId?: string;
  examId: string | null;
  content: string;
  setContent: (content: string) => void;
  setSavedContent: (content: string) => void;
  hasUnsavedChanges: boolean;
  isAvulsaExam: boolean;
  isSimSubject: boolean;
  simSubjectId: string | null;
  demandStatus: DemandStatus;
  setDemandStatus: (status: DemandStatus) => void;
  examConfig: any;
  user: any;
  profile: any;
}

export function useExamPersistence({
  demandId,
  examId,
  content,
  setContent,
  setSavedContent,
  hasUnsavedChanges,
  isAvulsaExam,
  isSimSubject,
  simSubjectId,
  demandStatus,
  setDemandStatus,
  examConfig,
  user,
  profile
}: UseExamPersistenceOptions) {
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const examConfigRef = useRef(examConfig);
  const demandStatusRef = useRef(demandStatus);

  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { examConfigRef.current = examConfig; }, [examConfig]);
  useEffect(() => { demandStatusRef.current = demandStatus; }, [demandStatus]);

  const saveToDB = useCallback(async (currentContent: string, currentConfig: any) => {
    const ok = await saveEditorContentToDataSources({
      demandId,
      examId,
      content: currentContent,
      examConfig: currentConfig,
      isAvulsaExam,
      isSimSubject,
      simSubjectId,
      demandStatus: demandStatusRef.current,
      user,
      profile,
    });

    if (ok && isSimSubject && demandStatusRef.current === "pending") {
      setDemandStatus("in_progress");
    }

    return ok;
  }, [demandId, examId, isAvulsaExam, isSimSubject, simSubjectId, user, profile, setDemandStatus]);

  // Auto-save logic
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (!examId && !demandId) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const ok = await saveToDB(contentRef.current, examConfigRef.current);
      if (ok) {
        setSavedContent(contentRef.current);
        showInvokeSuccess("Salvo automaticamente", { duration: 2000 });
      }
    }, 30000);

    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [hasUnsavedChanges, examId, demandId, saveToDB, setSavedContent]);

  // Config persistence
  useEffect(() => {
    if (!examConfig) return;
    const id = examId || demandId;
    if (!id || isSimSubject) return;

    if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current);
    configSaveTimerRef.current = setTimeout(async () => {
       await saveToDB(contentRef.current, examConfigRef.current);
       showInvokeSuccess("Configuração salva", { duration: 1500 });
    }, 1000);

    return () => { if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current); };
  }, [examConfig, examId, demandId, isSimSubject, saveToDB]);

  return { saveToDB };
}
