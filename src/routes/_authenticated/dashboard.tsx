import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Bar,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building2,
  Clock,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/app/kpi-card";
import { Money } from "@/components/app/money";
import { AccountsOverview } from "@/components/app/accounts-overview";
import { useFinance } from "@/components/app/use-finance";
import { useWorkspace } from "@/components/app/workspace";
import { BRL, compact, monthLabel, signedPercent } from "@/lib/format";
import {
  businessHealth,
  computeKpis,
  forecast,
  lastMonths,
  monthlySeries,
  type Txn,
} from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão executiva · Nexus ERP" },
      {
        name: "description",
        content:
          "Índice de Saúde Empresarial, fluxo de caixa, projeções e indicadores operacionais da sua empresa em um só painel.",
      },
      { property: "og:title", content: "Visão executiva · Nexus ERP" },
      {
        property: "og:description",
        content: "Painel executivo com saúde empresarial, caixa e previsões.",
      },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLORS = ["#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#0EA5E9", "#EC4899", "#14B8A6"];

function DashboardPage() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { data, isLoading } = useFinance();

  const model = useMemo(() => {
    if (!data) return null;
    const txns = data.transactions as unknown as Txn[];
    const months = lastMonths(12);
    const series = monthlySeries(txns, months);
    const opening = data.accounts.reduce((a, b) => a + Number(b.opening_balance ?? 0), 0);
    const kpis = computeKpis(txns, opening, months);
    const health = businessHealth(kpis, series);
    const projection = forecast(series, txns, kpis.balance, 3);

    const catMap = new Map(data.categories.map((c) => [c.id, c]));
    const expenseByCategory = new Map<string, number>();
    const incomeByCategory = new Map<string, number>();
    const currentMonth = months[months.length - 1];
    for (const t of txns) {
      if (t.status !== "paid") continue;
      const key = (t.payment_date ?? t.due_date).slice(0, 7);
      if (key !== currentMonth) continue;
      const name = catMap.get(t.category_id ?? "")?.name ?? "Sem categoria";
      const target = t.direction === "income" ? incomeByCategory : expenseByCategory;
      target.set(name, (target.get(name) ?? 0) + Number(t.amount));
    }

    const top = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

    return {
      series,
      kpis,
      health,
      projection,
      expenseByCategory: top(expenseByCategory),
      incomeByCategory: top(incomeByCategory),
    };
  }, [data]);

  if (!ws.tenantId) {
    return (
      <EmptyState
        title="Nenhuma empresa selecionada"
        description="Crie sua primeira empresa ou entre no ambiente de demonstração para explorar a plataforma."
        action={<Button onClick={() => navigate({ to: "/onboarding" })}>Criar empresa</Button>}
      />
    );
  }

  if (isLoading || !model) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const { kpis, health, series, projection } = model;
  const chartData = series.map((p) => ({ ...p, label: monthLabel(p.month) }));
  const projectionData = [
    ...series.slice(-3).map((p) => ({ label: monthLabel(p.month), real: p.cumulative, previsto: null as number | null })),
    ...projection.map((p) => ({ label: monthLabel(p.month), real: null as number | null, previsto: p.cumulative })),
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Visão executiva</p>
          <h1 className="font-display text-2xl font-semibold">
            {ws.tenant?.trade_name ?? ws.tenant?.legal_name}
          </h1>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/financeiro" })}>
          <Banknote className="size-4" /> Abrir financeiro
        </Button>
      </header>

      <Card className="overflow-hidden border-border/60 bg-surface/60">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-5">
            <HealthGauge score={health.score} tone={health.status.tone} />
            <div className="space-y-1">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Índice de Saúde Empresarial
              </p>
              <p className="font-display text-3xl font-semibold">{health.score}/100</p>
              <Badge
                variant="secondary"
                className={
                  health.status.tone === "positive"
                    ? "bg-positive/15 text-positive"
                    : health.status.tone === "warning"
                      ? "bg-warning/15 text-warning"
                      : "bg-negative/15 text-negative"
                }
              >
                {health.status.label}
              </Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {health.pillars.map((p) => (
              <div key={p.key} className="space-y-1.5 rounded-lg border border-border/50 bg-surface-2/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.label}</span>
                  <span className="numeric text-muted-foreground">{Math.round(p.score)}</span>
                </div>
                <Progress value={p.score} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">{p.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Receita do mês"
          value={kpis.income}
          delta={kpis.incomeDelta}
          tone="positive"
          icon={ArrowUpCircle}
          hint="liquidada · vs. mês anterior"
        />
        <KpiCard
          label="Despesa do mês"
          value={-kpis.expense}
          delta={kpis.expenseDelta != null ? -kpis.expenseDelta : null}
          tone="negative"
          icon={ArrowDownCircle}
          hint="liquidada · vs. mês anterior"
        />
        <KpiCard
          label="Resultado do mês"
          value={kpis.net}
          delta={kpis.netDelta}
          icon={TrendingUp}
          hint={kpis.margin != null ? `Margem ${signedPercent(kpis.margin)}` : "Sem receita no período"}
        />
        <KpiCard
          label="Saldo em caixa"
          value={kpis.balance}
          icon={Banknote}
          hint={
            kpis.runwayMonths != null
              ? `Runway de ${kpis.runwayMonths.toFixed(1).replace(".", ",")} meses`
              : `Burn médio ${BRL(kpis.burn)}`
          }
        />
      </div>

      <AccountsOverview />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/60 bg-surface/60 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Receitas x despesas (12 meses)</CardTitle>
            <CardDescription>Valores realizados por competência de pagamento.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={11} width={54} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Receitas" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="net" name="Resultado" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface/60">
          <CardHeader>
            <CardTitle className="text-base">Situação da carteira</CardTitle>
            <CardDescription>Títulos em aberto neste momento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WalletRow label="A receber" value={kpis.receivable} tone="positive" overdue={kpis.overdueIn} />
            <WalletRow label="A pagar" value={-kpis.payable} tone="negative" overdue={kpis.overdueOut} />
            <div className="rounded-lg border border-border/50 bg-surface-2/50 p-3">
              <p className="text-xs text-muted-foreground">Posição líquida projetada</p>
              <Money
                value={kpis.balance + kpis.receivable - kpis.payable}
                className="mt-1 block text-xl font-semibold"
              />
            </div>
            {data && data.alerts.length > 0 && (
              <div className="space-y-2">
                {data.alerts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                    <div>
                      <p className="font-medium text-foreground">{a.title}</p>
                      {a.message && <p className="text-muted-foreground">{a.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/60 bg-surface/60 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Projeção de caixa (3 meses)</CardTitle>
            <CardDescription>
              Combina a média móvel dos últimos 3 meses com os títulos já agendados.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="fillReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={11} width={54} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="real"
                  name="Realizado"
                  stroke="#8B5CF6"
                  fill="url(#fillReal)"
                  strokeWidth={2}
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="previsto"
                  name="Projetado"
                  stroke="#22C55E"
                  strokeDasharray="6 4"
                  fill="transparent"
                  strokeWidth={2}
                  connectNulls
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface/60">
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
            <CardDescription>Mês corrente.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {model.expenseByCategory.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">
                Sem despesas pagas neste mês.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={model.expenseByCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {model.expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader>
          <CardTitle className="text-base">Evolução do caixa acumulado</CardTitle>
          <CardDescription>Resultado acumulado dos últimos 12 meses.</CardDescription>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={11} width={54} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Acumulado"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function WalletRow({
  label,
  value,
  tone,
  overdue,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
  overdue: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-surface-2/40 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {overdue > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-warning">
            <Clock className="size-3" /> {BRL(overdue)} vencido
          </p>
        )}
      </div>
      <Money value={value} tone={tone} className="text-lg font-semibold" />
    </div>
  );
}

function HealthGauge({ score, tone }: { score: number; tone: "positive" | "warning" | "negative" }) {
  const color =
    tone === "positive" ? "var(--color-positive)" : tone === "warning" ? "var(--color-warning)" : "var(--color-negative)";
  return (
    <div
      className="grid size-28 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, color-mix(in oklab, var(--color-border) 70%, transparent) 0deg)`,
      }}
    >
      <div className="grid size-[5.5rem] place-items-center rounded-full bg-surface">
        <Building2 className="size-7 text-muted-foreground" />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey ?? entry.name} className="numeric flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: entry.color ?? entry.payload?.fill }} />
          {entry.name}: {BRL(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md space-y-3 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
          <Loader2 className="size-6" />
        </div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}