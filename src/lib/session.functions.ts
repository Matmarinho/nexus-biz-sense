import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { writeAudit } from "./audit.server";

export const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export const bootstrapSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims.email as string | undefined) ?? null;
    const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;

    await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
        avatar_url: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    await supabase
      .from("user_preferences")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

    const { data: superFlag } = await supabase.rpc("is_superadmin", { _user_id: userId });
    const isSuperadmin = superFlag === true;

    if (isSuperadmin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "superadmin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    }

    const [{ data: profile }, { data: prefs }, { data: memberships }, { data: plans }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("tenant_users")
        .select("id, role, custom_permissions, status, tenant_id, tenants(*)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase.from("plans").select("*").order("sort_order"),
    ]);

    const allTenants = isSuperadmin
      ? ((await supabase.from("tenants").select("*").order("created_at")).data ?? [])
      : [];

    return {
      profile: profile ?? null,
      prefs: prefs ?? null,
      isSuperadmin,
      memberships: memberships ?? [],
      allTenants,
      plans: plans ?? [],
    };
  });

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        theme: z.enum(["dark", "light", "system"]).optional(),
        density: z.enum(["compact", "comfortable"]).optional(),
        locale: z.string().max(10).optional(),
        currency: z.string().max(5).optional(),
        date_format: z.string().max(20).optional(),
        privacy_mode: z.boolean().optional(),
        last_tenant_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        full_name: z.string().max(160).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        avatar_url: z.string().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    await writeAudit({ tenantId: null, userId: context.userId, action: "profile.update", changes: data });
    return { ok: true };
  });

export const joinDemoTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenant_users")
      .upsert(
        { tenant_id: DEMO_TENANT_ID, user_id: context.userId, role: "admin", status: "active" },
        { onConflict: "tenant_id,user_id" },
      );
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: DEMO_TENANT_ID,
      userId: context.userId,
      action: "tenant.join_demo",
      entity: "tenants",
      entityId: DEMO_TENANT_ID,
    });
    return { tenantId: DEMO_TENANT_ID };
  });

export const leaveDemoTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("tenant_users")
      .delete()
      .eq("tenant_id", DEMO_TENANT_ID)
      .eq("user_id", context.userId);
    return { ok: true };
  });