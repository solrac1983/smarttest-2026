import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSimuladoClassGroups,
  fetchSimuladoSubjectOptions,
  fetchSimuladoTeachers,
  fetchSimuladosPage,
} from "@/lib/simuladoQueries";
import {
  createSimulado as createSimuladoMutation,
  deleteSimulado as deleteSimuladoMutation,
  submitSubject as submitSubjectMutation,
  updateAnnouncement as updateAnnouncementMutation,
  updateSimulado as updateSimuladoMutation,
  updateSimuladoStatus as updateSimuladoStatusMutation,
  updateSubjectContent as updateSubjectContentMutation,
  updateSubjectStatus as updateSubjectStatusMutation,
  type CreateSimuladoInput,
  type UpdateSimuladoInput,
} from "@/lib/simuladoMutations";
import {
  type DocumentFormat,
  type Simulado,
  type SimuladoClassGroup,
  type SimuladoSubject,
  type SimuladoSubjectOption,
  type SimuladoTeacher,
} from "@/lib/simuladoTypes";

export function useSimulados() {
  const { user, profile, role } = useAuth();
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [teachers, setSimuladoTeachers] = useState<SimuladoTeacher[]>([]);
  const [classGroups, setSimuladoClassGroups] = useState<SimuladoClassGroup[]>([]);
  const [subjects, setSubjects] = useState<SimuladoSubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSimulados = useCallback(async (pageNum = 0, append = false) => {
    if (!user) return;
    if (!append) setLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const companyId = authUser?.user_metadata?.company_id || profile?.company_id;

      if (!companyId) {
        setLoading(false);
        return;
      }

      const result = await fetchSimuladosPage({
        companyId,
        role,
        professorEmail: profile?.email,
        pageNum,
      });

      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);

      if (append) {
        setSimulados((prev) => [...prev, ...result.simulados]);
      } else {
        setSimulados(result.simulados);
      }

      setPage(result.page);
    } catch (error) {
      console.error("Unexpected error fetching simulados:", error);
    } finally {
      setLoading(false);
    }
  }, [user, role, profile?.email, profile?.company_id]);



  const loadMore = useCallback(() => {
    if (hasMore) {
      fetchSimulados(page + 1, true);
    }
  }, [fetchSimulados, page, hasMore]);

  const fetchSimuladoTeachersList = useCallback(async () => {
    if (!user) return;
    setSimuladoTeachers(await fetchSimuladoTeachers());
  }, [user]);

  const fetchSimuladoClassGroupsList = useCallback(async () => {
    if (!user) return;
    setSimuladoClassGroups(await fetchSimuladoClassGroups());
  }, [user]);

  const fetchSimuladoSubjects = useCallback(async () => {
    if (!user) return;
    setSubjects(await fetchSimuladoSubjectOptions());
  }, [user]);

  useEffect(() => {
    // Initial fetch of everything in parallel
    Promise.all([
      fetchSimulados(0),
      fetchSimuladoTeachersList(),
      fetchSimuladoClassGroupsList(),
      fetchSimuladoSubjects()
    ]);

    // Debounce realtime events to avoid cascading refetches under load
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchSimulados(0), 500);
    };

    const ch1 = supabase
      .channel("simulados-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "simulados" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "simulado_subjects" }, debouncedRefetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(ch1);
    };
  }, [fetchSimulados, fetchSimuladoTeachersList, fetchSimuladoClassGroupsList, fetchSimuladoSubjects]);

  const createSimulado = async (data: CreateSimuladoInput) => {
    if (!profile?.company_id || !user) return null;

    const simRowId = await createSimuladoMutation(data);
    await fetchSimulados(0);
    return simRowId;
  };

  const updateSimuladoStatus = async (id: string, status: string) => {
    await updateSimuladoStatusMutation(id, status);
    await fetchSimulados(0);
  };

  const updateSubjectStatus = async (subjectId: string, status: string, revisionNotes?: string) => {
    await updateSubjectStatusMutation(subjectId, status, revisionNotes);
    await fetchSimulados(0);
  };

  const updateSubjectContent = async (subjectId: string, content: string, answerKey: string) => {
    await updateSubjectContentMutation(subjectId, content, answerKey);
    await fetchSimulados(0);
  };

  const submitSubject = async (subjectId: string, content: string, answerKey: string) => {
    await submitSubjectMutation(subjectId, content, answerKey);
    await fetchSimulados(0);
  };

  const updateAnnouncement = async (simId: string, announcement: string) => {
    await updateAnnouncementMutation(simId, announcement);
    await fetchSimulados(0);
  };

  const deleteSimulado = async (id: string) => {
    await deleteSimuladoMutation(id);
    await fetchSimulados(0);
  };

  const updateSimulado = async (simId: string, data: UpdateSimuladoInput) => {
    await updateSimuladoMutation(simId, data);
    await fetchSimulados(0);
  };

  return {
    simulados,
    teachers,
    classGroups,
    subjects,
    loading,
    hasMore,
    totalCount,
    loadMore,
    createSimulado,
    updateSimuladoStatus,
    updateSubjectStatus,
    updateSubjectContent,
    submitSubject,
    updateAnnouncement,
    deleteSimulado,
    updateSimulado,
    refetch: () => fetchSimulados(0),
  };
}
