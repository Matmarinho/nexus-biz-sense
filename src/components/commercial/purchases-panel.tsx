import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/app/money";
import { useFinance } from "@/components/app/use-finance";
import { useWorkspace } from "@/components/app/workspace";
import { EntryDialog } from "@/components/finance/entry-dialog";
import { BRL, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/analytics";

export function PurchasesPanel() {
  const ws = useWorkspace();
  const { data, isLoading } = useFinance();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const parties = data?.parties ?? [];
    const term = q.trim().toLowerCase();
    return (data?.transactions ?? [])
      .filter((t) => t.direction === "expense")
      .map((t) => ({ ...t, vendor: parties.find((p) => p.id === t.party_id)?.name ?? "—" }))
      .filter((t) => !term || `${t.description} ${t.vendor} ${t.doc_number ?? ""}`.toLowerCase().includes(term))
      .sort((a, b) => (a.due_date < b.due_date ? 1 : -1))
      .slice(0, 300);
  }, [data, q]);

  const totals = useMemo(() => {
    let total = 0;
    let open = 0;
    for (const r of rows) {
      total += Number(r.amount);
      if (r.status === "pending") open += Number(r.amount);
    }
    return { total, open };
  }, [rows]);

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Ordens de compra e despesas com fornecedores — sincronizadas com a gestão financeira.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar compra ou fornecedor" className="w-60 pl-9" />
        </div>
        {ws.can("finance", "create") && <EntryDialog defaultDirection="expense" label="Nova compra" />}
      </header>

      <Card className="border-border/60 bg-surface/60 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="sticky top-0 bg-surface/95 text-left text-[11px] tracking-wide text-muted-foreground uppercase backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 font-medium">Vencimento</th>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Fornecedor</th>
                    <th className="px-3 py-2 font-medium">Documento</th>
                    <th className="px-3 py-2 font-medium">Situação</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Nenhuma compra registrada.
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => {
                    const overdue = r.status === "pending" && r.due_date < todayISO();
                    return (
                      <tr key={r.id} className="border-t border-border/40">
                        <td className="numeric px-3 py-2">{formatDate(r.due_date)}</td>
                        <td className="px-3 py-2">{r.description}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.vendor}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.doc_number ?? "—"}</td>
                        <td className="px-3 py-2">
                          {r.status === "paid" ? "Pago" : overdue ? "Vencido" : "Em aberto"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Money value={-Number(r.amount)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-4 border-t border-border/60 bg-surface/80 px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">{rows.length} compras</span>
            <span className="numeric ml-auto">Total {BRL(totals.total)}</span>
            <span className="numeric text-warning">Em aberto {BRL(totals.open)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}