import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Simulado, SimuladoSubject } from "@/lib/simuladoTypes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deriveSimuladoWorkflowStatus, getSimuladoCorrectionBlockReason } from "@/lib/simuladoWorkflow";
import { extractAnswerKeysFromContent } from "./SimuladoPDFGenerator";
import { ClipboardList, Save, Loader2, CheckCircle2, AlertCircle, Pencil, RotateCcw } from "lucide-react";

interface Props {
  sim: Simulado;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface QuestionItem {
  qNum: number;
  subjectId: string;
  subjectName: string;
  localIndex: number;
  autoFilled: boolean;
}

function buildQuestionMap(subjects: SimuladoSubject[]): QuestionItem[] {
  const items: QuestionItem[] = [];
  let currentQ = 1;
  for (const s of subjects) {
    if (s.type === "discursiva") continue;
    const hasAutoKey = s.status === "approved" && !!s.answer_key?.trim();
    for (let i = 0; i < s.question_count; i++) {
      items.push({
        qNum: currentQ,
        subjectId: s.id,
        subjectName: s.subject_name,
        localIndex: i + 1,
        autoFilled: hasAutoKey,
      });
      currentQ++;
    }
  }
  return items;
}




export default function AnswerKeyEditor({ sim, open, onOpenChange, onSaved }: Props) {
  const { role } = useAuth();
  const [alternatives, setAlternatives] = useState("5");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [manualOverrides, setManualOverrides] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const questionMap = useMemo(() => buildQuestionMap(sim.subjects), [sim.subjects]);
  const totalQ = questionMap.length;
  const altCount = parseInt(alternatives);
  const letterOptions = "ABCDEFGHIJ".slice(0, altCount).split("");
  const workflowStatus = useMemo(() => deriveSimuladoWorkflowStatus(sim.subjects), [sim.subjects]);
  const canManageAnswerKey = role === "admin" || role === "coordinator" || role === "super_admin";
  const correctionBlockReason = useMemo(() => getSimuladoCorrectionBlockReason(sim.subjects), [sim.subjects]);
  const answerKeyBlockReason = !canManageAnswerKey
    ? "Somente coordenação e administração podem consolidar o gabarito do simulado."
    : workflowStatus !== "approved"
      ? correctionBlockReason || "O gabarito só pode ser consolidado após a aprovação de todas as disciplinas."
      : null;
  const answerKeyEditable = !answerKeyBlockReason;

  // Count auto-filled vs manual
  const autoFilledCount = useMemo(() => {
    return questionMap.filter(q => q.autoFilled && answers[q.qNum] && !manualOverrides.has(q.qNum)).length;
  }, [questionMap, answers, manualOverrides]);

  useEffect(() => {
    if (open) {
      // Use the unified extraction that handles answer_key field + content HTML
      const allKeys = extractAnswerKeysFromContent(sim.subjects);
      const merged: Record<number, string> = {};
      for (const [k, v] of allKeys) merged[k] = v;
      setAnswers(merged);
      setManualOverrides(new Set());
    }
  }, [open, sim.subjects]);

  const setAnswer = (qNum: number, letter: string) => {
    setAnswers(prev => {
      if (prev[qNum] === letter) {
        const next = { ...prev };
        delete next[qNum];
        return next;
      }
      return { ...prev, [qNum]: letter };
    });
    setManualOverrides(prev => {
      const next = new Set(prev);
      next.add(qNum);
      return next;
    });
  };

  const resetToAuto = () => {
    if (!answerKeyEditable) {
      toast({ title: answerKeyBlockReason || "O gabarito está bloqueado para edição.", variant: "destructive" });
      return;
    }

    const allKeys = extractAnswerKeysFromContent(sim.subjects);
    const merged: Record<number, string> = {};
    for (const [k, v] of allKeys) merged[k] = v;
    setAnswers(merged);
    setManualOverrides(new Set());
    toast({ title: "Gabarito restaurado com dados automáticos." });
  };

  const handleSave = async () => {
    if (!answerKeyEditable) {
      toast({ title: answerKeyBlockReason || "O gabarito está bloqueado para edição.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Group answers by subject
      const subjectAnswers: Record<string, { localIndex: number; letter: string }[]> = {};
      for (const item of questionMap) {
        if (!subjectAnswers[item.subjectId]) subjectAnswers[item.subjectId] = [];
        const ans = answers[item.qNum];
        if (ans) {
          subjectAnswers[item.subjectId].push({ localIndex: item.localIndex, letter: ans });
        }
      }

      const answerKeysBySubject = sim.subjects.reduce<Record<string, string>>((acc, subject) => {
        if (subject.type === "discursiva") {
          return acc;
        }

        const subAns = subjectAnswers[subject.id] || [];
        const keyStr = subAns.map(a => `${a.localIndex}-${a.letter}`).join(", ");

        if (subject.status === "approved" && !keyStr.trim()) {
          throw new Error(`Preencha o gabarito da disciplina ${subject.subject_name} antes de salvar.`);
        }

        acc[subject.id] = keyStr;
        return acc;
      }, {});

      const { error } = await supabase.rpc("save_simulado_answer_keys", {
        _simulado_id: sim.id,
        _answer_keys: answerKeysBySubject,
      });

      if (error) throw error;

      toast({ title: `Gabarito salvo com ${Object.keys(answers).length} respostas!` });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar gabarito.", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.keys(answers).length;

  // Group questions by subject for display
  const subjectGroups = useMemo(() => {
    const groups: { name: string; status: string; questions: QuestionItem[] }[] = [];
    let lastSubject = "";
    for (const item of questionMap) {
      if (item.subjectName !== lastSubject) {
        const sub = sim.subjects.find(s => s.subject_name === item.subjectName);
        groups.push({ name: item.subjectName, status: sub?.status || "pending", questions: [] });
        lastSubject = item.subjectName;
      }
      groups[groups.length - 1].questions.push(item);
    }
    return groups;
  }, [questionMap, sim.subjects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Gabarito — {sim.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              O gabarito é preenchido automaticamente quando o professor envia e o administrador aprova a disciplina.
            </p>
            <p className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
              Você pode editar manualmente qualquer resposta clicando na alternativa.
            </p>
          </div>

          {answerKeyBlockReason && (
            <div className="bg-amber-50/80 border border-amber-300/60 dark:bg-amber-950/20 dark:border-amber-800/50 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                Consolidação de gabarito bloqueada
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/80">{answerKeyBlockReason}</p>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Alternativas</Label>
                <Select value={alternatives} onValueChange={setAlternatives} disabled={!answerKeyEditable}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 (A-C)</SelectItem>
                    <SelectItem value="4">4 (A-D)</SelectItem>
                    <SelectItem value="5">5 (A-E)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {filledCount}/{totalQ} preenchidas
                </Badge>
                {autoFilledCount > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {autoFilledCount} automáticas
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={resetToAuto} disabled={!answerKeyEditable}>
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar automático
            </Button>
          </div>

          {subjectGroups.map(group => (
            <div key={group.name}>
              <div className="bg-muted/50 px-3 py-1.5 rounded-md mb-2 flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide">{group.name}</Label>
                {group.status === "approved" ? (
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> Aprovada - Gabarito automático
                  </Badge>
                ) : group.status === "submitted" ? (
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" /> Aguardando aprovação
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Pendente
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {group.questions.map(item => (
                  <div key={item.qNum} className="text-center">
                    <span className="text-[9px] font-bold text-muted-foreground block mb-0.5 leading-tight">
                      Q{item.qNum}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {letterOptions.map(letter => {
                        const activeColors: Record<string, string> = {
                          A: "bg-red-500 hover:bg-red-600 text-white",
                          B: "bg-blue-500 hover:bg-blue-600 text-white",
                          C: "bg-emerald-500 hover:bg-emerald-600 text-white",
                          D: "bg-amber-500 hover:bg-amber-600 text-white",
                          E: "bg-purple-500 hover:bg-purple-600 text-white",
                        };
                        const activeColor = activeColors[letter.toUpperCase()] || "bg-primary text-primary-foreground";
                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => setAnswer(item.qNum, letter)}
                            disabled={!answerKeyEditable}
                            className={`text-[10px] font-bold rounded h-5 w-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              answers[item.qNum] === letter
                                ? item.autoFilled && !manualOverrides.has(item.qNum)
                                  ? "bg-green-600 text-white"
                                  : activeColor
                                : "bg-muted/30 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !answerKeyEditable} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Gabarito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
