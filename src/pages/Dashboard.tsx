import { useMemo, lazy, Suspense } from "react";
import { examTypeLabels } from "@/data/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  Plus,
  MessageCircle,
  BookOpen,
  Users,
  BarChart3,
  Library,
  ArrowRight,
  TrendingUp,
  Calendar,
  User,
  Zap,
  Target,
  GraduationCap,
  CheckCircle2,
  FileText,
  Award,
  PenTool,
  Layers,
  Edit3,
  Sparkles,
  TimerReset,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const LazyCharts = lazy(() => import("@/components/DashboardCharts"));

function getDailyTip(dayIndex: number) {
  const tips = [
    { title: "IA ao seu lado", desc: "Use a IA para acelerar a criação de questões e ganhar tempo para revisar o que realmente importa." },
    { title: "Fluxo mais leve", desc: "Organize os prazos da semana primeiro. O painel fica mais útil quando você ataca o que vence antes." },
    { title: "Ritmo de revisão", desc: "Uma revisão curta e frequente evita gargalos maiores perto do fechamento das avaliações." },
    { title: "Banco de Questões", desc: "Reaproveitar boas questões encurta o tempo de preparação e melhora a consistência das provas." },
    { title: "Humanize a leitura", desc: "Observe os itens atrasados como prioridades de cuidado, não só como números do sistema." },
    { title: "Dia produtivo", desc: "Uma prova bem estruturada começa com uma visão clara de prioridades e uma boa cadência de revisão." },
    { title: "Menos atrito", desc: "Quando o painel mostra o essencial com clareza, a equipe decide melhor e mais rápido." },
  ];

  return tips[dayIndex % tips.length];
}

function getRoleLabel(role?: string | null) {
  return {
    professor: "Professor(a)",
    coordinator: "Coordenador(a)",
    admin: "Administrador(a)",
    super_admin: "Super Admin",
  }[role || ""] || "Usuário";
}

function UserIdentityCard({ name, role }: { name: string; role?: string | null }) {
  const initials = (name || "Usuário")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] p-4 md:p-5 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_35%)] pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))] text-sm font-black tracking-[0.24em] text-white shadow-inner border border-white/20">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/65">Seu espaço hoje</p>
          <h3 className="truncate text-base font-black text-white mt-1">{name}</h3>
          <p className="text-xs font-medium text-white/75 mt-1">{getRoleLabel(role)}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: React.ElementType; tone?: "default" | "warning" | "success" | "danger"; }) {
  const toneClasses = {
    default: "bg-white/92 text-slate-900 border-white/30 shadow-sm",
    warning: "bg-amber-100/95 text-amber-950 border-amber-300/45 shadow-sm",
    success: "bg-emerald-100/95 text-emerald-950 border-emerald-300/45 shadow-sm",
    danger: "bg-rose-100/95 text-rose-950 border-rose-300/45 shadow-sm",
  }[tone];

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 backdrop-blur-sm", toneClasses)}>
      <div className="rounded-xl bg-background/70 p-2 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-75">{label}</p>
        <p className="text-sm font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  featured = false,
  onClick,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  tone?: "default" | "info" | "warning" | "success" | "danger";
  featured?: boolean;
  onClick?: () => void;
}) {
  const toneClasses = {
    default: "from-card to-card/90 text-foreground border-border/60",
    info: "from-info/8 via-card to-card text-foreground border-info/20",
    warning: "from-warning/10 via-card to-card text-foreground border-warning/20",
    success: "from-success/10 via-card to-card text-foreground border-success/20",
    danger: "from-destructive/10 via-card to-card text-foreground border-destructive/20",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br p-5 md:p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        featured ? "min-h-[220px] md:min-h-[250px]" : "min-h-[168px]",
        toneClasses,
      )}
    >
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
            <p className={cn("font-black tracking-tight text-foreground mt-3", featured ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl")}>
              {value}
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/70 p-3 shadow-sm">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <p className={cn("font-medium text-muted-foreground", featured ? "text-sm leading-relaxed max-w-sm" : "text-xs leading-relaxed")}>
          {description}
        </p>
      </div>
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {eyebrow}
        </div>
        <div>
          <h2 className="text-2xl md:text-[2rem] font-black tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">{description}</p>
        </div>
      </div>
      {action && <div className="self-start md:self-auto">{action}</div>}
    </div>
  );
}

function ActivityItem({
  demand,
  isProfessor,
  onClick,
}: {
  demand: {
    id: string;
    subjectName: string;
    teacherName: string;
    deadline: string;
    status: string;
    examType: string;
  };
  isProfessor: boolean;
  onClick: () => void;
}) {
  const isOverdue = new Date(demand.deadline) < new Date() && !["approved", "final"].includes(demand.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-[1.5rem] border border-border/60 bg-background/80 px-4 py-4 text-left transition-all duration-300 hover:border-primary/20 hover:bg-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className={cn(
        "mt-0.5 h-11 w-11 rounded-2xl border flex items-center justify-center text-[11px] font-black tracking-wider flex-shrink-0",
        isOverdue ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/8 border-primary/15 text-primary"
      )}>
        {demand.subjectName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[280px]">
            {demand.subjectName}
          </p>
          <StatusBadge status={demand.status} />
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
              <AlertTriangle className="h-3 w-3" /> Atrasada
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
          {!isProfessor && (
            <>
              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {demand.teacherName}</span>
              <span className="text-border">•</span>
            </>
          )}
          <span>{examTypeLabels[demand.examType]}</span>
          <span className="text-border">•</span>
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(demand.deadline).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
    </button>
  );
}

function PriorityItem({
  title,
  subtitle,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  tone: "danger" | "warning" | "default";
  onClick?: () => void;
}) {
  const toneClasses = {
    danger: "border-destructive/20 bg-destructive/5 text-destructive",
    warning: "border-warning/20 bg-warning/5 text-warning",
    default: "border-border/60 bg-background/80 text-foreground",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-left transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        toneClasses,
      )}
    >
      <p className="text-sm font-bold leading-tight">{title}</p>
      <p className="text-xs mt-1 opacity-80 leading-relaxed">{subtitle}</p>
    </button>
  );
}

function QuickActionCard({
  label,
  description,
  icon: Icon,
  href,
  tone,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  tone: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="group flex items-start gap-3 rounded-[1.5rem] border border-border/60 bg-background/80 p-4 text-left transition-all duration-300 hover:border-primary/20 hover:bg-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className={cn("rounded-2xl p-3 shadow-sm", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, role, user } = useAuth();
  const { companyDemands: baseDemands, loading: demandsLoading } = useCompanyDemands();

  const isProfessor = role === "professor";
  const isAdmin = role === "admin" || role === "coordinator" || role === "super_admin";

  const { data: extraStats } = useQuery({
    queryKey: ["dashboard-extra-stats"],
    queryFn: async () => {
      const [studentsRes, teachersRes, simuladosRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("simulados").select("id, status", { count: "exact" }),
      ]);
      const simulados = simuladosRes.data || [];
      const activeSimulados = simulados.filter((s) => !["draft"].includes(s.status)).length;
      return {
        studentCount: studentsRes.count || 0,
        teacherCount: teachersRes.count || 0,
        simuladoCount: simuladosRes.count || 0,
        activeSimulados,
      };
    },
    staleTime: 60_000,
    enabled: isAdmin,
  });

  const { data: professorData } = useQuery({
    queryKey: ["dashboard-professor-stats", user?.id],
    queryFn: async () => {
      const email = profile?.email || "";

      const [teacherRes, standaloneRes, questionsRes] = await Promise.all([
        supabase.from("teachers").select("id, name, subjects, class_groups").eq("email", email).maybeSingle(),
        supabase.from("standalone_exams").select("id, title, status, updated_at").eq("user_id", user!.id).order("updated_at", { ascending: false }).limit(5),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("author_id", user!.id),
      ]);

      return {
        teacher: teacherRes.data,
        subjects: (teacherRes.data?.subjects as string[]) || [],
        classGroups: (teacherRes.data?.class_groups as string[]) || [],
        standaloneExams: standaloneRes.data || [],
        questionCount: questionsRes.count || 0,
      };
    },
    staleTime: 60_000,
    enabled: isProfessor && !!user?.id,
  });

  const totalDemands = baseDemands.length;
  const pending = baseDemands.filter((d) => ["pending", "in_progress"].includes(d.status)).length;
  const submitted = baseDemands.filter((d) => ["submitted", "review"].includes(d.status)).length;
  const approved = baseDemands.filter((d) => ["approved", "final"].includes(d.status)).length;
  const overdue = baseDemands.filter(
    (d) => new Date(d.deadline) < new Date() && !["approved", "final"].includes(d.status)
  ).length;
  const approvalRate = totalDemands > 0 ? Math.round((approved / totalDemands) * 100) : 0;

  const recentDemands = useMemo(
    () =>
      [...baseDemands]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [baseDemands]
  );

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);
    return baseDemands
      .filter((d) => !["approved", "final"].includes(d.status))
      .filter((d) => new Date(d.deadline) <= weekFromNow)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [baseDemands]);

  const statusDistribution = useMemo(
    () => [
      { name: "Pendentes", value: pending, color: "hsl(var(--muted-foreground))" },
      { name: "Em revisão", value: submitted, color: "hsl(var(--info))" },
      { name: "Aprovadas", value: approved, color: "hsl(var(--success))" },
      { name: "Atrasadas", value: overdue, color: "hsl(var(--destructive))" },
    ],
    [pending, submitted, approved, overdue]
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.full_name?.split(" ")[0] || "Equipe";
  const todayTip = getDailyTip(new Date().getDay());
  const focusValue = isProfessor ? pending + overdue : pending + submitted + overdue;
  const focusDescription = isProfessor
    ? overdue > 0
      ? `Você tem ${overdue} entrega(s) fora do prazo e ${pending} avaliação(ões) em andamento.`
      : `Seu fluxo está saudável. Há ${pending} avaliação(ões) para avançar hoje.`
    : overdue > 0
      ? `${pending} avaliação(ões) seguem com os professores, ${submitted} aguardam revisão e ${overdue} exigem atenção imediata.`
      : `${pending} avaliação(ões) estão em produção e ${submitted} aguardam aprovação da coordenação.`;

  if (demandsLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6">
        <section className="2xl:col-span-8 relative overflow-hidden rounded-[2.25rem] border border-slate-800/40 bg-[linear-gradient(145deg,#0f172a,#162033_52%,#1b2b43)] p-6 md:p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.26),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_40%)] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="absolute right-[-8%] top-[-18%] h-64 w-64 rounded-full border border-white/10 opacity-30" />
          <div className="absolute left-[42%] top-[18%] h-28 w-28 rounded-full bg-white/6 blur-2xl" />
          <div className="relative space-y-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-5 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur-md shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  Painel de hoje
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-[3.6rem] font-black tracking-[-0.04em] text-white leading-[0.95]">
                    {greeting}, {firstName}.
                  </h1>
                  <p className="text-sm md:text-[15px] leading-relaxed text-white/88 max-w-2xl">
                    {isProfessor
                      ? "Seu espaço foi pensado para organizar o que precisa ser elaborado, acompanhar o ritmo das turmas e reduzir atrito no preparo das avaliações."
                      : "Aqui você acompanha o pulso da operação acadêmica, identifica gargalos cedo e enxerga rapidamente o que precisa de ação da coordenação."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate(isProfessor ? "/provas/editor" : "/demandas/nova")}
                    className="h-12 rounded-2xl px-6 gap-2 font-bold bg-white text-slate-900 hover:bg-white/92 shadow-[0_18px_40px_rgba(255,255,255,0.12)]"
                  >
                    <Plus className="h-4 w-4" />
                    {isProfessor ? "Nova prova" : "Nova avaliação"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(isProfessor ? "/banco-questoes" : "/demandas")}
                    className="h-12 rounded-2xl px-6 gap-2 font-bold border-white/14 bg-white/6 text-white hover:bg-white/12 hover:text-white backdrop-blur-md"
                  >
                    {isProfessor ? <Library className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                    {isProfessor ? "Abrir banco de questões" : "Acompanhar fluxo"}
                  </Button>
                </div>
              </div>

              <div className="w-full lg:w-[320px]">
                <UserIdentityCard name={profile?.full_name || "Equipe SmartTest"} role={role} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <SummaryChip
                label="Foco imediato"
                value={focusValue === 0 ? "Tudo sob controle" : `${focusValue} item(ns)`}
                icon={TimerReset}
                tone={overdue > 0 ? "danger" : pending > 0 || submitted > 0 ? "warning" : "success"}
              />
              <SummaryChip
                label="Aprovação"
                value={`${approvalRate}% da base concluída`}
                icon={ShieldCheck}
                tone={approvalRate >= 70 ? "success" : "default"}
              />
              <SummaryChip
                label="Contexto do dia"
                value={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                icon={Calendar}
              />
            </div>

            <div className="rounded-[1.9rem] border border-white/18 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.07))] px-4 py-4 md:px-5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Leitura rápida do momento</p>
                  <p className="text-sm font-semibold text-white leading-relaxed drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">{focusDescription}</p>
                </div>
                <div className="rounded-2xl border border-white/14 bg-slate-950/20 px-3.5 py-2.5 text-xs font-medium text-white/88 max-w-md backdrop-blur-md shadow-sm">
                  <span className="font-black text-amber-300 uppercase tracking-[0.2em] text-[10px] mr-2">{todayTip.title}</span>
                  {todayTip.desc}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="2xl:col-span-4 space-y-6">
          <div className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Prioridades da semana</p>
              <h2 className="text-2xl font-black tracking-tight text-foreground mt-2">O que merece atenção agora</h2>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-success/50" />
                <p className="text-sm font-semibold text-foreground">Nenhum prazo crítico</p>
                <p className="text-xs mt-1 leading-relaxed">O fluxo está estável para os próximos dias.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.slice(0, 3).map((d) => {
                  const diffDays = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const tone = diffDays < 0 ? "danger" : diffDays <= 2 ? "warning" : "default";
                  return (
                    <PriorityItem
                      key={d.id}
                      title={d.subjectName}
                      subtitle={diffDays < 0 ? `${Math.abs(diffDays)} dia(s) de atraso • ${d.teacherName}` : diffDays === 0 ? `Vence hoje • ${d.teacherName}` : `Entrega em ${diffDays} dia(s) • ${d.teacherName}`}
                      tone={tone}
                      onClick={() => navigate(`/demandas/${d.id}`)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {isProfessor && professorData && (
            <div className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Seu contexto</p>
                <h3 className="text-xl font-black tracking-tight text-foreground mt-2">Visão de ensino</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.25rem] border border-border/60 bg-background/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Turmas</p>
                  <p className="text-2xl font-black text-foreground mt-2">{professorData.classGroups.length}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/60 bg-background/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Questões</p>
                  <p className="text-2xl font-black text-foreground mt-2">{professorData.questionCount}</p>
                </div>
              </div>
              {professorData.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {professorData.subjects.map((subject) => (
                    <span key={subject} className="rounded-xl border border-border/60 bg-background/80 px-3 py-1.5 text-[11px] font-semibold text-foreground">
                      {subject}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {isAdmin && extraStats && (
            <div className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Pulso institucional</p>
                <h3 className="text-xl font-black tracking-tight text-foreground mt-2">Resumo do sistema</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.25rem] border border-border/60 bg-background/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Alunos</p>
                  <p className="text-2xl font-black text-foreground mt-2">{extraStats.studentCount}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/60 bg-background/80 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Professores</p>
                  <p className="text-2xl font-black text-foreground mt-2">{extraStats.teacherCount}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/60 bg-background/80 p-4 col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Simulados ativos</p>
                  <p className="text-2xl font-black text-foreground mt-2">{extraStats.activeSimulados}</p>
                  <p className="text-xs text-muted-foreground mt-1">de {extraStats.simuladoCount} simulados registrados</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <section className="space-y-4">
        <SectionHeader
          icon={BarChart3}
          eyebrow="Visão geral"
          title="O que o painel está dizendo"
          description="Uma leitura rápida da operação para orientar a sua próxima decisão."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="md:col-span-2 xl:col-span-2">
            <OverviewCard
              label="Precisando de atenção"
              value={focusValue}
              description={focusDescription}
              icon={AlertTriangle}
              tone={overdue > 0 ? "danger" : pending > 0 || submitted > 0 ? "warning" : "success"}
              featured
              onClick={() => navigate("/demandas")}
            />
          </div>
          {isProfessor ? (
            <>
              <OverviewCard label="Em elaboração" value={pending} description="Avaliações atribuídas em produção no momento." icon={PenTool} tone="info" onClick={() => navigate("/demandas")} />
              <OverviewCard label="Questões autorais" value={professorData?.questionCount ?? 0} description="Banco pessoal construído para acelerar novas provas." icon={Layers} tone="default" onClick={() => navigate("/banco-questoes")} />
            </>
          ) : (
            <>
              <OverviewCard label="Aguardando revisão" value={submitted} description="Itens já enviados pelos professores e prontos para análise." icon={ShieldCheck} tone="info" onClick={() => navigate("/demandas")} />
              <OverviewCard label="Taxa de aprovação" value={`${approvalRate}%`} description="Percentual do fluxo já finalizado com aprovação." icon={Award} tone="success" onClick={() => navigate("/demandas")} />
            </>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <section className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-5">
            <SectionHeader
              icon={TrendingUp}
              eyebrow="Momento analítico"
              title="Ritmo, equilíbrio e andamento"
              description="Leitura visual dos últimos dias para identificar tração, acúmulo e estabilidade do fluxo."
            />
            <Suspense
              fallback={
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <Skeleton className="xl:col-span-2 h-[320px] rounded-[1.75rem]" />
                  <Skeleton className="h-[320px] rounded-[1.75rem]" />
                </div>
              }
            >
              <LazyCharts demands={baseDemands} statusDistribution={statusDistribution} />
            </Suspense>
          </section>

          <section className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-5">
            <SectionHeader
              icon={Clock}
              eyebrow="Movimento recente"
              title="O que mudou por último"
              description="Uma linha do tempo das avaliações mais recentes para facilitar acompanhamento sem esforço."
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate("/demandas")} className="gap-1 text-xs font-bold">
                  Ver fluxo completo <ArrowRight className="h-3 w-3" />
                </Button>
              }
            />
            {recentDemands.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-border/60 bg-background/80 p-10 text-center text-muted-foreground">
                <Clock className="h-9 w-9 mx-auto mb-3 text-muted-foreground/35" />
                <p className="text-base font-bold text-foreground">Nenhuma movimentação recente</p>
                <p className="text-sm mt-2 max-w-md mx-auto leading-relaxed">
                  {isProfessor
                    ? "Quando você começar a elaborar ou enviar avaliações, elas aparecerão aqui como um histórico vivo da sua rotina."
                    : "Assim que houver novas avaliações em andamento ou revisões concluídas, o feed mostrará a operação mais recente."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDemands.map((demand) => (
                  <ActivityItem
                    key={demand.id}
                    demand={demand}
                    isProfessor={isProfessor}
                    onClick={() => navigate(`/demandas/${demand.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="xl:col-span-4 space-y-6">
          <section className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-4">
            <SectionHeader
              icon={Zap}
              eyebrow="Ações rápidas"
              title="Atalhos úteis"
              description="O que você provavelmente vai querer abrir em seguida."
            />
            <div className="grid grid-cols-1 gap-3">
              <QuickActionCard label="Avaliações" description={isProfessor ? "Continuar o que está em produção" : "Acompanhar o fluxo completo"} icon={ClipboardList} href="/demandas" tone="bg-primary/10 text-primary" />
              <QuickActionCard label="Banco de Questões" description="Buscar, criar e reutilizar conteúdo" icon={Library} href="/banco-questoes" tone="bg-info/10 text-info" />
              <QuickActionCard label="Chat" description="Falar com a equipe sem sair do fluxo" icon={MessageCircle} href="/chat" tone="bg-success/10 text-success" />
              {isAdmin && <QuickActionCard label="Relatórios" description="Ler tendências e desempenho da operação" icon={BarChart3} href="/relatorios" tone="bg-warning/10 text-warning" />}
              {isProfessor && <QuickActionCard label="Minhas Turmas" description="Abrir seu contexto de sala e acompanhamento" icon={Users} href="/minhas-turmas" tone="bg-destructive/10 text-destructive" />}
              {!isProfessor && <QuickActionCard label="Simulados" description="Acompanhar simulados ativos e seus desdobramentos" icon={Target} href="/simulados" tone="bg-accent/10 text-accent" />}
            </div>
          </section>

          {isProfessor && professorData?.standaloneExams?.length ? (
            <section className="surface-elevated rounded-[2rem] p-5 md:p-6 space-y-4">
              <SectionHeader
                icon={Edit3}
                eyebrow="Produção pessoal"
                title="Provas avulsas recentes"
                description="Os últimos materiais criados fora de demandas formais."
              />
              <div className="space-y-3">
                {professorData.standaloneExams.map((exam) => (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => navigate(`/provas/editor?id=${exam.id}`)}
                    className="group flex w-full items-center gap-3 rounded-[1.5rem] border border-border/60 bg-background/80 p-4 text-left transition-all duration-300 hover:border-primary/20 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-warning/10 text-warning border border-warning/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{exam.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">Atualizado em {new Date(exam.updated_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <StatusBadge status={exam.status} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
