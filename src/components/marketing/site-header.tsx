import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity, Banknote, BarChart3, Blocks, Bot, Boxes, Brain, Briefcase, Building2, Cable,
  Car, Cpu, FileSignature, Gavel, GraduationCap, Handshake, HeartPulse, Landmark,
  LayoutDashboard, LifeBuoy, Menu, Newspaper, Package, Plug, Rocket, Shield, ShoppingCart,
  Store, Users, Video, Wrench, X, Globe2, BookOpen, Code2, Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoAccessButton } from "@/components/marketing/demo-access-button";
import { cn } from "@/lib/utils";

type Item = { icon: React.ElementType; label: string; desc: string };
type Group = { title: string; items: Item[] };

const PLATAFORMA: Group[] = [
  {
    title: "ERP Corporativo",
    items: [
      { icon: Banknote, label: "Financeiro", desc: "Caixa, contas e conciliação" },
      { icon: FileSignature, label: "Contratos", desc: "Ciclo de vida e vigências" },
      { icon: Package, label: "Patrimônio", desc: "Bens, depreciação e inventário" },
      { icon: Users, label: "RH", desc: "Pessoas, jornada e folha" },
      { icon: Handshake, label: "CRM", desc: "Funil, contas e oportunidades" },
      { icon: ShoppingCart, label: "Compras", desc: "Requisições e cotações" },
      { icon: Gavel, label: "Licitações", desc: "Editais, propostas e atas" },
      { icon: Car, label: "Frotas", desc: "Veículos, custos e manutenção" },
      { icon: Boxes, label: "Suprimentos", desc: "Estoque e almoxarifado" },
    ],
  },
  {
    title: "BI & Inteligência",
    items: [
      { icon: Brain, label: "Inteligência Artificial", desc: "Copiloto de gestão" },
      { icon: LayoutDashboard, label: "Dashboards", desc: "Painéis por perfil" },
      { icon: BarChart3, label: "BI", desc: "Indicadores e previsões" },
      { icon: Landmark, label: "Gestão Pública", desc: "Órgãos e autarquias" },
      { icon: Building2, label: "Gestão Privada", desc: "Grupos e holdings" },
    ],
  },
  {
    title: "Integrações",
    items: [
      { icon: Bot, label: "Automação", desc: "Workflows sem código" },
      { icon: Code2, label: "API", desc: "REST documentada" },
      { icon: Store, label: "Marketplace", desc: "Conectores prontos" },
      { icon: Blocks, label: "Extensões", desc: "Módulos sob medida" },
      { icon: Plug, label: "Aplicativos", desc: "Ecossistema Nexus" },
    ],
  },
];

const SOLUCOES: Group[] = [
  {
    title: "Empresas Privadas",
    items: [
      { icon: Building2, label: "Holding", desc: "Consolidação multiempresa" },
      { icon: Cpu, label: "Indústrias", desc: "Custos e produção" },
      { icon: Store, label: "Comércio", desc: "Vendas e estoque" },
      { icon: Briefcase, label: "Prestadores de Serviço", desc: "Contratos e horas" },
    ],
  },
  {
    title: "Setor Público",
    items: [
      { icon: Landmark, label: "Prefeituras", desc: "Orçamento e transparência" },
      { icon: Gavel, label: "Autarquias", desc: "Licitações e convênios" },
      { icon: Building2, label: "Empresas Públicas", desc: "Gestão regulada" },
      { icon: Shield, label: "Militar", desc: "Segurança e hierarquia" },
      { icon: Globe2, label: "Órgãos Governamentais", desc: "Multi-órgão integrado" },
    ],
  },
  {
    title: "Segmentos especiais",
    items: [
      { icon: HeartPulse, label: "Saúde", desc: "Unidades e insumos" },
      { icon: GraduationCap, label: "Educação", desc: "Redes e campi" },
      { icon: Globe2, label: "Gestão Internacional", desc: "Multimoeda e multi-idioma" },
    ],
  },
];

const RECURSOS: Group[] = [
  {
    title: "Aprender",
    items: [
      { icon: GraduationCap, label: "Academy", desc: "Trilhas de capacitação" },
      { icon: Newspaper, label: "Blog", desc: "Gestão e tecnologia" },
      { icon: BookOpen, label: "Base de Conhecimento", desc: "Guias práticos" },
      { icon: Video, label: "Vídeos", desc: "Demonstrações rápidas" },
      { icon: Activity, label: "Webinars", desc: "Sessões ao vivo" },
    ],
  },
  {
    title: "Suporte",
    items: [
      { icon: LifeBuoy, label: "Central de Ajuda", desc: "Atendimento 24/7" },
      { icon: Code2, label: "Documentação API", desc: "Endpoints e webhooks" },
      { icon: Wrench, label: "Treinamentos", desc: "Onboarding assistido" },
      { icon: Package, label: "Downloads", desc: "Apps e utilitários" },
    ],
  },
  {
    title: "Comunidade",
    items: [
      { icon: Rocket, label: "Novidades", desc: "Releases do produto" },
      { icon: Map, label: "Roadmap", desc: "O que vem a seguir" },
      { icon: Handshake, label: "Parceiros", desc: "Rede credenciada" },
      { icon: Users, label: "Comunidade", desc: "Fórum de clientes" },
      { icon: Cable, label: "Casos de Sucesso", desc: "Resultados reais" },
    ],
  },
];

const MENUS: { id: string; label: string; target: string; groups?: Group[] }[] = [
  { id: "plataforma", label: "Plataforma", target: "/#plataforma", groups: PLATAFORMA },
  { id: "solucoes", label: "Soluções", target: "/#solucoes", groups: SOLUCOES },
  { id: "recursos", label: "Recursos", target: "/#recursos", groups: RECURSOS },
  { id: "empresa", label: "Empresa", target: "/#empresa" },
  { id: "cases", label: "Cases", target: "/#cases" },
  { id: "planos", label: "Preços", target: "/#planos" },
  { id: "conhecimento", label: "Conhecimento", target: "/conhecimento" },
  { id: "contato", label: "Contato", target: "/#contato" },
];

function MegaPanel({ groups }: { groups: Group[] }) {
  return (
    <div className="glass absolute top-full left-1/2 z-50 hidden w-[min(72rem,calc(100vw-3rem))] -translate-x-1/2 rounded-3xl p-6 shadow-2xl group-hover:grid group-focus-within:grid lg:grid-cols-3 lg:gap-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">{g.title}</p>
          <ul className="space-y-1">
            {g.items.map((it) => (
              <li key={it.label}>
                <a
                  href="/#plataforma"
                  className="flex items-start gap-3 rounded-xl px-3 py-2 transition-all hover:-translate-y-px hover:bg-accent/60"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                    <it.icon className="size-4" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm font-medium">{it.label}</span>
                    <span className="block text-xs text-muted-foreground">{it.desc}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border/60 bg-background/70 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-18 max-w-[110rem] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <a href="#home" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-semibold">Nexus ERP</span>
            <span className="block text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Gestão inteligente</span>
          </span>
        </a>

        <nav className="mx-auto hidden items-center lg:flex" aria-label="Navegação principal">
          {MENUS.map((m) => (
            <div key={m.id} className="group static">
              <a
                href={m.target}
                className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
              >
                {m.label}
              </a>
              {m.groups && <MegaPanel groups={m.groups} />}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Entrar</Link>
          </Button>
          <DemoAccessButton
            label="Testar grátis"
            className="hidden px-4 py-2 text-xs sm:inline-flex"
          />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="glass mx-4 mb-4 grid gap-1 rounded-2xl p-3 lg:hidden">
          {MENUS.map((m) => (
            <a
              key={m.id}
              href={m.target}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {m.label}
            </a>
          ))}
          <Link to="/auth" className="rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
            Entrar
          </Link>
          <DemoAccessButton label="Testar grátis agora" className="justify-center px-3 py-2 text-sm" />
        </div>
      )}
    </header>
  );
}