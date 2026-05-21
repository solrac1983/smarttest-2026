/**
 * Shared sanitization rules for backend and frontend.
 * Pure TypeScript implementation without heavy dependencies to avoid bundling issues in Edge Functions.
 */

export const ALLOWED_TAGS = new Set([
  "p", "br", "b", "i", "u", "s", "em", "strong", "span", 
  "h1", "h2", "h3", "h4", "h5", "h6", 
  "ul", "ol", "li", 
  "blockquote", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "img", "a",
  "div", "pre", "code"
]);

export const ALLOWED_ATTR = new Set([
  "style", "class", "id", 
  "src", "alt", "width", "height", "data-id", "data-src",
  "href", "target", "rel",
  "data-type", "data-formula", "data-display",
  "data-q-id", "data-q-number", "data-q-subject", "data-q-topic", "data-q-difficulty", "data-q-points", "data-q-answer", "data-q-tags", "data-q-vg",
  "data-question-block", "data-question-stem", "data-alternative-list", "data-alternative-item", "data-letter", "data-correct",
  "data-pb-orig-mt", "data-page-break-shift", "data-blank-page"
]);

/**
 * Basic HTML sanitization for Deno Edge Functions.
 * Strips scripts and common event handlers.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  
  // 1. Remove script tags and their content
  let clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
  
  // 2. Remove common event handlers (onmouseover, onclick, etc.)
  clean = clean.replace(/\son\w+=(['"])[^\1]*?\1/gim, "");
  
  // 3. Remove javascript: links
  clean = clean.replace(/href=(['"])javascript:[^\1]*?\1/gim, 'href="#"');

  return clean;
}

/**
 * Validates formula content (simple LaTeX validation).
 */
export function validateFormula(formula: string): boolean {
  if (!formula) return false;
  
  let openBraces = 0;
  for (const char of formula) {
    if (char === "{") openBraces++;
    if (char === "}") openBraces--;
    if (openBraces < 0) return false;
  }
  
  return openBraces === 0;
}
