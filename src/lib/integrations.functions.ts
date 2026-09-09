import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { writeAudit } from "./audit.server";

const uuid = z.string().uuid();

export const WEBHOOK_EVENTS = [
  { id: "transaction.created", label: "Lançamento criado" },
  { id: "transaction.paid", label: "Lançamento liquidado" },
  { id: "transaction.overdue", label: "Lançamento vencido" },
  { id: "deal.won", label: "Negócio ganho no CRM" },
  { id: "stock.low", label: "Estoque abaixo do mínimo" },
  { id: "order.invoiced", label: "Pedido faturado" },
] as const;

const EVENT_IDS = WEBHOOK_EVENTS.map((e) => e.id) as unknown as [string, ...string[]];

export const loadIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const t = data.tenantId;
    const [keys, hooks, events, deliveries] = await Promise.all([
      s.from("api_keys").select("*").eq("tenant_id", t).order("created_at", { ascending: false }),
      s.from("webhooks").select("*").eq("tenant_id", t).order("created_at", { ascending: false }),
      s.from("webhook_events").select("*").eq("tenant_id", t).order("created_at", { ascending: false }).limit(50),
      s.from("webhook_deliveries").select("*").eq("tenant_id", t).order("created_at", { ascending: false }).limit(100),
    ]);
    return {
      keys: (keys.data ?? []).map((k) => ({ ...k, key_hash: undefined })),
      webhooks: hooks.data ?? [],
      events: events.data ?? [],
      deliveries: deliveries.data ?? [],
    };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: uuid,
        name: z.string().min(1).max(80),
        scopes: z.array(z.enum(["read", "write"])).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { generateApiKey, sha256Hex } = await import("./api-auth.server");
    const { raw, prefix } = generateApiKey();
    const { error } = await context.supabase.from("api_keys").insert({
      tenant_id: data.tenantId,
      name: data.name,
      key_prefix: prefix,
      key_hash: await sha256Hex(raw),
      scopes: data.scopes,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "api_key.create",
      entity: "api_keys",
      changes: { name: data.name, scopes: data.scopes },
    });
    return { key: raw };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "api_key.revoke",
      entity: "api_keys",
      entityId: data.id,
    });
    return { ok: true };
  });

export const saveWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: uuid,
        id: uuid.optional(),
        url: z.string().url().max(500),
        description: z.string().max(160).nullable().optional(),
        events: z.array(z.enum(EVENT_IDS)).min(1),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { randomToken } = await import("./api-auth.server");
    const { tenantId, id, ...values } = data;
    if (id) {
      const { error } = await context.supabase
        .from("webhooks")
        .update(values)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("webhooks").insert({
        ...values,
        tenant_id: tenantId,
        secret: `whsec_${randomToken(20)}`,
        created_by: context.userId,
      });
      if (error) throw new Error(error.message);
    }
    await writeAudit({
      tenantId,
      userId: context.userId,
      action: id ? "webhook.update" : "webhook.create",
      entity: "webhooks",
      entityId: id ?? null,
      changes: values,
    });
    return { ok: true };
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("webhooks")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "webhook.delete",
      entity: "webhooks",
      entityId: data.id,
    });
    return { ok: true };
  });

/** Enfileira um evento de teste e processa a fila imediatamente. */
export const sendTestWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: hook } = await context.supabase
      .from("webhooks")
      .select("id, events")
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (!hook) throw new Error("Webhook não encontrado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("webhook_events").insert({
      tenant_id: data.tenantId,
      event: hook.events[0] ?? "transaction.created",
      entity: "test",
      payload: { test: true, sent_at: new Date().toISOString() },
    });
    const { processWebhookQueue } = await import("./webhook-dispatch.server");
    return await processWebhookQueue(data.tenantId);
  });

/** Dispara o processamento manual da fila (botão "reenviar agora"). */
export const runWebhookQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid }).parse(d))
  .handler(async ({ data }) => {
    const { processWebhookQueue } = await import("./webhook-dispatch.server");
    return await processWebhookQueue(data.tenantId);
  });
