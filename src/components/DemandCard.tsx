import { Demand } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { examTypeLabels } from "@/data/constants";
import { Clock, User, FileText, Pencil, ArrowRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface DemandCardProps {
  demand: Demand;
  onClick?: () => void;
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

function getCountdown(deadline: string): string | null {
  const now = new Date();
  const target = new Date(deadline);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h restantes`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${mins}min`;
}

export function DemandCard({ demand, onClick }: DemandCardProps) {
  const overdue = isOverdue(demand.deadline) && !["approved", "final"].includes(demand.status);
  const { role } = useAuth();
  const navigate = useNavigate();
  const isProfessor = role === "professor";
  const isAdmin = role === "admin" || role === "coordinator" || role === "super_admin";
  const canEditAsProfessor = isProfessor && ["in_progress", "revision_requested"].includes(demand.status);
  const canEdit = isAdmin || canEditAsProfessor;

  const countdown = useMemo(() => {
    if (["approved", "final"].includes(demand.status)) return null;
    return getCountdown(demand.deadline);
  }, [demand.deadline, demand.status]);

  return (
    <div
      className={cn(
        "surface-elevated w-full p-0 overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-lg group animate-fade-in border-none",
        overdue && "ring-1 ring-destructive/20"
      )}
    >
      <div className="flex items-start gap-4 p-5">
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className="h-auto flex-1 min-w-0 justify-start rounded-none p-0 text-left hover:bg-transparent"
        >
          <div className="w-full">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                {examTypeLabels[demand.examType]}
              </span>
              <StatusBadge status={demand.status} className="shadow-none border-none px-2 py-0.5" />
            </div>

            <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors mb-2">
              {demand.subjectName}
            </h3>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 bg-secondary/30 w-fit px-2 py-1 rounded-md">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium truncate">{demand.classGroups.join(", ")}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Professor</p>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-3 w-3 text-secondary-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate">{demand.teacherName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Prazo de Entrega</p>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center",
                    overdue ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"
                  )}>
                    <Clock className="h-3 w-3" />
                  </div>
                  <span className={cn("text-sm font-semibold", overdue ? "text-destructive" : "text-foreground")}>
                    {new Date(demand.deadline).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                  </span>
                  {countdown && !overdue && (
                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded ml-auto">
                      {countdown}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Button>

        {canEdit && (
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Editar avaliação de ${demand.subjectName}`}
              className="rounded-full hover:bg-primary hover:text-white"
              onClick={() => {
                navigate(`/provas/editor/${demand.id}`);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className="h-auto w-full justify-between rounded-none bg-secondary/20 px-5 py-2 text-[11px] font-bold text-muted-foreground hover:bg-secondary/40"
      >
        <span className="flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> Ver detalhes
        </span>
        <ArrowRight className="h-3 w-3 transition-all group-hover:translate-x-1 group-hover:text-primary" />
      </Button>
    </div>
  );
}
