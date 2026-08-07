import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";
import { BRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos · Nexus ERP" },
      { name: "description", content: "Catálogo de produtos com SKU, custo, preço de venda, estoque atual e mínimo." },
      { property: "og:title", content: "Produtos · Nexus ERP" },
      { property: "og:description", content: "Catálogo de produtos e serviços da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data, isLoading } = useErp();
  const categories = (data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }));
  const suppliers = (data?.parties ?? [])
    .filter((p) => p.type === "vendor" || p.type === "both")
    .map((p) => ({ value: p.id, label: p.name }));

  return (
    <CrudPanel
      title="Produtos"
      description="Catálogo com preços, estoque e fornecedor."
      table="products"
      loading={isLoading}
      rows={(data?.products ?? []) as unknown as Record<string, unknown>[]}
      searchKeys={["name", "sku", "description"]}
      defaults={{
        sku: "",
        name: "",
        description: "",
        unit: "un",
        cost_price: 0,
        sale_price: 0,
        min_stock: 0,
        category_id: "",
        supplier_id: "",
        active: true,
      }}
      fields={[
        { key: "sku", label: "SKU" },
        { key: "name", label: "Produto" },
        { key: "unit", label: "Unidade" },
        {
          key: "cost_price",
          label: "Custo",
          type: "number",
          step: "0.01",
          align: "right",
          render: (r) => BRL.format(Number(r.cost_price ?? 0)),
        },
        {
          key: "sale_price",
          label: "Venda",
          type: "number",
          step: "0.01",
          align: "right",
          render: (r) => BRL.format(Number(r.sale_price ?? 0)),
        },
        {
          key: "stock_qty",
          label: "Estoque",
          align: "right",
          tableOnly: true,
          render: (r) => Number(r.stock_qty ?? 0).toLocaleString("pt-BR"),
        },
        { key: "min_stock", label: "Estoque mínimo", type: "number", step: "0.001", formOnly: true },
        { key: "category_id", label: "Categoria", type: "select", options: categories, optional: true, formOnly: true },
        { key: "supplier_id", label: "Fornecedor", type: "select", options: suppliers, optional: true, formOnly: true },
        { key: "active", label: "Ativo", type: "switch", formOnly: true },
        { key: "description", label: "Descrição", type: "textarea", formOnly: true },
      ]}
    />
  );
}