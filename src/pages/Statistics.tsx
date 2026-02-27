import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Users, MapPin, Cake, UserCheck, Gift } from "lucide-react";

interface Pessoa {
  id: string;
  nome: string;
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
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const Statistics = () => {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedRA, setExpandedRA] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: pData } = await supabase.from("pessoas").select("id, nome, birth_date, admin_region, gender, status");
      const all = (pData as Pessoa[]) ?? [];
      setPessoas(all);
      setActiveCount(all.filter((p) => p.status !== "ausente" && p.status !== "inativo").length);
      setLoading(false);
    };
    fetch();
  }, []);

  const raData = useMemo(() => {
    const map = new Map<string, string[]>();
    pessoas.forEach((p) => {
      const ra = p.admin_region || "Não informado";
      if (!map.has(ra)) map.set(ra, []);
      map.get(ra)!.push(p.nome);
    });
    return Array.from(map.entries())
      .map(([name, people]) => ({ name, count: people.length, people }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [pessoas]);

  const ageData = useMemo(() => {
    const ages: number[] = [];
    pessoas.forEach((p) => {
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
  }, [pessoas]);

  const genderData = useMemo(() => {
    let m = 0, f = 0, unknown = 0;
    pessoas.forEach((p) => {
      if (p.gender === "M") m++;
      else if (p.gender === "F") f++;
      else unknown++;
    });
    const result = [];
    if (m > 0) result.push({ name: "Masculino", count: m });
    if (f > 0) result.push({ name: "Feminino", count: f });
    if (unknown > 0) result.push({ name: "Não informado", count: unknown });
    return result;
  }, [pessoas]);

  const nextBirthday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let closest: { name: string; date: Date; days: number } | null = null;
    pessoas.forEach((p) => {
      if (!p.birth_date) return;
      const [year, month, day] = p.birth_date.split("-").map(Number);
      const birth = new Date(year, month - 1, day);
      const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
      next.setHours(0, 0, 0, 0);
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const days = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (!closest || days < closest.days) {
        closest = { name: p.nome, date: next, days };
      }
    });
    return closest as { name: string; date: Date; days: number } | null;
  }, [pessoas]);

  const genderChartConfig = {
    Masculino: { label: "Masculino", color: "hsl(225, 60%, 25%)" },
    Feminino: { label: "Feminino", color: "hsl(330, 50%, 45%)" },
    "Não informado": { label: "Não informado", color: "hsl(225, 12%, 70%)" },
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Estatísticas</h1>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Estatísticas</h1>
          <p className="text-muted-foreground mt-1">{pessoas.length} pessoa(s) no total</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pessoas.length}</p>
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
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </div>
        </div>

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

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card col-span-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Por Região Administrativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {raData.map((ra, i) => (
                  <div key={ra.name}>
                    <button
                      onClick={() => setExpandedRA(expandedRA === ra.name ? null : ra.name)}
                      className="w-full rounded-xl p-3 text-left transition-all hover:scale-[1.02] border border-border/50"
                      style={{ backgroundColor: `${COLORS[i % COLORS.length]}15` }}
                    >
                      <p className="text-2xl font-bold text-foreground">{ra.count}</p>
                      <p className="text-xs text-muted-foreground truncate">{ra.name}</p>
                    </button>
                    {expandedRA === ra.name && (
                      <div className="mt-1 p-2 rounded-lg bg-muted/20 border border-border/30">
                        <div className="flex flex-wrap gap-1.5">
                          {ra.people.map((name) => (
                            <span key={name} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card col-span-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cake className="w-5 h-5" />
                Distribuição por Idade
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Média: <strong>{ageData.average} anos</strong> ({ageData.total} com data registrada)
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Pessoas", color: "hsl(225, 60%, 25%)" } }} className="h-[250px] w-full">
                <BarChart data={ageData.bars} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(225, 60%, 25%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Distribuição por Sexo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={genderChartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie data={genderData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, count }) => `${name}: ${count}`}>
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={entry.name === "Masculino" ? "hsl(225, 60%, 25%)" : entry.name === "Feminino" ? "hsl(330, 50%, 45%)" : "hsl(225, 12%, 70%)" } />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex justify-center gap-6 mt-2">
                {genderData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.name === "Masculino" ? "hsl(225, 60%, 25%)" : entry.name === "Feminino" ? "hsl(330, 50%, 45%)" : "hsl(225, 12%, 70%)" }} />
                    <span className="text-muted-foreground">{entry.name}: <strong className="text-foreground">{entry.count}</strong></span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Statistics;
