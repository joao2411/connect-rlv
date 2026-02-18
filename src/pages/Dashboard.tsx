import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Users, Heart, TrendingUp, Calendar } from "lucide-react";

interface Stats {
  totalVisitors: number;
  visitorsThisMonth: number;
  totalDiscipleship: number;
  activeDiscipleship: number;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  sub,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  sub?: string;
  color: string;
}) => (
  <div className="bg-card rounded-xl border border-border p-6 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalVisitors: 0,
    visitorsThisMonth: 0,
    totalDiscipleship: 0,
    activeDiscipleship: 0,
  });
  const [recentVisitors, setRecentVisitors] = useState<Array<{ id: string; name: string; first_visit_date: string; phone: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const [
        { count: totalVisitors },
        { count: visitorsThisMonth },
        { count: totalDiscipleship },
        { count: activeDiscipleship },
        { data: recent },
      ] = await Promise.all([
        supabase.from("visitors").select("*", { count: "exact", head: true }),
        supabase.from("visitors").select("*", { count: "exact", head: true }).gte("first_visit_date", firstOfMonth),
        supabase.from("discipleship").select("*", { count: "exact", head: true }),
        supabase.from("discipleship").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("visitors").select("id, name, first_visit_date, phone").order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        totalVisitors: totalVisitors ?? 0,
        visitorsThisMonth: visitorsThisMonth ?? 0,
        totalDiscipleship: totalDiscipleship ?? 0,
        activeDiscipleship: activeDiscipleship ?? 0,
      });
      setRecentVisitors(recent ?? []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total de Visitantes"
              value={stats.totalVisitors}
              icon={Users}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              label="Visitantes este mês"
              value={stats.visitorsThisMonth}
              icon={Calendar}
              color="bg-accent/20 text-accent-foreground"
            />
            <StatCard
              label="Relacionamentos"
              value={stats.totalDiscipleship}
              icon={Heart}
              color="bg-rose-100 text-rose-600"
            />
            <StatCard
              label="Discipulados ativos"
              value={stats.activeDiscipleship}
              icon={TrendingUp}
              color="bg-success/10 text-success"
            />
          </div>
        )}

        <div className="bg-card rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Visitantes recentes</h2>
          </div>
          {recentVisitors.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground">
              Nenhum visitante cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentVisitors.map((v) => (
                <div key={v.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{v.name}</p>
                    <p className="text-muted-foreground text-sm">{v.phone ?? "—"}</p>
                  </div>
                  <span className="text-muted-foreground text-sm bg-muted px-3 py-1 rounded-full">
                    {formatDate(v.first_visit_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
