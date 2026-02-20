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
import connectLogo from "@/assets/connect-logo.jpg";

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

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-6 py-6">
        <img
          src={connectLogo}
          alt="Connect"
          className="w-10 h-10 object-contain rounded-xl ring-2 ring-sidebar-accent/30"
        />
        <div>
          <span className="text-sidebar-foreground font-bold text-base tracking-wide">
            Connect
          </span>
          <p className="text-sidebar-foreground/40 text-[10px] font-medium uppercase tracking-[0.2em]">
            Church Management
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {[
          ...navItems,
          ...(user?.id === ADMIN_USER_ID
            ? [{ href: "/admin", label: "Administração", icon: Shield }]
            : []),
        ].map(({ href, label, icon: Icon }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 gradient-gold rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon className="w-[18px] h-[18px] relative z-10" />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <div className="px-4 py-3 rounded-xl bg-sidebar-accent/20 mb-2">
          <p className="text-sidebar-foreground/50 text-xs truncate">
            {user?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-xl"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 gradient-navy flex-col shrink-0 border-r border-sidebar-border/30">
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
              className="relative w-64 h-full gradient-navy flex flex-col"
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
              src={connectLogo}
              alt="Connect"
              className="w-8 h-8 object-contain rounded-lg"
            />
            <span className="font-bold text-sm tracking-wide">Connect</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-6 md:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
