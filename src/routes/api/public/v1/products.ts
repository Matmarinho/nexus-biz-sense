import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, jsonResponse } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const caller = await authenticateApiKey(request);
        if (!caller) return jsonResponse({ error: "unauthorized" }, 401);

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 1000);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("products")
          .select("id, sku, name, unit, cost_price, sale_price, stock_qty, min_stock, active, category_id")
          .eq("tenant_id", caller.tenantId)
          .order("name")
          .limit(limit);
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ data, count: data?.length ?? 0 });
      },
    },
  },
});
