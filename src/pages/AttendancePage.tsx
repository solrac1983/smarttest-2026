import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCadastroCompany } from "@/hooks/useCadastroCompany";
import { TablePageSkeleton } from "@/components/PageSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Building2, Upload, Download, Save } from "lucide-react";
import { readSpreadsheetFile, downloadCSVTemplate } from "@/lib/spreadsheetUtils";

const STATUS_OPTIONS = [
  { value: "present", label: "Presente", color: "bg-green-100 text-green-800" },
  { value: "absent", label: "Falta", color: "bg-red-100 text-red-800" },
  { value: "justified", label: "Justificada", color: "bg-yellow-100 text-yellow-800" },
  { value: "late", label: "Atraso", color: "bg-orange-100 text-orange-800" },
];

export default function AttendancePage() {
  const { user, profile, role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const { companies, selectedCompanyId, setSelectedCompanyId, loading: companyLoading } = useCadastroCompany();
  const companyId = selectedCompanyId || profile?.company_id || "";

  const [classGroup, setClassGroup] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [classGroups, setClassGroups] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; class_group: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // For manual attendance entry
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

  const { records, loading, fetchRecords, upsertBatch } = useAttendance({
    companyId,
    classGroup: classGroup || undefined,
    date: selectedDate || undefined,
    subjectId: selectedSubjectId || undefined,
  });

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      supabase.from("class_groups").select("id, name").eq("company_id", companyId).order("name"),
      supabase.from("subjects").select("id, name").eq("company_id", companyId).order("name"),
      supabase.from("students").select("id, name, class_group").eq("company_id", companyId).order("name"),
    ]).then(([cg, sub, st]) => {
      setClassGroups(cg.data || []);
      setSubjects(sub.data || []);
      setStudents(st.data || []);
    });
  }, [companyId]);

  // Build attendance map from existing records
  useEffect(() => {
    const map: Record<string, string> = {};
    records.forEach(r => { map[r.student_id] = r.status; });
    setAttendanceMap(map);
  }, [records]);

  const filteredStudents = classGroup
    ? students.filter(s => s.class_group === classGroup)
    : students;

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedDate || !classGroup) {
      toast({ title: "Selecione a data e turma", variant: "destructive" });
      return;
    }
    const items = filteredStudents.map(s => ({
      student_id: s.id,
      company_id: companyId,
      class_group: s.class_group,
      date: selectedDate,
      status: attendanceMap[s.id] || "present",
      subject_id: selectedSubjectId || null,
      notes: "",
      recorded_by: user!.id,
    }));
    await upsertBatch(items);
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
      const headers = rawRows[0].map(h => h.toLowerCase().trim());
      const alunoIdx = headers.findIndex(h => ["aluno", "nome"].includes(h));
      const dataIdx = headers.findIndex(h => ["data", "date"].includes(h));
      const statusIdx = headers.findIndex(h => ["status", "situação"].includes(h));

      const items: any[] = [];
      let skipped = 0;

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        const studentName = (row[alunoIdx] || "").trim();
        const dateStr = (row[dataIdx] || "").trim();
        const statusRaw = (row[statusIdx] || "present").trim().toLowerCase();

        const student = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
        if (!student || !dateStr) { skipped++; continue; }

        const statusMap: Record<string, string> = {
          presente: "present", present: "present",
          falta: "absent", absent: "absent", ausente: "absent",
          justificada: "justified", justified: "justified",
          atraso: "late", late: "late",
        };

        items.push({
          student_id: student.id,
          company_id: companyId,
          class_group: student.class_group,
          date: dateStr,
          status: statusMap[statusRaw] || "present",
          subject_id: null,
          notes: "",
          recorded_by: user!.id,
        });
      }

      if (items.length > 0) await upsertBatch(items);
      if (skipped > 0) toast({ title: `${skipped} registro(s) ignorado(s)` });
    } catch (err: any) {
      toast({ title: err.message || "Erro ao importar", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate(
      [
        ["Aluno", "Data", "Status"],
        ["João Silva", "2026-03-07", "Presente"],
        ["Maria Santos", "2026-03-07", "Falta"],
        ["Pedro Lima", "2026-03-07", "Justificada"],
      ],
      "modelo_frequencia.csv"
    );
  };

  if (companyLoading) return <TablePageSkeleton rows={6} />;

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Selecione uma empresa</h2>
        <p className="text-sm text-muted-foreground mt-1">Para gerenciar frequência, selecione uma empresa.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return <Badge variant="outline" className={opt?.color || ""}>{opt?.label || status}</Badge>;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Frequência"
        badge="Diário de Classe"
        icon={CalendarCheck}
        description="Controle de presença e faltas com mais espaço para lançamentos, consulta e importação de planilhas."
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
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Rotina de assiduidade</p>
          <h2 className="text-2xl md:text-[2rem] font-black tracking-tight text-foreground mt-2">Lance, consulte e importe frequência com mais clareza</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            Esta página agora usa melhor a largura disponível para reduzir aperto em filtros, tabelas e fluxos de importação.
          </p>
        </div>

        <Tabs defaultValue="lancamento">
          <TabsList className="mb-2 flex-wrap h-auto gap-2 bg-secondary/40 p-1.5 rounded-2xl">
          <TabsTrigger value="lancamento" className="rounded-xl">Lançamento</TabsTrigger>
          <TabsTrigger value="consulta" className="rounded-xl">Consulta</TabsTrigger>
          <TabsTrigger value="importar" className="rounded-xl">Importar Planilha</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamento" className="mt-4">
          <div className="surface-card overflow-hidden rounded-[1.75rem] border border-border/60 shadow-sm">
            <div className="border-b border-border/60 p-5 md:p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight text-foreground">Lançar frequência</h3>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Defina data, turma e disciplina para fazer o lançamento com uma leitura mais confortável da lista de alunos.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-2 h-11 rounded-2xl border-border/60 bg-background" />
                </div>
                <div>
                  <Label>Turma</Label>
                  <Select value={classGroup || "none"} onValueChange={v => setClassGroup(v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-2 h-11 rounded-2xl border-border/60 bg-background"><SelectValue placeholder="Turma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      {classGroups.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Disciplina (opcional)</Label>
                  <Select value={selectedSubjectId || "none"} onValueChange={v => setSelectedSubjectId(v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-2 h-11 rounded-2xl border-border/60 bg-background"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geral</SelectItem>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              {classGroup && filteredStudents.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background/80">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20">
                          <TableHead>Aluno</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.class_group}</TableCell>
                            <TableCell>
                              <Select value={attendanceMap[s.id] || "present"} onValueChange={v => handleStatusChange(s.id, v)}>
                                <SelectTrigger className="w-[170px] rounded-xl border-border/60 bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button className="h-11 rounded-2xl" onClick={handleSaveAttendance}>
                    <Save className="mr-1 h-4 w-4" /> Salvar Frequência
                  </Button>
                </>
              ) : classGroup ? (
                <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
                  <CalendarCheck className="mb-4 h-11 w-11 text-muted-foreground/40" />
                  <h4 className="text-lg font-semibold text-foreground">Nenhum aluno encontrado nesta turma</h4>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Verifique o cadastro da turma ou selecione outro filtro para continuar o lançamento de frequência.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
                  <CalendarCheck className="mb-4 h-11 w-11 text-muted-foreground/40" />
                  <h4 className="text-lg font-semibold text-foreground">Selecione uma turma para começar</h4>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Escolha a turma desejada para visualizar os alunos e registrar presença, falta ou justificativa.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="consulta">
          <Card>
            <CardHeader><CardTitle className="text-base">Registros de Frequência</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
              ) : records.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro encontrado</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Turma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.student_name}</TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{getStatusBadge(r.status)}</TableCell>
                          <TableCell>{r.class_group}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="importar">
          <Card>
            <CardHeader><CardTitle className="text-base">Importar Frequência via Planilha</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Colunas aceitas: <strong>Aluno, Data (AAAA-MM-DD), Status</strong> (Presente/Falta/Justificada/Atraso).
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-1" /> Baixar Modelo
                </Button>
                <div>
                  <Button variant="default" type="button" onClick={() => document.getElementById("attendance-import-input")?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Importar Planilha
                  </Button>
                  <input id="attendance-import-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
