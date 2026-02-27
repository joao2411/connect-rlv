import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Phone, Calendar, Pencil, Trash2, Users, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

interface Visitor {
  id: string;
  name: string;
  phone: string | null;
  first_visit_date: string;
  observations: string | null;
  how_found_us: string | null;
  invited_by: string | null;
  age: number | null;
  admin_region: string | null;
  status: string | null;
}

const emptyForm = {
  name: "",
  phone: "",
  first_visit_date: "",
  observations: "",
  how_found_us: "",
  invited_by: "",
  age: "",
  admin_region: "",
  status: "",
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
  const [convertId, setConvertId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

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
      age: v.age != null ? String(v.age) : "",
      admin_region: v.admin_region ?? "",
      status: v.status ?? "",
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
      age: form.age ? parseInt(form.age, 10) : null,
      admin_region: form.admin_region.trim() || null,
      status: form.status || null,
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

  const handleConvertToDisciple = async (visitor: Visitor) => {
    setConverting(true);

    // 1. Create person in pessoas table
    const { data: newPessoa, error: pessoaError } = await supabase
      .from("pessoas")
      .insert({
        nome: visitor.name,
        telefone: visitor.phone,
        admin_region: visitor.admin_region,
        status: "ativo",
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (pessoaError) {
      toast({ title: "Erro ao converter", description: pessoaError.message, variant: "destructive" });
      setConverting(false);
      return;
    }

    // 2. Create discipleship entry
    const { error: discError } = await supabase
      .from("discipulado")
      .insert({
        discipulo_id: newPessoa.id,
        status: "ativo",
        created_by: user?.id,
      });

    if (discError) {
      toast({ title: "Erro ao criar discipulado", description: discError.message, variant: "destructive" });
      setConverting(false);
      return;
    }

    // 3. Update visitor status
    await supabase.from("visitors").update({ status: "Encaminhado" }).eq("id", visitor.id);

    toast({ title: "Visitante convertido em discípulo!", description: `${visitor.name} foi adicionado ao discipulado.` });
    setConvertId(null);
    setConverting(false);
    fetchVisitors();
  };

  const statusColor = (status: string | null) => {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s === "em acompanhamento") return "bg-warning/20 text-warning border-warning/30";
    if (s === "encaminhado") return "bg-success/20 text-success border-success/30";
    if (s === "não respondeu") return "bg-muted text-muted-foreground border-border";
    return "bg-primary/10 text-primary border-primary/30";
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
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
                    <Input id="v-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(61) 9999-9999" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-date">Data 1º contato *</Label>
                    <Input id="v-date" type="date" value={form.first_visit_date} onChange={(e) => setForm({ ...form, first_visit_date: e.target.value })} required className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-age">Idade</Label>
                    <Input id="v-age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-ra">RA-x</Label>
                    <Input id="v-ra" value={form.admin_region} onChange={(e) => setForm({ ...form, admin_region: e.target.value })} placeholder="Ex: Guará" className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em acompanhamento">Em acompanhamento</SelectItem>
                      <SelectItem value="Não respondeu">Não respondeu</SelectItem>
                      <SelectItem value="Encaminhado">Encaminhado</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="v-obs">Situação / Resolução</Label>
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

        {/* Em construção banner */}
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 px-5 py-3 text-center">
          <p className="text-sm font-semibold text-warning">🚧 Em construção</p>
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

        {/* Table-style list */}
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
          <>
            {/* Desktop table */}
            <div className="hidden md:block glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nome</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Telefone</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Idade</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">RA-x</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Data 1º contato</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Situação</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => (
                      <motion.tr
                        key={v.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {v.status && (
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColor(v.status)}`}>
                              {v.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{v.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.phone || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.age ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.admin_region || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(v.first_visit_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{v.observations || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(v)} title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {/* Convert to disciple */}
                            <Dialog open={convertId === v.id} onOpenChange={(o) => !o && setConvertId(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setConvertId(v.id)} title="Converter em discípulo">
                                  <UserPlus className="w-3.5 h-3.5 text-success" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-sm rounded-2xl">
                                <DialogHeader>
                                  <DialogTitle>Converter em discípulo?</DialogTitle>
                                </DialogHeader>
                                <p className="text-muted-foreground text-sm">
                                  <strong>{v.name}</strong> será adicionado à tabela de pessoas e ao discipulado como ativo.
                                </p>
                                <div className="flex gap-3 mt-4">
                                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConvertId(null)}>Cancelar</Button>
                                  <Button className="flex-1 rounded-xl gradient-gold text-accent-foreground hover:opacity-90" onClick={() => handleConvertToDisciple(v)} disabled={converting}>
                                    {converting ? "Convertendo..." : "Confirmar"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            {/* Delete */}
                            <Dialog open={deleteId === v.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDeleteId(v.id)} title="Remover">
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
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{v.name}</p>
                      {v.status && (
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${statusColor(v.status)}`}>
                          {v.status}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(v)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setConvertId(v.id)}>
                        <UserPlus className="w-3.5 h-3.5 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDeleteId(v.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {v.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{v.phone}</span>
                    )}
                    {v.age != null && <span>Idade: {v.age}</span>}
                    {v.admin_region && <span>{v.admin_region}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(v.first_visit_date)}</span>
                  </div>
                  {v.observations && (
                    <p className="text-muted-foreground text-xs mt-2 line-clamp-2">{v.observations}</p>
                  )}

                  {/* Mobile convert/delete dialogs */}
                  <Dialog open={convertId === v.id} onOpenChange={(o) => !o && setConvertId(null)}>
                    <DialogContent className="sm:max-w-sm rounded-2xl">
                      <DialogHeader><DialogTitle>Converter em discípulo?</DialogTitle></DialogHeader>
                      <p className="text-muted-foreground text-sm"><strong>{v.name}</strong> será adicionado ao discipulado.</p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConvertId(null)}>Cancelar</Button>
                        <Button className="flex-1 rounded-xl gradient-gold text-accent-foreground hover:opacity-90" onClick={() => handleConvertToDisciple(v)} disabled={converting}>
                          {converting ? "..." : "Confirmar"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={deleteId === v.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                    <DialogContent className="sm:max-w-sm rounded-2xl">
                      <DialogHeader><DialogTitle>Remover visitante?</DialogTitle></DialogHeader>
                      <p className="text-muted-foreground text-sm">Remover <strong>{v.name}</strong>?</p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleDelete(v.id)}>Remover</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Visitors;
