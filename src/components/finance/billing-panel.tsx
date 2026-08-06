import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/app/money";
import { useFinance } from "@/components/app/use-finance";
import { useWorkspace } from "@/components/app/workspace";
import { EntryDialog } from "@/components/finance/entry-dialog";
import { BRL, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/analytics";

export function BillingPanel() {
  const ws = useWorkspace();
  const { data, isLoading } = useFinance();
  const [month, setMonth] = useState("");

  const invoices = useMemo(() => {
    const parties = data?.parties ?? [];
    return (data?.transactions ?? [])
      .filter((t) => t.direction === "income" && (!month || String(t.due_date).startsWith(month)))
      .map((t) => ({ ...t, client: parties.find((p) => p.id === t.party_id)?.name ?? "Sem cliente" }))
      .sort((a, b) => (a.due_date < b.due_date ? 1 : -1));
  }, [data, month]);

  const totals = useMemo(() => {
    const today = todayISO();
    let faturado = 0;
    let recebido = 0;
    let aReceber = 0;
    let vencido = 0;
    for (const i of invoices) {
      const v = Number(i.amount);
      faturado += v;
      if (i.status === "paid") recebido += v;
      else {
        aReceber += v;
        if (i.due_date < today) vencido += v;
      }
    }
    return { faturado, recebido, aReceber, vencido };
  }, [invoices]);

  const byClient = useMemo(() => {
    const map = new Map<string, { total: number; open: number; count: number }>();
    for (const i of invoices) {
      const cur = map.get(i.client) ?? { total: 0, open: 0, count: 0 };
      cur.total += Number(i.amount);
      cur.count += 1;
      if (i.status !== "paid") cur.open += Number(i.amount);
      map.set(i.client, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 12);
  }, [invoices]);

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold">Faturamento</h1>
          <p className="text-sm text-muted-foreground">Receitas emitidas, recebimentos e inadimplência por cliente.</p>
        </div>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-[9.5rem]" />
        {ws.can("finance", "create") && <EntryDialog defaultDirection="income" label="Nova fatura" />}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Faturado" value={BRL(totals.faturado)} />
        <Kpi title="Recebido" value={BRL(totals.recebido)} tone="text-positive" />
        <Kpi title="A receber" value={BRL(totals.aReceber)} tone="text-warning" />
        <Kpi title="Vencido" value={BRL(totals.vencido)} tone="text-negative" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/60 bg-surface/60 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Faturas do período</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="max-h-[52vh] overflow-auto">
                <table className="w-full min-w-[38rem] text-sm">
                  <thead className="sticky top-0 bg-surface/95 text-left text-[11px] tracking-wide text-muted-foreground uppercase backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 font-medium">Vencimento</th>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium">Descrição</th>
                      <th className="px-3 py-2 font-medium">Situação</th>
                      <th className="px-3 py-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          Nenhuma fatura no período.
                        </td>
                      </tr>
                    )}
                    {invoices.slice(0, 300).map((i) => (
                      <tr key={i.id} className="border-t border-border/40">
                        <td className="numeric px-3 py-2">{formatDate(i.due_date)}</td>
                        <td className="px-3 py-2">{i.client}</td>
                        <td className="px-3 py-2 text-muted-foreground">{i.description}</td>
                        <td className="px-3 py-2">
                          {i.status === "paid" ? "Recebido" : i.due_date < todayISO() ? "Vencido" : "A receber"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Money value={Number(i.amount)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byClient.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
            {byClient.map(([name, v]) => (
              <div key={name} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="numeric text-xs text-warning">{v.open > 0 ? `aberto ${BRL(v.open)}` : ""}</span>
                <span className="numeric font-medium">{BRL(v.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ title, value, tone }: { title: string; value: string; tone?: string }) {
  return (
    <Card className="border-border/60 bg-surface/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`numeric text-2xl font-semibold ${tone ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}