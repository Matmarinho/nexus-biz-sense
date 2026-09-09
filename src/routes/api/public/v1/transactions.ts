import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateApiKey, jsonResponse } from "@/lib/api-auth.server";

const createSchema = z.object({
  direction: z.enum(["income", "expense"]),
  status: z.enum(["pending", "paid", "canceled"]).default("pending"),
  amount: z.number().nonnegative().max(1_000_000_000),
  due_date: z.string().min(8).max(10),
  payment_date: z.string().min(8).max(10).nullable().optional(),
  description: z.string().min(1).max(240),
  doc_number: z.string().max(60).nullable().optional(),
  payment_method: z.string().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  bank_account_id: z.string().uuid().nullable().optional(),
  party_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  cost_center_id: z.string().uuid().nullable().optional(),
});

export const Route = createFileRoute("/api/public/v1/transactions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const caller = await authenticateApiKey(request);
        if (!caller) return jsonResponse({ error: "unauthorized" }, 401);

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500);
        const status = url.searchParams.get("status");
        const direction = url.searchParams.get("direction");
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("financial_transactions")
          .select(
            "id, direction, status, amount, due_date, payment_date, description, doc_number, payment_method, bank_account_id, party_id, category_id, created_at",
          )
          .eq("tenant_id", caller.tenantId)
          .order("due_date", { ascending: false })
          .limit(limit);
        if (status) q = q.eq("status", status);
        if (direction) q = q.eq("direction", direction);
        if (from) q = q.gte("due_date", from);
        if (to) q = q.lte("due_date", to);

        const { data, error } = await q;
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ data, count: data?.length ?? 0 });
      },
      POST: async ({ request }) => {
        const caller = await authenticateApiKey(request);
        if (!caller) return jsonResponse({ error: "unauthorized" }, 401);
        if (!caller.scopes.includes("write")) return jsonResponse({ error: "forbidden" }, 403);

        const parsed = createSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonResponse({ error: "invalid_payload", issues: parsed.error.issues }, 422);

        const values = parsed.data;
        if (values.status === "paid" && !values.payment_date) values.payment_date = values.due_date;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("financial_transactions")
          .insert({ ...values, tenant_id: caller.tenantId })
          .select("id")
          .single();
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ data }, 201);
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "access-control-allow-headers": "authorization,content-type",
          },
        }),
    },
  },
});
