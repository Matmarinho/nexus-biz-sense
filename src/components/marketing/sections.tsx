import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight, Banknote, BarChart3, Bot, Boxes, Brain, Building2, Check, Cloud, Cpu,
  Database, FileSignature, Gauge, Globe2, Handshake, KeyRound, Landmark, LayoutDashboard,
  Lock, Mail, MapPin, MessageCircle, Package, Phone, Quote, RefreshCw, Server, ShieldCheck,
  Sparkles, TrendingUp, Users, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="max-w-3xl">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-muted-foreground">{text}</p>}
    </Reveal>
  );
}

function Shell({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("relative scroll-mt-24 px-6 py-24 lg:px-10", className)}>
      <div className="mx-auto max-w-[90rem]">{children}</div>
    </section>
  );
}

/* ---------------- Seção 1 — Empresa ---------------- */

const NUMBERS = [
  { value: "+18 mil", label: "Empresas atendidas" },
  { value: "27 países", label: "Presença global" },
  { value: "R$ 42 bi", label: "Volume financeiro gerido" },
  { value: "99,98%", label: "Disponibilidade média" },
];

export function EmpresaSection() {
  return (
    <Shell id="empresa">
      <SectionHead
        eyebrow="Quem é a Nexus"
        title="Uma década construindo gestão de verdade, dentro e fora do setor público."
        text="Nascemos para resolver o que planilhas e sistemas legados não conseguem: dar visão única, confiável e em tempo real sobre a operação inteira de uma organização."
      />
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {[
          { icon: Sparkles, title: "Missão", text: "Transformar dados operacionais em decisões executivas seguras." },
          { icon: Globe2, title: "Visão", text: "Ser a plataforma de gestão de referência para organizações globais." },
          { icon: ShieldCheck, title: "Valores", text: "Transparência, segurança, simplicidade radical e obsessão por resultado." },
        ].map((c, i) => (
          <Reveal key={c.title} delay={i * 90} className="glass rounded-3xl p-7">
            <c.icon className="size-5 text-primary" />
            <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="glass mt-6 grid gap-8 rounded-3xl p-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">Presença global</p>
          <div className="mt-5 grid grid-cols-2 gap-5">
            {NUMBERS.map((n) => (
              <div key={n.label}>
                <p className="numeric font-display text-3xl font-semibold">{n.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-56 overflow-hidden rounded-2xl border border-border/60 bg-surface-2/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_38%,color-mix(in_oklab,var(--primary)_38%,transparent),transparent_42%),radial-gradient(circle_at_52%_62%,color-mix(in_oklab,var(--primary)_30%,transparent),transparent_38%),radial-gradient(circle_at_78%_44%,color-mix(in_oklab,var(--primary)_34%,transparent),transparent_40%)]" />
          <div className="absolute inset-0 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--border)_100%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_100%,transparent)_1px,transparent_1px)] [background-size:44px_44px] opacity-40" />
          <span className="absolute bottom-4 left-5 text-xs text-muted-foreground">Operações ativas em 5 continentes</span>
        </div>
      </Reveal>
    </Shell>
  );
}

/* ---------------- Seção 2 — Plataforma ---------------- */

const MODULES = [
  { icon: Banknote, title: "Financeiro", text: "Contas, fluxo de caixa, conciliação e projeções com sinais + e −." },
  { icon: Package, title: "Compras", text: "Requisições, cotações, aprovações e histórico de fornecedores." },
  { icon: FileSignature, title: "Contratos", text: "Vigências, aditivos, reajustes e alertas automáticos." },
  { icon: Boxes, title: "Patrimônio", text: "Bens, depreciação, inventário e responsáveis." },
  { icon: Workflow, title: "Projetos", text: "Escopo, cronograma, custos e entregas conectadas ao caixa." },
  { icon: BarChart3, title: "BI", text: "Indicadores executivos, comparativos e previsões." },
  { icon: Handshake, title: "CRM", text: "Funil, propostas, contas e receita recorrente." },
  { icon: Users, title: "RH", text: "Pessoas, custos por área e jornada." },
  { icon: LayoutDashboard, title: "Dashboards", text: "Painéis por perfil, com modo privacidade." },
  { icon: Gauge, title: "Controle orçamentário", text: "Orçado x realizado por centro de custo." },
  { icon: Bot, title: "Automação", text: "Workflows, aprovações e rotinas recorrentes." },
  { icon: Brain, title: "Inteligência Artificial", text: "Copiloto que explica variações e sugere ações." },
];

export function PlataformaSection() {
  return (
    <Shell id="plataforma" className="bg-surface/30">
      <SectionHead
        eyebrow="Nossa plataforma"
        title="Módulos que conversam entre si — um dado, uma verdade."
        text="Cada módulo funciona sozinho e fica melhor junto. Ative o que precisa hoje e amplie sem migração."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MODULES.map((m, i) => (
          <Reveal key={m.title} delay={(i % 4) * 70} as="article">
            <div className="glass group h-full rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary transition-transform duration-300 group-hover:scale-110">
                <m.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-base font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{m.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

/* ---------------- Seção 3 — Tecnologia ---------------- */

const TECH = [
  { icon: Cloud, label: "Cloud nativo" },
  { icon: Brain, label: "IA aplicada" },
  { icon: Database, label: "Big Data" },
  { icon: Cpu, label: "Machine Learning" },
  { icon: KeyRound, label: "Blockchain de auditoria" },
  { icon: Server, label: "Alta disponibilidade" },
  { icon: TrendingUp, label: "Escalabilidade elástica" },
  { icon: ShieldCheck, label: "Segurança por padrão" },
  { icon: Check, label: "ISO 27001" },
  { icon: Lock, label: "LGPD & GDPR" },
  { icon: Lock, label: "Criptografia ponta a ponta" },
  { icon: RefreshCw, label: "Backup contínuo" },
];

export function TecnologiaSection() {
  return (
    <Shell id="tecnologia">
      <SectionHead
        eyebrow="Tecnologia"
        title="Infraestrutura de nível bancário, sem complexidade para o seu time."
        text="Arquitetura multi-tenant com isolamento total de dados, trilha de auditoria e autenticação multifator."
      />
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TECH.map((t, i) => (
          <Reveal key={t.label} delay={(i % 4) * 60}>
            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/50 px-4 py-4 transition-colors hover:border-primary/40">
              <t.icon className="size-4 text-primary" />
              <span className="text-sm">{t.label}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

/* ---------------- Seção 4 — Dashboard interativo ---------------- */

const BARS = [42, 58, 51, 74, 63, 88, 71, 96, 82, 105, 93, 118];

export function DashboardSection() {
  const max = Math.max(...BARS);
  return (
    <Shell id="dashboard" className="bg-surface/30">
      <SectionHead
        eyebrow="Dashboard interativo"
        title="A saúde da empresa em uma tela, atualizada em tempo real."
      />
      <Reveal className="glass mt-12 grid gap-6 rounded-[2rem] p-6 lg:grid-cols-[1.6fr_1fr] lg:p-8">
        <div className="rounded-2xl border border-border/60 bg-surface-2/40 p-6">
          <div className="flex flex-wrap items-end gap-6">
            {[
              { label: "Receitas", value: "+ R$ 1.284.900", tone: "text-positive" },
              { label: "Despesas", value: "− R$ 842.310", tone: "text-negative" },
              { label: "Resultado", value: "+ R$ 442.590", tone: "text-positive" },
            ].map((k) => (
              <div key={k.label}>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={cn("numeric font-display text-xl font-semibold", k.tone)}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex h-48 items-end gap-2">
            {BARS.map((b, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-primary/30 to-primary" style={{ height: `${(b / max) * 100}%` }} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Evolução de resultado — últimos 12 meses</p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border/60 bg-surface-2/40 p-6">
            <p className="text-xs text-muted-foreground">Índice de Saúde Empresarial</p>
            <p className="numeric mt-2 font-display text-5xl font-semibold text-primary">87</p>
            <div className="mt-4 space-y-2">
              {[["Rentabilidade", 92], ["Liquidez", 84], ["Pontualidade", 90], ["Crescimento", 79]].map(([l, v]) => (
                <div key={l as string}>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{l}</span><span>{v}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${v as number}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-2/40 p-6">
            <p className="text-xs text-muted-foreground">Runway estimado</p>
            <p className="numeric mt-1 font-display text-2xl font-semibold">14,2 meses</p>
          </div>
        </div>
      </Reveal>
    </Shell>
  );
}

/* ---------------- Seção 5 — Cases ---------------- */

const CASES = [
  { org: "Grupo Andrade Holding", seg: "Holding · 9 empresas", result: "−38% no tempo de fechamento mensal" },
  { org: "Prefeitura de Vale Verde", seg: "Gestão pública", result: "+22% de execução orçamentária no exercício" },
  { org: "Indústria Metalcorp", seg: "Indústria", result: "R$ 3,4 mi economizados em compras" },
  { org: "Rede Vida Saúde", seg: "Saúde · 14 unidades", result: "Inventário patrimonial em 11 dias" },
];

export function CasesSection() {
  return (
    <Shell id="cases">
      <SectionHead eyebrow="Casos de sucesso" title="Resultados que aparecem no caixa, não só no slide." />
      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        {CASES.map((c, i) => (
          <Reveal key={c.org} delay={(i % 2) * 80} as="article">
            <div className="glass flex h-full flex-col gap-3 rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
              <span className="text-[11px] tracking-[0.16em] text-primary uppercase">{c.seg}</span>
              <h3 className="font-display text-lg font-semibold">{c.org}</h3>
              <p className="numeric text-positive">{c.result}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

/* ---------------- Seção 6 — Depoimentos ---------------- */

const QUOTES = [
  { text: "Trocamos seis planilhas e três sistemas por um painel só. O conselho passou a decidir com o mesmo número que a operação enxerga.", who: "Marina Duarte", role: "CFO · Grupo Andrade" },
  { text: "A trilha de auditoria e o controle de acessos resolveram nosso maior risco em prestação de contas.", who: "Rodrigo Salles", role: "Controlador Geral · Prefeitura de Vale Verde" },
  { text: "Implantamos em 21 dias, com o time inteiro treinado. A curva de adoção foi surpreendentemente curta.", who: "Ana Paula Ferraz", role: "Diretora de Operações · Metalcorp" },
];

export function DepoimentosSection() {
  const [i, setI] = useState(0);
  const q = QUOTES[i];
  return (
    <Shell id="depoimentos" className="bg-surface/30">
      <SectionHead eyebrow="Depoimentos" title="Quem usa, conta melhor." />
      <Reveal className="glass mt-12 rounded-[2rem] p-8 lg:p-12">
        <Quote className="size-8 text-primary" />
        <p className="mt-6 max-w-4xl font-display text-xl leading-relaxed text-balance sm:text-2xl">{q.text}</p>
        <div className="mt-8 flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
            {q.who.split(" ").slice(0, 2).map((n) => n[0]).join("")}
          </span>
          <div>
            <p className="text-sm font-medium">{q.who}</p>
            <p className="text-xs text-muted-foreground">{q.role}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {QUOTES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Depoimento ${idx + 1}`}
                className={cn("h-2 rounded-full transition-all", idx === i ? "w-8 bg-primary" : "w-2 bg-border")}
              />
            ))}
          </div>
        </div>
      </Reveal>
    </Shell>
  );
}

/* ---------------- Seção 7 — Planos ---------------- */

const PLANS = [
  { name: "Essencial", price: "R$ 49,90", per: "/mês por empresa", users: "Até 5 usuários", storage: "10 GB", ai: "IA básica", support: "Suporte por e-mail", features: ["Financeiro completo", "Dashboards executivos", "1 workspace", "Relatórios essenciais"] },
  { name: "Professional", price: "R$ 149,90", per: "/mês por empresa", users: "Até 20 usuários", storage: "100 GB", ai: "IA avançada", support: "Suporte prioritário", features: ["Tudo do Essencial", "CRM e Projetos", "Contratos e centros de custo", "Automações e API"], highlight: true },
  { name: "Enterprise", price: "R$ 399,90", per: "/mês por empresa", users: "Usuários ilimitados", storage: "1 TB", ai: "IA corporativa + copiloto", support: "CSM dedicado", features: ["Tudo do Professional", "Multiempresa e holding", "Login personalizado", "SSO e MFA obrigatório"] },
  { name: "Government", price: "Sob consulta", per: "contratação pública", users: "Por órgão", storage: "Dedicado", ai: "IA com dados isolados", support: "SLA contratual", features: ["Licitações e convênios", "Transparência e prestação de contas", "Integrações governamentais", "Auditoria estendida"] },
  { name: "Military", price: "Sob consulta", per: "ambiente restrito", users: "Por unidade", storage: "Soberano", ai: "IA on-premise", support: "Suporte classificado", features: ["Hierarquia e sigilo", "Ambiente segregado", "Criptografia reforçada", "Implantação assistida"] },
];

const COMPARE = [
  ["Usuários", "5", "20", "Ilimitado", "Por órgão", "Por unidade"],
  ["Armazenamento", "10 GB", "100 GB", "1 TB", "Dedicado", "Soberano"],
  ["Integrações", "Básicas", "API + webhooks", "Completa", "Governamentais", "Sob demanda"],
  ["IA", "Básica", "Avançada", "Corporativa", "Isolada", "On-premise"],
  ["Suporte", "E-mail", "Prioritário", "CSM dedicado", "SLA contratual", "Classificado"],
];

export function PlanosSection() {
  return (
    <Shell id="planos">
      <SectionHead
        eyebrow="Planos"
        title="Preço transparente, sem surpresa na renovação."
        text="Assinatura anual com 15% de desconto. Migre de plano a qualquer momento, sem perder histórico."
      />
      <div className="mt-12 grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={(i % 5) * 60} as="article">
            <div className={cn(
              "glass flex h-full flex-col rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1",
              p.highlight && "border-primary/50 shadow-[0_0_0_1px_var(--color-primary)]",
            )}>
              {p.highlight && <span className="mb-3 w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground uppercase">Mais escolhido</span>}
              <h3 className="font-display text-lg font-semibold">{p.name}</h3>
              <p className="numeric mt-3 font-display text-2xl font-semibold">{p.price}</p>
              <p className="text-xs text-muted-foreground">{p.per}</p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {[p.users, p.storage, p.ai, p.support, ...p.features].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? "default" : "outline"} className="mt-6 w-full">
                <a href="#contato">Solicitar proposta</a>
              </Button>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="glass mt-8 overflow-x-auto rounded-3xl p-2">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">Comparação completa entre planos Nexus ERP</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="p-4 font-medium">Comparativo</th>
              {PLANS.map((p) => <th key={p.name} scope="col" className="p-4 font-medium text-foreground">{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row) => (
              <tr key={row[0]} className="border-t border-border/60">
                <th scope="row" className="p-4 text-left font-normal text-muted-foreground">{row[0]}</th>
                {row.slice(1).map((cell, idx) => <td key={idx} className="p-4">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </Shell>
  );
}

/* ---------------- Seção 8 — Contato ---------------- */

export function ContatoSection() {
  const [sending, setSending] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      e.currentTarget?.reset?.();
      toast.success("Solicitação registrada", {
        description: "Nosso time comercial entra em contato em até 1 dia útil.",
      });
    }, 700);
  }

  return (
    <Shell id="contato" className="bg-surface/30">
      <SectionHead
        eyebrow="Contato"
        title="Fale com um consultor e veja a Nexus rodando com os seus números."
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Reveal className="glass rounded-3xl p-7">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-nome">Nome</Label>
              <Input id="c-nome" name="nome" required autoComplete="name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-empresa">Empresa / Órgão</Label>
              <Input id="c-empresa" name="empresa" required autoComplete="organization" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-email">E-mail corporativo</Label>
              <Input id="c-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-tel">Telefone / WhatsApp</Label>
              <Input id="c-tel" name="telefone" autoComplete="tel" />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="c-msg">Como podemos ajudar?</Label>
              <Textarea id="c-msg" name="mensagem" rows={4} />
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button type="submit" disabled={sending}>
                {sending ? "Enviando…" : "Agendar demonstração"} <ArrowRight className="size-4" />
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to="/auth">Já sou cliente</Link>
              </Button>
            </div>
          </form>
        </Reveal>

        <div className="grid gap-4">
          <Reveal className="glass rounded-3xl p-7">
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3"><Phone className="size-4 text-primary" /> +55 (11) 4000-1200</li>
              <li className="flex gap-3"><MessageCircle className="size-4 text-primary" /> WhatsApp comercial</li>
              <li className="flex gap-3"><Mail className="size-4 text-primary" /> comercial@nexuserp.com</li>
              <li className="flex gap-3"><MapPin className="size-4 text-primary" /> Av. Paulista, 1000 — São Paulo, BR</li>
              <li className="flex gap-3"><Landmark className="size-4 text-primary" /> Atendimento a órgãos públicos</li>
              <li className="flex gap-3"><Building2 className="size-4 text-primary" /> Chat online · seg a sex, 8h–20h</li>
            </ul>
          </Reveal>
          <Reveal className="relative min-h-52 overflow-hidden rounded-3xl border border-border/60 bg-surface-2/40">
            <div className="absolute inset-0 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--border)_100%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_100%,transparent)_1px,transparent_1px)] [background-size:36px_36px] opacity-50" />
            <span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary/20 text-primary">
              <MapPin className="size-5" />
            </span>
            <span className="absolute bottom-4 left-5 text-xs text-muted-foreground">Sede Nexus ERP · São Paulo</span>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}