import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Crown, Download, LogIn, ShieldAlert, Users } from "lucide-react";
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

  const logs = (data?.logs ?? []).filter((l) => {
    const day = String(l.created_at).slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });

  function exportCsv() {
    const rows = [
      ["Data", "Ação", "Entidade", "ID da entidade", "Empresa", "Usuário"],
      ...logs.map((l) => [
        new Date(l.created_at).toISOString(),
        l.action ?? "",
        l.entity ?? "",
        (l as { entity_id?: string | null }).entity_id ?? "",
        (l as { tenant_id?: string | null }).tenant_id ?? "",
        (l as { actor_id?: string | null }).actor_id ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const win = window.open("", "_blank");
    if (!win) return toast.error("Permita pop-ups para gerar o PDF");
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Trilha de auditoria</title>
      <style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{font-size:18px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
      th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}</style></head><body>
      <h1>Nexus ERP — Trilha de auditoria</h1>
      <p>Período: ${from || "início"} até ${to || "hoje"} · ${logs.length} registros</p>
      <table><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th></tr></thead><tbody>
      ${logs
        .map(
          (l) =>
            `<tr><td>${new Date(l.created_at).toLocaleString("pt-BR")}</td><td>${l.action ?? ""}</td><td>${l.entity ?? "-"}</td></tr>`,
        )
        .join("")}
      </tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

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
            <CardHeader className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">De</p>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[10rem]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Até</p>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[10rem]" />
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
                  <Download className="size-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportPdf} disabled={logs.length === 0}>
                  <Download className="size-4" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {logs.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-2 border-b border-border/40 py-2 text-sm last:border-0">
                  <Badge variant="outline" className="text-[10px]">
                    {l.action}
                  </Badge>
                  <span className="text-muted-foreground">{l.entity ?? "-"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
                </div>
              ))}
              {!isLoading && logs.length === 0 && (
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