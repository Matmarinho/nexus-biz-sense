import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Clock,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/app/money";
import { useFinance } from "@/components/app/use-finance";
import { BRL, compact, monthLabel } from "@/lib/format";
import { forecast, lastMonths, monthlySeries, type Txn } from "@/lib/analytics";
import {
  accountSnapshots,
  cdiCurve,
  cdiProjection,
  DEFAULT_CDI_ANNUAL,
  totalsOf,
  unassignedTotals,
  type Account,
  type Transfer,
} from "@/lib/accounts-analytics";

const ALL = "__all__";

export function AccountsOverview() {
  const { data, isLoading } = useFinance();
  const months = useMemo(() => lastMonths(24), []);
  const [scope, setScope] = useState<string>(ALL);
  const [month, setMonth] = useState<string>(months[months.length - 1]!);
  const [window, setWindow] = useState<"6" | "12" | "24">("12");
  const [cdiAnnual, setCdiAnnual] = useState<number>(DEFAULT_CDI_ANNUAL);

  const model = useMemo(() => {
    if (!data) return null;
    const txns = data.transactions as unknown as Txn[];
    const accounts = data.accounts as unknown as Account[];
    const transfers = data.transfers as unknown as Transfer[];

    const snaps = accountSnapshots(accounts, txns, transfers, month);
    const scoped = scope === ALL ? snaps : snaps.filter((s) => s.id === scope);
    const totals = totalsOf(scoped, scope === ALL ? unassignedTotals(txns, month) : undefined);

    const scopedTxns = scope === ALL ? txns : txns.filter((t) => t.bank_account_id === scope);
    const windowMonths = months.slice(-Number(window));
    const series = monthlySeries(scopedTxns, windowMonths);
    const projection = forecast(series, scopedTxns, totals.balance, 6);

    return { snaps, scoped, totals, series, projection };
  }, [data, month, months, scope, window]);

  if (isLoading || !model) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const { snaps, scoped, totals, series, projection } = model;
  const chartData = series.map((p) => ({ ...p, label: monthLabel(p.month) }));
  const projectionData = [
    ...series.slice(-3).map((p) => ({ label: monthLabel(p.month), real: p.cumulative, previsto: null as number | null })),
    ...projection.map((p) => ({ label: monthLabel(p.month), real: null as number | null, previsto: p.cumulative })),
  ];
  const investCdi = totals.cdiWeighted || 100;
  const curve = cdiCurve(totals.invested, investCdi, cdiAnnual, 12);
  const p12 = cdiProjection(totals.invested, investCdi, cdiAnnual, 12);
  const p1 = cdiProjection(totals.invested, investCdi, cdiAnnual, 1);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-lg font-semibold">Saldos e movimentação por conta</h2>
          <p className="text-sm text-muted-foreground">
            Entradas e saídas consideram apenas lançamentos liquidados. Títulos a receber e a pagar aparecem separados e
            não impactam o mês enquanto não houver baixa.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Conta</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Consolidado geral</SelectItem>
              {snaps.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mês</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...months].reverse().map((m) => (
                <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Janela dos gráficos</Label>
          <Select value={window} onValueChange={(v) => setWindow(v as typeof window)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ArrowUpCircle}
          title={`Entradas de ${monthLabel(month)}`}
          value={<Money value={totals.monthIn} tone="positive" />}
          hint="somente liquidadas"
        />
        <StatCard
          icon={ArrowDownCircle}
          title={`Saídas de ${monthLabel(month)}`}
          value={<Money value={-totals.monthOut} tone="negative" />}
          hint="somente liquidadas"
        />
        <StatCard
          icon={Wallet}
          title="Saldo total"
          value={<Money value={totals.balance} />}
          hint={scope === ALL ? `${snaps.length} conta(s) + lançamentos sem conta` : "conta selecionada"}
        />
        <StatCard
          icon={PiggyBank}
          title="Cofre / Investimentos"
          value={<Money value={totals.invested} tone="neutral" signed={false} />}
          hint={`${investCdi.toFixed(0)}% do CDI · rende ${BRL(p1.yieldAmount)}/mês`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-surface/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">A receber (não impacta as entradas)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> entra no saldo somente após a baixa
            </p>
            <Money value={totals.receivable} tone="positive" className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-surface/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">A pagar (não impacta as saídas)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> sai do saldo somente após a baixa
            </p>
            <Money value={-totals.payable} tone="negative" className="text-xl font-semibold" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por conta</CardTitle>
          <CardDescription>Saldo, entradas e saídas liquidadas em {monthLabel(month)}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {scoped.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma conta bancária cadastrada. Cadastre em Gestão Financeira · Bancos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="border-b border-border/60 bg-surface-2/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Conta</th>
                    <th className="px-3 py-2 text-right font-medium">Entradas</th>
                    <th className="px-3 py-2 text-right font-medium">Saídas</th>
                    <th className="px-3 py-2 text-right font-medium">Resultado</th>
                    <th className="px-3 py-2 text-right font-medium">Investido</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {scoped.map((s) => (
                    <tr key={s.id} className="border-b border-border/40 last:border-0 hover:bg-accent/40">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.bank_name && (
                            <Badge variant="secondary" className="text-[10px]">{s.bank_name}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right"><Money value={s.monthIn} tone="positive" /></td>
                      <td className="px-3 py-2 text-right"><Money value={-s.monthOut} tone="negative" /></td>
                      <td className="px-3 py-2 text-right"><Money value={s.monthIn - s.monthOut} /></td>
                      <td className="px-3 py-2 text-right numeric text-muted-foreground">
                        {BRL(s.invested)} {s.invested > 0 ? `· ${s.cdiPercent.toFixed(0)}% CDI` : ""}
                      </td>
                      <td className="px-3 py-2 text-right"><Money value={s.balance} /></td>
                    </tr>
                  ))}
                  <tr className="bg-surface-2/50 font-medium">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right"><Money value={totals.monthIn} tone="positive" /></td>
                    <td className="px-3 py-2 text-right"><Money value={-totals.monthOut} tone="negative" /></td>
                    <td className="px-3 py-2 text-right"><Money value={totals.monthNet} /></td>
                    <td className="px-3 py-2 text-right numeric">{BRL(totals.invested)}</td>
                    <td className="px-3 py-2 text-right"><Money value={totals.balance} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/60 bg-surface/60 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Entradas x saídas · {scope === ALL ? "consolidado" : (scoped[0]?.name ?? "conta")}
            </CardTitle>
            <CardDescription>Últimos {window} meses, apenas valores liquidados.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={11} width={54} />
                <Tooltip content={<MiniTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Entradas" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="cumulative" name="Saldo acumulado" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface/60">
          <CardHeader>
            <CardTitle className="text-base">Rendimento do cofre (CDI)</CardTitle>
            <CardDescription>Projeção composta sobre o valor aplicado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">CDI anual (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={cdiAnnual}
                  onChange={(e) => setCdiAnnual(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">% do CDI (média)</Label>
                <Input value={`${investCdi.toFixed(0)}%`} readOnly />
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-surface-2/50 p-3 text-xs">
              <p className="text-muted-foreground">Em 12 meses</p>
              <p className="numeric text-xl font-semibold">{BRL(p12.value)}</p>
              <p className="text-positive">+{BRL(p12.yieldAmount)} de rendimento</p>
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curve}>
                  <defs>
                    <linearGradient id="fillCdi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={10} width={48} domain={["auto", "auto"]} />
                  <Tooltip content={<MiniTooltip />} />
                  <Area type="monotone" dataKey="value" name="Valor projetado" stroke="#22C55E" fill="url(#fillCdi)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader>
          <CardTitle className="text-base">
            Projeção de caixa · {scope === ALL ? "consolidado" : (scoped[0]?.name ?? "conta")}
          </CardTitle>
          <CardDescription>6 meses à frente, combinando média móvel e títulos já agendados.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="fillScope" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={11} width={54} />
              <Tooltip content={<MiniTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="real" name="Realizado" stroke="#8B5CF6" fill="url(#fillScope)" strokeWidth={2} connectNulls />
              <Area type="monotone" dataKey="previsto" name="Projetado" stroke="#22C55E" strokeDasharray="6 4" fill="transparent" strokeWidth={2} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: typeof Banknote;
  title: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="border-border/60 bg-surface/60">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Icon className="size-4 text-primary" />
        <CardTitle className="text-xs text-muted-foreground uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function MiniTooltip({ active, payload, label }: any) {
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
