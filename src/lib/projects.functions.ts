import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { writeAudit } from "./audit.server";

const uuid = z.string().uuid();

export const loadProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const t = data.tenantId;
    const [projects, tasks, parties] = await Promise.all([
      s.from("projects").select("*").eq("tenant_id", t).order("created_at", { ascending: false }).limit(500),
      s.from("project_tasks").select("*").eq("tenant_id", t).order("position").limit(3000),
      s.from("customers_vendors").select("id,name").eq("tenant_id", t).order("name"),
    ]);
    return { projects: projects.data ?? [], tasks: tasks.data ?? [], parties: parties.data ?? [] };
  });

const projectSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  name: z.string().min(1).max(200),
  code: z.string().max(40).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  party_id: uuid.nullable().optional(),
  status: z.enum(["planning", "active", "paused", "done", "canceled"]).default("planning"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  start_date: z.string().min(8).max(10).nullable().optional(),
  end_date: z.string().min(8).max(10).nullable().optional(),
  budget: z.number().nonnegative().max(1_000_000_000).default(0),
  actual_cost: z.number().nonnegative().max(1_000_000_000).default(0),
  progress: z.number().int().min(0).max(100).default(0),
});

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const query = id
      ? context.supabase.from("projects").update(values).eq("id", id).eq("tenant_id", values.tenant_id)
      : context.supabase
          .from("projects")
          .insert({ ...values, created_by: context.userId, owner_id: context.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: values.tenant_id,
      userId: context.userId,
      action: id ? "project.update" : "project.create",
      entity: "projects",
      entityId: id ?? null,
      changes: values,
    });
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, tenant_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenant_id,
      userId: context.userId,
      action: "project.delete",
      entity: "projects",
      entityId: data.id,
    });
    return { ok: true };
  });

const taskSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  project_id: uuid,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["todo", "doing", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  due_date: z.string().min(8).max(10).nullable().optional(),
  estimated_hours: z.number().nonnegative().max(100000).nullable().optional(),
  actual_hours: z.number().nonnegative().max(100000).nullable().optional(),
});

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taskSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const query = id
      ? context.supabase.from("project_tasks").update(values).eq("id", id).eq("tenant_id", values.tenant_id)
      : context.supabase.from("project_tasks").insert({ ...values, assignee_id: context.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const patchTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        tenant_id: uuid,
        status: z.enum(["todo", "doing", "review", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        due_date: z.string().min(8).max(10).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, tenant_id, ...patch } = data;
    const { error } = await context.supabase
      .from("project_tasks")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, tenant_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_tasks")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });