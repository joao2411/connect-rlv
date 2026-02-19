import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Phone, Calendar, Pencil, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";

interface Visitor {
  id: string;
  name: string;
  phone: string | null;
  first_visit_date: string;
  observations: string | null;
  how_found_us: string | null;
  invited_by: string | null;
}

const emptyForm = {
  name: "",
  phone: "",
  first_visit_date: "",
  observations: "",
  how_found_us: "",
  invited_by: "",
};

const Visitors = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchVisitors = async () => {
    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .order("first_visit_date", { ascending: false });
    if (!error) setVisitors(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchVisitors(); }, []);

  const filtered = visitors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone ?? "").includes(search)
  );

  const visitorsThisMonth = useMemo(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    return visitors.filter((v) => v.first_visit_date >= firstOfMonth).length;
  }, [visitors]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (v: Visitor) => {
    setForm({
      name: v.name,
      phone: v.phone ?? "",
      first_visit_date: v.first_visit_date,
      observations: v.observations ?? "",
      how_found_us: v.how_found_us ?? "",
      invited_by: v.invited_by ?? "",
    });
    setEditingId(v.id);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      first_visit_date: form.first_visit_date,
      observations: form.observations.trim() || null,
      how_found_us: form.how_found_us.trim() || null,
      invited_by: form.invited_by.trim() || null,
      created_by: user?.id,
    };

    const { error } = editingId
      ? await supabase.from("visitors").update(payload).eq("id", editingId)
      : await supabase.from("visitors").insert(payload);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Visitante atualizado!" : "Visitante cadastrado!" });
      setDialogOpen(false);
      fetchVisitors();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("visitors").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visitante removido." });
      setDeleteId(null);
      fetchVisitors();
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header + stat */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Visitantes</h1>
            <p className="text-muted-foreground mt-1">{visitors.length} registrado(s)</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="gradient-gold text-accent-foreground rounded-xl h-11 px-5 font-semibold hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Visitante" : "Novo Visitante"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="v-name">Nome *</Label>
                  <Input id="v-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-phone">Telefone</Label>
                    <Input id="v-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-date">Primeira visita *</Label>
                    <Input id="v-date" type="date" value={form.first_visit_date} onChange={(e) => setForm({ ...form, first_visit_date: e.target.value })} required className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-invited">Convidado por</Label>
                  <Input id="v-invited" value={form.invited_by} onChange={(e) => setForm({ ...form, invited_by: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-how">Como conheceu a igreja</Label>
                  <Input id="v-how" value={form.how_found_us} onChange={(e) => setForm({ ...form, how_found_us: e.target.value })} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-obs">Observações</Label>
                  <Textarea id="v-obs" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={3} className="rounded-xl" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 rounded-xl h-11 gradient-gold text-accent-foreground hover:opacity-90" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Monthly stat */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl gradient-navy flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Visitantes este mês</p>
              <p className="text-3xl font-bold text-foreground">{visitorsThisMonth}</p>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            {search ? "Nenhum visitante encontrado." : "Nenhum visitante cadastrado. Clique em '+ Novo'."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card-hover p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{v.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    {v.phone && (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Phone className="w-3.5 h-3.5" />
                        {v.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(v.first_visit_date)}
                    </span>
                    {v.invited_by && (
                      <span className="text-muted-foreground text-sm">Convidado por: {v.invited_by}</span>
                    )}
                  </div>
                  {v.observations && (
                    <p className="text-muted-foreground text-sm mt-1.5 line-clamp-1">{v.observations}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(v)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Dialog open={deleteId === v.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDeleteId(v.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>Remover visitante?</DialogTitle>
                      </DialogHeader>
                      <p className="text-muted-foreground text-sm">Esta ação não pode ser desfeita. Tem certeza que deseja remover <strong>{v.name}</strong>?</p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleDelete(v.id)}>Remover</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Visitors;
