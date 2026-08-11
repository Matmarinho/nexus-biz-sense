import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/components/app/workspace";
import { useErp } from "@/components/erp/use-erp";
import { removeRecord, saveOrderWithItems } from "@/lib/erp.functions";
import { BRL, formatDate } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type Product = Tables<"products">;

const NONE = "__none__";

const STATUS = [
  { value: "draft", label: "Rascunho" },
  { value: "confirmed", label: "Confirmado" },
  { value: "delivered", label: "Entregue" },
  { value: "invoiced", label: "Faturado" },
  { value: "canceled", label: "Cancelado" },
];

type ItemForm = { product_id: string; description: string; quantity: string; unit_price: string };

const emptyItem = (): ItemForm => ({ product_id: "", description: "", quantity: "1", unit_price: "0" });

const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

function emptyOrder() {
  return {
    number: "",
    party_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    delivery_date: "",
    status: "draft",
    discount: "0",
    shipping: "0",
    notes: "",
  };
}

export function OrdersPanel({ kind }: { kind: "sale" | "purchase" }) {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const { data, isLoading } = useErp();
  const save = useServerFn(saveOrderWithItems);
  const remove = useServerFn(removeRecord);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState(emptyOrder());
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isSale = kind === "sale";
  const products = (data?.products ?? []) as Product[];
  const parties = (data?.parties ?? []).filter((p) =>
    isSale ? p.type === "customer" || p.type === "both" : p.type === "vendor" || p.type === "both",
  );
  const orders = useMemo(
    () => ((data?.orders ?? []) as Order[]).filter((o) => o.kind === kind),
    [data, kind],
  );
  const itemsByOrder = useMemo(() => {
    const map = new Map<string, OrderItem[]>();
    for (const i of (data?.orderItems ?? []) as OrderItem[]) {
      map.set(i.order_id, [...(map.get(i.order_id) ?? []), i]);
    }
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o) =>
      [o.number, o.notes, parties.find((p) => p.id === o.party_id)?.name]
        .some((v) => String(v ?? "").toLowerCase().includes(term)),
    );
  }, [orders, q, parties]);

  const itemsTotal = items.reduce((s, i) => s + num(i.quantity) * num(i.unit_price), 0);
  const grandTotal = Math.max(0, itemsTotal - num(form.discount) + num(form.shipping));

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          tenantId: ws.tenantId!,
          id: editing?.id,
          order: {
            kind,
            number: form.number || null,
            party_id: form.party_id || null,
            issue_date: form.issue_date,
            delivery_date: form.delivery_date || null,
            status: form.status as "draft",
            discount: num(form.discount),
            shipping: num(form.shipping),
            total: grandTotal,
            notes: form.notes || null,
          },
          items: items
            .filter((i) => i.description.trim() && num(i.quantity) > 0)
            .map((i) => ({
              product_id: i.product_id || null,
              description: i.description.trim(),
              quantity: num(i.quantity),
              unit_price: num(i.unit_price),
            })),
        },
      }),
    onSuccess: async () => {
      toast.success(editing ? "Pedido atualizado" : "Pedido criado");
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["erp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { table: "orders", tenantId: ws.tenantId!, id } }),
    onSuccess: async () => {
      toast.success("Pedido excluído");
      await qc.invalidateQueries({ queryKey: ["erp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm(emptyOrder());
    setItems([emptyItem()]);
    setOpen(true);
  }

  function openEdit(o: Order) {
    setEditing(o);
    setForm({
      number: o.number ?? "",
      party_id: o.party_id ?? "",
      issue_date: o.issue_date,
      delivery_date: o.delivery_date ?? "",
      status: o.status,
      discount: String(o.discount ?? 0),
      shipping: String(o.shipping ?? 0),
      notes: o.notes ?? "",
    });
    const existing = itemsByOrder.get(o.id) ?? [];
    setItems(
      existing.length
        ? existing.map((i) => ({
            product_id: i.product_id ?? "",
            description: i.description,
            quantity: String(i.quantity),
            unit_price: String(i.unit_price),
          }))
        : [emptyItem()],
    );
    setOpen(true);
  }

  function setItem(idx: number, patch: Partial<ItemForm>) {
    setItems((s) => s.map((i, k) => (k === idx ? { ...i, ...patch } : i)));
  }

  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setItem(idx, {
      product_id: productId,
      description: p?.name ?? items[idx]?.description ?? "",
      unit_price: p ? String(isSale ? p.sale_price : p.cost_price) : (items[idx]?.unit_price ?? "0"),
    });
  }

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {isSale ? "Comercial" : "Suprimentos"}
          </p>
          <h1 className="font-display text-2xl font-semibold">{isSale ? "Vendas" : "Compras"}</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos com itens detalhados: o total é calculado a partir dos itens, desconto e frete.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar..." className="w-56 pl-9" />
          </div>
          <Button onClick={openNew}>
            <Plus className="size-4" /> Novo pedido
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead className="border-b border-border/60 bg-surface-2/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="w-8 px-2 py-2" />
                    <th className="px-3 py-2 text-left font-medium">Número</th>
                    <th className="px-3 py-2 text-left font-medium">Emissão</th>
                    <th className="px-3 py-2 text-left font-medium">{isSale ? "Cliente" : "Fornecedor"}</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Itens</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const rows = itemsByOrder.get(o.id) ?? [];
                    const isOpen = expanded === o.id;
                    return (
                      <>
                        <tr key={o.id} className="border-b border-border/40 hover:bg-accent/40">
                          <td className="px-2 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => setExpanded(isOpen ? null : o.id)}
                              title="Ver itens"
                            >
                              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </Button>
                          </td>
                          <td className="px-3 py-2">{o.number || "—"}</td>
                          <td className="px-3 py-2">{formatDate(o.issue_date)}</td>
                          <td className="px-3 py-2">{parties.find((p) => p.id === o.party_id)?.name ?? "—"}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {STATUS.find((s) => s.value === o.status)?.label ?? o.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{rows.length}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{BRL(Number(o.total ?? 0))}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title="Editar">
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-negative"
                                title="Excluir"
                                onClick={() => del.mutate(o.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr key={`${o.id}-items`} className="border-b border-border/40 bg-surface-2/40">
                            <td colSpan={8} className="px-6 py-3">
                              {rows.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Pedido sem itens cadastrados.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead className="text-muted-foreground uppercase">
                                    <tr>
                                      <th className="py-1 text-left font-medium">Item</th>
                                      <th className="py-1 text-right font-medium">Qtd.</th>
                                      <th className="py-1 text-right font-medium">Unitário</th>
                                      <th className="py-1 text-right font-medium">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((i) => (
                                      <tr key={i.id}>
                                        <td className="py-1">{i.description}</td>
                                        <td className="py-1 text-right tabular-nums">{Number(i.quantity)}</td>
                                        <td className="py-1 text-right tabular-nums">{BRL(Number(i.unit_price))}</td>
                                        <td className="py-1 text-right tabular-nums">{BRL(Number(i.total))}</td>
                                      </tr>
                                    ))}
                                    <tr className="border-t border-border/50">
                                      <td className="py-1 font-medium" colSpan={3}>
                                        Desconto {BRL(Number(o.discount ?? 0))} · Frete {BRL(Number(o.shipping ?? 0))}
                                      </td>
                                      <td className="py-1 text-right font-semibold tabular-nums">
                                        {BRL(Number(o.total ?? 0))}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pedido" : `Novo pedido de ${isSale ? "venda" : "compra"}`}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Emissão</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Entrega</Label>
              <Input type="date" value={form.delivery_date} onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isSale ? "Cliente" : "Fornecedor"}</Label>
              <Select
                value={form.party_id || NONE}
                onValueChange={(v) => setForm((f) => ({ ...f, party_id: v === NONE ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informado</SelectItem>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do pedido</Label>
              <Button variant="outline" size="sm" onClick={() => setItems((s) => [...s, emptyItem()])}>
                <Plus className="size-3.5" /> Adicionar item
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface-2/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Produto</th>
                    <th className="px-2 py-2 text-left font-medium">Descrição</th>
                    <th className="px-2 py-2 text-right font-medium">Qtd.</th>
                    <th className="px-2 py-2 text-right font-medium">Unitário</th>
                    <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, idx) => (
                    <tr key={idx} className="border-t border-border/40">
                      <td className="px-2 py-1.5">
                        <Select value={i.product_id || NONE} onValueChange={(v) => pickProduct(idx, v === NONE ? "" : v)}>
                          <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Livre" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Item livre</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8"
                          value={i.description}
                          onChange={(e) => setItem(idx, { description: e.target.value })}
                          placeholder="Descrição do item"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8 w-20 text-right"
                          value={i.quantity}
                          onChange={(e) => setItem(idx, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8 w-28 text-right"
                          value={i.unit_price}
                          onChange={(e) => setItem(idx, { unit_price: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {BRL(num(i.quantity) * num(i.unit_price))}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-negative"
                          onClick={() => setItems((s) => (s.length > 1 ? s.filter((_, k) => k !== idx) : s))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Desconto</Label>
              <Input value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Frete</Label>
              <Input value={form.shipping} onChange={(e) => setForm((f) => ({ ...f, shipping: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total do pedido</Label>
              <div className="numeric flex h-9 items-center rounded-md border border-border/60 bg-surface-2/50 px-3 font-semibold">
                {BRL(grandTotal)}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />} Salvar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
