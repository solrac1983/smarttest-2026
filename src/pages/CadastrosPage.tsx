import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, GraduationCap, Layers, Clock, ClipboardList, Building2, UserCheck, Shield } from "lucide-react";
import ClassGroupsTab from "@/components/cadastros/ClassGroupsTab";
import SubjectsTab from "@/components/cadastros/SubjectsTab";
import TeachersTab from "@/components/cadastros/TeachersTab";
import SimpleListTab from "@/components/cadastros/SimpleListTab";
import StudentsTab from "@/components/cadastros/StudentsTab";
import PermissionsTab from "@/components/cadastros/PermissionsTab";
import { useCadastroCompany } from "@/hooks/useCadastroCompany";
import { TablePageSkeleton } from "@/components/PageSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";

export default function CadastrosPage() {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading, isSuperAdmin } = useCadastroCompany();

  const noCompany = !selectedCompanyId;

  if (loading) return <TablePageSkeleton rows={6} />;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Cadastros"
        badge="Administração Geral"
        icon={Shield}
        description="Gerencie turmas, disciplinas, séries, segmentos, turnos, professores e alunos com uma visão mais ampla e organizada."
        className="shadow-xl shadow-primary/10"
        actions={
          isSuperAdmin && (
            <Select value={selectedCompanyId || "none"} onValueChange={(v) => setSelectedCompanyId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-[240px] bg-white text-primary border-none shadow-md h-10 rounded-xl">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione uma empresa</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {noCompany ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Selecione uma empresa</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Para gerenciar os cadastros, selecione uma empresa no seletor acima.
          </p>
        </div>
      ) : (
        <div className="surface-elevated rounded-[2rem] p-5 md:p-6 shadow-md space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Estrutura acadêmica</p>
            <h2 className="text-2xl md:text-[2rem] font-black tracking-tight text-foreground mt-2">Organize a base institucional com mais clareza</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
              Use as abas para navegar entre os cadastros centrais da operação e aproveitar melhor a largura da página em listas, formulários e tabelas.
            </p>
          </div>

          <Tabs defaultValue="turmas" className="w-full">
            <TabsList className="mb-2 flex-wrap h-auto gap-2 bg-secondary/40 p-1.5 rounded-2xl">
            <TabsTrigger value="turmas" className="gap-1.5 rounded-xl"><Users className="h-3 w-3" />Turmas</TabsTrigger>
            <TabsTrigger value="disciplinas" className="gap-1.5 rounded-xl"><BookOpen className="h-3 w-3" />Disciplinas</TabsTrigger>
            <TabsTrigger value="series" className="gap-1.5 rounded-xl"><GraduationCap className="h-3 w-3" />Séries</TabsTrigger>
            <TabsTrigger value="segmentos" className="gap-1.5 rounded-xl"><Layers className="h-3 w-3" />Segmentos</TabsTrigger>
            <TabsTrigger value="turnos" className="gap-1.5 rounded-xl"><Clock className="h-3 w-3" />Turnos</TabsTrigger>
            <TabsTrigger value="professores" className="gap-1.5 rounded-xl"><Users className="h-3 w-3" />Professores</TabsTrigger>
            <TabsTrigger value="alunos" className="gap-1.5 rounded-xl"><UserCheck className="h-3 w-3" />Alunos</TabsTrigger>
            <TabsTrigger value="permissoes" className="gap-1.5 rounded-xl"><Shield className="h-3 w-3" />Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="turmas"><ClassGroupsTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="disciplinas"><SubjectsTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="series">
            <SimpleListTab label="Série" labelPlural="Série(s)" tableName="series" companyId={selectedCompanyId} />
          </TabsContent>
          <TabsContent value="segmentos">
            <SimpleListTab label="Segmento" labelPlural="Segmento(s)" tableName="segments" companyId={selectedCompanyId} />
          </TabsContent>
          <TabsContent value="turnos">
            <SimpleListTab label="Turno" labelPlural="Turno(s)" tableName="shifts" companyId={selectedCompanyId} />
          </TabsContent>
          <TabsContent value="professores"><TeachersTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="alunos"><StudentsTab companyId={selectedCompanyId} /></TabsContent>
          <TabsContent value="permissoes"><PermissionsTab companyId={selectedCompanyId} /></TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
