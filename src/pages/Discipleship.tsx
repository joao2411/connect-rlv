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
import { Plus, Search, Phone, Heart, Pencil, Trash2, ChevronDown, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DiscipleshipRow {
  id: string;
  discipler_name: string;
  disciple_name: string;
  disciple_phone: string | null;
  start_date: string | null;
  status: string;
  observations: string | null;
}

const emptyForm = {
  discipler_name: "",
  disciple_name: "",
  disciple_phone: "",
  birth_date: "",
  admin_region: "",
  start_date: "",
  status: "ativo",
  observations: "",
};

const calcAge = (birthDate: string) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-success/15 text-success" },
  "concluído": { label: "Concluído", color: "bg-primary/10 text-primary" },
  pausado: { label: "Pausado", color: "bg-accent/20 text-accent-foreground" },
};

const Discipleship = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<DiscipleshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedDiscipler, setExpandedDiscipler] = useState<string | null>(null);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("discipleship")
      .select("*")
      .order("discipler_name", { ascending: true });
    if (!error) setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  // Group by discipler
  const grouped = useMemo(() => {
    const filtered = rows.filter((r) =>
      r.discipler_name.toLowerCase().includes(search.toLowerCase()) ||
      r.disciple_name.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<string, DiscipleshipRow[]>();
    filtered.forEach((r) => {
      const key = r.discipler_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries());
  }, [rows, search]);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (r: DiscipleshipRow) => {
    setForm({
      discipler_name: r.discipler_name,
      disciple_name: r.disciple_name,
      disciple_phone: r.disciple_phone ?? "",
      birth_date: (r as any).birth_date ?? "",
      admin_region: (r as any).admin_region ?? "",
      start_date: r.start_date ?? "",
      status: r.status ?? "ativo",
      observations: r.observations ?? "",
    });
    setEditingId(r.id);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      discipler_name: form.discipler_name.trim(),
      disciple_name: form.disciple_name.trim(),
      disciple_phone: form.disciple_phone.trim() || null,
      birth_date: form.birth_date || null,
      admin_region: form.admin_region.trim() || null,
      start_date: form.start_date || null,
      status: form.status,
      observations: form.observations.trim() || null,
      created_by: user?.id,
    };

    const { error } = editingId
      ? await supabase.from("discipleship").update(payload).eq("id", editingId)
      : await supabase.from("discipleship").insert(payload);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Registro atualizado!" : "Registro criado!" });
      setDialogOpen(false);
      fetchRows();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("discipleship").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registro removido." });
      setDeleteId(null);
      fetchRows();
    }
  };

  const toggleDiscipler = (name: string) => {
    setExpandedDiscipler(expandedDiscipler === name ? null : name);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Discipulado</h1>
            <p className="text-muted-foreground mt-1">{rows.length} relacionamento(s)</p>
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
                <DialogTitle>{editingId ? "Editar Registro" : "Novo Registro de Discipulado"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="d-discipler">Discipulador *</Label>
                  <Input id="d-discipler" value={form.discipler_name} onChange={(e) => setForm({ ...form, discipler_name: e.target.value })} required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-disciple">Discípulo *</Label>
                  <Input id="d-disciple" value={form.disciple_name} onChange={(e) => setForm({ ...form, disciple_name: e.target.value })} required className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="d-phone">Telefone</Label>
                    <Input id="d-phone" value={form.disciple_phone} onChange={(e) => setForm({ ...form, disciple_phone: e.target.value })} placeholder="(11) 99999-9999" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-birth">Nascimento</Label>
                    <Input id="d-birth" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="d-region">Região Adm.</Label>
                    <Input id="d-region" value={form.admin_region} onChange={(e) => setForm({ ...form, admin_region: e.target.value })} placeholder="Ex: Guará" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-date">Início</Label>
                    <Input id="d-date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="concluído">Concluído</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-obs">Observações</Label>
                  <Textarea id="d-obs" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={3} className="rounded-xl" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 rounded-xl h-11 gradient-gold text-accent-foreground hover:opacity-90" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por discipulador ou discípulo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl"
          />
        </div>

        {/* Grouped list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-20 animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            {search ? "Nenhum registro encontrado." : "Nenhum registro de discipulado. Clique em '+ Novo'."}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(([disciplerName, disciples]) => (
              <div key={disciplerName} className="glass-card overflow-hidden">
                {/* Discipler header */}
                <button
                  onClick={() => toggleDiscipler(disciplerName)}
                  className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full gradient-navy flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {disciplerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-base">{disciplerName}</p>
                      <p className="text-muted-foreground text-sm">
                        {disciples.length} discípulo{disciples.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: expandedDiscipler === disciplerName ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </button>

                {/* Disciples list */}
                <AnimatePresence>
                  {expandedDiscipler === disciplerName && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border divide-y divide-border/50">
                        {disciples.map((r) => (
                          <div key={r.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-foreground">{r.disciple_name}</span>
                                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", statusConfig[r.status]?.color ?? "bg-muted text-muted-foreground")}>
                                    {statusConfig[r.status]?.label ?? r.status}
                                  </span>
                                </div>
                                <div className="flex gap-3 mt-0.5 flex-wrap">
                                  {(r as any).birth_date && (
                                    <span className="text-muted-foreground text-xs">
                                      {calcAge((r as any).birth_date)} anos
                                    </span>
                                  )}
                                  {(r as any).admin_region && (
                                    <span className="text-muted-foreground text-xs">
                                      📍 {(r as any).admin_region}
                                    </span>
                                  )}
                                  {r.disciple_phone && (
                                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                      <Phone className="w-3 h-3" />
                                      {r.disciple_phone}
                                    </span>
                                  )}
                                  {r.start_date && (
                                    <span className="text-muted-foreground text-xs">
                                      Início: {r.start_date.split("-").reverse().join("/")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(r)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Dialog open={deleteId === r.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDeleteId(r.id)}>
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm rounded-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Remover registro?</DialogTitle>
                                  </DialogHeader>
                                  <p className="text-muted-foreground text-sm">Tem certeza que deseja remover o discipulado de <strong>{r.disciple_name}</strong>?</p>
                                  <div className="flex gap-3 mt-4">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteId(null)}>Cancelar</Button>
                                    <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleDelete(r.id)}>Remover</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Discipleship;
