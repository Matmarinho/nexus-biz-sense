import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";

export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias · Nexus ERP" },
      { name: "description", content: "Organize o catálogo de produtos em categorias com cores e descrições." },
      { property: "og:title", content: "Categorias · Nexus ERP" },
      { property: "og:description", content: "Categorias do catálogo de produtos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data, isLoading } = useErp();
  return (
    <CrudPanel
      title="Categorias"
      description="Agrupamento do catálogo de produtos."
      table="product_categories"
      loading={isLoading}
      rows={(data?.categories ?? []) as unknown as Record<string, unknown>[]}
      searchKeys={["name", "description"]}
      defaults={{ name: "", description: "", color: "" }}
      fields={[
        { key: "name", label: "Nome" },
        { key: "color", label: "Cor (hex)", placeholder: "#7c3aed" },
        { key: "description", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}