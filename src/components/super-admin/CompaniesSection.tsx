import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Loader2, Trash2, Pencil, Search } from "lucide-react";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_users: number;
  active: boolean;
  created_at: string;
}

interface CompaniesSectionProps {
  companies: Company[];
  loading: boolean;
  onRefresh: () => void;
}

const planLabel: Record<string, string> = {
  basic: "Básico",
  pro: "Profissional",
  enterprise: "Empresarial",
};

export default function CompaniesSection({ companies, loading, onRefresh }: CompaniesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyPage, setCompanyPage] = useState(1);
  const itemsPerPage = 10;

  const [newCompany, setNewCompany] = useState({ name: "", slug: "", plan: "basic", max_users: 50 });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", plan: "basic", max_users: 50, active: true });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeCompanies = useMemo(() => companies.filter((company) => company.active).length, [companies]);
  const enterpriseCompanies = useMemo(() => companies.filter((company) => company.plan === "enterprise").length, [companies]);

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.slug) {
      showInvokeError("Preencha nome e slug.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("companies").insert(newCompany);
    setSaving(false);
    if (error) {
      showInvokeError(error.message);
    } else {
      showInvokeSuccess("Empresa criada!");
      setDialogOpen(false);
      setNewCompany({ name: "", slug: "", plan: "basic", max_users: 50 });
      onRefresh();
    }
  };

  const openEdit = (company: Company) => {
    setEditCompany(company);
    setEditForm({ name: company.name, slug: company.slug, plan: company.plan, max_users: company.max_users, active: company.active });
    setEditDialogOpen(true);
  };

  const handleEditCompany = async () => {
    if (!editCompany || !editForm.name || !editForm.slug) {
      showInvokeError("Preencha nome e slug.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: editForm.name,
        slug: editForm.slug,
        plan: editForm.plan,
        max_users: editForm.max_users,
        active: editForm.active,
      })
      .eq("id", editCompany.id);
    setSaving(false);
    if (error) {
      showInvokeError(error.message);
    } else {
      showInvokeSuccess("Empresa atualizada!");
      setEditDialogOpen(false);
      setEditCompany(null);
      onRefresh();
    }
  };

  const openDelete = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("companies").delete().eq("id", companyToDelete.id);
    setDeleting(false);
    if (error) {
      showInvokeError(error.message);
    } else {
      showInvokeSuccess("Empresa excluída!");
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      onRefresh();
    }
  };

  const filtered = companies.filter((company) => {
    const query = companySearch.toLowerCase();
    return !query || company.name.toLowerCase().includes(query) || company.slug.toLowerCase().includes(query);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(companyPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="surface-card overflow-hidden rounded-[1.75rem] border border-border/60 shadow-sm">
      <div className="border-b border-border/60 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-black tracking-tight text-foreground">Empresas cadastradas</h3>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Organize a base institucional com uma leitura mais limpa para busca, status de operação e distribuição de planos.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-2xl px-5 text-sm font-semibold shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Criar empresa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome</Label>
                    <Input placeholder="Nome da escola" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (identificador único)</Label>
                    <Input
                      placeholder="minha-escola"
                      value={newCompany.slug}
                      onChange={(e) => setNewCompany({ ...newCompany, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select value={newCompany.plan} onValueChange={(value) => setNewCompany({ ...newCompany, plan: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Básico</SelectItem>
                        <SelectItem value="pro">Profissional</SelectItem>
                        <SelectItem value="enterprise">Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Máx. usuários</Label>
                    <Input type="number" min={1} value={newCompany.max_users} onChange={(e) => setNewCompany({ ...newCompany, max_users: Number(e.target.value) })} />
                  </div>
                </div>
                <Button onClick={handleCreateCompany} className="h-11 w-full rounded-2xl" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Criar empresa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Base ativa</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-2xl font-black text-foreground">{activeCompanies}</span>
              <span className="text-xs text-muted-foreground">de {companies.length} empresas</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Planos enterprise</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-2xl font-black text-foreground">{enterpriseCompanies}</span>
              <span className="text-xs text-muted-foreground">operações premium</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Capacidade potencial</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-2xl font-black text-foreground">{companies.reduce((sum, company) => sum + company.max_users, 0)}</span>
              <span className="text-xs text-muted-foreground">usuários máximos</span>
            </div>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa por nome ou slug..."
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);
                setCompanyPage(1);
              }}
              className="h-11 rounded-2xl border-border/60 bg-background pl-11"
            />
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
            <Building2 className="mb-4 h-11 w-11 text-muted-foreground/40" />
            <h4 className="text-lg font-semibold text-foreground">Nenhuma empresa encontrada</h4>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {companySearch
                ? `Não encontramos resultados para “${companySearch}”. Limpe a busca ou ajuste o termo informado.`
                : "Cadastre a primeira empresa para começar a organizar escolas, planos e capacidade de uso da plataforma."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {companySearch && (
                <Button variant="outline" className="rounded-2xl" onClick={() => setCompanySearch("")}>
                  Limpar busca
                </Button>
              )}
              <Button className="rounded-2xl" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova empresa
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background/80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Máx. Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company.slug}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{planLabel[company.plan] || company.plan}</Badge>
                      </TableCell>
                      <TableCell>{company.max_users}</TableCell>
                      <TableCell>
                        <Badge variant={company.active ? "default" : "destructive"}>{company.active ? "Ativa" : "Inativa"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => openEdit(company)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                            onClick={() => openDelete(company)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} empresa(s) encontradas — Página {safePage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" disabled={safePage <= 1} onClick={() => setCompanyPage(safePage - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl" disabled={safePage >= totalPages} onClick={() => setCompanyPage(safePage + 1)}>
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={editForm.plan} onValueChange={(value) => setEditForm({ ...editForm, plan: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Profissional</SelectItem>
                    <SelectItem value="enterprise">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Máx. usuários</Label>
                <Input type="number" min={1} value={editForm.max_users} onChange={(e) => setEditForm({ ...editForm, max_users: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.active ? "active" : "inactive"} onValueChange={(value) => setEditForm({ ...editForm, active: value === "active" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleEditCompany} className="h-11 w-full rounded-2xl" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa <strong>{companyToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
