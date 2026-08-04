import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Search, Target, Trash2, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/components/app/workspace";
import { BRL, formatDate } from "@/lib/format";
import { deleteDeal, loadCrm, patchDeal, saveDeal } from "@/lib/crm.functions";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "Comercial · CRM · Nexus ERP" },
      {
        name: "description",
        content: "Funil de vendas com oportunidades, valores previstos, probabilidade e taxa de conversão por empresa.",
      },
      { property: "og:title", content: "Comercial · CRM · Nexus ERP" },
      { property: "og:description", content: "Pipeline comercial multiempresa com previsão de receita." },
    ],
  }),
  component: CrmPage,
});

type Deal = Tables<"crm_deals">;
type Stage = Tables<"crm_stages">;

const EMPTY = {
  title: "",
  amount: "",
  stage_id: "",
  party_id: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  source: "",
  expected_close_date: "",
  notes: "",
};

function CrmPage() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const load = useServerFn(loadCrm);
  const save = useServerFn(saveDeal);
  const patch = useServerFn(patchDeal);
  const remove = useServerFn(deleteDeal);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const canEdit = ws.can("crm", "edit");
  const canCreate = ws.can("crm", "create");
  const canDelete = ws.can("crm", "delete");

  const { data, isLoading } = useQuery({
    queryKey: ["crm", ws.tenantId],
    enabled: !!ws.tenantId,
    queryFn: () => load({ data: { tenantId: ws.tenantId! } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm", ws.tenantId] });

  const mSave = useMutation({
    mutationFn: save,
    onSuccess: () => {
      toast.success("Oportunidade salva");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error("Falha ao salvar", { description: e.message }),
  });
  const mPatch = useMutation({
    mutationFn: patch,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Falha ao atualizar", { description: e.message }),
  });
  const mDelete = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      toast.success("Oportunidade excluída");
      invalidate();
    },
    onError: (e: Error) => toast.error("Falha ao excluir", { description: e.message }),
  });

  const stages: Stage[] = data?.stages ?? [];
  const deals: Deal[] = useMemo(() => {
    const list = data?.deals ?? [];
    const q = query.trim().toLowerCase();
    return q
      ? list.filter((d) =>
          [d.title, d.contact_name, d.source].some((v) => (v ?? "").toLowerCase().includes(q)),
        )
      : list;
  }, [data?.deals, query]);

  const totals = useMemo(() => {
    const all = data?.deals ?? [];
    const open = all.filter((d) => d.status === "open");
    const won = all.filter((d) => d.status === "won");
    const lost = all.filter((d) => d.status === "lost");
    const pipeline = open.reduce((s, d) => s + Number(d.amount ?? 0), 0);
    const weighted = open.reduce((s, d) => {
      const stage = stages.find((st) => st.id === d.stage_id);
      const p = d.probability ?? stage?.probability ?? 50;
      return s + (Number(d.amount ?? 0) * p) / 100;
    }, 0);
    const wonValue = won.reduce((s, d) => s + Number(d.amount ?? 0), 0);
    const closed = won.length + lost.length;
    return {
      pipeline,
      weighted,
      wonValue,
      conversion: closed ? (won.length / closed) * 100 : 0,
      openCount: open.length,
    };
  }, [data?.deals, stages]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, stage_id: stages[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(deal: Deal) {
    setEditing(deal);
    setForm({
      title: deal.title,
      amount: String(deal.amount ?? 0),
      stage_id: deal.stage_id ?? "",
      party_id: deal.party_id ?? "",
      contact_name: deal.contact_name ?? "",
      contact_email: deal.contact_email ?? "",
      contact_phone: deal.contact_phone ?? "",
      source: deal.source ?? "",
      expected_close_date: deal.expected_close_date ?? "",
      notes: deal.notes ?? "",
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ws.tenantId) return;
    mSave.mutate({
      data: {
        id: editing?.id,
        tenant_id: ws.tenantId,
        title: form.title,
        amount: Number(form.amount.replace(",", ".")) || 0,
        currency: ws.tenant?.currency ?? "BRL",
        status: editing?.status === "won" || editing?.status === "lost" ? editing.status : "open",
        stage_id: form.stage_id || null,
        party_id: form.party_id || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        source: form.source || null,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes || null,
      },
    });
  }

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa para ver o funil.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold">Comercial</h1>
          <p className="text-sm text-muted-foreground">Funil de vendas, previsão de receita e conversão.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar oportunidade"
            className="w-56 pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> Nova oportunidade
          </Button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Target} label="Pipeline aberto" value={BRL(totals.pipeline)} hint={`${totals.openCount} oportunidades`} />
        <Kpi icon={TrendingUp} label="Previsão ponderada" value={BRL(totals.weighted)} hint="Por probabilidade da etapa" />
        <Kpi icon={Trophy} label="Ganho acumulado" value={BRL(totals.wonValue)} hint="Negócios fechados" tone="positive" />
        <Kpi
          icon={TrendingUp}
          label="Taxa de conversão"
          value={`${totals.conversion.toFixed(1).replace(".", ",")}%`}
          hint="Ganhos / fechados"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {stages.map((stage) => {
            const items = deals.filter((d) => d.stage_id === stage.id);
            const sum = items.reduce((s, d) => s + Number(d.amount ?? 0), 0);
            return (
              <section
                key={stage.id}
                className="flex min-w-[15rem] flex-col rounded-xl border border-border/60 bg-surface/50 p-3"
              >
                <header className="mb-3 flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: stage.color }} />
                  <h2 className="text-sm font-medium">{stage.name}</h2>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {items.length}
                  </Badge>
                </header>
                <p className="mb-3 text-xs text-muted-foreground">{BRL(sum)}</p>
                <div className="space-y-2">
                  {items.map((deal) => (
                    <article
                      key={deal.id}
                      className="group rounded-lg border border-border/60 bg-surface-2/60 p-3 text-sm transition-colors hover:border-primary/40"
                    >
                      <button
                        type="button"
                        className="w-full text-left font-medium"
                        onClick={() => canEdit && openEdit(deal)}
                      >
                        {deal.title}
                      </button>
                      <p className="mt-1 numeric text-positive">{BRL(Number(deal.amount ?? 0))}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {deal.contact_name ?? "Sem contato"} · {formatDate(deal.expected_close_date)}
                      </p>
                      <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {canEdit && (
                          <Select
                            value={deal.stage_id ?? ""}
                            onValueChange={(v) =>
                              mPatch.mutate({ data: { id: deal.id, tenant_id: ws.tenantId!, stage_id: v } })
                            }
                          >
                            <SelectTrigger className="h-7 flex-1 text-xs">
                              <SelectValue placeholder="Mover" />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-negative"
                            onClick={() => mDelete.mutate({ data: { id: deal.id, tenant_id: ws.tenantId! } })}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                      {canEdit && deal.status === "open" && (stage.is_won || stage.is_lost) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 w-full text-xs"
                          onClick={() =>
                            mPatch.mutate({
                              data: {
                                id: deal.id,
                                tenant_id: ws.tenantId!,
                                status: stage.is_won ? "won" : "lost",
                              },
                            })
                          }
                        >
                          Marcar como {stage.is_won ? "ganho" : "perdido"}
                        </Button>
                      )}
                    </article>
                  ))}
                  {!items.length && <p className="text-xs text-muted-foreground">Nenhuma oportunidade.</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={form.party_id || "none"}
                  onValueChange={(v) => setForm({ ...form, party_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {(data?.parties ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="close">Previsão de fechamento</Label>
                <Input
                  id="close"
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contato</Label>
                <Input
                  id="contact"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <Input
                  id="source"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="Indicação, site, evento…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mSave.isPending}>
                {mSave.isPending && <Loader2 className="size-4 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "positive";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`numeric text-2xl font-semibold ${tone === "positive" ? "text-positive" : ""}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}