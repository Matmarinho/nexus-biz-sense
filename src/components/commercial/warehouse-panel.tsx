import { useMemo, useState } from "react";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRL } from "@/lib/format";
import { useWorkspace } from "@/components/app/workspace";

type Item = { id: string; name: string; sku: string; qty: number; min: number; cost: number; location: string };

const KEY = (tenant: string) => `nexus.almoxarifado.${tenant}`;

function load(tenant: string): Item[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY(tenant)) ?? "[]") as Item[];
  } catch {
    return [];
  }
}

export function WarehousePanel() {
  const ws = useWorkspace();
  const tenant = ws.tenantId ?? "";
  const [items, setItems] = useState<Item[]>(() => (typeof window === "undefined" || !tenant ? [] : load(tenant)));
  const [form, setForm] = useState({ name: "", sku: "", qty: "", min: "", cost: "", location: "" });

  const persist = (next: Item[]) => {
    setItems(next);
    if (tenant) window.localStorage.setItem(KEY(tenant), JSON.stringify(next));
  };

  const totals = useMemo(() => {
    const value = items.reduce((s, i) => s + i.qty * i.cost, 0);
    const low = items.filter((i) => i.qty <= i.min).length;
    return { value, low };
  }, [items]);

  function add() {
    if (!form.name.trim()) return;
    persist([
      ...items,
      {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        sku: form.sku.trim(),
        qty: Number(form.qty.replace(",", ".")) || 0,
        min: Number(form.min.replace(",", ".")) || 0,
        cost: Number(form.cost.replace(",", ".")) || 0,
        location: form.location.trim(),
      },
    ]);
    setForm({ name: "", sku: "", qty: "", min: "", cost: "", location: "" });
  }

  function update(id: string, patch: Partial<Item>) {
    persist(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Almoxarifado</h1>
        <p className="text-sm text-muted-foreground">
          Controle simples de itens, saldo mínimo e valor em estoque. Os dados ficam salvos neste navegador enquanto o
          módulo completo de estoque não é integrado ao banco.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-surface/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Itens cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="numeric text-2xl font-semibold">{items.length}</CardContent>
        </Card>
        <Card className="border-border/60 bg-surface/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Valor em estoque</CardTitle>
          </CardHeader>
          <CardContent className="numeric text-2xl font-semibold">{BRL(totals.value)}</CardContent>
        </Card>
        <Card className="border-border/60 bg-surface/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Abaixo do mínimo</CardTitle>
          </CardHeader>
          <CardContent className="numeric text-2xl font-semibold text-warning">{totals.low}</CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Boxes className="size-4" /> Novo item
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-6">
          {(
            [
              ["name", "Item"],
              ["sku", "SKU"],
              ["qty", "Qtd."],
              ["min", "Mínimo"],
              ["cost", "Custo unit."],
              ["location", "Local"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="sm:col-span-6">
            <Button onClick={add} disabled={!form.name.trim()}>
              <Plus className="size-4" /> Adicionar item
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-surface/60 overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-surface/95 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Local</th>
                <th className="px-3 py-2 font-medium">Qtd.</th>
                <th className="px-3 py-2 font-medium">Mínimo</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhum item no almoxarifado.
                  </td>
                </tr>
              )}
              {items.map((i) => (
                <tr key={i.id} className="border-t border-border/40">
                  <td className="px-3 py-2">{i.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{i.sku || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{i.location || "—"}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-20"
                      value={String(i.qty)}
                      onChange={(e) => update(i.id, { qty: Number(e.target.value.replace(",", ".")) || 0 })}
                    />
                  </td>
                  <td className={i.qty <= i.min ? "px-3 py-2 text-warning" : "px-3 py-2 text-muted-foreground"}>{i.min}</td>
                  <td className="numeric px-3 py-2 text-right">{BRL(i.qty * i.cost)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => persist(items.filter((x) => x.id !== i.id))}
                    >
                      <Trash2 className="size-3.5 text-negative" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}