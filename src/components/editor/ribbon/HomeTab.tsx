import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2,
  Heading3, Undo, Redo, Quote, Superscript, Subscript, Highlighter,
  Palette, Type,
  ALargeSmall, Paintbrush, Eraser, CaseSensitive,
  Search, Replace, SpellCheck, MousePointer2, ListChecks,
  GaugeCircle, ArrowDownAZ, ArrowUpAZ, BarChart2, AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RibbonBtn, RibbonStackedBtn, RibbonGroup, RibbonDivider, RibbonTooltip } from "./RibbonShared";
import { textColors, highlightColors, fontSizes, moreFonts } from "./RibbonConstants";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

interface HomeTabProps {
  editor: Editor;
  onAIReview?: () => void;
  isAIReviewLoading?: boolean;
}

export function HomeTab({ editor, onAIReview, isAIReviewLoading }: HomeTabProps) {
  const [formatPainterMarks, setFormatPainterMarks] = useState<any[] | null>(null);
  const formatPainterRef = useRef<any[] | null>(null);

  useEffect(() => { formatPainterRef.current = formatPainterMarks; }, [formatPainterMarks]);

  useEffect(() => {
    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null;
    if (editorEl) {
      if (formatPainterMarks) {
        editorEl.style.cursor = 'crosshair';
        editorEl.classList.add('format-painter-active');
      } else {
        editorEl.style.cursor = '';
        editorEl.classList.remove('format-painter-active');
      }
    }
    return () => {
      if (editorEl) { editorEl.style.cursor = ''; editorEl.classList.remove('format-painter-active'); }
    };
  }, [formatPainterMarks]);

  // Format painter: apply on mouseup only (single source of truth) + ESC to cancel.
  useEffect(() => {
    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null;
    let applying = false;

    const applyPainter = () => {
      const marks = formatPainterRef.current;
      if (!marks || applying) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;
      applying = true;
      requestAnimationFrame(() => {
        try {
          const tr = editor.state.tr;
          editor.state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
              node.marks.forEach((mark) => {
                tr.removeMark(Math.max(pos, from), Math.min(pos + node.nodeSize, to), mark.type);
              });
            }
          });
          marks.forEach((mark: any) => tr.addMark(from, to, mark));
          editor.view.dispatch(tr);
          formatPainterRef.current = null;
          setFormatPainterMarks(null);
          showInvokeSuccess("Formatação aplicada!");
        } finally {
          applying = false;
        }
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && formatPainterRef.current) {
        formatPainterRef.current = null;
        setFormatPainterMarks(null);
        toast.info("Pincel de formatação cancelado.");
      }
    };

    editorEl?.addEventListener('mouseup', applyPainter);
    window.addEventListener('keydown', onKey);
    return () => {
      editorEl?.removeEventListener('mouseup', applyPainter);
      window.removeEventListener('keydown', onKey);
    };
  }, [editor]);



  const sortContent = useCallback((direction: 'asc' | 'desc') => {
    try {
      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const elements = Array.from(doc.body.children);
      const sortable = elements.filter(el => /^(P|H[1-6])$/.test(el.tagName));
      if (sortable.length < 2) {
        toast.info("É necessário ter ao menos 2 parágrafos para classificar.");
        return;
      }
      const sorted = [...sortable].sort((a, b) => {
        const textA = (a.textContent || '').trim().toLowerCase();
        const textB = (b.textContent || '').trim().toLowerCase();
        return direction === 'asc'
          ? textA.localeCompare(textB, 'pt-BR', { numeric: true })
          : textB.localeCompare(textA, 'pt-BR', { numeric: true });
      });
      // Replace sortable items in original positions, keep tables/images in place
      let i = 0;
      const newOrdered = elements.map(el =>
        /^(P|H[1-6])$/.test(el.tagName) ? sorted[i++] : el
      );
      editor.chain().focus().setContent(newOrdered.map(el => el.outerHTML).join(''), true).run();
      showInvokeSuccess(`Parágrafos classificados (${direction === 'asc' ? 'A→Z' : 'Z→A'}).`);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível classificar o conteúdo.");
    }
  }, [editor]);

  const openFind = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-open-find-replace', { detail: { mode: 'find' } }));
  }, []);

  const openReplace = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor-open-find-replace', { detail: { mode: 'replace' } }));
  }, []);



  const transformCase = useCallback((mode: 'upper' | 'lower' | 'capitalize') => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      toast.info("Selecione um texto primeiro.");
      return;
    }
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text) return;
    const transformed =
      mode === 'upper' ? text.toUpperCase()
      : mode === 'lower' ? text.toLowerCase()
      : text.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_m, sp, ch) => sp + ch.toUpperCase());
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, transformed)
      .setTextSelection({ from, to: from + transformed.length })
      .run();
  }, [editor]);

  const activateFormatPainter = useCallback(() => {
    if (formatPainterMarks) {
      setFormatPainterMarks(null);
      toast.info("Pincel de formatação cancelado.");
      return;
    }
    const { from, to, $from } = editor.state.selection;
    let marks: readonly any[] = [];
    if (from === to) {
      marks = editor.state.storedMarks || $from.marks();
      if ((!marks || marks.length === 0) && from > 0) {
        marks = editor.state.doc.resolve(from - 1).marks();
      }
    } else {
      editor.state.doc.nodesBetween(from, to, (node) => {
        if (node.isText && node.marks.length > 0 && marks.length === 0) marks = node.marks;
      });
    }
    if (!marks || marks.length === 0) {
      toast.info("Posicione o cursor em um texto formatado ou selecione-o.");
      return;
    }
    setFormatPainterMarks([...marks]);
    showInvokeSuccess("Formatação copiada! Selecione o texto destino.");
  }, [editor, formatPainterMarks]);


  return (
    <>
      {formatPainterMarks && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          <Paintbrush className="h-3 w-3" />
          Selecione o texto destino para aplicar a formatação
          <button onClick={() => { setFormatPainterMarks(null); toast.info("Pincel cancelado."); }} className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5">✕</button>
        </div>
      )}
      {/* ÁREA DE TRANSFERÊNCIA */}
      <RibbonGroup label="ÁREA DE TRANSFERÊNCIA" className="flex-row items-center gap-1">
        <RibbonBtn onClick={() => editor.chain().focus().undo().run()} icon={Undo} label="Desfazer" shortcut="Ctrl+Z" description="Voltar a última alteração feita no documento" />
        <RibbonBtn onClick={() => editor.chain().focus().redo().run()} icon={Redo} label="Refazer" shortcut="Ctrl+Y" description="Restaurar a última alteração desfeita" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={activateFormatPainter}
              className={cn(
                "p-1.5 rounded transition-all relative border border-transparent hover:border-border/40 hover:bg-muted",
                formatPainterMarks ? "bg-primary/10 text-primary border-primary/20 animate-pulse" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              {formatPainterMarks && <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-primary animate-ping" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="px-2.5 py-1.5 shadow-lg">
            <div className="flex flex-col gap-0.5 max-w-[200px]">
              <span className="font-semibold text-[11px]">{formatPainterMarks ? "Cancelar pincel" : "Pincel de formatação"}</span>
              <span className="text-[10px] text-muted-foreground leading-snug">
                {formatPainterMarks ? "Clique para cancelar" : "Copiar formatação e aplicar em outro texto"}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>

        <RibbonBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} icon={Eraser} label="Limpar formatação" shortcut="Ctrl+\" description="Remover estilos e voltar o texto para o formato padrão" />
      </RibbonGroup>

      <RibbonDivider />

      {/* FONTE */}
      <RibbonGroup label="FONTE" className="flex-row items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[110px] border border-border/40 hover:border-border h-[26px]">
              <Type className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium text-left" style={{ fontFamily: editor.getAttributes('textStyle').fontFamily || undefined }}>
                {(() => {
                  const active = editor.getAttributes('textStyle').fontFamily;
                  if (!active) return 'Padrão';
                  const match = moreFonts.find(f => f.value === active);
                  return match ? match.label : active.split(',')[0].replace(/['"]/g, '');
                })()}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px] max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Fontes disponíveis</DropdownMenuLabel>
            {moreFonts.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => editor.chain().focus().setFontFamily(f.value).run()} style={{ fontFamily: f.value }}>{f.label}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>Limpar fonte</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[56px] border border-border/40 hover:border-border h-[26px]">
              <ALargeSmall className="h-3 w-3 shrink-0" />
              <span className="font-medium">
                {(() => {
                  const fs = editor.getAttributes('textStyle').fontSize;
                  return fs ? fs.replace('pt', '') + 'pt' : '11pt';
                })()}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[100px] max-h-[250px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Tamanho</DropdownMenuLabel>
            {fontSizes.map((size) => (
              <DropdownMenuItem key={size} onClick={() => (editor.commands as any).setFontSize(`${size}pt`)}>
                <span style={{ fontSize: Math.min(parseInt(size), 24) + 'px' }}>{size}pt</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => (editor.commands as any).unsetFontSize()}>Padrão</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border/50 mx-0.5"></div>

        <RibbonBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={Bold} label="Negrito" shortcut="Ctrl+B" description="Destacar o texto selecionado em negrito" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={Italic} label="Itálico" shortcut="Ctrl+I" description="Aplicar itálico ao texto selecionado" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={Underline} label="Sublinhado" shortcut="Ctrl+U" description="Sublinhar o texto selecionado" />

        <div className="w-px h-4 bg-border/50 mx-0.5"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("p-1.5 rounded transition-all border border-transparent hover:border-border/40 hover:bg-muted", (editor.isActive("highlight") || editor.getAttributes('textStyle').color) ? "text-primary bg-primary/5 border-primary/20" : "text-muted-foreground hover:text-foreground")}>
              <Palette className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Cores e Realce</DropdownMenuLabel>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                <span>Cor do texto</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[160px]">
                  {textColors.map((c) => (
                    <DropdownMenuItem key={c.value || "d"} onClick={() => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()}>
                      <span className="h-3 w-3 rounded-full border border-border mr-2 shrink-0" style={{ background: c.value || "currentColor" }} />{c.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Highlighter className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                <span>Cor de realce</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[160px]">
                  {highlightColors.map((c) => (
                    <DropdownMenuItem key={c.value} onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}>
                      <span className="h-3 w-3 rounded border border-border mr-2 shrink-0" style={{ background: c.value }} />{c.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().unsetHighlight().run()}>Remover realce</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <RibbonTooltip label="Mais estilos de texto" description="Abrir opções como tachado, subscrito, sobrescrito e transformação de maiúsculas/minúsculas">
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-transparent hover:border-border/40" aria-label="Mais estilos de texto" type="button">
                <ALargeSmall className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
          </RibbonTooltip>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Estilos adicionais</DropdownMenuLabel>
            
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleStrike().run()} className="flex items-center">
              <Strikethrough className="h-3.5 w-3.5 mr-2" />
              Tachado
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => { if (editor.isActive("superscript")) editor.chain().focus().unsetSuperscript().run(); editor.chain().focus().toggleSubscript().run(); }} className="flex items-center">
              <Subscript className="h-3.5 w-3.5 mr-2" />
              Subscrito
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => { if (editor.isActive("subscript")) editor.chain().focus().unsetSubscript().run(); editor.chain().focus().toggleSuperscript().run(); }} className="flex items-center">
              <Superscript className="h-3.5 w-3.5 mr-2" />
              Sobrescrito
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CaseSensitive className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                <span>Maiúsculas / Minúsculas</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => transformCase('upper')}>MAIÚSCULAS</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => transformCase('lower')}>minúsculas</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => transformCase('capitalize')}>Capitalizar Cada Palavra</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>

      <RibbonDivider />

      {/* PARÁGRAFO */}
      <RibbonGroup label="PARÁGRAFO" className="flex-row items-center gap-1">
        <RibbonBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={List} label="Marcadores" shortcut="Ctrl+Shift+8" description="Criar ou remover uma lista com marcadores" />
        <RibbonBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={ListOrdered} label="Numeração" shortcut="Ctrl+Shift+7" description="Criar ou remover uma lista numerada" />
        
        <div className="w-px h-4 bg-border/50 mx-0.5"></div>

        <DropdownMenu>
          <RibbonTooltip label="Alinhamento" description="Escolher entre alinhar à esquerda, centralizar, alinhar à direita ou justificar">
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-transparent hover:border-border/40" aria-label="Alinhamento" type="button">
                {(() => {
                  if (editor.isActive({ textAlign: "center" })) return <AlignCenter className="h-3.5 w-3.5 text-primary" />;
                  if (editor.isActive({ textAlign: "right" })) return <AlignRight className="h-3.5 w-3.5 text-primary" />;
                  if (editor.isActive({ textAlign: "justify" })) return <AlignJustify className="h-3.5 w-3.5 text-primary" />;
                  return <AlignLeft className="h-3.5 w-3.5" />;
                })()}
              </button>
            </DropdownMenuTrigger>
          </RibbonTooltip>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Alinhamento</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <AlignLeft className="h-3.5 w-3.5 mr-2" />Alinhar à esquerda
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <AlignCenter className="h-3.5 w-3.5 mr-2" />Centralizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <AlignRight className="h-3.5 w-3.5 mr-2" />Alinhar à direita
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
              <AlignJustify className="h-3.5 w-3.5 mr-2" />Justificar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <RibbonBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={Quote} label="Citação" shortcut="Ctrl+Shift+B" description="Destacar o parágrafo atual como uma citação" />

        <div className="w-px h-4 bg-border/50 mx-0.5"></div>

        <DropdownMenu>
          <RibbonTooltip label="Classificar texto" description="Ordenar os parágrafos do documento em ordem alfabética crescente ou decrescente">
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-transparent hover:border-border/40" aria-label="Classificar texto" type="button">
                <ArrowDownAZ className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
          </RibbonTooltip>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel className="text-xs">Classificar texto</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => sortContent('asc')}>
              <ArrowDownAZ className="h-3.5 w-3.5 mr-2" />Classificar A → Z
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => sortContent('desc')}>
              <ArrowUpAZ className="h-3.5 w-3.5 mr-2" />Classificar Z → A
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>

      <RibbonDivider />

      {/* ESTILOS */}
      <RibbonGroup label="ESTILOS" className="flex-row items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[100px] border border-border/40 hover:border-border h-[26px]">
              <Heading1 className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate font-medium text-left">
                {(() => {
                  if (editor.isActive("heading", { level: 1 })) return "Título 1";
                  if (editor.isActive("heading", { level: 2 })) return "Título 2";
                  if (editor.isActive("heading", { level: 3 })) return "Título 3";
                  if (editor.isActive("heading", { level: 4 })) return "Título 4";
                  if (editor.isActive("heading", { level: 5 })) return "Título 5";
                  if (editor.isActive("blockquote")) return "Citação";
                  return "Normal";
                })()}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuLabel className="text-xs">Estilos rápidos</DropdownMenuLabel>
            {[
              { label: "Normal", active: !editor.isActive("heading") && !editor.isActive("blockquote"), apply: () => editor.chain().focus().setParagraph().unsetAllMarks().run() },
              { label: "Título 1", active: editor.isActive("heading", { level: 1 }), apply: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
              { label: "Título 2", active: editor.isActive("heading", { level: 2 }), apply: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
              { label: "Título 3", active: editor.isActive("heading", { level: 3 }), apply: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
              { label: "Título 4", active: editor.isActive("heading", { level: 4 }), apply: () => editor.chain().focus().toggleHeading({ level: 4 }).run() },
              { label: "Título 5", active: editor.isActive("heading", { level: 5 }), apply: () => editor.chain().focus().toggleHeading({ level: 5 }).run() },
              { label: "Citação", active: editor.isActive("blockquote"), apply: () => editor.chain().focus().toggleBlockquote().run() },
            ].map((style) => (
              <DropdownMenuItem key={style.label} onClick={style.apply} className={cn("flex items-center justify-between", style.active ? "text-primary font-medium" : "")}>
                <span>{style.label}</span>
                {style.active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </RibbonGroup>

      <RibbonDivider />

      {/* EDIÇÃO / REVISÃO */}
      <RibbonGroup label="EDIÇÃO" className="flex-row items-center gap-1">
        <RibbonBtn onClick={openFind} icon={Search} label="Localizar" shortcut="Ctrl+F" description="Procurar palavras ou trechos dentro do documento" />
        <RibbonBtn onClick={openReplace} icon={Replace} label="Substituir" shortcut="Ctrl+H" description="Localizar um termo e trocá-lo por outro" />
        <RibbonBtn
          onClick={() => {
            const editorEl = document.querySelector('.ProseMirror') as HTMLElement;
            if (editorEl) {
              const enable = editorEl.getAttribute('spellcheck') !== 'true';
              editorEl.setAttribute('spellcheck', String(enable));
              editorEl.setAttribute('lang', 'pt-BR');
              if (enable) { editorEl.blur(); setTimeout(() => editorEl.focus(), 50); }
              showInvokeSuccess(enable ? 'Revisão ortográfica ativada.' : 'Revisão ortográfica desativada.');
            }
          }}
          icon={SpellCheck}
          label="Ortografia"
          description="Ativar ou desativar a revisão ortográfica do texto"
        />
        <RibbonBtn
          onClick={onAIReview}
          icon={Sparkles}
          label="Revisão com IA"
          description="Analisar o texto com ajuda da IA e sugerir melhorias"
          disabled={isAIReviewLoading}
        />
      </RibbonGroup>
    </>
  );
}
