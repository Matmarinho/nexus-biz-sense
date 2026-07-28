import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapSession } from "@/lib/session.functions";
import type { AppRole, ActionKey, CustomPermissions, ModuleKey } from "@/lib/permissions";
import { checkPermission } from "@/lib/permissions";
import type { Tables } from "@/integrations/supabase/types";

export type Membership = {
  id: string;
  role: AppRole;
  status: string;
  tenant_id: string;
  custom_permissions: CustomPermissions | null;
  tenants: Tables<"tenants"> | null;
};

type WorkspaceCtx = {
  loading: boolean;
  profile: Tables<"profiles"> | null;
  isSuperadmin: boolean;
  memberships: Membership[];
  allTenants: Tables<"tenants">[];
  plans: Tables<"plans">[];
  tenant: Tables<"tenants"> | null;
  tenantId: string | null;
  role: AppRole | null;
  can: (module: ModuleKey, action: ActionKey) => boolean;
  setTenantId: (id: string) => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<WorkspaceCtx | null>(null);
const STORAGE_TENANT = "nexus.tenant";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const bootstrap = useServerFn(bootstrapSession);
  const queryClient = useQueryClient();
  const [tenantId, setTenantIdState] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: () => bootstrap({ data: undefined }),
    staleTime: 60_000,
  });

  const memberships = (data?.memberships ?? []) as unknown as Membership[];
  const isSuperadmin = data?.isSuperadmin ?? false;
  const allTenants = (data?.allTenants ?? []) as unknown as Tables<"tenants">[];

  const available = useMemo(() => {
    const map = new Map<string, Tables<"tenants">>();
    for (const m of memberships) if (m.tenants) map.set(m.tenant_id, m.tenants);
    for (const t of allTenants) if (!map.has(t.id)) map.set(t.id, t);
    return map;
  }, [memberships, allTenants]);

  useEffect(() => {
    if (!data) return;
    const stored = window.localStorage.getItem(STORAGE_TENANT);
    const preferred = data.prefs?.last_tenant_id ?? null;
    const first = memberships[0]?.tenant_id ?? allTenants[0]?.id ?? null;
    const next = [stored, preferred, first].find((id) => id && available.has(id)) ?? null;
    setTenantIdState((cur) => (cur && available.has(cur) ? cur : next));
  }, [data, available, memberships, allTenants]);

  const setTenantId = (id: string) => {
    window.localStorage.setItem(STORAGE_TENANT, id);
    setTenantIdState(id);
  };

  const membership = memberships.find((m) => m.tenant_id === tenantId) ?? null;
  const role: AppRole | null = isSuperadmin ? "superadmin" : (membership?.role ?? null);

  const value: WorkspaceCtx = {
    loading: isLoading,
    profile: (data?.profile ?? null) as Tables<"profiles"> | null,
    isSuperadmin,
    memberships,
    allTenants,
    plans: (data?.plans ?? []) as unknown as Tables<"plans">[],
    tenant: tenantId ? (available.get(tenantId) ?? null) : null,
    tenantId,
    role,
    can: (module, action) => checkPermission(role, membership?.custom_permissions, module, action),
    setTenantId,
    refresh: async () => {
      await queryClient.invalidateQueries();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace deve ser usado dentro de WorkspaceProvider");
  return ctx;
}