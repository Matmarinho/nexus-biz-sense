import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance } from "@/components/app/use-finance";
import { useErp } from "@/components/erp/use-erp";
import { BRL, formatDate, monthLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · Nexus ERP" },
      { name: "description", content: "Relatórios gerenciais de resultado, clientes, produtos e estoque com exportação CSV." },
      { property: "og:title", content: "Relatórios · Nexus ERP" },
      { property: "og:description", content: "Relatórios gerenciais consolidados por empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

type Col = { key: string; label: string; align?: "right" };

function download(name: string, cols: Col[], rows: Record<string, unknown>[]) {
  const csv = [
    cols.map((c) => c.label),
    ...rows.map((r) => cols.map((c) => String(r[c.key] ?? ""))),
  ]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportTable({
  title,
  description,
  cols,
  rows,
  loading,
  fileName,
}: {
  title: string;
  description: string;
  cols: Col[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  fileName: string;
}) {
  return (
    <Card className="border-border/60 bg-surface/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => download(fileName, cols, rows)}>
          <Download className="size-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Sem dados para este relatório.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border/60 bg-surface-2/60 text-xs text-muted-foreground uppercase">
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-accent/40">
                    {cols.map((c) => (
                      <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "numeric text-right" : ""}`}>
                        {String(r[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportsPage() {
  const fin = useFinance();
  const erp = useErp();
  const [tab, setTab] = useState("resultado");

  const dre = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of (fin.data?.transactions ?? []) as Record<string, unknown>[]) {
      const key = String(t.payment_date ?? t.due_date ?? "").slice(0, 7);
      if (key.length !== 7) continue;
      const b = map.get(key) ?? { income: 0, expense: 0 };
      if (t.direction === "income") b.income += Number(t.amount ?? 0);
      else b.expense += Number(t.amount ?? 0);
      map.set(key, b);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 24)
      .map(([k, v]) => ({
        mes: monthLabel(k),
        receitas: BRL(v.income),
        despesas: BRL(v.expense),
        resultado: BRL(v.income - v.expense),
        margem: v.income ? `${(((v.income - v.expense) / v.income) * 100).toFixed(1).replace(".", ",")}%` : "—",
      }));
  }, [fin.data]);

  const porCliente = useMemo(() => {
    const names = new Map((fin.data?.parties ?? []).map((p: Record<string, unknown>) => [p.id as string, p.name as string]));
    const map = new Map<string, { total: number; aberto: number; qtd: number }>();
    for (const t of (fin.data?.transactions ?? []) as Record<string, unknown>[]) {
      if (t.direction !== "income" || !t.party_id) continue;
      const key = String(t.party_id);
      const b = map.get(key) ?? { total: 0, aberto: 0, qtd: 0 };
      b.total += Number(t.amount ?? 0);
      if (t.status === "pending") b.aberto += Number(t.amount ?? 0);
      b.qtd += 1;
      map.set(key, b);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([id, v]) => ({
        cliente: names.get(id) ?? "—",
        lancamentos: v.qtd,
        faturado: BRL(v.total),
        emAberto: BRL(v.aberto),
      }));
  }, [fin.data]);

  const estoque = useMemo(
    () =>
      (erp.data?.products ?? [])
        .map((p: Record<string, unknown>) => ({
          produto: String(p.name ?? ""),
          sku: String(p.sku ?? "—"),
          saldo: Number(p.stock_qty ?? 0).toLocaleString("pt-BR"),
          minimo: Number(p.min_stock ?? 0).toLocaleString("pt-BR"),
          valor: BRL(Number(p.stock_qty ?? 0) * Number(p.cost_price ?? 0)),
          situacao: Number(p.stock_qty ?? 0) <= Number(p.min_stock ?? 0) ? "Repor" : "Ok",
        }))
        .sort((a, b) => a.produto.localeCompare(b.produto)),
    [erp.data],
  );

  const pedidos = useMemo(() => {
    const names = new Map((erp.data?.parties ?? []).map((p: Record<string, unknown>) => [p.id as string, p.name as string]));
    return (erp.data?.orders ?? []).map((o: Record<string, unknown>) => ({
      numero: String(o.number ?? "—"),
      tipo: o.kind === "sale" ? "Venda" : "Compra",
      parceiro: names.get(String(o.party_id)) ?? "—",
      emissao: formatDate(String(o.issue_date ?? "")),
      status: String(o.status ?? ""),
      total: BRL(Number(o.total ?? 0)),
    }));
  }, [erp.data]);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Financeiro</p>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <FileBarChart className="size-5 text-primary" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">Visões gerenciais consolidadas com exportação em CSV.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList>
          <TabsTrigger value="resultado">Resultado mensal</TabsTrigger>
          <TabsTrigger value="clientes">Por cliente</TabsTrigger>
          <TabsTrigger value="estoque">Posição de estoque</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
        </TabsList>

        <TabsContent value="resultado">
          <ReportTable
            title="Resultado mensal"
            description="Receitas, despesas, resultado e margem por competência."
            fileName="resultado-mensal"
            loading={fin.isLoading}
            cols={[
              { key: "mes", label: "Mês" },
              { key: "receitas", label: "Receitas", align: "right" },
              { key: "despesas", label: "Despesas", align: "right" },
              { key: "resultado", label: "Resultado", align: "right" },
              { key: "margem", label: "Margem", align: "right" },
            ]}
            rows={dre}
          />
        </TabsContent>

        <TabsContent value="clientes">
          <ReportTable
            title="Faturamento por cliente"
            description="Ranking de receitas e saldo em aberto por cliente."
            fileName="faturamento-por-cliente"
            loading={fin.isLoading}
            cols={[
              { key: "cliente", label: "Cliente" },
              { key: "lancamentos", label: "Lançamentos", align: "right" },
              { key: "faturado", label: "Faturado", align: "right" },
              { key: "emAberto", label: "Em aberto", align: "right" },
            ]}
            rows={porCliente}
          />
        </TabsContent>

        <TabsContent value="estoque">
          <ReportTable
            title="Posição de estoque"
            description="Saldo atual, mínimo e valor imobilizado por produto."
            fileName="posicao-estoque"
            loading={erp.isLoading}
            cols={[
              { key: "produto", label: "Produto" },
              { key: "sku", label: "SKU" },
              { key: "saldo", label: "Saldo", align: "right" },
              { key: "minimo", label: "Mínimo", align: "right" },
              { key: "valor", label: "Valor", align: "right" },
              { key: "situacao", label: "Situação" },
            ]}
            rows={estoque}
          />
        </TabsContent>

        <TabsContent value="pedidos">
          <ReportTable
            title="Pedidos de venda e compra"
            description="Histórico consolidado de pedidos com status e totais."
            fileName="pedidos"
            loading={erp.isLoading}
            cols={[
              { key: "numero", label: "Número" },
              { key: "tipo", label: "Tipo" },
              { key: "parceiro", label: "Parceiro" },
              { key: "emissao", label: "Emissão" },
              { key: "status", label: "Status" },
              { key: "total", label: "Total", align: "right" },
            ]}
            rows={pedidos}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
