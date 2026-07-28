import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, LineChart, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus ERP · Gestão empresarial com inteligência" },
      {
        name: "description",
        content:
          "Plataforma multiempresa de gestão financeira com Índice de Saúde Empresarial, fluxo de caixa em tempo real e permissões granulares.",
      },
      { property: "og:title", content: "Nexus ERP · Gestão empresarial com inteligência" },
      {
        property: "og:description",
        content: "Financeiro, indicadores e previsões em uma plataforma multiempresa segura.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Wallet, title: "Financeiro completo", text: "Contas, categorias, recebíveis e obrigações com sinais claros de + e −." },
  { icon: LineChart, title: "Inteligência de negócio", text: "Índice de Saúde Empresarial, projeções de caixa e alertas automáticos." },
  { icon: ShieldCheck, title: "Multiempresa seguro", text: "Isolamento total de dados e permissões por módulo e ação." },
];

function Landing() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 left-1/3 size-[34rem] rounded-full bg-primary/20 blur-[140px]" />
      <main className="relative mx-auto max-w-5xl px-6 py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
          Plataforma global de gestão empresarial
        </span>
        <h1 className="mt-6 max-w-3xl font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          A gestão da sua empresa, traduzida em decisões.
        </h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          Nexus ERP reúne financeiro, indicadores operacionais e previsões em um único painel executivo —
          com controle total de acessos e suporte a múltiplas empresas.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Acessar plataforma <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Ver demonstração
          </Link>
        </div>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-xl border border-border/60 bg-surface/60 p-5">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-3 font-medium">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
