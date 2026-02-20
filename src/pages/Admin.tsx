import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield } from "lucide-react";

const ADMIN_USER_ID = "ac15c1af-d252-4b9a-8cac-1a15882a35ef";

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.id !== ADMIN_USER_ID) {
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
    } catch (err: any) {
      toast({
        title: "Erro ao criar usuário",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administração</h1>
            <p className="text-muted-foreground text-sm">Gerenciar usuários do sistema</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Cadastrar Novo Usuário
            </CardTitle>
            <CardDescription>
              Crie uma conta para um novo membro da equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Admin;
