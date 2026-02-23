import { useEffect, useState, useMemo, useRef } from "react";
import AutocompleteInput from "@/components/AutocompleteInput";
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
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Plus, Search, Phone, Pencil, Trash2, ChevronDown, User, MapPin, Calendar, Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DiscipleshipRow {
  id: string;
  discipler_name: string;
  disciple_name: string;
  disciple_phone: string | null;
  birth_date: string | null;
  admin_region: string | null;
  start_date: string | null;
  status: string | null;
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
  gender: "",
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
  ausente: { label: "Ausente", color: "bg-destructive/10 text-destructive" },
};

const formatDate = (d: string | null) => d ? d.split("-").reverse().join("/") : "—";

const Discipleship = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
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
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [editPersonName, setEditPersonName] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState({ phone: "", birth_date: "", admin_region: "", gender: "" });

  const canEdit = isAdmin;

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("discipleship")
      .select("*")
      .order("discipler_name", { ascending: true });
    if (!error) setRows((data as DiscipleshipRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  // Close search suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build person data map (name -> best available data)
  const personDataMap = useMemo(() => {
    const map = new Map<string, { phone: string | null; birth_date: string | null; admin_region: string | null }>();
    rows.forEach((r) => {
      const existing = map.get(r.disciple_name);
      if (!existing || (r.disciple_phone && !existing.phone) || (r.birth_date && !existing.birth_date)) {
        map.set(r.disciple_name, {
          phone: r.disciple_phone || existing?.phone || null,
          birth_date: r.birth_date || existing?.birth_date || null,
          admin_region: r.admin_region || existing?.admin_region || null,
        });
      }
    });
    return map;
  }, [rows]);

  // All unique names for autocomplete
  const allNames = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => {
      names.add(r.discipler_name);
      names.add(r.disciple_name);
    });
    return Array.from(names).sort();
  }, [rows]);

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    return allNames.filter((n) => n.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  }, [allNames, search]);

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
      birth_date: r.birth_date ?? "",
      admin_region: r.admin_region ?? "",
      start_date: r.start_date ?? "",
      status: r.status ?? "ativo",
      gender: (r as any).gender ?? "",
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
      gender: form.gender || null,
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

  const openEditPerson = (name: string) => {
    const data = personDataMap.get(name);
    setPersonForm({
      phone: data?.phone ?? "",
      birth_date: data?.birth_date ?? "",
      admin_region: data?.admin_region ?? "",
      gender: "",
    });
    setEditPersonName(name);
  };

  const handleSavePerson = async () => {
    if (!editPersonName) return;
    setSaving(true);
    const updates: Record<string, string | null> = {
      disciple_phone: personForm.phone.trim() || null,
      birth_date: personForm.birth_date || null,
      admin_region: personForm.admin_region.trim() || null,
    };
    if (personForm.gender) updates.gender = personForm.gender;

    const { error } = await supabase
      .from("discipleship")
      .update(updates)
      .eq("disciple_name", editPersonName);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados!" });
      setEditPersonName(null);
      fetchRows();
    }
    setSaving(false);
  };

  const PersonInfo = ({ name }: { name: string }) => {
    const data = personDataMap.get(name);
    return (
      <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
        {data?.birth_date ? (
          <span className="flex items-center gap-1"><Cake className="w-3 h-3" />{calcAge(data.birth_date)} anos</span>
        ) : (
          <span className="flex items-center gap-1 opacity-50"><Cake className="w-3 h-3" />—</span>
        )}
        {data?.admin_region ? (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{data.admin_region}</span>
        ) : (
          <span className="flex items-center gap-1 opacity-50"><MapPin className="w-3 h-3" />—</span>
        )}
        {data?.phone ? (
          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{data.phone}</span>
        ) : (
          <span className="flex items-center gap-1 opacity-50"><Phone className="w-3 h-3" />—</span>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Discipulados</h1>
            <p className="text-muted-foreground mt-1">{rows.length} relacionamento(s)</p>
          </div>
          {canEdit && (
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
                    <AutocompleteInput id="d-discipler" value={form.discipler_name} onChange={(val) => setForm({ ...form, discipler_name: val })} suggestions={allNames} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-disciple">Discípulo *</Label>
                    <AutocompleteInput id="d-disciple" value={form.disciple_name} onChange={(val) => setForm({ ...form, disciple_name: val })} suggestions={allNames} required />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="ausente">Ausente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sexo</Label>
                      <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
          )}
        </div>

        {/* Search with autocomplete */}
        <div className="relative mb-6" ref={searchRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por discipulador ou discípulo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSearchSuggestions(true);
            }}
            onFocus={() => search.trim() && setShowSearchSuggestions(true)}
            className="pl-11 h-11 rounded-xl"
          />
          <AnimatePresence>
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
              >
                {searchSuggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setSearch(name);
                      setShowSearchSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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
            {search ? "Nenhum registro encontrado." : "Nenhum registro de discipulado."}
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
                      <p className="text-muted-foreground text-xs mb-1">
                        {disciples.length} discípulo{disciples.length !== 1 ? "s" : ""}
                      </p>
                      <PersonInfo name={disciplerName} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={(e) => { e.stopPropagation(); openEditPerson(disciplerName); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <motion.div animate={{ rotate: expandedDiscipler === disciplerName ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </div>
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
                                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", statusConfig[r.status ?? "ativo"]?.color ?? "bg-muted text-muted-foreground")}>
                                    {statusConfig[r.status ?? "ativo"]?.label ?? r.status}
                                  </span>
                                </div>
                                <div className="flex gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Cake className="w-3 h-3" />
                                    {r.birth_date ? `${calcAge(r.birth_date)} anos` : "—"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {r.admin_region || "—"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {r.disciple_phone || "—"}
                                  </span>
                                  {r.start_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Início: {formatDate(r.start_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {canEdit && (
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
                            )}
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

      {/* Edit person dialog */}
      <Dialog open={!!editPersonName} onOpenChange={(o) => !o && setEditPersonName(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar dados de {editPersonName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} placeholder="(61) 99999-9999" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Nascimento</Label>
              <Input type="date" value={personForm.birth_date} onChange={(e) => setPersonForm({ ...personForm, birth_date: e.target.value })} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Região Adm.</Label>
              <Input value={personForm.admin_region} onChange={(e) => setPersonForm({ ...personForm, admin_region: e.target.value })} placeholder="Ex: Guará" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select value={personForm.gender} onValueChange={(val) => setPersonForm({ ...personForm, gender: val })}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setEditPersonName(null)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl h-11 gradient-gold text-accent-foreground hover:opacity-90" disabled={saving} onClick={handleSavePerson}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Discipleship;
