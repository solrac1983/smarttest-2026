import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'
import { createPageLayoutEngineFromSettings, parsePageCssLength } from './core/PageLayoutEngine'

export type PaginationOptions = {
  pageHeightPx: number
  pagePaddingTopPx: number
  pagePaddingBottomPx: number
  pageGapPx: number
}


const measureCache = new Map<string, number>()

export function measurePageHeightPx(cssLength: string): number {
  const key = cssLength?.trim() ?? ''
  if (!key) return 0
  if (measureCache.has(key)) return measureCache.get(key)!

  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:0;height:${key};`
  document.body.appendChild(probe)
  const px = probe.getBoundingClientRect().height
  document.body.removeChild(probe)

  measureCache.set(key, px)
  return px
}

export function __resetPageHeightCacheForTests(): void {
  measureCache.clear()
}

const paginationKey = new PluginKey<DecorationSet>('pagination')
const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR', 'HR', 'PRE', 'BLOCKQUOTE'])
const SKIPPED_CLASSES = new Set([
  'page-break-widget',
  'ProseMirror-widget-container',
  'page-header-overlay',
  'page-footer-overlay',
  'blank-page-spacer',
])

function isHardBreak(el: HTMLElement): boolean {
  return el.hasAttribute('data-page-break') || el.classList.contains('hard-page-break')
}

function shouldSkip(el: HTMLElement): boolean {
  if (el.hasAttribute('data-blank-page')) return true
  return Array.from(el.classList).some((className) => SKIPPED_CLASSES.has(className))
}

function collectBlocks(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = []

  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!(child instanceof HTMLElement) || shouldSkip(child)) continue
    if (isHardBreak(child)) {
      blocks.push(child)
      continue
    }

    const hasBlockChildren = child.children.length > 0 && !BLOCK_TAGS.has(child.tagName)
    if (!hasBlockChildren) {
      blocks.push(child)
      continue
    }

    const nested = collectBlocks(child)
    blocks.push(...(nested.length > 0 ? nested : [child]))
  }

  return blocks
}

type PageMetrics = {
  pageHeight: number
  pageGap: number
  padTop: number
  padBottom: number
  reservedTop: number
  reservedBottom: number
  safeTop: number
  safeBottom: number
  pageCycle: number
}

function readPageMetrics(pm: HTMLElement, options: PaginationOptions): PageMetrics {
  const styles = window.getComputedStyle(pm)
  const pageHeight = parsePageCssLength(styles.getPropertyValue('--page-h')) || options.pageHeightPx
  const pageGap = parsePageCssLength(styles.getPropertyValue('--page-gap')) || options.pageGapPx
  const padTop = parsePageCssLength(styles.getPropertyValue('--page-pad-top')) || options.pagePaddingTopPx
  const padBottom = parsePageCssLength(styles.getPropertyValue('--page-pad-bottom')) || options.pagePaddingBottomPx
  const reservedTop = parsePageCssLength(styles.getPropertyValue('--page-reserved-top'))
  const reservedBottom = parsePageCssLength(styles.getPropertyValue('--page-reserved-bottom'))

  return {
    pageHeight,
    pageGap,
    padTop,
    padBottom,
    reservedTop,
    reservedBottom,
    safeTop: padTop + reservedTop,
    safeBottom: padBottom + reservedBottom,
    pageCycle: pageHeight + pageGap,
  }
}

function countPages(pm: HTMLElement, metrics: PageMetrics): number {
  const inlineMinHeight = Number.parseFloat(pm.style.minHeight || '0') || 0
  const contentHeight = Math.max(pm.scrollHeight, inlineMinHeight, metrics.pageHeight)
  return Math.max(1, Math.ceil(contentHeight / metrics.pageCycle))
}

function buildBreakWidget(pos: number, currentY: number, pageIdx: number, pageNumber: number, metrics: PageMetrics) {
  const nextSafeTop = ((pageIdx + 1) * metrics.pageCycle) + metrics.safeTop
  const totalGapHeight = Math.max(0, Math.ceil(nextSafeTop - currentY))
  if (totalGapHeight <= 0) return null

  const currentPageRemainder = Math.max(0, Math.round(totalGapHeight - metrics.safeTop - metrics.pageGap))
  const separatorOffset = Math.max(
    16,
    Math.round(currentPageRemainder + (metrics.pageGap / 2)),
  )

  return Decoration.widget(
    pos,
    () => {
      const el = document.createElement('div')
      el.className = 'page-break-widget'
      el.style.height = `${totalGapHeight}px`
      el.style.setProperty('--page-break-gap', `${metrics.pageGap}px`)
      el.style.setProperty('--page-break-next-safe-top', `${metrics.safeTop}px`)
      el.style.setProperty('--page-break-current-remainder', `${currentPageRemainder}px`)

      const sep = document.createElement('div')
      sep.className = 'page-separator-line'
      sep.style.top = `${separatorOffset}px`

      const label = document.createElement('span')
      label.className = 'page-break-label'
      label.textContent = `Página ${pageNumber}`

      sep.appendChild(label)
      el.appendChild(sep)
      return el
    },
    { side: -1, key: `break-${pos}-${pageNumber}-${totalGapHeight}` },
  )
}

export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      pageHeightPx: 1122.52,
      pagePaddingTopPx: 72,
      pagePaddingBottomPx: 72,
      pageGapPx: 40,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    const buildDecorations = (view: EditorView): DecorationSet => {
      const pm = view.dom as HTMLElement | null
      if (!pm || !pm.isConnected) return DecorationSet.empty

      const examPage = pm.closest('.exam-page')
      if (examPage && examPage.classList.contains('layout-horizontal')) {
        return DecorationSet.empty
      }

      const metrics = readPageMetrics(pm, options)
      const pmRect = pm.getBoundingClientRect()
      const widgets: Decoration[] = []
      const brokenPages = new Set<string>()
      const blocks = collectBlocks(pm)

      for (const block of blocks) {
        try {
          const pos = view.posAtDOM(block, 0)
          const rect = block.getBoundingClientRect()
          const blockTop = rect.top - pmRect.top
          const blockBottom = rect.bottom - pmRect.top
          const pageIdx = Math.floor(Math.max(blockTop, 0) / metrics.pageCycle)
          const pageSafeBottom = (pageIdx * metrics.pageCycle) + metrics.pageHeight - metrics.safeBottom
          const pageKey = `page:${pageIdx}`
          const pageNumber = widgets.length + 2

          if (isHardBreak(block)) {
            const widget = buildBreakWidget(pos, blockTop, pageIdx, pageNumber, metrics)
            if (widget) widgets.push(widget)
            brokenPages.add(pageKey)
            continue
          }

          const exceedsPage = blockBottom > pageSafeBottom + 1
          const startsInFooterOrGap = blockTop >= pageSafeBottom - 1
          if ((exceedsPage || startsInFooterOrGap) && !brokenPages.has(pageKey)) {
            const widget = buildBreakWidget(pos, blockTop, pageIdx, pageNumber, metrics)
            if (widget) {
              widgets.push(widget)
              brokenPages.add(pageKey)
            }
          }
        } catch {
          /* ignore transient DOM mapping failures during live reflow */
        }
      }

      if (typeof window !== 'undefined') {
        const measuredPages = countPages(pm, metrics)
        const totalPages = widgets.length > 0 ? widgets.length + 1 : measuredPages
        window.dispatchEvent(new CustomEvent('editor-page-count', { detail: { count: totalPages } }))
      }

      return DecorationSet.create(view.state.doc, widgets)
    }

    return [
      new Plugin({
        key: paginationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, oldState) {
            const meta = tr.getMeta(paginationKey)
            if (meta) return meta
            return oldState.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return paginationKey.getState(state) ?? DecorationSet.empty
          },
        },
        view(view) {
          let raf = 0

          const update = () => {
            if (!view.dom.isConnected) return
            try {
              const next = buildDecorations(view)
              view.dispatch(view.state.tr.setMeta(paginationKey, next))
            } catch (error) {
              console.error('Pagination update failed', error)
            }
          }

          const scheduleUpdate = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(update)
          }

          const ro = new ResizeObserver(scheduleUpdate)
          ro.observe(view.dom)

          const observer = new MutationObserver(scheduleUpdate)
          observer.observe(view.dom, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'src', 'data-page-break'],
          })

          window.addEventListener('resize', scheduleUpdate)
          window.addEventListener('editor-margins-change', scheduleUpdate)

          return {
            update: scheduleUpdate,
            destroy: () => {
              cancelAnimationFrame(raf)
              ro.disconnect()
              observer.disconnect()
              window.removeEventListener('resize', scheduleUpdate)
              window.removeEventListener('editor-margins-change', scheduleUpdate)
            },
          }
        },
      }),
    ]
  },
})



