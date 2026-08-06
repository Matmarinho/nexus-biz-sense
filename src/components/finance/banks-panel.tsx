import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, CreditCard, Gauge, Link2, Loader2, Pencil, Plus, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/app/money";
import { useFinance } from "@/components/app/use-finance";
import { useWorkspace } from "@/components/app/workspace";
import { BRL } from "@/lib/format";
import { saveEntity } from "@/lib/finance.functions";
import type { Tables } from "@/integrations/supabase/types";

type Account = Tables<"bank_accounts">;

const TYPES = [
  ["checking", "Conta corrente"],
  ["savings", "Poupança"],
  ["cash", "Caixa"],
  ["investment", "Investimento"],
  ["card", "Cartão de crédito"],
] as const;

const num = (v: string) => Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

const EMPTY = {
  name: "",
  bank_name: "",
  bank_code: "",
  logo_url: "",
  account_type: "checking" as (typeof TYPES)[number][0],
  opening_balance: "0",
  card_limit: "0",
  card_used: "0",
  invested_amount: "0",
  yield_cdi_percent: "0",
  credit_score: "",
  connection_status: "manual" as "manual" | "connected" | "syncing" | "error",
};

export function BanksPanel() {
  const ws = useWorkspace();
  const { data, isLoading } = useFinance();
  const qc = useQueryClient();
  const save = useServerFn(saveEntity);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const canEdit = ws.can("finance", "edit");

  const mutation = useMutation({
    mutationFn: (payload: { id?: string; values: Record<string, unknown> }) =>
      save({ data: { table: "bank_accounts", tenantId: ws.tenantId!, id: payload.id, values: payload.values as never } }),
    onSuccess: async () => {
      toast.success("Conta salva");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["finance", ws.tenantId] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar conta", { description: e.message }),
  });

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of data?.accounts ?? []) map.set(a.id, Number(a.opening_balance ?? 0));
    for (const t of data?.transactions ?? []) {
      if (t.status !== "paid" || !t.bank_account_id) continue;
      const cur = map.get(t.bank_account_id) ?? 0;
      map.set(t.bank_account_id, cur + (t.direction === "income" ? Number(t.amount) : -Number(t.amount)));
    }
    for (const tr of data?.transfers ?? []) {
      map.set(tr.from_account_id, (map.get(tr.from_account_id) ?? 0) - Number(tr.amount));
      map.set(tr.to_account_id, (map.get(tr.to_account_id) ?? 0) + Number(tr.amount));
    }
    return map;
  }, [data]);

  const accounts = data?.accounts ?? [];
  const totals = useMemo(() => {
    let saldo = 0;
    let invested = 0;
    let limit = 0;
    let used = 0;
    for (const a of accounts) {
      saldo += balances.get(a.id) ?? 0;
      invested += Number(a.invested_amount ?? 0);
      limit += Number(a.card_limit ?? 0);
      used += Number(a.card_used ?? 0);
    }
    const scores = accounts.map((a) => a.credit_score).filter((s): s is number => typeof s === "number" && s > 0);
    const score = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
    return { saldo, invested, limit, used, score };
  }, [accounts, balances]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setForm({
      name: a.name,
      bank_name: a.bank_name ?? "",
      bank_code: a.bank_code ?? "",
      logo_url: a.logo_url ?? "",
      account_type: a.account_type as (typeof TYPES)[number][0],
      opening_balance: String(a.opening_balance ?? 0),
      card_limit: String(a.card_limit ?? 0),
      card_used: String(a.card_used ?? 0),
      invested_amount: String(a.invested_amount ?? 0),
      yield_cdi_percent: String(a.yield_cdi_percent ?? 0),
      credit_score: a.credit_score ? String(a.credit_score) : "",
      connection_status: (a.connection_status as typeof EMPTY.connection_status) ?? "manual",
    });
    setOpen(true);
  }

  function submit(status?: typeof EMPTY.connection_status) {
    mutation.mutate({
      id: editing?.id,
      values: {
        name: form.name.trim(),
        bank_name: form.bank_name || null,
        bank_code: form.bank_code || null,
        logo_url: form.logo_url || null,
        account_type: form.account_type,
        opening_balance: num(form.opening_balance),
        currency: ws.tenant?.currency ?? "BRL",
        is_active: true,
        card_limit: num(form.card_limit),
        card_used: num(form.card_used),
        invested_amount: num(form.invested_amount),
        yield_cdi_percent: num(form.yield_cdi_percent),
        credit_score: form.credit_score ? Math.round(num(form.credit_score)) : null,
        connection_status: status ?? form.connection_status,
      },
    });
  }

  function connect(a: Account) {
    mutation.mutate({
      id: a.id,
      values: {
        name: a.name,
        bank_name: a.bank_name,
        bank_code: a.bank_code,
        logo_url: a.logo_url,
        account_type: a.account_type,
        opening_balance: Number(a.opening_balance ?? 0),
        currency: a.currency,
        is_active: a.is_active,
        card_limit: Number(a.card_limit ?? 0),
        card_used: Number(a.card_used ?? 0),
        invested_amount: Number(a.invested_amount ?? 0),
        yield_cdi_percent: Number(a.yield_cdi_percent ?? 0),
        credit_score: a.credit_score,
        connection_status: a.connection_status === "connected" ? "manual" : "connected",
      },
    });
  }

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold">Bancos & Open Finance</h1>
          <p className="text-sm text-muted-foreground">
            Saldos, limites de cartão, rendimentos e score de crédito. As contas são editáveis e os saldos se atualizam
            conforme os lançamentos liquidados.
          </p>
        </div>
        {ws.can("finance", "create") && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> Nova conta
          </Button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={Building2} title="Saldo consolidado" value={<Money value={totals.saldo} />} />
        <Summary icon={TrendingUp} title="Investido" value={BRL(totals.invested)} />
        <Summary
          icon={CreditCard}
          title="Limite de cartão livre"
          value={BRL(Math.max(0, totals.limit - totals.used))}
          hint={`${BRL(totals.used)} usados de ${BRL(totals.limit)}`}
        />
        <Summary
          icon={Gauge}
          title="Score de crédito médio"
          value={totals.score ? String(totals.score) : "—"}
          hint={totals.score ? scoreLabel(totals.score) : "Cadastre o score das contas"}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-border/60 bg-surface/60">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            Nenhuma conta bancária cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const saldo = balances.get(a.id) ?? 0;
            const limit = Number(a.card_limit ?? 0);
            const used = Number(a.card_used ?? 0);
            const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
            const connected = a.connection_status === "connected";
            return (
              <Card key={a.id} className="border-border/60 bg-surface/60 overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <BankLogo account={a} />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{a.name}</CardTitle>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.bank_name ?? "Instituição não informada"}
                      {a.bank_code ? ` · ${a.bank_code}` : ""}
                    </p>
                  </div>
                  <Badge variant={connected ? "default" : "secondary"} className="shrink-0 text-[10px]">
                    {connected ? "Conectado" : "Manual"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo atual</p>
                    <p className="numeric text-2xl font-semibold">
                      <Money value={saldo} />
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CreditCard className="size-3.5" /> Cartão
                      </span>
                      <span className="numeric">
                        {BRL(used)} / {BRL(limit)}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="numeric text-xs text-muted-foreground">
                      Disponível {BRL(Math.max(0, limit - used))}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-surface-2/50 p-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Rendimentos</p>
                      <p className="numeric font-medium">{BRL(Number(a.invested_amount ?? 0))}</p>
                      <p className="text-positive">{Number(a.yield_cdi_percent ?? 0)}% do CDI</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score de crédito</p>
                      <p className="numeric font-medium">{a.credit_score ?? "—"}</p>
                      <p className="text-muted-foreground">{a.credit_score ? scoreLabel(a.credit_score) : "sem dados"}</p>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(a)}>
                        <Pencil className="size-3.5" /> Editar
                      </Button>
                      <Button
                        variant={connected ? "ghost" : "secondary"}
                        size="sm"
                        className="flex-1"
                        onClick={() => connect(a)}
                        disabled={mutation.isPending}
                      >
                        {connected ? <ShieldCheck className="size-3.5" /> : <Link2 className="size-3.5" />}
                        {connected ? "Desconectar" : "Open Finance"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta" : "Nova conta bancária"}</DialogTitle>
            <DialogDescription>
              Contas manuais funcionam como contas reais: o saldo muda conforme os lançamentos liquidados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da conta *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field label="Instituição" value={form.bank_name} onChange={(v) => setForm((f) => ({ ...f, bank_name: v }))} placeholder="Itaú, Nubank..." />
            <Field label="Código / agência" value={form.bank_code} onChange={(v) => setForm((f) => ({ ...f, bank_code: v }))} />
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.account_type} onValueChange={(v) => setForm((f) => ({ ...f, account_type: v as typeof f.account_type }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Saldo inicial" value={form.opening_balance} onChange={(v) => setForm((f) => ({ ...f, opening_balance: v }))} />
            <Field label="Logo (URL)" value={form.logo_url} onChange={(v) => setForm((f) => ({ ...f, logo_url: v }))} placeholder="https://..." />
            <Field label="Limite do cartão" value={form.card_limit} onChange={(v) => setForm((f) => ({ ...f, card_limit: v }))} />
            <Field label="Limite usado" value={form.card_used} onChange={(v) => setForm((f) => ({ ...f, card_used: v }))} />
            <Field label="Valor investido" value={form.invested_amount} onChange={(v) => setForm((f) => ({ ...f, invested_amount: v }))} />
            <Field label="Rendimento (% do CDI)" value={form.yield_cdi_percent} onChange={(v) => setForm((f) => ({ ...f, yield_cdi_percent: v }))} />
            <Field label="Score de crédito (0-1000)" value={form.credit_score} onChange={(v) => setForm((f) => ({ ...f, credit_score: v }))} />
          </div>
          <DialogFooter>
            <Button onClick={() => submit()} disabled={mutation.isPending || !form.name.trim()}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function scoreLabel(score: number) {
  if (score >= 800) return "Excelente";
  if (score >= 600) return "Bom";
  if (score >= 400) return "Regular";
  return "Baixo";
}

function BankLogo({ account }: { account: Account }) {
  if (account.logo_url) {
    return (
      <img
        src={account.logo_url}
        alt={`Logo ${account.bank_name ?? account.name}`}
        className="size-11 shrink-0 rounded-xl object-cover"
        loading="lazy"
      />
    );
  }
  const initials = (account.bank_name ?? account.name).slice(0, 2).toUpperCase();
  return (
    <div
      className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold text-primary-foreground"
      style={{ background: account.color ?? "linear-gradient(135deg,var(--color-primary),var(--color-surface-2))" }}
    >
      {initials}
    </div>
  );
}

function Summary({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: typeof Building2;
  title: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="border-border/60 bg-surface/60">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Icon className="size-4 text-primary" />
        <CardTitle className="text-xs text-muted-foreground uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="numeric text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}