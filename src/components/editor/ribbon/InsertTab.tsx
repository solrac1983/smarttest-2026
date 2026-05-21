import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";
import {
  ImagePlus, Link as LinkIcon, Table, BarChart3, Shapes,
  Smile, FilePlus, FileUp, FileText, PanelTop, PanelBottom,
  TextCursorInput, Sparkles, Sigma, Hash, Scissors,
  MoreHorizontal, Minus as MinusIcon, Search, Palette, Square,
  ListChecks, PenLine, CheckCheck, Columns2, BookOpen, Footprints,
  ListTodo, IndentIncrease, IndentDecrease, Braces, Calendar, Clock, User, Users,
  Upload, History,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { RibbonBtn, RibbonStackedBtn, RibbonGroup, RibbonDivider, RibbonTooltip } from "./RibbonShared";
import { insertPageBreakAtEnd } from "./RibbonConstants";
import { EquationPanel } from "../EquationPanel";
import { WordArtDialog } from "../WordArtDialog";
import { HeaderFooterDialog } from "../HeaderFooterDialog";
import type { HeaderFooterConfig } from "../PageHeaderFooterOverlay";
import { ChartEditorTab, isChartImage, parseChartData, serializeChartData, chartDataToImageSrc, getDefaultChartData, type ChartData } from "../ChartEditorTab";
import { getLastQuestionNumber } from "@/lib/examQuestionUtils";
import { Input } from "@/components/ui/input";

// Import sub-dropdowns
import { ShapesDropdown } from "./ShapesDropdown";
import { IconsDropdown } from "./IconsDropdown";
import { ChartsDropdown } from "./ChartsDropdown";
import { TableDropdown } from "./TableDropdown";
import { WatermarkDropdown, PageColorDropdown, PageBorderDropdown } from "./PageBackgroundDropdowns";
import { LinkPopoverContent } from "./LinkPopoverContent";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

interface InsertTabProps {
  editor: Editor;
  addImage: () => void;
  addImageFromUrl: () => void;
  addTable: () => void;
  insertFormula: () => void;
  showComments?: boolean;
  onToggleComments?: () => void;
  headerFooterConfig?: HeaderFooterConfig;
  onHeaderFooterConfigChange?: (config: HeaderFooterConfig) => void;
}

export function InsertTab({ editor, addImage, addImageFromUrl, addTable, insertFormula, showComments, onToggleComments, headerFooterConfig, onHeaderFooterConfigChange }: InsertTabProps) {
  const [showEquationPanel, setShowEquationPanel] = useState(false);
  const [showHeaderFooterDialog, setShowHeaderFooterDialog] = useState(false);
  const [showWordArt, setShowWordArt] = useState(false);
  const [headersList, setHeadersList] = useState<{ id: string; name: string; file_url: string; segment: string | null; grade: string | null }[]>([]);
  const [docsList, setDocsList] = useState<{ id: string; name: string; file_url: string; category: string | null }[]>([]);
  const [loadedTemplates, setLoadedTemplates] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (loadedTemplates) return;
    try {
      const [hRes, dRes] = await Promise.all([
        supabase.from("template_headers").select("id, name, file_url, segment, grade").order("created_at", { ascending: false }),
        supabase.from("template_documents").select("id, name, file_url, category").order("created_at", { ascending: false }),
      ]);
      if (hRes.error) throw hRes.error;
      if (dRes.error) throw dRes.error;
      if (hRes.data) setHeadersList(hRes.data);
      if (dRes.data) setDocsList(dRes.data);
      setLoadedTemplates(true);
    } catch (e: any) {
      showInvokeError(e?.message || "Não foi possível carregar os modelos.");
    }
  }, [loadedTemplates]);

  const insertHeaderImage = (url: string) => { (editor.commands as any).setImage({ src: url }); };

  const insertDocTemplate = async (url: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      editor.commands.setContent(result.value);
    } catch { showInvokeError("Não foi possível carregar o modelo."); }
  };

  const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
  const handleImportFile = async (file: File) => {
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        toast.error("Arquivo muito grande (máx. 25MB).");
        return;
      }
      const ext = file.name.toLowerCase().split(".").pop();
      const { importMarkdownFile, importOdtFile } = await import("@/lib/importDocuments");
      let html = "";
      const loadingId = toast.loading(`Importando ${file.name}...`);
      try {
        if (ext === "md" || ext === "markdown") {
          html = await importMarkdownFile(file);
        } else if (ext === "odt") {
          html = await importOdtFile(file);
        } else if (ext === "docx") {
          const arrayBuffer = await file.arrayBuffer();
          const mammoth = (await import("mammoth")).default;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          html = result.value;
        } else {
          toast.dismiss(loadingId);
          toast.error("Formato não suportado. Use .md, .odt ou .docx.");
          return;
        }
        editor.chain().focus().insertContent(html).run();
        toast.dismiss(loadingId);
        showInvokeSuccess(`Documento importado: ${file.name}`);
      } catch (e) {
        toast.dismiss(loadingId);
        throw e;
      }
    } catch (e: any) {
      showInvokeError(e?.message || "Falha ao importar documento.");
    }
  };

  const triggerImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.odt,.docx";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (f) await handleImportFile(f);
    };
    input.click();
  };

  const openVersionHistory = () => {
    window.dispatchEvent(new CustomEvent("editor-open-version-history"));
  };

  const handleInsertEquation = (formula: string, display?: boolean) => {
    (editor.commands as any).insertFormula({ formula, display: display || false });
    setShowEquationPanel(false);
  };

  const insertShapeSvg = (svgContent: string, defaultSize = 80, fillColor = "#000000", strokeColor = "#000000", strokeWidth = 3) => {
    let svg = svgContent
      .replace(/fill="currentColor"/g, `fill="${fillColor}"`)
      .replace(/stroke="currentColor"/g, `stroke="${strokeColor}"`)
      .replace(/stroke-width="\d+"/g, `stroke-width="${strokeWidth}"`);
    if (!svg.includes('xmlns=')) svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    svg = svg.replace('<svg ', `<svg width="${defaultSize}" height="${defaultSize}" `);
    const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    (editor.commands as any).setImage({ src: dataUri, alt: "Forma", customWidth: defaultSize, customHeight: defaultSize });
  };

  const insertWordArt = (html: string) => { editor.chain().focus().insertContent(html).run(); };

  const insertTextBox = () => {
    editor.chain().focus().insertContent(
      `<blockquote style="border:1px solid currentColor;padding:12px;margin:8px 0;border-radius:4px;background:transparent;"><p>Caixa de texto — edite aqui</p></blockquote>`
    ).run();
  };

  const insertTOC = () => {
    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4');
    if (headings.length === 0) {
      toast.info("Nenhum título encontrado. Use Título 1, 2, 3 ou 4 para gerar o sumário.");
      return;
    }
    const items = Array.from(headings).map(h => {
      const level = parseInt(h.tagName[1]);
      const indent = (level - 1) * 20;
      const text = (h.textContent || "").trim();
      return `<p style="padding-left:${indent}px;margin:2px 0;">${text}</p>`;
    }).join('');
    const tocHtml = `<div class="toc-block" style="margin:12px 0;padding:12px;border:1px solid currentColor;border-radius:4px;"><h3 style="margin:0 0 8px;">📋 Sumário</h3>${items}</div>`;
    editor.chain().focus().insertContent(tocHtml).run();
    showInvokeSuccess(`Sumário inserido com ${headings.length} ${headings.length === 1 ? 'item' : 'itens'}!`);
  };

  const insertFootnote = () => {
    // Atomic: insert reference at cursor + append footnote line at end of doc
    // without setContent (preserves cursor & undo history).
    const html = editor.getHTML();
    const count = (html.match(/class="footnote-ref"/g) || []).length + 1;
    const docEnd = editor.state.doc.content.size;
    const refHtml = `<sup class="footnote-ref" data-fn="${count}">[${count}]</sup>`;
    const lineHtml = `<p class="footnote-item" data-fn="${count}"><sup>[${count}]</sup> Nota de rodapé ${count}.</p>`;
    editor
      .chain()
      .focus()
      .insertContent(refHtml)
      .insertContentAt(docEnd, lineHtml)
      .run();
    showInvokeSuccess(`Nota de rodapé [${count}] inserida!`);
  };

  return (
    <>
      {/* ── Páginas ── */}
      <RibbonGroup label="PÁGINAS">
        <DropdownMenu>
          <RibbonTooltip label="Páginas e quebras" description="Inserir página em branco ou quebra de página no documento">
            <DropdownMenuTrigger asChild>
              <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" aria-label="Páginas e quebras" type="button">
                <FilePlus className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
                <span className="rb-stack-label whitespace-nowrap select-none">Páginas</span>
              </button>
            </DropdownMenuTrigger>
          </RibbonTooltip>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Páginas e Quebras</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              editor.chain().focus().insertContent('<div data-page-break="true"></div><p></p><div data-page-break="true"></div><p></p>').run();
              showInvokeSuccess("Página em branco inserida abaixo.");
            }}>
              <FilePlus className="h-3.5 w-3.5 mr-2" />
              Página em branco
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertPageBreakAtEnd(editor)}>
              <FileUp className="h-3.5 w-3.5 mr-2" />
              Quebra de página
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Tabelas ── */}
      <RibbonGroup label="TABELAS">
        <TableDropdown editor={editor} />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Ilustrações ── */}
      <RibbonGroup label="ILUSTRAÇÕES">
        <DropdownMenu>
          <RibbonTooltip label="Inserir imagem" description="Adicionar uma imagem do computador ou por link">
            <DropdownMenuTrigger asChild>
              <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" aria-label="Inserir imagem" type="button">
                <ImagePlus className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
                <span className="rb-stack-label whitespace-nowrap select-none">Imagem</span>
              </button>
            </DropdownMenuTrigger>
          </RibbonTooltip>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Inserir Imagem</DropdownMenuLabel>
            <DropdownMenuItem onClick={addImage}>
              <Upload className="h-3.5 w-3.5 mr-2" />
              Enviar do Computador
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addImageFromUrl}>
              <LinkIcon className="h-3.5 w-3.5 mr-2" />
              Inserir via URL / Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ShapesDropdown onInsert={insertShapeSvg} />
        <ChartsDropdown editor={editor} />
        <IconsDropdown editor={editor} />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Cabeçalho e Rodapé ── */}
      <RibbonGroup label="CABEÇALHO / RODAPÉ">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <RibbonTooltip label="Cabeçalho e rodapé" description="Inserir cabeçalhos prontos e configurar o rodapé da página">
            <DropdownMenuTrigger asChild>
              <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" aria-label="Cabeçalho e rodapé" type="button">
                <PanelTop className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
                <span className="rb-stack-label whitespace-nowrap select-none">Cab. / Rod.</span>
              </button>
            </DropdownMenuTrigger>
          </RibbonTooltip>
          <DropdownMenuContent align="start" className="min-w-[240px] max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Cabeçalho</DropdownMenuLabel>
            {headersList.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum cabeçalho cadastrado</DropdownMenuItem>}
            {headersList.map((h) => (
              <DropdownMenuItem key={h.id} onClick={() => insertHeaderImage(h.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{h.name}</span>
                {(h.segment || h.grade) && <span className="text-[10px] text-muted-foreground">{[h.segment, h.grade].filter(Boolean).join(" • ")}</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Rodapé</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowHeaderFooterDialog(true)}>
              <PanelBottom className="h-3.5 w-3.5 mr-2" />
              Configurar Rodapé...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Design da Página ── */}
      <RibbonGroup label="FUNDO DA PÁGINA">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" title="Fundo da Página">
              <Palette className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
              <span className="rb-stack-label whitespace-nowrap select-none">Fundo</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Fundo da Página</DropdownMenuLabel>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileText className="h-3.5 w-3.5 mr-2 shrink-0" />
                <span>Marca d'água</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[180px]">
                  <WatermarkDropdown editor={editor} isSubmenu />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="h-3.5 w-3.5 mr-2 shrink-0" />
                <span>Cor da Página</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[180px]">
                  <PageColorDropdown editor={editor} isSubmenu />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Square className="h-3.5 w-3.5 mr-2 shrink-0" />
                <span>Bordas da Página</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[180px]">
                  <PageBorderDropdown editor={editor} isSubmenu />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Texto & Elementos ── */}
      <RibbonGroup label="TEXTO">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" title="Texto Especial">
              <TextCursorInput className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
              <span className="rb-stack-label whitespace-nowrap select-none">Texto</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Elementos de Texto</DropdownMenuLabel>
            <DropdownMenuItem onClick={insertTextBox}>
              <TextCursorInput className="h-3.5 w-3.5 mr-2" />
              Caixa de Texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowWordArt(true)}>
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              WordArt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" title="Linhas e Divisores">
              <Scissors className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
              <span className="rb-stack-label whitespace-nowrap select-none">Divisores</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuLabel className="text-xs">Separadores e Linhas</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>─── Linha simples</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:2px dashed currentColor;margin:16px 0;padding:0;"></p>').run()}>- - - Linha tracejada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:2px dotted currentColor;margin:16px 0;padding:0;"></p>').run()}>··· Linha pontilhada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="text-align:center;border-top:3px double currentColor;margin:16px 0;padding:0;"></p>').run()}>═══ Linha dupla</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              editor.chain().focus().insertContent(
                '<p style="text-align:center;border-top:2px dashed currentColor;margin:20px 0 8px;padding-top:4px;font-size:11px;opacity:0.5;">✂️ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂️</p>'
              ).run();
            }}>
              <Scissors className="h-3.5 w-3.5 mr-2" />
              Linha de Recorte (Tesoura)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Símbolos & Referências ── */}
      <RibbonGroup label="SÍMBOLOS E REF.">
        <div className="relative">
          <RibbonStackedBtn onClick={() => setShowEquationPanel(!showEquationPanel)} active={showEquationPanel} icon={Sigma} label="Equação" description="Inserir fórmulas e expressões matemáticas (LaTeX)" />
          {showEquationPanel && <EquationPanel onInsert={handleInsertEquation} onClose={() => setShowEquationPanel(false)} />}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" title="Links e Referências">
              <LinkIcon className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
              <span className="rb-stack-label whitespace-nowrap select-none">Referências</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Links e Referências</DropdownMenuLabel>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Braces className="h-3.5 w-3.5 mr-2 shrink-0" />
                <span>Campos Dinâmicos</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[200px]">
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("date")}>
                    <Calendar className="h-3.5 w-3.5 mr-2" />Data atual
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("time")}>
                    <Clock className="h-3.5 w-3.5 mr-2" />Hora atual
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("datetime")}>
                    <Calendar className="h-3.5 w-3.5 mr-2" />Data e hora
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("page_number")}>
                    <Hash className="h-3.5 w-3.5 mr-2" />Número da página
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("page_count")}>
                    <Hash className="h-3.5 w-3.5 mr-2" />Total de páginas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("doc_title")}>
                    <FileText className="h-3.5 w-3.5 mr-2" />Título do documento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("author")}>
                    <User className="h-3.5 w-3.5 mr-2" />Autor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("student_name")}>
                    <User className="h-3.5 w-3.5 mr-2" />Nome do aluno
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (editor.commands as any).insertDynamicField?.("class_group")}>
                    <Users className="h-3.5 w-3.5 mr-2" />Turma
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={insertTOC}>
              <BookOpen className="h-3.5 w-3.5 mr-2" />
              Sumário automático
            </DropdownMenuItem>

            <DropdownMenuItem onClick={insertFootnote}>
              <Footprints className="h-3.5 w-3.5 mr-2" />
              Nota de rodapé
            </DropdownMenuItem>

            <Popover>
              <PopoverTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <LinkIcon className="h-3.5 w-3.5 mr-2" />
                  Inserir Hiperlink...
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="start">
                <LinkPopoverContent editor={editor} />
              </PopoverContent>
            </Popover>

          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Questões ── */}
      <RibbonGroup label="QUESTÕES">
        <RibbonStackedBtn
          onClick={() => {
            const num = getLastQuestionNumber(editor.getHTML()) + 1;
            editor.chain().focus().insertContent(`<p><strong>Questão ${num})</strong> </p>`).run();
          }}
          icon={Hash}
          label="Numerar"
          description="Inserir nova questão numerada (renumeração automática)"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" title="Templates de questão">
              <ListChecks className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
              <span className="rb-stack-label whitespace-nowrap select-none">Templates</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[260px]">
            <DropdownMenuLabel className="text-xs">Templates Inteligentes</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const html = `<p><strong>${num})</strong> Enunciado da questão...</p>` +
                ['a', 'b', 'c', 'd', 'e'].map(l => `<p>${l}) </p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <ListChecks className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Múltipla Escolha (A–E)</span>
                <span className="text-[10px] text-muted-foreground">5 alternativas com enunciado</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const html = `<p><strong>${num})</strong> Enunciado da questão...</p>` +
                ['a', 'b', 'c', 'd'].map(l => `<p>${l}) </p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <ListChecks className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Múltipla Escolha (A–D)</span>
                <span className="text-[10px] text-muted-foreground">4 alternativas com enunciado</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const lines = Array.from({ length: 5 }, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
              const html = `<p><strong>${num})</strong> Enunciado da questão dissertativa...</p>${lines}`;
              editor.chain().focus().insertContent(html).run();
            }}>
              <PenLine className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Dissertativa</span>
                <span className="text-[10px] text-muted-foreground">Enunciado + linhas para resposta</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const items = ['Afirmação 1...', 'Afirmação 2...', 'Afirmação 3...', 'Afirmação 4...', 'Afirmação 5...'];
              const html = `<p><strong>${num})</strong> Classifique as afirmações abaixo em Verdadeiro (V) ou Falso (F):</p>` +
                items.map(item => `<p>( &nbsp; ) ${item}</p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <CheckCheck className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Verdadeiro ou Falso</span>
                <span className="text-[10px] text-muted-foreground">5 afirmações com espaço V/F</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const num = getLastQuestionNumber(editor.getHTML()) + 1;
              const html =
                `<p><strong>${num})</strong> Associe as colunas abaixo:</p>` +
                `<p><strong>Coluna A</strong></p>` +
                `<p>(1) Item 1</p><p>(2) Item 2</p><p>(3) Item 3</p><p>(4) Item 4</p>` +
                `<p></p>` +
                `<p><strong>Coluna B</strong></p>` +
                `<p>( &nbsp; ) Descrição A</p><p>( &nbsp; ) Descrição B</p><p>( &nbsp; ) Descrição C</p><p>( &nbsp; ) Descrição D</p>` +
                `<p></p>` +
                `<p>A sequência correta é:</p>` +
                ['a', 'b', 'c', 'd', 'e'].map(l => `<p>${l}) </p>`).join('');
              editor.chain().focus().insertContent(html).run();
            }}>
              <Columns2 className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Associação de Colunas</span>
                <span className="text-[10px] text-muted-foreground">Coluna A × Coluna B com alternativas</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk" title="Espaço para resposta">
              <MinusIcon className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
              <span className="rb-stack-label whitespace-nowrap select-none">Resposta</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Espaço para Resposta</DropdownMenuLabel>
            {[3, 5, 10].map(n => (
              <DropdownMenuItem key={n} onClick={() => {
                const lines = Array.from({length: n}, () => '<p style="border-bottom:1px solid currentColor;min-height:28px;margin:4px 0;"></p>').join('');
                editor.chain().focus().insertContent(lines).run();
              }}>📝 {n} linhas pautadas</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="border:1px solid currentColor;min-height:120px;margin:8px 0;border-radius:4px;padding:8px;"></p>').run()}>📦 Caixa para resposta (pequena)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().insertContent('<p style="border:1px solid currentColor;min-height:240px;margin:8px 0;border-radius:4px;padding:8px;"></p>').run()}>📦 Caixa para resposta (grande)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Listas ── */}
      <RibbonGroup label="LISTAS E RECUO" className="flex-row items-center gap-1">
        <RibbonBtn
          onClick={() => (editor.chain().focus() as any).toggleTaskList?.().run()}
          active={editor.isActive("taskList")}
          icon={ListTodo}
          label="Tarefas"
          description="Inserir lista de tarefas com caixas de seleção"
        />
        <RibbonBtn
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          icon={IndentIncrease}
          label="Diminuir Recuo"
          shortcut="Shift+Tab"
          description="Diminuir nível da lista (voltar ao nível anterior)"
        />
        <RibbonBtn
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          icon={IndentDecrease}
          label="Aumentar Recuo"
          shortcut="Tab"
          description="Aumentar nível da lista (sublista)"
        />
      </RibbonGroup>
      <RibbonDivider />

      {/* ── Documento & Avançado ── */}
      <RibbonGroup label="DOCUMENTO">
        <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
          <DropdownMenuTrigger asChild>
            <button className="rb-stacked-btn flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 min-w-[52px] transition-all duration-150 group/stk">
              <FileText className="h-[18px] w-[18px] transition-transform duration-150 group-hover/stk:scale-110 group-hover/stk:-translate-y-[1px]" />
              <span className="rb-stack-label whitespace-nowrap select-none">Modelos</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px] max-h-[350px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Cabeçalhos de prova</DropdownMenuLabel>
            {headersList.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum cabeçalho cadastrado</DropdownMenuItem>}
            {headersList.map((h) => (
              <DropdownMenuItem key={h.id} onClick={() => insertHeaderImage(h.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{h.name}</span>
                {(h.segment || h.grade) && <span className="text-[10px] text-muted-foreground">{[h.segment, h.grade].filter(Boolean).join(" • ")}</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Modelos de prova (.docx)</DropdownMenuLabel>
            {docsList.length === 0 && <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhum modelo cadastrado</DropdownMenuItem>}
            {docsList.map((d) => (
              <DropdownMenuItem key={d.id} onClick={() => insertDocTemplate(d.file_url)} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-medium">{d.name}</span>
                {d.category && <span className="text-[10px] text-muted-foreground">{d.category}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <RibbonStackedBtn
          onClick={triggerImport}
          icon={Upload}
          label="Importar"
          description="Importar arquivo .md (Markdown), .odt (OpenDocument) ou .docx (Word)"
        />
        <RibbonStackedBtn
          onClick={openVersionHistory}
          icon={History}
          label="Histórico"
          description="Ver histórico de versões salvas e restaurar uma versão anterior"
        />
      </RibbonGroup>

      <WordArtDialog open={showWordArt} onOpenChange={setShowWordArt} onInsert={insertWordArt} />
      {showHeaderFooterDialog && headerFooterConfig && onHeaderFooterConfigChange && (
        <HeaderFooterDialog
          open={showHeaderFooterDialog}
          onOpenChange={setShowHeaderFooterDialog}
          config={headerFooterConfig}
          onSave={onHeaderFooterConfigChange}
        />
      )}
    </>
  );
}
