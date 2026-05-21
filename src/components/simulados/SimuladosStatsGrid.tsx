import { ClipboardList, Clock, FileText, SlidersHorizontal, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  simuladosLength: number;
  isProfessor: boolean;
  draftCount: number;
  pendingCount: number;
  inProgressCount: number;
  submittedCount: number;
  revisionRequestedCount: number;
  completeCount: number;
}

export function SimuladosStatsGrid({
  simuladosLength,
  isProfessor,
  draftCount,
  pendingCount,
  inProgressCount,
  submittedCount,
  revisionRequestedCount,
  completeCount,
}: Props) {
  const stats = [
    { label: "Total", value: simuladosLength, icon: ClipboardList, light: "bg-slate-500/10", text: "text-slate-600" },
    { label: isProfessor ? "Recebidos" : "Estruturação", value: isProfessor ? pendingCount : draftCount, icon: FileText, light: "bg-amber-500/10", text: "text-amber-600" },
    { label: "Em elaboração", value: inProgressCount, icon: Clock, light: "bg-blue-500/10", text: "text-blue-600" },
    { label: "Aguardando revisão", value: submittedCount, icon: Sparkles, light: "bg-indigo-500/10", text: "text-indigo-600" },
    { label: "Ajustes", value: revisionRequestedCount, icon: SlidersHorizontal, light: "bg-rose-500/10", text: "text-rose-600" },
    { label: "Finalizados", value: completeCount, icon: Trophy, light: "bg-emerald-500/10", text: "text-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="surface-elevated p-4 flex items-center gap-4 animate-fade-in border-none shadow-sm"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", stat.light)}>
            <stat.icon className={cn("h-6 w-6", stat.text)} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{stat.label}</p>
            <h4 className="text-2xl font-black text-foreground">{stat.value}</h4>
          </div>
        </div>
      ))}
    </div>
  );
}
