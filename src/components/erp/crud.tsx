import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/components/app/workspace";
import { removeRecord, saveRecord } from "@/lib/erp.functions";
import type { ErpTable } from "@/lib/erp.schemas";
import { cn } from "@/lib/utils";

const NONE = "__none__";

export type FieldType = "text" | "number" | "textarea" | "select" | "switch" | "date" | "datetime";

export type CrudField = {
  key: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  step?: string;
  optional?: boolean;
  formOnly?: boolean;
  tableOnly?: boolean;
  align?: "left" | "right";
  render?: (row: Record<string, unknown>) => ReactNode;
};

export type CrudProps = {
  title: string;
  description?: string;
  table: ErpTable;
  rows: Record<string, unknown>[];
  loading?: boolean;
  fields: CrudField[];
  defaults: Record<string, unknown>;
  searchKeys: string[];
  fixedValues?: Record<string, unknown>;
  emptyLabel?: string;
  pageSize?: number;
  toolbar?: ReactNode;
};

function toFormValue(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v;
  return String(v);
}

export function CrudPanel({
  title,
  description,
  table,
  rows,
  loading,
  fields,
  defaults,
  searchKeys,
  fixedValues,
  emptyLabel = "Nenhum registro encontrado.",
  pageSize = 12,
  toolbar,
}: CrudProps) {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const save = useServerFn(saveRecord);
  const remove = useServerFn(removeRecord);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(defaults);

  const tableFields = fields.filter((f) => !f.formOnly);
  const formFields = fields.filter((f) => !f.tableOnly);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      searchKeys.some((k) =>
        String(r[k] ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [rows, q, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  const mutation = useMutation({
    mutationFn: async () => {
      const values: Record<string, unknown> = { ...fixedValues };
      for (const f of formFields) {
        const raw = form[f.key];
        if (f.type === "switch") values[f.key] = Boolean(raw);
        else if (f.type === "number") values[f.key] = Number(raw || 0);
        else values[f.key] = raw === "" || raw === NONE ? null : raw;
      }
      return save({
        data: { table, tenantId: ws.tenantId!, id: (editing?.id as string | undefined) ?? undefined, values },
      });
    },
    onSuccess: async () => {
      toast.success(editing ? "Registro atualizado" : "Registro criado");
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["erp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { table, tenantId: ws.tenantId!, id } }),
    onSuccess: async () => {
      toast.success("Registro excluído");
      await qc.invalidateQueries({ queryKey: ["erp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm(defaults);
    setOpen(true);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditing(row);
    const next: Record<string, unknown> = { ...defaults };
    for (const f of formFields) next[f.key] = toFormValue(row[f.key]);
    setForm(next);
    setOpen(true);
  }

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Cadastro</p>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar..."
              className="w-56 pl-9"
            />
          </div>
          <Button onClick={openNew}>
            <Plus className="size-4" /> Novo
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-surface/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border/60 bg-surface-2/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    {tableFields.map((f) => (
                      <th key={f.key} className={cn("px-3 py-2 text-left font-medium", f.align === "right" && "text-right")}>
                        {f.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={String(row.id)} className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40">
                      {tableFields.map((f) => (
                        <td key={f.key} className={cn("px-3 py-2", f.align === "right" && "text-right tabular-nums")}>
                          {f.render ? f.render(row) : (toFormValue(row[f.key]) as ReactNode) || "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Editar">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-negative"
                            title="Excluir"
                            onClick={() => del.mutate(String(row.id))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} registro(s) · página {current} de {pages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>
            Próxima
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${title.toLowerCase()}` : `Novo registro · ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {formFields.map((f) => (
              <div key={f.key} className={cn("space-y-1.5", f.type === "textarea" && "sm:col-span-2")}>
                <Label>{f.label}</Label>
                {f.type === "select" ? (
                  <Select
                    value={(form[f.key] as string) || NONE}
                    onValueChange={(v) => setForm((s) => ({ ...s, [f.key]: v === NONE ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {f.optional && <SelectItem value={NONE}>Não informado</SelectItem>}
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "textarea" ? (
                  <Textarea
                    value={(form[f.key] as string) ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    rows={3}
                  />
                ) : f.type === "switch" ? (
                  <div className="flex h-9 items-center">
                    <Switch
                      checked={Boolean(form[f.key])}
                      onCheckedChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
                    />
                  </div>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
                    step={f.step}
                    value={(form[f.key] as string) ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}