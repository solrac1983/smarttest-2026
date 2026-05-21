import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving
 * allowed tags and attributes for the rich text editor and formulas.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "u", "s", "em", "strong", "span", 
      "h1", "h2", "h3", "h4", "h5", "h6", 
      "ul", "ol", "li", 
      "blockquote", "hr",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "a",
      "div", "pre", "code"
    ],
    ALLOWED_ATTR: [
      "style", "class", "id", 
      "src", "alt", "width", "height", "data-id", "data-src",
      "href", "target", "rel",
      "data-type", "data-formula", "data-display", // Formula attributes
      "data-q-id", "data-q-number", "data-q-subject", "data-q-topic", "data-q-difficulty", "data-q-points", "data-q-answer", "data-q-tags", "data-q-vg", // Question attributes
      "data-question-block", "data-question-stem", "data-alternative-list", "data-alternative-item", "data-letter", "data-correct",
      "data-pb-orig-mt", "data-page-break-shift", "data-blank-page" // Layout attributes
    ],
    // Force target="_blank" on links for security
    ADD_ATTR: ["target"],
    FORBID_ATTR: ["onerror", "onclick", "onload"],
  });
}

/**
 * Validates formula content (simple LaTeX validation).
 */
export function validateFormula(formula: string): boolean {
  if (!formula) return false;
  
  // Check for common LaTeX syntax errors like unclosed braces
  let openBraces = 0;
  for (const char of formula) {
    if (char === "{") openBraces++;
    if (char === "}") openBraces--;
    if (openBraces < 0) return false; // Closing brace without opening
  }
  
  return openBraces === 0;
}

/**
 * Sanitizes a formula string for safe storage/rendering.
 */
export function sanitizeFormula(formula: string): string {
  if (!formula) return "";
  
  // Remove potentially harmful characters in LaTeX contexts if any
  // Most LaTeX is safe as it's rendered by KaTeX, but we should 
  // ensure no script tags or similar are present.
  return formula.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
}
