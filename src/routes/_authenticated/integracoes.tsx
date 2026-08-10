import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Cable, Check, Code2, Copy, Webhook } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/components/app/workspace";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações e API · Nexus ERP" },
      { name: "description", content: "Endpoints REST, webhooks e conectores para integrar o Nexus ERP aos seus sistemas." },
      { property: "og:title", content: "Integrações e API · Nexus ERP" },
      { property: "og:description", content: "API REST documentada e webhooks por evento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntegrationsPage,
});

const ENDPOINTS = [
  { method: "GET", path: "/api/public/v1/transactions", desc: "Lista lançamentos financeiros da empresa." },
  { method: "POST", path: "/api/public/v1/transactions", desc: "Cria um lançamento a pagar ou a receber." },
  { method: "GET", path: "/api/public/v1/products", desc: "Catálogo de produtos com saldo de estoque." },
  { method: "GET", path: "/api/public/v1/orders", desc: "Pedidos de venda e compra com itens." },
  { method: "POST", path: "/api/public/v1/webhooks", desc: "Registra um webhook para eventos da empresa." },
];

const EVENTS = [
  { id: "transaction.created", label: "Lançamento criado" },
  { id: "transaction.paid", label: "Lançamento liquidado" },
  { id: "transaction.overdue", label: "Lançamento vencido" },
  { id: "deal.won", label: "Negócio ganho no CRM" },
  { id: "stock.low", label: "Estoque abaixo do mínimo" },
  { id: "order.invoiced", label: "Pedido faturado" },
];

const CONNECTORS = [
  { name: "Open Finance", desc: "Saldos, cartões e rendimentos bancários", status: "Conectado" },
  { name: "Notas fiscais", desc: "Emissão e consulta de NF-e / NFS-e", status: "Disponível" },
  { name: "Gateway de pagamento", desc: "Boletos, PIX e cartões", status: "Disponível" },
  { name: "Google Workspace", desc: "SSO, agenda e arquivos", status: "Disponível" },
  { name: "WhatsApp Business", desc: "Cobrança e atendimento", status: "Beta" },
  { name: "Contabilidade", desc: "Exportação SPED e balancetes", status: "Disponível" },
];

function IntegrationsPage() {
  const ws = useWorkspace();
  const [events, setEvents] = useState<string[]>(["transaction.paid", "deal.won"]);
  const [webhook, setWebhook] = useState("");

  const key = `nx_live_${(ws.tenantId ?? "").replace(/-/g, "").slice(0, 24)}`;

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    toast.success("Copiado para a área de transferência");
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Administração</p>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Cable className="size-5 text-primary" /> Integrações e API
        </h1>
        <p className="text-sm text-muted-foreground">
          Conecte o Nexus ERP aos seus sistemas com API REST autenticada por empresa e webhooks por evento.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/60 bg-surface/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="size-4 text-primary" /> Credenciais da empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Chave de API</Label>
              <div className="flex gap-2">
                <Input readOnly value={key} className="numeric" />
                <Button variant="outline" size="icon" onClick={() => copy(key)} aria-label="Copiar chave">
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie no header <code>Authorization: Bearer &lt;chave&gt;</code>. A chave herda as permissões do papel
                configurado para integrações.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Identificador da empresa</Label>
              <div className="flex gap-2">
                <Input readOnly value={ws.tenantId ?? "—"} className="numeric" />
                <Button variant="outline" size="icon" onClick={() => copy(ws.tenantId ?? "")} aria-label="Copiar id">
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-surface/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="size-4 text-primary" /> Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh">URL de destino</Label>
              <Input
                id="wh"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://sua-empresa.com/hooks/nexus"
              />
            </div>
            <div className="space-y-2">
              {EVENTS.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <p className="text-sm">{ev.label}</p>
                    <p className="numeric text-[11px] text-muted-foreground">{ev.id}</p>
                  </div>
                  <Switch
                    checked={events.includes(ev.id)}
                    onCheckedChange={(v) =>
                      setEvents((prev) => (v ? [...prev, ev.id] : prev.filter((e) => e !== ev.id)))
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={() =>
                webhook
                  ? toast.success(`Webhook salvo para ${events.length} evento(s)`)
                  : toast.error("Informe a URL de destino")
              }
            >
              <Check className="size-4" /> Salvar webhook
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader>
          <CardTitle className="text-base">Endpoints REST</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ENDPOINTS.map((e) => (
            <div
              key={e.path + e.method}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
            >
              <Badge variant={e.method === "GET" ? "secondary" : "default"}>{e.method}</Badge>
              <code className="numeric text-xs">{e.path}</code>
              <span className="text-xs text-muted-foreground">{e.desc}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => copy(e.path)}>
                <Copy className="size-3.5" /> Copiar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader>
          <CardTitle className="text-base">Conectores</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CONNECTORS.map((c) => (
            <div key={c.name} className="rounded-xl border border-border/50 p-4 transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{c.name}</p>
                <Badge variant={c.status === "Conectado" ? "secondary" : "outline"}>{c.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
