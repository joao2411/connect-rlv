import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Cake, Gift, ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Person {
  nome: string;
  birth_date: string;
  admin_region: string | null;
}

const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  date.setHours(0, 0, 0, 0);
  return date;
};

const calcAge = (birthDate: string) => {
  const today = new Date();
  const birth = parseDate(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const daysUntilBirthday = (birthDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = getNextBirthday(birthDate);
  next.setHours(0, 0, 0, 0);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getNextBirthday = (birthDate: string): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = parseDate(birthDate);
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  next.setHours(0, 0, 0, 0);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return next;
};

const formatDate = (birthDate: string): string => {
  const birth = parseDate(birthDate);
  return birth.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
};

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const Birthdays = () => {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("pessoas")
        .select("nome, birth_date, admin_region");
      if (!data) { setLoading(false); return; }
      setPeople(
        (data as any[])
          .filter((p) => p.birth_date)
          .map((p) => ({ nome: p.nome, birth_date: p.birth_date, admin_region: p.admin_region }))
      );
      setLoading(false);
    };
    fetchData();
  }, []);

  const sorted = useMemo(() => {
    return [...people].sort((a, b) => daysUntilBirthday(a.birth_date) - daysUntilBirthday(b.birth_date));
  }, [people]);

  const filteredPeople = useMemo(() => {
    if (!search.trim()) return people;
    return people.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));
  }, [people, search]);

  const grouped = useMemo(() => {
    const groups = new Map<number, Person[]>();
    filteredPeople.forEach((p) => {
      const month = parseDate(p.birth_date).getMonth();
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month)!.push(p);
    });
    groups.forEach((list) => list.sort((a, b) => parseDate(a.birth_date).getDate() - parseDate(b.birth_date).getDate()));
    return Array.from({ length: 12 }, (_, i) => i)
      .filter((m) => groups.has(m))
      .map((m) => ({ month: m, people: groups.get(m)! }));
  }, [filteredPeople]);

  const todayBirthdays = useMemo(() => sorted.filter((p) => daysUntilBirthday(p.birth_date) === 0), [sorted]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Aniversários</h1>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-20 animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/estatisticas")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">🎂 Aniversários</h1>
            <p className="text-muted-foreground text-sm">{people.length} pessoa(s) com data de nascimento</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl"
          />
        </div>

        {todayBirthdays.length > 0 && (
          <Card className="glass-card mb-6 border-2 border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-semibold text-foreground">🎉 Hoje é aniversário de:</p>
                  <p className="text-muted-foreground">
                    {todayBirthdays.map((p) => `${p.nome} (${calcAge(p.birth_date)} anos)`).join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {grouped.map(({ month, people: monthPeople }) => (
            <div key={month}>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Cake className="w-4 h-4 text-primary" />
                {MONTHS_PT[month]}
              </h2>
              <div className="space-y-2">
                {monthPeople.map((p) => {
                  const days = daysUntilBirthday(p.birth_date);
                  const age = calcAge(p.birth_date);
                  return (
                    <div
                      key={p.nome}
                      className={`glass-card p-3 flex items-center justify-between ${
                        days === 0
                          ? "border-2 border-warning"
                          : (() => {
                              const birth = parseDate(p.birth_date);
                              const thisYearBday = new Date(new Date().getFullYear(), birth.getMonth(), birth.getDate());
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              thisYearBday.setHours(0, 0, 0, 0);
                              return thisYearBday < today ? "border-2 border-success/50" : "border-2 border-primary/30";
                            })()
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {parseDate(p.birth_date).getDate()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(p.birth_date)} · {age} anos
                            {p.admin_region && ` · 📍 ${p.admin_region}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {days === 0 ? (
                          <span className="text-sm font-semibold text-warning">🎉 Hoje!</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">em {days} dia{days > 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Birthdays;
