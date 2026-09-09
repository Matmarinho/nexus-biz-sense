import { createFileRoute } from "@tanstack/react-router";
import { processWebhookQueue } from "@/lib/webhook-dispatch.server";

/**
 * Processa a fila de webhooks. Chamado pelo próprio banco quando um evento
 * ocorre e por uma varredura horária que reenvia entregas com falha.
 * Não recebe dados do usuário: apenas drena a fila já validada.
 */
export const Route = createFileRoute("/api/public/v1/webhooks/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let tenantId: string | null = null;
        try {
          const body = (await request.json()) as { tenant_id?: string };
          tenantId = typeof body?.tenant_id === "string" ? body.tenant_id : null;
        } catch {
          tenantId = null;
        }
        const result = await processWebhookQueue(tenantId);
        return Response.json({ ok: true, ...result });
      },
      GET: async () => Response.json({ ok: true, ...(await processWebhookQueue(null)) }),
    },
  },
});
