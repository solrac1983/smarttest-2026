import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGrades, Grade } from "@/hooks/useGrades";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCadastroCompany } from "@/hooks/useCadastroCompany";
import { TablePageSkeleton } from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Plus, Trash2, Building2, Eye } from "lucide-react";
import { readSpreadsheetFile, downloadCSVTemplate } from "@/lib/spreadsheetUtils";
import { PageHeader } from "@/components/ui/PageHeader";

const BIMESTERS = ["1", "2", "3", "4"];
const GRADE_TYPES = [
  { value: "manual", label: "Outros" },
  { value: "prova", label: "Prova" },
  { value: "avaliacao", label: "Avaliação" },
  { value: "exercicios", label: "Exercícios" },
  { value: "simulado", label: "Simulado" },
  { value: "recuperacao", label: "Recuperação" },
];

export default function GradesPage() {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const { companies, selectedCompanyId, setSelectedCompanyId, loading: companyLoading } = useCadastroCompany();
  const companyId = selectedCompanyId || profile?.company_id || "";

  const [classGroup, setClassGroup] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [bimester, setBimester] = useState("");
  const [gradeTypeFilter, setGradeTypeFilter] = useState("");
  const [classGroups, setClassGroups] = useState<{ id: string; name: string; segment?: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; class_group: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formStudentId, setFormStudentId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formBimester, setFormBimester] = useState("1");
  const [formScore, setFormScore] = useState("");
  const [formMaxScore, setFormMaxScore] = useState("10");
  const [formEvalName, setFormEvalName] = useState("");
  const [formGradeType, setFormGradeType] = useState("manual");
  const [formNotes, setFormNotes] = useState("");
  
  // Mass import state
  const [importBimester, setImportBimester] = useState("1");
  const [importEvalName, setImportEvalName] = useState("");
  const [importMaxScore, setImportMaxScore] = useState("10");
  const [importSegment, setImportSegment] = useState("all");
  const [importClassGroup, setImportClassGroup] = useState("all");

  const { grades, loading, addGrade, addGradesBatch, deleteGrade } = useGrades({
    companyId,
    classGroup: classGroup || undefined,
    subjectId: subjectId || undefined,
    bimester: bimester || undefined,
    gradeType: gradeTypeFilter || undefined,
  });

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      supabase.from("class_groups").select("id, name, segment").eq("company_id", companyId).order("name"),
      supabase.from("subjects").select("id, name").eq("company_id", companyId).order("name"),
      supabase.from("students").select("id, name, class_group").eq("company_id", companyId).order("name"),
      supabase.from("segments").select("id, name").eq("company_id", companyId).order("name"),
    ]).then(([cg, sub, st, seg]) => {
      setClassGroups(cg.data || []);
      setSubjects(sub.data || []);
      setStudents(st.data || []);
      setSegments(seg.data || []);
    });
  }, [companyId]);

  const handleAddGrade = async () => {
    if (!formStudentId || !formSubjectId || !formScore) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const student = students.find(s => s.id === formStudentId);
    const ok = await addGrade({
      student_id: formStudentId,
      company_id: companyId,
      subject_id: formSubjectId,
      class_group: student?.class_group || "",
      grade_type: formGradeType,
      bimester: formBimester,
      score: parseFloat(formScore),
      max_score: parseFloat(formMaxScore) || 10,
      evaluation_name: formEvalName,
      simulado_result_id: null,
      notes: formNotes,
      recorded_by: user!.id,
    });
    if (ok) {
      setDialogOpen(false);
      setFormStudentId(""); setFormScore(""); setFormEvalName(""); setFormNotes("");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawRows = await readSpreadsheetFile(file);
      if (rawRows.length < 2) {
        toast({ title: "Planilha vazia", variant: "destructive" });
        return;
      }
      const headers = rawRows[0].map(h => h.trim());
      const isMatrix = headers[0]?.toLowerCase() === "aluno" && !headers.some(h => h.toLowerCase() === "disciplina");

      const gradesToInsert: any[] = [];
      let skipped = 0;

      if (isMatrix) {
        const subjectsInHeader = headers.slice(1).map(sName => {
          return subjects.find(s => s.name.toLowerCase() === sName.toLowerCase());
        });

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          const studentName = (row[0] || "").trim();
          const student = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
          
          if (!student) { 
            if (studentName) skipped++; 
            continue; 
          }

          for (let j = 1; j < row.length; j++) {
            const subject = subjectsInHeader[j - 1];
            const scoreStr = (row[j] || "").trim().replace(",", ".");
            if (!subject || scoreStr === "") continue;

            const score = parseFloat(scoreStr);
            if (isNaN(score)) continue;

            gradesToInsert.push({
              student_id: student.id,
              company_id: companyId,
              subject_id: subject.id,
              class_group: student.class_group,
              grade_type: "manual",
              bimester: importBimester,
              score,
              max_score: parseFloat(importMaxScore) || 10,
              evaluation_name: importEvalName,
              simulado_result_id: null,
              notes: "Importação via Matriz",
              recorded_by: user!.id,
            });
          }
        }
      } else {
        // Legacy flat format
        const lHeaders = headers.map(h => h.toLowerCase().trim());
        const alunoIdx = lHeaders.findIndex(h => ["aluno", "nome"].includes(h));
        const notaIdx = lHeaders.findIndex(h => ["nota", "score"].includes(h));
        const avalIdx = lHeaders.findIndex(h => ["avaliação", "avaliacao", "evaluation"].includes(h));
        const bimIdx = lHeaders.findIndex(h => ["bimestre"].includes(h));
        const discIdx = lHeaders.findIndex(h => ["disciplina"].includes(h));
        const maxIdx = lHeaders.findIndex(h => ["nota máxima", "nota maxima", "max"].includes(h));

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          const studentName = (row[alunoIdx] || "").trim();
          const score = parseFloat(row[notaIdx] || "0");
          const evalName = (row[avalIdx] || "").trim();
          const bim = (row[bimIdx] || "1").trim();
          const subName = (row[discIdx] || "").trim();

          const student = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
          const subject = subjects.find(s => s.name.toLowerCase() === subName.toLowerCase());

          if (!student) { if (studentName) skipped++; continue; }

          gradesToInsert.push({
            student_id: student.id,
            company_id: companyId,
            subject_id: subject?.id || null,
            class_group: student.class_group,
            grade_type: "manual",
            bimester: bim,
            score,
            max_score: parseFloat(row[maxIdx] || "10") || 10,
            evaluation_name: evalName,
            simulado_result_id: null,
            notes: "",
            recorded_by: user!.id,
          });
        }
      }

      if (gradesToInsert.length > 0) {
        await addGradesBatch(gradesToInsert);
        toast({ title: `${gradesToInsert.length} notas importadas com sucesso` });
      }
      if (skipped > 0) {
        toast({ title: `${skipped} aluno(s) não encontrado(s) e ignorado(s)`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: err.message || "Erro ao importar", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    // Generate Matrix Template: Aluno in rows, Subjects in columns
    const header = ["Aluno", ...subjects.map(s => s.name)];
    const data = [header];
    
    // Filter students by segment and/or class
    let studentsToInclude = students;

    if (importSegment !== "all") {
      const classesInSegment = classGroups.filter(cg => cg.segment === importSegment).map(cg => cg.name);
      studentsToInclude = studentsToInclude.filter(s => classesInSegment.includes(s.class_group));
    }

    if (importClassGroup !== "all") {
      studentsToInclude = studentsToInclude.filter(s => s.class_group === importClassGroup);
    }

    if (studentsToInclude.length === 0) {
      // Sample rows if no students found
      data.push(["Nome do Aluno 1", ...subjects.map(() => "")]);
      data.push(["Nome do Aluno 2", ...subjects.map(() => "")]);
    } else {
      studentsToInclude.forEach(s => {
        data.push([s.name, ...subjects.map(() => "")]);
      });
    }

    downloadCSVTemplate(data, `modelo_notas_matriz_${classGroup || "geral"}.csv`);
  };

  const handleExportGrades = () => {
    if (grades.length === 0) {
      toast({ title: "Nenhuma nota para exportar", variant: "destructive" });
      return;
    }

    // Identify all unique subjects in the current filtered grades
    const uniqueSubjects = Array.from(new Set(grades.map(g => g.subject_name))).sort();
    
    // Group grades by student
    const matrix: Record<string, Record<string, string>> = {};
    grades.forEach(g => {
      if (!matrix[g.student_name]) matrix[g.student_name] = {};
      // If there are multiple grades for the same subject in this filter, 
      // we show them separated by comma or just use the last one.
      const current = matrix[g.student_name][g.subject_name];
      matrix[g.student_name][g.subject_name] = current ? `${current}, ${g.score}` : g.score.toString();
    });

    const header = ["Aluno", ...uniqueSubjects];
    const data = [header];

    Object.entries(matrix)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([studentName, scores]) => {
        const row = [studentName];
        uniqueSubjects.forEach(sub => {
          row.push(scores[sub] || "");
        });
        data.push(row);
      });

    downloadCSVTemplate(data, `exportacao_notas_${new Date().toISOString().split("T")[0]}.csv`);
  };

  if (companyLoading) return <TablePageSkeleton rows={6} />;

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Selecione uma empresa</h2>
        <p className="text-sm text-muted-foreground mt-1">Para gerenciar notas, selecione uma empresa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Notas"
        badge="Rendimento Escolar"
        icon={GraduationCap}
        description="Lançamento, consulta e importação de notas com mais espaço para leitura, filtros e organização pedagógica."
        className="shadow-xl shadow-primary/10"
        actions={
          isSuperAdmin && (
            <Select value={selectedCompanyId || "none"} onValueChange={(v) => setSelectedCompanyId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-[240px] bg-white text-primary border-none shadow-md h-10 rounded-xl">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione uma empresa</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )
        }
      />

      <div className="surface-elevated rounded-[2rem] p-5 md:p-6 shadow-md space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Ritmo pedagógico</p>
          <h2 className="text-2xl md:text-[2rem] font-black tracking-tight text-foreground mt-2">Gerencie notas com mais visão e menos aperto visual</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            A nova casca dá mais largura para consulta, importação e organização das notas, sem perder legibilidade nas áreas de formulário.
          </p>
        </div>

        <Tabs defaultValue="consulta">
          <TabsList className="mb-2 flex-wrap h-auto gap-2 bg-secondary/40 p-1.5 rounded-2xl">
            <TabsTrigger value="consulta" className="rounded-xl">Consulta</TabsTrigger>
            <TabsTrigger value="importar" className="rounded-xl">Importar Planilha</TabsTrigger>
          </TabsList>

        <TabsContent value="consulta" className="mt-4">
          <div className="surface-card overflow-hidden rounded-[1.75rem] border border-border/60 shadow-sm">
            <div className="border-b border-border/60 p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-tight text-foreground">Notas registradas</h3>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    Filtre por turma, disciplina e bimestre para consultar o histórico com mais contexto e menos ruído visual.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-11 rounded-2xl" onClick={handleExportGrades}>
                    Exportar (Matriz)
                  </Button>
                  <Button size="sm" className="h-11 rounded-2xl" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Lançar Nota
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Select value={classGroup || "all"} onValueChange={v => setClassGroup(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background"><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {classGroups.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={subjectId || "all"} onValueChange={v => setSubjectId(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background"><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={bimester || "all"} onValueChange={v => setBimester(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background"><SelectValue placeholder="Bimestre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {BIMESTERS.map(b => <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={gradeTypeFilter || "all"} onValueChange={v => setGradeTypeFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background"><SelectValue placeholder="Tipo de atividade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {GRADE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
              ) : grades.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
                  <GraduationCap className="mb-4 h-11 w-11 text-muted-foreground/40" />
                  <h4 className="text-lg font-semibold text-foreground">Nenhuma nota encontrada</h4>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Ajuste os filtros para ampliar a busca ou faça um novo lançamento para começar a preencher o histórico pedagógico.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {(classGroup || subjectId || bimester) && (
                      <Button variant="outline" className="rounded-2xl" onClick={() => { setClassGroup(""); setSubjectId(""); setBimester(""); }}>
                        Limpar filtros
                      </Button>
                    )}
                    <Button className="rounded-2xl" onClick={() => setDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Lançar nota
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background/80">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead>Aluno</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Avaliação</TableHead>
                        <TableHead>Bimestre</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map(g => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">
                            <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => navigate(`/aluno/${g.student_id}`)}>
                              {g.student_name} <Eye className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell>{g.subject_name}</TableCell>
                          <TableCell>{g.evaluation_name}</TableCell>
                          <TableCell>{g.bimester}º</TableCell>
                          <TableCell>{g.score}/{g.max_score}</TableCell>
                          <TableCell className="capitalize">{g.grade_type}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => deleteGrade(g.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="importar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importar Notas via Planilha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-xl border border-primary/10 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> 
                  Configurações da Avaliação (Matriz)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Bimestre</Label>
                    <Select value={importBimester} onValueChange={setImportBimester}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BIMESTERS.map(b => <SelectItem key={b} value={b}>{b}º Bimestre</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome da Avaliação</Label>
                    <Input 
                      value={importEvalName} 
                      onChange={e => setImportEvalName(e.target.value)} 
                      placeholder="Ex: Prova Mensal"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nota Máxima</Label>
                    <Input 
                      type="number" 
                      value={importMaxScore} 
                      onChange={e => setImportMaxScore(e.target.value)} 
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Segmento (Filtro)</Label>
                    <Select value={importSegment} onValueChange={setImportSegment}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Segmentos</SelectItem>
                        {segments.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Turma (Filtro)</Label>
                    <Select value={importClassGroup} onValueChange={setImportClassGroup}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Turmas</SelectItem>
                        {classGroups
                          .filter(cg => importSegment === "all" || cg.segment === importSegment)
                          .map(cg => <SelectItem key={cg.id} value={cg.name}>{cg.name}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  1. Preencha os dados acima.<br />
                  2. Clique em <strong>Baixar Modelo</strong> para obter a planilha com seus alunos.<br />
                  3. Preencha as notas nas colunas das disciplinas correspondentes.<br />
                  4. Clique em <strong>Importar Planilha</strong> para enviar o arquivo pronto.
                </p>
                <div className="flex gap-3 flex-wrap pt-2">
                  <Button variant="outline" onClick={handleDownloadTemplate} className="h-10 rounded-xl shadow-sm">
                    Baixar Modelo (Matriz)
                  </Button>
                  <div>
                    <Button variant="primary" type="button" className="h-10 rounded-xl shadow-md" onClick={() => document.getElementById("grades-import-input")?.click()}>
                      Importar Planilha
                    </Button>
                    <input id="grades-import-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      {/* Dialog - Lançar Nota */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lançar Nota</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno *</Label>
              <Select value={formStudentId} onValueChange={setFormStudentId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.class_group})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disciplina *</Label>
              <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bimestre</Label>
                <Select value={formBimester} onValueChange={setFormBimester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BIMESTERS.map(b => <SelectItem key={b} value={b}>{b}º</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formGradeType} onValueChange={setFormGradeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nota *</Label>
                <Input type="number" step="0.1" min="0" value={formScore} onChange={e => setFormScore(e.target.value)} placeholder="8.5" />
              </div>
              <div>
                <Label>Nota Máxima</Label>
                <Input type="number" step="0.1" min="0" value={formMaxScore} onChange={e => setFormMaxScore(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Nome da Avaliação</Label>
              <Input value={formEvalName} onChange={e => setFormEvalName(e.target.value)} placeholder="Prova Mensal" />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddGrade}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
