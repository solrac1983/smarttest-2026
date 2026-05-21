import type { Simulado, SimuladoSubject } from "@/lib/simuladoTypes";

export type SimuladoWorkflowStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "submitted"
  | "revision_requested"
  | "approved";

export type WorkflowSubjectLike = Pick<SimuladoSubject, "status" | "teacher_id">;
export type CorrectionSubjectLike = Pick<SimuladoSubject, "status" | "teacher_id" | "type" | "answer_key" | "subject_name">;
export type SimuladoStatusCounts = Record<SimuladoSubject["status"], number>;

export const simuladoWorkflowLabels: Record<SimuladoWorkflowStatus, string> = {
  draft: "Estruturação",
  pending: "Aguardando elaboração",
  in_progress: "Em elaboração",
  submitted: "Aguardando revisão",
  revision_requested: "Ajustes solicitados",
  approved: "Finalizado",
};

export const simuladoWorkflowColors: Record<SimuladoWorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  submitted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  revision_requested: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export const simuladoWorkflowOrder: Record<SimuladoWorkflowStatus, number> = {
  draft: 0,
  pending: 1,
  in_progress: 2,
  submitted: 3,
  revision_requested: 4,
  approved: 5,
};

export function createEmptySimuladoStatusCounts(): SimuladoStatusCounts {
  return {
    pending: 0,
    in_progress: 0,
    submitted: 0,
    approved: 0,
    revision_requested: 0,
  };
}

export function getSimuladoStatusCounts(subjects: Pick<SimuladoSubject, "status">[] = []): SimuladoStatusCounts {
  return subjects.reduce<SimuladoStatusCounts>((acc, subject) => {
    acc[subject.status] += 1;
    return acc;
  }, createEmptySimuladoStatusCounts());
}

export function deriveSimuladoWorkflowStatus(subjects: WorkflowSubjectLike[] = []): SimuladoWorkflowStatus {
  if (subjects.length === 0) {
    return "draft";
  }

  const hasUnassignedSubjects = subjects.some((subject) => !subject.teacher_id);
  if (hasUnassignedSubjects) {
    return "draft";
  }

  const counts = getSimuladoStatusCounts(subjects);
  const total = subjects.length;

  if (counts.approved === total) {
    return "approved";
  }

  if (counts.revision_requested > 0) {
    return "revision_requested";
  }

  if (counts.submitted > 0) {
    return "submitted";
  }

  if (counts.in_progress > 0) {
    return "in_progress";
  }

  if (counts.pending === total) {
    return "pending";
  }

  if (counts.approved > 0) {
    return "in_progress";
  }

  return "pending";
}

export function mapWorkflowStatusToLegacyStatus(status: SimuladoWorkflowStatus): Simulado["status"] {
  switch (status) {
    case "draft":
      return "draft";
    case "pending":
    case "submitted":
      return "sent";
    case "in_progress":
    case "revision_requested":
      return "in_progress";
    case "approved":
      return "complete";
    default:
      return "draft";
  }
}

export function mapLegacyStatusToWorkflowStatus(status: Simulado["status"]): SimuladoWorkflowStatus {
  switch (status) {
    case "draft":
      return "draft";
    case "sent":
      return "pending";
    case "in_progress":
      return "in_progress";
    case "complete":
      return "approved";
    default:
      return "draft";
  }
}

export function canApproveAllSimuladoSubjects(subjects: Pick<SimuladoSubject, "status">[] = []): boolean {
  return subjects.length > 0 && subjects.every((subject) => ["submitted", "approved"].includes(subject.status));
}

export function getPendingApprovalSubjects<T extends Pick<SimuladoSubject, "status">>(subjects: T[] = []): T[] {
  return subjects.filter((subject) => subject.status === "submitted");
}

export function hasSubjectAnswerKey(subject: Pick<SimuladoSubject, "type" | "answer_key">): boolean {
  if (subject.type === "discursiva") {
    return true;
  }

  return Boolean(subject.answer_key?.trim());
}

export function getSubjectsMissingAnswerKey<T extends CorrectionSubjectLike>(subjects: T[] = []): T[] {
  return subjects.filter((subject) => !hasSubjectAnswerKey(subject));
}

export function isSimuladoReadyForCorrection(subjects: CorrectionSubjectLike[] = []): boolean {
  if (deriveSimuladoWorkflowStatus(subjects) !== "approved") {
    return false;
  }

  return getSubjectsMissingAnswerKey(subjects).length === 0;
}

export function getSimuladoCorrectionBlockReason(subjects: CorrectionSubjectLike[] = []): string | null {
  if (subjects.length === 0) {
    return "Adicione disciplinas ao simulado antes de liberar a correção.";
  }

  if (subjects.some((subject) => !subject.teacher_id)) {
    return "Atribua professores a todas as disciplinas antes de liberar a correção.";
  }

  if (deriveSimuladoWorkflowStatus(subjects) !== "approved") {
    return "Somente simulados finalizados podem ser corrigidos.";
  }

  const missingAnswerKeySubjects = getSubjectsMissingAnswerKey(subjects);
  if (missingAnswerKeySubjects.length > 0) {
    const subjectNames = missingAnswerKeySubjects
      .map((subject) => subject.subject_name)
      .filter(Boolean)
      .join(", ");

    return subjectNames
      ? `Preencha o gabarito das disciplinas objetivas antes de corrigir: ${subjectNames}.`
      : "Preencha o gabarito das disciplinas objetivas antes de corrigir.";
  }

  return null;
}
