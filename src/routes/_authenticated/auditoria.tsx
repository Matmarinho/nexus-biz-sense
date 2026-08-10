import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ScrollText, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/app/workspace";
import { loadTenantAudit } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria e logs · Nexus ERP" },
      { name: "description", content: "Trilha de auditoria da empresa: quem fez o quê, quando e de onde, com exportação CSV." },
      { property: "og:title", content: "Auditoria e logs · Nexus ERP" },
      { property: "og:description", content: "Rastreabilidade completa das ações realizadas na empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const ws = useWorkspace();
  const load = useServerFn(loadTenantAudit);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit", ws.tenantId],
    enabled: Boolean(ws.tenantId),
    queryFn: () => load({ data: { tenantId: ws.tenantId!, limit: 500 } }),
    staleTime: 15_000,
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const logs = (data?.logs ?? []) as Record<string, unknown>[];
    if (!term) return logs;
    return logs.filter((l) =>
      `${l.action ?? ""} ${l.entity ?? ""} ${l.ip_address ?? ""}`.toLowerCase().includes(term),
    );
  }, [data, q]);

  function exportCsv() {
    const csv = [
      ["Data", "Ação", "Entidade", "Registro", "Usuário", "IP"],
      ...rows.map((l) => [
        new Date(String(l.created_at)).toLocaleString("pt-BR"),
        String(l.action ?? ""),
        String(l.entity ?? ""),
        String(l.entity_id ?? ""),
        String(l.user_id ?? ""),
        String(l.ip_address ?? ""),
      ]),
    ]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "auditoria.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Administração</p>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <ScrollText className="size-5 text-primary" /> Auditoria e logs
          </h1>
          <p className="text-sm text-muted-foreground">Registro imutável das ações realizadas nesta empresa.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar ação ou entidade..." className="w-60" />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> CSV
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="mx-auto size-6 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-border/60 bg-surface-2/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Ação</th>
                    <th className="px-3 py-2 text-left font-medium">Entidade</th>
                    <th className="px-3 py-2 text-left font-medium">Registro</th>
                    <th className="px-3 py-2 text-left font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 300).map((l) => (
                    <tr key={String(l.id)} className="border-b border-border/40 last:border-0 hover:bg-accent/40">
                      <td className="numeric px-3 py-2">{new Date(String(l.created_at)).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{String(l.action ?? "—")}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{String(l.entity ?? "—")}</td>
                      <td className="numeric px-3 py-2 text-xs text-muted-foreground">
                        {String(l.entity_id ?? "—").slice(0, 8)}
                      </td>
                      <td className="numeric px-3 py-2 text-muted-foreground">{String(l.ip_address ?? "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
