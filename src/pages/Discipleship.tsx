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

interface Pessoa {
  id: string;
  nome: string;
  telefone: string | null;
  birth_date: string | null;
  admin_region: string | null;
  gender: string | null;
  observations: string | null;
  status: string | null;
}

interface Discipulado {
  id: string;
  discipulador_id: string | null;
  discipulo_id: string;
  discipulador: string | null;
  status: string | null;
  observations: string | null;
  start_date: string | null;
}

const emptyRelForm = {
  discipulador_id: "",
  discipulo_id: "",
  status: "ativo",
  observations: "",
  start_date: "",
};

const calcAge = (birthDate: string) => {
  const today = new Date();
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
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
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [rels, setRels] = useState<Discipulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyRelForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedDiscipler, setExpandedDiscipler] = useState<string | null>(null);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState({ telefone: "", birth_date: "", admin_region: "", gender: "", discipulador_nome: "" });

  const canEdit = isAdmin;

  const fetchData = async () => {
    const [{ data: pData }, { data: rData }] = await Promise.all([
      supabase.from("pessoas").select("*").order("nome"),
      supabase.from("discipulado").select("*"),
    ]);
    setPessoas((pData as Pessoa[]) ?? []);
    setRels((rData as Discipulado[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Maps for quick lookup
  const pessoaMap = useMemo(() => {
    const map = new Map<string, Pessoa>();
    pessoas.forEach((p) => map.set(p.id, p));
    return map;
  }, [pessoas]);

  const pessoaByName = useMemo(() => {
    const map = new Map<string, Pessoa>();
    pessoas.forEach((p) => map.set(p.nome, p));
    return map;
  }, [pessoas]);

  const allNames = useMemo(() => {
    const names = new Set(pessoas.map((p) => p.nome));
    // Include text-only discipler names from discipulado records
    rels.forEach((r) => {
      if (!r.discipulador_id && r.discipulador) {
        names.add(r.discipulador);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [pessoas, rels]);

  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    return allNames.filter((n) => n.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  }, [allNames, search]);

  // Group relationships by discipler — only by discipulador_id (registered pessoas)
  // Text-only disciplers don't get their own group; their disciples appear under their own pessoa group
  const grouped = useMemo(() => {
    // Only group by registered disciplers (discipulador_id is set)
    const filtered = rels.filter((r) => {
      const disciple = pessoaMap.get(r.discipulo_id);
      if (!disciple) return false;
      if (!r.discipulador_id) return false; // skip text-only discipler records for grouping
      const discipler = pessoaMap.get(r.discipulador_id);
      if (!discipler) return false;
      const disciplerName = discipler.nome;
      return disciplerName.toLowerCase().includes(search.toLowerCase()) ||
        disciple.nome.toLowerCase().includes(search.toLowerCase());
    });
    const map = new Map<string, { discipler: Pessoa; disciplerName: string; disciples: { rel: Discipulado; pessoa: Pessoa }[] }>();
    filtered.forEach((r) => {
      const discipler = pessoaMap.get(r.discipulador_id!)!;
      const disciple = pessoaMap.get(r.discipulo_id);
      if (!disciple) return;
      const key = r.discipulador_id!;
      if (!map.has(key)) {
        map.set(key, { discipler, disciplerName: discipler.nome, disciples: [] });
      }
      map.get(key)!.disciples.push({ rel: r, pessoa: disciple });
    });
    return Array.from(map.values()).sort((a, b) => a.disciplerName.localeCompare(b.disciplerName, "pt-BR"));
  }, [rels, pessoaMap, search]);

  // Build a map of pessoa id -> their external discipulador name (from text-only records)
  const externalDiscipuladorMap = useMemo(() => {
    const map = new Map<string, string>();
    rels.forEach((r) => {
      if (!r.discipulador_id && r.discipulador) {
        map.set(r.discipulo_id, r.discipulador);
      }
    });
    return map;
  }, [rels]);

  const openNew = () => {
    setForm(emptyRelForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (r: Discipulado) => {
    const discipler = r.discipulador_id ? pessoaMap.get(r.discipulador_id) : null;
    const disciple = pessoaMap.get(r.discipulo_id);
    setForm({
      discipulador_id: discipler?.nome ?? r.discipulador ?? "",
      discipulo_id: disciple?.nome ?? "",
      status: r.status ?? "ativo",
      observations: r.observations ?? "",
      start_date: r.start_date ?? "",
    });
    setEditingId(r.id);
    setDialogOpen(true);
  };

  const getOrCreatePessoa = async (nome: string): Promise<string | null> => {
    const existing = pessoaByName.get(nome.trim());
    if (existing) return existing.id;
    const { data, error } = await supabase.from("pessoas").insert({ nome: nome.trim(), created_by: user?.id }).select("id").maybeSingle();
    if (error || !data) return null;
    return data.id;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const discipuloId = await getOrCreatePessoa(form.discipulo_id);
    if (!discipuloId) {
      toast({ title: "Erro ao salvar", description: "Não foi possível encontrar/criar discípulo.", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Check if discipler exists in pessoas; if not, store as text
    const existingDiscipler = pessoaByName.get(form.discipulador_id.trim());
    const discipuladorId = existingDiscipler?.id ?? null;
    const discipuladorText = discipuladorId ? null : form.discipulador_id.trim();

    const payload: any = {
      discipulador_id: discipuladorId,
      discipulador: discipuladorText,
      discipulo_id: discipuloId,
      status: form.status,
      observations: form.observations.trim() || null,
      start_date: form.start_date || null,
      created_by: user?.id,
    };

    const { error } = editingId
      ? await supabase.from("discipulado").update(payload).eq("id", editingId)
      : await supabase.from("discipulado").insert(payload);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Registro atualizado!" : "Registro criado!" });
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("discipulado").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registro removido." });
      setDeleteId(null);
      fetchData();
    }
  };

  const toggleDiscipler = (id: string) => {
    setExpandedDiscipler(expandedDiscipler === id ? null : id);
  };

  const openEditPerson = (pessoa: Pessoa) => {
    // Find if this person has a discipulado record as disciple (to get their discipulador)
    const relAsDisciple = rels.find(r => r.discipulo_id === pessoa.id);
    const discipuladorNome = relAsDisciple
      ? (relAsDisciple.discipulador_id ? pessoaMap.get(relAsDisciple.discipulador_id)?.nome ?? "" : relAsDisciple.discipulador ?? "")
      : "";
    setPersonForm({
      telefone: pessoa.telefone ?? "",
      birth_date: pessoa.birth_date ?? "",
      admin_region: pessoa.admin_region ?? "",
      gender: pessoa.gender ?? "",
      discipulador_nome: discipuladorNome,
    });
    setEditPersonId(pessoa.id);
  };

  const handleSavePerson = async () => {
    if (!editPersonId) return;
    setSaving(true);

    // Save person data
    const { error } = await supabase.from("pessoas").update({
      telefone: personForm.telefone.trim() || null,
      birth_date: personForm.birth_date || null,
      admin_region: personForm.admin_region.trim() || null,
      gender: personForm.gender || null,
    }).eq("id", editPersonId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Save discipulador relationship if provided
    const discipuladorNome = personForm.discipulador_nome.trim();
    if (discipuladorNome) {
      const existingRel = rels.find(r => r.discipulo_id === editPersonId);
      const existingDiscipler = pessoaByName.get(discipuladorNome);
      const discipuladorId = existingDiscipler?.id ?? null;
      const discipuladorText = discipuladorId ? null : discipuladorNome;

      const relPayload: any = {
        discipulador_id: discipuladorId,
        discipulador: discipuladorText,
        discipulo_id: editPersonId,
        status: "ativo",
        created_by: user?.id,
      };

      if (existingRel) {
        await supabase.from("discipulado").update({
          discipulador_id: discipuladorId,
          discipulador: discipuladorText,
        }).eq("id", existingRel.id);
      } else {
        await supabase.from("discipulado").insert(relPayload);
      }
    }

    toast({ title: "Dados atualizados!" });
    setEditPersonId(null);
    fetchData();
    setSaving(false);
  };

  const PersonInfo = ({ pessoa }: { pessoa: Pessoa }) => (
    <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
      {pessoa.birth_date ? (
        <span className="flex items-center gap-1"><Cake className="w-3 h-3" />{calcAge(pessoa.birth_date)} anos</span>
      ) : (
        <span className="flex items-center gap-1 opacity-50"><Cake className="w-3 h-3" />—</span>
      )}
      {pessoa.admin_region ? (
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pessoa.admin_region}</span>
      ) : (
        <span className="flex items-center gap-1 opacity-50"><MapPin className="w-3 h-3" />—</span>
      )}
      {pessoa.telefone ? (
        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{pessoa.telefone}</span>
      ) : (
        <span className="flex items-center gap-1 opacity-50"><Phone className="w-3 h-3" />—</span>
      )}
    </div>
  );

  const editPersonData = editPersonId ? pessoaMap.get(editPersonId) : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Discipulados</h1>
            <p className="text-muted-foreground mt-1">{rels.length} relacionamento(s)</p>
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
                    <AutocompleteInput id="d-discipler" value={form.discipulador_id} onChange={(val) => setForm({ ...form, discipulador_id: val })} suggestions={allNames} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-disciple">Discípulo *</Label>
                    <AutocompleteInput id="d-disciple" value={form.discipulo_id} onChange={(val) => setForm({ ...form, discipulo_id: val })} suggestions={allNames} required />
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
                      <Label htmlFor="d-date">Início</Label>
                      <Input id="d-date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="h-11 rounded-xl" />
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

        {/* Search */}
        <div className="relative mb-6" ref={searchRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por discipulador ou discípulo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSearchSuggestions(true); }}
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
                    onClick={() => { setSearch(name); setShowSearchSuggestions(false); }}
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
            {grouped.map(({ discipler, disciplerName, disciples }) => {
              const groupKey = discipler.id;
              const extDisc = externalDiscipuladorMap.get(discipler.id);
              return (
              <div key={groupKey} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleDiscipler(groupKey)}
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
                      {extDisc && (
                        <p className="text-xs text-muted-foreground/60 italic mb-1">Discipulado por: {extDisc}</p>
                      )}
                      <PersonInfo pessoa={discipler} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={(e) => { e.stopPropagation(); openEditPerson(discipler); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <motion.div animate={{ rotate: expandedDiscipler === groupKey ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedDiscipler === groupKey && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border divide-y divide-border/50">
                        {disciples.map(({ rel, pessoa }) => (
                          <div key={rel.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-foreground">{pessoa.nome}</span>
                                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", statusConfig[rel.status ?? "ativo"]?.color ?? "bg-muted text-muted-foreground")}>
                                    {statusConfig[rel.status ?? "ativo"]?.label ?? rel.status}
                                  </span>
                                </div>
                                <div className="flex gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Cake className="w-3 h-3" />
                                    {pessoa.birth_date ? `${calcAge(pessoa.birth_date)} anos` : "—"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {pessoa.admin_region || "—"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {pessoa.telefone || "—"}
                                  </span>
                                  {rel.start_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Início: {formatDate(rel.start_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditPerson(pessoa)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Dialog open={deleteId === rel.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDeleteId(rel.id)}>
                                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-sm rounded-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Remover registro?</DialogTitle>
                                    </DialogHeader>
                                    <p className="text-muted-foreground text-sm">Tem certeza que deseja remover o discipulado de <strong>{pessoa.nome}</strong>?</p>
                                    <div className="flex gap-3 mt-4">
                                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteId(null)}>Cancelar</Button>
                                      <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleDelete(rel.id)}>Remover</Button>
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
              );
            })}
          </div>
        )}
      </div>

      {/* Edit person dialog */}
      <Dialog open={!!editPersonId} onOpenChange={(o) => !o && setEditPersonId(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar dados de {editPersonData?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={personForm.telefone} onChange={(e) => setPersonForm({ ...personForm, telefone: e.target.value })} placeholder="(61) 99999-9999" className="h-11 rounded-xl" />
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
            <div className="space-y-1.5">
              <Label>Discipulador(a)</Label>
              <AutocompleteInput
                value={personForm.discipulador_nome}
                onChange={(val) => setPersonForm({ ...personForm, discipulador_nome: val })}
                suggestions={allNames}
                placeholder="Nome do discipulador(a)"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setEditPersonId(null)}>Cancelar</Button>
              <Button className="flex-1 rounded-xl h-11 gradient-gold text-accent-foreground hover:opacity-90" disabled={saving} onClick={handleSavePerson}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Discipleship;
