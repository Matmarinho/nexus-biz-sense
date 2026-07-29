import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { writeAudit } from "./audit.server";

async function assertSuperadmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_superadmin", { _user_id: context.userId });
  if (data !== true) throw new Error("Acesso restrito ao console supremo.");
}

export const loadConsole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [tenants, members, profiles, roles, plans, subs, logs, tx] = await Promise.all([
      supabaseAdmin.from("tenants").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("tenant_users").select("id, tenant_id, user_id, role, status"),
      supabaseAdmin.from("profiles").select("id, email, full_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("plans").select("*").order("sort_order"),
      supabaseAdmin.from("subscriptions").select("*"),
      supabaseAdmin
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin.from("financial_transactions").select("id, tenant_id"),
    ]);

    return {
      tenants: tenants.data ?? [],
      members: members.data ?? [],
      profiles: profiles.data ?? [],
      roles: roles.data ?? [],
      plans: plans.data ?? [],
      subscriptions: subs.data ?? [],
      logs: logs.data ?? [],
      transactionCounts: (tx.data ?? []).reduce<Record<string, number>>((acc, row: { tenant_id: string }) => {
        acc[row.tenant_id] = (acc[row.tenant_id] ?? 0) + 1;
        return acc;
      }, {}),
    };
  });

export const setSuperadmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context);
    if (data.userId === context.userId && !data.enabled) {
      throw new Error("Você não pode remover o seu próprio acesso supremo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "superadmin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "superadmin");
      if (error) throw new Error(error.message);
    }
    await writeAudit({
      tenantId: null,
      userId: context.userId,
      action: data.enabled ? "platform.superadmin.grant" : "platform.superadmin.revoke",
      entity: "user_roles",
      entityId: data.userId,
    });
    return { ok: true };
  });

export const setTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        status: z.enum(["active", "suspended"]).optional(),
        plan_code: z.enum(["startup", "pro", "enterprise", "holding"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tenantId, ...patch } = data;
    const { error } = await supabaseAdmin.from("tenants").update(patch).eq("id", tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId,
      userId: context.userId,
      action: "platform.tenant.update",
      entity: "tenants",
      entityId: tenantId,
      changes: patch,
    });
    return { ok: true };
  });

export const joinTenantAsSuperadmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_users")
      .upsert(
        { tenant_id: data.tenantId, user_id: context.userId, role: "admin", status: "active" },
        { onConflict: "tenant_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
