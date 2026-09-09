/** Utilitários server-only para chaves de API e assinatura de webhooks. */

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}

export async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateApiKey() {
  const raw = `nx_live_${randomToken(24)}`;
  return { raw, prefix: raw.slice(0, 16) };
}

export type ApiCaller = { tenantId: string; keyId: string; scopes: string[] };

/** Valida o header Authorization: Bearer <chave> e devolve a empresa dona da chave. */
export async function authenticateApiKey(request: Request): Promise<ApiCaller | null> {
  const header = request.headers.get("authorization") ?? "";
  const raw = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!raw) return null;

  const hash = await sha256Hex(raw);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id, tenant_id, scopes, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!data || data.revoked_at) return null;
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { tenantId: data.tenant_id, keyId: data.id, scopes: data.scopes ?? [] };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
