import { supabase } from "@/integrations/supabase/client";
import {
  deriveSimuladoWorkflowStatus,
  getSimuladoStatusCounts,
  mapWorkflowStatusToLegacyStatus,
} from "@/lib/simuladoWorkflow";
import {
  defaultFormat,
  type DocumentFormat,
  type Simulado,
  type SimuladoSubject,
  type SimuladoClassGroup,
  type SimuladoSubjectOption,
  type SimuladoTeacher,
} from "@/lib/simuladoTypes";

const PAGE_SIZE = 20;

export interface FetchSimuladosResult {
  simulados: Simulado[];
  totalCount: number;
  hasMore: boolean;
  page: number;
}

export async function fetchSimuladosPage(params: {
  companyId: string;
  role: string | null;
  professorEmail?: string | null;
  pageNum?: number;
}): Promise<FetchSimuladosResult> {
  const { companyId, role, professorEmail, pageNum = 0 } = params;
  const from = pageNum * PAGE_SIZE;

  const [countResponse, simResponse] = await Promise.all([
    supabase
      .from("simulados")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("simulados")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
  ]);

  if (simResponse.error) {
    throw simResponse.error;
  }

  const count = countResponse.count || 0;
  const rows = simResponse.data || [];
  const simIds = rows.map((row: any) => row.id);

  let professorTeacherId: string | null = null;
  if (role === "professor" && professorEmail) {
    const { data: teacherRow } = await supabase
      .from("teachers")
      .select("id")
      .eq("email", professorEmail)
      .maybeSingle();
    professorTeacherId = teacherRow?.id || null;
  }

  let subjectsData: any[] = [];
  if (simIds.length > 0) {
    const { data: subs } = await supabase
      .from("simulado_subjects")
      .select("id, simulado_id, subject_name, question_count, type, teacher_id, sort_order, status, content, answer_key, revision_notes, created_at, updated_at, teachers(id, name)")
      .in("simulado_id", simIds)
      .order("sort_order", { ascending: true });
    subjectsData = subs || [];
  }

  const mapped: Simulado[] = rows.map((row: any) => {
    const simSubjects = subjectsData
      .filter((sub: any) => sub.simulado_id === row.id)
      .map((sub: any) => ({
        id: sub.id,
        simulado_id: sub.simulado_id,
        subject_name: sub.subject_name,
        question_count: sub.question_count,
        type: sub.type as SimuladoSubject["type"],
        teacher_id: sub.teacher_id,
        teacher_name: sub.teachers?.name || undefined,
        sort_order: sub.sort_order,
        status: sub.status as SimuladoSubject["status"],
        content: sub.content || "",
        answer_key: sub.answer_key || "",
        revision_notes: sub.revision_notes || "",
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      }));

    const workflowStatus = deriveSimuladoWorkflowStatus(simSubjects);

    return {
      id: row.id,
      company_id: row.company_id,
      coordinator_id: row.coordinator_id,
      title: row.title,
      class_groups: row.class_groups || [],
      application_date: row.application_date,
      deadline: row.deadline,
      status: mapWorkflowStatusToLegacyStatus(workflowStatus),
      workflow_status: workflowStatus,
      status_counts: getSimuladoStatusCounts(simSubjects),
      announcement: row.announcement || "",
      format: (row.format as DocumentFormat) || defaultFormat,
      created_at: row.created_at,
      updated_at: row.updated_at,
      subjects: simSubjects,
    };
  });

  const simulados = role === "professor" && professorTeacherId
    ? mapped
        .map((sim) => {
          const filteredSubjects = sim.subjects.filter((sub) => sub.teacher_id === professorTeacherId);
          const workflowStatus = deriveSimuladoWorkflowStatus(filteredSubjects);

          return {
            ...sim,
            subjects: filteredSubjects,
            workflow_status: workflowStatus,
            status_counts: getSimuladoStatusCounts(filteredSubjects),
            status: mapWorkflowStatusToLegacyStatus(workflowStatus),
          };
        })
        .filter((sim) => sim.subjects.length > 0)
    : mapped;

  return {
    simulados,
    totalCount: count,
    hasMore: rows.length === PAGE_SIZE && from + rows.length < count,
    page: pageNum,
  };
}

export async function fetchSimuladoTeachers(): Promise<SimuladoTeacher[]> {
  const { data } = await supabase.from("teachers").select("id, name").order("name");
  return data || [];
}

export async function fetchSimuladoClassGroups(): Promise<SimuladoClassGroup[]> {
  const { data } = await supabase.from("class_groups").select("id, name").order("name");
  return data || [];
}

export async function fetchSimuladoSubjectOptions(): Promise<SimuladoSubjectOption[]> {
  const { data } = await supabase.from("subjects").select("id, name").order("name");
  return data || [];
}
