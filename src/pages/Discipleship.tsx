import { useEffect, useState } from "react";
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
import { Plus, Search, Phone, Heart, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  start_date: "",
  status: "ativo",
  observations: "",
};

const statusColors: Record<string, string> = {
  ativo: "bg-success/15 text-success",
  "concluído": "bg-primary/10 text-primary",
  pausado: "bg-accent/20 text-accent-foreground",
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

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("discipleship")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = rows.filter((r) =>
    r.discipler_name.toLowerCase().includes(search.toLowerCase()) ||
    r.disciple_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.disciple_phone ?? "").includes(search)
  );

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
      start_date: r.start_date ?? "",
      status: r.status,
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Discipulado</h1>
            <p className="text-muted-foreground mt-1">{rows.length} relacionamento(s)</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Registro" : "Novo Registro de Discipulado"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="d-discipler">Discipulador *</Label>
                  <Input id="d-discipler" value={form.discipler_name} onChange={(e) => setForm({ ...form, discipler_name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-disciple">Discípulo *</Label>
                  <Input id="d-disciple" value={form.disciple_name} onChange={(e) => setForm({ ...form, disciple_name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="d-phone">Telefone do discípulo</Label>
                    <Input id="d-phone" value={form.disciple_phone} onChange={(e) => setForm({ ...form, disciple_phone: e.target.value })} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-date">Início</Label>
                    <Input id="d-date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="concluído">Concluído</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-obs">Observações</Label>
                  <Textarea id="d-obs" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={3} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por discipulador, discípulo ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            {search ? "Nenhum registro encontrado." : "Nenhum registro de discipulado. Clique em '+ Novo Registro'."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="bg-card rounded-xl border border-border p-5 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", statusColors[r.status] ?? "bg-muted text-muted-foreground")}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium flex-wrap">
                    <span>{r.discipler_name}</span>
                    <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{r.disciple_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    {r.disciple_phone && (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Phone className="w-3.5 h-3.5" />
                        {r.disciple_phone}
                      </span>
                    )}
                    {r.start_date && (
                      <span className="text-muted-foreground text-sm">
                        Início: {r.start_date.split("-").reverse().join("/")}
                      </span>
                    )}
                  </div>
                  {r.observations && (
                    <p className="text-muted-foreground text-sm mt-1.5 line-clamp-1">{r.observations}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Dialog open={deleteId === r.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Remover registro?</DialogTitle>
                      </DialogHeader>
                      <p className="text-muted-foreground text-sm">Tem certeza que deseja remover o discipulado de <strong>{r.disciple_name}</strong>?</p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="flex-1" onClick={() => handleDelete(r.id)}>Remover</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Discipleship;
