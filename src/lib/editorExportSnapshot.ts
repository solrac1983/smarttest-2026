import { sanitizeHtml } from "./sanitization";

const BAKE_PROPS = [
  "font-family", "font-size", "font-weight", "font-style",
  "text-decoration", "text-align", "color", "background-color",
  "margin", "padding", "border", "line-height", "vertical-align",
  "width", "height", "letter-spacing", "text-indent", "text-transform",
  "column-count", "column-gap", "column-rule",
  "float", "display",
] as const;

const SKIP_WIDTH_CLASSES = ["exam-page", "tiptap", "ProseMirror", "exam-wrapper", "editor-page-shell"];

export interface EditorExportSnapshot {
  html: string;
  dataColumns: string;
  dataTemplate: string;
}

export const TEMPLATE_CSS = `
  .exam-wrapper[data-columns="2"] .exam-page .tiptap {
    column-count: 2 !important;
    column-gap: 24px !important;
  }
  .exam-wrapper[data-columns="3"] .exam-page .tiptap {
    column-count: 3 !important;
    column-gap: 24px !important;
  }
  .exam-wrapper {
    --exam-font-family: inherit;
    --exam-font-size: inherit;
  }
  .exam-wrapper .tiptap {
    font-family: var(--exam-font-family, inherit) !important;
    font-size: var(--exam-font-size, inherit) !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap {
    text-align: justify !important;
    font-family: 'Arial', 'Helvetica', sans-serif !important;
    font-size: 10pt !important;
    line-height: 1.45 !important;
    color: #1a1a1a !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 {
    background: #d1d1d1 !important;
    padding: 3px 8px !important;
    margin: 14px 0 6px 0 !important;
    font-size: 10pt !important;
    font-weight: 700 !important;
    border: none !important;
    break-inside: avoid;
    break-after: avoid;
    text-align: left !important;
    text-indent: 0 !important;
    line-height: 1.5 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2:first-child,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3:first-child,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4:first-child {
    margin-top: 0 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h1 {
    font-size: 11pt !important;
    font-weight: 700 !important;
    text-align: left !important;
    text-transform: uppercase !important;
    margin: 8px 0 4px 0 !important;
    padding: 0 !important;
    border: none !important;
    background: none !important;
    text-indent: 0 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p {
    text-indent: 0 !important;
    text-align: justify !important;
    line-height: 1.45 !important;
    margin: 0 0 4px 0 !important;
    break-inside: avoid;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h2 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h3 + p,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap h4 + p {
    text-indent: 0.5cm !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap blockquote {
    font-style: italic !important;
    margin: 6px 0 6px 1em !important;
    padding-left: 0.5em !important;
    border-left: 2px solid #b3b3b3 !important;
    text-indent: 0 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul {
    padding-left: 0 !important;
    margin: 4px 0 4px 0 !important;
    text-indent: 0 !important;
    list-style: none !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ol li,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap ul li {
    text-indent: 0 !important;
    padding-left: 0 !important;
    margin-bottom: 1px !important;
    line-height: 1.45 !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap img {
    display: block !important;
    margin: 8px auto !important;
    max-width: 100% !important;
    height: auto !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table {
    font-size: 9pt !important;
    margin: 6px 0 !important;
    border-collapse: collapse !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table td,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap table th {
    border: 1px solid #b3b3b3 !important;
    padding: 2px 6px !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p > small,
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap small {
    font-size: 8pt !important;
    font-style: italic !important;
    display: block !important;
    text-align: right !important;
    line-height: 1.35 !important;
    margin-top: 2px !important;
    color: #4d4d4d !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap p:has(> em:only-child) {
    font-size: 8pt !important;
    font-style: italic !important;
    text-align: right !important;
    line-height: 1.35 !important;
    margin-top: 2px !important;
    text-indent: 0 !important;
    color: #4d4d4d !important;
  }
  .exam-wrapper[data-template="personalizado"] .exam-page .tiptap figcaption {
    font-size: 8pt !important;
    font-style: italic !important;
    text-align: right !important;
    line-height: 1.35 !important;
    color: #4d4d4d !important;
  }
`;

function shouldSkipWidth(el: HTMLElement): boolean {
  return SKIP_WIDTH_CLASSES.some((cls) => el.classList.contains(cls));
}

function bakeStyles(source: HTMLElement, target: HTMLElement) {
  if (source.nodeType !== Node.ELEMENT_NODE) return;
  const computed = window.getComputedStyle(source);
  const parts: string[] = [];
  const tagName = source.tagName.toLowerCase();
  const isImage = tagName === "img";

  for (const prop of BAKE_PROPS) {
    const val = computed.getPropertyValue(prop);
    if (!val || val === "initial" || val === "inherit") continue;
    if (prop === "background-color" && (val === "rgba(0, 0, 0, 0)" || val === "transparent" || val === "rgb(255, 255, 255)")) continue;
    if (prop === "color" && val === "rgb(0, 0, 0)") continue;
    if (prop === "width" && (val === "auto" || val === "0px")) continue;
    if (prop === "width" && !isImage && shouldSkipWidth(source)) continue;
    if (prop === "height" && !isImage) continue;
    if (prop === "height" && (val === "auto" || val === "0px")) continue;
    if (prop === "column-count" && (val === "auto" || val === "1")) continue;
    if (prop === "float" && val === "none") continue;
    if (prop === "display" && (val === "block" || val === "inline")) continue;
    parts.push(`${prop}: ${val}`);
  }

  if (parts.length > 0) {
    const existing = target.getAttribute("style") || "";
    target.setAttribute("style", existing + (existing ? "; " : "") + parts.join("; "));
  }

  const srcChildren = source.children;
  const tgtChildren = target.children;
  const len = Math.min(srcChildren.length, tgtChildren.length);
  for (let i = 0; i < len; i++) {
    bakeStyles(srcChildren[i] as HTMLElement, tgtChildren[i] as HTMLElement);
  }
}

function cleanClone(clone: HTMLElement, dataTemplate?: string) {
  clone.querySelectorAll("[data-page-break], .page-break-widget, .hard-page-break").forEach((el) => {
    const br = document.createElement("div");
    br.style.pageBreakAfter = "always";
    br.style.breakAfter = "page";
    el.replaceWith(br);
  });

  clone.querySelectorAll(".blank-page-spacer").forEach((el) => {
    const br = document.createElement("div");
    br.style.pageBreakAfter = "always";
    el.replaceWith(br);
  });

  clone.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
  clone.querySelectorAll(
    ".ProseMirror-gapcursor, .ProseMirror-separator, .ProseMirror-trailingBreak, " +
    ".page-header-overlay, .page-footer-overlay, .page-gap-overlay, " +
    ".floating-toolbar, .editor-page-shell-ruler, .tiptap-collaboration-cursor-widget",
  ).forEach((el) => el.remove());

  clone.querySelectorAll("[data-drag-handle], .ProseMirror-selectednode").forEach((el) => {
    el.removeAttribute("data-drag-handle");
    el.classList.remove("ProseMirror-selectednode");
  });

  clone.querySelectorAll("*").forEach((el) => {
    const htmlEl = el as HTMLElement;
    const tag = htmlEl.tagName.toLowerCase();
    if (tag !== "img" && tag !== "td" && tag !== "th" && tag !== "col" && tag !== "colgroup") {
      htmlEl.style.removeProperty("width");
      htmlEl.style.removeProperty("max-width");
      htmlEl.style.removeProperty("min-width");
    }
    if (tag !== "img") {
      htmlEl.style.removeProperty("height");
      htmlEl.style.removeProperty("min-height");
      htmlEl.style.removeProperty("max-height");
    }
    htmlEl.style.removeProperty("overflow");
    htmlEl.style.removeProperty("overflow-x");
    htmlEl.style.removeProperty("overflow-y");
    htmlEl.style.removeProperty("position");
    htmlEl.style.removeProperty("transform");
    htmlEl.style.removeProperty("zoom");
    htmlEl.style.removeProperty("box-shadow");
  });

  clone.querySelectorAll("img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.style.maxWidth = "100%";
    if (!el.style.height || el.style.height === "0px") el.style.height = "auto";
  });

  clone.querySelectorAll("table").forEach((table) => {
    (table as HTMLElement).setAttribute("border", "1");
    (table as HTMLElement).setAttribute("cellpadding", "4");
    (table as HTMLElement).setAttribute("cellspacing", "0");
    (table as HTMLElement).style.borderCollapse = "collapse";
    (table as HTMLElement).style.width = "100%";
  });

  clone.querySelectorAll("td, th").forEach((cell) => {
    const el = cell as HTMLElement;
    if (!el.style.border && !el.style.borderTop) {
      el.style.border = "1px solid #999";
    }
  });

  clone.querySelectorAll(".tiptap, .ProseMirror").forEach((el) => {
    const style = (el as HTMLElement).style;
    style.removeProperty("column-count");
    style.removeProperty("column-gap");
    style.removeProperty("column-rule");
  });

  if (dataTemplate) {
    const templateProps = [
      "font-family", "font-size", "text-align", "line-height", "color",
      "margin", "padding", "text-indent", "text-transform", "background-color",
      "background",
    ];
    const templatePropsWithBorder = [...templateProps, "border"];

    clone.querySelectorAll("h1, h2, h3, h4, p, blockquote, ol, ul, li, small, figcaption, img").forEach((el) => {
      const style = (el as HTMLElement).style;
      for (const prop of templatePropsWithBorder) {
        style.removeProperty(prop);
      }
    });

    clone.querySelectorAll("table, td, th").forEach((el) => {
      const style = (el as HTMLElement).style;
      for (const prop of templateProps) {
        style.removeProperty(prop);
      }
    });
  }
}

export function createEditorExportSnapshot(): EditorExportSnapshot | null {
  const examElement = document.querySelector(".exam-page") as HTMLElement | null;
  if (!examElement) {
    const editorEl = document.querySelector(".ProseMirror") || document.querySelector(".tiptap");
    if (!editorEl) return null;
    const clone = editorEl.cloneNode(true) as HTMLElement;
    bakeStyles(editorEl as HTMLElement, clone);
    cleanClone(clone);
    return {
      html: sanitizeHtml(clone.innerHTML),
      dataColumns: "1",
      dataTemplate: "",
    };
  }

  const clone = examElement.cloneNode(true) as HTMLElement;
  bakeStyles(examElement, clone);

  const wrapperEl = document.querySelector(".exam-wrapper") as HTMLElement | null;
  const dataColumns = wrapperEl?.getAttribute("data-columns") || "1";
  const dataTemplate = wrapperEl?.getAttribute("data-template") || "";

  cleanClone(clone, dataTemplate);

  const wrapClone = document.createElement("div");
  wrapClone.className = "exam-wrapper";
  wrapClone.setAttribute("data-columns", dataColumns);
  if (dataTemplate) wrapClone.setAttribute("data-template", dataTemplate);
  if (wrapperEl) {
    const inlineStyle = wrapperEl.getAttribute("style") || "";
    if (inlineStyle) wrapClone.setAttribute("style", inlineStyle);
  }

  clone.innerHTML = sanitizeHtml(clone.innerHTML);
  wrapClone.appendChild(clone);

  return {
    html: wrapClone.outerHTML,
    dataColumns,
    dataTemplate,
  };
}
