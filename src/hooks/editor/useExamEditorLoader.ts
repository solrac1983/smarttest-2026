import { useEffect } from "react";
import { loadStandaloneExamsFromDB, getStandaloneExam, saveExamContent, type ExamConfig } from "@/data/examContentStore";
import { fetchDemandEditorRecord, fetchDemandStatusRecord, fetchSimSubjectEditorRecord, fetchSimuladoAnswerKeyRecords, fetchStandaloneExamContent } from "@/lib/editorServices";
import { extractAnswerKeysFromContent } from "@/components/simulados/SimuladoPDFGenerator";
import { DemandStatus } from "@/types";
import type { SubjectSection } from "@/components/editor/AnswerKeyDialog";

interface SimSubjectData {
  subject_name: string;
  question_count: number;
  status: string;
  revision_notes: string | null;
  answer_key: string | null;
  simulado_title?: string;
}

interface UseExamEditorLoaderOptions {
  demandId?: string;
  isSimulado: boolean;
  isSimSubject: boolean;
  isBlankNew: boolean;
  isAvulsaExam: boolean;
  simSubjectId: string | null;
  simuladoId: string | null;
  setContent: (content: string | ((prev: string) => string)) => void;
  setSavedContent: (content: string) => void;
  setIsAvulsaExam: (value: boolean) => void;
  setExamConfig: (value: ExamConfig | null | ((prev: ExamConfig | null) => ExamConfig | null)) => void;
  setDemand: (value: any) => void;
  setSimSubjectData: (value: SimSubjectData | null) => void;
  setSimSubjectLoading: (value: boolean) => void;
  setDemandStatus: (value: DemandStatus) => void;
  setRevisionNote: (value: string) => void;
  setSimuladoAutoAnswers: (value: { questionNum: number; answer: string }[] | undefined) => void;
  setSimuladoSubjectSections: (value: SubjectSection[]) => void;
}

export function useExamEditorLoader({
  demandId,
  isSimulado,
  isSimSubject,
  isBlankNew,
  isAvulsaExam,
  simSubjectId,
  simuladoId,
  setContent,
  setSavedContent,
  setIsAvulsaExam,
  setExamConfig,
  setDemand,
  setSimSubjectData,
  setSimSubjectLoading,
  setDemandStatus,
  setRevisionNote,
  setSimuladoAutoAnswers,
  setSimuladoSubjectSections,
}: UseExamEditorLoaderOptions) {
  useEffect(() => {
    if (!demandId || isSimulado || isSimSubject || isBlankNew) return;

    const load = async () => {
      await loadStandaloneExamsFromDB();
      let exam = getStandaloneExam(demandId);

      if (exam) {
        if (!exam.content) {
          const fullContent = await fetchStandaloneExamContent(demandId);
          exam = { ...exam, content: fullContent };
          saveExamContent(demandId, fullContent);
        }

        setContent(exam.content);
        setSavedContent(exam.content);
        setIsAvulsaExam(true);
        if (exam.config && Object.keys(exam.config).length > 0) {
          setExamConfig(exam.config);
        }
        return;
      }

      if (isAvulsaExam) return;

      const data = await fetchDemandEditorRecord(demandId);
      if (!data) return;

      setDemand(data);
      (window as any).__examPrintDefaults = data.printSettings || null;
      if (data.content) {
        setContent(data.content);
        setSavedContent(data.content);
        saveExamContent(demandId, data.content);
      }
    };

    load();
    return () => { (window as any).__examPrintDefaults = null; };
  }, [demandId, isSimulado, isSimSubject, isBlankNew, isAvulsaExam, setContent, setSavedContent, setIsAvulsaExam, setExamConfig, setDemand]);

  useEffect(() => {
    if (!simSubjectId) return;

    const load = async () => {
      setSimSubjectLoading(true);
      const subData = await fetchSimSubjectEditorRecord(simSubjectId);
      if (subData) {
        setSimSubjectData(subData);
        setContent(subData.content || "");
        setSavedContent(subData.content || "");
        setDemandStatus(subData.status as DemandStatus);
        if (subData.revision_notes) setRevisionNote(subData.revision_notes);
      }
      setSimSubjectLoading(false);
    };

    load();
  }, [simSubjectId, setSimSubjectLoading, setSimSubjectData, setContent, setSavedContent, setDemandStatus, setRevisionNote]);

  useEffect(() => {
    if (!simuladoId) {
      setSimuladoAutoAnswers(undefined);
      setSimuladoSubjectSections([]);
      return;
    }

    const load = async () => {
      const { data, error } = await fetchSimuladoAnswerKeyRecords(simuladoId);
      if (error || !data) {
        setSimuladoAutoAnswers(undefined);
        setSimuladoSubjectSections([]);
        return;
      }

      setSimuladoSubjectSections(
        data.map((subject: any) => ({
          name: subject.subject_name,
          questionCount: subject.type === "discursiva" ? 0 : subject.question_count,
        })),
      );

      const answerMap = extractAnswerKeysFromContent(data as any);
      const mergedAnswers = Array.from(answerMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([questionNum, answer]) => ({ questionNum, answer }));

      setSimuladoAutoAnswers(mergedAnswers.length > 0 ? mergedAnswers : undefined);
    };

    load();
  }, [simuladoId, setSimuladoAutoAnswers, setSimuladoSubjectSections]);

  useEffect(() => {
    if (!demandId || isAvulsaExam || isSimulado || isBlankNew || isSimSubject) return;

    const loadDemandStatus = async () => {
      const data = await fetchDemandStatusRecord(demandId);
      if (data) {
        setDemandStatus(data.status as DemandStatus);
        if (data.notes) setRevisionNote(data.notes);
      }
    };

    loadDemandStatus();
  }, [demandId, isAvulsaExam, isSimulado, isBlankNew, isSimSubject, setDemandStatus, setRevisionNote]);
}
