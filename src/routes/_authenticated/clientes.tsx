import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Nexus ERP" },
      { name: "description", content: "Cadastro completo de clientes com contatos, documentos e situação por empresa." },
      { property: "og:title", content: "Clientes · Nexus ERP" },
      { property: "og:description", content: "Cadastro de clientes do seu ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data, isLoading } = useErp();
  const rows = (data?.parties ?? []).filter((p) => p.type === "customer" || p.type === "both");
  return (
    <CrudPanel
      title="Clientes"
      description="Pessoas e empresas que compram de você."
      table="customers_vendors"
      loading={isLoading}
      rows={rows as unknown as Record<string, unknown>[]}
      searchKeys={["name", "email", "tax_id", "phone"]}
      defaults={{ name: "", type: "customer", tax_id: "", email: "", phone: "", notes: "", is_active: true }}
      fields={[
        { key: "name", label: "Nome" },
        { key: "tax_id", label: "CPF/CNPJ" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
        {
          key: "type",
          label: "Tipo",
          type: "select",
          options: [
            { value: "customer", label: "Cliente" },
            { value: "both", label: "Cliente e fornecedor" },
          ],
        },
        { key: "is_active", label: "Ativo", type: "switch", formOnly: true },
        { key: "notes", label: "Observações", type: "textarea", formOnly: true },
      ]}
    />
  );
}