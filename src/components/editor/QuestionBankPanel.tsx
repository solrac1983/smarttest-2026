import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Search, X, CheckCircle2, Tag, Filter, Eye, ListChecks, Square, Library, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { showInvokeSuccess } from "@/lib/invokeFunction";
import { QuestionBankItem } from "@/types";
import { getLastQuestionNumber } from "@/lib/examQuestionUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  questions: QuestionBankItem[];
  currentContent: string;
  onClose: () => void;
  onInsert: (html: string) => void;
}

const ALL = "__all__";

// Strip diacritics for accent-insensitive search
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Sanitize question content for insertion: unwrap leading <p> if present and wrap in proper Tiptap QuestionBlock nodes.
function buildInsertedHTML(questions: QuestionBankItem[]): string {
  return questions
    .map((q) => {
      const subject = q.subjectName ? `data-q-subject="${q.subjectName}"` : "";
      const difficulty = q.difficulty ? `data-q-difficulty="${q.difficulty}"` : "";
      const idAttr = q.id ? `data-q-id="${q.id}"` : "";
      const topic = q.topic ? `data-q-topic="${q.topic}"` : "";
      const tags = q.tags && q.tags.length ? `data-q-tags="${q.tags.join("|")}"` : "";
      const raw = (q.content || "").trim();
      
      return `<div data-question-block="" ${idAttr} ${subject} ${difficulty} ${topic} ${tags}>
        <div data-question-stem="">${raw}</div>
      </div><p></p>`;
    })
    .join("");
}

const difficultyLabel: Record<string, { label: string; cls: string }> = {
  facil: { label: "Fácil", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  media: { label: "Média", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  dificil: { label: "Difícil", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
};

export function QuestionBankPanel({ questions, currentContent, onClose, onInsert }: Props) {
  const { role, profile } = useAuth();
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);
  const [isTeacherDataLoaded, setIsTeacherDataLoaded] = useState(role !== "professor");

  useEffect(() => {
    if (role !== "professor" || !profile?.email) {
      setIsTeacherDataLoaded(true);
      return;
    }
    supabase
      .from("teachers")
      .select("subjects")
      .eq("email", profile.email)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.subjects) setTeacherSubjectIds(data.subjects);
        setIsTeacherDataLoaded(true);
      });
  }, [role, profile?.email]);

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL);
  const [gradeFilter, setGradeFilter] = useState<string>(ALL);
  const [difficultyFilter, setDifficultyFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [showFilters, setShowFilters] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Use ordered array so insertion respects selection order
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedOrder), [selectedOrder]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    const t = setTimeout(() => searchInputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Distinct grades (memoized)
  const grades = useMemo(() => {
    const s = new Set<string>();
    questions.forEach(q => {
      if (role === "professor" && isTeacherDataLoaded) {
        if (!teacherSubjectIds.includes(q.subjectId)) return;
      }
      if (q.grade) s.add(q.grade);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [questions, role, isTeacherDataLoaded, teacherSubjectIds]);

  // Distinct subject list (memoized)
  const subjects = useMemo(() => {
    const s = new Set<string>();
    questions.forEach(q => {
      if (role === "professor" && isTeacherDataLoaded) {
        if (!teacherSubjectIds.includes(q.subjectId)) return;
      }
      if (q.subjectName) s.add(q.subjectName);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [questions, role, isTeacherDataLoaded, teacherSubjectIds]);

  // Pre-compute search index once per question list (perf)
  const indexed = useMemo(
    () =>
      questions.map(q => ({
        q,
        idx: norm(
          [q.content, q.subjectName, q.topic, q.grade, q.classGroup, q.bimester, ...(q.tags || [])]
            .filter(Boolean)
            .join(" ")
        ),
      })),
    [questions]
  );

  const filtered = useMemo(() => {
    if (role === "professor" && !isTeacherDataLoaded) return []; // Aguarda o carregamento do professor
    const ns = norm(search.trim());
    return indexed
      .filter(({ q, idx }) => {
        if (role === "professor" && !teacherSubjectIds.includes(q.subjectId)) return false;
        if (ns && !idx.includes(ns)) return false;
        if (subjectFilter !== ALL && q.subjectName !== subjectFilter) return false;
        if (gradeFilter !== ALL && q.grade !== gradeFilter) return false;
        if (difficultyFilter !== ALL && q.difficulty !== difficultyFilter) return false;
        if (typeFilter !== ALL && q.type !== typeFilter) return false;
        return true;
      })
      .map(({ q }) => q);
  }, [indexed, search, subjectFilter, gradeFilter, difficultyFilter, typeFilter, role, isTeacherDataLoaded, teacherSubjectIds]);

  const filteredIds = useMemo(() => new Set(filtered.map(q => q.id)), [filtered]);
  const visibleSelectedCount = selectedOrder.filter(id => filteredIds.has(id)).length;
  const allVisibleSelected = filtered.length > 0 && visibleSelectedCount === filtered.length;

  const toggle = useCallback((id: string) => {
    setSelectedOrder(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedOrder(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      setSelectedOrder(prev => {
        const set = new Set(prev);
        filtered.forEach(q => set.add(q.id));
        // Preserve order of prior + add new in current visible order
        const remaining = filtered.filter(q => !prev.includes(q.id)).map(q => q.id);
        return [...prev, ...remaining].filter(id => set.has(id));
      });
    }
  };

  const clearSelection = () => setSelectedOrder([]);

  const insertSelected = () => {
    if (selectedOrder.length === 0) return;
    const byId = new Map(questions.map(q => [q.id, q] as const));
    const ordered = selectedOrder.map(id => byId.get(id)).filter((q): q is QuestionBankItem => !!q);
    if (ordered.length === 0) return;
    const html = buildInsertedHTML(ordered);
    onInsert(html);
    showInvokeSuccess(`${ordered.length} questão(ões) inserida(s)!`);
    setSelectedOrder([]);
  };

  const insertSingle = (q: QuestionBankItem) => {
    onInsert(buildInsertedHTML([q]));
    showInvokeSuccess("Questão inserida!");
  };

  const resetFilters = () => {
    setSearch("");
    setSubjectFilter(ALL);
    setGradeFilter(ALL);
    setDifficultyFilter(ALL);
    setTypeFilter(ALL);
  };

  const hasAnyFilter =
    search.trim() !== "" || subjectFilter !== ALL || gradeFilter !== ALL || difficultyFilter !== ALL || typeFilter !== ALL;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="w-[320px] flex-shrink-0 glass-card rounded-lg overflow-hidden animate-slide-in-left flex flex-col max-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Library className="h-4 w-4 text-primary" />
            Banco de Questões
            <Badge variant="outline" className="text-[10px]">
              {filtered.length}/{questions.length}
            </Badge>
          </h3>
          <button
            type="button"
            aria-label="Fechar banco de questões"
            onClick={() => { clearSelection(); onClose(); }}
            className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search + filter toggle */}
        <div className="px-3 pt-3 pb-2 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar por conteúdo, matéria, tag…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs"
            />
            {search && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showFilters}
              aria-controls="question-bank-filters"
              className="h-6 px-2 text-[10px] gap-1"
              onClick={() => setShowFilters(v => !v)}
            >
              <Filter className="h-3 w-3" />
              Filtros {hasAnyFilter && <span className="text-primary">●</span>}
            </Button>
            {hasAnyFilter && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={resetFilters}>
                Limpar filtros
              </Button>
            )}
          </div>

          {showFilters && (
            <div id="question-bank-filters" className="grid grid-cols-1 gap-1.5 pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Matéria" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value={ALL} className="text-xs">Todas matérias</SelectItem>
                    {subjects.map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Série" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value={ALL} className="text-xs">Todas as séries</SelectItem>
                    {grades.map(g => (
                      <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Dificuldade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL} className="text-xs">Qualquer dif.</SelectItem>
                    <SelectItem value="facil" className="text-xs">Fácil</SelectItem>
                    <SelectItem value="media" className="text-xs">Média</SelectItem>
                    <SelectItem value="dificil" className="text-xs">Difícil</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL} className="text-xs">Qualquer tipo</SelectItem>
                    <SelectItem value="objetiva" className="text-xs">Objetiva</SelectItem>
                    <SelectItem value="discursiva" className="text-xs">Discursiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Bulk actions */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1.5"
            onClick={toggleAllVisible}
            disabled={filtered.length === 0}
          >
            {allVisibleSelected ? <Square className="h-3 w-3" /> : <ListChecks className="h-3 w-3" />}
            {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
          </Button>
          {selectedOrder.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-destructive" onClick={clearSelection}>
              Limpar ({selectedOrder.length})
            </Button>
          )}
        </div>

        {selectedOrder.length > 0 && (
          <div className="px-3 py-2 border-b border-border bg-primary/5">
            <Button size="sm" className="w-full gap-1.5 text-xs h-8" onClick={insertSelected}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Inserir {selectedOrder.length} questão(ões)
            </Button>
          </div>
        )}

        {/* List */}
        <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
          {questions.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="Banco vazio"
              hint="Cadastre questões em Banco de Questões."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="Nenhum resultado"
              hint="Ajuste os filtros ou a busca."
              action={<Button size="sm" variant="outline" onClick={resetFilters}>Limpar filtros</Button>}
            />
          ) : (
            filtered.map(q => {
              const selectionPos = selectedOrder.indexOf(q.id);
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  selected={selectedSet.has(q.id)}
                  selectionPos={selectionPos >= 0 ? selectionPos + 1 : null}
                  preview={previewId === q.id}
                  onTogglePreview={() => setPreviewId(p => (p === q.id ? null : q.id))}
                  onToggle={() => toggle(q.id)}
                  onInsertSingle={() => insertSingle(q)}
                />
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-muted-foreground">
      <div className="opacity-60 mb-2">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs mt-1">{hint}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

interface CardProps {
  question: QuestionBankItem;
  selected: boolean;
  selectionPos: number | null;
  preview: boolean;
  onToggle: () => void;
  onTogglePreview: () => void;
  onInsertSingle: () => void;
}

function QuestionCard({ question, selected, selectionPos, preview, onToggle, onTogglePreview, onInsertSingle }: CardProps) {
  const diff = difficultyLabel[question.difficulty] ?? difficultyLabel.media;

  return (
    <div
      className={cn(
        "rounded-md border p-2.5 text-xs transition-all group",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          className="pt-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <Checkbox checked={selected} tabIndex={-1} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="font-medium text-foreground truncate">{question.subjectName || "Sem matéria"}</span>
            {question.grade && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground truncate">{question.grade}</span>
              </>
            )}
            {selectionPos !== null && (
              <Badge className="ml-auto h-4 text-[9px] px-1.5 bg-primary text-primary-foreground">#{selectionPos}</Badge>
            )}
          </div>

          <div
            className={cn(
              "text-muted-foreground prose prose-sm max-w-none break-words",
              preview ? "" : "line-clamp-2"
            )}
            // Content is sanitized by RLS-protected DB writes, rendered as preview only.
            dangerouslySetInnerHTML={{ __html: question.content }}
          />

          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium", diff.cls)}>
              {diff.label}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground capitalize">
              {question.type}
            </span>
            {question.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px]">
                <Tag className="h-2 w-2" />
                {tag}
              </span>
            ))}
            {question.tags && question.tags.length > 2 && (
              <span className="text-[9px] text-muted-foreground">+{question.tags.length - 2}</span>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" aria-pressed={preview} className="h-6 px-2 text-[10px] gap-1" onClick={onTogglePreview}>
                  <Eye className="h-3 w-3" />
                  {preview ? "Recolher" : "Ver tudo"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{preview ? "Mostrar prévia compacta" : "Mostrar conteúdo completo"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={onInsertSingle}>
                  <CheckCircle2 className="h-3 w-3" />
                  Inserir
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inserir esta questão imediatamente</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
