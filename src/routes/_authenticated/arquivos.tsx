import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/arquivos")({
  head: () => ({
    meta: [
      { title: "Arquivos · Nexus ERP" },
      { name: "description", content: "Central de documentos e anexos da empresa com vínculo a registros do ERP." },
      { property: "og:title", content: "Arquivos · Nexus ERP" },
      { property: "og:description", content: "Documentos e anexos organizados por empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FilesPage,
});

function FilesPage() {
  const { data, isLoading } = useErp();
  return (
    <CrudPanel
      title="Arquivos"
      description="Documentos e links de anexos vinculados aos registros."
      table="files"
      loading={isLoading}
      rows={(data?.files ?? []) as unknown as Record<string, unknown>[]}
      searchKeys={["name", "path", "entity"]}
      defaults={{ name: "", path: "", mime_type: "", size_bytes: 0, entity: "" }}
      fields={[
        { key: "name", label: "Nome" },
        {
          key: "path",
          label: "Endereço / URL",
          render: (r) => (
            <a href={String(r.path)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              abrir
            </a>
          ),
        },
        { key: "mime_type", label: "Tipo" },
        { key: "entity", label: "Vinculado a" },
        { key: "size_bytes", label: "Tamanho (bytes)", type: "number", align: "right" },
        { key: "created_at", label: "Criado em", tableOnly: true, render: (r) => formatDate(String(r.created_at).slice(0, 10)) },
      ]}
    />
  );
}