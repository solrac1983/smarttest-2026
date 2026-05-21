import { ExamConfig, StandaloneExam } from "@/data/examContentStore";
import { SubjectSection } from "@/components/editor/AnswerKeyDialog";

interface SimSubjectData {
  subject_name: string;
  question_count: number;
  status: string;
  revision_notes: string | null;
  answer_key: string | null;
  simulado_title?: string;
}

interface DemandLike {
  subjectName?: string;
  examType?: string;
}

export function resolveExamEditorDisplayTitle(options: {
  isSimSubject: boolean;
  simSubjectData: SimSubjectData | null;
  isAvulsaExam: boolean;
  standaloneExam?: StandaloneExam;
  demand?: DemandLike | null;
  simuladoTitle?: string;
  examTypeLabels: Record<string, string>;
}) {
  const { isSimSubject, simSubjectData, isAvulsaExam, standaloneExam, demand, simuladoTitle, examTypeLabels } = options;

  if (isSimSubject && simSubjectData) {
    return `${simSubjectData.simulado_title} — ${simSubjectData.subject_name}`;
  }

  if (isAvulsaExam && standaloneExam) {
    return standaloneExam.title;
  }

  if (demand) {
    return `${demand.subjectName} — ${examTypeLabels[demand.examType || ""] || demand.examType}`;
  }

  return simuladoTitle || null;
}

export function resolveAnswerKeyTitle(options: {
  isSimSubject: boolean;
  simSubjectData: SimSubjectData | null;
  isAvulsaExam: boolean;
  standaloneExam?: StandaloneExam;
  demand?: DemandLike | null;
  examTypeLabels: Record<string, string>;
}) {
  const { isSimSubject, simSubjectData, isAvulsaExam, standaloneExam, demand, examTypeLabels } = options;

  if (isSimSubject && simSubjectData) {
    return `${simSubjectData.simulado_title} - ${simSubjectData.subject_name}`;
  }

  if (isAvulsaExam && standaloneExam) {
    return standaloneExam.title;
  }

  if (demand) {
    return `${demand.subjectName} - ${examTypeLabels[demand.examType || ""] || demand.examType}`;
  }

  return "Avaliação";
}

export function resolveAnswerKeySections(options: {
  isSimulado: boolean;
  simuladoSubjectSections: SubjectSection[];
  examSubjectSections: SubjectSection[];
}) {
  const { isSimulado, simuladoSubjectSections, examSubjectSections } = options;
  return isSimulado && simuladoSubjectSections.length > 0 ? simuladoSubjectSections : examSubjectSections;
}
