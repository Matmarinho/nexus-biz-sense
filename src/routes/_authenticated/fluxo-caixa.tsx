import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Scale, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/app/kpi-card";
import { useFinance } from "@/components/app/use-finance";
import { BRL, compact, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de caixa · Nexus ERP" },
      { name: "description", content: "Entradas, saídas, saldo acumulado e projeção de caixa por competência." },
      { property: "og:title", content: "Fluxo de caixa · Nexus ERP" },
      { property: "og:description", content: "Projeção de caixa com entradas e saídas mês a mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CashflowPage,
});

const RANGES = [6, 12, 24];

function CashflowPage() {
  const { data, isLoading } = useFinance();
  const [months, setMonths] = useState(12);

  const series = useMemo(() => {
    const tx = (data?.transactions ?? []) as Record<string, unknown>[];
    const buckets = new Map<string, { income: number; expense: number }>();
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(d.toISOString().slice(0, 7), { income: 0, expense: 0 });
    }
    for (const t of tx) {
      const key = String(t.payment_date ?? t.due_date ?? "").slice(0, 7);
      const b = buckets.get(key);
      if (!b) continue;
      const v = Number(t.amount ?? 0);
      if (t.direction === "income") b.income += v;
      else b.expense += v;
    }
    let acc = 0;
    return [...buckets.entries()].map(([k, v]) => {
      const net = v.income - v.expense;
      acc += net;
      return { key: k, label: monthLabel(k), entradas: v.income, saidas: -v.expense, saldo: net, acumulado: acc };
    });
  }, [data, months]);

  const totals = useMemo(() => {
    const income = series.reduce((s, r) => s + r.entradas, 0);
    const expense = series.reduce((s, r) => s - r.saidas, 0);
    return { income, expense, net: income - expense, avg: series.length ? (income - expense) / series.length : 0 };
  }, [series]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Financeiro</p>
          <h1 className="font-display text-2xl font-semibold">Fluxo de caixa</h1>
          <p className="text-sm text-muted-foreground">Entradas, saídas e saldo acumulado por competência.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5",
                months === m
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {m} meses
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Entradas no período" value={totals.income} tone="positive" icon={ArrowUpRight} />
        <KpiCard label="Saídas no período" value={-totals.expense} tone="negative" icon={ArrowDownRight} />
        <KpiCard label="Resultado líquido" value={totals.net} icon={Scale} />
        <KpiCard label="Média mensal" value={totals.avg} icon={TrendingUp} />
      </div>

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <>
          <Card className="border-border/60 bg-surface/60">
            <CardHeader>
              <CardTitle className="text-base">Entradas x Saídas</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={(v: number) => compact(v)} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(v: number) => BRL(Math.abs(v))} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="var(--color-positive)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="var(--color-negative)" radius={[0, 0, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-surface/60">
            <CardHeader>
              <CardTitle className="text-base">Saldo acumulado</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="acc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={(v: number) => compact(v)} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(v: number) => BRL(v)} />
                  <Area type="monotone" dataKey="acumulado" stroke="var(--color-primary)" fill="url(#acc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
