import { createFileRoute } from "@tanstack/react-router";
import { OrdersPanel } from "@/components/erp/orders-panel";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras · Nexus ERP" },
      { name: "description", content: "Pedidos de compra, fornecedores, status de faturamento e totais." },
      { property: "og:title", content: "Compras · Nexus ERP" },
      { property: "og:description", content: "Gestão de pedidos de compra da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  return <OrdersPanel kind="purchase" />;
}
