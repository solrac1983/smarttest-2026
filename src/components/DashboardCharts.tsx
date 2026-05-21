import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Sparkles, Target } from "lucide-react";

interface DashboardChartsProps {
  demands: { createdAt: string; status: string }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

function buildWeeklyData(demands: { createdAt: string; status: string }[]) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const counts = Array.from({ length: 7 }, () => ({ demandas: 0, aprovadas: 0 }));

  demands.forEach((d) => {
    const date = new Date(d.createdAt);
    if (date >= weekStart) {
      const dayIdx = date.getDay();
      counts[dayIdx].demandas++;
      if (["approved", "final"].includes(d.status)) counts[dayIdx].aprovadas++;
    }
  });

  const reordered = [...counts.slice(1), counts[0]];
  const dayLabels = [...days.slice(1), days[0]];

  return dayLabels.map((day, i) => ({
    day,
    demandas: reordered[i].demandas,
    aprovadas: reordered[i].aprovadas,
  }));
}

export default function DashboardCharts({ demands, statusDistribution }: DashboardChartsProps) {
  const weeklyData = useMemo(() => buildWeeklyData(demands), [demands]);
  const total = statusDistribution.reduce((acc, item) => acc + item.value, 0);
  const topStatus = [...statusDistribution].sort((a, b) => b.value - a.value)[0];
  const weeklyTotal = weeklyData.reduce((acc, item) => acc + item.demandas, 0);
  const weeklyApproved = weeklyData.reduce((acc, item) => acc + item.aprovadas, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 rounded-[1.75rem] border border-border/80 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Ritmo da semana
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground">Produção e aprovações em movimento</h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
                {weeklyTotal === 0
                  ? "Ainda não houve movimento relevante nesta semana. Quando novas avaliações entrarem no fluxo, este bloco mostrará o ritmo diário."
                  : `Nesta semana, ${weeklyTotal} avaliação(ões) entraram no fluxo e ${weeklyApproved} já alcançaram aprovação.`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Criadas</p>
              <p className="text-2xl font-black text-foreground mt-2">{weeklyTotal}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Aprovadas</p>
              <p className="text-2xl font-black text-foreground mt-2">{weeklyApproved}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 h-[280px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradDemandas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.26} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAprovadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={28} />
              <ReTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                  fontSize: "12px",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                }}
              />
              <Area type="monotone" dataKey="demandas" stroke="hsl(var(--primary))" fill="url(#gradDemandas)" strokeWidth={3} name="Criadas" />
              <Area type="monotone" dataKey="aprovadas" stroke="hsl(var(--success))" fill="url(#gradAprovadas)" strokeWidth={3} name="Aprovadas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/80 bg-white p-5 md:p-6 shadow-sm flex flex-col">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 w-fit">
            <Target className="h-3.5 w-3.5 text-primary" />
            Equilíbrio do fluxo
          </div>
          <h3 className="text-xl font-black tracking-tight text-foreground">Distribuição por status</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {total === 0
              ? "Sem avaliações suficientes para leitura visual neste momento."
              : `${topStatus?.name || "Sem status dominante"} concentra a maior fatia do fluxo atual.`}
          </p>
        </div>

        <div className="relative mt-4 flex-1 min-h-[240px]">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {statusDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <ReTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                  fontSize: "12px",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-border/80 bg-white px-5 py-4 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total</p>
              <p className="text-2xl font-black text-foreground mt-1">{total}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {statusDistribution.map((status) => (
            <div key={status.name} className="flex items-center gap-2 rounded-xl border border-border/70 bg-slate-50 px-3 py-2.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
              <span className="text-muted-foreground">{status.name}</span>
              <span className="ml-auto font-bold text-foreground">{status.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm text-slate-700 leading-relaxed">
          <div className="flex items-center gap-2 mb-1.5 font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Leitura rápida
          </div>
          Quando a fatia de revisão cresce, o fluxo começa a pedir mais atenção da coordenação para não virar atraso.
        </div>
      </div>
    </div>
  );
}
