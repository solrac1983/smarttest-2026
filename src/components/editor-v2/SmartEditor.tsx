import React, { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "../editor/ResizableImageExtension";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Table as TableExtension } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { DynamicField } from "../editor/DynamicFieldExtension";
import { Mathematics } from "../editor/MathExtension";
import { BlankPage } from "../editor/BlankPageExtension";
import { FontSize } from "../editor/FontSizeExtension";
import { LineHeight } from "../editor/LineHeightExtension";
import { AutoNumbering } from "../editor/AutoNumberingExtension";
import { QuestionBlock } from "../editor/extensions/QuestionBlockExtension";
import { QuestionStem } from "../editor/extensions/QuestionStemExtension";
import { AlternativeList, AlternativeItem } from "../editor/extensions/AlternativeListExtension";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EditorRibbon } from "../editor/EditorRibbon";
import type { ChartData } from "../editor/ChartEditorTab";
import { Pagination } from "../editor/PaginationExtension";
import { HardPageBreak } from "../editor/HardPageBreakExtension";
import { EditorStatusBar } from "../editor/EditorStatusBar";
import { VersionHistoryDialog } from "../editor/VersionHistoryDialog";
import { createPageLayoutEngineFromSettings, parsePageCssLength } from "../editor/core/PageLayoutEngine";
import { loadPageSettings } from "../editor/PageSettingsPanel";

export interface SmartEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  showDataPanel?: boolean;
  onToggleDataPanel?: () => void;
  onChartDataChange?: (data: ChartData | null) => void;
  onChartUpdate?: (data: ChartData) => void;
  showComments?: boolean;
  onToggleComments?: () => void;
  saveStatus?: "saved" | "saving" | "unsaved";
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  documentId?: string;
  pageSettingsScopeId?: string | null;
  documentType?: "standalone_exam" | "simulado_subject";
  documentTitle?: string;
  wordLimit?: number;
  charLimit?: number;
}

export function SmartEditor({
  content = "",
  onChange,
  placeholder = "Comece a escrever...",
  showDataPanel,
  onToggleDataPanel,
  onChartDataChange,
  onChartUpdate,
  showComments,
  onToggleComments,
  saveStatus,
  headerLeft,
  headerRight,
  documentId,
  pageSettingsScopeId,
  documentType,
  documentTitle,
  wordLimit,
  charLimit,
}: SmartEditorProps) {
  const [zoom, setZoom] = useState(100);
  const [layoutMode, setLayoutMode] = useState<"vertical" | "horizontal">("vertical");
  const [pageCount, setPageCount] = useState(1);
  const [showRuler, setShowRuler] = useState(true);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [pageSettingsVersion, setPageSettingsVersion] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);

  const currentSettings = loadPageSettings(pageSettingsScopeId);
  const layout = createPageLayoutEngineFromSettings({
    paper: currentSettings.paper,
    orientation: currentSettings.orientation,
    customWidthMm: currentSettings.customWidthMm,
    customHeightMm: currentSettings.customHeightMm,
    marginTopMm: currentSettings.marginTopMm,
    marginRightMm: currentSettings.marginRightMm,
    marginBottomMm: currentSettings.marginBottomMm,
    marginLeftMm: currentSettings.marginLeftMm,
    pageGapPx: currentSettings.pageGapPx,
    columns: currentSettings.viewMode === "continuous_scroll" ? 1 : 1,
    columnGapPx: 24,
  });
  const geometryPx = layout.geometryPx();
  const geometryVars = layout.toCSSVars();
  const pageGap = currentSettings.viewMode === "continuous_scroll" ? 0 : currentSettings.pageGapPx;
  const totalDocumentHeightPx = Math.max(
    geometryPx.pageHeight,
    pageCount * geometryPx.pageHeight + Math.max(0, pageCount - 1) * pageGap,
  );
  const totalDocumentHeightCss = `${totalDocumentHeightPx}px`;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      ResizableImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      UnderlineExtension,
      Placeholder.configure({ placeholder }),
      TableExtension.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      FontFamily,
      FontSize,
      LineHeight,
      Mathematics,
      BlankPage,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      DynamicField,
      HardPageBreak,
      AutoNumbering,
      QuestionBlock,
      QuestionStem,
      AlternativeList,
      AlternativeItem,
      Pagination.configure({
        pageHeightPx: geometryPx.pageHeight,
        pagePaddingTopPx: geometryPx.paddingTop,
        pagePaddingBottomPx: geometryPx.paddingBottom,
        pageGapPx: pageGap,
      }),
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    const onPageSettingsChange = () => setPageSettingsVersion((v) => v + 1);
    const onPageCount = (e: Event) => {
      const count = (e as CustomEvent).detail?.count;
      if (typeof count === "number") setPageCount(count);
    };
    const onViewModeChange = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode;
      if (mode === "continuous_scroll") setLayoutMode("vertical");
    };

    window.addEventListener("editor-margins-change", onPageSettingsChange);
    window.addEventListener("editor-viewmode-change", onViewModeChange);
    window.addEventListener("editor-page-count", onPageCount);

    return () => {
      window.removeEventListener("editor-margins-change", onPageSettingsChange);
      window.removeEventListener("editor-viewmode-change", onViewModeChange);
      window.removeEventListener("editor-page-count", onPageCount);
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    const examPage = editorRef.current.querySelector(".exam-page") as HTMLElement | null;
    const proseMirror = editorRef.current.querySelector(".ProseMirror") as HTMLElement | null;
    const tiptap = editorRef.current.querySelector(".tiptap") as HTMLElement | null;
    const settings = loadPageSettings(pageSettingsScopeId);
    const vars = createPageLayoutEngineFromSettings({
      paper: settings.paper,
      orientation: settings.orientation,
      customWidthMm: settings.customWidthMm,
      customHeightMm: settings.customHeightMm,
      marginTopMm: settings.marginTopMm,
      marginRightMm: settings.marginRightMm,
      marginBottomMm: settings.marginBottomMm,
      marginLeftMm: settings.marginLeftMm,
      pageGapPx: settings.pageGapPx,
      columns: 1,
      columnGapPx: 24,
    }).toCSSVars();

    [examPage, proseMirror, tiptap].filter(Boolean).forEach((el) => {
      Object.entries(vars).forEach(([key, value]) => {
        (el as HTMLElement).style.setProperty(key, value);
      });
    });

    if (examPage) {
      examPage.style.width = geometryVars["--page-w"];
      examPage.style.minHeight = totalDocumentHeightCss;
      examPage.style.height = "auto";
      examPage.style.setProperty("--page-gap", `${settings.viewMode === "continuous_scroll" ? 0 : settings.pageGapPx}px`);
    }

    if (tiptap) {
      tiptap.style.paddingTop = geometryVars["--page-pad-top"];
      tiptap.style.paddingRight = geometryVars["--page-pad-right"];
      tiptap.style.paddingBottom = geometryVars["--page-pad-bottom"];
      tiptap.style.paddingLeft = geometryVars["--page-pad-left"];
      tiptap.style.width = "100%";
      tiptap.style.maxWidth = "100%";
      tiptap.style.minHeight = totalDocumentHeightCss;
      tiptap.style.height = "auto";
    }
  }, [pageCount, pageSettingsScopeId, pageSettingsVersion, geometryVars, totalDocumentHeightCss]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="w-full sticky top-0 z-20 shrink-0 border-b bg-background shadow-sm">
        <EditorRibbon
          editor={editor}
          zoom={zoom}
          onZoomChange={setZoom}
          pageSettingsScopeId={pageSettingsScopeId}
          showRuler={showRuler}
          onToggleRuler={() => setShowRuler(!showRuler)}
          headerLeft={headerLeft}
          headerRight={headerRight}
          saveStatus={saveStatus}
          onToggleDataPanel={onToggleDataPanel}
          showDataPanel={showDataPanel}
          onToggleComments={onToggleComments}
          showComments={showComments}
          onToggleAnswerKey={() => setShowAnswerKey(!showAnswerKey)}
          showAnswerKey={showAnswerKey}
          onToggleStyles={() => setShowStyles(!showStyles)}
          showStyles={showStyles}
          onToggleVersionHistory={() => setShowVersionHistory(!showVersionHistory)}
          showVersionHistory={showVersionHistory}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        />
      </div>

      <div className="flex-1 overflow-auto bg-muted/30 relative">
        <div
          className={cn(
            "flex flex-col items-center py-12 transition-all duration-200 relative",
            layoutMode === "horizontal" && "flex-row flex-wrap items-start justify-center gap-8 px-12",
          )}
          style={{ zoom: zoom / 100 }}
        >
          <div
            ref={editorRef}
            className={cn("exam-page", layoutMode === "horizontal" && "layout-horizontal")}
            style={{
              position: "relative",
              width: geometryVars["--page-w"],
              minHeight: totalDocumentHeightCss,
              "--page-gap": `${pageGap}px`,
              ...geometryVars,
            } as React.CSSProperties}
          >
            <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none" />
          </div>
        </div>
      </div>
      <div className="w-full sticky bottom-0 z-20 shrink-0">
        <EditorStatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} saveStatus={saveStatus} wordLimit={wordLimit} charLimit={charLimit} />
      </div>

      <VersionHistoryDialog
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        documentType={documentId ? documentType : null}
        documentId={documentId ?? null}
        currentContent={editor?.getHTML() ?? ""}
        currentTitle={documentTitle}
        onRestore={(html) => {
          if (editor) {
            editor.commands.setContent(html);
            onChange?.(html);
            toast.success("Versão restaurada.");
          }
        }}
      />
    </div>
  );
}
