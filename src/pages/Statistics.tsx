import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Users, MapPin, Cake, UserCheck, Gift } from "lucide-react";

const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
};

interface DiscipleshipRow {
  id: string;
  disciple_name: string;
  discipler_name: string;
  birth_date: string | null;
  admin_region: string | null;
  gender: string | null;
  status: string | null;
}

const COLORS = [
  "hsl(225, 60%, 25%)",
  "hsl(225, 45%, 40%)",
  "hsl(225, 35%, 55%)",
  "hsl(225, 25%, 65%)",
  "hsl(152, 55%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 50%, 45%)",
  "hsl(180, 50%, 40%)",
  "hsl(330, 50%, 45%)",
  "hsl(60, 50%, 45%)",
  "hsl(200, 50%, 45%)",
];

const calcAge = (birthDate: string) => {
  const today = new Date();
  const birth = parseDate(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const Statistics = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DiscipleshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRA, setExpandedRA] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("discipleship")
        .select("id, disciple_name, discipler_name, birth_date, admin_region, gender, status");
      setRows((data as DiscipleshipRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  // Unique people (dedup by name)
  const uniquePeople = useMemo(() => {
    const map = new Map<string, DiscipleshipRow>();
    rows.forEach((r) => {
      const existing = map.get(r.disciple_name);
      if (!existing || (r.birth_date && !existing.birth_date) || (r.admin_region && !existing.admin_region) || (r.gender && !existing.gender)) {
        map.set(r.disciple_name, { ...r, ...(existing || {}), ...r });
      }
    });
    // Also include disciplers
    rows.forEach((r) => {
      if (!map.has(r.discipler_name)) {
        map.set(r.discipler_name, { ...r, disciple_name: r.discipler_name });
      }
    });
    return Array.from(map.values());
  }, [rows]);

  // RA distribution
  const raData = useMemo(() => {
    const map = new Map<string, string[]>();
    uniquePeople.forEach((p) => {
      const ra = p.admin_region || "Não informado";
      if (!map.has(ra)) map.set(ra, []);
      map.get(ra)!.push(p.disciple_name);
    });
    return Array.from(map.entries())
      .map(([name, people]) => ({ name, count: people.length, people }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [uniquePeople]);

  // Age distribution — one bar per age
  const ageData = useMemo(() => {
    const ages: number[] = [];
    uniquePeople.forEach((p) => {
      if (p.birth_date) ages.push(calcAge(p.birth_date));
    });
    if (ages.length === 0) return { bars: [], average: 0, total: 0 };

    const avg = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    const countMap = new Map<number, number>();
    ages.forEach((age) => countMap.set(age, (countMap.get(age) || 0) + 1));
    const bars = Array.from(countMap.entries())
      .map(([age, count]) => ({ name: String(age), count }))
      .sort((a, b) => Number(a.name) - Number(b.name));

    return { bars, average: avg, total: ages.length };
  }, [uniquePeople]);

  // Gender distribution
  const genderData = useMemo(() => {
    let m = 0, f = 0, unknown = 0;
    uniquePeople.forEach((p) => {
      if (p.gender === "M") m++;
      else if (p.gender === "F") f++;
      else unknown++;
    });
    const result = [];
    if (m > 0) result.push({ name: "Masculino", count: m });
    if (f > 0) result.push({ name: "Feminino", count: f });
    if (unknown > 0) result.push({ name: "Não informado", count: unknown });
    return result;
  }, [uniquePeople]);

  // Next birthday
  const nextBirthday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let closest: { name: string; date: Date; days: number } | null = null;
    uniquePeople.forEach((p) => {
      if (!p.birth_date) return;
      const birth = parseDate(p.birth_date);
      const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      if (today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate()) {
        next.setFullYear(today.getFullYear());
      }
      next.setHours(0, 0, 0, 0);
      const days = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (!closest || days < closest.days) {
        closest = { name: p.disciple_name, date: next, days };
      }
    });
    return closest;
  }, [uniquePeople]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6 h-64 animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-muted-foreground mt-1">{uniquePeople.length} pessoa(s) no total</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{uniquePeople.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{raData.filter((d) => d.name !== "Não informado").length}</p>
              <p className="text-xs text-muted-foreground">Regiões</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Cake className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{ageData.average || "—"}</p>
              <p className="text-xs text-muted-foreground">Idade média</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rows.filter((r) => r.status === "ativo").length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </div>
        </div>

        {/* Birthday button */}
        <button
          onClick={() => navigate("/aniversarios")}
          className="mb-8 glass-card p-4 flex items-center gap-4 text-left transition-all hover:scale-[1.01] hover:shadow-md border border-warning/30 bg-warning/5 max-w-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-warning/15 flex items-center justify-center">
            <Gift className="w-6 h-6 text-warning" />
          </div>
          {nextBirthday ? (
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {nextBirthday.days === 0 ? "🎉 Aniversariante de hoje!" : `Próximo aniversário em ${nextBirthday.days} dia${nextBirthday.days > 1 ? "s" : ""}`}
              </p>
              <p className="text-lg font-bold text-foreground">{nextBirthday.name}</p>
              <p className="text-xs text-muted-foreground">
                {nextBirthday.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
              </p>
            </div>
          ) : (
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Ver aniversários</p>
              <p className="text-lg font-bold text-foreground">Nenhuma data cadastrada</p>
            </div>
          )}
          <Cake className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* ... resto da tela continua igual */}
      </div>
    </Layout>
  );
};

export default Statistics;