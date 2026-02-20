import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  Heart,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import connectLogoC from "@/assets/connect-logo-c.png";

const ADMIN_USER_ID = "ac15c1af-d252-4b9a-8cac-1a15882a35ef";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/visitantes", label: "Visitantes", icon: Users },
  { href: "/discipulado", label: "Discipulado", icon: Heart },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const allNavItems = [
    ...navItems,
    ...(user?.id === ADMIN_USER_ID
      ? [{ href: "/admin", label: "Administração", icon: Shield }]
      : []),
  ];

  const SidebarContent = () => (
    <>
      {/* Logo area */}
      <div className="flex items-center gap-3.5 px-5 py-7">
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
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-sidebar-border/40 mb-2" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {allNavItems.map(({ href, label, icon: Icon }) => {
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
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
              )}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 gradient-gold rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon className="w-[17px] h-[17px] relative z-10" strokeWidth={2.2} />
              <span className="relative z-10">{label}</span>
              {(href === "/visitantes") && (
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
        <div className="mx-1 h-px bg-sidebar-border/40 mb-3" />
        <div className="px-4 py-2.5 rounded-xl bg-sidebar-accent/15 mb-2">
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
          className="w-full justify-start text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/25 rounded-xl text-[13px] font-semibold"
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
      <aside className="hidden md:flex md:w-[260px] gradient-navy flex-col shrink-0 border-r border-sidebar-border/20">
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
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="relative w-[260px] h-full gradient-navy flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1">
              <img
                src={connectLogoC}
                alt="Connect"
                className="w-full h-full object-contain"
              />
            </div>
            <span
              className="font-bold text-sm tracking-[0.1em] uppercase text-foreground"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Connect
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
