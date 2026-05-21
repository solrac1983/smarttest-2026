import type { SimuladoStatusCounts, SimuladoWorkflowStatus } from "@/lib/simuladoWorkflow";

export interface SimuladoSubject {
  id: string;
  simulado_id: string;
  subject_name: string;
  question_count: number;
  type: "objetiva" | "discursiva";
  teacher_id: string | null;
  teacher_name?: string;
  sort_order: number;
  status: "pending" | "in_progress" | "submitted" | "approved" | "revision_requested";
  content: string;
  answer_key: string;
  revision_notes: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFormat {
  fontFamily: string;
  fontSize: string;
  columns: "1" | "2";
  margins: "normal" | "narrow" | "wide";
  headerEnabled: boolean;
  footerEnabled: boolean;
  pageNumbering: boolean;
  questionSpacing: "compact" | "normal" | "wide";
}

export const defaultFormat: DocumentFormat = {
  fontFamily: "Times New Roman",
  fontSize: "12",
  columns: "1",
  margins: "normal",
  headerEnabled: true,
  footerEnabled: true,
  pageNumbering: true,
  questionSpacing: "normal",
};

export interface Simulado {
  id: string;
  company_id: string;
  coordinator_id: string;
  title: string;
  class_groups: string[];
  application_date: string | null;
  deadline: string | null;
  status: "draft" | "sent" | "in_progress" | "complete";
  workflow_status: SimuladoWorkflowStatus;
  status_counts: SimuladoStatusCounts;
  announcement: string;
  format: DocumentFormat;
  created_at: string;
  updated_at: string;
  subjects: SimuladoSubject[];
}

export interface SimuladoTeacher {
  id: string;
  name: string;
}

export interface SimuladoClassGroup {
  id: string;
  name: string;
}

export interface SimuladoSubjectOption {
  id: string;
  name: string;
}
