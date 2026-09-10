import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity, Cable, Check, Code2, Copy, KeyRound, Loader2, Play, Plus, RefreshCw, Trash2, Webhook,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/app/workspace";
import { formatDate } from "@/lib/format";
import {
  createApiKey, deleteWebhook, loadIntegrations, revokeApiKey, runWebhookQueue,
  saveWebhook, sendTestWebhook, WEBHOOK_EVENTS,
} from "@/lib/integrations.functions";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações e API · Nexus ERP" },
      { name: "description", content: "Chaves de API, endpoints REST e webhooks assinados que disparam com eventos reais da sua empresa." },
      { property: "og:title", content: "Integrações e API · Nexus ERP" },
      { property: "og:description", content: "API REST autenticada por empresa e webhooks em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntegrationsPage,
});

const ENDPOINTS = [
  { method: "GET", path: "/api/public/v1/transactions", desc: "Lista lançamentos. Filtros: status, direction, from, to, limit." },
  { method: "POST", path: "/api/public/v1/transactions", desc: "Cria um lançamento a pagar ou a receber (escopo de escrita)." },
  { method: "GET", path: "/api/public/v1/products", desc: "Catálogo de produtos com saldo de estoque." },
  { method: "GET", path: "/api/public/v1/orders", desc: "Pedidos de venda e compra com os itens de cada pedido." },
];

const STATUS_TONE: Record<string, string> = {
  delivered: "text-positive",
  failed: "text-negative",
  retry: "text-warning",
};

function IntegrationsPage() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const load = useServerFn(loadIntegrations);
  const canManage = ws.can("settings", "edit");

  const { data, isLoading } = useQuery({
    queryKey: ["integrations", ws.tenantId],
    enabled: Boolean(ws.tenantId),
    queryFn: () => load({ data: { tenantId: ws.tenantId! } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["integrations", ws.tenantId] });
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    toast.success("Copiado para a área de transferência");
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Administração</p>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Cable className="size-5 text-primary" /> Integrações e API
          </h1>
          <p className="text-sm text-muted-foreground">
            Chaves autenticadas por empresa, endpoints REST em produção e webhooks assinados que disparam
            no momento em que o evento acontece.
          </p>
        </div>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="size-4" /> Atualizar
        </Button>
      </div>

      <Tabs defaultValue="chaves">
        <TabsList>
          <TabsTrigger value="chaves">Chaves de API</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        </TabsList>

        <TabsContent value="chaves" className="mt-4">
          <ApiKeysCard
            keys={data?.keys ?? []}
            loading={isLoading}
            canManage={canManage}
            tenantId={ws.tenantId}
            onChanged={refresh}
            onCopy={copy}
          />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <WebhooksCard
            hooks={data?.webhooks ?? []}
            loading={isLoading}
            canManage={canManage}
            tenantId={ws.tenantId}
            onChanged={refresh}
            onCopy={copy}
          />
        </TabsContent>

        <TabsContent value="entregas" className="mt-4">
          <DeliveriesCard
            deliveries={data?.deliveries ?? []}
            events={data?.events ?? []}
            loading={isLoading}
            tenantId={ws.tenantId}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="endpoints" className="mt-4 space-y-4">
          <Card className="border-border/60 bg-surface/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 className="size-4 text-primary" /> Endpoints REST
              </CardTitle>
              <CardDescription>
                Envie a chave no cabeçalho <code>Authorization: Bearer &lt;chave&gt;</code>. Base: {baseUrl}
              </CardDescription>
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
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => copy(`${baseUrl}${e.path}`)}>
                    <Copy className="size-3.5" /> Copiar URL
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-surface/60">
            <CardHeader>
              <CardTitle className="text-base">Validando a assinatura do webhook</CardTitle>
              <CardDescription>
                Cada envio traz <code>x-nexus-timestamp</code> e <code>x-nexus-signature</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="numeric overflow-x-auto rounded-lg border border-border/50 bg-surface-2/60 p-4 text-xs">
{`const base = \`\${timestamp}.\${rawBody}\`;
const esperado = hmacSha256Hex(segredoDoWebhook, base);
if (esperado !== assinatura.replace("sha256=", "")) return 401;`}
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Falhas são reenviadas automaticamente em 1, 5, 15, 60 e 240 minutos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}

type KeyRow = {
  id: string; name: string; key_prefix: string; scopes: string[] | null;
  last_used_at: string | null; revoked_at: string | null; created_at: string;
};

function ApiKeysCard({
  keys, loading, canManage, tenantId, onChanged, onCopy,
}: {
  keys: KeyRow[]; loading: boolean; canManage: boolean; tenantId: string | null;
  onChanged: () => void; onCopy: (t: string) => void;
}) {
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const [name, setName] = useState("");
  const [write, setWrite] = useState(true);
  const [created, setCreated] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      create({ data: { tenantId: tenantId!, name, scopes: write ? ["read", "write"] : ["read"] } }),
    onSuccess: (r) => {
      setCreated(r.key);
      setName("");
      onChanged();
    },
    onError: (e: Error) => toast.error("Falha ao criar chave", { description: e.message }),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { tenantId: tenantId!, id } }),
    onSuccess: () => {
      toast.success("Chave revogada");
      onChanged();
    },
    onError: (e: Error) => toast.error("Falha ao revogar", { description: e.message }),
  });

  return (
    <Card className="border-border/60 bg-surface/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" /> Chaves de API
        </CardTitle>
        <CardDescription>O valor completo aparece uma única vez, no momento da criação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/50 p-3">
            <div className="min-w-[14rem] flex-1 space-y-1.5">
              <Label htmlFor="kname">Nome da chave</Label>
              <Input
                id="kname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Integração contabilidade"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Switch checked={write} onCheckedChange={setWrite} /> permite escrita
            </label>
            <Button disabled={!name || !tenantId || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Gerar chave
            </Button>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-24" />
        ) : keys.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma chave criada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-border/60 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nome</th>
                  <th className="px-3 py-2 text-left font-medium">Prefixo</th>
                  <th className="px-3 py-2 text-left font-medium">Escopos</th>
                  <th className="px-3 py-2 text-left font-medium">Último uso</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2">
                      {k.name}
                      {k.revoked_at && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          revogada
                        </Badge>
                      )}
                    </td>
                    <td className="numeric px-3 py-2 text-muted-foreground">{k.key_prefix}…</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{(k.scopes ?? []).join(", ")}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {k.last_used_at ? formatDate(k.last_used_at) : "nunca usada"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canManage && !k.revoked_at && (
                        <Button variant="ghost" size="sm" onClick={() => revokeMut.mutate(k.id)}>
                          <Trash2 className="size-3.5" /> Revogar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(created)} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sua nova chave de API</DialogTitle>
            <DialogDescription>
              Copie agora e guarde em local seguro — ela não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={created ?? ""} className="numeric" />
            <Button variant="outline" size="icon" onClick={() => onCopy(created ?? "")} aria-label="Copiar chave">
              <Copy className="size-4" />
            </Button>
          </div>
          <Button onClick={() => setCreated(null)}>
            <Check className="size-4" /> Guardei a chave
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type HookRow = {
  id: string; url: string; secret: string; events: string[];
  is_active: boolean; description: string | null;
};

function WebhooksCard({
  hooks, loading, canManage, tenantId, onChanged, onCopy,
}: {
  hooks: HookRow[]; loading: boolean; canManage: boolean; tenantId: string | null;
  onChanged: () => void; onCopy: (t: string) => void;
}) {
  const save = useServerFn(saveWebhook);
  const remove = useServerFn(deleteWebhook);
  const test = useServerFn(sendTestWebhook);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["transaction.paid", "deal.won"]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { tenantId: tenantId!, url, events, is_active: true } }),
    onSuccess: () => {
      toast.success("Webhook ativo");
      setUrl("");
      onChanged();
    },
    onError: (e: Error) => toast.error("Falha ao salvar", { description: e.message }),
  });

  const toggleMut = useMutation({
    mutationFn: (h: HookRow) =>
      save({ data: { tenantId: tenantId!, id: h.id, url: h.url, events: h.events, is_active: !h.is_active } }),
    onSuccess: onChanged,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { tenantId: tenantId!, id } }),
    onSuccess: () => {
      toast.success("Webhook removido");
      onChanged();
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => test({ data: { tenantId: tenantId!, id } }),
    onSuccess: (r) =>
      r.sent > 0
        ? toast.success("Evento de teste entregue")
        : toast.warning("Enviado, mas o destino não confirmou. Veja em Entregas."),
    onError: (e: Error) => toast.error("Falha no teste", { description: e.message }),
  });

  return (
    <Card className="border-border/60 bg-surface/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Webhook className="size-4 text-primary" /> Destinos de webhook
        </CardTitle>
        <CardDescription>Cada destino recebe apenas os eventos que você assinar, com corpo assinado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="space-y-3 rounded-xl border border-border/50 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="wh">URL de destino</Label>
              <Input
                id="wh"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://sua-empresa.com/hooks/nexus"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
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
              disabled={!url || events.length === 0 || !tenantId || saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Ativar webhook
            </Button>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-24" />
        ) : hooks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum destino configurado.</p>
        ) : (
          <div className="space-y-3">
            {hooks.map((h) => (
              <div key={h.id} className="rounded-xl border border-border/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="numeric text-xs break-all">{h.url}</code>
                  <Badge variant={h.is_active ? "secondary" : "outline"} className="text-[10px]">
                    {h.is_active ? "ativo" : "pausado"}
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => testMut.mutate(h.id)} disabled={testMut.isPending}>
                      <Play className="size-3.5" /> Testar
                    </Button>
                    {canManage && (
                      <>
                        <Switch checked={h.is_active} onCheckedChange={() => toggleMut.mutate(h)} />
                        <Button variant="ghost" size="sm" onClick={() => removeMut.mutate(h.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {h.events.map((e) => (
                    <span key={e} className="numeric rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {e}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Segredo de assinatura</span>
                  <code className="numeric text-[11px]">{h.secret.slice(0, 12)}…</code>
                  <Button variant="ghost" size="sm" onClick={() => onCopy(h.secret)}>
                    <Copy className="size-3" /> Copiar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type DeliveryRow = {
  id: string; event: string; status: string; attempts: number;
  response_status: number | null; created_at: string; delivered_at: string | null;
};
type EventRow = { id: string; event: string; status: string; created_at: string };

function DeliveriesCard({
  deliveries, events, loading, tenantId, onChanged,
}: {
  deliveries: DeliveryRow[]; events: EventRow[]; loading: boolean;
  tenantId: string | null; onChanged: () => void;
}) {
  const run = useServerFn(runWebhookQueue);
  const runMut = useMutation({
    mutationFn: () => run({ data: { tenantId: tenantId! } }),
    onSuccess: (r) => {
      toast.success(`Fila processada: ${r.sent} entregue(s), ${r.failed} com falha`);
      onChanged();
    },
    onError: (e: Error) => toast.error("Falha ao processar", { description: e.message }),
  });

  const stats = useMemo(() => {
    const delivered = deliveries.filter((d) => d.status === "delivered").length;
    const failed = deliveries.filter((d) => d.status === "failed").length;
    const pending = deliveries.filter((d) => d.status === "pending" || d.status === "retry").length;
    return { delivered, failed, pending };
  }, [deliveries]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="Eventos recentes" value={events.length} />
        <MiniStat label="Entregues" value={stats.delivered} tone="text-positive" />
        <MiniStat label="Aguardando" value={stats.pending} tone="text-warning" />
        <MiniStat label="Com falha" value={stats.failed} tone="text-negative" />
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" /> Histórico de entregas
            </CardTitle>
            <CardDescription>Cada tentativa fica registrada com o código de resposta do destino.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => runMut.mutate()} disabled={!tenantId || runMut.isPending}>
            {runMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Processar fila
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="m-4 h-24" />
          ) : deliveries.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma entrega ainda. Configure um destino e use o botão Testar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b border-border/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Evento</th>
                    <th className="px-3 py-2 text-left font-medium">Situação</th>
                    <th className="px-3 py-2 text-right font-medium">Tentativas</th>
                    <th className="px-3 py-2 text-right font-medium">Resposta</th>
                    <th className="px-3 py-2 text-right font-medium">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b border-border/40 last:border-0">
                      <td className="numeric px-3 py-2 text-xs">{d.event}</td>
                      <td className={`px-3 py-2 text-xs ${STATUS_TONE[d.status] ?? "text-muted-foreground"}`}>
                        {d.status}
                      </td>
                      <td className="numeric px-3 py-2 text-right text-xs">{d.attempts}</td>
                      <td className="numeric px-3 py-2 text-right text-xs">{d.response_status ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {formatDate(d.delivered_at ?? d.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="border-border/60 bg-surface/60">
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground uppercase">{label}</p>
        <p className={`numeric text-2xl font-semibold ${tone ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
