import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { loadFinanceWorkspace } from "@/lib/finance.functions";
import { useWorkspace } from "./workspace";

export function useFinance() {
  const { tenantId } = useWorkspace();
  const load = useServerFn(loadFinanceWorkspace);
  return useQuery({
    queryKey: ["finance", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => load({ data: { tenantId: tenantId! } }),
    staleTime: 30_000,
  });
}