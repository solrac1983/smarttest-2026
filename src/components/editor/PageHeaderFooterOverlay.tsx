import { useEffect, useRef, useState } from "react";

export interface HeaderFooterConfig {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  showPageNumber: boolean;
  pageNumberPosition: "center" | "left" | "right";
  firstPageDifferent: boolean;
}

export const defaultHeaderFooterConfig: HeaderFooterConfig = {
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "",
  showPageNumber: false,
  pageNumberPosition: "center",
  firstPageDifferent: false,
};

interface PageHeaderFooterOverlayProps {
  config: HeaderFooterConfig;
  editorEl: HTMLElement | null;
}

import { parsePageCssLength } from "./core/PageLayoutEngine";

const DEFAULT_PAGE_HEIGHT_PX = Math.round(parsePageCssLength("297mm"));
const DEFAULT_PAGE_GAP_PX = 24;

function parseCSSLength(value: string, fallback: number): number {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const amount = parsePageCssLength(trimmed);
  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
}

export function PageHeaderFooterOverlay({ config, editorEl }: PageHeaderFooterOverlayProps) {
  const [pageCount, setPageCount] = useState(1);
  const [pageHeightPx, setPageHeightPx] = useState(DEFAULT_PAGE_HEIGHT_PX);
  const [pageGapPx, setPageGapPx] = useState(DEFAULT_PAGE_GAP_PX);
  const [padTopPx, setPadTopPx] = useState(72);
  const [padBottomPx, setPadBottomPx] = useState(72);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!editorEl) return;

    const updateGeometry = () => {
      const styles = window.getComputedStyle(editorEl);
      const nextPageHeight = parseCSSLength(styles.getPropertyValue("--page-h"), DEFAULT_PAGE_HEIGHT_PX);
      const nextPageGap = parseCSSLength(styles.getPropertyValue("--page-gap"), DEFAULT_PAGE_GAP_PX);
      const nextPadTop = parseCSSLength(styles.getPropertyValue("--page-pad-top"), 72);
      const nextPadBottom = parseCSSLength(styles.getPropertyValue("--page-pad-bottom"), 72);
      const cycle = Math.max(1, nextPageHeight + nextPageGap);
      const contentHeight = Math.max(editorEl.scrollHeight, nextPageHeight);
      const nextPageCount = Math.max(1, Math.ceil(contentHeight / cycle));

      setPageHeightPx(nextPageHeight);
      setPageGapPx(nextPageGap);
      setPadTopPx(nextPadTop);
      setPadBottomPx(nextPadBottom);
      setPageCount(nextPageCount);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateGeometry);
    };

    const handlePageCount = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof count === "number" && count > 0) {
        setPageCount(count);
      }
      scheduleUpdate();
    };

    updateGeometry();

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(editorEl);

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(editorEl, { childList: true, subtree: true, characterData: true });

    window.addEventListener("editor-page-count", handlePageCount);
    window.addEventListener("editor-margins-change", scheduleUpdate);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("editor-page-count", handlePageCount);
      window.removeEventListener("editor-margins-change", scheduleUpdate);
    };
  }, [editorEl]);

  const hasAnyContent =
    config.headerLeft ||
    config.headerCenter ||
    config.headerRight ||
    config.footerLeft ||
    config.footerCenter ||
    config.footerRight ||
    config.showPageNumber;

  if (!hasAnyContent) return null;

  const pageCycle = pageHeightPx + pageGapPx;
  const headerOffset = Math.max(12, Math.min(24, Math.round(padTopPx * 0.35)));
  const footerOffset = Math.max(28, Math.min(42, Math.round(padBottomPx * 0.45)));

  const renderPageNumber = (pageNum: number, totalPages: number) => {
    return `Página ${pageNum} de ${totalPages}`;
  };

  return (
    <>
      {Array.from({ length: pageCount }, (_, i) => {
        const pageNum = i + 1;
        const isFirstPage = i === 0;
        const skipHeader = config.firstPageDifferent && isFirstPage;
        const pageTop = i * pageCycle;
        const headerY = pageTop + headerOffset;
        const footerY = pageTop + pageHeightPx - footerOffset;

        let footerCenterText = config.footerCenter;
        if (config.showPageNumber && config.pageNumberPosition === "center") {
          const pageNumber = renderPageNumber(pageNum, pageCount);
          footerCenterText = footerCenterText ? `${footerCenterText} — ${pageNumber}` : pageNumber;
        }

        let footerLeftText = config.footerLeft;
        if (config.showPageNumber && config.pageNumberPosition === "left") {
          const pageNumber = renderPageNumber(pageNum, pageCount);
          footerLeftText = footerLeftText ? `${footerLeftText} — ${pageNumber}` : pageNumber;
        }

        let footerRightText = config.footerRight;
        if (config.showPageNumber && config.pageNumberPosition === "right") {
          const pageNumber = renderPageNumber(pageNum, pageCount);
          footerRightText = footerRightText ? `${footerRightText} — ${pageNumber}` : pageNumber;
        }

        const hasHeader = !skipHeader && (config.headerLeft || config.headerCenter || config.headerRight);
        const hasFooter = footerLeftText || footerCenterText || footerRightText;

        return (
          <div key={pageNum}>
            {hasHeader && (
              <div className="page-header-overlay" style={{ top: `${headerY}px` }}>
                <span className="page-hf-left">{config.headerLeft}</span>
                <span className="page-hf-center">{config.headerCenter}</span>
                <span className="page-hf-right">{config.headerRight}</span>
              </div>
            )}

            {hasFooter && (
              <div className="page-footer-overlay" style={{ top: `${footerY}px` }}>
                <span className="page-hf-left">{footerLeftText}</span>
                <span className="page-hf-center">{footerCenterText}</span>
                <span className="page-hf-right">{footerRightText}</span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
