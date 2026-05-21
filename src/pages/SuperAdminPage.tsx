import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Loader2, Search, UserPlus, ShieldCheck, Pencil, Trash2, Brain } from "lucide-react";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { invokeFunction } from "@/lib/invokeFunction";
import CompaniesSection from "@/components/super-admin/CompaniesSection";
import AIManagementSection from "@/components/super-admin/AIManagementSection";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
import { PageHeader } from "@/components/ui/PageHeader";

interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_users: number;
  active: boolean;
  created_at: string;
}

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  company_id: string | null;
  role: AppRole;
}

export default function SuperAdminPage() {
  const { role, user: currentUser } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCompanyFilter, setUserCompanyFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 10;

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "admin" as string, company_id: "" });
  const [creatingUser, setCreatingUser] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", role: "professor" as string, company_id: "", password: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [compRes, profRes] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, company_id"),
    ]);
    if (compRes.data) setCompanies(compRes.data);
    if (profRes.data) {
      const rolesRes = await supabase.from("user_roles").select("user_id, role");
      const rolesMap: Record<string, AppRole> = {};
      rolesRes.data?.forEach((r: any) => {
        rolesMap[r.user_id] = r.role;
      });
      setUsers(profRes.data.map((p: any) => ({ ...p, role: rolesMap[p.id] || "professor" })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) {
      showInvokeError(error.message);
    } else {
      showInvokeSuccess("Perfil atualizado!");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    }
  };

  const handleAssignCompany = async (userId: string, companyId: string | null) => {
    const { error } = await supabase.from("profiles").update({ company_id: companyId }).eq("id", userId);
    if (error) {
      showInvokeError(error.message);
    } else {
      showInvokeSuccess("Empresa vinculada!");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, company_id: companyId } : u)));
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      showInvokeError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (newUser.password.length < 6) {
      showInvokeError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if ((newUser.role === "admin" || newUser.role === "professor") && !newUser.company_id) {
      showInvokeError("Administradores e professores devem estar vinculados a uma escola.");
      return;
    }
    setCreatingUser(true);
    const { error } = await invokeFunction("create-user", {
      body: { email: newUser.email, password: newUser.password, full_name: newUser.full_name, role: newUser.role, company_id: newUser.company_id || null },
      successMessage: `Usuário ${newUser.full_name} criado com sucesso!`,
      errorMessage: "Erro ao criar usuário.",
    });
    setCreatingUser(false);
    if (error) return;
    setUserDialogOpen(false);
    setNewUser({ full_name: "", email: "", password: "", role: "admin", company_id: "" });
    fetchData();
  };

  const openEditUser = (u: UserWithRole) => {
    setEditUser(u);
    setEditForm({ full_name: u.full_name, email: u.email, role: u.role, company_id: u.company_id || "", password: "" });
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editUser || !editForm.full_name || !editForm.email) {
      showInvokeError("Preencha nome e e-mail.");
      return;
    }
    if ((editForm.role === "admin" || editForm.role === "professor") && !editForm.company_id) {
      showInvokeError("Administradores e professores devem estar vinculados a uma escola.");
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      showInvokeError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSavingEdit(true);
    const body: Record<string, unknown> = {
      action: "update",
      user_id: editUser.id,
      full_name: editForm.full_name,
      email: editForm.email,
      role: editForm.role,
      company_id: editForm.company_id || null,
    };
    if (editForm.password) body.password = editForm.password;

    const { data, error } = await invokeFunction("manage-user", {
      body,
      successMessage: "Usuário atualizado com sucesso!",
    });
    setSavingEdit(false);
    if (error) return;
    setEditDialogOpen(false);
    setEditUser(null);
    fetchData();
    void data;
  };

  const openDeleteUser = (u: UserWithRole) => {
    setUserToDelete(u);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    const { error } = await invokeFunction("manage-user", {
      body: { action: "delete", user_id: userToDelete.id },
      successMessage: "Usuário excluído com sucesso!",
    });
    setDeleting(false);
    if (error) return;
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    fetchData();
  };

  if (role !== "super_admin") return null;

  const q = userSearch.toLowerCase();
  const filteredUsers = users.filter((u) => {
    const matchesCompany = userCompanyFilter === "all" ? true : userCompanyFilter === "none" ? !u.company_id : u.company_id === userCompanyFilter;
    const matchesSearch = !q || (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    return matchesCompany && matchesSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const safePage = Math.min(userPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const activeCompanies = companies.filter((company) => company.active).length;
  const adminCount = users.filter((user) => user.role === "admin").length;
  const superAdminCount = users.filter((user) => user.role === "super_admin").length;
  const usersWithoutCompany = users.filter((user) => !user.company_id).length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Super Admin"
        badge="Painel de Controle"
        icon={ShieldCheck}
        description="Gerencie empresas, planos, usuários globais e automações do sistema com uma visão administrativa mais ampla."
        className="shadow-xl shadow-primary/10"
      />

      <div className="surface-elevated rounded-[2rem] p-5 shadow-md md:p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Gestão de plataforma</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-[2rem]">
              Empresas, usuários e IA com a mesma leitura visual do restante do sistema
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              A área administrativa agora usa superfícies mais claras, filtros mais previsíveis e estados mais legíveis para reduzir ruído em operações globais.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Empresas</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-2xl font-black text-foreground">{companies.length}</span>
                <span className="text-xs text-muted-foreground">{activeCompanies} ativas</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Usuários globais</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-2xl font-black text-foreground">{users.length}</span>
                <span className="text-xs text-muted-foreground">{usersWithoutCompany} sem empresa</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Governança</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-2xl font-black text-foreground">{adminCount + superAdminCount}</span>
                <span className="text-xs text-muted-foreground">admins e super admins</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="empresas" className="w-full">
          <TabsList className="mb-1 flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-secondary/40 p-1.5">
            <TabsTrigger value="empresas" className="flex items-center gap-2 rounded-xl">
              <Building2 className="h-4 w-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2 rounded-xl">
              <Users className="h-4 w-4" />
              Usuários ({users.length})
            </TabsTrigger>
            <TabsTrigger value="ia" className="flex items-center gap-2 rounded-xl">
              <Brain className="h-4 w-4" />
              IA & Tokens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresas" className="mt-4">
            <CompaniesSection companies={companies} loading={loading} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="usuarios" className="mt-4">
            <div className="surface-card overflow-hidden rounded-[1.75rem] border border-border/60 shadow-sm">
              <div className="border-b border-border/60 p-5 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-black tracking-tight text-foreground">Usuários da plataforma</h3>
                    </div>
                    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      Centralize criação, papéis e vínculo institucional com menos densidade visual nos filtros e mais clareza na tabela principal.
                    </p>
                  </div>

                  <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="h-11 rounded-2xl px-5 text-sm font-semibold shadow-sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Criar usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[560px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                          Criar novo usuário
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Nome completo *</Label>
                            <Input placeholder="Nome do usuário" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>E-mail *</Label>
                            <Input type="email" placeholder="email@empresa.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Senha *</Label>
                            <Input type="password" placeholder="Mínimo 6 caracteres" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Perfil</Label>
                            <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="professor">Professor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>
                              Empresa vinculada {(newUser.role === "admin" || newUser.role === "professor") && <span className="text-destructive">*</span>}
                            </Label>
                            <Select value={newUser.company_id || "none"} onValueChange={(v) => setNewUser({ ...newUser, company_id: v === "none" ? "" : v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma empresa" />
                              </SelectTrigger>
                              <SelectContent>
                                {newUser.role === "super_admin" && <SelectItem value="none">Nenhuma</SelectItem>}
                                {companies.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(newUser.role === "admin" || newUser.role === "professor") && !newUser.company_id && (
                              <p className="text-xs text-destructive">Obrigatório para este perfil</p>
                            )}
                          </div>
                        </div>
                        <Button onClick={handleCreateUser} className="h-11 w-full rounded-2xl" disabled={creatingUser}>
                          {creatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Criar usuário
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Base total</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <span className="text-2xl font-black text-foreground">{users.length}</span>
                      <span className="text-xs text-muted-foreground">cadastros monitorados</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Coordenação de acesso</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <span className="text-2xl font-black text-foreground">{adminCount}</span>
                      <span className="text-xs text-muted-foreground">administradores</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Acesso mestre</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <span className="text-2xl font-black text-foreground">{superAdminCount}</span>
                      <span className="text-xs text-muted-foreground">super admins</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou e-mail..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      className="h-11 rounded-2xl border-border/60 bg-background pl-11"
                    />
                  </div>
                  <Select
                    value={userCompanyFilter}
                    onValueChange={(value) => {
                      setUserCompanyFilter(value);
                      setUserPage(1);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background">
                      <SelectValue placeholder="Filtrar por empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as empresas</SelectItem>
                      <SelectItem value="none">Sem empresa</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-5 md:p-6">
                {loading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
                    <Users className="mb-4 h-11 w-11 text-muted-foreground/40" />
                    <h4 className="text-lg font-semibold text-foreground">Nenhum usuário encontrado</h4>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                      Ajuste a busca ou o filtro por empresa para reencontrar a equipe desejada ou crie um novo cadastro global.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      {(userSearch || userCompanyFilter !== "all") && (
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => {
                            setUserSearch("");
                            setUserCompanyFilter("all");
                            setUserPage(1);
                          }}
                        >
                          Limpar filtros
                        </Button>
                      )}
                      <Button className="rounded-2xl" onClick={() => setUserDialogOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Criar usuário
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
                            <TableHead>E-mail</TableHead>
                            <TableHead>Perfil</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.map((user) => {
                            const isSelf = user.id === currentUser?.id;
                            return (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                  <Select value={user.role} onValueChange={(value) => handleChangeRole(user.id, value as AppRole)}>
                                    <SelectTrigger className="h-9 w-[170px] rounded-xl border-border/60 bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                      <SelectItem value="professor">Professor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select value={user.company_id || "none"} onValueChange={(value) => handleAssignCompany(user.id, value === "none" ? null : value)}>
                                    <SelectTrigger className="h-9 w-[180px] rounded-xl border-border/60 bg-background">
                                      <SelectValue placeholder="Nenhuma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Nenhuma</SelectItem>
                                      {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id}>
                                          {company.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => openEditUser(user)} title="Editar usuário">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                                      onClick={() => openDeleteUser(user)}
                                      title="Excluir usuário"
                                      disabled={isSelf}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          {filteredUsers.length} usuário(s) encontrados — Página {safePage} de {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="rounded-xl" disabled={safePage <= 1} onClick={() => setUserPage(safePage - 1)}>
                            Anterior
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl" disabled={safePage >= totalPages} onClick={() => setUserPage(safePage + 1)}>
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ia" className="mt-4">
            <AIManagementSection />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Editar usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome completo</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nova senha <span className="text-xs text-muted-foreground">(deixe em branco para manter a atual)</span></Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Empresa vinculada {(editForm.role === "admin" || editForm.role === "professor") && <span className="text-destructive">*</span>}
                </Label>
                <Select value={editForm.company_id || "none"} onValueChange={(value) => setEditForm({ ...editForm, company_id: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    {editForm.role === "super_admin" && <SelectItem value="none">Nenhuma</SelectItem>}
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(editForm.role === "admin" || editForm.role === "professor") && !editForm.company_id && (
                  <p className="text-xs text-destructive">Obrigatório para este perfil</p>
                )}
              </div>
            </div>
            <Button onClick={handleEditUser} className="h-11 w-full rounded-2xl" disabled={savingEdit}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.full_name || userToDelete?.email}</strong>? Esta ação não pode ser desfeita e todos os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
