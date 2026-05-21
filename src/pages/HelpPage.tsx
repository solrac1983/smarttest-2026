import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Search, BookOpen, LayoutDashboard, ClipboardList, NotebookPen, Library, Users,
  BarChart3, FileCheck, Award, CalendarCheck, MessageCircle, Crown, DollarSign,
  TrendingUp, GraduationCap, FileText, Lightbulb, ChevronRight, Sparkles,
  HelpCircle, BookMarked, Layers,
} from "lucide-react";
import { HelpChatbot } from "@/components/help/HelpChatbot";

interface GuideStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

interface FeatureGuide {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  steps: GuideStep[];
  proTips: string[];
  roles: string[];
}

const allGuides: FeatureGuide[] = [
  {
    id: "dashboard",
    title: "Painel",
    icon: LayoutDashboard,
    description: "Leitura rápida da operação com foco em pendências, aprovações e atalhos das rotas principais.",
    roles: ["super_admin", "admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Abra o Painel", description: "Use a opção 'Painel' no menu lateral para acessar a visão geral do sistema." },
      { step: 2, title: "Leia os cards iniciais", description: "Os blocos do topo mostram volume de trabalho, aprovações, alunos, professores e simulados ativos." },
      { step: 3, title: "Use os atalhos", description: "Os cards e listas laterais levam diretamente para Avaliações, Simulados, Chat, Relatórios e outras áreas." },
      { step: 4, title: "Monitore o que exige ação", description: "Itens destacados como atrasados, aguardando revisão ou críticos devem ser tratados primeiro." },
    ],
    proTips: [
      "O painel é o melhor ponto de partida para saber o que precisa de ação no dia.",
      "Use os atalhos laterais e os cards clicáveis para navegar mais rápido entre os módulos.",
    ],
  },
  {
    id: "demands",
    title: "Avaliações",
    icon: ClipboardList,
    description: "Criação, elaboração, revisão e aprovação de avaliações por professor e coordenação.",
    roles: ["admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Criar nova avaliação", description: "Na área de Avaliações, use 'Nova Avaliação' para definir professor, disciplina, turmas, prazo e tipo da prova." },
      { step: 2, title: "Acompanhar o workflow", description: "O fluxo passa por Pendente, Em andamento, Enviada, Ajustes solicitados, Aprovada e Finalizada." },
      { step: 3, title: "Editar no editor", description: "Professores acessam a prova diretamente pelo editor para elaborar, revisar e reenviar." },
      { step: 4, title: "Revisar e aprovar", description: "Coordenação e administração podem revisar a prova, solicitar ajustes e aprovar o material." },
    ],
    proTips: [
      "Use os comentários do editor para registrar observações sem sair da prova.",
      "As configurações de impressão podem ser definidas dentro da demanda antes da aprovação final.",
    ],
  },
  {
    id: "exam-editor",
    title: "Editor de Provas",
    icon: FileText,
    description: "Editor avançado para provas, simulados e documentos, com exportação e recursos visuais ricos.",
    roles: ["admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Abra uma prova ou simulado", description: "Acesse o editor por uma demanda, por um simulado ou por uma avaliação avulsa." },
      { step: 2, title: "Use o ribbon", description: "As abas do ribbon organizam formatação, inserção, layout, gabarito, exportação e recursos especiais." },
      { step: 3, title: "Insira conteúdo avançado", description: "O editor suporta tabelas, imagens, numeração, cabeçalhos, rodapés, fórmulas matemáticas e gabarito." },
      { step: 4, title: "Revise o layout", description: "Confira margens, colunas, páginas e espaçamento antes de exportar ou imprimir." },
      { step: 5, title: "Exporte", description: "Use as opções de PDF, DOCX e impressão conforme o fluxo do documento." },
    ],
    proTips: [
      "Para fórmulas matemáticas, use sintaxe LaTeX entre `$...$` ou `$$...$$`.",
      "O editor já preserva o fluxo de revisão entre professor e coordenação nas provas vinculadas.",
      "Reveja o resultado visual antes de exportar para garantir margens e paginação corretas.",
    ],
  },
  {
    id: "simulados",
    title: "Simulados",
    icon: NotebookPen,
    description: "Gestão completa de simulados multidisciplinares: criação, atribuição, aprovação, gabarito e correção.",
    roles: ["admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Criar o simulado", description: "Defina título, turmas, prazo, data de aplicação e a estrutura das disciplinas." },
      { step: 2, title: "Atribuir professores", description: "Cada disciplina pode ser atribuída a um professor específico para elaboração no editor." },
      { step: 3, title: "Acompanhar o workflow", description: "O sistema mostra Estruturação, Aguardando elaboração, Em elaboração, Aguardando revisão, Ajustes solicitados e Finalizado." },
      { step: 4, title: "Consolidar gabarito", description: "Após a aprovação das disciplinas, use o editor de gabarito para consolidar as respostas oficiais." },
      { step: 5, title: "Corrigir e analisar", description: "Na aba de Correções, selecione um simulado apto, processe resultados e acompanhe ranking, médias e desempenho por disciplina." },
    ],
    proTips: [
      "O professor acessa apenas as disciplinas atribuídas a ele.",
      "A correção só é liberada quando o simulado está coerente e com gabarito completo.",
      "Use os atalhos de PDF, arquivo editável, folha de respostas e comunicado conforme o estágio do fluxo.",
    ],
  },
  {
    id: "question-bank",
    title: "Banco de Questões",
    icon: Library,
    description: "Catálogo de questões com filtros, organização por disciplina e reutilização no editor.",
    roles: ["admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Cadastrar ou revisar questões", description: "Adicione questões manualmente ou revise material já armazenado no banco." },
      { step: 2, title: "Use filtros", description: "Filtre por disciplina, dificuldade, bimestre, tags e outros critérios para encontrar conteúdo mais rápido." },
      { step: 3, title: "Gerar com IA", description: "Use o assistente de IA para gerar questões a partir de texto, PDF ou imagens." },
      { step: 4, title: "Inserir no editor", description: "Questões aprovadas podem ser reutilizadas diretamente nas provas e simulados." },
    ],
    proTips: [
      "Use tags e tópicos consistentes para facilitar a busca futura.",
      "A IA funciona melhor quando o material-base está limpo e com instruções objetivas.",
    ],
  },
  {
    id: "ai-generator",
    title: "Assistente de IA",
    icon: Sparkles,
    description: "Geração assistida de questões, material avaliativo e apoio pedagógico baseado em conteúdo de referência.",
    roles: ["admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Escolha a base", description: "Cole texto, envie PDF ou imagens para usar como referência da geração." },
      { step: 2, title: "Configure a geração", description: "Defina quantidade, dificuldade, disciplina, tipo de questão e instruções específicas." },
      { step: 3, title: "Revise a saída", description: "Confira o conteúdo gerado antes de salvar no banco ou enviar ao editor." },
      { step: 4, title: "Aproveite no fluxo", description: "Leve as questões geradas para provas, simulados e banco de questões." },
    ],
    proTips: [
      "Use instruções claras para focar em habilidades, tópicos ou estilo de questão.",
      "Imagens e PDFs funcionam melhor quando estão legíveis e com bom contraste.",
    ],
  },
  {
    id: "grades",
    title: "Notas",
    icon: Award,
    description: "Lançamento de notas manuais e acompanhamento das notas vindas de simulados.",
    roles: ["admin", "coordinator", "super_admin", "professor"],
    steps: [
      { step: 1, title: "Filtre por turma, disciplina e bimestre", description: "Use os filtros para concentrar o lançamento e a leitura das notas." },
      { step: 2, title: "Lance notas manuais", description: "Cadastre avaliações e notas individuais pela interface própria." },
      { step: 3, title: "Importe em lote", description: "Use o modelo de importação quando precisar registrar muitas notas de uma vez." },
      { step: 4, title: "Acompanhe notas de simulados", description: "Resultados de simulados vinculados entram no fluxo de notas automaticamente." },
    ],
    proTips: [
      "Revise `nota máxima` antes de importar uma planilha para evitar distorções.",
      "Use o campo de observações quando uma nota exigir contexto pedagógico adicional.",
    ],
  },
  {
    id: "attendance",
    title: "Frequência",
    icon: CalendarCheck,
    description: "Registro diário de presença com filtros por turma, data e disciplina.",
    roles: ["admin", "coordinator", "professor", "super_admin"],
    steps: [
      { step: 1, title: "Selecione a turma e a data", description: "Escolha o grupo correto antes de registrar presença." },
      { step: 2, title: "Marque os status", description: "Registre presença, ausência, justificativa ou atraso para cada aluno." },
      { step: 3, title: "Salve em lote", description: "Use a gravação em lote para persistir rapidamente a chamada do dia." },
      { step: 4, title: "Importe quando necessário", description: "Planilhas de frequência podem ser trazidas para o sistema em fluxo de importação." },
    ],
    proTips: [
      "Quando fizer chamada por disciplina, selecione a disciplina antes de salvar.",
      "A frequência registrada impacta diretamente os relatórios e dashboards pedagógicos.",
    ],
  },
  {
    id: "chat",
    title: "Chat",
    icon: MessageCircle,
    description: "Comunicação interna com conversas, grupos, anexos e transcrição de áudio.",
    roles: ["admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Abra uma conversa", description: "Selecione um contato ou grupo para iniciar o atendimento interno." },
      { step: 2, title: "Envie mensagens e anexos", description: "Use texto, áudio e arquivos para comunicar contexto pedagógico e operacional." },
      { step: 3, title: "Transcreva áudios", description: "A opção de transcrição ajuda a transformar mensagens de voz em texto legível." },
      { step: 4, title: "Pesquise no histórico", description: "Use a busca para localizar mensagens e decisões anteriores." },
    ],
    proTips: [
      "No mobile, toque longo nas mensagens para abrir ações adicionais.",
      "O chat tem notificações e indicadores de não lidos para acelerar a resposta da equipe.",
    ],
  },
  {
    id: "cadastros",
    title: "Cadastros",
    icon: Users,
    description: "Gestão de alunos, professores, turmas, disciplinas, séries, segmentos e estruturas acadêmicas.",
    roles: ["admin", "coordinator", "super_admin"],
    steps: [
      { step: 1, title: "Escolha a aba do cadastro", description: "Navegue entre alunos, professores, turmas, disciplinas e demais entidades acadêmicas." },
      { step: 2, title: "Crie ou edite registros", description: "Use os formulários da própria aba para manter a base atualizada." },
      { step: 3, title: "Use importações em lote", description: "Sempre que disponível, use o modelo de planilha para agilizar o cadastro." },
      { step: 4, title: "Revise vínculos", description: "Confirme emails, empresas, turmas e disciplinas para evitar falhas em permissões e filtros." },
    ],
    proTips: [
      "Emails corretos são fundamentais para liberar acesso a professores e usuários da escola.",
      "A qualidade dos cadastros impacta quase todos os outros módulos do sistema.",
    ],
  },
  {
    id: "reports",
    title: "Relatórios",
    icon: BarChart3,
    description: "Relatórios operacionais e pedagógicos com filtros e exportação.",
    roles: ["admin", "coordinator", "super_admin"],
    steps: [
      { step: 1, title: "Escolha o recorte", description: "Selecione período, turma, disciplina ou outros filtros conforme o relatório desejado." },
      { step: 2, title: "Revise os indicadores", description: "Leia os cards e gráficos para entender a situação da escola ou do grupo analisado." },
      { step: 3, title: "Cruze os dados", description: "Use os relatórios em conjunto com notas, frequência e desempenho para uma leitura mais completa." },
      { step: 4, title: "Exporte quando necessário", description: "Gere materiais em PDF ou planilha para reuniões e acompanhamentos externos." },
    ],
    proTips: [
      "Filtros mais específicos produzem relatórios mais úteis para tomada de decisão.",
      "Relatórios são melhores quando os módulos de origem estão com dados atualizados.",
    ],
  },
  {
    id: "performance",
    title: "Desempenho",
    icon: TrendingUp,
    description: "Dashboard pedagógico com KPIs, rankings, matriz por disciplina e análise de evolução.",
    roles: ["admin", "coordinator", "super_admin"],
    steps: [
      { step: 1, title: "Abra a visão geral", description: "Comece pelos indicadores principais de desempenho e engajamento." },
      { step: 2, title: "Use as abas do dashboard", description: "Alterne entre ranking, curva de aprendizado, frequência, matrizes e outros painéis." },
      { step: 3, title: "Filtre por turma, aluno e disciplina", description: "Aplique recortes para analisar padrões específicos." },
      { step: 4, title: "Acesse perfis individuais", description: "Quando necessário, entre no detalhe do aluno para ver histórico e diagnósticos." },
    ],
    proTips: [
      "Combine notas e frequência para interpretar melhor a evolução da turma.",
      "Os dashboards fazem mais sentido quando a base de frequência e notas está consistente.",
    ],
  },
  {
    id: "templates",
    title: "Modelos",
    icon: BookOpen,
    description: "Gerencie cabeçalhos, documentos-base e modelos que alimentam o editor e os fluxos de prova.",
    roles: ["admin", "coordinator", "professor"],
    steps: [
      { step: 1, title: "Escolha o tipo de modelo", description: "Acesse os modelos compatíveis com seu papel no sistema." },
      { step: 2, title: "Cadastre ou revise materiais", description: "Use arquivos e cabeçalhos para padronizar visualmente as provas." },
      { step: 3, title: "Associe ao fluxo de edição", description: "Leve os modelos para o editor quando precisar acelerar a preparação do material." },
    ],
    proTips: [
      "Modelos bem organizados reduzem retrabalho no editor.",
      "Cabeçalhos e padrões visuais ajudam a manter consistência institucional.",
    ],
  },
  {
    id: "minhas-turmas",
    title: "Minhas Turmas",
    icon: GraduationCap,
    description: "Visão do professor sobre as turmas e alunos sob sua responsabilidade.",
    roles: ["professor"],
    steps: [
      { step: 1, title: "Abra Minhas Turmas", description: "A página mostra apenas as turmas vinculadas ao seu cadastro de professor." },
      { step: 2, title: "Consulte alunos e vínculos", description: "Use a listagem para entender rapidamente as turmas atribuídas a você." },
      { step: 3, title: "Acesse perfis individuais", description: "Abra detalhes de aluno quando precisar consultar histórico, notas ou frequência." },
    ],
    proTips: [
      "Se uma turma esperada não aparecer, revise o cadastro do professor e seus vínculos no sistema.",
    ],
  },
  {
    id: "super-admin",
    title: "Super Admin",
    icon: Crown,
    description: "Gestão global de escolas, usuários, IA, permissões e saúde operacional da plataforma.",
    roles: ["super_admin"],
    steps: [
      { step: 1, title: "Gerencie escolas", description: "Cadastre, revise e monitore as empresas/escolas da plataforma." },
      { step: 2, title: "Administre usuários e vínculos", description: "Ajuste papéis, empresas e acessos com cuidado para não quebrar permissões." },
      { step: 3, title: "Monitore IA e consumo", description: "Use as áreas administrativas para acompanhar uso e configuração de recursos de IA." },
      { step: 4, title: "Revise saúde do sistema", description: "Acompanhe indicadores administrativos e fluxos que impactam toda a base." },
    ],
    proTips: [
      "Mudanças de papel e empresa afetam o que o usuário enxerga no sistema inteiro.",
      "Revise permissões e vínculos antes de alterar usuários em produção.",
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: DollarSign,
    description: "Gestão de cobranças, faturas, pagamentos e bloqueios administrativos por escola.",
    roles: ["super_admin"],
    steps: [
      { step: 1, title: "Acompanhe o resumo financeiro", description: "Use a visão inicial para identificar pendências, atrasos e status de cobrança." },
      { step: 2, title: "Gerencie faturas", description: "Crie, edite e acompanhe faturas por escola ou de forma recorrente." },
      { step: 3, title: "Revise meios de pagamento", description: "Mantenha os dados e regras de cobrança conforme a operação da escola." },
      { step: 4, title: "Monitore bloqueios", description: "Escolas com pendência podem ter restrições automáticas; acompanhe isso pela área financeira." },
    ],
    proTips: [
      "Faturas recorrentes ajudam a reduzir trabalho manual em cobranças periódicas.",
      "Use o módulo financeiro junto da visão administrativa para entender impacto operacional.",
    ],
  },
];

const faqItems = [
  { q: "Como recuperar minha senha?", a: "Na tela de login, clique em 'Esqueci minha senha'. Você receberá um email com link para redefinição." },
  { q: "Como alterar meu avatar?", a: "Acesse seu Perfil clicando no seu nome no menu lateral, depois clique na imagem de perfil para alterar." },
  { q: "Posso usar o sistema no celular?", a: "Sim! O SmartTest é totalmente responsivo. Use o menu hambúrguer no canto superior esquerdo para navegar." },
  { q: "Como a IA gera questões?", a: "A IA analisa o material fornecido (texto, PDF ou imagem) e gera questões seguindo a Taxonomia de Bloom, preservando fórmulas e elementos visuais." },
  { q: "Posso importar alunos de uma planilha?", a: "Sim! Em Cadastros > Alunos, clique em 'Importar' e faça upload de um arquivo Excel seguindo o modelo disponível." },
  { q: "Como funciona a correção automática de simulados?", a: "Digitalize as folhas de resposta e faça upload no sistema. A IA lê as marcações e compara com o gabarito automaticamente." },
  { q: "O que acontece quando uma escola é bloqueada?", a: "Quando há faturas vencidas, o acesso da escola fica restrito. As informações são preservadas e o acesso é restaurado após regularização." },
];

export default function HelpPage() {
  const { role } = useAuth();
  const userRole = role || "professor";
  const [search, setSearch] = useState("");
  const [showChat, setShowChat] = useState(false);

  const roleGuides = useMemo(() => {
    return allGuides
      .filter((g) => g.roles.includes(userRole))
      .filter((g) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          g.title.toLowerCase().includes(s) ||
          g.description.toLowerCase().includes(s) ||
          g.steps.some((st) => st.title.toLowerCase().includes(s) || st.description.toLowerCase().includes(s)) ||
          g.proTips.some((t) => t.toLowerCase().includes(s))
        );
      });
  }, [userRole, search]);

  const filteredFaq = useMemo(() => {
    if (!search) return faqItems;
    const s = search.toLowerCase();
    return faqItems.filter((f) => f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s));
  }, [search]);

  const roleLabel: Record<string, string> = {
    super_admin: "Super Administrador",
    admin: "Administrador / Coordenação",
    coordinator: "Coordenação",
    professor: "Professor",
  };

  const quickAccess = roleGuides.slice(0, 4);

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-secondary/60 p-6 md:p-8 shadow-xl shadow-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                Central de Ajuda
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] bg-background/70 backdrop-blur">
                Perfil: {roleLabel[userRole]}
              </Badge>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
                <BookMarked className="h-8 w-8 text-primary" />
                Ajuda prática para usar o SmartTest melhor
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
                Guias detalhados por módulo, boas práticas do fluxo real do sistema, respostas rápidas por perfil e apoio visual para reduzir dúvidas na operação do dia a dia.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por módulo, fluxo, tela ou dúvida..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-11 rounded-xl bg-background/85 backdrop-blur"
                />
              </div>
              <Button onClick={() => setShowChat(!showChat)} variant={showChat ? "default" : "outline"} className="gap-2 rounded-xl h-11 px-5">
                <Sparkles className="h-4 w-4" />
                {showChat ? "Ocultar assistente" : "Pergunte à IA"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <QuickStat label="Guias ativos" value={String(roleGuides.length)} description="Tópicos compatíveis com seu perfil" />
              <QuickStat label="FAQ" value={String(filteredFaq.length)} description="Respostas rápidas prontas" />
              <QuickStat label="Ajuda contextual" value="IA + Guias" description="Busca, chatbot e materiais de apoio" />
            </div>
          </div>
          <Card className="relative overflow-hidden border-primary/15 bg-background/85 backdrop-blur">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Primeiros passos</p>
                <h2 className="text-lg font-bold">Atalhos úteis para começar</h2>
              </div>
              <div className="space-y-3">
                {quickAccess.map((guide) => {
                  const Icon = guide.icon;
                  return (
                    <div key={guide.id} className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{guide.title}</p>
                          <p className="text-xs text-muted-foreground">{guide.steps[0]?.title}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{guide.steps[0]?.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showChat && (
        <Card className="border-primary/20 bg-primary/5 shadow-lg shadow-primary/10">
          <CardContent className="p-4 md:p-5">
            <HelpChatbot />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="guides" className="w-full">
        <TabsList className="rounded-2xl bg-secondary/40 p-1 h-auto inline-flex gap-1">
          <TabsTrigger value="guides" className="gap-1.5">
            <Layers className="h-4 w-4" />
            Guias
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="h-4 w-4" />
            Perguntas Frequentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="mt-4 space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden border-primary/10">
              <CardContent className="p-0">
                <div className="relative aspect-[16/8] bg-gradient-to-br from-primary/10 via-background to-secondary/30">
                  <img src="/teacher_classroom_hero.png" alt="Professor em sala usando o SmartTest" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-8">
                    <Badge variant="secondary" className="mb-3 w-fit rounded-full">Fluxo recomendado</Badge>
                    <h3 className="text-2xl font-black max-w-xl">Use os guias para navegar por módulo, papel e etapas reais do trabalho.</h3>
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                      A central foi reorganizada para refletir o sistema como ele funciona hoje: avaliações, simulados, editor, banco de questões, desempenho e áreas administrativas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">O que você encontra aqui</CardTitle>
                <CardDescription>Uma visão rápida dos recursos de apoio disponíveis nesta central.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <InfoPill icon={Layers} title="Guias por módulo" description="Passos detalhados e boas práticas por área do sistema." />
                <InfoPill icon={HelpCircle} title="FAQ" description="Respostas rápidas para dúvidas comuns da operação." />
                <InfoPill icon={Sparkles} title="Assistente IA" description="Ajuda conversacional com foco no uso real da plataforma." />
                <InfoPill icon={BookOpen} title="Atalhos úteis" description="Sugestões de primeiros passos por perfil de acesso." />
              </CardContent>
            </Card>
          </div>

          {roleGuides.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum guia encontrado para "{search}".
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roleGuides.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perguntas Frequentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                {filteredFaq.map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {filteredFaq.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma pergunta encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickStat({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <Card className="border-border/60 bg-background/70 backdrop-blur">
      <CardContent className="p-4 space-y-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{label}</p>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function InfoPill({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function GuideCard({ guide }: { guide: FeatureGuide }) {
  const Icon = guide.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <Accordion type="single" collapsible>
        <AccordionItem value={guide.id} className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{guide.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{guide.description}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            {/* Steps */}
            <div className="space-y-3 mb-4">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Passo a passo</h4>
              {guide.steps.map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                    {s.tip && (
                      <div className="flex items-start gap-1.5 mt-1 text-xs text-primary">
                        <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{s.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pro tips */}
            {guide.proTips.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Dicas Pro
                </h4>
                {guide.proTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <ChevronRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
