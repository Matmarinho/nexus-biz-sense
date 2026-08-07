import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, ChevronDown, PlayCircle } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { DemoAccessButton } from "@/components/marketing/demo-access-button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { VideoBackdrop } from "@/components/marketing/video-backdrop";
import {
  CasesSection,
  ContatoSection,
  DashboardSection,
  DepoimentosSection,
  EmpresaSection,
  PlanosSection,
  PlataformaSection,
  TecnologiaSection,
} from "@/components/marketing/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus ERP · Plataforma global de gestão empresarial" },
      {
        name: "description",
        content:
          "ERP corporativo multiempresa com IA: financeiro, contratos, CRM, projetos, BI e dashboards em tempo real para empresas privadas e órgãos públicos.",
      },
      { property: "og:title", content: "Nexus ERP · Plataforma global de gestão empresarial" },
      {
        property: "og:description",
        content: "ERP corporativo multiempresa com IA: financeiro, contratos, CRM, projetos, BI e dashboards em tempo real para empresas privadas e órgãos públicos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="bg-background">
      <SiteHeader />

      <main>
        <section id="home" className="relative flex min-h-[100svh] items-center overflow-hidden">
          <VideoBackdrop />
          <div className="relative mx-auto w-full max-w-[90rem] px-6 pt-28 pb-24 lg:px-10">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
              Plataforma global de gestão empresarial com IA
            </span>
            <h1 className="mt-7 max-w-4xl font-display text-4xl leading-[1.05] font-semibold text-balance sm:text-6xl xl:text-7xl">
              A gestão da sua organização, traduzida em decisões.
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Financeiro, contratos, CRM, projetos, patrimônio e BI em uma única plataforma
              multiempresa — segura, auditável e pronta para operações globais.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <DemoAccessButton label="Entrar grátis agora e conhecer por dentro" />
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                Entrar <ArrowRight className="size-4" />
              </Link>
              <a
                href="#contato"
                className="glass inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all hover:-translate-y-0.5"
              >
                Solicitar demonstração
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sem cartão, sem cadastro — acesso imediato à empresa demo com dados de exemplo.
            </p>
          </div>
          <a
            href="#empresa"
            aria-label="Rolar para a próxima seção"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-border/60 p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className="size-5" />
          </a>
        </section>

        <EmpresaSection />
        <PlataformaSection />
        <TecnologiaSection />
        <DashboardSection />
        <CasesSection />
        <DepoimentosSection />
        <PlanosSection />
        <ContatoSection />
      </main>

      <SiteFooter />
    </div>
  );
}
