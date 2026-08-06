import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { writeAudit } from "./audit.server";

const uuid = z.string().uuid();

export const loadFinanceWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const t = data.tenantId;
    const [accounts, categories, costCenters, parties, transactions, transfers, alerts, recurring] =
      await Promise.all([
        s.from("bank_accounts").select("*").eq("tenant_id", t).order("name"),
        s.from("financial_categories").select("*").eq("tenant_id", t).order("name"),
        s.from("cost_centers").select("*").eq("tenant_id", t).order("name"),
        s.from("customers_vendors").select("*").eq("tenant_id", t).order("name"),
        s
          .from("financial_transactions")
          .select("*")
          .eq("tenant_id", t)
          .order("due_date", { ascending: false })
          .limit(5000),
        s.from("transfers").select("*").eq("tenant_id", t).order("transfer_date", { ascending: false }).limit(500),
        s.from("alerts").select("*").eq("tenant_id", t).neq("status", "resolved").order("created_at", { ascending: false }),
        s.from("recurring_rules").select("*").eq("tenant_id", t).eq("is_active", true),
      ]);

    return {
      accounts: accounts.data ?? [],
      categories: categories.data ?? [],
      costCenters: costCenters.data ?? [],
      parties: parties.data ?? [],
      transactions: transactions.data ?? [],
      transfers: transfers.data ?? [],
      alerts: alerts.data ?? [],
      recurring: recurring.data ?? [],
    };
  });

const transactionSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  direction: z.enum(["income", "expense"]),
  status: z.enum(["pending", "paid", "canceled"]).default("pending"),
  amount: z.number().nonnegative().max(1_000_000_000),
  due_date: z.string().min(8).max(10),
  payment_date: z.string().min(8).max(10).nullable().optional(),
  description: z.string().min(1).max(240),
  doc_number: z.string().max(60).nullable().optional(),
  payment_method: z.string().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  bank_account_id: uuid.nullable().optional(),
  party_id: uuid.nullable().optional(),
  category_id: uuid.nullable().optional(),
  cost_center_id: uuid.nullable().optional(),
});

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => transactionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    if (values.status === "paid" && !values.payment_date) values.payment_date = values.due_date;
    if (values.status !== "paid") values.payment_date = null;

    const query = id
      ? context.supabase.from("financial_transactions").update(values).eq("id", id).eq("tenant_id", values.tenant_id)
      : context.supabase
          .from("financial_transactions")
          .insert({ ...values, created_by: context.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);

    await writeAudit({
      tenantId: values.tenant_id,
      userId: context.userId,
      action: id ? "transaction.update" : "transaction.create",
      entity: "financial_transactions",
      entityId: id ?? null,
      changes: values,
    });
    return { ok: true };
  });

export const setTransactionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: uuid,
        id: uuid,
        status: z.enum(["pending", "paid", "canceled"]),
        payment_date: z.string().min(8).max(10).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_transactions")
      .update({
        status: data.status,
        payment_date:
          data.status === "paid" ? (data.payment_date ?? new Date().toISOString().slice(0, 10)) : null,
      })
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "transaction.status",
      entity: "financial_transactions",
      entityId: data.id,
      changes: { status: data.status },
    });
    return { ok: true };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_transactions")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "transaction.delete",
      entity: "financial_transactions",
      entityId: data.id,
    });
    return { ok: true };
  });

export const patchTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: uuid,
        id: uuid,
        scope: z.enum(["one", "series"]).default("one"),
        values: z.object({
          description: z.string().min(1).max(240).optional(),
          amount: z.number().nonnegative().max(1_000_000_000).optional(),
          due_date: z.string().min(8).max(10).optional(),
          payment_date: z.string().min(8).max(10).nullable().optional(),
          status: z.enum(["pending", "paid", "canceled"]).optional(),
          direction: z.enum(["income", "expense"]).optional(),
          doc_number: z.string().max(60).nullable().optional(),
          payment_method: z.string().max(40).nullable().optional(),
          notes: z.string().max(2000).nullable().optional(),
          bank_account_id: uuid.nullable().optional(),
          party_id: uuid.nullable().optional(),
          category_id: uuid.nullable().optional(),
          cost_center_id: uuid.nullable().optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const values: Record<string, unknown> = { ...data.values };
    if (values.status === "paid" && !values.payment_date) values.payment_date = values.due_date ?? new Date().toISOString().slice(0, 10);
    if (values.status && values.status !== "paid") values.payment_date = null;

    let seriesId: string | null = null;
    if (data.scope === "series") {
      const { data: row } = await context.supabase
        .from("financial_transactions")
        .select("series_id")
        .eq("id", data.id)
        .eq("tenant_id", data.tenantId)
        .maybeSingle();
      seriesId = row?.series_id ?? null;
    }

    const base = context.supabase
      .from("financial_transactions")
      .update(values as never)
      .eq("tenant_id", data.tenantId);
    const { error } = seriesId ? await base.eq("series_id", seriesId) : await base.eq("id", data.id);
    if (error) throw new Error(error.message);

    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "transaction.update",
      entity: "financial_transactions",
      entityId: data.id,
      changes: values,
    });
    return { ok: true };
  });

export const deleteTransactionSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: uuid, seriesId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_transactions")
      .delete()
      .eq("tenant_id", data.tenantId)
      .eq("series_id", data.seriesId);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenantId,
      userId: context.userId,
      action: "transaction.series.delete",
      entity: "financial_transactions",
      entityId: data.seriesId,
    });
    return { ok: true };
  });

export const createInstallments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        direction: z.enum(["income", "expense"]),
        status: z.enum(["pending", "paid"]).default("pending"),
        description: z.string().min(1).max(200),
        amount: z.number().positive().max(1_000_000_000),
        amount_mode: z.enum(["total", "per_installment"]).default("per_installment"),
        first_due_date: z.string().min(8).max(10),
        installments: z.number().int().min(1).max(120),
        interval: z.enum(["monthly", "weekly", "biweekly", "quarterly", "yearly"]).default("monthly"),
        doc_number: z.string().max(60).nullable().optional(),
        payment_method: z.string().max(40).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        bank_account_id: uuid.nullable().optional(),
        party_id: uuid.nullable().optional(),
        category_id: uuid.nullable().optional(),
        cost_center_id: uuid.nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const n = data.installments;
    const seriesId = n > 1 ? crypto.randomUUID() : null;
    const cents = Math.round((data.amount_mode === "total" ? data.amount / n : data.amount) * 100);
    const totalCents = data.amount_mode === "total" ? Math.round(data.amount * 100) : cents * n;

    const rows = Array.from({ length: n }, (_, i) => {
      const d = new Date(`${data.first_due_date}T12:00:00`);
      if (data.interval === "weekly") d.setDate(d.getDate() + 7 * i);
      else if (data.interval === "biweekly") d.setDate(d.getDate() + 14 * i);
      else if (data.interval === "quarterly") d.setMonth(d.getMonth() + 3 * i);
      else if (data.interval === "yearly") d.setFullYear(d.getFullYear() + i);
      else d.setMonth(d.getMonth() + i);
      const amountCents = i === n - 1 ? totalCents - cents * (n - 1) : cents;
      const due = d.toISOString().slice(0, 10);
      return {
        tenant_id: data.tenant_id,
        direction: data.direction,
        status: data.status,
        amount: amountCents / 100,
        due_date: due,
        payment_date: data.status === "paid" ? due : null,
        description: n > 1 ? `${data.description} (${i + 1}/${n})` : data.description,
        doc_number: data.doc_number ?? null,
        payment_method: data.payment_method ?? null,
        notes: data.notes ?? null,
        bank_account_id: data.bank_account_id || null,
        party_id: data.party_id || null,
        category_id: data.category_id || null,
        cost_center_id: data.cost_center_id || null,
        series_id: seriesId,
        installment_no: n > 1 ? i + 1 : null,
        installment_total: n > 1 ? n : null,
        created_by: context.userId,
      };
    });

    const { error } = await context.supabase.from("financial_transactions").insert(rows);
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId: data.tenant_id,
      userId: context.userId,
      action: n > 1 ? "transaction.series.create" : "transaction.create",
      entity: "financial_transactions",
      entityId: seriesId,
      changes: { description: data.description, installments: n },
    });
    return { ok: true, count: n };
  });

const ENTITY_TABLES = {
  bank_accounts: z.object({
    name: z.string().min(1).max(120),
    bank_name: z.string().max(120).nullable().optional(),
    account_type: z.enum(["checking", "savings", "cash", "investment", "card"]),
    opening_balance: z.number().max(1_000_000_000),
    currency: z.string().max(5).default("BRL"),
    color: z.string().max(9).nullable().optional(),
    is_active: z.boolean().default(true),
    bank_code: z.string().max(20).nullable().optional(),
    logo_url: z.string().max(500).nullable().optional(),
    card_limit: z.number().min(0).max(1_000_000_000).default(0),
    card_used: z.number().min(0).max(1_000_000_000).default(0),
    invested_amount: z.number().min(0).max(1_000_000_000).default(0),
    yield_cdi_percent: z.number().min(0).max(1000).default(0),
    credit_score: z.number().int().min(0).max(1000).nullable().optional(),
    connection_status: z.enum(["manual", "connected", "syncing", "error"]).default("manual"),
  }),
  financial_categories: z.object({
    name: z.string().min(1).max(120),
    kind: z.enum(["income", "expense"]),
    color: z.string().max(9).nullable().optional(),
  }),
  cost_centers: z.object({
    name: z.string().min(1).max(120),
    code: z.string().max(30).nullable().optional(),
  }),
  customers_vendors: z.object({
    name: z.string().min(1).max(160),
    type: z.enum(["customer", "vendor", "both"]),
    tax_id: z.string().max(40).nullable().optional(),
    email: z.string().max(160).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    is_active: z.boolean().default(true),
  }),
} as const;

type EntityTable = keyof typeof ENTITY_TABLES;

export const saveEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const base = z
      .object({
        table: z.enum(["bank_accounts", "financial_categories", "cost_centers", "customers_vendors"]),
        tenantId: uuid,
        id: uuid.optional(),
        values: z.record(z.string(), z.unknown()),
      })
      .parse(d);
    const values = ENTITY_TABLES[base.table as EntityTable].parse(base.values);
    return { ...base, values };
  })
  .handler(async ({ data, context }) => {
    const payload = { ...data.values, tenant_id: data.tenantId } as never;
    const query = data.id
      ? context.supabase.from(data.table).update(payload).eq("id", data.id).eq("tenant_id", data.tenantId)
      : context.supabase.from(data.table).insert({ ...(payload as object), created_by: context.userId } as never);
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

export const deleteEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        table: z.enum(["bank_accounts", "financial_categories", "cost_centers", "customers_vendors"]),
        tenantId: uuid,
        id: uuid,
      })
      .parse(d),
  )
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

export const saveTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: uuid,
        from_account_id: uuid,
        to_account_id: uuid,
        amount: z.number().positive(),
        transfer_date: z.string().min(8).max(10),
        description: z.string().max(240).nullable().optional(),
      })
      .refine((v) => v.from_account_id !== v.to_account_id, {
        message: "As contas de origem e destino devem ser diferentes.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { tenantId, ...values } = data;
    const { error } = await context.supabase
      .from("transfers")
      .insert({ ...values, tenant_id: tenantId, created_by: context.userId });
    if (error) throw new Error(error.message);
    await writeAudit({
      tenantId,
      userId: context.userId,
      action: "transfer.create",
      entity: "transfers",
      changes: values,
    });
    return { ok: true };
  });

export const updateAlertStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: uuid,
        id: uuid,
        status: z.enum(["open", "read", "snoozed", "resolved"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("alerts")
      .update({
        status: data.status,
        snoozed_until:
          data.status === "snoozed" ? new Date(Date.now() + 7 * 864e5).toISOString() : null,
      })
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });