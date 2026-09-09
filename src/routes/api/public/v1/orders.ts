import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, jsonResponse } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const caller = await authenticateApiKey(request);
        if (!caller) return jsonResponse({ error: "unauthorized" }, 401);

        const url = new URL(request.url);
        const kind = url.searchParams.get("kind");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("orders")
          .select("id, kind, number, party_id, issue_date, delivery_date, status, discount, shipping, total")
          .eq("tenant_id", caller.tenantId)
          .order("issue_date", { ascending: false })
          .limit(limit);
        if (kind === "sale" || kind === "purchase") q = q.eq("kind", kind);

        const { data: orders, error } = await q;
        if (error) return jsonResponse({ error: error.message }, 400);

        const ids = (orders ?? []).map((o) => o.id);
        const { data: items } = ids.length
          ? await supabaseAdmin
              .from("order_items")
              .select("id, order_id, product_id, description, quantity, unit_price, total")
              .in("order_id", ids)
          : { data: [] as never[] };

        return jsonResponse({
          data: (orders ?? []).map((o) => ({ ...o, items: (items ?? []).filter((i) => i.order_id === o.id) })),
          count: orders?.length ?? 0,
        });
      },
    },
  },
});
