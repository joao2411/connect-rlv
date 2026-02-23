import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake, Gift, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Person {
  name: string;
  birth_date: string;
  admin_region: string | null;
}

const getNextBirthday = (birthDate: string): Date => {
  const today = new Date();
  const birth = new Date(birthDate);
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) {
    next.setFullYear(today.getFullYear() + 1);
  }
  // If today is the birthday, keep it as today
  if (
    today.getMonth() === birth.getMonth() &&
    today.getDate() === birth.getDate()
  ) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
  return next;
};

const calcAge = (birthDate: string) => {
  const today = new Date();
  const birth = new Date(birthDate);
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

const formatDate = (birthDate: string): string => {
  const birth = new Date(birthDate);
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

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("discipleship")
        .select("disciple_name, discipler_name, birth_date, admin_region");

      if (!data) { setLoading(false); return; }

      const map = new Map<string, Person>();
      data.forEach((r) => {
        if (r.birth_date && !map.has(r.disciple_name)) {
          map.set(r.disciple_name, { name: r.disciple_name, birth_date: r.birth_date, admin_region: r.admin_region });
        }
        if (r.birth_date && !map.has(r.discipler_name)) {
          map.set(r.discipler_name, { name: r.discipler_name, birth_date: r.birth_date, admin_region: r.admin_region });
        }
      });

      setPeople(Array.from(map.values()));
      setLoading(false);
    };
    fetchData();
  }, []);

  const sorted = useMemo(() => {
    return [...people].sort((a, b) => daysUntilBirthday(a.birth_date) - daysUntilBirthday(b.birth_date));
  }, [people]);

  const grouped = useMemo(() => {
    const groups = new Map<number, Person[]>();
    sorted.forEach((p) => {
      const next = getNextBirthday(p.birth_date);
      const month = next.getMonth();
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month)!.push(p);
    });
    // Sort months starting from current
    const currentMonth = new Date().getMonth();
    const monthOrder = Array.from({ length: 12 }, (_, i) => (currentMonth + i) % 12);
    return monthOrder
      .filter((m) => groups.has(m))
      .map((m) => ({ month: m, people: groups.get(m)! }));
  }, [sorted]);

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

        {todayBirthdays.length > 0 && (
          <Card className="glass-card mb-6 border-2 border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-semibold text-foreground">🎉 Hoje é aniversário de:</p>
                  <p className="text-muted-foreground">
                    {todayBirthdays.map((p) => `${p.name} (${calcAge(p.birth_date)} anos)`).join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success/40 border border-success/30" />
            <span>Já fez aniversário</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary/40 border border-primary/20" />
            <span>Ainda vai fazer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-warning/40 border border-warning/50" />
            <span>Hoje!</span>
          </div>
        </div>

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
                      key={p.name}
                      className={`glass-card p-3 flex items-center justify-between ${
                        days === 0
                          ? "border-warning/50 bg-warning/5"
                          : (() => {
                              const birth = new Date(p.birth_date);
                              const thisYearBday = new Date(new Date().getFullYear(), birth.getMonth(), birth.getDate());
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              thisYearBday.setHours(0, 0, 0, 0);
                              return thisYearBday < today ? "border-success/30 bg-success/5 opacity-70" : "border-primary/20";
                            })()
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {new Date(p.birth_date).getDate()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
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

