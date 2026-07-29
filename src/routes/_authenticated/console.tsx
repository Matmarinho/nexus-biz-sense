import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Crown, LogIn, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/components/app/workspace";
import { formatDate } from "@/lib/format";
import {
  joinTenantAsSuperadmin,
  loadConsole,
  setSuperadmin,
  setTenantStatus,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Console supremo · Nexus ERP" },
      {
        name: "description",
        content: "Visão global da plataforma: empresas, planos, usuários e trilha de auditoria.",
      },
      { property: "og:title", content: "Console supremo · Nexus ERP" },
      { property: "og:description", content: "Administração global de todas as empresas da plataforma." },
    ],
  }),
  component: ConsolePage,
});

const PLANS = ["startup", "pro", "enterprise", "holding"] as const;

function ConsolePage() {
  const ws = useWorkspace();
  const queryClient = useQueryClient();
  const load = useServerFn(loadConsole);
  const grant = useServerFn(setSuperadmin);
  const patchTenant = useServerFn(setTenantStatus);
  const join = useServerFn(joinTenantAsSuperadmin);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["console"],
    queryFn: () => load({ data: undefined }),
    enabled: ws.isSuperadmin,
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["console"] });

  const grantMut = useMutation({
    mutationFn: (vars: { userId: string; enabled: boolean }) => grant({ data: vars }),
    onSuccess: () => {
      toast.success("Acesso supremo atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error("Falha", { description: e.message }),
  });

  const tenantMut = useMutation({
    mutationFn: (vars: { tenantId: string; status?: "active" | "suspended"; plan_code?: (typeof PLANS)[number] }) =>
      patchTenant({ data: vars }),
    onSuccess: () => {
      toast.success("Empresa atualizada");
      invalidate();
      ws.refresh();
    },
    onError: (e: Error) => toast.error("Falha", { description: e.message }),
  });

  const superIds = useMemo(
    () => new Set((data?.roles ?? []).filter((r) => r.role === "superadmin").map((r) => r.user_id)),
    [data],
  );

  const memberCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of data?.members ?? []) map[m.tenant_id] = (map[m.tenant_id] ?? 0) + 1;
    return map;
  }, [data]);

  if (!ws.isSuperadmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border/60 p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 size-8 text-negative" />
        <h1 className="font-display text-lg font-semibold">Área restrita</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Somente contas com acesso supremo podem abrir o console global.
        </p>
      </div>
    );
  }

  const profiles = (data?.profiles ?? []).filter((p) =>
    search
      ? `${p.full_name ?? ""} ${p.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Console supremo</h1>
        <p className="text-sm text-muted-foreground">
          Governança global: empresas, planos, contas e auditoria da plataforma.
        </p>
      </header>

      {error && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">{(error as Error).message}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Building2} label="Empresas" value={data?.tenants.length ?? 0} loading={isLoading} />
        <StatCard icon={Users} label="Contas" value={data?.profiles.length ?? 0} loading={isLoading} />
        <StatCard icon={Crown} label="Supremos" value={superIds.size} loading={isLoading} />
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">Empresas</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Membros</TableHead>
                      <TableHead>Lançamentos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.tenants ?? []).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{t.trade_name ?? t.legal_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.tax_id ?? "sem documento"} {t.is_demo ? "· demo" : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.plan_code ?? "startup"}
                            onValueChange={(v) =>
                              tenantMut.mutate({ tenantId: t.id, plan_code: v as (typeof PLANS)[number] })
                            }
                          >
                            <SelectTrigger className="w-[10rem]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLANS.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="numeric text-sm">{memberCounts[t.id] ?? 0}</TableCell>
                        <TableCell className="numeric text-sm">{data?.transactionCounts[t.id] ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "active" ? "secondary" : "outline"}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                join({ data: { tenantId: t.id } }).then(async () => {
                                  await ws.refresh();
                                  ws.setTenantId(t.id);
                                  toast.success("Você entrou nesta empresa como administrador");
                                })
                              }
                            >
                              <LogIn className="size-4" /> Acessar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                tenantMut.mutate({
                                  tenantId: t.id,
                                  status: t.status === "active" ? "suspended" : "active",
                                })
                              }
                            >
                              {t.status === "active" ? "Suspender" : "Reativar"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas da plataforma</CardTitle>
              <Input
                placeholder="Buscar por nome ou e-mail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-2 max-w-sm"
              />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Empresas</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="text-right">Acesso supremo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{p.full_name ?? "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </TableCell>
                        <TableCell className="numeric text-sm">
                          {(data?.members ?? []).filter((m) => m.user_id === p.id).length}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={superIds.has(p.id)}
                            onCheckedChange={(v) => grantMut.mutate({ userId: p.id, enabled: v })}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="space-y-2 pt-6">
              {(data?.logs ?? []).map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-2 border-b border-border/40 py-2 text-sm last:border-0">
                  <Badge variant="outline" className="text-[10px]">
                    {l.action}
                  </Badge>
                  <span className="text-muted-foreground">{l.entity ?? "-"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
                </div>
              ))}
              {!isLoading && (data?.logs ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem registros ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="h-6 w-12" /> : <p className="numeric text-xl font-semibold">{value}</p>}
        </div>
      </CardContent>
    </Card>
  );
}