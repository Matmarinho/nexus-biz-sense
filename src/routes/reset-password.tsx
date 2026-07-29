import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha · Nexus ERP" },
      { name: "description", content: "Defina uma nova senha para acessar sua conta Nexus ERP com segurança." },
      { property: "og:title", content: "Redefinir senha · Nexus ERP" },
      { property: "og:description", content: "Recuperação segura de acesso à plataforma Nexus ERP." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setReady(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("Não foi possível redefinir", { description: error.message });
    toast.success("Senha redefinida com sucesso");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="glass w-full max-w-md space-y-5 rounded-2xl border border-border/60 p-8">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" />
          <h1 className="font-display text-xl font-semibold">Definir nova senha</h1>
        </div>
        {!ready && (
          <p className="text-sm text-muted-foreground">
            Abra esta página pelo link enviado por e-mail para validar a recuperação.
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || password.length < 8}>
          {loading && <Loader2 className="size-4 animate-spin" />} Salvar nova senha
        </Button>
      </form>
    </div>
  );
}