import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { writeAudit } from "./audit.server";

const uuid = z.string().uuid();

export const loadCrm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const t = data.tenantId;
    const [stages, deals, parties, activities] = await Promise.all([
      s.from("crm_stages").select("*").eq("tenant_id", t).order("position"),
      s.from("crm_deals").select("*").eq("tenant_id", t).order("updated_at", { ascending: false }).limit(2000),
      s.from("customers_vendors").select("id,name,kind").eq("tenant_id", t).order("name"),
      s.from("crm_activities").select("*").eq("tenant_id", t).order("due_date").limit(1000),
    ]);
    return {
      stages: stages.data ?? [],
      deals: deals.data ?? [],
      parties: parties.data ?? [],
      activities: activities.data ?? [],
    };
  });

const dealSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  title: z.string().min(1).max(200),
  stage_id: uuid.nullable().optional(),
  party_id: uuid.nullable().optional(),
  contact_name: z.string().max(160).nullable().optional(),
  contact_email: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(60).nullable().optional(),
  amount: z.number().nonnegative().max(1_000_000_000).default(0),
  currency: z.string().max(5).default("BRL"),
  status: z.enum(["open", "won", "lost"]).default("open"),
  source: z.string().max(80).nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  expected_close_date: z.string().min(8).max(10).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const saveDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dealSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const query = id
      ? context.supabase.from("crm_deals").update(values).eq("id", id).eq("tenant_id", values.tenant_id)
      : context.supabase
          .from("crm_deals")
          .insert({ ...values, created_by: context.userId, owner_id: context.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: values.tenant_id,
      userId: context.userId,
      action: id ? "deal.update" : "deal.create",
      entity: "crm_deals",
      entityId: id ?? null,
      changes: values,
    });
    return { ok: true };
  });

export const patchDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        tenant_id: uuid,
        stage_id: uuid.nullable().optional(),
        status: z.enum(["open", "won", "lost"]).optional(),
        amount: z.number().nonnegative().optional(),
        expected_close_date: z.string().min(8).max(10).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, tenant_id, ...patch } = data;
    const values: {
      stage_id?: string | null;
      status?: string;
      amount?: number;
      expected_close_date?: string | null;
      closed_at?: string | null;
    } = { ...patch };
    if (patch.status && patch.status !== "open") values.closed_at = new Date().toISOString();
    if (patch.status === "open") values.closed_at = null;
    const { error } = await context.supabase
      .from("crm_deals")
      .update(values)
      .eq("id", id)
      .eq("tenant_id", tenant_id);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: tenant_id,
      userId: context.userId,
      action: "deal.patch",
      entity: "crm_deals",
      entityId: id,
      changes: values,
    });
    return { ok: true };
  });

export const deleteDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, tenant_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("crm_deals")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenant_id,
      userId: context.userId,
      action: "deal.delete",
      entity: "crm_deals",
      entityId: data.id,
    });
    return { ok: true };
  });

export const saveActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        tenant_id: uuid,
        deal_id: uuid,
        kind: z.enum(["task", "call", "meeting", "email", "note"]).default("task"),
        title: z.string().min(1).max(200),
        due_date: z.string().min(8).max(10).nullable().optional(),
        done: z.boolean().default(false),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const query = id
      ? context.supabase.from("crm_activities").update(values).eq("id", id).eq("tenant_id", values.tenant_id)
      : context.supabase.from("crm_activities").insert({ ...values, owner_id: context.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, tenant_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("crm_activities")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });