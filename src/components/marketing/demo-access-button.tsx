import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createDemoAccess } from "@/lib/demo.functions";
import { cn } from "@/lib/utils";

export function DemoAccessButton({
  className,
  label = "Entrar grátis agora",
}: {
  className?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  const startDemo = useServerFn(createDemoAccess);
  const [loading, setLoading] = useState(false);

  async function enter() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      const { email, password } = await startDemo({});
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      toast.success("Bem-vindo à demonstração", {
        description: "Você está na empresa demo com dados de exemplo.",
      });
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      setLoading(false);
      toast.error("Não foi possível abrir a demonstração", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <button
      type="button"
      onClick={enter}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-70",
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {loading ? "Preparando seu acesso..." : label}
    </button>
  );
}
