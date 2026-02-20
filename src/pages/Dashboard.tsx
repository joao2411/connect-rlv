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
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10",
      badge: null,
    },
    {
      title: "Visitantes",
      description: "Acompanhe os visitantes da igreja",
      stat: `${visitorsThisMonth} este mês`,
      icon: Users,
      href: "/visitantes",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-500/10",
      badge: "Em construção",
    },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10 md:mb-12"
        >
          <h1
            className="text-3xl md:text-4xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Bem-vindo ao{" "}
            <span className="text-gradient-gold">Connect</span>
          </h1>
          <p
            className="text-muted-foreground text-sm md:text-base"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            O que você gostaria de acessar?
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <motion.button
              key={card.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
              onClick={() => navigate(card.href)}
              className="glass-card-hover text-left p-7 group cursor-pointer"
            >
              {/* Icon + Arrow */}
              <div className="flex items-start justify-between mb-5">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", card.iconBg)}>
                  <card.icon className={cn("w-6 h-6", card.iconColor)} strokeWidth={2} />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 mt-1" />
              </div>

              {/* Title */}
              <h2
                className="text-xl font-bold text-foreground mb-1"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {card.title}
              </h2>

              {/* Badge */}
              {card.badge && (
                <span
                  className="inline-block px-2 py-0.5 rounded-md bg-warning/15 text-warning text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  🚧 {card.badge}
                </span>
              )}

              {/* Description */}
              <p
                className="text-muted-foreground text-[13px] leading-relaxed mb-4"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {card.description}
              </p>

              {/* Stat pill */}
              {!loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/80 text-muted-foreground text-xs font-semibold"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
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

// Helper
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default Dashboard;
