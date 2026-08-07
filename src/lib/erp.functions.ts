import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ERP_SCHEMAS, ERP_TABLES, type ErpTable } from "./erp.schemas";
import { writeAudit } from "./audit.server";

const uuid = z.string().uuid();
const tableEnum = z.enum(ERP_TABLES);

export const loadErp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const t = data.tenantId;
    const [parties, categories, products, movements, orders, orderItems, events, files] = await Promise.all([
      s.from("customers_vendors").select("*").eq("tenant_id", t).order("name"),
      s.from("product_categories").select("*").eq("tenant_id", t).order("name"),
      s.from("products").select("*").eq("tenant_id", t).order("name").limit(2000),
      s.from("stock_movements").select("*").eq("tenant_id", t).order("moved_at", { ascending: false }).limit(1000),
      s.from("orders").select("*").eq("tenant_id", t).order("issue_date", { ascending: false }).limit(1000),
      s.from("order_items").select("*").eq("tenant_id", t).limit(5000),
      s.from("calendar_events").select("*").eq("tenant_id", t).order("starts_at", { ascending: false }).limit(1000),
      s.from("files").select("*").eq("tenant_id", t).order("created_at", { ascending: false }).limit(1000),
    ]);
    return {
      parties: parties.data ?? [],
      categories: categories.data ?? [],
      products: products.data ?? [],
      movements: movements.data ?? [],
      orders: orders.data ?? [],
      orderItems: orderItems.data ?? [],
      events: events.data ?? [],
      files: files.data ?? [],
    };
  });

export const saveRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const base = z
      .object({
        table: tableEnum,
        tenantId: uuid,
        id: uuid.optional(),
        values: z.record(z.string(), z.unknown()),
      })
      .parse(d);
    return { ...base, values: ERP_SCHEMAS[base.table as ErpTable].parse(base.values) as Record<string, unknown> };
  })
  .handler(async ({ data, context }) => {
    const payload = { ...data.values, tenant_id: data.tenantId } as never;
    const query = data.id
      ? context.supabase.from(data.table).update(payload).eq("id", data.id).eq("tenant_id", data.tenantId)
      : context.supabase.from(data.table).insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: data.id ? `${data.table}.update` : `${data.table}.create`,
      entity: data.table,
      entityId: data.id ?? null,
      changes: data.values,
    });
    return { ok: true };
  });

export const removeRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ table: tableEnum, tenantId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from(data.table)
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: `${data.table}.delete`,
      entity: data.table,
      entityId: data.id,
    });
    return { ok: true };
  });

export const saveOrderWithItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: uuid,
        id: uuid.optional(),
        order: ERP_SCHEMAS.orders,
        items: z
          .array(
            z.object({
              product_id: uuid.nullable().optional(),
              description: z.string().min(1).max(200),
              quantity: z.number().min(0.001).max(1_000_000),
              unit_price: z.number().min(0).max(1_000_000_000),
            }),
          )
          .max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const itemsTotal = data.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const total = Math.max(0, itemsTotal - data.order.discount + data.order.shipping);
    const payload = { ...data.order, total, tenant_id: data.tenantId } as never;

    let orderId = data.id;
    if (orderId) {
      const { error } = await s.from("orders").update(payload).eq("id", orderId).eq("tenant_id", data.tenantId);
      if (error) throw new Error(error.message);
      await s.from("order_items").delete().eq("order_id", orderId).eq("tenant_id", data.tenantId);
    } else {
      const { data: created, error } = await s
        .from("orders")
        .insert({ ...(payload as object), created_by: context.userId } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      orderId = created.id;
    }

    if (data.items.length) {
      const { error } = await s.from("order_items").insert(
        data.items.map((i) => ({
          tenant_id: data.tenantId,
          order_id: orderId!,
          product_id: i.product_id ?? null,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.quantity * i.unit_price,
        })),
      );
      if (error) throw new Error(error.message);
    }

    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: data.id ? "orders.update" : "orders.create",
      entity: "orders",
      entityId: orderId ?? null,
      changes: { ...data.order, total },
    });
    return { ok: true, id: orderId };
  });