import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import {
  Shield,
  LogOut,
  Menu,
  X,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import connectLogoC from "@/assets/connect-logo-c.png";
import connectSheep from "@/assets/connect-sheep.png";
import gcLogo from "@/assets/gc-logo.png";

const navItems = [
  { href: "/discipulado", label: "Discipulados", icon: "sheep" as const },
  { href: "/estatisticas", label: "Estatísticas", icon: "chart" as const },
  { href: "/visitantes", label: "Visitantes", icon: "logo" as const },
  { href: "/gc", label: "GC", icon: "gc" as const },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const allNavItems = [
    ...navItems,
    ...(isAdmin
      ? [{ href: "/admin", label: "Administração", icon: "shield" as const }]
      : []),
  ];

  const NavIcon = ({ type, className }: { type: string; className?: string }) => {
    if (type === "sheep") {
      return <img src={connectSheep} alt="" className={cn("object-contain brightness-0 invert -mt-2", className)} />;
    }
    if (type === "logo") {
      return <img src={connectLogoC} alt="" className={cn("object-contain brightness-0 invert", className)} />;
    }
    if (type === "gc") {
      return <img src={gcLogo} alt="" className={cn("object-contain brightness-0 invert", className)} />;
    }
    if (type === "chart") {
      return <BarChart3 className={className} strokeWidth={2.2} />;
    }
    return <Shield className={className} strokeWidth={2.2} />;
  };

  const SidebarContent = () => (
    <>
      {/* Logo area — C + Connect */}
      <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3.5 px-5 py-7 hover:opacity-80 transition-opacity">
        <div className="w-11 h-11 rounded-2xl bg-sidebar-accent/20 flex items-center justify-center p-1.5">
          <img
            src={connectLogoC}
            alt="Connect"
            className="w-full h-full object-contain brightness-0 invert opacity-90"
          />
        </div>
        <span
          className="text-sidebar-foreground font-bold text-[15px] tracking-[0.15em] uppercase"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Connect
        </span>
      </Link>

      {/* Divider */}
      <div className="mx-5 h-px bg-sidebar-border mb-2" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {allNavItems.map(({ href, label, icon }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200",
                isActive
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-sidebar-accent rounded-xl border border-sidebar-border"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <NavIcon type={icon} className="w-[17px] h-[17px] relative z-10" />
              <span className="relative z-10">{label}</span>
              {href === "/gc" && (
                <span className="relative z-10 ml-auto px-2 py-0.5 rounded-md bg-warning/20 text-warning text-[9px] font-bold uppercase tracking-wider border border-warning/30">
                  🚧
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5">
        <div className="mx-1 h-px bg-sidebar-border mb-3" />
        <div className="px-4 py-2.5 rounded-xl bg-sidebar-accent/60 mb-2">
          <p
            className="text-sidebar-foreground/45 text-[11px] font-medium truncate"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {user?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl text-[13px] font-semibold"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <LogOut className="w-4 h-4 mr-2" strokeWidth={2.2} />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[260px] bg-sidebar flex-col shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="relative w-[260px] h-full bg-sidebar flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2.5">
            <img
              src={connectSheep}
              alt="Relive"
              className="w-7 h-7 object-contain -mt-1"
            />
            <span
              className="font-bold text-sm tracking-[0.15em] uppercase text-foreground"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Relive
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground p-2 rounded-xl hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-5 md:p-8 lg:p-10"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
