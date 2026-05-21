import { useState, useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  loadStandaloneExamsFromDB,
  getStandaloneExams,
  subscribeStandaloneExams,
  deleteStandaloneExamFromCache,
  type StandaloneExam,
} from "@/data/examContentStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Pencil,
  Trash2,
  Clock,
  BookOpen,
  Loader2,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const statusMap: Record<string, { label: string; className: string; icon: any }> = {
  in_progress: { label: "Em elaboração", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  approved: { label: "Finalizado", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
};

export default function StandaloneSimuladosTab() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StandaloneExam | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const exams = useSyncExternalStore(subscribeStandaloneExams, getStandaloneExams);
  
  useEffect(() => {
    loadStandaloneExamsFromDB().then(() => setLoaded(true));
  }, []);

  const filtered = exams.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const inProgressCount = exams.filter(e => e.status === "in_progress").length;
  const approvedCount = exams.filter(e => e.status === "approved").length;

  const handleDelete = async (exam: StandaloneExam) => {
    await supabase.from("standalone_exams" as any).delete().eq("id", exam.id);
    deleteStandaloneExamFromCache(exam.id);
    setDeleteTarget(null);
    toast({ title: `"${exam.title}" excluído.` });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await supabase.from("standalone_exams" as any).delete().in("id", ids);
      ids.forEach(id => deleteStandaloneExamFromCache(id));
      toast({ title: `${ids.length} simulado(s) excluído(s).` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setShowBulkDelete(false);
    }
  };

  if (!loaded) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse border border-border" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", count: exams.length, color: "text-blue-600", icon: Layers },
            { label: "Em elaboração", count: inProgressCount, color: "text-amber-600", icon: Clock },
            { label: "Finalizados", count: approvedCount, color: "text-emerald-600", icon: CheckCircle2 },
            { label: "Selecionados", count: selectedIds.size, color: "text-primary", icon: Checkbox, isCheckbox: true },
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-2xl font-bold font-display tracking-tight", stat.color)}>{stat.count}</span>
                <stat.icon className={cn("h-4 w-4", stat.color, "opacity-70")} />
              </div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir simulado avulso?</AlertDialogTitle>
              <AlertDialogDescription>
                O simulado "{deleteTarget?.title}" será excluído permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selectedIds.size} simulado(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Os simulados selecionados serão excluídos permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? "Excluindo..." : `Excluir ${selectedIds.size}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border/60 focus:ring-primary/20 transition-all rounded-lg"
              />
            </div>
            {exams.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg border border-border/40 transition-all hover:bg-muted/60">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="text-xs font-medium cursor-pointer select-none text-muted-foreground whitespace-nowrap">
                  Selecionar todos
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 shadow-sm"
                    onClick={() => setShowBulkDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir {selectedIds.size}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Button 
              className="gap-2 font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary px-4" 
              onClick={() => navigate("/simulados/novo-avulso")}
            >
              <Plus className="h-4 w-4" />
              Novo Avulso
            </Button>
          </div>
        </div>

        {/* Found count */}
        {search && (
          <div className="flex items-center gap-1.5 px-1">
            <Sparkles className="h-3 w-3 text-primary/60" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* List/Grid */}
        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-16 text-center bg-muted/5 border-dashed border-2">
            <div className="p-5 rounded-full bg-muted/20 mb-4 animate-pulse">
              <BookOpen className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground/80 tracking-tight">Nenhum simulado avulso</h3>
            <p className="text-sm text-muted-foreground max-w-[320px] mt-1 mx-auto">
              Crie provas personalizadas importando seus próprios arquivos ou usando nossos modelos.
            </p>
            <Button 
              variant="outline" 
              className="mt-6 gap-2 font-semibold"
              onClick={() => navigate("/simulados/novo-avulso")}
            >
              Criar meu primeiro avulso
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((exam, index) => {
                const st = statusMap[exam.status] || statusMap.in_progress;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    key={exam.id}
                  >
                    <Card
                      className={cn(
                        "group relative flex flex-col h-full border border-border bg-card overflow-hidden hover:shadow-lg transition-all duration-300",
                        selectedIds.has(exam.id) && "ring-2 ring-primary border-transparent shadow-md"
                      )}
                      onClick={() => navigate(`/provas/editor/${exam.id}`)}
                    >
                      {/* Selection Overlay */}
                      <div className="absolute top-3 left-3 z-10">
                        <Checkbox
                          checked={selectedIds.has(exam.id)}
                          onCheckedChange={() => toggleSelection(exam.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "transition-opacity",
                            selectedIds.has(exam.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        />
                      </div>

                      {/* Content */}
                      <div className="p-5 pt-10 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-primary/5 text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors" title={exam.title}>
                              {exam.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(exam.updatedAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider gap-1 border shadow-none", st.className)}>
                            <st.icon className="h-3 w-3" />
                            {st.label}
                          </Badge>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/provas/editor/${exam.id}`); }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar conteúdo</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(exam); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir permanentemente</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>

                      {/* Footer Link */}
                      <div className="mt-auto border-t border-border/40 bg-muted/20 px-5 py-3 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Acessar Editor</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
