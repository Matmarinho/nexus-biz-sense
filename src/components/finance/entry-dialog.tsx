import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/components/app/workspace";
import { useFinance } from "@/components/app/use-finance";
import { BRL } from "@/lib/format";
import { todayISO } from "@/lib/analytics";
import { createInstallments } from "@/lib/finance.functions";

const NONE = "__none__";
const parseAmount = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

const INTERVALS = [
  ["monthly", "Mensal"],
  ["weekly", "Semanal"],
  ["biweekly", "Quinzenal"],
  ["quarterly", "Trimestral"],
  ["yearly", "Anual"],
] as const;

export function EntryDialog() {
  const ws = useWorkspace();
  const { data } = useFinance();
  const queryClient = useQueryClient();
  const create = useServerFn(createInstallments);
  const [open, setOpen] = useState(false);

  const empty = {
    direction: "income" as "income" | "expense",
    description: "",
    amount: "",
    amount_mode: "per_installment" as "per_installment" | "total",
    first_due_date: todayISO(),
    installments: "1",
    interval: "monthly" as (typeof INTERVALS)[number][0],
    status: "pending" as "pending" | "paid",
    category_id: NONE,
    bank_account_id: NONE,
    party_id: NONE,
    cost_center_id: NONE,
    doc_number: "",
    payment_method: NONE,
    notes: "",
  };
  const [form, setForm] = useState(empty);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const n = Math.max(1, Math.min(120, Number(form.installments) || 1));
  const amount = parseAmount(form.amount);
  const perInstallment = form.amount_mode === "total" ? amount / n : amount;
  const totalValue = form.amount_mode === "total" ? amount : amount * n;

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          tenant_id: ws.tenantId!,
          direction: form.direction,
          status: form.status,
          description: form.description,
          amount,
          amount_mode: form.amount_mode,
          first_due_date: form.first_due_date,
          installments: n,
          interval: form.interval,
          doc_number: form.doc_number || null,
          payment_method: form.payment_method === NONE ? null : form.payment_method,
          notes: form.notes || null,
          category_id: form.category_id === NONE ? null : form.category_id,
          bank_account_id: form.bank_account_id === NONE ? null : form.bank_account_id,
          party_id: form.party_id === NONE ? null : form.party_id,
          cost_center_id: form.cost_center_id === NONE ? null : form.cost_center_id,
        },
      }),
    onSuccess: async (res) => {
      toast.success(res.count > 1 ? `${res.count} parcelas lançadas` : "Lançamento registrado");
      setOpen(false);
      setForm({ ...empty, direction: form.direction });
      await queryClient.invalidateQueries({ queryKey: ["finance", ws.tenantId] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const categories = (data?.categories ?? []).filter((c) => c.kind === form.direction);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Novo lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>
            Receitas entram com +, despesas com −. Use o parcelamento para repetir ao longo dos meses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={form.direction} onValueChange={(v) => set({ direction: v as "income" | "expense", category_id: NONE })}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income">Receita</TabsTrigger>
              <TabsTrigger value="expense">Despesa</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="desc">Descrição *</Label>
            <Input id="desc" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Mensalidade cliente X" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input id="amount" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="1500,00" />
            </div>
            <div className="space-y-2">
              <Label>O valor é</Label>
              <Select value={form.amount_mode} onValueChange={(v) => set({ amount_mode: v as typeof form.amount_mode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_installment">Por parcela</SelectItem>
                  <SelectItem value="total">Total a dividir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">1º vencimento *</Label>
              <Input id="due" type="date" value={form.first_due_date} onChange={(e) => set({ first_due_date: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-border/60 bg-surface/40 p-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="inst">Parcelas</Label>
              <Input id="inst" inputMode="numeric" value={form.installments} onChange={(e) => set({ installments: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="space-y-2">
              <Label>Repetir</Label>
              <Select value={form.interval} onValueChange={(v) => set({ interval: v as typeof form.interval })} disabled={n < 2}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVALS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 self-end text-xs text-muted-foreground">
              <p className="numeric">{n}× de {BRL(perInstallment)}</p>
              <p className="numeric">Total: {BRL(totalValue)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PickField label="Categoria" value={form.category_id} onChange={(v) => set({ category_id: v })} options={categories.map((c) => [c.id, c.name])} />
            <PickField label={form.direction === "income" ? "Cliente" : "Fornecedor"} value={form.party_id} onChange={(v) => set({ party_id: v })} options={(data?.parties ?? []).map((p) => [p.id, p.name])} />
            <PickField label="Conta bancária" value={form.bank_account_id} onChange={(v) => set({ bank_account_id: v })} options={(data?.accounts ?? []).map((a) => [a.id, a.name])} />
            <PickField label="Centro de custo" value={form.cost_center_id} onChange={(v) => set({ cost_center_id: v })} options={(data?.costCenters ?? []).map((c) => [c.id, c.name])} />
            <PickField
              label="Forma de pagamento"
              value={form.payment_method}
              onChange={(v) => set({ payment_method: v })}
              options={[["pix", "Pix"], ["boleto", "Boleto"], ["transfer", "Transferência"], ["card", "Cartão"], ["cash", "Dinheiro"], ["other", "Outro"]]}
            />
            <div className="space-y-2">
              <Label htmlFor="doc">Documento / NF</Label>
              <Input id="doc" value={form.doc_number} onChange={(e) => set({ doc_number: e.target.value })} placeholder="NF 1234" />
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={form.status} onValueChange={(v) => set({ status: v as "pending" | "paid" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Em aberto</SelectItem>
                  <SelectItem value="paid">Liquidado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.description || amount <= 0}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {n > 1 ? `Lançar ${n} parcelas` : "Salvar lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PickField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (readonly [string, string])[] | [string, string][];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— nenhum —</SelectItem>
          {options.map(([id, name]) => (
            <SelectItem key={id} value={id}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}