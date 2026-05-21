import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Info, TrendingUp, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  resultsCount: number;
  studentsCount: number;
  participationRate: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
}

export function CorrectionsSummaryCards({
  resultsCount,
  studentsCount,
  participationRate,
  avgScore,
  maxScore,
  minScore,
}: Props) {
  if (resultsCount === 0) return null;

  const stats = [
    {
      label: "Participação",
      value: `${participationRate}%`,
      sub: `${resultsCount} de ${studentsCount} alunos`,
      icon: Users,
      color: "text-blue-600",
      progress: participationRate,
    },
    {
      label: "Média Geral",
      value: `${avgScore}%`,
      sub: "Média da turma",
      icon: TrendingUp,
      color: "text-primary",
      progress: avgScore,
    },
    {
      label: "Maior Nota",
      value: `${maxScore}%`,
      sub: "Melhor desempenho",
      icon: Trophy,
      color: "text-emerald-600",
      progress: maxScore,
    },
    {
      label: "Menor Nota",
      value: `${minScore}%`,
      sub: "Menor desempenho",
      icon: Info,
      color: "text-red-600",
      progress: minScore,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-4 flex flex-col h-full border-border/60 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <div className={cn("p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors", stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold font-display", stat.color)}>{stat.value}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">{stat.sub}</p>
            <Progress value={stat.progress} className="h-1.5 mt-4" />
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
