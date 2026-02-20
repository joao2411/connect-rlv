import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import connectLogo from "@/assets/connect-logo.jpg";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sideTextLeft = "WE ARE CONNECT".split("");
  const sideTextRight = "WE ARE CONNECT".split("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Left side text - WE ARE CONNECT */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-[10px]"
      >
        {sideTextLeft.map((char, i) => (
          <motion.span
            key={`left-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 0.3, delay: 0.6 + i * 0.04 }}
            className="text-foreground text-[11px] font-medium tracking-[0.3em] select-none"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.div>

      {/* Right side text - WE ARE CONNECT */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-[10px]"
      >
        {sideTextRight.map((char, i) => (
          <motion.span
            key={`right-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 0.3, delay: 0.6 + i * 0.04 }}
            className="text-foreground text-[11px] font-medium tracking-[0.3em] select-none"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* CONNECT title on top */}
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-foreground text-2xl md:text-3xl font-medium tracking-[0.45em] uppercase mb-10 md:mb-14 select-none"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          CONNECT
        </motion.h1>

        {/* Big logo C in center */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", bounce: 0.3 }}
          className="mb-10 md:mb-14 cursor-pointer"
          onClick={() => setShowLogin(true)}
        >
          <img
            src={connectLogo}
            alt="Connect Logo"
            className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 object-contain drop-shadow-2xl"
          />
        </motion.div>

        {/* Sheep icon placeholder (small) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8 md:mb-12"
        >
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" className="text-foreground opacity-60">
            <ellipse cx="16" cy="10" rx="10" ry="8" fill="currentColor" opacity="0.15" />
            <ellipse cx="16" cy="10" rx="7" ry="6" fill="currentColor" opacity="0.25" />
            <circle cx="12" cy="8" r="3" fill="currentColor" opacity="0.2" />
            <circle cx="20" cy="8" r="3" fill="currentColor" opacity="0.2" />
            <circle cx="16" cy="6" r="3.5" fill="currentColor" opacity="0.2" />
            <circle cx="14" cy="11" r="2.5" fill="currentColor" opacity="0.2" />
            <circle cx="18" cy="11" r="2.5" fill="currentColor" opacity="0.2" />
            {/* Head */}
            <ellipse cx="22" cy="10" rx="3" ry="2.5" fill="currentColor" opacity="0.3" />
            <circle cx="23.5" cy="9" r="0.7" fill="currentColor" opacity="0.5" />
            {/* Legs */}
            <rect x="12" y="16" width="1.5" height="5" rx="0.75" fill="currentColor" opacity="0.35" />
            <rect x="15" y="16" width="1.5" height="5" rx="0.75" fill="currentColor" opacity="0.35" />
            <rect x="18" y="16" width="1.5" height="5" rx="0.75" fill="currentColor" opacity="0.35" />
          </svg>
        </motion.div>

        {/* Login form - appears on click or auto */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={showLogin ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: showLogin ? 0 : 0.6 }}
          className="w-full max-w-sm px-4"
        >
          <div className="glass-card p-8">
            <h2
              className="text-xl font-semibold text-foreground mb-1 text-center"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Entrar
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Acesse com suas credenciais
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-semibold mt-2 gradient-gold text-accent-foreground hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? "Aguarde..." : "Entrar"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
