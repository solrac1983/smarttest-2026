import { loadPageSettings } from "@/components/editor/PageSettingsPanel";
import { createPageLayoutEngineFromSettings } from "@/components/editor/core/PageLayoutEngine";
import { createEditorExportSnapshot, TEMPLATE_CSS } from "./editorExportSnapshot";

function buildPrintStyles(scopeId?: string | null) {
  const settings = loadPageSettings(scopeId);
  const print = createPageLayoutEngineFromSettings({
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
  }).toPrintOptions();

  return `
  html, body {
    margin: 0; padding: 0;
    background: #fff !important;
    color: #000 !important;
    font-family: 'Arial', 'Helvetica', sans-serif;
  }
  .print-root {
    display: flex;
    justify-content: center;
    padding: 0;
  }
  .print-root .exam-wrapper {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .print-root .exam-page,
  .print-root .tiptap,
  .print-root .ProseMirror,
  .print-root [contenteditable] {
    transform: none !important;
    zoom: 1 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: auto !important;
    height: auto !important;
    background: #fff !important;
    color: #000 !important;
    overflow: visible !important;
  }
  .print-root .editor-page-shell {
    padding: 0 !important;
    margin: 0 !important;
  }
  .print-root .tiptap::after,
  .print-root .ProseMirror::after,
  .print-root [contenteditable]::after {
    display: none !important;
  }
  .page-header-overlay, .page-footer-overlay, .page-gap-overlay,
  .page-break-widget, .floating-toolbar {
    display: none !important;
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: auto; }
  td, th {
    padding: 4px 8px;
    border: 1px solid #999;
    vertical-align: top;
  }
  p { margin: 0 0 4px 0; }
  h1 { font-size: 18pt; font-weight: bold; margin: 0 0 6pt 0; }
  h2 { font-size: 15pt; font-weight: bold; margin: 0 0 5pt 0; }
  h3 { font-size: 13pt; font-weight: bold; margin: 0 0 4pt 0; }
  strong, b { font-weight: bold; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #999; margin: 8pt 0; }
  sub { vertical-align: sub; font-size: 0.8em; }
  sup { vertical-align: super; font-size: 0.8em; }
  [style*="column-count"] { column-fill: auto; }
  ${TEMPLATE_CSS}
  @media print {
    .print-root { padding: 0; }
    @page { size: ${print.page.widthMm}mm ${print.page.heightMm}mm; margin: ${print.margin.top} ${print.margin.right} ${print.margin.bottom} ${print.margin.left}; }
  }
`;
}

function openPrintWindow(title: string, html: string, styles: string, autoCloseAfterPrint: boolean): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const afterPrintAction = autoCloseAfterPrint ? "window.close();" : "";
  const doc = printWindow.document;
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>${title}</title>
    <style>${styles}</style>
  </head><body>
    <main class="print-root">${html}</main>
    <script>
      (function () {
        let hasPrinted = false;
        function waitForImages() {
          const images = Array.from(document.images || []);
          if (images.length === 0) return Promise.resolve();
          return Promise.all(images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            });
          }));
        }
        function triggerPrint() {
          if (hasPrinted) return;
          hasPrinted = true;
          waitForImages().then(() => {
            setTimeout(() => {
              window.focus();
              window.print();
            }, 180);
          });
        }
        window.addEventListener('load', triggerPrint, { once: true });
        window.addEventListener('afterprint', () => {
          ${afterPrintAction}
        }, { once: true });
        setTimeout(triggerPrint, 1200);
      })();
    <\/script>
  </body></html>`);
  doc.close();
  return true;
}

export function exportPDF(scopeId?: string | null): boolean {
  const snapshot = createEditorExportSnapshot();
  if (!snapshot) return false;
  return openPrintWindow("Exportar PDF", snapshot.html, buildPrintStyles(scopeId), false);
}

export function printDocument(scopeId?: string | null): boolean {
  const snapshot = createEditorExportSnapshot();
  if (!snapshot) return false;
  return openPrintWindow("Imprimir", snapshot.html, buildPrintStyles(scopeId), true);
}
