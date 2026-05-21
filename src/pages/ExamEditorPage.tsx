import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SmartEditor } from "@/components/editor-v2/SmartEditor";
import { ChartDataPanel } from "@/components/editor/ChartDataPanel";
import { CommentsPanel } from "@/components/editor/CommentsPanel";
import type { ChartData } from "@/components/editor/ChartEditorTab";
import { defaultExamContent, saveExamContent, getExamContent, getStandaloneExam, loadStandaloneExamsFromDB, type ExamConfig } from "@/data/examContentStore";
import { resolveExamEditorRouteContext } from "./examEditorRouteContext";
import { resolveExamEditorDisplayTitle, resolveAnswerKeyTitle, resolveAnswerKeySections } from "./examEditorDisplay";
import { useExamData } from "@/hooks/editor/useExamData";
import { useExamPersistence } from "@/hooks/editor/useExamPersistence";
import { useExamWorkflow } from "@/hooks/editor/useExamWorkflow";
import { useExamEditorLoader } from "@/hooks/editor/useExamEditorLoader";
import { Button } from "@/components/ui/button";
import { examTypeLabels } from "@/data/constants";
import { useQuestions } from "@/hooks/useQuestions";
import { useAuth } from "@/hooks/useAuth";
import { useExamComments } from "@/hooks/useExamComments";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { exportQuestionsToPDF } from "@/lib/exportQuestionsPDF";
import { exportPDF, printDocument } from "@/lib/exportPrint";
import { getLastQuestionNumber, numberAIQuestions, extractAnswersFromContent } from "@/lib/examQuestionUtils";
import { extractAnswerKeysFromContent } from "@/components/simulados/SimuladoPDFGenerator";
import { AnswerKeyDialog, type SubjectSection } from "@/components/editor/AnswerKeyDialog";
import { QuestionBankPanel } from "@/components/editor/QuestionBankPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  ArrowLeft,
  Search,
  Save,
  Send,
  Library,
  X,
  GripVertical,
  Tag,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  ClipboardList,
  PanelTop,
  Brain,
  FileOutput,
  FileText,
  Printer,
  FileDown,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { GeneratedQuestion } from "@/pages/AIQuestionGeneratorPage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DemandStatus, QuestionBankItem } from "@/types";
import { exportToDocx } from "@/lib/exportDocx";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
import { applyPageSettings, loadPageSettings, loadPageSettingsFromDB } from "@/components/editor/PageSettingsPanel";
import { approveEditorDemand } from "@/lib/editorServices";


export default function ExamEditorPage() {
  const navigate = useNavigate();
  const { demandId } = useParams();
  const [searchParams] = useSearchParams();
  const { role, profile, user } = useAuth();
  const { questions: bankQuestions } = useQuestions();
  const [demand, setDemand] = useState<any>(null);
  const routeContext = resolveExamEditorRouteContext(demandId);
  const isSimulado = routeContext.isSimulado;
  const isSimSubject = routeContext.isSimSubject;
  const simSubjectId = routeContext.simSubjectId;
  const simuladoId = routeContext.simuladoId;
  const [isAvulsaExam, setIsAvulsaExam] = useState(routeContext.isStandaloneInitial);
  const standaloneExam = demandId ? getStandaloneExam(demandId) : undefined;
  const simuladoTitle = routeContext.standaloneExamTitle;

  const isBlankNew = routeContext.isBlankNew;
  const [examId, setExamId] = useState<string | null>(demandId || null);
  const [content, setContent] = useState(() => isBlankNew || isSimSubject ? "" : getExamContent(demandId || ""));
  const [savedContent, setSavedContent] = useState(() => isBlankNew || isSimSubject ? "" : getExamContent(demandId || ""));
  const hasUnsavedChanges = content !== savedContent;
  const [showBank, setShowBank] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [activeChartData, setActiveChartData] = useState<ChartData | null>(null);
  const [chartUpdateFn, setChartUpdateFn] = useState<((data: ChartData) => void) | null>(null);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { comments, addComment, deleteComment, resolveComment } = useExamComments(demandId, profile?.full_name || "Usuário");
  const [storedAIQuestions, setStoredAIQuestions] = useState<GeneratedQuestion[]>([]);
  const [headerTemplates, setHeaderTemplates] = useState<{ id: string; name: string; file_url: string; segment: string | null; grade: string | null }[]>([]);
  const [headersLoaded, setHeadersLoaded] = useState(false);
  const [showHeadersModal, setShowHeadersModal] = useState(false);
  const [selectedHeaderId, setSelectedHeaderId] = useState<string | null>(null);
  const [headerSegmentFilter, setHeaderSegmentFilter] = useState<string>("all");
  const [showAnswerKeyDialog, setShowAnswerKeyDialog] = useState(false);
  const [examSubjectSections, setExamSubjectSections] = useState<SubjectSection[]>(() => {
    if (demandId) {
      try {
        const stored = localStorage.getItem(`exam-subjects-${demandId}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });
  const [simuladoAutoAnswers, setSimuladoAutoAnswers] = useState<{ questionNum: number; answer: string }[]>();
  const [simuladoSubjectSections, setSimuladoSubjectSections] = useState<SubjectSection[]>([]);
  const [adaptiveInfo, setAdaptiveInfo] = useState<{ distribution: { facil: number; media: number; dificil: number }; classAverage?: number } | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(() => {
    // Initialize from URL search params if available (sim-avulso formatting)
    const ff = searchParams.get("ff");
    const fs = searchParams.get("fs");
    const cols = searchParams.get("cols");
    const tmpl = searchParams.get("tmpl");
    if (ff || fs || cols || tmpl) {
      return {
        fontFamily: ff || undefined,
        fontSize: fs ? Number(fs) : undefined,
        columns: cols ? Number(cols) : undefined,
        template: tmpl || undefined,
      };
    }
    // Fallback: load config from stored standalone exam
    if (standaloneExam?.config && Object.keys(standaloneExam.config).length > 0) {
      return standaloneExam.config;
    }
    return null;
  });

  // Simulado subject state
  const [simSubjectData, setSimSubjectData] = useState<{
    subject_name: string;
    question_count: number;
    status: string;
    revision_notes: string | null;
    answer_key: string | null;
    simulado_title?: string;
  } | null>(null);
  const [simSubjectLoading, setSimSubjectLoading] = useState(!!isSimSubject);

  // Workflow state
  const [demandStatus, setDemandStatus] = useState<DemandStatus>("in_progress");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

  useExamEditorLoader({
    demandId,
    isSimulado,
    isSimSubject,
    isBlankNew,
    isAvulsaExam,
    simSubjectId,
    simuladoId,
    setContent,
    setSavedContent,
    setIsAvulsaExam,
    setExamConfig,
    setDemand,
    setSimSubjectData,
    setSimSubjectLoading,
    setDemandStatus,
    setRevisionNote,
    setSimuladoAutoAnswers,
    setSimuladoSubjectSections,
  });

  const { loadHeaderTemplates } = useExamData({
    demandId,
    setContent,
    setStoredAIQuestions,
    setAdaptiveInfo,
  });

  const loadHeaderTemplatesIfNeeded = useCallback(async () => {
    await loadHeaderTemplates(headersLoaded, setHeadersLoaded, setHeaderTemplates);
  }, [headersLoaded, loadHeaderTemplates]);

  // Save name modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [examName, setExamName] = useState("");

  // Apply persisted page settings (paper size, margins, gap) once editor renders
  useEffect(() => {
    const s = loadPageSettings(demandId);
    applyPageSettings(s);
    loadPageSettingsFromDB(demandId).then((s) => applyPageSettings(s));
  }, [demandId]);

  // Safe navigation guard (no useBlocker needed)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const safeNavigate = (to: string | number) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(typeof to === "number" ? "__back__" : to);
      setShowLeaveDialog(true);
    } else {
      if (typeof to === "number") navigate(to as -1);
      else navigate(to);
    }
  };

  // Browser tab close / refresh warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Listen for column/template changes from LayoutTab
  useEffect(() => {
    const colHandler = (e: Event) => {
      const cols = (e as CustomEvent).detail?.columns;
      if (typeof cols === 'number') {
        setExamConfig(prev => ({ ...prev, columns: cols }));
      }
    };
    const tmplHandler = (e: Event) => {
      const template = (e as CustomEvent).detail?.template;
      if (typeof template === 'string') {
        setExamConfig(prev => ({ ...prev, template: template || undefined }));
      }
    };
    window.addEventListener('editor-columns-change', colHandler);
    window.addEventListener('editor-template-change', tmplHandler);
    return () => {
      window.removeEventListener('editor-columns-change', colHandler);
      window.removeEventListener('editor-template-change', tmplHandler);
    };
  }, []);

  // Listen for Ctrl+S from the editor
  const handleSaveRef = useRef<() => void>();
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });
  useEffect(() => {
    const ctrlSHandler = () => {
      handleSaveRef.current?.();
    };
    document.addEventListener('editor-save', ctrlSHandler);
    return () => document.removeEventListener('editor-save', ctrlSHandler);
  }, []);

  const { saveToDB } = useExamPersistence({
    demandId,
    examId,
    content,
    setContent,
    setSavedContent,
    hasUnsavedChanges,
    isAvulsaExam,
    isSimSubject,
    simSubjectId,
    demandStatus,
    setDemandStatus,
    examConfig,
    user,
    profile,
  });

  const isCoordinator = role === "admin" || role === "coordinator" || role === "super_admin";
  const isProfessor = role === "professor";

  // Status helpers
  const canSubmit = isSimSubject
    ? ["pending", "in_progress", "revision_requested"].includes(demandStatus)
    : ["in_progress", "revision_requested"].includes(demandStatus);
  const canReview = ["submitted", "review"].includes(demandStatus) && isCoordinator;
  const isApproved = demandStatus === "approved" || demandStatus === "final";
  const isRevisionRequested = demandStatus === "revision_requested";

  const handleSave = async () => {
    if (isBlankNew && !examId) {
      setShowNameModal(true);
      return;
    }

    const ok = await saveToDB(content, examConfig);
    if (!ok) return;

    setSavedContent(content);
    setSaved(true);
    showInvokeSuccess("Rascunho salvo!");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConfirmSaveName = async () => {
    if (!examName.trim()) {
      showInvokeError("Informe o nome da avaliação.");
      return;
    }
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const exam = {
      id: newId,
      title: examName.trim(),
      content,
      createdAt: now,
      updatedAt: now,
      status: "in_progress",
      config: examConfig || undefined,
    };
    
    if (user && profile?.company_id) {
      await saveStandaloneExamToDB(exam, user.id, profile.company_id);
    }
    
    setExamId(newId);
    setSavedContent(content);
    setSaved(true);
    setShowNameModal(false);
    setExamName("");
    showInvokeSuccess("Avaliação salva com sucesso!");
    setTimeout(() => setSaved(false), 2000);
    navigate(`/provas/editor/${newId}`, { replace: true });
  };

  const { handleSubmitForReview, handleApprove, handleReject } = useExamWorkflow({
    demandId,
    examId,
    content,
    examConfig,
    user,
    profile,
    setDemandStatus,
    setSavedContent,
    setSubmitDialogOpen,
    setApproveDialogOpen,
    setRejectDialogOpen,
    setRevisionNote,
  });

  if (simSubjectLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  const displayTitle = resolveExamEditorDisplayTitle({
    isSimSubject,
    simSubjectData,
    isAvulsaExam,
    standaloneExam,
    demand,
    simuladoTitle,
    examTypeLabels,
  });

  return (
    <div className="flex flex-col gap-0 h-full animate-fade-in">
      {/* Simulado subject info banner */}
      {isSimSubject && simSubjectData && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 mb-0 mt-4">
          <ClipboardList className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-foreground">{simSubjectData.subject_name}</span>
            <span className="text-muted-foreground"> — Elabore </span>
            <span className="font-semibold text-primary">{simSubjectData.question_count} questão(ões)</span>
            <span className="text-muted-foreground"> para o simulado </span>
            <span className="font-medium text-foreground">{simSubjectData.simulado_title}</span>
          </div>
          <StatusBadge status={demandStatus} />
        </div>
      )}

      {/* Adaptive exam indicator */}
      {adaptiveInfo && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
          <Brain className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-foreground">Prova Adaptativa</span>
            <span className="text-muted-foreground"> — Distribuição: </span>
            <span className="text-emerald-600 font-medium">{adaptiveInfo.distribution.facil}% Fácil</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-amber-600 font-medium">{adaptiveInfo.distribution.media}% Média</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-destructive font-medium">{adaptiveInfo.distribution.dificil}% Difícil</span>
            {adaptiveInfo.classAverage != null && (
              <span className="text-muted-foreground"> · Média da turma: {adaptiveInfo.classAverage}%</span>
            )}
          </div>
          <button onClick={() => setAdaptiveInfo(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Revision note banner */}
      {isRevisionRequested && revisionNote && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20 mt-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-destructive">Ajustes solicitados pela coordenação</h4>
            <p className="text-sm text-muted-foreground mt-1">{revisionNote}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Faça as correções necessárias e envie novamente para revisão.
            </p>
          </div>
        </div>
      )}

      {/* Editor + Side panels */}
      <div className="flex gap-4 items-start h-full flex-1 min-h-0">
        <div
          className={cn("flex-1 transition-all min-h-0 h-full flex flex-col exam-wrapper")}
          data-columns={examConfig?.columns || 1}
          data-template={examConfig?.template || ""}
          style={(() => {
            const openPanels = [showBank, showDataPanel, showComments, showAnswerKeyDialog].filter(Boolean).length;
            const base: React.CSSProperties = {
              ["--exam-font-family" as any]: examConfig?.fontFamily ? `'${examConfig.fontFamily}', ${examConfig.fontFamily === 'Times New Roman' ? 'serif' : 'sans-serif'}` : undefined,
              ["--exam-font-size" as any]: examConfig?.fontSize ? `${examConfig.fontSize}pt` : undefined,
            };
            if (openPanels > 0) base.maxWidth = `calc(100% - ${openPanels * 340}px)`;
            return base;
          })()}
        >
          <SmartEditor
            content={content}
            onChange={setContent}
            documentId={isAvulsaExam ? undefined : (examId || undefined)}
            pageSettingsScopeId={examId || demandId || null}
            showDataPanel={showDataPanel}
            onToggleDataPanel={() => setShowDataPanel(p => !p)}
            onChartDataChange={(data) => {
              setActiveChartData(data);
              setShowDataPanel(!!data);
            }}
            onChartUpdate={(data) => setActiveChartData(data)}
            showComments={showComments}
            onToggleComments={() => setShowComments(p => !p)}
            saveStatus={hasUnsavedChanges ? "unsaved" : "saved"}
             headerLeft={
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => safeNavigate(-1)}
                   className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
                   title="Voltar"
                 >
                   <ArrowLeft className="h-3.5 w-3.5" />
                 </button>
                 <FileText className="h-3.5 w-3.5 text-white/80" />
                 <span className="text-sm font-semibold text-white truncate max-w-[400px]" title={displayTitle || ""}>
                   {displayTitle || (isSimSubject && simSubjectData ? "Editor de Prova" : isSimulado ? "Editor de Simulado" : "Editor de Prova")}
                 </span>
               </div>
             }
            headerRight={
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/ai-questoes?return=/provas/editor/${demandId || ""}`)}
                  className="gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15 font-medium"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Gerar com IA
                </Button>
                <DropdownMenu onOpenChange={(open) => { if (open) loadHeaderTemplatesIfNeeded(); }}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15">
                      <PanelTop className="h-3.5 w-3.5" />
                      Cabeçalhos
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[240px] max-h-[320px] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs">Modelos de Cabeçalho</DropdownMenuLabel>
                    {headerTemplates.length === 0 && (
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Nenhum cabeçalho cadastrado
                      </DropdownMenuItem>
                    )}
                    {headerTemplates.map((h) => (
                      <DropdownMenuItem
                        key={h.id}
                        onClick={() => {
                          setContent((prev) => {
                            const imgTag = `<img src="${h.file_url}" alt="Cabeçalho: ${h.name}" style="width:100%;max-width:100%;" />`;
                            return imgTag + (prev || "");
                          });
                          showInvokeSuccess(`Cabeçalho "${h.name}" inserido!`);
                        }}
                        className="flex flex-col items-start gap-0.5 cursor-pointer"
                      >
                        <span className="text-xs font-medium">{h.name}</span>
                        {(h.segment || h.grade) && (
                          <span className="text-[10px] text-muted-foreground">
                            {[h.segment, h.grade].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { loadHeaderTemplatesIfNeeded(); setShowHeadersModal(true); }} className="text-xs">
                      Ver todos os modelos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnswerKeyDialog(v => !v)}
                  className={cn(
                    "gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15",
                    showAnswerKeyDialog && "bg-white/20 text-white"
                  )}
                  title={showAnswerKeyDialog ? "Fechar painel de gabarito" : "Abrir painel de gabarito"}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Gabarito
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBank(!showBank)}
                  className="gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15"
                >
                  <Library className="h-3.5 w-3.5" />
                  Banco de Questões
                </Button>
                <span className="h-4 w-px bg-white/25" />
                <Button variant="ghost" size="sm" onClick={handleSave} className="gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15">
                  <Save className="h-3.5 w-3.5" />
                  {saved ? "Salvo ✓" : "Salvar"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15">
                      <FileDown className="h-3.5 w-3.5" />
                      Exportar
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        try {
                          const title = isSimSubject && simSubjectData
                            ? `${simSubjectData.simulado_title} - ${simSubjectData.subject_name}`
                            : isAvulsaExam && standaloneExam
                              ? standaloneExam.title
                              : demand
                                ? `${demand.subjectName} - ${examTypeLabels[demand.examType]}`
                                : "Avaliação";
                          exportToDocx(content, title, examConfig ? {
                            fontFamily: examConfig.fontFamily,
                            fontSize: examConfig.fontSize,
                            columns: examConfig.columns,
                            template: examConfig.template,
                          } : undefined, examId || demandId || null);
                        } catch {
                          showInvokeError("Erro ao exportar para .docx");
                        }
                      }}
                    >
                      <FileOutput className="h-4 w-4 mr-2" />
                      Exportar Word (.doc)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (!exportPDF(examId || demandId || null)) showInvokeError("Conteúdo não encontrado ou popup bloqueado");
                        else showInvokeSuccess("Use 'Salvar como PDF' na janela de impressão");
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (!printDocument(examId || demandId || null)) showInvokeError("Conteúdo não encontrado ou popup bloqueado");
                      }}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {isAvulsaExam && isCoordinator && canSubmit && (
                  <Button
                    size="sm"
                    className="gap-1 h-7 text-[11px] bg-white text-primary hover:bg-white/90 font-semibold"
                    onClick={async () => {
                      await approveEditorDemand({
                        demandId,
                        examId,
                        isAvulsaExam,
                        content,
                        examConfig,
                        user,
                        profile,
                        isSimSubject,
                        simSubjectId,
                      });
                      setDemandStatus("approved");
                      setSavedContent(content);
                      showInvokeSuccess("Avaliação aprovada com sucesso!");
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprovar
                  </Button>
                )}
                {canSubmit && !(isAvulsaExam && isCoordinator) && (
                  <Button size="sm" className="gap-1 h-7 text-[11px]" onClick={() => setSubmitDialogOpen(true)}>
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </Button>
                )}
                {canReview && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 h-7 text-[11px] text-red-300 hover:text-red-200 hover:bg-red-500/20"
                      onClick={() => setRejectDialogOpen(true)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 h-7 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => setApproveDialogOpen(true)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                  </>
                )}
                {isApproved && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Aprovada
                  </span>
                )}
              </div>
            }
          />
        </div>

        {/* Chart Data Panel (fixed right side) */}
        {showDataPanel && activeChartData && (
          <ChartDataPanel
            chartData={activeChartData}
            onUpdate={(newData) => {
              setActiveChartData(newData);
              // Trigger update through RichEditor's onChartUpdate mechanism
              // We need a ref-based approach — for now dispatch a custom event
              window.dispatchEvent(new CustomEvent('chart-data-update', { detail: newData }));
            }}
            onClose={() => setShowDataPanel(false)}
          />
        )}

        {showComments && (
          <CommentsPanel
            comments={comments}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
            onResolveComment={resolveComment}
            onClose={() => setShowComments(false)}
          />
        )}

        {showBank && (
          <QuestionBankPanel
            questions={bankQuestions}
            currentContent={content}
            onClose={() => setShowBank(false)}
            onInsert={(html) => window.dispatchEvent(new CustomEvent('editor-import-html', { detail: { html } }))}
          />
        )}

        {/* Answer Key Panel */}
        <AnswerKeyDialog
          open={showAnswerKeyDialog}
          onOpenChange={setShowAnswerKeyDialog}
          onInsertAnswerKey={(html) => window.dispatchEvent(new CustomEvent('editor-import-html', { detail: { html } }))}
          examTitle={resolveAnswerKeyTitle({
            isSimSubject,
            simSubjectData,
            isAvulsaExam,
            standaloneExam,
            demand,
            examTypeLabels,
          })}
          questionCount={getLastQuestionNumber(content)}
          aiAnswers={(() => {
            if (isSimulado) return simuladoAutoAnswers;

            // Merge AI-stored answers with content-extracted answers
            const contentAnswers = extractAnswersFromContent(content);
            const aiAns = storedAIQuestions.length > 0
              ? storedAIQuestions.map((q, i) => ({ questionNum: i + 1, answer: q.answer || "" }))
              : [];
            // Content-extracted answers as base, AI answers override
            const merged = new Map<number, string>();
            for (const ca of contentAnswers) {
              if (ca.answer) merged.set(ca.questionNum, ca.answer);
            }
            for (const aa of aiAns) {
              if (aa.answer) merged.set(aa.questionNum, aa.answer);
            }
            if (merged.size === 0) return undefined;
            return Array.from(merged.entries()).map(([questionNum, answer]) => ({ questionNum, answer }));
          })()}
          subjectSections={resolveAnswerKeySections({
            isSimulado,
            simuladoSubjectSections,
            examSubjectSections,
          })}
        />
      </div>


      {/* Submit for review dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Enviar prova para revisão
            </AlertDialogTitle>
            <AlertDialogDescription>
              A prova será enviada para a coordenação validar. Você não poderá editá-la até que seja aprovada ou devolvida com observações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmitForReview(isSimSubject, simSubjectId)}>
              Confirmar envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Aprovar prova
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ao aprovar, a prova estará liberada para impressão. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleApprove(isAvulsaExam, isSimSubject, simSubjectId)} className="bg-emerald-600 hover:bg-emerald-700">
              Aprovar prova
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-destructive" />
              Rejeitar prova
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O professor receberá essa observação e deverá corrigir a prova.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Observações / Motivo da rejeição *</Label>
            <Textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Ex: Revisar questão 5 — enunciado ambíguo. Adicionar mais uma questão discursiva."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReject(rejectionNote, isAvulsaExam, isSimSubject, simSubjectId)}
            >
              Rejeitar e devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave without saving dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que não foram salvas. Deseja sair mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowLeaveDialog(false); setPendingNavigation(null); }}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setShowLeaveDialog(false);
                if (pendingNavigation === "__back__") navigate(-1);
                else if (pendingNavigation) navigate(pendingNavigation);
                setPendingNavigation(null);
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save name modal for standalone exams */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Nome da Avaliação
            </DialogTitle>
            <DialogDescription>
              Informe o nome desta avaliação avulsa para salvá-la.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Nome da avaliação *</Label>
            <Input
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Ex: Prova de Matemática — 2º Bimestre"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmSaveName(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSaveName}>
              Salvar avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header templates modal */}
      <Dialog open={showHeadersModal} onOpenChange={setShowHeadersModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PanelTop className="h-5 w-5 text-primary" />
              Modelos de Cabeçalho
            </DialogTitle>
            <DialogDescription>
              Selecione um cabeçalho para inserir no início da sua prova.
            </DialogDescription>
          </DialogHeader>
          {/* Segment filter */}
          {headerTemplates.length > 0 && (() => {
            const segments = Array.from(new Set(headerTemplates.map(h => h.segment).filter(Boolean))) as string[];
            return segments.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap pb-1">
                <span className="text-xs text-muted-foreground font-medium">Segmento:</span>
                <button
                  onClick={() => setHeaderSegmentFilter("all")}
                  className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-colors", headerSegmentFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
                >Todos</button>
                {segments.map(s => (
                  <button
                    key={s}
                    onClick={() => setHeaderSegmentFilter(s)}
                    className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-colors", headerSegmentFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
                  >{s}</button>
                ))}
              </div>
            ) : null;
          })()}
          <div className="flex-1 overflow-y-auto py-2 space-y-3">
            {(() => {
              const filtered = headerSegmentFilter === "all" ? headerTemplates : headerTemplates.filter(h => h.segment === headerSegmentFilter);
              return filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cabeçalho encontrado.</p>
              ) : (
                filtered.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHeaderId(h.id === selectedHeaderId ? null : h.id)}
                    className={cn(
                      "rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm",
                      selectedHeaderId === h.id
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedHeaderId === h.id} className="flex-shrink-0" tabIndex={-1} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{h.name}</span>
                        {(h.segment || h.grade) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[h.segment, h.grade].filter(Boolean).join(" • ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <img
                      src={h.file_url}
                      alt={h.name}
                      className="mt-2 w-full rounded border border-border object-contain max-h-[120px] bg-muted/30"
                    />
                  </div>
                ))
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHeadersModal(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedHeaderId}
              onClick={() => {
                const header = headerTemplates.find((h) => h.id === selectedHeaderId);
                if (header) {
                  setContent((prev) => {
                    const imgTag = `<img src="${header.file_url}" alt="Cabeçalho: ${header.name}" style="width:100%;max-width:100%;" />`;
                    return imgTag + (prev || "");
                  });
                  showInvokeSuccess(`Cabeçalho "${header.name}" inserido!`);
                }
                setSelectedHeaderId(null);
                setShowHeadersModal(false);
              }}
            >
              Inserir cabeçalho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

