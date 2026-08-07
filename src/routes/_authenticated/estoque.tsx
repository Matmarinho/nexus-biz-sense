import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";
import { Card, CardContent } from "@/components/ui/card";
import { BRL, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque · Nexus ERP" },
      { name: "description", content: "Movimentações de entrada, saída e ajuste com atualização automática do saldo de estoque." },
      { property: "og:title", content: "Estoque · Nexus ERP" },
      { property: "og:description", content: "Controle de estoque e movimentações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StockPage,
});

const KINDS: Record<string, string> = { in: "Entrada", out: "Saída", adjust: "Ajuste" };

function StockPage() {
  const { data, isLoading } = useErp();
  const products = data?.products ?? [];
  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const stockValue = products.reduce((s, p) => s + Number(p.stock_qty) * Number(p.cost_price), 0);
  const low = products.filter((p) => Number(p.stock_qty) <= Number(p.min_stock)).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-surface/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Itens cadastrados</p>
            <p className="font-display text-2xl font-semibold">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-surface/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Valor em estoque</p>
            <p className="font-display text-2xl font-semibold">{BRL(stockValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-surface/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Abaixo do mínimo</p>
            <p className="font-display text-2xl font-semibold text-warning">{low}</p>
          </CardContent>
        </Card>
      </div>

      <CrudPanel
        title="Movimentações de estoque"
        description="Cada movimentação atualiza automaticamente o saldo do produto."
        table="stock_movements"
        loading={isLoading}
        rows={(data?.movements ?? []) as unknown as Record<string, unknown>[]}
        searchKeys={["reason", "reference"]}
        defaults={{ product_id: "", kind: "in", quantity: 1, unit_cost: 0, reason: "", reference: "", moved_at: todayISO() }}
        fields={[
          { key: "moved_at", label: "Data", type: "date", render: (r) => formatDate(String(r.moved_at)) },
          { key: "product_id", label: "Produto", type: "select", options: productOptions, render: (r) => nameById.get(String(r.product_id)) ?? "—" },
          {
            key: "kind",
            label: "Tipo",
            type: "select",
            options: Object.entries(KINDS).map(([value, label]) => ({ value, label })),
            render: (r) => KINDS[String(r.kind)] ?? String(r.kind),
          },
          { key: "quantity", label: "Quantidade", type: "number", step: "0.001", align: "right" },
          { key: "unit_cost", label: "Custo unit.", type: "number", step: "0.01", align: "right", render: (r) => BRL(Number(r.unit_cost ?? 0)) },
          { key: "reference", label: "Referência", formOnly: true },
          { key: "reason", label: "Motivo", type: "textarea", formOnly: true },
        ]}
      />
    </div>
  );
}