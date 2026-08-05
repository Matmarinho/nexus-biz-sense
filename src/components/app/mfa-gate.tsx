import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/app/workspace";

export function MfaGate({ children }: { children: React.ReactNode }) {
  const ws = useWorkspace();
  const required =
    ((ws.tenant?.settings as Record<string, unknown> | null)?.["require_mfa"] as boolean | undefined) === true;
  const [hasFactor, setHasFactor] = useState<boolean | null>(null);

  useEffect(() => {
    if (!required) return;
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setHasFactor((data?.totp ?? []).some((f) => f.status === "verified"));
    });
  }, [required]);

  if (!required || hasFactor !== false) return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border/60 bg-surface/60 p-8 text-center">
      <ShieldAlert className="mx-auto size-8 text-primary" />
      <h1 className="font-display text-xl font-semibold">Verificação em dois fatores obrigatória</h1>
      <p className="text-sm text-muted-foreground">
        Esta empresa exige autenticação em dois fatores. Cadastre um aplicativo autenticador para continuar
        acessando os dados do workspace.
      </p>
      <Button asChild>
        <Link to="/configuracoes">Configurar agora</Link>
      </Button>
    </div>
  );
}