import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Download,
  Layers,
  ReceiptText,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Undo2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Money } from "@/components/app/money";
import { useFinance } from "@/components/app/use-finance";
import { useWorkspace } from "@/components/app/workspace";
import { EntryDialog } from "@/components/finance/entry-dialog";
import { BanksPanel } from "@/components/finance/banks-panel";
import { BillingPanel } from "@/components/finance/billing-panel";
import { BRL } from "@/lib/format";
import { todayISO } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { deleteTransaction, deleteTransactionSeries, patchTransaction } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Gestão Financeira · Nexus ERP" },
      {
        name: "description",
        content:
          "Financeiro, faturamento e bancos: lançamentos editáveis, parcelamentos, Open Finance, saldos e score de crédito.",
      },
      { property: "og:title", content: "Gestão Financeira · Nexus ERP" },
      { property: "og:description", content: "Fluxo financeiro, faturamento e bancos em um só lugar." },
    ],
  }),
  component: FinanceHub,
});

function FinanceHub() {
  return (
    <Tabs defaultValue="financeiro" className="space-y-6">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Gestão Financeira</p>
        <TabsList className="mt-2">
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="financeiro">
        <FinancePage />
      </TabsContent>
      <TabsContent value="faturamento">
        <BillingPanel />
      </TabsContent>
      <TabsContent value="bancos">
        <BanksPanel />
      </TabsContent>
    </Tabs>
  );
}

type Filter = "all" | "income" | "expense" | "pending" | "paid" | "overdue";
const NONE = "__none__";

const FOCUS_CARDS: { key: Filter; label: string; hint: string; icon: typeof Wallet; tone: string }[] = [
  { key: "expense", label: "Despesas", hint: "Tudo que sai do caixa", icon: TrendingDown, tone: "text-negative" },
  { key: "paid", label: "Pagos", hint: "Lançamentos já liquidados", icon: Check, tone: "text-positive" },
  { key: "pending", label: "À pagar", hint: "Em aberto no período", icon: CalendarClock, tone: "text-warning" },
  { key: "overdue", label: "Vencidos", hint: "Passaram do vencimento", icon: ReceiptText, tone: "text-negative" },
  { key: "income", label: "Receitas", hint: "Tudo que entra no caixa", icon: TrendingUp, tone: "text-positive" },
];

const FILTERS: [Filter, string][] = [
  ["all", "Todos"],
  ["income", "Receitas"],
  ["expense", "Despesas"],
  ["pending", "Em aberto"],
  ["paid", "Liquidados"],
  ["overdue", "Vencidos"],
];

function FinancePage() {
  const ws = useWorkspace();
  const { data, isLoading } = useFinance();
  const queryClient = useQueryClient();
  const [focus, setFocus] = useState<Filter | null>(null);
  const filter: Filter = focus ?? "all";
  const setFilter = (f: Filter) => setFocus(f);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");

  const patch = useServerFn(patchTransaction);
  const remove = useServerFn(deleteTransaction);
  const removeSeries = useServerFn(deleteTransactionSeries);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance", ws.tenantId] });
  const canEdit = ws.can("finance", "edit");

  const patchMutation = useMutation({
    mutationFn: (vars: { id: string; values: Record<string, unknown>; scope?: "one" | "series" }) =>
      patch({ data: { tenantId: ws.tenantId!, id: vars.id, scope: vars.scope ?? "one", values: vars.values as never } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { tenantId: ws.tenantId!, id } }),
    onSuccess: async () => {
      toast.success("Lançamento excluído");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const seriesMutation = useMutation({
    mutationFn: (seriesId: string) => removeSeries({ data: { tenantId: ws.tenantId!, seriesId } }),
    onSuccess: async () => {
      toast.success("Série de parcelas excluída");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao excluir série", { description: e.message }),
  });

  const rows = useMemo(() => {
    const list = data?.transactions ?? [];
    const today = todayISO();
    const q = search.trim().toLowerCase();
    return list
      .filter((t) => {
        if (filter === "income" || filter === "expense") if (t.direction !== filter) return false;
        if (filter === "pending" && t.status !== "pending") return false;
        if (filter === "paid" && t.status !== "paid") return false;
        if (filter === "overdue" && !(t.status === "pending" && t.due_date < today)) return false;
        if (month && !String(t.due_date).startsWith(month)) return false;
        if (q && !`${t.description} ${t.doc_number ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (a.due_date < b.due_date ? 1 : -1))
      .slice(0, 500);
  }, [data, filter, search, month]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let open = 0;
    for (const t of rows) {
      const v = Number(t.amount);
      if (t.direction === "income") income += v;
      else expense += v;
      if (t.status === "pending") open += t.direction === "income" ? v : -v;
    }
    return { income, expense, open, result: income - expense };
  }, [rows]);

  function exportCsv() {
    const header = ["Vencimento", "Descrição", "Parcela", "Categoria", "Parte", "Conta", "Documento", "Situação", "Direção", "Valor"];
    const body = rows.map((t) => [
      t.due_date,
      t.description,
      t.installment_total ? `${t.installment_no}/${t.installment_total}` : "",
      catName(t.category_id),
      partyName(t.party_id),
      accountName(t.bank_account_id),
      t.doc_number ?? "",
      t.status,
      t.direction === "income" ? "Receita" : "Despesa",
      String(t.amount).replace(".", ","),
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lancamentos-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const catName = (id: string | null) => (data?.categories ?? []).find((c) => c.id === id)?.name ?? "";
  const partyName = (id: string | null) => (data?.parties ?? []).find((p) => p.id === id)?.name ?? "";
  const accountName = (id: string | null) => (data?.accounts ?? []).find((a) => a.id === id)?.name ?? "";

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  if (!focus) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-surface/60 p-6">
          <h1 className="font-display text-2xl font-semibold">Olá, o que você gostaria de ver hoje?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma visão para abrir a planilha de lançamentos já filtrada.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {FOCUS_CARDS.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setFocus(card.key)}
                className="group rounded-xl border border-border/60 bg-surface-2/50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5"
              >
                <card.icon className={cn("size-5", card.tone)} />
                <p className="mt-3 font-medium">{card.label}</p>
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFocus("all")}>
              Ver todos os lançamentos
            </Button>
            {ws.can("finance", "create") && <EntryDialog />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 h-7 px-2 text-xs" onClick={() => setFocus(null)}>
            <ArrowLeft className="size-3.5" /> Voltar às opções
          </Button>
          <h1 className="font-display text-2xl font-semibold">Planilha de lançamentos</h1>
          <p className="text-xs text-muted-foreground">Clique em qualquer célula para editar. As alterações salvam ao sair do campo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="size-4" /> CSV
          </Button>
          {ws.can("finance", "create") && <EntryDialog />}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([key, label]) => (
          <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descrição ou documento" className="h-9 w-56 pl-8" />
        </div>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-[9.5rem]" />
      </div>

      <Card className="border-border/60 bg-surface/60 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[62rem] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
                  <tr className="text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <Th className="w-[7.5rem]">Vencimento</Th>
                    <Th className="min-w-[16rem]">Descrição</Th>
                    <Th className="w-[5rem]">Parc.</Th>
                    <Th className="w-[11rem]">Categoria</Th>
                    <Th className="w-[11rem]">Cliente / Fornecedor</Th>
                    <Th className="w-[10rem]">Conta</Th>
                    <Th className="w-[8rem]">Documento</Th>
                    <Th className="w-[9rem]">Situação</Th>
                    <Th className="w-[9.5rem] text-right">Valor</Th>
                    <Th className="w-[5.5rem]" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                        Nenhum lançamento neste filtro.
                      </td>
                    </tr>
                  )}
                  {rows.map((t, i) => {
                    const overdue = t.status === "pending" && t.due_date < todayISO();
                    const save = (values: Record<string, unknown>) => patchMutation.mutate({ id: t.id, values });
                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          "border-t border-border/40 transition-colors hover:bg-accent/40",
                          i % 2 === 1 && "bg-foreground/[0.02]",
                        )}
                      >
                        <Td>
                          <CellInput type="date" value={t.due_date} disabled={!canEdit} onCommit={(v) => v && save({ due_date: v })} />
                        </Td>
                        <Td>
                          <CellInput value={t.description} disabled={!canEdit} onCommit={(v) => v && save({ description: v })} />
                        </Td>
                        <Td className="numeric text-xs text-muted-foreground">
                          {t.installment_total ? `${t.installment_no}/${t.installment_total}` : "—"}
                        </Td>
                        <Td>
                          <CellSelect
                            value={t.category_id ?? NONE}
                            disabled={!canEdit}
                            options={(data?.categories ?? []).filter((c) => c.kind === t.direction).map((c) => [c.id, c.name])}
                            onChange={(v) => save({ category_id: v === NONE ? null : v })}
                          />
                        </Td>
                        <Td>
                          <CellSelect
                            value={t.party_id ?? NONE}
                            disabled={!canEdit}
                            options={(data?.parties ?? []).map((p) => [p.id, p.name])}
                            onChange={(v) => save({ party_id: v === NONE ? null : v })}
                          />
                        </Td>
                        <Td>
                          <CellSelect
                            value={t.bank_account_id ?? NONE}
                            disabled={!canEdit}
                            options={(data?.accounts ?? []).map((a) => [a.id, a.name])}
                            onChange={(v) => save({ bank_account_id: v === NONE ? null : v })}
                          />
                        </Td>
                        <Td>
                          <CellInput value={t.doc_number ?? ""} disabled={!canEdit} onCommit={(v) => save({ doc_number: v || null })} />
                        </Td>
                        <Td>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              t.status === "paid"
                                ? "bg-positive/15 text-positive"
                                : overdue
                                  ? "bg-negative/15 text-negative"
                                  : "bg-warning/15 text-warning",
                            )}
                          >
                            {t.status === "paid" ? "Liquidado" : overdue ? "Vencido" : "Em aberto"}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <CellInput
                            align="right"
                            value={String(t.amount).replace(".", ",")}
                            disabled={!canEdit}
                            display={
                              <Money value={t.direction === "income" ? Number(t.amount) : -Number(t.amount)} className="font-medium" />
                            }
                            onCommit={(v) => {
                              const n = Number(v.replace(/\./g, "").replace(",", "."));
                              if (Number.isFinite(n) && n >= 0) save({ amount: n });
                            }}
                          />
                        </Td>
                        <Td>
                          <div className="flex justify-end gap-0.5">
                            {canEdit && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                title={t.status === "paid" ? "Reabrir" : "Marcar como liquidado"}
                                onClick={() => save({ status: t.status === "paid" ? "pending" : "paid" })}
                              >
                                {t.status === "paid" ? (
                                  <Undo2 className="size-3.5 text-muted-foreground" />
                                ) : (
                                  <Check className="size-3.5 text-positive" />
                                )}
                              </Button>
                            )}
                            {ws.can("finance", "delete") && t.series_id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                title="Excluir todas as parcelas"
                                onClick={() => seriesMutation.mutate(t.series_id!)}
                              >
                                <Layers className="size-3.5 text-negative" />
                              </Button>
                            )}
                            {ws.can("finance", "delete") && (
                              <Button size="icon" variant="ghost" className="size-7" title="Excluir" onClick={() => deleteMutation.mutate(t.id)}>
                                <Trash2 className="size-3.5 text-negative" />
                              </Button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 border-t border-border/60 bg-surface/80 px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">{rows.length} lançamentos</span>
            <span className="numeric text-positive">Receitas {BRL(totals.income)}</span>
            <span className="numeric text-negative">Despesas {BRL(totals.expense)}</span>
            <span className="numeric ml-auto font-medium">
              Resultado <Money value={totals.result} />
            </span>
            <span className="numeric text-muted-foreground">
              Em aberto <Money value={totals.open} />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/60 px-3 py-2 font-medium", className)}>{children}</th>;
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-1", className)}>{children}</td>;
}

function CellInput({
  value,
  onCommit,
  type = "text",
  align = "left",
  disabled,
  display,
}: {
  value: string;
  onCommit: (v: string) => void;
  type?: "text" | "date";
  align?: "left" | "right";
  disabled?: boolean;
  display?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (disabled || !editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          "w-full truncate rounded px-1 py-1 text-left hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          align === "right" && "text-right",
          disabled && "cursor-default hover:bg-transparent",
        )}
      >
        {display ?? (type === "date" ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : value || "—")}
      </button>
    );
  }

  return (
    <Input
      autoFocus
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={cn("h-7 px-1 py-0 text-sm", align === "right" && "text-right")}
    />
  );
}

function CellSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-7 border-transparent bg-transparent px-1 text-sm shadow-none hover:bg-primary/10 data-[placeholder]:text-muted-foreground">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— nenhum —</SelectItem>
        {options.map(([id, name]) => (
          <SelectItem key={id} value={id}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
