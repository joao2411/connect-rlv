import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import connectLogoC from "@/assets/connect-logo-c.png";
import connectSheep from "@/assets/connect-sheep.png";

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

  const sideChars = "W E   A R E   C O N N E C T".split("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Left vertical text */}
      <div className="absolute left-5 md:left-10 top-1/2 -translate-y-1/2 hidden md:block">
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 0.8, x: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-foreground text-xs font-bold tracking-[0.35em] select-none"
          style={{
            writingMode: "vertical-lr",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.35em",
          }}
        >
          W E &nbsp; A R E &nbsp; C O N N E C T
        </motion.p>
      </div>

      {/* Right vertical text */}
      <div className="absolute right-5 md:right-10 top-1/2 -translate-y-1/2 hidden md:block">
        <motion.p
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 0.8, x: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-foreground text-xs font-bold tracking-[0.35em] select-none"
          style={{
            writingMode: "vertical-lr",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.35em",
          }}
        >
          W E &nbsp; A R E &nbsp; C O N N E C T
        </motion.p>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-4">
        {/* CONNECT text on top */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-foreground font-medium tracking-[0.5em] uppercase text-xl md:text-2xl mb-8 md:mb-12 select-none"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          C O N N E C T
        </motion.h1>

        {/* Logo C — big and centered */}
        <motion.img
          src={connectLogoC}
          alt="Connect"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2, type: "spring", bounce: 0.25 }}
          className="w-44 h-44 md:w-56 md:h-56 lg:w-64 lg:h-64 object-contain cursor-pointer"
          onClick={() => setShowLogin(true)}
        />

        {/* Sheep */}
        <motion.img
          src={connectSheep}
          alt="Ovelha"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-14 h-14 md:w-20 md:h-20 object-contain mt-10 md:mt-16 mb-8 md:mb-10"
        />

        {/* Login card — click logo or auto-show */}
        <AnimatePresence>
          {showLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
              className="w-full"
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
          ) : (
            <motion.button
              key="enter-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.7 }}
              onClick={() => setShowLogin(true)}
              className="text-muted-foreground text-sm font-medium tracking-widest uppercase hover:text-foreground transition-colors duration-300"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Toque para entrar
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
