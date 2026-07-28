import { getRequest } from "@tanstack/react-start/server";

export async function writeAudit(entry: {
  tenantId: string | null;
  userId: string;
  action: string;
  entity?: string;
  entityId?: string | null;
  changes?: unknown;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let ip: string | null = null;
    try {
      const req = getRequest();
      ip =
        req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req?.headers.get("cf-connecting-ip") ??
        null;
    } catch {
      ip = null;
    }
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: entry.tenantId,
      user_id: entry.userId,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      ip_address: ip,
      payload_changes: (entry.changes ?? null) as never,
    });
  } catch (err) {
    console.error("[audit] falha ao registrar", err);
  }
}