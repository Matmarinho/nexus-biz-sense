import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider } from "@/components/app/theme-provider";
import { WorkspaceProvider } from "@/components/app/workspace";
import { AppShell } from "@/components/app/shell";
import { MfaGate } from "@/components/app/mfa-gate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <AppShell>
          <MfaGate>
            <Outlet />
          </MfaGate>
        </AppShell>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}