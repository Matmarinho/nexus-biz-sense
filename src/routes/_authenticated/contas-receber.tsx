import { createFileRoute } from "@tanstack/react-router";
import { AgingPanel } from "@/components/finance/aging-panel";

export const Route = createFileRoute("/_authenticated/contas-receber")({
  head: () => ({
    meta: [
      { title: "Contas a receber · Nexus ERP" },
      { name: "description", content: "Recebíveis, inadimplência e baixas de contas a receber por empresa." },
      { property: "og:title", content: "Contas a receber · Nexus ERP" },
      { property: "og:description", content: "Gestão de recebíveis com aging e exportação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AgingPanel direction="income" />,
});
