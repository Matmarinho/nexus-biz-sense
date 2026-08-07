import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores · Nexus ERP" },
      { name: "description", content: "Cadastro de fornecedores com contatos, documentos e situação por empresa." },
      { property: "og:title", content: "Fornecedores · Nexus ERP" },
      { property: "og:description", content: "Gestão de fornecedores do seu ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  const { data, isLoading } = useErp();
  const rows = (data?.parties ?? []).filter((p) => p.type === "vendor" || p.type === "both");
  return (
    <CrudPanel
      title="Fornecedores"
      description="Parceiros que fornecem produtos e serviços."
      table="customers_vendors"
      loading={isLoading}
      rows={rows as unknown as Record<string, unknown>[]}
      searchKeys={["name", "email", "tax_id", "phone"]}
      defaults={{ name: "", type: "vendor", tax_id: "", email: "", phone: "", notes: "", is_active: true }}
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
            { value: "vendor", label: "Fornecedor" },
            { value: "both", label: "Cliente e fornecedor" },
          ],
        },
        { key: "is_active", label: "Ativo", type: "switch", formOnly: true },
        { key: "notes", label: "Observações", type: "textarea", formOnly: true },
      ]}
    />
  );
}