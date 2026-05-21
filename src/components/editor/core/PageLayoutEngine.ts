import type { PageSetup } from "./DocumentModel";

export const MM_PER_INCH = 25.4;
export const PX_PER_INCH = 96;
export const PX_PER_MM = PX_PER_INCH / MM_PER_INCH;
export const DXA_PER_MM = 56.6929;

export const PAGE_DIMENSIONS_MM: Record<PageSetup["size"], { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
  Legal: { w: 215.9, h: 355.6 },
};

export interface PageGeometryMm {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
  margins: { top: number; right: number; bottom: number; left: number };
}

export interface PageGeometryPx {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export type GeometryPageSettings = {
  paper?: "a4" | "a3" | "letter" | "legal" | "custom";
  orientation?: "portrait" | "landscape";
  customWidthMm?: number;
  customHeightMm?: number;
  marginTopMm?: number;
  marginRightMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  pageGapPx?: number;
  columns?: number;
  columnGapMm?: number;
  columnGapPx?: number;
};

export function mmToPx(mm: number) {
  return mm * PX_PER_MM;
}

export function parsePageCssLength(cssLength: string): number {
  const trimmed = cssLength?.trim();
  if (!trimmed) return 0;
  const val = parseFloat(trimmed);
  if (Number.isNaN(val)) return 0;
  if (trimmed.endsWith("mm")) return val * PX_PER_MM;
  if (trimmed.endsWith("cm")) return (val * 10) * PX_PER_MM;
  return val;
}

export function normalizePageSettingsToSetup(settings: GeometryPageSettings): PageSetup {
  const paper = settings.paper ?? "a4";
  const orientation = settings.orientation ?? "portrait";

  const sizeMap = {
    a4: "A4",
    a3: "A4",
    letter: "Letter",
    legal: "Legal",
    custom: "A4",
  } as const;

  const dimsMap: Record<Exclude<typeof paper, "custom">, { w: number; h: number }> = {
    a4: { w: 210, h: 297 },
    a3: { w: 297, h: 420 },
    letter: { w: 215.9, h: 279.4 },
    legal: { w: 215.9, h: 355.6 },
  };

  const dims = paper === "custom"
    ? {
        w: settings.customWidthMm || 210,
        h: settings.customHeightMm || 297,
      }
    : dimsMap[paper];

  return {
    size: sizeMap[paper],
    orientation,
    margins: {
      top: settings.marginTopMm ?? 25,
      right: settings.marginRightMm ?? 20,
      bottom: settings.marginBottomMm ?? 25,
      left: settings.marginLeftMm ?? 20,
    },
    columns: settings.columns ?? 1,
    columnGap: settings.columnGapMm ?? ((settings.columnGapPx ?? 24) / PX_PER_MM),
    customDimensionsMm: dims,
  } as PageSetup & { customDimensionsMm?: { w: number; h: number } };
}

export class PageLayoutEngine {
  constructor(
    public readonly setup: PageSetup,
    private readonly customDimensionsMm?: { w: number; h: number },
  ) {}

  geometryMm(): PageGeometryMm {
    const dims = this.customDimensionsMm || PAGE_DIMENSIONS_MM[this.setup.size];
    const portrait = this.setup.orientation === "portrait";
    const pageWidth = portrait ? dims.w : dims.h;
    const pageHeight = portrait ? dims.h : dims.w;
    const m = this.setup.margins;

    return {
      pageWidth,
      pageHeight,
      contentWidth: Math.max(10, pageWidth - m.left - m.right),
      contentHeight: Math.max(10, pageHeight - m.top - m.bottom),
      margins: { ...m },
    };
  }

  geometryPx(): PageGeometryPx {
    const g = this.geometryMm();
    return {
      pageWidth: g.pageWidth * PX_PER_MM,
      pageHeight: g.pageHeight * PX_PER_MM,
      contentWidth: g.contentWidth * PX_PER_MM,
      contentHeight: g.contentHeight * PX_PER_MM,
      paddingTop: g.margins.top * PX_PER_MM,
      paddingRight: g.margins.right * PX_PER_MM,
      paddingBottom: g.margins.bottom * PX_PER_MM,
      paddingLeft: g.margins.left * PX_PER_MM,
    };
  }

  toCSSVars(): Record<string, string> {
    const g = this.geometryMm();
    const px = this.geometryPx();
    return {
      "--page-w": `${g.pageWidth}mm`,
      "--page-h": `${g.pageHeight}mm`,
      "--page-content-w": `${g.contentWidth}mm`,
      "--page-content-h": `${g.contentHeight}mm`,
      "--page-margin-top": `${g.margins.top}mm`,
      "--page-margin-right": `${g.margins.right}mm`,
      "--page-margin-bottom": `${g.margins.bottom}mm`,
      "--page-margin-left": `${g.margins.left}mm`,
      "--page-pad-top": `${px.paddingTop}px`,
      "--page-pad-right": `${px.paddingRight}px`,
      "--page-pad-bottom": `${px.paddingBottom}px`,
      "--page-pad-left": `${px.paddingLeft}px`,
      "--page-columns": String(this.setup.columns),
      "--page-column-gap": `${this.setup.columnGap}mm`,
      "--page-column-gap-px": `${this.setup.columnGap * PX_PER_MM}px`,
    };
  }

  toPrintOptions() {
    const g = this.geometryMm();
    return {
      format: this.setup.size,
      landscape: this.setup.orientation === "landscape",
      margin: {
        top: `${g.margins.top}mm`,
        right: `${g.margins.right}mm`,
        bottom: `${g.margins.bottom}mm`,
        left: `${g.margins.left}mm`,
      },
      page: {
        widthMm: g.pageWidth,
        heightMm: g.pageHeight,
      },
    };
  }

  toDocxSection() {
    const g = this.geometryMm();
    return {
      page: {
        size: {
          width: Math.round(g.pageWidth * DXA_PER_MM),
          height: Math.round(g.pageHeight * DXA_PER_MM),
          orientation: this.setup.orientation,
        },
        margin: {
          top: Math.round(g.margins.top * DXA_PER_MM),
          right: Math.round(g.margins.right * DXA_PER_MM),
          bottom: Math.round(g.margins.bottom * DXA_PER_MM),
          left: Math.round(g.margins.left * DXA_PER_MM),
        },
      },
      column: this.setup.columns > 1
        ? { count: this.setup.columns, space: Math.round(this.setup.columnGap * DXA_PER_MM), equalWidth: true }
        : undefined,
    };
  }

  countPages(blockHeights: number[]): number {
    if (blockHeights.length === 0) return 1;
    const cap = this.geometryPx().contentHeight;
    let pages = 1;
    let used = 0;
    for (const h of blockHeights) {
      if (h > cap) {
        if (used > 0) {
          pages += 1;
          used = 0;
        }
        const fullPages = Math.floor(h / cap);
        const remainder = h - fullPages * cap;
        pages += fullPages;
        used = remainder;
        if (used >= cap) {
          pages += 1;
          used = 0;
        }
        continue;
      }
      if (used > 0 && used + h > cap) {
        pages += 1;
        used = h;
      } else {
        used += h;
      }
    }
    return pages;
  }
}

export function createPageLayoutEngineFromSettings(settings: GeometryPageSettings) {
  const setup = normalizePageSettingsToSetup(settings);
  const customDimensionsMm = settings.paper === "custom"
    ? { w: settings.customWidthMm || 210, h: settings.customHeightMm || 297 }
    : settings.paper === "a3"
      ? { w: 297, h: 420 }
      : undefined;
  return new PageLayoutEngine(setup, customDimensionsMm);
}
