import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { FileText, Type, Hash, Layers, ZoomIn, Minus, Check, Loader2, AlertCircle, Languages, FileBox } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useDocumentOptional } from "./core/DocumentContext";
import { PageSettingsPanel } from "./PageSettingsPanel";
import { cn } from "@/lib/utils";

type SaveStatus = "saved" | "saving" | "unsaved";

interface EditorStatusBarProps {
  editor: Editor;
  zoom: number;
  onZoomChange?: (z: number) => void;
  saveStatus?: SaveStatus;
  wordLimit?: number;
  charLimit?: number;
}

interface DocStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  pages: number;
}

export function EditorStatusBar({ editor, zoom, onZoomChange, saveStatus = "saved", wordLimit, charLimit }: EditorStatusBarProps) {
  const [stats, setStats] = useState<DocStats>({ words: 0, characters: 0, charactersNoSpaces: 0, lines: 0, pages: 1 });
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const docCtx = useDocumentOptional();
  const pageSetup = docCtx?.model.pageSetup;
  const pageFormat = pageSetup
    ? `${pageSetup.size} ${pageSetup.orientation === "portrait" ? "Retrato" : "Paisagem"}`
    : "A4 Retrato";

  useEffect(() => {
    const update = () => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const characters = text.length;
      const charactersNoSpaces = text.replace(/\s/g, "").length;
      const lines = text.split("\n").length;

      setStats(prev => ({ ...prev, words, characters, charactersNoSpaces, lines }));

      const { from } = editor.state.selection;
      const linesBefore = editor.state.doc.textBetween(0, from, "\n").split("\n").length;
      const lineStart = editor.state.doc.textBetween(0, from, "\n").lastIndexOf("\n");
      const col = from - lineStart;
      setCursorInfo({ line: linesBefore, col: Math.max(1, col) });
    };

    const onPageCount = (e: any) => {
      setStats(prev => ({ ...prev, pages: e.detail.count || 1 }));
    };

    window.addEventListener('editor-page-count', onPageCount);
    editor.on("update", update);
    editor.on("selectionUpdate", update);
    update();
    return () => {
      window.removeEventListener('editor-page-count', onPageCount);
      editor.off("update", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;
  const selectedText = hasSelection ? editor.state.doc.textBetween(from, to) : "";
  const selectedWords = selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0;

  return (
    <div className="word-status-bar flex items-center justify-between px-4 py-1 select-none">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1 opacity-90">
          <Layers className="h-3 w-3" />
          Página {stats.pages > 1 ? `1-${stats.pages}` : "1"} de {stats.pages}
        </span>
        <span className={cn("flex items-center gap-1 opacity-90", wordLimit && stats.words > wordLimit ? "text-destructive font-bold" : "")}>
          <Type className="h-3 w-3" />
          {hasSelection
            ? `${selectedWords} de ${stats.words} palavras`
            : wordLimit ? `${stats.words} / ${wordLimit} palavras` : `${stats.words} palavras`}
        </span>
        <span className={cn("flex items-center gap-1 opacity-90", charLimit && stats.characters > charLimit ? "text-destructive font-bold" : "")}>
          <Hash className="h-3 w-3" />
          {hasSelection
            ? `${selectedText.length} de ${stats.characters} caracteres`
            : charLimit ? `${stats.characters} / ${charLimit} caracteres` : `${stats.characters} caracteres`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Save status indicator */}
        <span className="flex items-center gap-1 opacity-90">
          {saveStatus === "saved" && <><Check className="h-3 w-3" /> Salvo</>}
          {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</>}
          {saveStatus === "unsaved" && <><AlertCircle className="h-3 w-3" /> Não salvo</>}
        </span>
        <span className="border-l border-white/30 h-3" />
        <button
          type="button"
          onClick={() => setPageSettingsOpen(true)}
          className="flex items-center gap-1 opacity-90 hover:opacity-100 hover:bg-white/15 rounded px-1 py-0.5 transition-colors"
          title="Configurações de página"
        >
          <FileBox className="h-3 w-3" />
          {pageFormat}
        </button>
        <span className="flex items-center gap-1 opacity-90" title="Idioma do documento">
          <Languages className="h-3 w-3" />
          Português (BR)
        </span>
        <span className="opacity-90">Ln {cursorInfo.line}, Col {cursorInfo.col}</span>
        <span className="flex items-center gap-1 opacity-90">
          <FileText className="h-3 w-3" />
          UTF-8
        </span>
        {onZoomChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-white/30 pl-3">
            <button
              onClick={() => onZoomChange(Math.max(25, zoom - 10))}
              className="p-0.5 rounded hover:bg-white/20 transition-colors"
              title="Diminuir zoom"
            >
              <Minus className="h-3 w-3" />
            </button>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => onZoomChange(v)}
              min={25}
              max={200}
              step={5}
              className="w-[100px] [&_[role=slider]]:bg-white [&_[role=slider]]:border-white/50 [&_.relative]:bg-white/30"
            />
            <button
              onClick={() => onZoomChange(Math.min(200, zoom + 10))}
              className="p-0.5 rounded hover:bg-white/20 transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
            <span className="text-[11px] min-w-[32px] text-right tabular-nums opacity-90">{zoom}%</span>
          </div>
        )}
      </div>
      <PageSettingsPanel open={pageSettingsOpen} onOpenChange={setPageSettingsOpen} />
    </div>
  );
}
