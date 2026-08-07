import { createFileRoute } from "@tanstack/react-router";
import { CrudPanel } from "@/components/erp/crud";
import { useErp } from "@/components/erp/use-erp";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · Nexus ERP" },
      { name: "description", content: "Compromissos, tarefas e lembretes da equipe com data, local e situação." },
      { property: "og:title", content: "Agenda · Nexus ERP" },
      { property: "og:description", content: "Agenda corporativa da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgendaPage,
});

const KINDS: Record<string, string> = { meeting: "Reunião", task: "Tarefa", reminder: "Lembrete", deadline: "Prazo" };
const STATUS: Record<string, string> = { scheduled: "Agendado", done: "Concluído", canceled: "Cancelado" };

function AgendaPage() {
  const { data, isLoading } = useErp();
  return (
    <CrudPanel
      title="Agenda"
      description="Compromissos e lembretes da equipe."
      table="calendar_events"
      loading={isLoading}
      rows={(data?.events ?? []) as unknown as Record<string, unknown>[]}
      searchKeys={["title", "location", "description"]}
      defaults={{
        title: "",
        description: "",
        starts_at: new Date().toISOString().slice(0, 16),
        ends_at: "",
        all_day: false,
        location: "",
        kind: "meeting",
        status: "scheduled",
      }}
      fields={[
        { key: "title", label: "Título" },
        {
          key: "starts_at",
          label: "Início",
          type: "datetime",
          render: (r) => new Date(String(r.starts_at)).toLocaleString("pt-BR"),
        },
        { key: "ends_at", label: "Fim", type: "datetime", formOnly: true },
        {
          key: "kind",
          label: "Tipo",
          type: "select",
          options: Object.entries(KINDS).map(([value, label]) => ({ value, label })),
          render: (r) => KINDS[String(r.kind)] ?? "—",
        },
        {
          key: "status",
          label: "Situação",
          type: "select",
          options: Object.entries(STATUS).map(([value, label]) => ({ value, label })),
          render: (r) => STATUS[String(r.status)] ?? "—",
        },
        { key: "location", label: "Local" },
        { key: "all_day", label: "Dia inteiro", type: "switch", formOnly: true },
        { key: "description", label: "Descrição", type: "textarea", formOnly: true },
      ]}
    />
  );
}