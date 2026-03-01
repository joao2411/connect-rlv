import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import connectSheep from "@/assets/connect-sheep.png";
import connectLogoC from "@/assets/connect-logo-c.png";
import gcLogo from "@/assets/gc-logo.png";
import reliveLogo from "@/assets/relive-logo.png";

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
          .from("discipulado")
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
      iconType: "sheep",
      href: "/discipulado",
      badge: null,
    },
    {
      title: "Visitantes",
      description: "Acompanhe os visitantes da igreja",
      stat: `${visitorsThisMonth} este mês`,
      iconType: "logo",
      href: "/visitantes",
      badge: null,
    },
    {
      title: "GC",
      description: "Dados dos GC's",
      stat: "Em breve",
      iconType: "gc",
      href: "/gc",
      badge: "Em construção",
    },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center mb-6"
        >
          <img src={reliveLogo} alt="Relive" className="h-40 md:h-48 object-contain" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-10 md:mb-14 text-center"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Bem-vindo ao Connect
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {cards.map((card, i) => (
            <motion.button
              key={card.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
              onClick={() => navigate(card.href)}
              className="glass-card-hover text-left p-6 md:p-7 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 flex items-center justify-center overflow-visible">
                  {card.iconType === "sheep" ? (
                    <img src={connectSheep} alt="" className="w-16 h-16 object-contain -mt-5" />
                  ) : card.iconType === "gc" ? (
                    <img src={gcLogo} alt="" className="w-16 h-16 object-contain" />
                  ) : (
                    <img src={connectLogoC} alt="" className="w-full h-full object-contain" />
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300 mt-1" />
              </div>

              <h2 className="text-lg md:text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {card.title}
              </h2>

              {card.badge && (
                <span className="inline-block px-3 py-1 rounded-lg bg-warning/20 text-warning text-xs font-bold uppercase tracking-wider mb-2 border border-warning/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  🚧 {card.badge}
                </span>
              )}

              <p className="text-muted-foreground text-[13px] leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {card.description}
              </p>

              {!loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {card.stat}
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>


        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-muted-foreground/70 text-xs md:text-sm mt-32 md:mt-44 italic tracking-wide"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          "Acreditamos nas pessoas mesmo quando elas mesmas não acreditam."
        </motion.p>
      </div>
    </Layout>
  );
};

export default Dashboard;
