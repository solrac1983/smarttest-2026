import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BIMESTERS } from "@/data/constants";
import { useQuestions } from "@/hooks/useQuestions";
import { QuestionBankItem } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { RichEditor } from "@/components/editor/RichEditor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Search,
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Filter,
  BookOpen,
  Sparkles,
  Loader2,
  List,
  LayoutGrid, Database,
} from "lucide-react";
import type { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";
import { supabase } from "@/integrations/supabase/client";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
import { PageHeader } from "@/components/ui/PageHeader";

const difficultyLabels: Record<string, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

const difficultyStyles: Record<string, string> = {
  facil: "bg-emerald-500/10 text-emerald-600",
  media: "bg-amber-500/10 text-amber-600",
  dificil: "bg-destructive/10 text-destructive",
};

const emptyForm = {
  subjectId: "",
  subjectName: "",
  classGroup: "",
  bimester: "",
  topic: "",
  grade: "",
  content: "",
  type: "objetiva" as "objetiva" | "discursiva",
  difficulty: "media" as "facil" | "media" | "dificil",
  tags: [] as string[],
};

export default function QuestionBankPage() {
  const { questions, loading, createQuestion, updateQuestion, deleteQuestion, bulkInsert } = useQuestions();
  const navigate = useNavigate();
  const { profile, role: authRole, user } = useAuth();

  // Fetch subjects from DB for filters/form
  const [dbSubjects, setDbSubjects] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from("subjects").select("id, name").order("name").then(({ data }) => {
      setDbSubjects(data || []);
    });
  }, []);

  // Fetch class groups from DB for filters/form
  const [dbClassGroups, setDbClassGroups] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("class_groups").select("name").order("name").then(({ data }) => {
      const names = (data || []).map((c: any) => c.name);
      setDbClassGroups(names.length > 0 ? names : []);
    });
  }, []);

  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterBimester, setFilterBimester] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterTag, setFilterTag] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [viewingQuestion, setViewingQuestion] = useState<QuestionBankItem | null>(null);

  // Pick up AI-generated questions from sessionStorage
  const [aiProcessed, setAiProcessed] = useState(false);
  useEffect(() => {
    if (aiProcessed) return;
    const stored = sessionStorage.getItem("ai-generated-questions");
    if (stored) {
      sessionStorage.removeItem("ai-generated-questions");
      setAiProcessed(true);
      try {
        const qs: GeneratedQuestion[] = JSON.parse(stored);
        const items = qs.map((q) => {
          // Build options with letters
          const optionsHTML = q.options && q.options.length > 0
            ? q.options.map((o, idx) => `<p>${String.fromCharCode(65 + idx)}) ${o}</p>`).join("")
            : "";

          // Build answer key (gabarito) section
          let gabaritoHTML = "";
          if (q.type === "objetiva" && q.options?.length) {
            const idx = q.options.findIndex(opt => opt.trim() === q.answer.trim());
            const letter = idx >= 0 ? String.fromCharCode(65 + idx) : (q.answer.match(/^([A-E])/i)?.[1]?.toUpperCase() || q.answer);
            gabaritoHTML = `<p><strong>Gabarito:</strong> ${letter}</p>`;
          } else if (q.type === "verdadeiro_falso") {
            gabaritoHTML = `<p><strong>Gabarito:</strong> ${q.answer}</p>`;
          } else {
            gabaritoHTML = `<p><strong>Gabarito:</strong> ${q.answer}</p>`;
          }

          return {
            subjectName: q.subjectId ? (dbSubjects.find(s => s.id === q.subjectId)?.name || "IA") : "IA",
            classGroup: q.grade || "",
            bimester: "",
            topic: q.topic,
            grade: q.grade || "",
            content: q.content + optionsHTML + gabaritoHTML,
            type: q.type === "objetiva" ? "objetiva" : "discursiva",
            difficulty: q.difficulty,
            tags: [...(q.tags || []), "IA"].filter(Boolean),
          };
        });
        bulkInsert(items).then((ok) => {
          if (ok) showInvokeSuccess(`${items.length} questão(ões) inserida(s) da IA!`);
          else showInvokeError("Erro ao inserir questões da IA.");
        });
      } catch (e) { console.error("Error processing AI questions:", e); }
    }
  }, [dbSubjects, aiProcessed]);

  // Filtering
  const filtered = useMemo(() => questions.filter((q) => {
    if (filterSubject !== "all" && q.subjectName !== filterSubject) return false;
    if (filterClass !== "all" && q.classGroup !== filterClass) return false;
    if (filterBimester !== "all" && q.bimester !== filterBimester) return false;
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
    if (filterTag !== "all" && !q.tags.includes(filterTag)) return false;

    if (search) {
      const s = search.toLowerCase();
      return (
        q.content.toLowerCase().includes(s) ||
        q.subjectName.toLowerCase().includes(s) ||
        q.topic.toLowerCase().includes(s) ||
        q.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    return true;
  }), [questions, filterSubject, filterClass, filterBimester, filterDifficulty, filterTag, search]);

  const allTags = useMemo(() => [...new Set(questions.flatMap((q) => q.tags))], [questions]);

  // CRUD handlers
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setTagInput("");
    setDialogOpen(true);
  };

  const openEdit = (q: QuestionBankItem) => {
    setEditingId(q.id);
    setForm({
      subjectId: q.subjectId,
      subjectName: q.subjectName,
      classGroup: q.classGroup,
      bimester: q.bimester,
      topic: q.topic,
      grade: q.grade,
      content: q.content,
      type: q.type,
      difficulty: q.difficulty,
      tags: [...q.tags],
    });
    setTagInput("");
    setDialogOpen(true);
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const ok = await deleteQuestion(deleteId);
      if (ok) showInvokeSuccess("Questão excluída com sucesso!");
      else showInvokeError("Erro ao excluir questão.");
    }
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const handleSave = async () => {
    if (!form.classGroup || !form.bimester || !form.content.trim()) {
      showInvokeError("Preencha todos os campos obrigatórios.");
      return;
    }

    const subjectName = form.subjectName || dbSubjects.find(s => s.id === form.subjectId)?.name || "";

    setSaving(true);
    if (editingId) {
      const ok = await updateQuestion(editingId, { ...form, subjectName });
      if (ok) showInvokeSuccess("Questão atualizada com sucesso!");
      else showInvokeError("Erro ao atualizar questão.");
    } else {
      const row = await createQuestion({ ...form, subjectName });
      if (row) showInvokeSuccess("Questão adicionada com sucesso!");
      else showInvokeError("Erro ao adicionar questão.");
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const clearFilters = () => {
    setFilterSubject("all");
    setFilterClass("all");
    setFilterBimester("all");
    setFilterDifficulty("all");
    setFilterTag("all");
    setSearch("");
  };

  const hasActiveFilters =
    filterSubject !== "all" || filterClass !== "all" || filterBimester !== "all" || filterDifficulty !== "all" || filterTag !== "all" || search !== "";

  // Unique subject names from questions for filter
  const subjectNamesForFilter = useMemo(() => [...new Set(questions.map(q => q.subjectName).filter(Boolean))].sort(), [questions]);

  // Group by subject for kanban
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, QuestionBankItem[]> = {};
    filtered.forEach((q) => {
      const key = q.subjectName || "Sem disciplina";
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <PageHeader
        title="Banco de Questões"
        badge="Acervo de Conteúdo"
        icon={Database}
        description={`Gerencie, pesquise e reutilize questões — ${filtered.length} questão(ões) encontrada(s).`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="secondary"
              onClick={() => navigate("/ai-questoes?return=/banco-questoes")} 
              className="gap-1.5 shadow-md bg-white text-primary hover:bg-white/90 h-10 rounded-xl"
            >
              <Sparkles className="h-4 w-4" />
              Gerar com IA
            </Button>
            <Button 
              variant="secondary"
              onClick={openNew} 
              className="gap-1.5 shadow-md bg-white text-primary hover:bg-white/90 h-10 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              Nova Questão
            </Button>
          </div>
        }
      />

      <div className="surface-elevated rounded-[2rem] p-5 md:p-6 shadow-md space-y-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Navegação do acervo</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-[2rem]">
              Filtre, compare e encontre conteúdo com mais clareza
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Reúna busca, recortes e modos de visualização em um fluxo mais legível para localizar questões sem comprimir a leitura do acervo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1 font-semibold text-primary">
              {questions.length} no banco
            </span>
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 font-medium text-muted-foreground">
              {allTags.length} tags mapeadas
            </span>
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 font-medium text-muted-foreground">
              {Object.keys(kanbanGroups).length} frentes por disciplina
            </span>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por conteúdo, disciplina, tópico ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-2xl border-border/60 bg-background/85 pl-9"
            />
          </div>

          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/85">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas disciplinas</SelectItem>
              {subjectNamesForFilter.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/85">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas turmas</SelectItem>
              {dbClassGroups.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterBimester} onValueChange={setFilterBimester}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/85">
              <SelectValue placeholder="Bimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos bimestres</SelectItem>
              {BIMESTERS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/85">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="facil">Fácil</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="dificil">Difícil</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/85">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-semibold text-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" />
              {filtered.length} resultado(s)
            </span>
            <span>Refine por disciplina, turma, bimestre, dificuldade ou tag.</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-medium text-primary">
                Filtros ativos
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              className="gap-1.5 rounded-xl"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" /> Lista
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              className="gap-1.5 rounded-xl"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 rounded-xl text-xs">
                <X className="h-3 w-3" /> Limpar filtros
              </Button>
            )}
          </div>
        </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && (
        <div className="space-y-3">
          {filtered.map((q, i) => (
            <div
              key={q.id}
              role="button"
              tabIndex={0}
              className="surface-card rounded-[1.65rem] border border-border/60 p-5 animate-fade-in cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => setViewingQuestion(q)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewingQuestion(q);
                }
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                      {q.subjectName}
                    </span>
                    <span className="text-xs text-muted-foreground">{q.classGroup}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{q.bimester}</span>
                    {q.topic && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs italic text-muted-foreground">{q.topic}</span>
                      </>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", difficultyStyles[q.difficulty])}>
                      {difficultyLabels[q.difficulty]}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", q.type === "objetiva" ? "bg-accent/60 text-accent-foreground" : "bg-primary/10 text-primary")}>
                      {q.type === "objetiva" ? "Objetiva" : "Discursiva"}
                    </span>
                  </div>

                  <div className="prose prose-sm max-w-none line-clamp-3 text-sm text-foreground [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded" dangerouslySetInnerHTML={{ __html: q.content }} />

                  {q.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {q.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" aria-label={`Editar questão de ${q.subjectName}`}
                  className="h-9 w-9 rounded-xl" onClick={() => openEdit(q)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Excluir questão de ${q.subjectName}`}
                  className="h-9 w-9 rounded-xl hover:text-destructive" onClick={() => confirmDelete(q.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-xs text-muted-foreground">
                  por {q.authorName} • {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                  {q.updatedAt && (
                    <span className="ml-1">(editado em {new Date(q.updatedAt).toLocaleDateString("pt-BR")})</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban View */}
      {!loading && viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(kanbanGroups).map(([subject, items]) => (
            <div key={subject} className="min-w-[300px] max-w-[340px] flex-shrink-0">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                  {subject}
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
                </h3>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {items.map((q) => (
                    <div
                      key={q.id}
                      role="button"
                      tabIndex={0}
                      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => setViewingQuestion(q)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setViewingQuestion(q);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", difficultyStyles[q.difficulty])}>
                          {difficultyLabels[q.difficulty]}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", q.type === "objetiva" ? "bg-accent/60 text-accent-foreground" : "bg-primary/10 text-primary")}>
                          {q.type === "objetiva" ? "Objetiva" : "Discursiva"}
                        </span>
                      </div>
                      {q.topic && <p className="text-xs text-muted-foreground italic mb-1">{q.topic}</p>}
                      <div className="text-xs text-foreground prose prose-sm max-w-none line-clamp-4 [&_img]:hidden" dangerouslySetInnerHTML={{ __html: q.content }} />
                      {q.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {q.tags.map((tag) => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <span className="text-[10px] text-muted-foreground">{q.authorName}</span>
                        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" aria-label={`Editar questão de ${q.subjectName}`}
                          className="h-6 w-6" onClick={() => openEdit(q)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Excluir questão de ${q.subjectName}`}
                          className="h-6 w-6 hover:text-destructive" onClick={() => confirmDelete(q.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {!loading && filtered.length === 0 && (
        <div className="surface-card rounded-[2rem] border border-dashed border-border/70 px-6 py-16 text-center text-muted-foreground">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.6rem] bg-primary/10 text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
          <p className="mt-5 text-lg font-semibold text-foreground">Nenhuma questão encontrada.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed">
            Ajuste os filtros, revise o termo buscado ou registre uma nova questão para alimentar o acervo da equipe.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                Limpar filtros
              </Button>
            )}
            <Button onClick={openNew} className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" />
              Nova questão
            </Button>
          </div>
        </div>
      )}

      {/* Question Detail Dialog */}
      <Dialog open={!!viewingQuestion} onOpenChange={(open) => !open && setViewingQuestion(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-primary">{viewingQuestion?.subjectName}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{viewingQuestion?.classGroup}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground italic">{viewingQuestion?.topic}</span>
              {viewingQuestion && (
                <>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", difficultyStyles[viewingQuestion.difficulty])}>
                    {difficultyLabels[viewingQuestion.difficulty]}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", viewingQuestion.type === "objetiva" ? "bg-accent/60 text-accent-foreground" : "bg-primary/10 text-primary")}>
                    {viewingQuestion.type === "objetiva" ? "Objetiva" : "Discursiva"}
                  </span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Detalhes da questão</DialogDescription>
          </DialogHeader>
          {viewingQuestion && (
            <div className="space-y-4">
              <div className="text-sm text-foreground prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded" dangerouslySetInnerHTML={{ __html: viewingQuestion.content }} />
              {viewingQuestion.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {viewingQuestion.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  por {viewingQuestion.authorName} • {new Date(viewingQuestion.createdAt).toLocaleDateString("pt-BR")}
                  {viewingQuestion.updatedAt && (
                    <span className="ml-1">(editado em {new Date(viewingQuestion.updatedAt).toLocaleDateString("pt-BR")})</span>
                  )}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setViewingQuestion(null); openEdit(viewingQuestion); }}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => { setViewingQuestion(null); confirmDelete(viewingQuestion.id); }}>
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Questão" : "Nova Questão"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os dados da questão abaixo." : "Preencha os campos para adicionar uma nova questão ao banco."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Disciplina */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Disciplina *</Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) => {
                    const sub = dbSubjects.find(s => s.id === v);
                    setForm((f) => ({ ...f, subjectId: v, subjectName: sub?.name || "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dbSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Turma *</Label>
                <Select
                  value={form.classGroup}
                  onValueChange={(v) => setForm((f) => ({ ...f, classGroup: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dbClassGroups.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Bimestre *</Label>
                <Select
                  value={form.bimester}
                  onValueChange={(v) => setForm((f) => ({ ...f, bimester: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BIMESTERS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Conteúdo / Tópico</Label>
                <Input
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="Ex: Equações do 2º Grau"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: "objetiva" | "discursiva") => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objetiva">Objetiva</SelectItem>
                    <SelectItem value="discursiva">Discursiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dificuldade</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v: "facil" | "media" | "dificil") =>
                    setForm((f) => ({ ...f, difficulty: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Enunciado da Questão *</Label>
              <div className="border border-input rounded-lg overflow-hidden min-h-[350px]">
                <RichEditor
                  content={form.content}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                  placeholder="Digite o enunciado completo da questão..."
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tags</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Digite uma tag e pressione Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                      <button
                        type="button"
                        aria-label={`Remover tag ${tag}`}
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar alterações" : "Adicionar questão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
