/**
 * Utilities for sequential question numbering and answer key generation in the exam editor.
 */

/**
 * Counts the highest question number present in the HTML content.
 * Looks for patterns like "1)", "2)", "01)", etc. in bold tags or at line start.
 */
export function getLastQuestionNumber(html: string): number {
  if (!html) return 0;
  // Match patterns: <strong>Questão N)</strong>, <strong>N)</strong>, <b>N)</b>, or standalone N) at paragraph start
  const regex = /(?:<(?:strong|b)>)\s*(?:Questão\s+)?(\d+)\s*\)(?:<\/(?:strong|b)>)|^\s*(?:Questão\s+)?(\d+)\s*\)/gm;
  let max = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const num = parseInt(match[1] || match[2]);
    if (num > max) max = num;
  }
  // Also check plain text patterns inside <p> tags
  const pRegex = /<p[^>]*>\s*(?:<[^>]+>\s*)*(?:Questão\s+)?(\d+)\s*\)/g;
  while ((match = pRegex.exec(html)) !== null) {
    const num = parseInt(match[1]);
    if (num > max) max = num;
  }
  return max;
}

/**
 * Formats question HTML with sequential numbering starting from `startNum`.
 * Used when inserting questions from the bank.
 */
export function numberBankQuestions(
  questions: { subjectName: string; content: string }[],
  startNum: number
): string {
  return questions
    .map((q, i) => {
      const num = startNum + i;
      return `<p><strong>Questão ${num})</strong> ${q.content}</p>`;
    })
    .join("<hr/>");
}

/**
 * Formats AI-generated questions with sequential numbering.
 */
export function numberAIQuestions(
  questions: { content: string; options?: string[] }[],
  startNum: number
): string {
  return questions
    .map((q, i) => {
      const num = startNum + i;
      let qHtml = `<p><strong>Questão ${num})</strong> ${q.content.replace(/^\s*<p>/, "<p>")}</p>`;
      // Remove any existing numbering from the content
      qHtml = qHtml.replace(/<p><strong>(?:Questão\s+)?\d+\)<\/strong>\s*<p>/, "<p><strong>Questão " + num + ")</strong> ");
      if (q.options && q.options.length > 0) {
        qHtml += q.options
          .map((o, idx) => `<p>${String.fromCharCode(97 + idx)}) ${o}</p>`)
          .join("");
      }
      return qHtml;
    })
    .join("<hr/>");
}

export interface AnswerKeyEntry {
  questionNum: number;
  answer: string;
}

/**
 * Generates an HTML page with the answer key table.
 * Modern design: only show selected answer with question number
 */
export function generateAnswerKeyHTML(
  entries: AnswerKeyEntry[],
  title: string
): string {
  if (entries.length === 0) return "";

  const questionsPerPage = 50;
  const numPages = Math.ceil(entries.length / questionsPerPage);
  
  let pagesHTML = "";
  
  for (let page = 0; page < numPages; page++) {
    const startIdx = page * questionsPerPage;
    const endIdx = Math.min(startIdx + questionsPerPage, entries.length);
    const pageEntries = entries.slice(startIdx, endIdx);
    
    const rows = pageEntries
      .map((e) => {
        const qNum = String(e.questionNum).padStart(2, "0");
        const answer = e.answer.toUpperCase();
        const getLetterBgColor = (letter: string) => {
          switch (letter) {
            case "A": return "#ef4444";
            case "B": return "#3b82f6";
            case "C": return "#10b981";
            case "D": return "#f59e0b";
            case "E": return "#8b5cf6";
            default: return "#3182ce";
          }
        };
        const bg = getLetterBgColor(answer);
        return `<tr><td style="text-align:center;padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#1a202c;width:60px;">${qNum}</td><td style="text-align:center;padding:6px 12px;border:1px solid #e2e8f0;"><span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:${bg};color:#fff;font-weight:bold;font-size:14px;">${answer}</span></td></tr>`;
      })
      .join("");

    const breakBefore = page > 0 ? 'style="break-before:page;page-break-before:always;"' : '';
    
    pagesHTML += `
      <div ${breakBefore} style="padding:30px;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#1a202c;letter-spacing:2px;text-transform:uppercase;">Gabarito</h1>
          <p style="margin:8px 0 0;font-size:16px;color:#4a5568;font-weight:500;">${title}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#718096;">Página ${page + 1} de ${numPages}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:linear-gradient(135deg,#3182ce,#2b6cb0);">
              <th style="text-align:center;padding:12px;border:none;font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:1px;">Questão</th>
              <th style="text-align:center;padding:12px;border:none;font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:1px;">Resposta</th>
            </tr>
          </thead>
          <tbody style="background:#fff;">
            ${rows}
          </tbody>
        </table>
        <div style="text-align:center;margin-top:20px;font-size:11px;color:#a0aec0;">
          Respostas: A ( ) | B ( ) | C ( ) | D ( ) | E ( )
        </div>
      </div>
    `;
  }

  return `<div style="break-before:page;page-break-before:always;"></div>${pagesHTML}`;
}

/**
 * Extracts answer keys from editor HTML content.
 * Detects patterns like:
 *   - "Letra C. Pág 89" / "Letra A. Pág 87 e 88"
 *   - "Gabarito: A" / "Gabarito: 1-A, 2-B"
 *   - "Resposta: C"
 *   - Inline gabarito sections
 * Returns array of { questionNum, answer } sorted by questionNum.
 */
export function extractAnswersFromContent(html: string): AnswerKeyEntry[] {
  if (!html) return [];
  const answers = new Map<number, string>();

  // Strip HTML tags for text analysis
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

  const sequentialMatches: { index: number; answers: string[] }[] = [];

  // Pattern 1: "Letra X. Pág NN" or "Letra X" — appears in gabarito sections
  // These are sequential within a gabarito block
  const letraRegex = /Letra\s+([A-Ea-e])\.?\s*(?:P[áa]g\.?\s*[\d\s,ea]+)?/gi;
  let letraMatch: RegExpExecArray | null;
  while ((letraMatch = letraRegex.exec(text)) !== null) {
    sequentialMatches.push({
      index: letraMatch.index,
      answers: [letraMatch[1].toUpperCase()],
    });
  }

  // Pattern 2: Numbered gabarito "1-A, 2-B" or "1) A" or "1: A"
  if (answers.size === 0 && sequentialMatches.length === 0) {
    const numberedRegex = /(?:^|\s)(\d+)\s*[-):.\s]+\s*(?:Letra\s+)?([A-Ea-e])(?:\s|[,;.\n]|$)/gm;
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numberedRegex.exec(text)) !== null) {
      const qNum = parseInt(numMatch[1]);
      if (qNum > 0 && qNum <= 200) {
        answers.set(qNum, numMatch[2].toUpperCase());
      }
    }
  }

  // Pattern 3: labeled sequential keys like "Gabarito: A" or "Gabarito: A, B, C"
  const gabRegex = /(?:Gabarito|Resposta|Alternativa\s+correta)\s*:\s*((?:[A-Ea-e](?:\s*[,;\/\-]\s*|\s+)){0,}[A-Ea-e])/gi;
  let gabMatch: RegExpExecArray | null;
  while ((gabMatch = gabRegex.exec(text)) !== null) {
    const letters = gabMatch[1].match(/[A-Ea-e]/g) || [];
    if (letters.length > 0) {
      sequentialMatches.push({
        index: gabMatch.index,
        answers: letters.map((letter) => letter.toUpperCase()),
      });
    }
  }

  if (answers.size === 0 && sequentialMatches.length > 0) {
    sequentialMatches
      .sort((a, b) => a.index - b.index)
      .forEach((match) => {
        match.answers.forEach((answer) => {
          answers.set(answers.size + 1, answer);
        });
      });
  }

  return Array.from(answers.entries())
    .sort(([a], [b]) => a - b)
    .map(([questionNum, answer]) => ({ questionNum, answer }));
}
