import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FileText, ChevronDown, ChevronUp, MessageSquare, FileEdit, Eye,
  CheckCircle2, Printer, FileSpreadsheet, ClipboardList, Pencil, Trash2,
  RotateCcw, Flag, LayoutGrid, Clock,
} from "lucide-react";
import type { Simulado, SimuladoSubject } from "@/lib/simuladoTypes";
import { cn } from "@/lib/utils";
import {
  statusColors, statusLabels, subjectStatusColors, subjectStatusLabels,
  buildRanges,
} from "./SimuladoConstants";
import { canApproveAllSimuladoSubjects, getPendingApprovalSubjects } from "@/lib/simuladoWorkflow";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  sim: Simulado;
  isExpanded: boolean;
  onToggle: () => void;
  isCoordinator: boolean;
  isProfessor: boolean;
  onProfessorEdit: (sub: SimuladoSubject) => void;
  onRevision: (sub: SimuladoSubject) => void;
  onApprove: (subjectId: string) => void;
  onApproveAll: (sim: Simulado) => void;
  onGenerateFile: (sim: Simulado) => void;
  onGeneratePDF: (sim: Simulado) => void;
  onGenerateAnswerKey: (sim: Simulado) => void;
  onAnnouncement: (sim: Simulado) => void;
  onAnswerSheet: (sim: Simulado) => void;
  onAnswerKeyEditor: (sim: Simulado) => void;
  onEdit?: (sim: Simulado) => void;
  onDelete?: (sim: Simulado) => void;
}

export default function SimuladoCard({
  sim, isExpanded, onToggle, isCoordinator, isProfessor,
  onProfessorEdit, onRevision, onApprove, onApproveAll,
  onGenerateFile, onGeneratePDF, onGenerateAnswerKey,
  onAnnouncement, onAnswerSheet, onAnswerKeyEditor,
  onEdit = () => {}, onDelete = () => {},
}: Props) {
  const ranged = buildRanges(sim.subjects);
  const counts = sim.status_counts;
  const submitted = counts.submitted + counts.approved;
  const approved = counts.approved;
  const total = sim.subjects.length;
  const readyForApproval = canApproveAllSimuladoSubjects(sim.subjects);
  const pendingApproval = getPendingApprovalSubjects(sim.subjects);
  const hasPendingApproval = pendingApproval.length > 0;
  const allApproved = sim.workflow_status === "approved";

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-4",
          isExpanded ? "bg-muted/30" : "hover:bg-muted/10"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          aria-expanded={isExpanded}
          aria-controls={`simulado-panel-${sim.id}`}
          className="h-auto flex-1 min-w-0 justify-between rounded-none p-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-transparent"
          onClick={onToggle}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={cn(
              "p-2.5 rounded-xl flex-shrink-0",
              sim.workflow_status === "approved" ? "bg-emerald-500/10 text-emerald-600" :
              sim.workflow_status === "submitted" ? "bg-indigo-500/10 text-indigo-600" :
              sim.workflow_status === "revision_requested" ? "bg-rose-500/10 text-rose-600" :
              sim.workflow_status === "in_progress" ? "bg-blue-500/10 text-blue-600" :
              sim.workflow_status === "pending" ? "bg-amber-500/10 text-amber-600" :
              "bg-muted text-muted-foreground"
            )}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground tracking-tight truncate">{sim.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <LayoutGrid className="h-3 w-3" /> {sim.class_groups.join(", ")}
                </span>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" /> {total} disciplinas
                </span>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {sim.deadline || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
            <div className="flex flex-col items-end gap-1.5 mr-2">
              <Badge className={cn("px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusColors[sim.workflow_status])}>
                {statusLabels[sim.workflow_status]}
              </Badge>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${total > 0 ? (submitted / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                  {total > 0 ? `${submitted}/${total} entregues` : "Sem disciplinas"}
                </span>
              </div>
            </div>

            <div className="p-1.5 rounded-full hover:bg-muted transition-colors">
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </Button>

        {isCoordinator && (
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 mr-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Editar simulado ${sim.title}`}
              className="h-8 w-8 rounded-md hover:bg-card hover:text-primary transition-all"
              onClick={() => onEdit?.(sim)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir simulado ${sim.title}`}
                  className="h-8 w-8 rounded-md hover:bg-card hover:text-destructive transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir simulado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{sim.title}"? Esta ação não pode ser desfeita e todas as disciplinas e resultados associados serão removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete?.(sim)}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isExpanded && (
        <div id={`simulado-panel-${sim.id}`} className="border-t border-border">
          {isProfessor && sim.announcement && (
            <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Comunicado da Coordenação:
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-200 mt-1">{sim.announcement}</p>
            </div>
          )}

          {isCoordinator && (
            <div className="px-5 py-2.5 bg-muted/10 border-b border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Fonte: <strong className="text-foreground">{sim.format.fontFamily}</strong></span>
              <span>Tamanho: <strong className="text-foreground">{sim.format.fontSize}pt</strong></span>
              <span>Colunas: <strong className="text-foreground">{sim.format.columns}</strong></span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-5 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Disciplina</th>
                  <th className="px-3 py-2 text-left">Questões</th>
                  <th className="px-3 py-2 text-left">Professor</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {ranged.map((s, i) => (
                  <tr key={s.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-bold text-muted-foreground/60 text-xs">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-3 py-3 font-semibold text-foreground/90">{s.subject_name}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                        {s.type === "discursiva" ? "Discursiva" : `${s.rangeLabel} (${s.question_count})`}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground font-medium text-xs">{s.teacher_name || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary" className={cn("text-[10px] font-bold px-2 py-0 h-5", subjectStatusColors[s.status])}>
                        {s.status === "approved" ? `✓ ${subjectStatusLabels[s.status]}` : subjectStatusLabels[s.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {isProfessor && ["pending", "in_progress", "revision_requested"].includes(s.status) && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="gap-1.5 text-[11px] font-bold h-7 rounded-lg shadow-sm" 
                            onClick={(e) => { e.stopPropagation(); onProfessorEdit(s); }}
                          >
                            <FileEdit className="h-3 w-3" /> Elaborar
                          </Button>
                        )}
                        {isProfessor && s.status === "revision_requested" && s.revision_notes && (
                          <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md max-w-[120px] truncate" title={s.revision_notes}>⚠ Nota</span>
                        )}
                        {isCoordinator && (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Return for revision */}
                            {["submitted", "approved"].includes(s.status) && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 w-7 p-0 rounded-lg text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-400 transition-all" 
                                onClick={() => onRevision(s)} 
                                title="Devolver para ajustes"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            
                            {/* Edit/View content */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1.5 text-[11px] font-bold h-7 rounded-lg border-border hover:border-primary/50 hover:text-primary transition-all" 
                              onClick={() => onRevision(s)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Revisar
                            </Button>

                            {/* Approve */}
                            {s.status !== "approved" && (
                              <Button 
                                size="sm" 
                                className="gap-1.5 text-[11px] font-bold h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow-sm" 
                                onClick={() => onApprove(s.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 bg-muted/20 border-t border-border space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Progresso Total</span>
                <span className="text-sm font-bold text-foreground">
                  {approved}/{total} disciplinas aprovadas
                </span>
              </div>
              
              {isCoordinator && readyForApproval && hasPendingApproval && !allApproved && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm font-bold text-xs h-9 rounded-lg px-4">
                      <CheckCircle2 className="h-4 w-4" /> Aprovar enviadas ({pendingApproval.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finalizar aprovação?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As {pendingApproval.length} disciplinas enviadas serão marcadas como aprovadas e o simulado será concluído quando todas estiverem aprovadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700 rounded-lg" onClick={() => onApproveAll(sim)}>
                        Aprovar enviadas
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {isCoordinator && allApproved && (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <Flag className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Finalizado</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              {isCoordinator && (
                <>
                  <Button size="sm" className="gap-2 font-bold text-xs h-9 rounded-lg px-4 shadow-sm" onClick={() => onGenerateFile(sim)}>
                    <FileEdit className="h-4 w-4" /> Gerar Arquivo
                  </Button>
                  {sim.subjects.some((s) => s.status === "approved") && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2 font-bold text-xs h-9 rounded-lg px-4 border-border hover:border-primary/50 transition-all" onClick={() => onGeneratePDF(sim)}>
                        <Printer className="h-4 w-4" /> PDF
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 font-bold text-xs h-9 rounded-lg px-4 border-border hover:border-primary/50 transition-all" onClick={() => onGenerateAnswerKey(sim)}>
                        <FileText className="h-4 w-4" /> Gabarito
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="gap-2 font-bold text-xs h-9 rounded-lg px-4 border-border hover:border-primary/50 transition-all" onClick={() => onAnnouncement(sim)}>
                    <MessageSquare className="h-4 w-4" /> Comunicado
                  </Button>
                </>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="secondary" size="sm" className="gap-2 font-bold text-xs h-9 rounded-lg px-4 hover:bg-muted transition-all" onClick={() => onAnswerSheet(sim)}>
                  <FileSpreadsheet className="h-4 w-4" /> Folha de Respostas
                </Button>
                <Button variant="secondary" size="sm" className="gap-2 font-bold text-xs h-9 rounded-lg px-4 hover:bg-muted transition-all" onClick={() => onAnswerKeyEditor(sim)}>
                  <ClipboardList className="h-4 w-4" /> Gabarito
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}