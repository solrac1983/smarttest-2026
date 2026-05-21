import { supabase } from "@/integrations/supabase/client";
import type { DocumentFormat } from "@/lib/simuladoTypes";

export interface CreateSimuladoInput {
  title: string;
  class_groups: string[];
  application_date?: string;
  deadline?: string;
  format: DocumentFormat;
  subjects: {
    subject_name: string;
    question_count: number;
    type: string;
    teacher_id: string | null;
    sort_order: number;
  }[];
}

export interface UpdateSimuladoInput {
  title: string;
  class_groups: string[];
  application_date: string | null;
  deadline: string | null;
  format: DocumentFormat;
  subjects: {
    id: string;
    subject_name: string;
    question_count: number;
    type: string;
    teacher_id: string;
    isNew?: boolean;
  }[];
}

export async function createSimulado(data: CreateSimuladoInput) {
  const { data: simRowId, error } = await supabase.rpc("create_simulado_with_subjects", {
    _title: data.title,
    _class_groups: data.class_groups,
    _application_date: data.application_date || null,
    _deadline: data.deadline || null,
    _format: data.format as any,
    _subjects: data.subjects,
  });

  if (error || !simRowId) {
    throw error || new Error("Erro ao criar simulado.");
  }

  return simRowId;
}

export async function updateSimuladoStatus(id: string, status: string) {
  if (status !== "complete") {
    throw new Error("Transição de status de simulado não suportada pelo fluxo seguro.");
  }

  const { error } = await supabase.rpc("approve_all_simulado_subjects", {
    _simulado_id: id,
  });

  if (error) throw error;
}

export async function updateSubjectStatus(subjectId: string, status: string, revisionNotes?: string) {
  if (!["approved", "revision_requested"].includes(status)) {
    throw new Error("Transição de disciplina não suportada pelo fluxo seguro.");
  }

  const { error } = await supabase.rpc("review_simulado_subject", {
    _subject_id: subjectId,
    _approve: status === "approved",
    _revision_notes: revisionNotes ?? null,
  });

  if (error) throw error;
}

export async function updateSubjectContent(subjectId: string, content: string, answerKey: string) {
  const { error } = await supabase.rpc("save_simulado_subject_progress", {
    _subject_id: subjectId,
    _content: content,
    _answer_key: answerKey || null,
  });

  if (error) throw error;
}

export async function submitSubject(subjectId: string, content: string, answerKey: string) {
  const { error } = await supabase.rpc("submit_simulado_subject_for_review", {
    _subject_id: subjectId,
    _content: content,
    _answer_key: answerKey || null,
  });

  if (error) throw error;
}

export async function updateAnnouncement(simId: string, announcement: string) {
  const { error } = await supabase.rpc("update_simulado_announcement", {
    _simulado_id: simId,
    _announcement: announcement,
  });

  if (error) throw error;
}

export async function deleteSimulado(id: string) {
  const { error } = await supabase.rpc("delete_simulado_with_subjects", {
    _simulado_id: id,
  });

  if (error) throw error;
}

export async function updateSimulado(simId: string, data: UpdateSimuladoInput) {
  const payload = data.subjects.map((subject, index) => ({
    id: subject.isNew ? null : subject.id,
    subject_name: subject.subject_name,
    question_count: subject.question_count,
    type: subject.type,
    teacher_id: subject.teacher_id || null,
    sort_order: index,
  }));

  const { error } = await supabase.rpc("update_simulado_structure", {
    _simulado_id: simId,
    _title: data.title,
    _class_groups: data.class_groups,
    _application_date: data.application_date,
    _deadline: data.deadline,
    _format: data.format as any,
    _subjects: payload,
  });

  if (error) throw error;
}
