import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lightbulb, TrendingUp, TrendingDown, Users, ShieldAlert, BookOpen, Target, CheckCircle2 } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { StudentMetrics } from "@/lib/performanceMetrics";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const STATUS_COLORS: Record<string, string> = {
  proficiente: "hsl(var(--success))",
  atencao_continua: "hsl(var(--warning))",
  foco_prioritario: "hsl(var(--destructive))",
  evolucao_constante: "hsl(var(--info))",
};

const STATUS_LABELS: Record<string, string> = {
  proficiente: "Proficiente",
  atencao_continua: "Atenção Contínua",
  foco_prioritario: "Foco Prioritário",
  evolucao_constante: "Evolução Constante",
};

interface Props {
  students: StudentMetrics[];
  globalAverage: number;
  averageFrequency: number;
}

function DashboardInsights({ students, globalAverage, averageFrequency }: Props) {
  // Status distribution
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = { proficiente: 0, atencao_continua: 0, foco_prioritario: 0, evolucao_constante: 0 };
    for (const s of students) counts[s.status]++;
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: STATUS_LABELS[k], value: v, key: k }));
  }, [students]);

  // Grade distribution histogram
  const gradeDistribution = useMemo(() => {
    const ranges = [
      { range: "0-20%", min: 0, max: 20, count: 0 },
      { range: "21-40%", min: 21, max: 40, count: 0 },
      { range: "41-60%", min: 41, max: 60, count: 0 },
      { range: "61-80%", min: 61, max: 80, count: 0 },
      { range: "81-100%", min: 81, max: 100, count: 0 },
    ];
    for (const s of students) {
      const r = ranges.find(r => s.average >= r.min && s.average <= r.max);
      if (r) r.count++;
    }
    return ranges;
  }, [students]);

  // Actionable insights + recommendations
  const insights = useMemo(() => {
    const list: { icon: React.ElementType; text: string; recommendation: string; type: "warning" | "success" | "info" | "danger" }[] = [];

    const riskStudents = students.filter(s => s.status === "foco_prioritario");
    const lowFreqStudents = students.filter(s => s.frequency < 75 && s.totalAttendance > 0);
    const improvingCount = students.filter(s => s.evolution > 5).length;
    const decliningStudents = students.filter(s => s.evolution < -5);
    const excellentCount = students.filter(s => s.average >= 85).length;

    // Identify weakest subjects across all students
    const subjectAvgs: Record<string, { sum: number; count: number }> = {};
    for (const s of students) {
      for (const sub of s.subjectScores) {
        if (!subjectAvgs[sub.name]) subjectAvgs[sub.name] = { sum: 0, count: 0 };
        subjectAvgs[sub.name].sum += sub.average;
        subjectAvgs[sub.name].count++;
      }
    }
    const subjectRanking = Object.entries(subjectAvgs)
      .map(([name, d]) => ({ name, avg: Math.round(d.sum / d.count) }))
      .sort((a, b) => a.avg - b.avg);

    if (riskStudents.length > 0) {
      const names = riskStudents.slice(0, 3).map(s => s.name.split(" ")[0]).join(", ");
      list.push({
        icon: ShieldAlert,
        text: `${riskStudents.length} aluno(s) com Foco Prioritário: ${names}${riskStudents.length > 3 ? "..." : ""}`,
        recommendation: "Recomendamos uma abordagem acolhedora e plano de recuperação personalizado. É fundamental envolver a família de forma positiva.",
        type: "danger",
      });
    }

    if (lowFreqStudents.length > 0) {
      list.push({
        icon: AlertTriangle,
        text: `${lowFreqStudents.length} aluno(s) com frequência abaixo da meta (75%)`,
        recommendation: "A presença é o primeiro passo para o sucesso. Vamos investigar com empatia os motivos das faltas e engajar a família para criar uma rotina atrativa.",
        type: "warning",
      });
    }

    if (subjectRanking.length > 0 && subjectRanking[0].avg < 60) {
      const weak = subjectRanking.slice(0, 2).filter(s => s.avg < 60);
      if (weak.length > 0) {
        list.push({
          icon: BookOpen,
          text: `Oportunidade de melhoria em: ${weak.map(s => `${s.name} (${s.avg}%)`).join(", ")}`,
          recommendation: "Que tal gamificar o ensino nestas disciplinas? Introduzir projetos práticos ou aprendizado baseado em problemas pode aumentar o engajamento.",
          type: "warning",
        });
      }
    }

    if (decliningStudents.length > 0) {
      list.push({
        icon: TrendingDown,
        text: `${decliningStudents.length} aluno(s) com oscilação no desempenho`,
        recommendation: "Oscilações são normais, mas merecem cuidado. Um bate-papo de 5 minutos para entender como o aluno está se sentindo pode fazer toda a diferença.",
        type: "warning",
      });
    }

    if (improvingCount > 0) {
      list.push({
        icon: TrendingUp,
        text: `${improvingCount} aluno(s) em Evolução Constante`,
        recommendation: "Celebre essas conquistas! Envie um recado positivo para os pais. O reconhecimento é o combustível do aprendizado contínuo.",
        type: "success",
      });
    }

    if (excellentCount > 0) {
      list.push({
        icon: Lightbulb,
        text: `${excellentCount} aluno(s) com desempenho Proficiente Extraordinário`,
        recommendation: "Estes alunos precisam de novos desafios para não se desmotivarem. Que tal convidá-los a liderar projetos ou ser mentores de colegas?",
        type: "info",
      });
    }

    if (globalAverage >= 70) {
      list.push({
        icon: CheckCircle2,
        text: `Excelente! A média global da escola (${globalAverage}%) demonstra domínio das competências.`,
        recommendation: "A estratégia atual é um sucesso. O próximo passo é consolidar a cultura de excelência e inovar nas avaliações formativas.",
        type: "success",
      });
    } else if (globalAverage < 60) {
      list.push({
        icon: Target,
        text: `Média global de ${globalAverage}% indica a necessidade de um esforço coletivo.`,
        recommendation: "Momento ideal para um planejamento estratégico conjunto. Foque em micro-revisões contínuas e aprendizagem ativa.",
        type: "danger",
      });
    }

    return list;
  }, [students, globalAverage]);

  const typeColors = {
    danger: "border-destructive/30 bg-destructive/5",
    warning: "border-warning/30 bg-warning/5",
    success: "border-success/30 bg-success/5",
    info: "border-info/30 bg-info/5",
  };

  const typeTextColors = {
    danger: "text-destructive",
    warning: "text-warning",
    success: "text-success",
    info: "text-info",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusDist.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDist.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Alunos"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 shrink-0">
                {statusDist.map(d => (
                  <div key={d.key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.key] }} />
                    <span className="text-[11px] text-muted-foreground">{d.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                      {d.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
              Sem dados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Distribution Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-info" /> Distribuição de Médias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gradeDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Alunos"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {gradeDistribution.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.min >= 81 ? "hsl(var(--success))" :
                      entry.min >= 61 ? "hsl(var(--info))" :
                      entry.min >= 41 ? "hsl(var(--warning))" :
                      "hsl(var(--destructive))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Actionable Insights & Recommendations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" /> Alertas e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {insights.map((ins, i) => (
                <div key={i} className={`p-2.5 rounded-lg border ${typeColors[ins.type]}`}>
                  <div className={`flex items-start gap-2 text-xs font-medium ${typeTextColors[ins.type]}`}>
                    <ins.icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{ins.text}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 ml-5 leading-relaxed">
                    💡 <strong>Sugestão:</strong> {ins.recommendation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
              Nenhum alerta no momento
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(DashboardInsights);
