import { getStandaloneExam, getExamTitle } from "@/data/examContentStore";

export interface ExamEditorRouteContext {
  demandId: string | undefined;
  isBlankNew: boolean;
  isSimulado: boolean;
  isSimSubject: boolean;
  simuladoId: string | null;
  simSubjectId: string | null;
  isStandaloneInitial: boolean;
  standaloneExamTitle?: string;
}

export function resolveExamEditorRouteContext(demandId?: string): ExamEditorRouteContext {
  const isSimSubject = demandId?.startsWith("sim-subject-") ?? false;
  const isSimulado = (demandId?.startsWith("simulado-") ?? false) && !isSimSubject;
  const simSubjectId = isSimSubject && demandId ? demandId.replace("sim-subject-", "") : null;
  const simuladoId = isSimulado && demandId ? demandId.replace("simulado-", "") : null;
  const isStandaloneInitial = Boolean(
    demandId?.startsWith("standalone-") ||
    demandId?.startsWith("sim-avulso-") ||
    (demandId ? getStandaloneExam(demandId) : false),
  );
  const isBlankNew = !demandId;

  return {
    demandId,
    isBlankNew,
    isSimulado,
    isSimSubject,
    simuladoId,
    simSubjectId,
    isStandaloneInitial,
    standaloneExamTitle: demandId ? getExamTitle(demandId) : undefined,
  };
}
