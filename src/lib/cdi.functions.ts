import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Taxa CDI anual usada como fallback quando ainda não há histórico. */
export const CDI_FALLBACK = 14.9;

/**
 * Devolve a taxa CDI mais recente e o histórico dos últimos 90 dias.
 * Se o histórico estiver desatualizado, busca a série do Banco Central na hora.
 */
export const loadCdi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await context.supabase
      .from("cdi_rates")
      .select("rate_date, annual_rate, source")
      .order("rate_date", { ascending: false })
      .limit(90);

    const latest = rows?.[0] ?? null;
    const stale =
      !latest || Date.now() - new Date(`${latest.rate_date}T12:00:00Z`).getTime() > 2 * 864e5;

    if (stale) {
      const fresh = await syncFromBcb();
      if (fresh) {
        return {
          rate: fresh.annual_rate,
          date: fresh.rate_date,
          source: "bcb-sgs-4389",
          history: [fresh, ...(rows ?? [])].slice(0, 90).reverse(),
        };
      }
    }

    return {
      rate: Number(latest?.annual_rate ?? CDI_FALLBACK),
      date: latest?.rate_date ?? new Date().toISOString().slice(0, 10),
      source: latest?.source ?? "fallback",
      history: (rows ?? []).slice().reverse(),
    };
  });

async function syncFromBcb() {
  try {
    const res = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json",
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: string; valor: string }[];
    const last = rows?.[rows.length - 1];
    if (!last) return null;
    const [dd, mm, yyyy] = last.data.split("/");
    const rate_date = `${yyyy}-${mm}-${dd}`;
    const annual_rate = Number(String(last.valor).replace(",", "."));
    if (!Number.isFinite(annual_rate)) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("cdi_rates")
      .upsert({ rate_date, annual_rate, source: "bcb-sgs-4389" }, { onConflict: "rate_date" });
    return { rate_date, annual_rate, source: "bcb-sgs-4389" };
  } catch (err) {
    console.error("[cdi] sync inline falhou", err);
    return null;
  }
}
