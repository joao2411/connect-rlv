import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Users, MapPin, Cake, UserCheck } from "lucide-react";

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
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const Statistics = () => {
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
      .sort((a, b) => b.count - a.count);
  }, [uniquePeople]);

  // Age distribution
  const ageData = useMemo(() => {
    const ages: number[] = [];
    uniquePeople.forEach((p) => {
      if (p.birth_date) ages.push(calcAge(p.birth_date));
    });
    if (ages.length === 0) return { brackets: [], average: 0, total: 0 };

    const avg = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    const brackets = new Map<string, number>();
    ages.forEach((age) => {
      let bracket: string;
      if (age < 18) bracket = "< 18";
      else if (age <= 24) bracket = "18-24";
      else if (age <= 30) bracket = "25-30";
      else if (age <= 35) bracket = "31-35";
      else if (age <= 40) bracket = "36-40";
      else bracket = "40+";
      brackets.set(bracket, (brackets.get(bracket) || 0) + 1);
    });

    const order = ["< 18", "18-24", "25-30", "31-35", "36-40", "40+"];
    return {
      brackets: order.filter((b) => brackets.has(b)).map((name) => ({ name, count: brackets.get(name)! })),
      average: avg,
      total: ages.length,
    };
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

  const raChartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    raData.forEach((d, i) => {
      config[d.name] = { label: d.name, color: COLORS[i % COLORS.length] };
    });
    return config;
  }, [raData]);

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

        <div className="grid gap-6 md:grid-cols-2">
          {/* RA Distribution */}
          <Card className="glass-card col-span-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Por Região Administrativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={raChartConfig} className="h-[300px] w-full">
                <BarChart data={raData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {raData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>

              {/* Expandable people list per RA */}
              <div className="mt-4 space-y-2">
                {raData.map((ra) => (
                  <div key={ra.name} className="border border-border/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedRA(expandedRA === ra.name ? null : ra.name)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-medium">{ra.name}</span>
                      <span className="text-muted-foreground text-xs">{ra.count} pessoa(s)</span>
                    </button>
                    {expandedRA === ra.name && (
                      <div className="border-t border-border/50 px-4 py-2 bg-muted/10">
                        <div className="flex flex-wrap gap-2">
                          {ra.people.map((name) => (
                            <span key={name} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
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

          {/* Age Distribution */}
          <Card className="glass-card">
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
                <BarChart data={ageData.brackets} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(225, 60%, 25%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gender Distribution */}
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
                  <Pie
                    data={genderData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, count }) => `${name}: ${count}`}
                  >
                    {genderData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === "Masculino"
                            ? "hsl(225, 60%, 25%)"
                            : entry.name === "Feminino"
                            ? "hsl(330, 50%, 45%)"
                            : "hsl(225, 12%, 70%)"
                        }
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex justify-center gap-6 mt-2">
                {genderData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          entry.name === "Masculino"
                            ? "hsl(225, 60%, 25%)"
                            : entry.name === "Feminino"
                            ? "hsl(330, 50%, 45%)"
                            : "hsl(225, 12%, 70%)",
                      }}
                    />
                    <span className="text-muted-foreground">
                      {entry.name}: <strong className="text-foreground">{entry.count}</strong>
                    </span>
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
