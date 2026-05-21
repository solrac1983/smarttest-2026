import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "./ResizableImageExtension";
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
import { DynamicField } from "./DynamicFieldExtension";
import * as Y from "yjs";
import { YjsCollaboration } from "./YjsCollaborationExtension";
import { Mathematics } from "./MathExtension";
import { BlankPage } from "./BlankPageExtension";
import { FontSize } from "./FontSizeExtension";
import { LineHeight } from "./LineHeightExtension";
import { EditorRibbon } from "./EditorRibbon";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorRuler, type TabStop } from "./EditorRuler";
import { PageHeaderFooterOverlay, defaultHeaderFooterConfig, type HeaderFooterConfig } from "./PageHeaderFooterOverlay";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { ChartData } from "./ChartEditorTab";
import { FloatingToolbar } from "./FloatingToolbar";
import { Pagination } from "./PaginationExtension";
import { HardPageBreak } from "./HardPageBreakExtension";
import { usePageBreaks } from "./usePageBreaks";
import { AutoNumbering } from "./AutoNumberingExtension";
import { QuestionBlock } from "./extensions/QuestionBlockExtension";
import { QuestionStem } from "./extensions/QuestionStemExtension";
import { AlternativeList, AlternativeItem } from "./extensions/AlternativeListExtension";
import { AnswerKeyPanel } from "./AnswerKeyPanel";
import { StylesSidePanel } from "./StylesSidePanel";
import { SpellCheckPanel, type SpellSuggestion } from "./SpellCheckPanel";
import { FindReplacePanel } from "./FindReplacePanel";
import { SupabaseYjsProvider } from "./SupabaseYjsProvider";
import { CollaborationBar, COLLAB_COLORS } from "./CollaborationBar";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invokeFunction";
import { useAuth } from "@/hooks/useAuth";
import { loadPageSettings } from "./PageSettingsPanel";
import { createPageLayoutEngineFromSettings, mmToPx } from "./core/PageLayoutEngine";
import { sanitizeHtml } from "@/lib/sanitization";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import { showInvokeSuccess } from "@/lib/invokeFunction";

interface RichEditorProps {
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
  documentType?: "standalone_exam" | "simulado_subject";
  documentTitle?: string;
  wordLimit?: number;
  charLimit?: number;
}

export function RichEditor({ content = "", onChange, placeholder = "Comece a escrever sua prova...", showDataPanel, onToggleDataPanel, onChartDataChange, onChartUpdate, showComments, onToggleComments, saveStatus, headerLeft, headerRight, documentId, documentType = "standalone_exam", documentTitle = "", wordLimit, charLimit }: RichEditorProps) {
  const { profile } = useAuth();
  const [zoom, setZoom] = useState(100);
  const [showRuler, setShowRuler] = useState(true);
  
  // Initialize margins from persisted settings or defaults
  const initialSettings = useMemo(() => loadPageSettings(documentId), [documentId]);
  const [marginLeft, setMarginLeft] = useState(() => Math.round(mmToPx(initialSettings.marginLeftMm)));
  const [marginRight, setMarginRight] = useState(() => Math.round(mmToPx(initialSettings.marginRightMm)));
  const [marginTop, setMarginTop] = useState(() => Math.round(mmToPx(initialSettings.marginTopMm)));
  const [marginBottom, setMarginBottom] = useState(() => Math.round(mmToPx(initialSettings.marginBottomMm)));


  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [hangingIndent, setHangingIndent] = useState(0);
  const [tabStops, setTabStops] = useState<TabStop[]>([]);
  const [viewMode, setViewMode] = useState<"print_layout" | "continuous_scroll">(initialSettings.viewMode || "print_layout");
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>(defaultHeaderFooterConfig);
  const [tiptapEl, setTiptapEl] = useState<HTMLElement | null>(null);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [spellSuggestions, setSpellSuggestions] = useState<SpellSuggestion[]>([]);
  const [isSpellCheckLoading, setIsSpellCheckLoading] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<"find" | "replace">("find");
  const [focusMode, setFocusMode] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorTick, setEditorTick] = useState(0);
  const [layoutMode, setLayoutMode] = useState<"vertical" | "horizontal">("vertical");

  // Yjs collaboration setup
  const isCollaborative = !!documentId;
  const ydoc = useMemo(() => new Y.Doc(), []);
  const typingTimeoutRef = useRef<number | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const initialContentRef = useRef(content);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const handleAIReviewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isCollaborative) return;
    const provider = new SupabaseYjsProvider(documentId!, ydoc);
    providerRef.current = provider;

    // Set awareness user info
    const userName = profile?.full_name || "AnÃƒÂ´nimo";
    const userColor = COLLAB_COLORS[ydoc.clientID % COLLAB_COLORS.length];
    provider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
    });

    // After sync, if the Yjs doc is empty and we have initial content from DB, load it
    provider.onSync(() => {
      const yXmlFragment = ydoc.getXmlFragment("prosemirror");
      if (yXmlFragment.length === 0 && initialContentRef.current) {
        setTimeout(() => {
          if (editorRef.current && initialContentRef.current) {
            editorRef.current.commands.setContent(initialContentRef.current);
          }
        }, 100);
      }
    });

    return () => {
      provider.destroy();
      providerRef.current = null;
    };
  }, [isCollaborative, documentId, ydoc, profile?.full_name]);

  // Track the .tiptap element once editor mounts
  const examPageRef = useRef<HTMLDivElement>(null);
  const syncTiptapEl = useCallback(() => {
    if (examPageRef.current) {
      const el = examPageRef.current.querySelector(
        '.tiptap, .ProseMirror, [contenteditable="true"], [role="textbox"]'
      ) as HTMLElement | null;
      if (el && el !== tiptapEl) {
        setTiptapEl(el);
      }
    }
  }, [tiptapEl]);

  const collabExtensions = isCollaborative && providerRef.current
    ? [
        YjsCollaboration.configure({
          document: ydoc,
          provider: providerRef.current,
          user: {
            name: profile?.full_name || "AnÃƒÂ´nimo",
            color: COLLAB_COLORS[ydoc.clientID % COLLAB_COLORS.length],
          },
        }),
      ]
    : [];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        // Disable history when collaborating (Yjs handles undo/redo)
        ...(isCollaborative ? { history: false } : {}),
      }),
      ResizableImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      UnderlineExtension,
      Placeholder.configure({ placeholder }),
      TableExtension.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      TextStyle, Color,
      Highlight.configure({ multicolor: true }),
      Superscript, Subscript, FontFamily,
      FontSize, LineHeight,
      Mathematics, BlankPage,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      DynamicField,
      HardPageBreak,
      AutoNumbering,
      QuestionBlock, QuestionStem, AlternativeList, AlternativeItem,
      Pagination.configure({
        pageHeightPx: createPageLayoutEngineFromSettings({
          paper: initialSettings.paper,
          orientation: initialSettings.orientation,
          customWidthMm: initialSettings.customWidthMm,
          customHeightMm: initialSettings.customHeightMm,
          marginTopMm: initialSettings.marginTopMm,
          marginRightMm: initialSettings.marginRightMm,
          marginBottomMm: initialSettings.marginBottomMm,
          marginLeftMm: initialSettings.marginLeftMm,
          pageGapPx: initialSettings.pageGapPx,
          columns: 1,
          columnGapPx: 24,
        }).geometryPx().pageHeight,
        pagePaddingTopPx: Math.round(mmToPx(initialSettings.marginTopMm)),
        pagePaddingBottomPx: Math.round(mmToPx(initialSettings.marginBottomMm)),
        pageGapPx: initialSettings.pageGapPx,
      }),
      ...collabExtensions,
    ],
    content: isCollaborative ? undefined : content,
    onUpdate: ({ editor }) => {
      const rawHtml = editor.getHTML();
      const cleanHtml = sanitizeHtml(rawHtml);
      onChange?.(cleanHtml);
      setEditorTick((t) => (t + 1) % 1_000_000);
      // Broadcast typing state
      if (isCollaborative && providerRef.current) {
        providerRef.current.awareness.setLocalStateField("isTyping", true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
          providerRef.current?.awareness.setLocalStateField("isTyping", false);
        }, 1500);
      }
    },
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none show-margin-guides",
        spellcheck: "true",
        lang: "pt-BR",
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          if (event.shiftKey) {
            document.dispatchEvent(new CustomEvent('editor-save-as'));
            toast.info("Use os botÃƒÂµes de exportaÃƒÂ§ÃƒÂ£o para salvar em diferentes formatos.");
          } else {
            document.dispatchEvent(new CustomEvent('editor-save'));
            showInvokeSuccess("Documento salvo!");
          }
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault();
          setShowFindReplace(true);
          setFindReplaceMode("find");
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
          event.preventDefault();
          setShowFindReplace(true);
          setFindReplaceMode("replace");
          return true;
        }
        // F7 Ã¢â‚¬â€ abrir RevisÃƒÂ£o com IA (padrÃƒÂ£o Office)
        if (event.key === 'F7' && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          handleAIReviewRef.current?.();
          return true;
        }
        // Ctrl+Enter Ã¢â‚¬â€ quebra de pÃƒÂ¡gina manual (jÃƒÂ¡ tratado pela extensÃƒÂ£o, mantido como fallback)
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          const commands = editorRef.current?.commands as { setHardPageBreak?: () => boolean } | undefined;
          commands?.setHardPageBreak?.();
          return true;
        }
        // Shift+F3 - alternar caixa do texto (Word: lower -> Title -> UPPER)
        if (event.shiftKey && event.key === 'F3') {
          event.preventDefault();
          const ed = editorRef.current;
          if (ed) {
            const { from, to } = ed.state.selection;
            if (from !== to) {
              const text = ed.state.doc.textBetween(from, to);
              let next: string;
              if (text === text.toLowerCase()) next = text.replace(/\b\w/g, c => c.toUpperCase());
              else if (text === text.replace(/\b\w/g, c => c.toUpperCase())) next = text.toUpperCase();
              else next = text.toLowerCase();
              ed.chain().focus().insertContentAt({ from, to }, next).setTextSelection({ from, to: from + next.length }).run();
            }
          }
          return true;
        }
        return false;
      },
    },
  }, [isCollaborative, documentId]);

  usePageBreaks(editor, tiptapEl, marginTop, marginBottom);

  // Listen for margin changes from LayoutTab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { top, bottom, left, right } = detail;
      if (typeof left === 'number') setMarginLeft(left);
      if (typeof right === 'number') setMarginRight(right);
      if (typeof top === 'number') setMarginTop(top);
      if (typeof bottom === 'number') setMarginBottom(bottom);
    };
    window.addEventListener('editor-margins-change', handler);
    return () => window.removeEventListener('editor-margins-change', handler);
  }, []);

  // Sync margins to editor element and CSS custom properties
  useEffect(() => {
    if (!tiptapEl) return;

    // Margins synced to CSS variables for index.css to use
    tiptapEl.style.setProperty('--page-pad-left', `${marginLeft}px`);
    tiptapEl.style.setProperty('--page-pad-right', `${marginRight}px`);
    tiptapEl.style.setProperty('--page-pad-top', `${marginTop}px`);
    tiptapEl.style.setProperty('--page-pad-bottom', `${marginBottom}px`);

    // Reserved zones for header/footer
    const hasHeader = !!(headerFooterConfig.headerLeft || headerFooterConfig.headerCenter || headerFooterConfig.headerRight);
    const hasFooter = !!(headerFooterConfig.footerLeft || headerFooterConfig.footerCenter || headerFooterConfig.footerRight || headerFooterConfig.showPageNumber);
    const reservedTop = hasHeader ? 32 : 0;
    const reservedBottom = hasFooter ? 32 : 0;
    tiptapEl.style.setProperty('--page-reserved-top', `${reservedTop}px`);
    tiptapEl.style.setProperty('--page-reserved-bottom', `${reservedBottom}px`);

    window.dispatchEvent(new CustomEvent('editor-margins-change'));
  }, [tiptapEl, marginLeft, marginRight, marginTop, marginBottom, headerFooterConfig]);

  // Sync first-line indent and hanging indent
  useEffect(() => {
    let style = document.querySelector('#editor-first-line-indent') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'editor-first-line-indent'; document.head.appendChild(style); }
    const rules: string[] = [];
    if (firstLineIndent !== 0) {
      rules.push(`.tiptap p { text-indent: ${firstLineIndent}px; }`);
    }
    if (hangingIndent > 0) {
      rules.push(`.tiptap p { padding-left: ${hangingIndent}px; }`);
    }
    style.textContent = rules.join('\n');
  }, [firstLineIndent, hangingIndent]);

  // Sync tab stops to CSS
  useEffect(() => {
    let style = document.querySelector('#editor-tab-stops') as HTMLStyleElement;
    if (!style) { style = document.createElement('style'); style.id = 'editor-tab-stops'; document.head.appendChild(style); }
    if (tabStops.length > 0) {
      const firstStop = tabStops[0];
      const tabSize = firstStop ? Math.round(firstStop.position - marginLeft) : 48;
      style.textContent = `.tiptap { tab-size: ${Math.max(1, tabSize)}px; -moz-tab-size: ${Math.max(1, tabSize)}px; }`;
    } else {
      style.textContent = '';
    }
  }, [tabStops, marginLeft]);

  // Keep editorRef in sync
  useEffect(() => {
    (editorRef as React.MutableRefObject<typeof editor>).current = editor;
  }, [editor]);

  useEffect(() => {
    if (!isCollaborative && editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor, isCollaborative]);

  // Sync tiptap element after render
  useEffect(() => {
    const t = setTimeout(syncTiptapEl, 50);
    return () => clearTimeout(t);
  });

  // Ctrl+Scroll zoom
  useEffect(() => {
    const deskEl = document.querySelector('.editor-desk');
    if (!deskEl) return;
    const handler = (e: Event) => {
      const we = e as WheelEvent;
      if (we.ctrlKey || we.metaKey) {
        we.preventDefault();
        setZoom(prev => Math.max(25, Math.min(200, prev + (we.deltaY > 0 ? -5 : 5))));
      }
    };
    deskEl.addEventListener('wheel', handler, { passive: false });
    return () => deskEl.removeEventListener('wheel', handler);
  }, []);

  // Focus mode CSS class toggle + cursor tracking
  useEffect(() => {
    const pm = document.querySelector('.ProseMirror');
    if (pm) pm.classList.toggle('focus-mode', focusMode);

    if (!focusMode || !editor) return () => { pm?.classList.remove('focus-mode'); };

    const trackFocus = () => {
      if (!pm) return;
      pm.querySelectorAll('.focus-active').forEach(el => el.classList.remove('focus-active'));
      const { from } = editor.state.selection;
      try {
        const domAtPos = editor.view.domAtPos(from);
        let node = domAtPos?.node instanceof HTMLElement ? domAtPos.node : domAtPos?.node?.parentElement;
        while (node && node !== pm && node.parentElement !== pm) {
          node = node.parentElement;
        }
        if (node && node !== pm) node.classList.add('focus-active');
      } catch { /* ignore */ }
    };

    editor.on('selectionUpdate', trackFocus);
    trackFocus();

    return () => {
      pm?.classList.remove('focus-mode');
      pm?.querySelectorAll('.focus-active').forEach(el => el.classList.remove('focus-active'));
      editor.off('selectionUpdate', trackFocus);
    };
  }, [focusMode, editor]);

  // Listen for focus-mode-toggle event from ViewTab
  useEffect(() => {
    const handler = () => setFocusMode(prev => !prev);
    window.addEventListener('editor-toggle-focus-mode', handler);
    return () => window.removeEventListener('editor-toggle-focus-mode', handler);
  }, []);

  // Listen for find-replace-toggle event from HomeTab
  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode || 'find';
      setShowFindReplace(true);
      setFindReplaceMode(mode);
    };
    window.addEventListener('editor-open-find-replace', handler);
    return () => window.removeEventListener('editor-open-find-replace', handler);
  }, []);

  // Listen for view mode changes from PageSettingsPanel
  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode;
      if (mode) setViewMode(mode);
    };
    window.addEventListener('editor-viewmode-change', handler);
    return () => window.removeEventListener('editor-viewmode-change', handler);
  }, []);

  // Listen for version-history open event (from InsertTab)
  useEffect(() => {
    const handler = () => setShowVersionHistory(true);
    window.addEventListener('editor-open-version-history', handler);
    return () => window.removeEventListener('editor-open-version-history', handler);
  }, []);

  // Listen for answer-key & styles panel toggles (from ProvasTab / HomeTab)
  useEffect(() => {
    const ak = () => setShowAnswerKey((v) => !v);
    const st = () => setShowStyles((v) => !v);
    window.addEventListener('editor-toggle-answer-key', ak);
    window.addEventListener('editor-toggle-styles', st);
    return () => {
      window.removeEventListener('editor-toggle-answer-key', ak);
      window.removeEventListener('editor-toggle-styles', st);
    };
  }, []);

  // Listen for imported HTML from external importers
  useEffect(() => {
    const handler = (e: Event) => {
      const html = (e as CustomEvent).detail?.html;
      if (html && editor) {
        editor.chain().focus().insertContent(html).run();
      }
    };
    window.addEventListener('editor-import-html', handler);
    return () => window.removeEventListener('editor-import-html', handler);
  }, [editor]);


  const handleAIReview = useCallback(async () => {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim()) {
      toast.info("O documento estÃƒÂ¡ vazio.");
      return;
    }
    setShowSpellCheck(true);
    setIsSpellCheckLoading(true);
    setSpellSuggestions([]);
    const { data, error } = await invokeFunction<{ suggestions?: SpellSuggestion[]; error?: string }>("spell-check", {
      body: { text: text.substring(0, 8000) },
      errorMessage: "Erro ao realizar revisÃƒÂ£o com IA.",
    });
    setIsSpellCheckLoading(false);
    if (error) return;
    setSpellSuggestions(data?.suggestions || []);
    if ((data?.suggestions || []).length === 0) {
      showInvokeSuccess("Nenhum problema encontrado!");
    }
  }, [editor]);

  useEffect(() => { handleAIReviewRef.current = handleAIReview; }, [handleAIReview]);

  const handleApplySuggestion = useCallback((suggestion: SpellSuggestion) => {
    if (!editor) return;
    const html = editor.getHTML();
    const escaped = suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, '');
    const newHtml = html.replace(regex, suggestion.correction);
    if (newHtml !== html) {
      editor.commands.setContent(newHtml);
      onChange?.(newHtml);
    }
  }, [editor, onChange]);

  const handleApplyAll = useCallback(() => {
    if (!editor) return;
    let html = editor.getHTML();
    for (const s of spellSuggestions) {
      const escaped = s.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, '');
      html = html.replace(regex, s.correction);
    }
    editor.commands.setContent(html);
    onChange?.(html);
    showInvokeSuccess("Todas as sugestÃƒÂµes foram aplicadas!");
  }, [editor, spellSuggestions, onChange]);

  if (!editor) return null;

  return (
    <div className="editor-ui flex flex-col h-[calc(100vh-56px)]">
      <div className="w-full sticky top-0 z-20 shrink-0">
        <EditorRibbon
          editor={editor}
          zoom={zoom}
          onZoomChange={setZoom}
          showDataPanel={showDataPanel}
          onToggleDataPanel={onToggleDataPanel}
          onChartDataChange={onChartDataChange}
          onChartUpdate={onChartUpdate}
          showComments={showComments}
          onToggleComments={onToggleComments}
          headerFooterConfig={headerFooterConfig}
          onHeaderFooterConfigChange={setHeaderFooterConfig}
          headerLeft={headerLeft}
          headerRight={
            <>
              {isCollaborative && (
                <CollaborationBar awareness={providerRef.current?.awareness ?? null} />
              )}
              {headerRight}
            </>
          }
          onAIReview={handleAIReview}
          isAIReviewLoading={isSpellCheckLoading}
        />
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Vertical ruler Ã¢â‚¬â€ Word-like */}
        <div className="word-vertical-ruler shrink-0 select-none hidden md:flex flex-col" style={{ width: '22px', marginTop: '4px' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="relative" style={{ height: '37.8px' }}>
              {i > 0 && i % 2 === 0 && (
                <span className="absolute right-1.5 text-[8px] text-muted-foreground leading-none" style={{ top: '-4px' }}>
                  {i / 2}
                </span>
              )}
              <div className="absolute right-0 w-1 border-t border-border/40" style={{ top: 0 }} />
              {i % 2 === 1 && <div className="absolute right-0 w-2 border-t border-border/60" style={{ top: 0 }} />}
            </div>
          ))}
        </div>

        {/* Main desk area */}
        <div className="flex-1 min-h-0 flex flex-col">
          {showRuler && (
            <div className="flex justify-center shrink-0 sticky top-0 z-10 bg-background" style={{ zoom: zoom / 100 }}>
              <EditorRuler
                marginLeft={marginLeft}
                marginRight={marginRight}
                onMarginLeftChange={setMarginLeft}
                onMarginRightChange={setMarginRight}
                firstLineIndent={firstLineIndent}
                onFirstLineIndentChange={setFirstLineIndent}
                hangingIndent={hangingIndent}
                onHangingIndentChange={setHangingIndent}
                tabStops={tabStops}
                onTabStopsChange={setTabStops}
              />
            </div>
          )}
          <div className="editor-desk flex-1 min-h-0 overflow-auto relative">
            {/* Find & Replace floating panel */}
            {showFindReplace && editor && (
              <FindReplacePanel
                editor={editor}
                onClose={() => setShowFindReplace(false)}
                initialMode={findReplaceMode}
              />
            )}
            <div className="editor-desk-inner" style={{ zoom: zoom / 100 }}>
              <div className={`exam-page ${viewMode === "continuous_scroll" ? " continuous-scroll-mode" : ""} ${layoutMode === "horizontal" ? " layout-horizontal" : ""}`} ref={examPageRef} style={{ position: 'relative' }}>
                {tiptapEl && <FloatingToolbar editor={editor} />}
                <div className="editor-page-shell">
                  <EditorContent editor={editor} />
                </div>
                {tiptapEl && <PageHeaderFooterOverlay config={headerFooterConfig} editorEl={tiptapEl} />}
              </div>
            </div>
          </div>
        </div>

        {/* Styles Panel */}
        {showStyles && editor && (
          <StylesSidePanel editor={editor} onClose={() => setShowStyles(false)} />
        )}

        {/* Answer Key & Validator Panel */}
        {showAnswerKey && editor && (
          <AnswerKeyPanel
            editor={editor}
            onClose={() => setShowAnswerKey(false)}
            refreshKey={editorTick}
          />
        )}

        {/* Spell Check Panel */}
        {showSpellCheck && (
          <SpellCheckPanel
            suggestions={spellSuggestions}
            isLoading={isSpellCheckLoading}
            onClose={() => setShowSpellCheck(false)}
            onApply={handleApplySuggestion}
            onApplyAll={handleApplyAll}
          />
        )}
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
            showInvokeSuccess("VersÃƒÂ£o restaurada.");
          }
        }}
      />
    </div>
  );
}


