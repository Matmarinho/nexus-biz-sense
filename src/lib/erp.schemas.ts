import { z } from "zod";

const nstr = (max: number) => z.string().max(max).nullable().optional();

export const ERP_SCHEMAS = {
  customers_vendors: z.object({
    name: z.string().min(1).max(160),
    type: z.enum(["customer", "vendor", "both"]).default("customer"),
    tax_id: nstr(40),
    email: nstr(160),
    phone: nstr(40),
    notes: nstr(2000),
    is_active: z.boolean().default(true),
  }),
  product_categories: z.object({
    name: z.string().min(1).max(120),
    description: nstr(500),
    color: nstr(9),
  }),
  products: z.object({
    sku: nstr(60),
    name: z.string().min(1).max(160),
    description: nstr(2000),
    unit: z.string().max(10).default("un"),
    cost_price: z.number().min(0).max(1_000_000_000).default(0),
    sale_price: z.number().min(0).max(1_000_000_000).default(0),
    min_stock: z.number().min(0).max(1_000_000).default(0),
    category_id: z.string().uuid().nullable().optional(),
    supplier_id: z.string().uuid().nullable().optional(),
    active: z.boolean().default(true),
  }),
  stock_movements: z.object({
    product_id: z.string().uuid(),
    kind: z.enum(["in", "out", "adjust"]).default("in"),
    quantity: z.number().min(0.001).max(1_000_000),
    unit_cost: z.number().min(0).max(1_000_000_000).default(0),
    reason: nstr(200),
    reference: nstr(80),
    moved_at: z.string().min(8).max(10),
  }),
  orders: z.object({
    kind: z.enum(["sale", "purchase"]),
    number: nstr(40),
    party_id: z.string().uuid().nullable().optional(),
    issue_date: z.string().min(8).max(10),
    delivery_date: z.string().min(8).max(10).nullable().optional(),
    status: z.enum(["draft", "confirmed", "delivered", "invoiced", "canceled"]).default("draft"),
    discount: z.number().min(0).max(1_000_000_000).default(0),
    shipping: z.number().min(0).max(1_000_000_000).default(0),
    total: z.number().min(0).max(1_000_000_000).default(0),
    notes: nstr(2000),
  }),
  calendar_events: z.object({
    title: z.string().min(1).max(200),
    description: nstr(2000),
    starts_at: z.string().min(10).max(40),
    ends_at: z.string().min(10).max(40).nullable().optional(),
    all_day: z.boolean().default(false),
    location: nstr(160),
    kind: z.enum(["meeting", "task", "reminder", "deadline"]).default("meeting"),
    status: z.enum(["scheduled", "done", "canceled"]).default("scheduled"),
  }),
  files: z.object({
    name: z.string().min(1).max(200),
    path: z.string().min(1).max(500),
    mime_type: nstr(120),
    size_bytes: z.number().min(0).default(0),
    entity: nstr(60),
  }),
} as const;

export type ErpTable = keyof typeof ERP_SCHEMAS;
export const ERP_TABLES = Object.keys(ERP_SCHEMAS) as [ErpTable, ...ErpTable[]];