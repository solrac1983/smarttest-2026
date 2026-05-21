import { AnimatePresence, motion } from "framer-motion";
import { Camera, CheckCircle2, Info, Loader2, Upload, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CorrectionPreview } from "./correctionsUtils";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_group: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  selectedStudentId: string;
  onSelectedStudentIdChange: (value: string) => void;
  aiProcessing: boolean;
  aiProgress: number;
  onOpenCamera: () => void;
  onOpenFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  aiCorrectionPreview: CorrectionPreview | null;
  answerKey: Record<number, string>;
  totalQ: number;
  questionSubjects: { num: number; subject: string }[];
  manualAnswers: Record<string, string>;
  onManualAnswersChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  onSave: () => void;
}

export function ManualCorrectionDialog({
  open,
  onOpenChange,
  students,
  selectedStudentId,
  onSelectedStudentIdChange,
  aiProcessing,
  aiProgress,
  onOpenCamera,
  onOpenFile,
  fileInputRef,
  onPhotoUpload,
  aiCorrectionPreview,
  answerKey,
  totalQ,
  questionSubjects,
  manualAnswers,
  onManualAnswersChange,
  saving,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Lançar Resultado Individual
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecionar Aluno</Label>
            <Select value={selectedStudentId} onValueChange={onSelectedStudentIdChange}>
              <SelectTrigger className="bg-card"><SelectValue placeholder="Escolha um aluno da lista" /></SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} {student.roll_number ? `(Nº ${student.roll_number})` : ""} — {student.class_group || "S/T"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <Card className="border-dashed border-2 border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 rounded-xl bg-primary text-white shadow-md">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-primary">Correção Instantânea por IA</p>
                  <p className="text-xs text-muted-foreground">Envie uma foto da folha de respostas e deixe o SmartTest fazer o trabalho pesado.</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPhotoUpload}
                disabled={aiProcessing}
              />

              {aiProcessing ? (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-primary">
                    <span className="flex items-center gap-2 animate-pulse"><Loader2 className="h-3 w-3 animate-spin" /> Analisando respostas...</span>
                    <span>{aiProgress}%</span>
                  </div>
                  <Progress value={aiProgress} className="h-2" />
                </div>
              ) : (
                <div className="flex gap-3 mt-4">
                  <Button variant="default" size="sm" className="gap-2 flex-1 h-10 shadow-sm font-bold" onClick={onOpenCamera}>
                    <Camera className="h-4 w-4" /> Tirar Foto Agora
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 flex-1 h-10 font-bold bg-background" onClick={onOpenFile}>
                    <Upload className="h-4 w-4" /> Selecionar Arquivo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <AnimatePresence>
            {aiCorrectionPreview && Object.keys(answerKey).length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card className="border-emerald-500/40 bg-emerald-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-bold text-sm flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Leitura da IA Concluída
                      </p>
                      <Badge className="bg-emerald-500 text-white font-bold">{aiCorrectionPreview.score}%</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-2 rounded-lg bg-background border border-emerald-100">
                        <p className="text-xl font-bold text-emerald-600">{aiCorrectionPreview.correct}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Acertos</p>
                      </div>
                      <div className="p-2 rounded-lg bg-background border border-emerald-100">
                        <p className="text-xl font-bold text-destructive">{aiCorrectionPreview.wrong}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Erros</p>
                      </div>
                      <div className="p-2 rounded-lg bg-background border border-emerald-100">
                        <p className="text-xl font-bold text-muted-foreground">{aiCorrectionPreview.blank}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Em Branco</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 font-medium text-center italic">
                      As respostas foram preenchidas automaticamente abaixo. Verifique antes de salvar.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Lançamento de Respostas ({totalQ})
              </Label>
              {Object.keys(answerKey).length > 0 ? (
                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Gabarito Ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-600 border-amber-200">
                  <Info className="h-3 w-3 mr-1" /> Gabarito Pendente
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-x-2 gap-y-3">
              {questionSubjects.map(({ num, subject }) => {
                const studentAns = manualAnswers[String(num)]?.toUpperCase();
                const correctAns = answerKey[num];
                const isCorrect = studentAns && correctAns && studentAns === correctAns;
                const isWrong = studentAns && correctAns && studentAns !== correctAns;

                return (
                  <div key={num} className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground block text-center truncate" title={subject}>
                      Q{num}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            className={cn(
                              'text-center h-9 text-sm font-bold uppercase p-0 focus-visible:ring-primary transition-all rounded-md shadow-none',
                              isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' :
                              isWrong ? 'border-destructive bg-destructive/5 text-destructive dark:bg-destructive/10' : 'bg-muted/40 border-border/60'
                            )}
                            maxLength={1}
                            value={manualAnswers[String(num)] || ''}
                            onChange={(e) => onManualAnswersChange((prev) => ({ ...prev, [String(num)]: e.target.value.toUpperCase() }))}
                            placeholder="—"
                          />
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px]">
                          {subject}{correctAns ? ` • Gabarito: ${correctAns}` : ''}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {isWrong && correctAns && (
                      <p className="text-[9px] text-center text-emerald-600 font-bold animate-in fade-in zoom-in">{correctAns}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="bg-muted/30 p-4 -m-6 mt-6 rounded-b-lg border-t border-border/60">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold">Cancelar</Button>
          <Button onClick={onSave} disabled={saving || aiProcessing} className="gap-2 font-bold px-6 shadow-md">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
