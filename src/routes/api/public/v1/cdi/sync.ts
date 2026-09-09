import { createFileRoute } from "@tanstack/react-router";

const SGS_CDI_ANNUAL =
  "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json";

/**
 * Sincroniza a taxa CDI anual (série 4389 do Banco Central) e guarda o
 * histórico diário. Executado automaticamente uma vez por dia.
 */
export const Route = createFileRoute("/api/public/v1/cdi/sync")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        try {
          const res = await fetch(SGS_CDI_ANNUAL, { headers: { accept: "application/json" } });
          if (!res.ok) throw new Error(`BCB respondeu ${res.status}`);
          const rows = (await res.json()) as { data: string; valor: string }[];
          const last = rows?.[rows.length - 1];
          if (!last) throw new Error("Série vazia");

          const [dd, mm, yyyy] = last.data.split("/");
          const rateDate = `${yyyy}-${mm}-${dd}`;
          const annual = Number(String(last.valor).replace(",", "."));
          if (!Number.isFinite(annual)) throw new Error("Valor inválido");

          await supabaseAdmin
            .from("cdi_rates")
            .upsert({ rate_date: rateDate, annual_rate: annual, source: "bcb-sgs-4389" }, { onConflict: "rate_date" });

          return Response.json({ ok: true, rate_date: rateDate, annual_rate: annual });
        } catch (err) {
          console.error("[cdi] falha na sincronização", err);
          return Response.json({ ok: false, error: String(err) }, { status: 502 });
        }
      },
    },
  },
});
