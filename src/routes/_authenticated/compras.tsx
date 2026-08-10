import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";
import { BRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras · Nexus ERP" },
      { name: "description", content: "Pedidos de compra, clientes, status de faturamento e totais." },
      { property: "og:title", content: "Compras · Nexus ERP" },
      { property: "og:description", content: "Gestão de pedidos de compra da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchasesPage,
});

const STATUS = [
  { value: "draft", label: "Rascunho" },
  { value: "confirmed", label: "Confirmado" },
  { value: "delivered", label: "Entregue" },
  { value: "invoiced", label: "Faturado" },
  { value: "canceled", label: "Cancelado" },
];

function PurchasesPage() {
  const { data, isLoading } = useErp();
  const vendors = (data?.parties ?? [])
    .filter((p) => p.type === "vendor" || p.type === "both")
    .map((p) => ({ value: p.id, label: p.name }));
  const rows = (data?.orders ?? []).filter((o) => o.kind === "purchase");

  return (
    <CrudPanel
      title="Compras"
      description="Pedidos de compra com fornecedor, status e valores."
      table="orders"
      loading={isLoading}
      rows={rows as unknown as Record<string, unknown>[]}
      searchKeys={["number", "notes"]}
      fixedValues={{ kind: "purchase" }}
      defaults={{
        number: "",
        party_id: "",
        issue_date: new Date().toISOString().slice(0, 10),
        delivery_date: "",
        status: "draft",
        discount: 0,
        shipping: 0,
        total: 0,
        notes: "",
      }}
      fields={[
        { key: "number", label: "Número" },
        {
          key: "issue_date",
          label: "Emissão",
          type: "date",
          render: (r) => formatDate(String(r.issue_date ?? "")),
        },
        { key: "delivery_date", label: "Entrega", type: "date", optional: true, formOnly: true },
        {
          key: "party_id",
          label: "Fornecedor",
          type: "select",
          options: vendors,
          optional: true,
          render: (r) => vendors.find((c) => c.value === r.party_id)?.label ?? "—",
        },
        { key: "status", label: "Status", type: "select", options: STATUS },
        { key: "discount", label: "Desconto", type: "number", step: "0.01", formOnly: true },
        { key: "shipping", label: "Frete", type: "number", step: "0.01", formOnly: true },
        {
          key: "total",
          label: "Total",
          type: "number",
          step: "0.01",
          align: "right",
          render: (r) => BRL(Number(r.total ?? 0)),
        },
        { key: "notes", label: "Observações", type: "textarea", formOnly: true },
      ]}
    />
  );
}
