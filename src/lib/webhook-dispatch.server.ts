import { hmacHex } from "./api-auth.server";

const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

type Delivery = {
  id: string;
  tenant_id: string;
  webhook_id: string;
  event_id: string;
  event: string;
  attempts: number;
};

/**
 * Processa a fila de eventos: cria entregas para cada webhook assinante,
 * envia com assinatura HMAC e agenda novas tentativas com backoff.
 */
export async function processWebhookQueue(tenantId?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Transforma eventos pendentes em entregas
  let pendingQuery = supabaseAdmin
    .from("webhook_events")
    .select("id, tenant_id, event, payload")
    .eq("status", "pending")
    .order("created_at")
    .limit(200);
  if (tenantId) pendingQuery = pendingQuery.eq("tenant_id", tenantId);
  const { data: events } = await pendingQuery;

  for (const ev of events ?? []) {
    const { data: hooks } = await supabaseAdmin
      .from("webhooks")
      .select("id")
      .eq("tenant_id", ev.tenant_id)
      .eq("is_active", true)
      .contains("events", [ev.event]);

    if (hooks?.length) {
      await supabaseAdmin.from("webhook_deliveries").insert(
        hooks.map((h) => ({
          tenant_id: ev.tenant_id,
          webhook_id: h.id,
          event_id: ev.id,
          event: ev.event,
          status: "pending",
        })),
      );
    }
    await supabaseAdmin
      .from("webhook_events")
      .update({ status: hooks?.length ? "queued" : "skipped", processed_at: new Date().toISOString() })
      .eq("id", ev.id);
  }

  // 2. Envia entregas pendentes e reentregas vencidas
  let deliveryQuery = supabaseAdmin
    .from("webhook_deliveries")
    .select("id, tenant_id, webhook_id, event_id, event, attempts")
    .in("status", ["pending", "retry"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order("created_at")
    .limit(100);
  if (tenantId) deliveryQuery = deliveryQuery.eq("tenant_id", tenantId);
  const { data: deliveries } = await deliveryQuery;

  let sent = 0;
  let failed = 0;
  for (const d of (deliveries ?? []) as Delivery[]) {
    const ok = await deliverOne(d);
    ok ? sent++ : failed++;
  }

  return { events: events?.length ?? 0, sent, failed };
}

async function deliverOne(delivery: Delivery) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: hook }, { data: event }] = await Promise.all([
    supabaseAdmin.from("webhooks").select("url, secret, is_active").eq("id", delivery.webhook_id).maybeSingle(),
    supabaseAdmin.from("webhook_events").select("event, entity, entity_id, payload, created_at").eq("id", delivery.event_id).maybeSingle(),
  ]);

  if (!hook?.is_active || !event) {
    await supabaseAdmin.from("webhook_deliveries").update({ status: "canceled" }).eq("id", delivery.id);
    return false;
  }

  const body = JSON.stringify({
    id: delivery.event_id,
    event: event.event,
    entity: event.entity,
    entity_id: event.entity_id,
    tenant_id: delivery.tenant_id,
    created_at: event.created_at,
    data: event.payload,
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await hmacHex(hook.secret, `${timestamp}.${body}`);
  const attempts = delivery.attempts + 1;

  let status = 0;
  let responseText = "";
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nexus-event": event.event,
        "x-nexus-timestamp": timestamp,
        "x-nexus-signature": `sha256=${signature}`,
        "user-agent": "NexusERP-Webhooks/1.0",
      },
      body,
    });
    status = res.status;
    responseText = (await res.text()).slice(0, 800);
  } catch (err) {
    responseText = String(err).slice(0, 800);
  }

  const success = status >= 200 && status < 300;
  const exhausted = !success && attempts >= MAX_ATTEMPTS;
  const backoff = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)]!;

  await supabaseAdmin
    .from("webhook_deliveries")
    .update({
      attempts,
      status: success ? "delivered" : exhausted ? "failed" : "retry",
      response_status: status || null,
      response_body: responseText || null,
      delivered_at: success ? new Date().toISOString() : null,
      next_retry_at: success || exhausted ? null : new Date(Date.now() + backoff * 60_000).toISOString(),
    })
    .eq("id", delivery.id);

  return success;
}
