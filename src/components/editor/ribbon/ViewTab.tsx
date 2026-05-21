import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Ruler, Grid3X3, ZoomIn, ZoomOut, Printer, BarChart2, AlertCircle,
  AlignVerticalSpaceAround, Focus, Keyboard, Maximize2, RotateCcw, FileText, Monitor,
} from "lucide-react";
import { RibbonBtn, RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PrintPreviewDialog } from "../PrintPreviewDialog";
import { ShortcutsDialog } from "../ShortcutsDialog";

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const ZOOM_PRESETS = [75, 100, 125, 150];

const RULER_STYLE_ID = "editor-ruler-style";
const GRID_STYLE_ID = "editor-grid-style";

const RULER_CSS = `.exam-page { background-image: linear-gradient(to right, transparent 59px, hsl(var(--border)) 59px, hsl(var(--border)) 60px, transparent 60px); background-size: 100% 100%; background-repeat: no-repeat; }`;
const GRID_CSS = `.tiptap { background-image: linear-gradient(hsl(var(--border) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.15) 1px, transparent 1px); background-size: 20px 20px; }`;

function ensureStyle(id: string): HTMLStyleElement {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

export function ViewTab({ zoom, onZoomChange, editor, layoutMode, onLayoutModeChange }: { zoom: number; onZoomChange: (z: number) => void; editor: Editor; layoutMode: "vertical" | "horizontal"; onLayoutModeChange: (mode: "vertical" | "horizontal") => void }) {
  // Initialize from DOM to avoid desync after remount
  const [showRuler, setShowRuler] = useState(() => !!document.getElementById(RULER_STYLE_ID)?.textContent);
  const [showGrid, setShowGrid] = useState(() => !!document.getElementById(GRID_STYLE_ID)?.textContent);
  const [showMarginGuides, setShowMarginGuides] = useState(
    () => !!document.querySelector('.exam-page .tiptap')?.classList.contains('show-margin-guides')
  );
  const [focusMode, setFocusMode] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const setZoomClamped = useCallback((z: number) => {
    onZoomChange(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(z))));
  }, [onZoomChange]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Help
      if ((mod && e.key === '/') || e.key === 'F1') {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (!mod) return;

      // Zoom in: Ctrl + =  /  Ctrl + +
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoomClamped(zoom + ZOOM_STEP);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomClamped(zoom - ZOOM_STEP);
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomClamped(100);
      } else if (e.key === 'p' || e.key === 'P') {
        // Override browser print with our preview
        e.preventDefault();
        setPrintPreviewOpen(true);
      } else if (e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        // Focus mode: Ctrl+Shift+F
        e.preventDefault();
        setFocusMode((p) => {
          const next = !p;
          window.dispatchEvent(new Event('editor-toggle-focus-mode'));
          toast.success(next ? "Modo foco ativado" : "Modo foco desativado");
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, setZoomClamped]);

  // Ctrl + mouse wheel zoom
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoomClamped(zoom + delta);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [zoom, setZoomClamped]);

  const toggleRuler = useCallback(() => {
    setShowRuler((prev) => {
      const next = !prev;
      ensureStyle(RULER_STYLE_ID).textContent = next ? RULER_CSS : '';
      return next;
    });
  }, []);

  const toggleGrid = useCallback(() => {
    setShowGrid((prev) => {
      const next = !prev;
      ensureStyle(GRID_STYLE_ID).textContent = next ? GRID_CSS : '';
      return next;
    });
  }, []);

  const toggleMarginGuides = useCallback(() => {
    setShowMarginGuides((prev) => {
      const next = !prev;
      const tiptapEl = document.querySelector('.exam-page .tiptap');
      tiptapEl?.classList.toggle('show-margin-guides', next);
      return next;
    });
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      window.dispatchEvent(new Event('editor-toggle-focus-mode'));
      toast.success(next ? "Modo foco ativado" : "Modo foco desativado");
      return next;
    });
  }, []);

  const fitToWindow = useCallback(() => {
    const page = document.querySelector('.exam-page') as HTMLElement | null;
    const container = page?.parentElement;
    if (!page || !container) {
      toast.error("Não foi possível calcular o ajuste");
      return;
    }
    const pageWidth = page.getBoundingClientRect().width / (zoom / 100);
    const available = container.clientWidth - 48; // padding
    const target = Math.floor((available / pageWidth) * 100);
    setZoomClamped(target);
    toast.success(`Ajustado à janela: ${Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target))}%`);
  }, [zoom, setZoomClamped]);

  const handleStats = useCallback(() => {
    try {
      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const allText = doc.body.innerText || doc.body.textContent || '';

      // Better question detection
      const numericQuestions = (allText.match(/(?:^|\n)\s*\d+[\.\)\-]/g) || []).length;
      const labeledQuestions = (allText.match(/quest[ãa]o\s*\d+/gi) || []).length;
      const total = Math.max(numericQuestions, labeledQuestions);

      const images = doc.body.querySelectorAll('img').length;
      const tables = doc.body.querySelectorAll('table').length;
      const words = (allText.trim().match(/\S+/g) || []).length;
      const chars = allText.replace(/\s/g, '').length;

      toast('📊 Estatísticas do Documento', {
        description: `📝 ~${total} questões · 🖼️ ${images} imagens · 📋 ${tables} tabelas · ✏️ ${words} palavras · 🔤 ${chars} caracteres`,
        duration: 10000,
      });
    } catch (err) {
      toast.error("Não foi possível calcular as estatísticas");
    }
  }, [editor]);

  const handleVerify = useCallback(() => {
    try {
      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const text = (doc.body.textContent || '').trim();
      const issues: string[] = [];

      if (text.length < 50) issues.push('⚠️ Documento muito curto');
      if (doc.body.querySelectorAll('img').length === 0) issues.push('ℹ️ Nenhuma imagem');
      if (!/\b[a-eA-E]\)|\([a-eA-E]\)/.test(text)) issues.push('ℹ️ Sem alternativas detectadas');

      // Detect very long paragraphs that might break pagination
      const longParas = Array.from(doc.body.querySelectorAll('p')).filter(p => (p.textContent || '').length > 1500).length;
      if (longParas > 0) issues.push(`⚠️ ${longParas} parágrafo(s) muito longo(s)`);

      // Detect images without alt
      const imgsNoAlt = Array.from(doc.body.querySelectorAll('img')).filter(i => !i.getAttribute('alt')).length;
      if (imgsNoAlt > 0) issues.push(`ℹ️ ${imgsNoAlt} imagem(ns) sem descrição (alt)`);

      if (issues.length === 0) {
        toast.success('✅ Nenhum problema encontrado');
      } else {
        toast('🔍 Verificação', { description: issues.join(' · '), duration: 10000 });
      }
    } catch {
      toast.error("Não foi possível verificar o documento");
    }
  }, [editor]);

  const zoomLabel = useMemo(() => `${zoom}%`, [zoom]);

  return (
    <>
      <RibbonGroup label="LAYOUT DA PÁGINA">
        <RibbonStackedBtn 
          onClick={() => onLayoutModeChange('vertical')} 
          active={layoutMode === 'vertical'} 
          icon={FileText} 
          label="Vertical" 
          description="Exibir páginas uma embaixo da outra" 
        />
        <RibbonStackedBtn 
          onClick={() => onLayoutModeChange('horizontal')} 
          active={layoutMode === 'horizontal'} 
          icon={Monitor} 
          label="Lado a Lado" 
          description="Exibir páginas lado a lado horizontalmente" 
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="EXIBIR">
        <RibbonStackedBtn onClick={toggleRuler} active={showRuler} icon={Ruler} label="Régua" description="Mostrar/ocultar a régua vertical na lateral do documento" />
        <RibbonStackedBtn onClick={toggleGrid} active={showGrid} icon={Grid3X3} label="Grade" description="Exibir uma grade de referência sobre o documento" />
        <RibbonStackedBtn onClick={toggleMarginGuides} active={showMarginGuides} icon={AlignVerticalSpaceAround} label="Margens" description="Mostrar/ocultar as guias visuais de margem" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="MODO FOCO">
        <RibbonStackedBtn onClick={toggleFocusMode} active={focusMode} icon={Focus} label="Foco" shortcut="Ctrl+Shift+F" description="Ativar modo foco: oculta distrações para concentração na escrita" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="ZOOM">
        <RibbonBtn
          onClick={() => setZoomClamped(zoom - ZOOM_STEP)}
          icon={ZoomOut}
          label="Diminuir zoom"
          shortcut="Ctrl+−"
          description="Reduzir o nível de zoom do documento"
          disabled={zoom <= ZOOM_MIN}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setZoomClamped(100)}
              aria-label="Restaurar 100%"
              className="text-xs font-medium text-muted-foreground hover:text-foreground min-w-[44px] text-center tabular-nums hover:bg-muted rounded px-1 py-0.5 transition-colors"
            >
              {zoomLabel}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="text-[10px]">Restaurar 100% (Ctrl+0)</TooltipContent>
        </Tooltip>
        <RibbonBtn
          onClick={() => setZoomClamped(zoom + ZOOM_STEP)}
          icon={ZoomIn}
          label="Aumentar zoom"
          shortcut="Ctrl++"
          description="Aumentar o nível de zoom do documento"
          disabled={zoom >= ZOOM_MAX}
        />
        <RibbonBtn onClick={() => setZoomClamped(100)} icon={RotateCcw} label="Restaurar" shortcut="Ctrl+0" description="Restaurar zoom para 100%" />
        <RibbonBtn onClick={fitToWindow} icon={Maximize2} label="Ajustar" description="Ajustar o documento à largura da janela" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="PREDEFINIÇÕES">
        {ZOOM_PRESETS.map((z) => (
          <Tooltip key={z}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setZoomClamped(z)}
                aria-label={`Zoom ${z}%`}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                  zoom === z
                    ? "bg-muted text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {z}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-[10px]">Zoom {z}%</TooltipContent>
          </Tooltip>
        ))}
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="IMPRESSÃO">
        <RibbonStackedBtn onClick={() => setPrintPreviewOpen(true)} icon={Printer} label="Imprimir" shortcut="Ctrl+P" description="Abrir visualização de impressão do documento" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="ESTATÍSTICAS">
        <RibbonStackedBtn onClick={handleStats} icon={BarChart2} label="Contar" description="Contar questões, palavras, imagens e tabelas" />
        <RibbonStackedBtn onClick={handleVerify} icon={AlertCircle} label="Verificar" description="Verificar problemas: alternativas, imagens, parágrafos longos" />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="AJUDA">
        <RibbonStackedBtn
          onClick={() => setShortcutsOpen(true)}
          icon={Keyboard}
          label="Atalhos"
          shortcut="Ctrl+/"
          description="Ver lista completa de atalhos de teclado do editor"
        />
      </RibbonGroup>
      <PrintPreviewDialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
