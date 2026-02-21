import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, KeyRound, Users } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string | null;
}

interface UserWithRole extends Profile {
  isAdmin: boolean;
}

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchData = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, name, email").order("name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const profs = profilesRes.data || [];
    setProfiles(profs);

    const adminIds = new Set(
      (rolesRes.data || []).filter((r) => r.role === "admin").map((r) => r.user_id)
    );

    setUsersWithRoles(
      profs.map((p) => ({ ...p, isAdmin: adminIds.has(p.id) }))
    );
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: email.trim(), password, name: name.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Usuário criado com sucesso!", description: `${name} (${email})` });
      setName("");
      setEmail("");
      setPassword("");
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newPassword.trim()) {
      toast({ title: "Selecione o usuário e digite a nova senha", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { user_id: selectedUserId, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const selected = profiles.find((p) => p.id === selectedUserId);
      toast({ title: "Senha resetada!", description: `${selected?.name} (${selected?.email})` });
      setSelectedUserId("");
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Erro ao resetar senha", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (userId === user?.id) {
      toast({ title: "Você não pode remover seu próprio acesso admin", variant: "destructive" });
      return;
    }

    setRolesLoading(true);
    try {
      if (currentlyAdmin) {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        toast({ title: "Acesso admin removido" });
      } else {
        await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        toast({ title: "Acesso admin concedido" });
      }
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao alterar permissão", description: err.message, variant: "destructive" });
    } finally {
      setRolesLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administração</h1>
            <p className="text-muted-foreground text-sm">Gerenciar usuários do sistema</p>
          </div>
        </div>

        {/* Criar Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Cadastrar Novo Usuário
            </CardTitle>
            <CardDescription>Crie uma conta para um novo membro da equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Resetar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Resetar Senha
            </CardTitle>
            <CardDescription>Altere a senha de um usuário existente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? "Resetando..." : "Resetar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Gerenciar Acesso Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Acesso Master
            </CardTitle>
            <CardDescription>Conceda ou remova acesso administrativo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usersWithRoles.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.isAdmin && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        Admin
                      </span>
                    )}
                    <Switch
                      checked={u.isAdmin}
                      onCheckedChange={() => toggleAdmin(u.id, u.isAdmin)}
                      disabled={rolesLoading || u.id === user?.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Admin;
