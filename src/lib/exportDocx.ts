import { loadPageSettings } from "@/components/editor/PageSettingsPanel";
import { createPageLayoutEngineFromSettings } from "@/components/editor/core/PageLayoutEngine";
import { createEditorExportSnapshot, TEMPLATE_CSS } from "./editorExportSnapshot";

function buildWordSectionXml(columns: number, docxSection: any): string {
  const page = docxSection?.page;
  const column = docxSection?.column;
  return `
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <xml>
    <w:Section>
      <w:SectPr>
        ${page ? `<w:pgSz w:w="${page.size.width}" w:h="${page.size.height}" w:orient="${page.size.orientation}"/>` : ""}
        ${page ? `<w:pgMar w:top="${page.margin.top}" w:right="${page.margin.right}" w:bottom="${page.margin.bottom}" w:left="${page.margin.left}"/>` : ""}
        ${columns > 1 && column ? `<w:cols w:num="${columns}" w:space="${column.space}" w:equalWidth="true"/>` : ""}
      </w:SectPr>
    </w:Section>
  </xml>
  <![endif]-->`;
}

export function exportToDocx(
  htmlContent: string,
  filename: string = "documento",
  formatConfig?: { fontFamily?: string; fontSize?: number; columns?: number; template?: string },
  scopeId?: string | null,
) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9À-ú\s\-_]/g, "");
  const snapshot = createEditorExportSnapshot();
  const renderedHtml = snapshot?.html || htmlContent.replace(/<!-- FORMATTING_CONFIG:.*? -->/, "").replace(/\s*contenteditable="[^"]*"/gi, "");
  const columnCount = parseInt(snapshot?.dataColumns || String(formatConfig?.columns || 1), 10);

  const pageSettings = loadPageSettings(scopeId);
  const layout = createPageLayoutEngineFromSettings({
    paper: pageSettings.paper,
    orientation: pageSettings.orientation,
    customWidthMm: pageSettings.customWidthMm,
    customHeightMm: pageSettings.customHeightMm,
    marginTopMm: pageSettings.marginTopMm,
    marginRightMm: pageSettings.marginRightMm,
    marginBottomMm: pageSettings.marginBottomMm,
    marginLeftMm: pageSettings.marginLeftMm,
    pageGapPx: pageSettings.pageGapPx,
    columns: columnCount,
    columnGapPx: 24,
  });

  const geometry = layout.geometryMm();
  const docxSection = layout.toDocxSection();
  const wordSectionXml = buildWordSectionXml(columnCount, docxSection);

  const msoColumnsCss = columnCount > 1 ? `
    .exam-page .tiptap, .ProseMirror, .page-content, body > div:not(.exam-wrapper) {
      mso-columns: ${columnCount};
      column-count: ${columnCount} !important;
      column-gap: 24px !important;
    }
    <!--[if gte mso 9]>
    body { mso-columns: ${columnCount}; }
    <![endif]-->
  ` : "";

  const fontFamily = formatConfig?.fontFamily || "Arial";
  const fontSize = formatConfig?.fontSize || 12;

  const wordHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${sanitizedFilename}</title>
  ${wordSectionXml}
  <style>
    @page {
      size: ${geometry.pageWidth}mm ${geometry.pageHeight}mm;
      margin: ${pageSettings.marginTopMm}mm ${pageSettings.marginRightMm}mm ${pageSettings.marginBottomMm}mm ${pageSettings.marginLeftMm}mm;
      mso-columns: ${columnCount};
    }
    body {
      font-family: '${fontFamily}', sans-serif;
      font-size: ${fontSize}pt;
      line-height: 1.5;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .page, .exam-page, .tiptap, .ProseMirror, .page-content, .editor-page-shell {
      height: auto !important;
      width: 100% !important;
      min-height: auto !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      background: none !important;
    }
    .exam-wrapper {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    p { margin: 0 0 4pt 0; }
    ul, ol { margin: 0 0 6pt 0; padding-left: 24pt; }
    li { margin-bottom: 2pt; }
    table { border-collapse: collapse; width: auto; margin-bottom: 8pt; }
    td, th {
      padding: 4px 8px;
      vertical-align: top;
      border: 1px solid #999 !important;
      mso-border-alt: solid #999 .5pt;
    }
    h1 { font-size: 18pt; font-weight: bold; margin: 0 0 6pt 0; }
    h2 { font-size: 15pt; font-weight: bold; margin: 0 0 5pt 0; }
    h3 { font-size: 13pt; font-weight: bold; margin: 0 0 4pt 0; }
    img { max-width: 100%; height: auto; }
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }
    s { text-decoration: line-through; }
    sub { vertical-align: sub; font-size: 0.8em; }
    sup { vertical-align: super; font-size: 0.8em; }
    hr { border: none; border-top: 1px solid #999; margin: 8pt 0; }
    [style*="text-align: center"], .text-center { text-align: center; }
    [style*="text-align: right"], .text-right { text-align: right; }
    [style*="text-align: justify"], .text-justify { text-align: justify; }
    [style*="column-count"] { column-fill: auto; }
    table, table td, table th {
      mso-border-alt: solid #999 .5pt;
      border: 1px solid #999 !important;
    }
    ${msoColumnsCss}
    ${TEMPLATE_CSS}
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;

  const blob = new Blob(["﻿", wordHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizedFilename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
