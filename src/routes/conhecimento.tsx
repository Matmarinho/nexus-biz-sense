import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { KnowledgeHub } from "@/components/marketing/knowledge-hub";

const DESC =
  "Central de Conhecimento Nexus ERP: guias práticos, trilhas de capacitação, documentação de API e respostas rápidas sobre financeiro, comercial, estoque, BI e segurança.";

export const Route = createFileRoute("/conhecimento")({
  head: () => ({
    meta: [
      { title: "Central de Conhecimento · Nexus ERP" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Central de Conhecimento · Nexus ERP" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <div className="bg-background">
      <SiteHeader />
      <main>
        <KnowledgeHub />
      </main>
      <SiteFooter />
    </div>
  );
}
