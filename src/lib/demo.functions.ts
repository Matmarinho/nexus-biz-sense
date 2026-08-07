import { createServerFn } from "@tanstack/react-start";

export const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";

/** Cria uma conta de demonstração temporária e devolve as credenciais para login imediato. */
export const createDemoAccess = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const email = `demo.${token}@nexus-demo.app`;
  const password = `Demo!${crypto.randomUUID()}`;

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Visitante Demo", is_demo: true },
  });
  if (error || !created.user) {
    throw new Error(error?.message ?? "Não foi possível criar o acesso de demonstração.");
  }

  const userId = created.user.id;

  await supabaseAdmin.from("profiles").upsert(
    { id: userId, email, full_name: "Visitante Demo" },
    { onConflict: "id" },
  );
  await supabaseAdmin
    .from("tenant_users")
    .upsert(
      { tenant_id: DEMO_TENANT_ID, user_id: userId, role: "manager", status: "active" },
      { onConflict: "tenant_id,user_id" },
    );

  return { email, password };
});
