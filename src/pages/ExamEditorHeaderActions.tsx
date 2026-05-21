import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ClipboardList, FileDown, FileOutput, FileText, Library, PanelTop, Printer, Save, Sparkles, XCircle } from "lucide-react";

interface HeaderTemplate {
  id: string;
  name: string;
  file_url: string;
  segment: string | null;
  grade: string | null;
}

interface ExamEditorHeaderActionsProps {
  headerTemplates: HeaderTemplate[];
  showAnswerKeyDialog: boolean;
  saved: boolean;
  isAvulsaExam: boolean;
  canSubmit: boolean;
  canReview: boolean;
  isCoordinator: boolean;
  isApproved: boolean;
  loadHeaderTemplatesIfNeeded: () => void | Promise<void>;
  setShowHeadersModal: (open: boolean) => void;
  setContent: (updater: (prev: string) => string) => void;
  setShowAnswerKeyDialog: (updater: (prev: boolean) => boolean) => void;
  setShowBank: (updater: (prev: boolean) => boolean) => void;
  onNavigateToAI: () => void;
  onSave: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onOpenSubmitDialog: () => void;
  onOpenRejectDialog: () => void;
  onOpenApproveDialog: () => void;
  onApproveStandalone: () => void;
  showInvokeSuccess: (message: string) => void;
}

export function ExamEditorHeaderActions({
  headerTemplates,
  showAnswerKeyDialog,
  saved,
  isAvulsaExam,
  canSubmit,
  canReview,
  isCoordinator,
  isApproved,
  loadHeaderTemplatesIfNeeded,
  setShowHeadersModal,
  setContent,
  setShowAnswerKeyDialog,
  setShowBank,
  onNavigateToAI,
  onSave,
  onExportDocx,
  onExportPdf,
  onPrint,
  onOpenSubmitDialog,
  onOpenRejectDialog,
  onOpenApproveDialog,
  onApproveStandalone,
  showInvokeSuccess,
}: ExamEditorHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onNavigateToAI}
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
        onClick={() => setShowAnswerKeyDialog((v) => !v)}
        className={cn(
          "gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15",
          showAnswerKeyDialog && "bg-white/20 text-white",
        )}
        title={showAnswerKeyDialog ? "Fechar painel de gabarito" : "Abrir painel de gabarito"}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        Gabarito
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowBank((p) => !p)}
        className="gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15"
      >
        <Library className="h-3.5 w-3.5" />
        Banco de Questões
      </Button>

      <span className="h-4 w-px bg-white/25" />

      <Button variant="ghost" size="sm" onClick={onSave} className="gap-1 h-7 text-[11px] text-white/90 hover:text-white hover:bg-white/15">
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
          <DropdownMenuItem onClick={onExportDocx}>
            <FileOutput className="h-4 w-4 mr-2" />
            Exportar Word (.doc)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPdf}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAvulsaExam && isCoordinator && canSubmit && (
        <Button
          size="sm"
          className="gap-1 h-7 text-[11px] bg-white text-primary hover:bg-white/90 font-semibold"
          onClick={onApproveStandalone}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Aprovar
        </Button>
      )}

      {canSubmit && !(isAvulsaExam && isCoordinator) && (
        <Button size="sm" className="gap-1 h-7 text-[11px]" onClick={onOpenSubmitDialog}>
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
            onClick={onOpenRejectDialog}
          >
            <XCircle className="h-3.5 w-3.5" />
            Rejeitar
          </Button>
          <Button
            size="sm"
            className="gap-1 h-7 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={onOpenApproveDialog}
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
  );
}
