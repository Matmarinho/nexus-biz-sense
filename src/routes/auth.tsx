import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Nexus ERP" },
      {
        name: "description",
        content:
          "Acesse a plataforma Nexus ERP: gestão financeira multiempresa, indicadores em tempo real e inteligência de negócios.",
      },
      { property: "og:title", content: "Entrar · Nexus ERP" },
      {
        property: "og:description",
        content: "Login seguro da plataforma de gestão empresarial Nexus ERP.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Não foi possível entrar", { description: error.message });
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível criar a conta", { description: error.message });
    toast.success("Conta criada", { description: "Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada." });
    const { data } = await supabase.auth.getSession();
    if (data.session) navigate({ to: "/onboarding", replace: true });
  }

  async function google() {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleLoading(false);
      return toast.error("Falha no login com Google", { description: String(result.error) });
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-16 size-[26rem] rounded-full bg-primary/15 blur-[130px]" />

      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden flex-col justify-center gap-6 lg:flex">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Plataforma global de gestão empresarial
          </span>
          <h1 className="font-display text-4xl leading-tight font-semibold text-balance">
            Decisões financeiras com clareza absoluta.
          </h1>
          <p className="max-w-md text-muted-foreground">
            Multiempresa, permissões granulares, fluxo de caixa em tempo real e um Índice de Saúde
            Empresarial que traduz seus números em direção.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              "Isolamento total de dados entre empresas",
              "Receitas em verde com +, despesas em vermelho com −",
              "Projeções de caixa e alertas inteligentes",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-positive" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-2xl border border-border/60 p-6 shadow-2xl sm:p-8">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={signIn} className="space-y-4">
                <Field id="email" label="E-mail corporativo" icon={Mail}>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    className="pl-9"
                  />
                </Field>
                <Field id="password" label="Senha" icon={Lock}>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  Entrar na plataforma
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={signUp} className="space-y-4">
                <Field id="name" label="Nome completo">
                  <Input
                    id="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </Field>
                <Field id="email-up" label="E-mail corporativo" icon={Mail}>
                  <Input
                    id="email-up"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    className="pl-9"
                  />
                </Field>
                <Field id="password-up" label="Senha" icon={Lock}>
                  <Input
                    id="password-up"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="pl-9"
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  Criar minha conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google} disabled={googleLoading}>
            {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            Continuar com Google
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar você concorda com os termos de uso e a política de privacidade.{" "}
            <Link to="/" className="underline underline-offset-2">
              Voltar ao site
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        {children}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}