import { useState, useEffect, useMemo, lazy, Suspense, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSimulados } from "@/hooks/useSimulados";
import type { Simulado, SimuladoSubject } from "@/lib/simuladoTypes";
import {
  canApproveAllSimuladoSubjects,
  getPendingApprovalSubjects,
  simuladoWorkflowLabels,
  simuladoWorkflowOrder,
  type SimuladoWorkflowStatus,
} from "@/lib/simuladoWorkflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Plus, BookOpen, ClipboardList, Trophy,
  SlidersHorizontal, Clock, FileText, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import AnswerSheetGenerator from "@/components/simulados/AnswerSheetGenerator";
import AnswerKeyEditor from "@/components/simulados/AnswerKeyEditor";
import CorrectionsTab from "@/components/simulados/CorrectionsTab";
const StandaloneSimuladosTab = lazy(() => import("@/components/simulados/StandaloneSimuladosTab"));
import SimuladoCreateForm from "@/components/simulados/SimuladoCreateForm";
import SimuladoCard from "@/components/simulados/SimuladoCard";
import { RevisionDialog, AnnouncementDialog } from "@/components/simulados/SimuladoDialogs";
import SimuladoEditDialog from "@/components/simulados/SimuladoEditDialog";
import { generateEditableFile, generateConsolidatedPDF, generateAnswerKeyPDF } from "@/components/simulados/SimuladoPDFGenerator";
import { statusLabels } from "@/components/simulados/SimuladoConstants";
import { PageHeader } from "@/components/ui/PageHeader";
import { SimuladosStatsGrid } from "@/components/simulados/SimuladosStatsGrid";
import { SimuladosToolbar } from "@/components/simulados/SimuladosToolbar";
import { SimuladosResultsHeader } from "@/components/simulados/SimuladosResultsHeader";
import { SimuladosResultsView } from "@/components/simulados/SimuladosResultsView";

type ViewMode = "grid" | "list";
type SortField = "deadline" | "created_at" | "title" | "status";
type SortDir = "asc" | "desc";
type SimStatusFilter = "all" | SimuladoWorkflowStatus;

const coordinatorStatusFilters: { label: string; value: SimStatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Estruturação", value: "draft" },
  { label: "Aguardando elaboração", value: "pending" },
  { label: "Em elaboração", value: "in_progress" },
  { label: "Aguardando revisão", value: "submitted" },
  { label: "Ajustes solicitados", value: "revision_requested" },
  { label: "Finalizados", value: "approved" },
];

const professorStatusFilters: { label: string; value: SimStatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Recebidos", value: "pending" },
  { label: "Em elaboração", value: "in_progress" },
  { label: "Devolvidos", value: "revision_requested" },
  { label: "Enviados", value: "submitted" },
  { label: "Aprovados", value: "approved" },
];

const sortOptions: { label: string; value: SortField }[] = [
  { label: "Prazo", value: "deadline" },
  { label: "Criação", value: "created_at" },
  { label: "Título", value: "title" },
  { label: "Status", value: "status" },
];

const statusOrder: Record<SimuladoWorkflowStatus, number> = simuladoWorkflowOrder;

const SimuladoListItem = memo(({ 
  sim, 
  isExpanded,
  onToggle
}: { 
  sim: Simulado, 
  isExpanded: boolean,
  onToggle: () => void
}) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in border-none surface-elevated">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "p-2.5 rounded-xl shrink-0",
            sim.workflow_status === "approved" ? "bg-emerald-500/10 text-emerald-600" :
            sim.workflow_status === "submitted" ? "bg-indigo-500/10 text-indigo-600" :
            sim.workflow_status === "revision_requested" ? "bg-rose-500/10 text-rose-600" :
            sim.workflow_status === "in_progress" ? "bg-blue-500/10 text-blue-600" :
            sim.workflow_status === "pending" ? "bg-amber-500/10 text-amber-600" :
            "bg-muted text-muted-foreground"
          )}>
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-foreground truncate">{sim.title}</h3>
              <Badge className={cn(
                "text-[10px] font-bold px-2 py-0 h-4 uppercase",
                sim.workflow_status === "draft" ? "bg-muted text-muted-foreground" :
                sim.workflow_status === "pending" ? "bg-amber-100 text-amber-700" :
                sim.workflow_status === "in_progress" ? "bg-blue-100 text-blue-700" :
                sim.workflow_status === "submitted" ? "bg-indigo-100 text-indigo-700" :
                sim.workflow_status === "revision_requested" ? "bg-rose-100 text-rose-700" :
                "bg-emerald-100 text-emerald-700"
              )}>
                {statusLabels[sim.workflow_status]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              <span className="flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" /> {sim.class_groups.join(", ")}
              </span>
              <span>•</span>
              <span>{sim.subjects.length} disciplinas</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {sim.deadline ? new Date(sim.deadline).toLocaleDateString("pt-BR") : "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-9 px-4 rounded-xl font-bold text-xs"
            onClick={onToggle}
          >
            {isExpanded ? "Recolher" : "Detalhes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default function SimuladosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const {
    simulados, teachers, classGroups, subjects, loading, hasMore, loadMore, createSimulado,
    updateSubjectStatus,
    updateAnnouncement, updateSimuladoStatus, deleteSimulado, updateSimulado,
  } = useSimulados();

  const isCoordinator = role === "admin" || role === "coordinator" || role === "super_admin";
  const isProfessor = role === "professor";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SimStatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Dialog states
  const [revisionSubject, setRevisionSubject] = useState<SimuladoSubject | null>(null);
  const [announcementSimId, setAnnouncementSimId] = useState<string | null>(null);
  const [announcementInitialText, setAnnouncementInitialText] = useState("");
  const [answerSheetSim, setAnswerSheetSim] = useState<Simulado | null>(null);
  const [answerKeySim, setAnswerKeySim] = useState<Simulado | null>(null);
  const [editingSim, setEditingSim] = useState<Simulado | null>(null);

  // Auto-open subject editor from query param (deep link from profile)
  useEffect(() => {
    if (loading) return;
    const editSubjectId = searchParams.get("editSubject");
    if (editSubjectId) {
      navigate(`/provas/editor/sim-subject-${editSubjectId}`);
      searchParams.delete("editSubject");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const statusFilters = isProfessor ? professorStatusFilters : coordinatorStatusFilters;

  // Filtered & sorted simulados
  const results = useMemo(() => {
    const filtered = simulados.filter((sim) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        sim.title.toLowerCase().includes(q) ||
        sim.class_groups.some((c) => c.toLowerCase().includes(q)) ||
        sim.subjects.some((s) =>
          s.subject_name.toLowerCase().includes(q) ||
          (s.teacher_name || "").toLowerCase().includes(q)
        );
      const matchesStatus = statusFilter === "all" || sim.workflow_status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "deadline":
          cmp = (new Date(a.deadline || "9999").getTime()) - (new Date(b.deadline || "9999").getTime());
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "title":
          cmp = a.title.localeCompare(b.title, "pt-BR");
          break;
        case "status":
          cmp = (statusOrder[a.workflow_status] ?? 99) - (statusOrder[b.workflow_status] ?? 99);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [simulados, search, statusFilter, sortField, sortDir]);

  // Quick stats
  const draftCount = simulados.filter((s) => s.workflow_status === "draft").length;
  const pendingCount = simulados.filter((s) => s.workflow_status === "pending").length;
  const inProgressCount = simulados.filter((s) => s.workflow_status === "in_progress").length;
  const submittedCount = simulados.filter((s) => s.workflow_status === "submitted").length;
  const revisionRequestedCount = simulados.filter((s) => s.workflow_status === "revision_requested").length;
  const completeCount = simulados.filter((s) => s.workflow_status === "approved").length;

  const statusCounts = useMemo(
    () => ({
      draft: draftCount,
      pending: pendingCount,
      in_progress: inProgressCount,
      submitted: submittedCount,
      revision_requested: revisionRequestedCount,
      approved: completeCount,
    }),
    [draftCount, pendingCount, inProgressCount, submittedCount, revisionRequestedCount, completeCount]
  );

  if (loading) return <DashboardSkeleton />;

  /* ---- Handlers ---- */
  const handleProfessorEdit = (sub: SimuladoSubject) => {
    navigate(`/provas/editor/sim-subject-${sub.id}`);
  };

  const handleApprove = async (subjectId: string) => {
    await updateSubjectStatus(subjectId, "approved");
    toast({ title: "Disciplina aprovada!" });
  };

  const handleRequestRevision = async (subjectId: string, notes: string) => {
    await updateSubjectStatus(subjectId, "revision_requested", notes);
    toast({ title: "Revisão solicitada ao professor." });
  };

  const handleApproveAll = async (sim: Simulado) => {
    if (!canApproveAllSimuladoSubjects(sim.subjects)) {
      toast({
        title: "A aprovação em lote só pode ocorrer para disciplinas enviadas.",
        variant: "destructive",
      });
      return;
    }

    const pending = getPendingApprovalSubjects(sim.subjects);
    await Promise.all(pending.map((sub) => updateSubjectStatus(sub.id, "approved")));
    await updateSimuladoStatus(sim.id, "complete");
    toast({ title: `${pending.length} disciplina(s) aprovada(s). Simulado finalizado!` });
  };

  const handleAnnouncement = async (simId: string, text: string) => {
    await updateAnnouncement(simId, text);
    toast({ title: "Comunicado salvo!" });
  };

  const handleGeneratePDF = (sim: Simulado) => {
    if (!generateConsolidatedPDF(sim)) {
      toast({ title: "Nenhuma disciplina aprovada ou pop-ups bloqueados.", variant: "destructive" });
    }
  };

  const handleGenerateAnswerKey = (sim: Simulado) => {
    if (!generateAnswerKeyPDF(sim)) {
      toast({ title: "Nenhuma disciplina aprovada ou pop-ups bloqueados.", variant: "destructive" });
    }
  };

  const handleCreate = async (data: Parameters<typeof createSimulado>[0]) => {
    await createSimulado(data);
    setShowNew(false);
    toast({ title: "Simulado criado com sucesso!" });
  };

  const handleEdit = (sim: Simulado) => {
    setEditingSim(sim);
  };

  const handleSaveEdit = async (simId: string, data: Parameters<typeof updateSimulado>[1]) => {
    await updateSimulado(simId, data);
    toast({ title: `Simulado atualizado com sucesso!` });
  };

  const handleDelete = async (sim: Simulado) => {
    await deleteSimulado(sim.id);
    toast({ title: `Simulado "${sim.title}" excluído com sucesso.` });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* ---- Render list ---- */
  const renderSimuladosList = () => (
    <div className="space-y-4">
      <SimuladosStatsGrid
        simuladosLength={simulados.length}
        isProfessor={isProfessor}
        draftCount={draftCount}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        submittedCount={submittedCount}
        revisionRequestedCount={revisionRequestedCount}
        completeCount={completeCount}
      />

      <SimuladosToolbar
        search={search}
        onSearchChange={setSearch}
        sortField={sortField}
        onSortFieldChange={(value) => setSortField(value as SortField)}
        sortDir={sortDir}
        onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        statusFilters={statusFilters}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => setStatusFilter(value as SimStatusFilter)}
        sortOptions={sortOptions}
        statusCounts={statusCounts}
      />

      <SimuladosResultsHeader resultsCount={results.length} />

      {showNew && isCoordinator && (
        <SimuladoCreateForm
          teachers={teachers}
          classGroups={classGroups}
          dbSubjects={subjects}
          onCancel={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}

      <SimuladosResultsView
        results={results}
        viewMode={viewMode}
        expandedId={expandedId}
        onToggleExpanded={(id) => setExpandedId(expandedId === id ? null : id)}
        isCoordinator={isCoordinator}
        isProfessor={isProfessor}
        onProfessorEdit={handleProfessorEdit}
        onRevision={setRevisionSubject}
        onApprove={handleApprove}
        onApproveAll={handleApproveAll}
        onGenerateFile={(s) => generateEditableFile(s, navigate)}
        onGeneratePDF={handleGeneratePDF}
        onGenerateAnswerKey={handleGenerateAnswerKey}
        onAnnouncement={(s) => { setAnnouncementSimId(s.id); setAnnouncementInitialText(s.announcement || ""); }}
        onAnswerSheet={setAnswerSheetSim}
        onAnswerKeyEditor={setAnswerKeySim}
        onEdit={handleEdit}
        onDelete={handleDelete}
        simuladosLength={simulados.length}
        onCreate={() => setShowNew(true)}
        hasMore={hasMore}
        onLoadMore={loadMore}
        listItem={SimuladoListItem}
      />

      {/* Dialogs */}
      <RevisionDialog
        subject={revisionSubject}
        onClose={() => setRevisionSubject(null)}
        onRequestRevision={handleRequestRevision}
        onApprove={handleApprove}
      />

      <AnnouncementDialog
        simId={announcementSimId}
        initialText={announcementInitialText}
        onClose={() => setAnnouncementSimId(null)}
        onSave={handleAnnouncement}
      />

      <SimuladoEditDialog
        sim={editingSim}
        teachers={teachers}
        classGroups={classGroups}
        dbSubjects={subjects}
        onClose={() => setEditingSim(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="Simulados"
        badge="Gestão Acadêmica"
        icon={ClipboardList}
        description={isProfessor ? "Acompanhe sua fila de elaboração, devoluções e aprovações por disciplina." : "Organize criação, atribuição, revisão e fechamento dos simulados multidisciplinares."}
        actions={isCoordinator && (
          <Button 
            onClick={() => setShowNew(true)} 
            size="lg"
            className="bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/10 gap-2 font-bold h-10 md:h-11 px-5 rounded-2xl"
          >
            <Plus className="h-5 w-5" />
            Novo Simulado
          </Button>
        )}
      />

      {isCoordinator ? (
        <Tabs defaultValue="simulados" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="simulados" className="gap-1.5"><ClipboardList className="h-3 w-3" />Simulados</TabsTrigger>
            <TabsTrigger value="avulsos" className="gap-1.5"><FileText className="h-3 w-3" />Avulsos</TabsTrigger>
            <TabsTrigger value="correcoes" className="gap-1.5"><Trophy className="h-3 w-3" />Correções</TabsTrigger>
          </TabsList>
          <TabsContent value="simulados">{renderSimuladosList()}</TabsContent>
          <TabsContent value="avulsos"><Suspense fallback={<div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-lg bg-muted animate-pulse"/>)}</div>}><StandaloneSimuladosTab /></Suspense></TabsContent>
          <TabsContent value="correcoes"><CorrectionsTab simulados={simulados} /></TabsContent>
        </Tabs>
      ) : (
        renderSimuladosList()
      )}

      {answerSheetSim && (
        <AnswerSheetGenerator sim={answerSheetSim} open={!!answerSheetSim} onOpenChange={(open) => !open && setAnswerSheetSim(null)} />
      )}
      {answerKeySim && (
        <AnswerKeyEditor sim={answerKeySim} open={!!answerKeySim} onOpenChange={(open) => !open && setAnswerKeySim(null)} onSaved={() => setAnswerKeySim(null)} />
      )}
    </div>
  );
}
