import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Users, Heart, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const [visitorsThisMonth, setVisitorsThisMonth] = useState(0);
  const [activeDiscipleship, setActiveDiscipleship] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];

      const [{ count: vCount }, { count: dCount }] = await Promise.all([
        supabase
          .from("visitors")
          .select("*", { count: "exact", head: true })
          .gte("first_visit_date", firstOfMonth),
        supabase
          .from("discipleship")
          .select("*", { count: "exact", head: true })
          .eq("status", "ativo"),
      ]);

      setVisitorsThisMonth(vCount ?? 0);
      setActiveDiscipleship(dCount ?? 0);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    {
      title: "Discipulados",
      description: "Gerencie discipuladores e seus discípulos",
      stat: `${activeDiscipleship} ativo${activeDiscipleship !== 1 ? "s" : ""}`,
      icon: Heart,
      href: "/discipulado",
      gradient: "from-primary to-primary/80",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      title: "Visitantes",
      description: "Acompanhe os visitantes da igreja",
      stat: `${visitorsThisMonth} este mês`,
      icon: Users,
      href: "/visitantes",
      gradient: "from-accent to-accent/80",
      iconBg: "bg-accent/15 text-accent-foreground",
    },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Bem-vindo ao{" "}
            <span className="text-gradient-gold">Connect</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            O que você gostaria de acessar?
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map((card, i) => (
            <motion.button
              key={card.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              onClick={() => navigate(card.href)}
              className="glass-card-hover text-left p-8 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.iconBg}`}>
                  <card.icon className="w-7 h-7" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-1.5">
                {card.title}
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                {card.description}
              </p>

              {!loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {card.stat}
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
