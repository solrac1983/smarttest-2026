import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PieChart } from "lucide-react";
import { motion } from "framer-motion";

interface SubjectAverage {
  name: string;
  average: number;
}

interface Props {
  subjectAverages: SubjectAverage[];
}

export function CorrectionsSubjectAverages({ subjectAverages }: Props) {
  if (subjectAverages.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="p-5 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-primary">Desempenho Médio por Disciplina</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjectAverages.map((subject) => (
            <div key={subject.name} className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="truncate max-w-[140px]" title={subject.name}>{subject.name}</span>
                <span className={cn(
                  subject.average >= 70 ? "text-emerald-600" : subject.average >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {subject.average}%
                </span>
              </div>
              <Progress value={subject.average} className="h-1.5" />
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
