import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Boxes, Brain, Building2, Clock, Code2, Compass,
  FileSignature, GraduationCap, LifeBuoy, PlayCircle, Search, Shield, Sparkles, Target,
  TrendingUp, Users, Wallet, Workflow,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type Article = {
  title: string;
  desc: string;
  cat: string;
  minutes: number;
  level: "Essencial" | "Intermediário" | "Avançado";
  icon: React.ElementType;
};

export const KNOWLEDGE_CATEGORIES = [
  { id: "todos", label: "Todos", icon: Compass },
  { id: "primeiros-passos", label: "Primeiros passos", icon: Sparkles },
  { id: "financeiro", label: "Gestão Financeira", icon: Wallet },
  { id: "comercial", label: "Comercial e CRM", icon: Target },
  { id: "estoque", label: "Estoque e Compras", icon: Boxes },
  { id: "bi", label: "BI e Indicadores", icon: BarChart3 },
  { id: "seguranca", label: "Segurança e acessos", icon: Shield },
  { id: "api", label: "API e integrações", icon: Code2 },
];

const ARTICLES: Article[] = [
  { title: "Como criar sua empresa e convidar o time", desc: "Do primeiro login ao workspace configurado com papéis e permissões por módulo.", cat: "primeiros-passos", minutes: 4, level: "Essencial", icon: Building2 },
  { title: "Tour guiado pelo Dashboard Executivo", desc: "Entenda o Índice de Saúde do Negócio, tendências e alertas inteligentes.", cat: "primeiros-passos", minutes: 6, level: "Essencial", icon: TrendingUp },
  { title: "Lançamentos financeiros no modo planilha", desc: "Edição inline, colagem em massa, filtros por situação e atalhos de teclado.", cat: "financeiro", minutes: 7, level: "Intermediário", icon: Wallet },
  { title: "Parcelamentos e recorrências", desc: "Repita lançamentos por mês, semana ou ano e gerencie a série inteira.", cat: "financeiro", minutes: 5, level: "Intermediário", icon: Clock },
  { title: "Open Finance: conectar bancos e ler o score", desc: "Saldo, limite de cartão, rendimentos e percentual do CDI em um só painel.", cat: "financeiro", minutes: 8, level: "Avançado", icon: Sparkles },
  { title: "Pipeline de vendas que fecha negócio", desc: "Kanban de oportunidades, previsão ponderada e atividades por responsável.", cat: "comercial", minutes: 6, level: "Intermediário", icon: Target },
  { title: "Cadastros que sustentam a operação", desc: "Clientes, fornecedores, produtos e categorias sem duplicidade.", cat: "comercial", minutes: 4, level: "Essencial", icon: Users },
  { title: "Controle de estoque com movimentações", desc: "Entradas, saídas e ajustes atualizando saldo automaticamente.", cat: "estoque", minutes: 5, level: "Intermediário", icon: Boxes },
  { title: "Ciclo de compras: da requisição ao recebimento", desc: "Pedidos, itens, custos e impacto direto no fluxo de caixa.", cat: "estoque", minutes: 6, level: "Intermediário", icon: Workflow },
  { title: "Construindo indicadores executivos", desc: "Como o BI calcula liquidez, inadimplência e projeções de caixa.", cat: "bi", minutes: 9, level: "Avançado", icon: BarChart3 },
  { title: "Copiloto de IA aplicado à gestão", desc: "Perguntas em linguagem natural sobre seus próprios números.", cat: "bi", minutes: 5, level: "Avançado", icon: Brain },
  { title: "MFA obrigatório e política de senhas", desc: "Ative segundo fator por empresa e bloqueie senhas vazadas.", cat: "seguranca", minutes: 4, level: "Essencial", icon: Shield },
  { title: "Trilha de auditoria e logs do sistema", desc: "Quem fez o quê, quando e de onde — com exportação CSV/PDF.", cat: "seguranca", minutes: 5, level: "Avançado", icon: FileSignature },
  { title: "Autenticação e primeiros endpoints da API", desc: "Chaves, escopos e chamadas REST autenticadas por empresa.", cat: "api", minutes: 7, level: "Avançado", icon: Code2 },
  { title: "Webhooks e automações sem código", desc: "Dispare fluxos quando um lançamento vence ou um negócio é ganho.", cat: "api", minutes: 6, level: "Intermediário", icon: Workflow },
];

const TRACKS = [
  { title: "Trilha Fundamentos", desc: "Configure a empresa, cadastros e o dashboard.", lessons: 12, progress: 100, icon: GraduationCap },
  { title: "Trilha Financeira", desc: "Contas, conciliação, parcelamentos e caixa.", lessons: 18, progress: 72, icon: Wallet },
  { title: "Trilha Comercial", desc: "CRM, propostas, vendas e metas de equipe.", lessons: 14, progress: 45, icon: Target },
  { title: "Trilha Dados & IA", desc: "BI, previsões e copiloto de gestão.", lessons: 10, progress: 28, icon: Brain },
];

const FAQ = [
  { q: "Preciso instalar algo para usar o Nexus ERP?", a: "Não. A plataforma roda 100% no navegador, com atualizações contínuas e sem downtime perceptível. Basta acessar com seu e-mail corporativo." },
  { q: "Como funciona o acesso de demonstração gratuito?", a: "Criamos uma conta temporária dentro da empresa demo, com dados de exemplo já populados. Você navega por todos os módulos sem cartão e sem cadastro." },
  { q: "Meus dados ficam isolados de outras empresas?", a: "Sim. Cada empresa é um tenant com isolamento no banco por políticas de segurança em nível de linha; nenhum usuário enxerga dados fora dos workspaces em que foi convidado." },
  { q: "Consigo controlar o que cada pessoa acessa?", a: "Sim. As permissões são por módulo e por ação (visualizar, criar, editar, excluir, aprovar, exportar), atribuídas por papel dentro de cada empresa." },
  { q: "Existe API para integrar com meus sistemas?", a: "Sim. Há endpoints REST autenticados por empresa e webhooks para eventos financeiros, comerciais e de estoque." },
  { q: "Como é feita a migração dos meus dados atuais?", a: "Importamos planilhas e bases legadas em lote, com validação prévia e conferência assistida pelo time de onboarding." },
];

function useCountUp(target: number, run: boolean, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setRun(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setRun(true), io.disconnect()), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const n = useCountUp(value, run);
  return (
    <div ref={ref} className="glass rounded-2xl p-5">
      <p className="numeric font-display text-3xl font-semibold">
        {n.toLocaleString("pt-BR")}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const PLACEHOLDERS = [
  "como lançar uma despesa parcelada?",
  "conectar banco no open finance",
  "criar permissão só de leitura",
  "exportar auditoria em CSV",
  "webhook de negócio ganho",
];

export function KnowledgeHub() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todos");
  const [ph, setPh] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPh((v) => (v + 1) % PLACEHOLDERS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ARTICLES.filter(
      (a) =>
        (cat === "todos" || a.cat === cat) &&
        (!term || `${a.title} ${a.desc}`.toLowerCase().includes(term)),
    );
  }, [q, cat]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-32 pb-16 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_18%_18%,color-mix(in_oklab,var(--primary)_26%,transparent),transparent_45%),radial-gradient(circle_at_82%_10%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_40%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:56px_56px]"
        />
        <div className="relative mx-auto max-w-[80rem] text-center">
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
              <BookOpen className="size-3.5 text-primary" /> Central de Conhecimento Nexus
            </span>
            <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl leading-[1.06] font-semibold text-balance sm:text-6xl">
              Tudo o que você precisa para dominar a plataforma.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
              Guias práticos, trilhas de capacitação, documentação técnica e respostas rápidas —
              organizados por módulo e por nível de profundidade.
            </p>
          </Reveal>

          <Reveal delay={120} className="mx-auto mt-9 max-w-2xl">
            <div className="glass group flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-all focus-within:-translate-y-0.5 focus-within:shadow-2xl">
              <Search className="size-5 shrink-0 text-primary" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Pesquisar na central de conhecimento"
                placeholder={`Pesquise: ${PLACEHOLDERS[ph]}`}
                className="h-11 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
              />
              <span className="hidden shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] text-muted-foreground sm:block">
                {results.length} resultados
              </span>
            </div>
          </Reveal>

          <Reveal delay={200} className="mt-6 flex flex-wrap justify-center gap-2">
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all hover:-translate-y-0.5",
                  cat === c.id
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <c.icon className="size-3.5" />
                {c.label}
              </button>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Artigos */}
      <section id="artigos" className="scroll-mt-24 px-6 pb-20 lg:px-10">
        <div className="mx-auto max-w-[80rem]">
          {results.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center">
              <LifeBuoy className="mx-auto size-6 text-primary" />
              <p className="mt-3 font-display text-lg font-semibold">Nada encontrado para “{q}”.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente outro termo ou fale com o suporte — respondemos em minutos.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((a, i) => (
                <Reveal key={a.title} delay={Math.min(i, 6) * 60}>
                  <article className="glass group relative h-full overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-24 -right-20 size-48 rounded-full bg-primary/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary transition-transform duration-300 group-hover:scale-110">
                        <a.icon className="size-5" />
                      </span>
                      <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                        {a.level}
                      </span>
                    </div>
                    <h3 className="relative mt-4 font-display text-lg leading-snug font-semibold">{a.title}</h3>
                    <p className="relative mt-2 text-sm text-muted-foreground">{a.desc}</p>
                    <div className="relative mt-5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" /> {a.minutes} min de leitura
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-1">
                        Ler agora <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trilhas */}
      <section id="trilhas" className="scroll-mt-24 px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[80rem]">
          <Reveal className="max-w-3xl">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">Nexus Academy</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">
              Trilhas de capacitação que levam o time do zero à autonomia.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {TRACKS.map((t, i) => (
              <Reveal key={t.title} delay={i * 80}>
                <div className="glass group h-full rounded-3xl p-6 transition-all hover:-translate-y-1.5">
                  <t.icon className="size-5 text-primary" />
                  <h3 className="mt-4 font-display text-lg font-semibold">{t.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
                  <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-out"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.lessons} aulas · {t.progress}% concluído
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat value={240} suffix="+" label="Artigos publicados" />
            <Stat value={54} suffix=" trilhas" label="Aulas em vídeo" />
            <Stat value={18} suffix=" min" label="Tempo médio de resposta" />
            <Stat value={98} suffix="%" label="Satisfação no suporte" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 px-6 py-20 lg:px-10">
        <div className="mx-auto grid max-w-[80rem] gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">Dúvidas frequentes</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">
              Respostas diretas, sem letras miúdas.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Não achou o que procurava? A central de ajuda funciona 24/7 e o time de especialistas
              acompanha cada empresa no onboarding.
            </p>
            <a
              href="/#contato"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              Falar com um especialista <ArrowRight className="size-4" />
            </a>
          </Reveal>
          <Reveal delay={120} className="glass rounded-3xl p-4 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((f, i) => (
                <AccordionItem key={f.q} value={`i${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 lg:px-10">
        <Reveal className="glass mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-6 rounded-3xl p-10">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">Aprender fazendo</p>
            <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold text-balance sm:text-3xl">
              Abra a plataforma agora e siga os guias com dados reais de demonstração.
            </h2>
          </div>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-accent"
          >
            <PlayCircle className="size-4" /> Entrar na demonstração
          </a>
        </Reveal>
      </section>
    </div>
  );
}
