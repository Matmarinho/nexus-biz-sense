import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { loadErp } from "@/lib/erp.functions";
import { useWorkspace } from "@/components/app/workspace";

export function useErp() {
  const { tenantId } = useWorkspace();
  const load = useServerFn(loadErp);
  return useQuery({
    queryKey: ["erp", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => load({ data: { tenantId: tenantId! } }),
    staleTime: 30_000,
  });
}