import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CheckCircle2, Download, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/app/kpi-card";
import { Money } from "@/components/app/money";
import { useFinance } from "@/components/app/use-finance";
import { useWorkspace } from "@/components/app/workspace";
import { setTransactionStatus } from "@/lib/finance.functions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;

const today = () => new Date().toISOString().slice(0, 10);

const FILTERS = [
  { id: "open", label: "Em aberto" },
  { id: "overdue", label: "Vencidos" },
  { id: "week", label: "Próximos 7 dias" },
  { id: "paid", label: "Liquidados" },
  { id: "all", label: "Todos" },
] as const;

export function AgingPanel({ direction }: { direction: "income" | "expense" }) {
  const { data, isLoading } = useFinance();
  const ws = useWorkspace();
  const qc = useQueryClient();
  const setStatus = useServerFn(setTransactionStatus);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("open");
  const [q, setQ] = useState("");

  const parties = new Map((data?.parties ?? []).map((p: Row) => [p.id as string, p.name as string]));

  const rows = useMemo(() => {
    const all = ((data?.transactions ?? []) as Row[]).filter((t) => t.direction === direction);
    const t0 = today();
    const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const term = q.trim().toLowerCase();
    return all
      .filter((t) => {
        const due = String(t.due_date ?? "");
        const status = String(t.status ?? "pending");
        if (filter === "open") return status === "pending";
        if (filter === "overdue") return status === "pending" && due < t0;
        if (filter === "week") return status === "pending" && due >= t0 && due <= in7;
        if (filter === "paid") return status === "paid";
        return true;
      })
      .filter((t) =>
        !term
          ? true
          : `${t.description ?? ""} ${parties.get(String(t.party_id)) ?? ""} ${t.doc_number ?? ""}`
              .toLowerCase()
              .includes(term),
      )
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  }, [data, direction, filter, q]);

  const totals = useMemo(() => {
    const all = ((data?.transactions ?? []) as Row[]).filter((t) => t.direction === direction);
    const t0 = today();
    const sum = (f: (t: Row) => boolean) =>
      all.filter(f).reduce((s, t) => s + Number(t.amount ?? 0), 0);
    return {
      open: sum((t) => t.status === "pending"),
      overdue: sum((t) => t.status === "pending" && String(t.due_date) < t0),
      month: sum((t) => String(t.due_date).slice(0, 7) === t0.slice(0, 7)),
      paid: sum((t) => t.status === "paid" && String(t.payment_date ?? "").slice(0, 7) === t0.slice(0, 7)),
    };
  }, [data, direction]);

  const mutate = useMutation({
    mutationFn: (v: { id: string; status: "paid" | "pending" }) =>
      setStatus({ data: { tenantId: ws.tenantId!, id: v.id, status: v.status } }),
    onSuccess: async () => {
      toast.success("Situação atualizada");
      await qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportCsv() {
    const head = ["Vencimento", "Descrição", direction === "income" ? "Cliente" : "Fornecedor", "Documento", "Situação", "Valor"];
    const body = rows.map((t) => [
      formatDate(String(t.due_date)),
      String(t.description ?? ""),
      parties.get(String(t.party_id)) ?? "",
      String(t.doc_number ?? ""),
      String(t.status ?? ""),
      String(Number(t.amount ?? 0).toFixed(2)).replace(".", ","),
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${direction === "income" ? "contas-a-receber" : "contas-a-pagar"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sign = direction === "income" ? 1 : -1;
  const label = direction === "income" ? "Contas a receber" : "Contas a pagar";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Financeiro</p>
          <h1 className="font-display text-2xl font-semibold">{label}</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe vencimentos, atrasos e liquidações com baixa em um clique.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Em aberto" value={sign * totals.open} icon={Wallet} />
        <KpiCard label="Vencidos" value={sign * totals.overdue} tone="negative" icon={AlertTriangle} />
        <KpiCard label="Competência do mês" value={sign * totals.month} icon={CalendarClock} />
        <KpiCard label="Liquidado no mês" value={sign * totals.paid} icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5",
              filter === f.id
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar lançamento..."
          className="ml-auto w-60"
        />
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Nenhum lançamento neste filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b border-border/60 bg-surface-2/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                    <th className="px-3 py-2 text-left font-medium">Descrição</th>
                    <th className="px-3 py-2 text-left font-medium">
                      {direction === "income" ? "Cliente" : "Fornecedor"}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Situação</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 300).map((t) => {
                    const overdue = t.status === "pending" && String(t.due_date) < today();
                    return (
                      <tr key={String(t.id)} className="border-b border-border/40 last:border-0 hover:bg-accent/40">
                        <td className="numeric px-3 py-2">{formatDate(String(t.due_date))}</td>
                        <td className="px-3 py-2">{String(t.description ?? "—")}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {parties.get(String(t.party_id)) ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={t.status === "paid" ? "secondary" : overdue ? "destructive" : "outline"}>
                            {t.status === "paid" ? "Liquidado" : overdue ? "Vencido" : "Em aberto"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Money value={sign * Number(t.amount ?? 0)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant={t.status === "paid" ? "ghost" : "outline"}
                            onClick={() =>
                              mutate.mutate({
                                id: String(t.id),
                                status: t.status === "paid" ? "pending" : "paid",
                              })
                            }
                          >
                            {t.status === "paid" ? "Reabrir" : "Dar baixa"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
