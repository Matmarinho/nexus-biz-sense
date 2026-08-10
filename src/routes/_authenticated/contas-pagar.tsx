import { createFileRoute } from "@tanstack/react-router";
import { AgingPanel } from "@/components/finance/aging-panel";

export const Route = createFileRoute("/_authenticated/contas-pagar")({
  head: () => ({
    meta: [
      { title: "Contas a pagar · Nexus ERP" },
      { name: "description", content: "Vencimentos, atrasos e baixas de contas a pagar por empresa." },
      { property: "og:title", content: "Contas a pagar · Nexus ERP" },
      { property: "og:description", content: "Controle de obrigações financeiras com aging e exportação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AgingPanel direction="expense" />,
});
