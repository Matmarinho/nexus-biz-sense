import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { writeAudit } from "./audit.server";

const roleEnum = z.enum([
  "admin",
  "manager",
  "finance",
  "employee",
  "accountant",
  "client",
  "viewer",
]);

const DEFAULT_INCOME = [
  { name: "Vendas", color: "#22C55E" },
  { name: "Serviços", color: "#10B981" },
  { name: "Outras receitas", color: "#14B8A6" },
];
const DEFAULT_EXPENSE = [
  { name: "Pessoal", color: "#EF4444" },
  { name: "Tecnologia", color: "#8B5CF6" },
  { name: "Marketing", color: "#F59E0B" },
  { name: "Impostos", color: "#64748B" },
  { name: "Aluguel", color: "#0EA5E9" },
  { name: "Fornecedores", color: "#EC4899" },
];

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        legal_name: z.string().min(2).max(160),
        trade_name: z.string().max(160).optional().nullable(),
        tax_id: z.string().max(40).optional().nullable(),
        tax_id_kind: z.enum(["cnpj", "cpf", "other"]).default("cnpj"),
        country: z.string().max(3).default("BR"),
        currency: z.string().max(5).default("BRL"),
        segment: z.string().max(120).optional().nullable(),
        headcount: z.string().max(40).optional().nullable(),
        plan_code: z.enum(["startup", "pro", "enterprise", "holding"]).default("startup"),
        billing_cycle: z.enum(["monthly", "yearly"]).default("monthly"),
        accent_color: z.string().max(9).default("#8B5CF6"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { billing_cycle, ...tenantData } = data;

    const { data: tenant, error } = await supabase
      .from("tenants")
      .insert({ ...tenantData, created_by: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: memberError } = await supabase
      .from("tenant_users")
      .insert({ tenant_id: tenant.id, user_id: userId, role: "admin", status: "active" });
    if (memberError) throw new Error(memberError.message);

    await supabase.from("subscriptions").insert({
      tenant_id: tenant.id,
      plan_code: data.plan_code,
      billing_cycle,
      status: "trialing",
    });

    await supabase.from("financial_categories").insert([
      ...DEFAULT_INCOME.map((c) => ({ ...c, tenant_id: tenant.id, kind: "income", created_by: userId })),
      ...DEFAULT_EXPENSE.map((c) => ({ ...c, tenant_id: tenant.id, kind: "expense", created_by: userId })),
    ]);
    await supabase.from("bank_accounts").insert({
      tenant_id: tenant.id,
      name: "Conta principal",
      account_type: "checking",
      currency: data.currency,
      created_by: userId,
    });

    await writeAudit({
      tenantId: tenant.id,
      userId,
      action: "tenant.create",
      entity: "tenants",
      entityId: tenant.id,
      changes: tenantData,
    });
    return { tenant };
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        patch: z.object({
          legal_name: z.string().min(2).max(160).optional(),
          trade_name: z.string().max(160).nullable().optional(),
          tax_id: z.string().max(40).nullable().optional(),
          segment: z.string().max(120).nullable().optional(),
          headcount: z.string().max(40).nullable().optional(),
          currency: z.string().max(5).optional(),
          country: z.string().max(3).optional(),
          logo_url: z.string().max(500).nullable().optional(),
          accent_color: z.string().max(9).optional(),
          theme: z.enum(["dark", "light", "system"]).optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tenants").update(data.patch).eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "tenant.update",
      entity: "tenants",
      entityId: data.tenantId,
      changes: data.patch,
    });
    return { ok: true };
  });

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: members }, { data: invites }] = await Promise.all([
      context.supabase
        .from("tenant_users")
        .select("id, user_id, role, status, custom_permissions, created_at")
        .eq("tenant_id", data.tenantId)
        .order("created_at"),
      context.supabase
        .from("tenant_invites")
        .select("*")
        .eq("tenant_id", data.tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return {
      members: (members ?? []).map((m) => ({ ...m, profiles: byId.get(m.user_id) ?? null })),
      invites: invites ?? [],
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        email: z.string().email().max(160),
        role: roleEnum,
        custom_permissions: z.record(z.string(), z.record(z.string(), z.boolean())).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();

    if (existingUser) {
      const { error } = await context.supabase.from("tenant_users").upsert(
        {
          tenant_id: data.tenantId,
          user_id: existingUser.id,
          role: data.role,
          custom_permissions: data.custom_permissions,
          status: "active",
        },
        { onConflict: "tenant_id,user_id" },
      );
      if (error) throw new Error(error.message);
      await writeAudit({
        tenantId: data.tenantId,
        userId: context.userId,
        action: "member.add",
        entity: "tenant_users",
        changes: { email: data.email, role: data.role },
      });
      return { mode: "added" as const };
    }

    const { data: invite, error } = await context.supabase
      .from("tenant_invites")
      .insert({
        tenant_id: data.tenantId,
        email: data.email,
        role: data.role,
        custom_permissions: data.custom_permissions,
        created_by: context.userId,
      })
      .select("id, email, expires_at")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "member.invite",
      entity: "tenant_invites",
      entityId: invite.id,
      changes: { email: data.email, role: data.role },
    });
    return { mode: "invited" as const, invite };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        memberId: z.string().uuid(),
        role: roleEnum.optional(),
        status: z.enum(["active", "suspended"]).optional(),
        custom_permissions: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { tenantId, memberId, ...patch } = data;
    const { error } = await context.supabase
      .from("tenant_users")
      .update(patch)
      .eq("id", memberId)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId,
      userId: context.userId,
      action: "member.update",
      entity: "tenant_users",
      entityId: memberId,
      changes: patch,
    });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), memberId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tenant_users")
      .delete()
      .eq("id", data.memberId)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "member.remove",
      entity: "tenant_users",
      entityId: data.memberId,
    });
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), inviteId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tenant_invites")
      .update({ status: "revoked" })
      .eq("id", data.inviteId)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: logs } = await context.supabase
      .from("audit_logs")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(200);
    return { logs: logs ?? [] };
  });