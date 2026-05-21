import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Users, BookOpen, ClipboardList, Activity,
  PieChart as PieChartIcon, Loader2, GraduationCap,
} from "lucide-react";
import { useCompanyDemands } from "@/hooks/useCompanyDemands";
import { computeStats } from "@/components/reports/reportUtils";
import OverviewReport from "@/components/reports/OverviewReport";
import DemandsReport from "@/components/reports/DemandsReport";
import TeachersReport from "@/components/reports/TeachersReport";
import SubjectsReport from "@/components/reports/SubjectsReport";
import TimelineReport from "@/components/reports/TimelineReport";
import GradesReport from "@/components/reports/GradesReport";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ReportsPage() {
  const { companyDemands, loading } = useCompanyDemands();
  const stats = useMemo(() => computeStats(companyDemands), [companyDemands]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Relatórios & Análises"
        badge="Métricas e BI"
        icon={BarChart3}
        description="Uma visão executiva do desempenho institucional, do andamento das avaliações e dos sinais que merecem atenção da coordenação."
        className="shadow-xl shadow-primary/10"
      />

      <div className="surface-elevated rounded-[2rem] p-5 md:p-6 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Leitura institucional</p>
            <h2 className="text-2xl md:text-[2rem] font-black tracking-tight text-foreground mt-2">Explore tendências, gargalos e equilíbrio da operação</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
              Use as abas abaixo para navegar por uma leitura mais ampla do sistema, com mais espaço para tabelas, gráficos e indicadores comparativos.
            </p>
          </div>
        </div>

        <Tabs defaultValue="visao-geral" className="w-full">
          <TabsList className="mb-2 flex-wrap h-auto gap-2 bg-secondary/40 p-1.5 rounded-2xl">
          <TabsTrigger value="visao-geral" className="gap-1.5 rounded-xl"><PieChartIcon className="h-3 w-3" />Visão Geral</TabsTrigger>
          <TabsTrigger value="avaliacoes" className="gap-1.5 rounded-xl"><ClipboardList className="h-3 w-3" />Avaliações</TabsTrigger>
          <TabsTrigger value="professores" className="gap-1.5 rounded-xl"><Users className="h-3 w-3" />Professores</TabsTrigger>
          <TabsTrigger value="disciplinas" className="gap-1.5 rounded-xl"><BookOpen className="h-3 w-3" />Disciplinas</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 rounded-xl"><Activity className="h-3 w-3" />Timeline</TabsTrigger>
          <TabsTrigger value="desempenho" className="gap-1.5 rounded-xl"><GraduationCap className="h-3 w-3" />Desempenho</TabsTrigger>
        </TabsList>

          <TabsContent value="visao-geral"><OverviewReport stats={stats} demands={companyDemands} /></TabsContent>
          <TabsContent value="avaliacoes"><DemandsReport demands={companyDemands} /></TabsContent>
          <TabsContent value="professores"><TeachersReport demands={companyDemands} /></TabsContent>
          <TabsContent value="disciplinas"><SubjectsReport stats={stats} demands={companyDemands} /></TabsContent>
          <TabsContent value="timeline"><TimelineReport demands={companyDemands} /></TabsContent>
          <TabsContent value="desempenho"><GradesReport /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
