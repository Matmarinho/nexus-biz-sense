import { createFileRoute } from "@tanstack/react-router";
import { OrdersPanel } from "@/components/erp/orders-panel";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas · Nexus ERP" },
      { name: "description", content: "Pedidos de venda, clientes, status de faturamento e totais." },
      { property: "og:title", content: "Vendas · Nexus ERP" },
      { property: "og:description", content: "Gestão de pedidos de venda da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  return <OrdersPanel kind="sale" />;
}
