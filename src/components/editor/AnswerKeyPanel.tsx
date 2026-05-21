/**
 * AnswerKeyPanel — side panel that lists the auto-generated answer key and
 * surfaces validator issues. Reads directly from the editor on every render
 * cycle triggered by the parent (which subscribes to Tiptap updates).
 */
import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, X, AlertTriangle, AlertCircle, Info, FileDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { buildAnswerKey, groupBySubject, serializeAnswerKey } from "@/editor-core/education/AnswerKeyModel";
import { validateExam, type IssueSeverity } from "@/editor-core/education/ExamValidator";
import { cn } from "@/lib/utils";

interface AnswerKeyPanelProps {
  editor: Editor;
  onClose: () => void;
  /** A counter that bumps whenever the editor updates so memos refresh. */
  refreshKey: number;
}

const sevIcon: Record<IssueSeverity, React.ElementType> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const sevColor: Record<IssueSeverity, string> = {
  error: "text-destructive",
  warning: "text-amber-500",
  info: "text-blue-500",
};

const sevBg: Record<IssueSeverity, string> = {
  error: "bg-destructive/10 border-destructive/20",
  warning: "bg-amber-500/10 border-amber-500/20",
  info: "bg-blue-500/10 border-blue-500/20",
};

export function AnswerKeyPanel({ editor, onClose, refreshKey }: AnswerKeyPanelProps) {
  const entries = useMemo(() => buildAnswerKey(editor), [editor, refreshKey]);
  const issues = useMemo(() => validateExam(editor), [editor, refreshKey]);
  const grouped = useMemo(() => groupBySubject(entries), [entries]);

  const copyKey = () => {
    const text = serializeAnswerKey(entries);
    if (!text) {
      toast.info("Nenhuma resposta marcada ainda.");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Gabarito copiado!");
  };

  const insertAtEnd = () => {
    if (entries.length === 0) {
      toast.info("Nenhuma questão encontrada para gerar gabarito.");
      return;
    }
    
    let html = `<div style="margin-top: 32px; border-top: 2px dashed currentColor; padding-top: 20px;">`;
    html += `<h2 style="text-align: center; margin-bottom: 16px;">Gabarito Oficial</h2>`;
    
    Object.entries(grouped).forEach(([subject, list]) => {
      if (Object.keys(grouped).length > 1) {
        html += `<h4 style="margin: 12px 0 8px;">${subject}</h4>`;
      }
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">`;
      html += `<tr>`;
      
      let count = 0;
      list.forEach((e) => {
        if (count > 0 && count % 10 === 0) {
           html += `</tr><tr>`;
        }
        const letterHtmlColors: Record<string, string> = {
          A: "#ef4444",
          B: "#3b82f6",
          C: "#10b981",
          D: "#f59e0b",
          E: "#8b5cf6",
        };
        const letterColor = e.letter ? (letterHtmlColors[e.letter.toUpperCase()] || "inherit") : "inherit";
        html += `<td style="border: 1px solid currentColor; padding: 6px; text-align: center; vertical-align: middle;">`;
        html += `<div style="font-size: 11px; opacity: 0.7; margin-bottom: 2px;">Q${e.number}</div>`;
        html += `<strong style="font-size: 14px; color: ${letterColor};">${e.letter ?? "-"}</strong>`;
        html += `</td>`;
        count++;
      });
      // Fill remaining cells
      while (count % 10 !== 0) {
        html += `<td style="border: 1px solid currentColor; padding: 6px;"></td>`;
        count++;
      }
      
      html += `</tr></table>`;
    });
    html += `</div><p></p>`;

    editor.chain().focus().insertContentAt(editor.state.doc.content.size, html).run();
    toast.success("Gabarito inserido no final do documento!");
  };

  return (
    <aside className="w-[320px] shrink-0 border-l bg-background flex flex-col h-full shadow-[-4px_0_12px_rgba(0,0,0,0.03)] z-10">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Gabarito & Validação
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Sessão do Gabarito */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Respostas ({entries.length})
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={copyKey} className="h-7 px-2 text-[10px] bg-background">
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
                <Button variant="default" size="sm" onClick={insertAtEnd} className="h-7 px-2 text-[10px]">
                  <FileDown className="h-3 w-3 mr-1" />
                  Inserir
                </Button>
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-xl bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Insira questões pela aba <strong>Provas</strong> para gerar o gabarito.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([subject, list]) => (
                  <div key={subject} className="bg-muted/20 rounded-xl p-3 border">
                    {Object.keys(grouped).length > 1 && (
                      <div className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {subject}
                      </div>
                    )}
                    <div className="grid grid-cols-5 gap-2">
                      {list.map((e) => {
                        const letterColorMap: Record<string, string> = {
                          A: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
                          B: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
                          C: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          D: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          E: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
                        };
                        const colorClass = e.letter
                          ? (letterColorMap[e.letter.toUpperCase()] || "border-primary/20 bg-primary/5 text-primary")
                          : "border-destructive/20 bg-destructive/5 text-destructive";
                        
                        return (
                          <div
                            key={e.questionId}
                            className={cn(
                              "flex flex-col items-center justify-center rounded-lg border p-1.5 shadow-sm transition-all hover:-translate-y-0.5",
                              colorClass
                            )}
                            title={e.letter ? `Questão ${e.number}: Alternativa ${e.letter}` : `Questão ${e.number}: Sem resposta marcada`}
                          >
                            <span className="text-[9px] font-medium opacity-60 mb-0.5">Q{e.number}</span>
                            <span className="text-sm font-bold leading-none">{e.letter ?? "?"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sessão de Validação */}
          <section>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              Avisos
              {issues.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 text-[10px] px-1.5">{issues.length}</Badge>
              )}
            </div>
            
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Nenhum problema encontrado</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {issues.map((it, i) => {
                  const Icon = sevIcon[it.severity];
                  return (
                    <li key={i} className={cn("flex items-start gap-2 text-xs p-2.5 rounded-lg border", sevBg[it.severity])}>
                      <Icon className={cn("h-4 w-4 shrink-0", sevColor[it.severity])} />
                      <span className="leading-snug text-foreground/90">
                        {it.questionNumber !== undefined && (
                          <strong className="mr-1">Questão {it.questionNumber}:</strong>
                        )}
                        {it.message}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
