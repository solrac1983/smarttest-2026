import { examTypeLabels, statusLabels } from "@/data/constants";
import { DemandCard } from "@/components/DemandCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  User,
  BookOpen,
  SlidersHorizontal,
  FileText,
  Printer,
  ClipboardList,
  Pencil,
  Trash2,
  Timer,
} from "lucide-react";
import { getExamContent } from "@/data/examContentStore";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Demand, DemandStatus, ExamType } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { CardGridSkeleton } from "@/components/PageSkeleton";
import { getStandaloneExams, subscribeStandaloneExams, loadStandaloneExamsFromDB, resetStandaloneDbCache, type StandaloneExam } from "@/data/examContentStore";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
import { PageHeader } from "@/components/ui/PageHeader";

type ViewMode = "grid" | "list";
type SortField = "deadline" | "createdAt" | "subjectName" | "teacherName" | "status";
type SortDir = "asc" | "desc";

const statusFilters: { label: string; value: DemandStatus | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Enviadas", value: "submitted" },
  { label: "Ajustes", value: "revision_requested" },
];

const examTypeFilters: { label: string; value: ExamType | "all" }[] = [
  { label: "Todos os tipos", value: "all" },
  { label: "Mensal", value: "mensal" },
  { label: "Bimestral", value: "bimestral" },
  { label: "Simulado", value: "simulado" },
  { label: "Recuperação", value: "recuperacao" },
];

const sortOptions: { label: string; value: SortField }[] = [
  { label: "Prazo", value: "deadline" },
  { label: "Criação", value: "createdAt" },
  { label: "Disciplina", value: "subjectName" },
  { label: "Professor", value: "teacherName" },
  { label: "Status", value: "status" },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  submitted: 2,
  revision_requested: 3,
  review: 4,
  approved: 5,
  final: 6,
};

function isOverdue(deadline: string, status: string): boolean {
  return new Date(deadline) < new Date() && !["approved", "final"].includes(status);
}

export default function DemandsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DemandStatus | "all">("all");
  const [examTypeFilter, setExamTypeFilter] = useState<ExamType | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);
  const [deletingExam, setDeletingExam] = useState(false);
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();
  const { companyDemands: baseDemands, loading: demandsLoading } = useCompanyDemands();
  const [standaloneExams, setStandaloneExams] = useState(() => getStandaloneExams());

  useEffect(() => {
    loadStandaloneExamsFromDB().then(() => {
      setStandaloneExams(getStandaloneExams());
    });
    return subscribeStandaloneExams(() => {
      setStandaloneExams(getStandaloneExams());
    });
  }, []);

  const handlePrintExam = useCallback((e: React.MouseEvent, examId: string, title: string) => {
    e.stopPropagation();
    const htmlContent = getExamContent(examId);
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title><style>
      @page { size: A4; margin: 15mm 25mm 20mm 25mm; }
      @media print { body { margin: 0; padding: 0; } }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 10mm 0; }
      h1, h2, h3 { color: #2c3e50; }
      table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
      th, td { border: 1px solid #d1d5db; padding: 1.5mm 3mm; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      hr { border: none; border-top: 1px solid #d1d5db; margin: 4mm 0; }
      .doc-footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #e5e7eb; }
    </style></head><body>${htmlContent}<div class="doc-footer">SmartTest — Documento gerado em ${new Date().toLocaleDateString("pt-BR")}</div></body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { showInvokeError("Permita pop-ups para imprimir."); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  }, []);

  const handleDeleteExam = useCallback(async () => {
    if (!deleteExamId) return;
    setDeletingExam(true);
    try {
      const { error } = await supabase
        .from("standalone_exams")
        .delete()
        .eq("id", deleteExamId);
      if (error) throw error;
      resetStandaloneDbCache();
      await loadStandaloneExamsFromDB(true);
      setStandaloneExams(getStandaloneExams().filter((e) => e.id !== deleteExamId));
      showInvokeSuccess("Avaliação excluída com sucesso.");
    } catch (err) {
      console.error("Error deleting exam:", err);
      showInvokeError("Erro ao excluir avaliação.");
    } finally {
      setDeletingExam(false);
      setDeleteExamId(null);
    }
  }, [deleteExamId]);

  const toggleExamSelection = useCallback((examId: string) => {
    setSelectedExams(prev => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedExams.size === standaloneExams.length) {
      setSelectedExams(new Set());
    } else {
      setSelectedExams(new Set(standaloneExams.map(e => e.id)));
    }
  }, [standaloneExams, selectedExams.size]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedExams.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedExams);
      const { error } = await supabase
        .from("standalone_exams")
        .delete()
        .in("id", ids);
      if (error) throw error;
      resetStandaloneDbCache();
      await loadStandaloneExamsFromDB(true);
      setStandaloneExams(getStandaloneExams().filter(e => !selectedExams.has(e.id)));
      showInvokeSuccess(`${ids.length} avaliação(ões) excluída(s).`);
      setSelectedExams(new Set());
    } catch (err) {
      console.error("Bulk delete error:", err);
      showInvokeError("Erro ao excluir avaliações.");
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  }, [selectedExams]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Filter out approved/final for the active list (they go to Aprovações page)
  const activeDemands = useMemo(() => baseDemands.filter(d => !["approved", "final"].includes(d.status)), [baseDemands]);

  const results = useMemo(() => {
    const filtered = activeDemands.filter((d) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        d.teacherName.toLowerCase().includes(q) ||
        d.subjectName.toLowerCase().includes(q) ||
        d.classGroups.some((c) => c.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesType = examTypeFilter === "all" || d.examType === examTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "deadline":
        case "createdAt":
          cmp = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime();
          break;
        case "subjectName":
        case "teacherName":
          cmp = a[sortField].localeCompare(b[sortField], "pt-BR");
          break;
        case "status":
          cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [activeDemands, search, statusFilter, examTypeFilter, sortField, sortDir]);

  const overdueCount = activeDemands.filter((d) => isOverdue(d.deadline, d.status)).length;
  const pendingCount = activeDemands.filter((d) => d.status === "pending").length;
  const inProgressCount = activeDemands.filter((d) => d.status === "in_progress").length;

  if (demandsLoading) return <CardGridSkeleton cards={4} />;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Avaliações"
        badge="Gestão Acadêmica"
        icon={ClipboardList}
        description="Gerencie e acompanhe o fluxo de elaboração das provas e avaliações escolares."
        actions={
          <Button 
            onClick={() => navigate(role === "professor" ? "/provas/editor" : "/demandas/nova")} 
            size="lg"
            className="bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/10 gap-2 font-bold h-10 md:h-11 px-5 rounded-2xl"
          >
            <Plus className="h-5 w-5" />
            Nova Avaliação
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: activeDemands.length, icon: ClipboardList, light: "bg-blue-500/10", text: "text-blue-600" },
          { label: "Pendentes", value: pendingCount, icon: Clock, light: "bg-amber-500/10", text: "text-amber-600" },
          { label: "Em andamento", value: inProgressCount, icon: Pencil, light: "bg-indigo-500/10", text: "text-indigo-600" },
          { label: "Atrasadas", value: overdueCount, icon: Timer, light: "bg-destructive/10", text: "text-destructive", hidden: overdueCount === 0 },
        ].filter(s => !s.hidden).map((stat, i) => (
          <div key={i} className="surface-elevated p-4 flex items-center gap-4 animate-fade-in border-none shadow-sm" style={{ animationDelay: `${i * 100}ms` }}>
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", stat.light)}>
              <stat.icon className={cn("h-6 w-6", stat.text)} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{stat.label}</p>
              <h4 className="text-2xl font-black text-foreground">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar - More organized */}
      <div className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-5 border-none shadow-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.4fr)_180px_170px_auto] gap-3 flex-1 items-center">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar disciplina, professor ou turma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 bg-secondary/50 border-none focus-visible:ring-primary/20 rounded-xl font-medium"
              />
            </div>

            {/* Exam type filter */}
            <Select value={examTypeFilter} onValueChange={(v) => setExamTypeFilter(v as ExamType | "all")}>
              <SelectTrigger className="w-full h-11 bg-secondary/50 border-none rounded-xl font-medium">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Tipo" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {examTypeFilters.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="rounded-lg">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-full md:w-[150px] h-11 bg-secondary/50 border-none rounded-xl font-medium">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Ordenar" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  {sortOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="rounded-lg">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="secondary"
                size="icon"
                aria-label={sortDir === "asc" ? "Ordenação crescente" : "Ordenação decrescente"}
                className="h-11 w-11 rounded-xl bg-secondary/50 hover:bg-secondary/80"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                title={sortDir === "asc" ? "Crescente" : "Decrescente"}
              >
                {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end">
            <span className="text-xs font-bold text-muted-foreground uppercase mr-2">Visualização</span>
            <div className="flex p-1 bg-secondary/50 rounded-xl">
              <button
                type="button"
                aria-label="Visualização em grade"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  viewMode === "grid"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Visualização em lista"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  viewMode === "list"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status pills - more refined */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">Filtrar Status</span>
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              type="button"
              aria-pressed={statusFilter === sf.value}
              aria-label={`Filtrar por status ${sf.label}`}
              onClick={() => setStatusFilter(sf.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                statusFilter === sf.value
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105"
                  : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {sf.label}
              {sf.value !== "all" && (
                <span className={cn(
                  "ml-2 px-1.5 py-0.5 rounded-md text-[10px]",
                  statusFilter === sf.value ? "bg-white/20" : "bg-secondary text-secondary-foreground"
                )}>
                  {activeDemands.filter((d) => d.status === sf.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          {results.length} {results.length === 1 ? "avaliação encontrada" : "avaliações encontradas"}
        </p>
      </div>

      {/* Empty state */}
      {results.length === 0 && standaloneExams.length === 0 && (
        <div className="surface-elevated flex flex-col items-center justify-center py-20 text-center border-none shadow-sm animate-in fade-in zoom-in duration-300">
          <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Tudo pronto por aqui!</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mb-8 font-medium">
            Nenhuma avaliação pendente para os filtros selecionados. Que tal criar uma nova?
          </p>
          <Button 
            className="rounded-2xl h-12 px-8 font-bold shadow-lg shadow-primary/20 gap-2" 
            onClick={() => navigate(role === "professor" ? "/provas/editor" : "/demandas/nova")}
          >
            <Plus className="h-5 w-5" /> Começar Agora
          </Button>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {results.map((demand) => (
            <DemandCard
              key={demand.id}
              demand={demand}
              onClick={() => navigate(`/demandas/${demand.id}`)}
            />
          ))}
        </div>
      )}

      {viewMode === "list" && results.length > 0 && (
        <div className="surface-elevated overflow-hidden border-none shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/50">
                  <th className="px-6 py-4">
                    <button type="button" aria-label="Ordenar por disciplina" className="flex items-center gap-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => toggleSort("subjectName")}>
                      Disciplina
                      {sortField === "subjectName" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button type="button" aria-label="Ordenar por professor" className="flex items-center gap-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => toggleSort("teacherName")}>
                      Professor
                      {sortField === "teacherName" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button type="button" aria-label="Ordenar por prazo" className="flex items-center gap-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => toggleSort("deadline")}>
                      Prazo
                      {sortField === "deadline" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {results.map((demand) => {
                  const overdue = isOverdue(demand.deadline, demand.status);
                  return (
                    <tr
                      key={demand.id}
                      onClick={() => navigate(`/demandas/${demand.id}`)}
                      className="group hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">{demand.subjectName}</span>
                          <span className="text-xs text-muted-foreground font-medium">{demand.classGroups.join(", ")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                            {demand.teacherName.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{demand.teacherName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold",
                          overdue ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"
                        )}>
                          <Clock className="h-3 w-3" />
                          {new Date(demand.deadline).toLocaleDateString("pt-BR")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                        {examTypeLabels[demand.examType]}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={demand.status} className="px-3 py-1 font-bold" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standalone professor exams — Modern Section */}
      {standaloneExams.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground">Avaliações Avulsas</h3>
                <p className="text-sm text-muted-foreground font-medium">Modelos criados sem demanda prévia</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-pressed={selectedExams.size === standaloneExams.length && standaloneExams.length > 0}
                aria-label={selectedExams.size === standaloneExams.length ? "Desmarcar todas as avaliações avulsas" : "Selecionar todas as avaliações avulsas"}
                className="text-xs font-bold gap-2 rounded-xl h-10 px-4 bg-secondary/50 hover:bg-secondary/80"
                onClick={toggleSelectAll}
              >
                {selectedExams.size === standaloneExams.length ? "Desmarcar tudo" : "Selecionar tudo"}
              </Button>
              {selectedExams.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2 text-xs font-bold rounded-xl h-10 px-4 shadow-lg shadow-destructive/20 animate-in slide-in-from-right-2"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir {selectedExams.size}
                </Button>
              )}
            </div>
          </div>

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {standaloneExams.map((exam) => (
                <div
                  key={exam.id}
                  className={cn(
                    "surface-elevated overflow-hidden border-none shadow-sm transition-all hover:shadow-lg hover:translate-y-[-2px] group relative",
                    selectedExams.has(exam.id) ? "ring-2 ring-primary bg-primary/5" : ""
                  )}
                >
                  <div className="absolute top-4 left-4 z-10">
                    <Checkbox
                      checked={selectedExams.has(exam.id)}
                      onCheckedChange={() => toggleExamSelection(exam.id)}
                      className="rounded-md h-5 w-5 bg-white/80 backdrop-blur-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="p-5 pt-12">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
                        Avulsa
                      </div>
                      <StatusBadge status={exam.status as DemandStatus} className="px-2 py-0.5 border-none shadow-none font-bold" />
                    </div>
                    
                    <h4 className="text-lg font-bold text-foreground mb-4 group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
                      {exam.title}
                    </h4>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-6">
                      <Calendar className="h-3 w-3" />
                      Criada em {new Date(exam.createdAt).toLocaleDateString("pt-BR")}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-[10px] font-bold rounded-xl bg-secondary/80 hover:bg-primary hover:text-white transition-all h-9"
                        onClick={(e) => { e.stopPropagation(); navigate(`/provas/editor/${exam.id}`); }}
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-[10px] font-bold rounded-xl bg-secondary/80 hover:bg-primary hover:text-white transition-all h-9"
                        onClick={(e) => handlePrintExam(e, exam.id, exam.title)}
                      >
                        <Printer className="h-3 w-3" />
                        Imprimir
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-[10px] font-bold rounded-xl bg-secondary/80 hover:bg-destructive hover:text-white transition-all h-9"
                        onClick={(e) => { e.stopPropagation(); setDeleteExamId(exam.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="surface-elevated overflow-hidden border-none shadow-md mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/50">
                      <th className="px-6 py-4 w-10">
                        <Checkbox
                          checked={selectedExams.size === standaloneExams.length && standaloneExams.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-4">Título</th>
                      <th className="px-6 py-4">Criação</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {standaloneExams.map((exam) => (
                      <tr
                        key={exam.id}
                        className={cn(
                          "group hover:bg-primary/5 transition-colors cursor-pointer",
                          selectedExams.has(exam.id) ? "bg-primary/5" : ""
                        )}
                        onClick={() => { navigate(`/provas/editor/${exam.id}`); }}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedExams.has(exam.id)}
                            onCheckedChange={() => toggleExamSelection(exam.id)}
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground group-hover:text-primary transition-colors">
                          <div className="flex flex-col">
                            <span>{exam.title}</span>
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest mt-1">Avulsa</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary/50 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(exam.createdAt).toLocaleDateString("pt-BR")}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={exam.status as DemandStatus} className="px-3 py-1 font-bold inline-flex" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary hover:text-white"
                              onClick={(e) => { e.stopPropagation(); navigate(`/provas/editor/${exam.id}`); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary hover:text-white"
                              onClick={(e) => handlePrintExam(e, exam.id, exam.title)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive hover:text-white"
                              onClick={(e) => { e.stopPropagation(); setDeleteExamId(exam.id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteExamId} onOpenChange={(open) => { if (!open) setDeleteExamId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingExam}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={deletingExam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingExam ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedExams.size} avaliação(ões)?</AlertDialogTitle>
            <AlertDialogDescription>
              As avaliações selecionadas serão excluídas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Excluindo..." : `Excluir ${selectedExams.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
