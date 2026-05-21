import { supabase } from "@/integrations/supabase/client";
import { saveExamContent, getStandaloneExam, saveStandaloneExamToDB } from "@/data/examContentStore";
import type { ExamConfig, StandaloneExam } from "@/data/examContentStore";

export interface DemandEditorRecord {
  id: string;
  name: string;
  status: string;
  examType: string;
  deadline: string | null;
  classGroups: any[];
  notes: string | null;
  subjectName: string;
  teacherName: string;
  printSettings: any;
  content: string;
}

export interface SimSubjectEditorRecord {
  subject_name: string;
  question_count: number;
  status: string;
  revision_notes: string | null;
  answer_key: string | null;
  content: string;
  simulado_id: string;
  simulado_title: string;
}

export interface SaveEditorContentParams {
  demandId?: string;
  examId: string | null;
  content: string;
  examConfig?: ExamConfig | null;
  isAvulsaExam: boolean;
  isSimSubject: boolean;
  simSubjectId: string | null;
  demandStatus: string;
  user?: { id: string } | null;
  profile?: { company_id?: string | null } | null;
}

export interface HeaderTemplateRecord {
  id: string;
  name: string;
  file_url: string;
  segment: string | null;
  grade: string | null;
}

export async function fetchStandaloneExamContent(id: string) {
  const { data } = await supabase
    .from("standalone_exams")
    .select("content")
    .eq("id", id)
    .maybeSingle();
  return (data as any)?.content || "";
}

export async function fetchHeaderTemplateRecords(): Promise<HeaderTemplateRecord[]> {
  const { data } = await supabase
    .from("template_headers")
    .select("id, name, file_url, segment, grade")
    .order("created_at", { ascending: false });

  return (data as HeaderTemplateRecord[] | null) || [];
}

export async function fetchDemandEditorRecord(demandId: string): Promise<DemandEditorRecord | null> {
  const { data } = await supabase
    .from("demands")
    .select("id, name, status, exam_type, deadline, class_groups, notes, content, print_settings, subjects(name), teachers(name)")
    .eq("id", demandId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    status: data.status,
    examType: data.exam_type,
    deadline: data.deadline,
    classGroups: data.class_groups || [],
    notes: data.notes,
    subjectName: (data as any).subjects?.name || "",
    teacherName: (data as any).teachers?.name || "",
    printSettings: (data as any).print_settings || null,
    content: (data as any).content || "",
  };
}

export async function fetchDemandStatusRecord(demandId: string) {
  const { data } = await supabase
    .from("demands")
    .select("status, notes")
    .eq("id", demandId)
    .maybeSingle();
  return data || null;
}

export async function fetchSimSubjectEditorRecord(simSubjectId: string): Promise<SimSubjectEditorRecord | null> {
  const { data: subData } = await supabase
    .from("simulado_subjects")
    .select("subject_name, question_count, status, revision_notes, answer_key, content, simulado_id")
    .eq("id", simSubjectId)
    .maybeSingle();

  if (!subData) return null;

  const { data: simData } = await supabase
    .from("simulados")
    .select("title")
    .eq("id", subData.simulado_id)
    .maybeSingle();

  return {
    subject_name: subData.subject_name,
    question_count: subData.question_count,
    status: subData.status,
    revision_notes: subData.revision_notes,
    answer_key: subData.answer_key,
    content: subData.content || "",
    simulado_id: subData.simulado_id,
    simulado_title: simData?.title || "",
  };
}

export async function fetchSimuladoAnswerKeyRecords(simuladoId: string) {
  const { data, error } = await supabase
    .from("simulado_subjects")
    .select("id, subject_name, question_count, type, answer_key, content, status, sort_order")
    .eq("simulado_id", simuladoId)
    .order("sort_order", { ascending: true });

  return { data: data || null, error };
}

export async function saveEditorContentToDataSources(params: SaveEditorContentParams) {
  const {
    demandId,
    examId,
    content,
    examConfig,
    isAvulsaExam,
    isSimSubject,
    simSubjectId,
    demandStatus,
    user,
    profile,
  } = params;

  const id = examId || demandId;
  if (!id) return false;

  try {
    if (isSimSubject && simSubjectId) {
      const { error } = await supabase.rpc("save_simulado_subject_progress", {
        _subject_id: simSubjectId,
        _content: content,
        _answer_key: null,
      });

      if (error) throw error;
      return true;
    }

    saveExamContent(id, content);

    if ((isAvulsaExam || !!getStandaloneExam(id)) && user && profile?.company_id) {
      const exam = getStandaloneExam(id);
      if (exam) {
        await saveStandaloneExamToDB({
          ...exam,
          content,
          config: examConfig || undefined,
          updatedAt: new Date().toISOString(),
        }, user.id, profile.company_id);
      }
    }

    if (!isAvulsaExam && demandId && !demandId.startsWith("simulado-")) {
      const { error } = await supabase.rpc("save_demand_content", {
        _demand_id: demandId,
        _content: content,
      });

      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error("saveEditorContentToDataSources error:", err);
    return false;
  }
}

export async function approveEditorDemand(params: {
  demandId?: string;
  examId: string | null;
  isAvulsaExam: boolean;
  content: string;
  examConfig?: ExamConfig | null;
  user?: { id: string } | null;
  profile?: { company_id?: string | null } | null;
  isSimSubject?: boolean;
  simSubjectId?: string | null;
}) {
  const { demandId, examId, isAvulsaExam, content, examConfig, user, profile, isSimSubject, simSubjectId } = params;

  if (isSimSubject && simSubjectId) {
    const { error } = await supabase.rpc("review_simulado_subject", {
      _subject_id: simSubjectId,
      _approve: true,
      _revision_notes: null,
    });

    if (error) throw error;
    return;
  }

  if (demandId && !isAvulsaExam && !demandId.startsWith("simulado-")) {
    const { error } = await supabase.rpc("update_demand_status", {
      _demand_id: demandId,
      _new_status: "approved",
      _notes: null,
    });

    if (error) throw error;
  }

  if (isAvulsaExam) {
    const id = examId || demandId;
    if (id) {
      const exam = getStandaloneExam(id);
      if (exam && user && profile?.company_id) {
        await saveStandaloneExamToDB({
          ...exam,
          content,
          config: examConfig || undefined,
          status: "approved",
          updatedAt: new Date().toISOString(),
        }, user.id, profile.company_id);
      }
    }
  }
}

export async function rejectEditorDemand(demandId: string, rejectionNote: string, options?: { isSimSubject?: boolean; simSubjectId?: string | null }) {
  if (options?.isSimSubject && options.simSubjectId) {
    const { error } = await supabase.rpc("review_simulado_subject", {
      _subject_id: options.simSubjectId,
      _approve: false,
      _revision_notes: rejectionNote,
    });

    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("update_demand_status", {
    _demand_id: demandId,
    _new_status: "revision_requested",
    _notes: rejectionNote,
  });

  if (error) throw error;
}

export async function submitEditorDemand(params: {
  demandId?: string;
  isSimSubject: boolean;
  simSubjectId: string | null;
  content: string;
}) {
  const { demandId, isSimSubject, simSubjectId, content } = params;

  if (isSimSubject && simSubjectId) {
    const { error } = await supabase.rpc("submit_simulado_subject_for_review", {
      _subject_id: simSubjectId,
      _content: content,
      _answer_key: null,
    });

    if (error) throw error;
    return;
  }

  if (demandId && !demandId.startsWith("standalone-") && !demandId.startsWith("simulado-")) {
    const saveResult = await supabase.rpc("save_demand_content", {
      _demand_id: demandId,
      _content: content,
    });
    if (saveResult.error) throw saveResult.error;

    const { error } = await supabase.rpc("update_demand_status", {
      _demand_id: demandId,
      _new_status: "submitted",
      _notes: null,
    });

    if (error) throw error;
  }
}
