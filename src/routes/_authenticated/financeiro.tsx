import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/app/money";
import { useFinance } from "@/components/app/use-finance";
import { useWorkspace } from "@/components/app/workspace";
import { formatDate } from "@/lib/format";
import { todayISO } from "@/lib/analytics";
import { deleteTransaction, saveTransaction, setTransactionStatus } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · Nexus ERP" },
      {
        name: "description",
        content: "Contas a pagar e a receber, lançamentos, categorias e contas bancárias da sua empresa.",
      },
      { property: "og:title", content: "Financeiro · Nexus ERP" },
      { property: "og:description", content: "Gestão completa do fluxo financeiro empresarial." },
    ],
  }),
  component: FinancePage,
});

type Filter = "all" | "income" | "expense" | "pending" | "overdue";

function FinancePage() {
  const ws = useWorkspace();
  const { data, isLoading } = useFinance();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);

  const save = useServerFn(saveTransaction);
  const setStatus = useServerFn(setTransactionStatus);
  const remove = useServerFn(deleteTransaction);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance", ws.tenantId] });

  const [form, setForm] = useState({
    direction: "income" as "income" | "expense",
    description: "",
    amount: "",
    due_date: todayISO(),
    status: "pending" as "pending" | "paid",
    category_id: "",
    bank_account_id: "",
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          tenant_id: ws.tenantId!,
          direction: form.direction,
          status: form.status,
          amount: Number(form.amount.replace(",", ".")),
          due_date: form.due_date,
          description: form.description,
          category_id: form.category_id || null,
          bank_account_id: form.bank_account_id || null,
        },
      }),
    onSuccess: async () => {
      toast.success("Lançamento registrado");
      setOpen(false);
      setForm((f) => ({ ...f, description: "", amount: "" }));
      await invalidate();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: "paid" | "pending" }) =>
      setStatus({ data: { tenantId: ws.tenantId!, id: vars.id, status: vars.status } }),
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

  const rows = useMemo(() => {
    const list = data?.transactions ?? [];
    const today = todayISO();
    return list
      .filter((t) => {
        if (filter === "income" || filter === "expense") return t.direction === filter;
        if (filter === "pending") return t.status === "pending";
        if (filter === "overdue") return t.status === "pending" && t.due_date < today;
        return true;
      })
      .slice(0, 200);
  }, [data, filter]);

  const categories = (data?.categories ?? []).filter((c) => c.kind === form.direction);
  const canCreate = ws.can("finance", "create");

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Financeiro</p>
          <h1 className="font-display text-2xl font-semibold">Lançamentos</h1>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo lançamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
                <DialogDescription>Receitas entram com +, despesas com −.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Tabs
                  value={form.direction}
                  onValueChange={(v) => setForm((f) => ({ ...f, direction: v as "income" | "expense", category_id: "" }))}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income">Receita</TabsTrigger>
                    <TabsTrigger value="expense">Despesa</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="space-y-2">
                  <Label htmlFor="desc">Descrição</Label>
                  <Input
                    id="desc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Mensalidade cliente X"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="1500,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due">Vencimento</Label>
                    <Input
                      id="due"
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={form.category_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Situação</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v as "pending" | "paid" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Em aberto</SelectItem>
                        <SelectItem value="paid">Liquidado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !form.description || !form.amount}
                >
                  {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Todos"],
            ["income", "Receitas"],
            ["expense", "Despesas"],
            ["pending", "Em aberto"],
            ["overdue", "Vencidos"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum lançamento neste filtro.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((t) => {
                  const overdue = t.status === "pending" && t.due_date < todayISO();
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="numeric text-muted-foreground">{formatDate(t.due_date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            t.status === "paid"
                              ? "bg-positive/15 text-positive"
                              : overdue
                                ? "bg-negative/15 text-negative"
                                : "bg-warning/15 text-warning"
                          }
                        >
                          {t.status === "paid" ? "Liquidado" : overdue ? "Vencido" : "Em aberto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Money
                          value={t.direction === "income" ? Number(t.amount) : -Number(t.amount)}
                          className="font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {t.status !== "paid" && ws.can("finance", "edit") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Marcar como liquidado"
                              onClick={() => statusMutation.mutate({ id: t.id, status: "paid" })}
                            >
                              <Check className="size-4 text-positive" />
                            </Button>
                          )}
                          {ws.can("finance", "delete") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Excluir"
                              onClick={() => deleteMutation.mutate(t.id)}
                            >
                              <Trash2 className="size-4 text-negative" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}