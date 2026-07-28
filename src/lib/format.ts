export const BRL = (v: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v ?? 0);

/** Formata com sinal explícito: +R$ 1.000,00 / -R$ 1.000,00 */
export function signedCurrency(v: number, currency = "BRL") {
  const abs = BRL(Math.abs(v ?? 0), currency);
  if (!v) return abs;
  return `${v > 0 ? "+" : "-"}${abs}`;
}

export function signedPercent(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${s}${Math.abs(v).toFixed(digits).replace(".", ",")}%`;
}

export const toneOf = (v: number | null | undefined) =>
  v === null || v === undefined || v === 0 ? "neutral" : v > 0 ? "positive" : "negative";

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(new Date(`${iso}-01T00:00:00`))
    .replace(".", "");

export const compact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v ?? 0);