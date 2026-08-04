import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, FolderKanban, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/components/app/workspace";
import { BRL, formatDate } from "@/lib/format";
import {
  deleteProject,
  deleteTask,
  loadProjects,
  patchTask,
  saveProject,
  saveTask,
} from "@/lib/projects.functions";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/projetos")({
  head: () => ({
    meta: [
      { title: "Projetos · Nexus ERP" },
      {
        name: "description",
        content: "Gestão de projetos com quadro de tarefas, orçamento, custo realizado, prazos e progresso por empresa.",
      },
      { property: "og:title", content: "Projetos · Nexus ERP" },
      { property: "og:description", content: "Quadro de tarefas, orçamento e progresso de cada projeto." },
    ],
  }),
  component: ProjectsPage,
});

type Project = Tables<"projects">;
type Task = Tables<"project_tasks">;

const STATUS: Record<string, string> = {
  planning: "Planejamento",
  active: "Em execução",
  paused: "Pausado",
  done: "Concluído",
  canceled: "Cancelado",
};
const PRIORITY: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};
const TASK_STATUS: { key: "todo" | "doing" | "review" | "done"; label: string }[] = [
  { key: "todo", label: "A fazer" },
  { key: "doing", label: "Em andamento" },
  { key: "review", label: "Revisão" },
  { key: "done", label: "Concluído" },
];

const EMPTY = {
  name: "",
  code: "",
  party_id: "",
  status: "planning",
  priority: "medium",
  start_date: "",
  end_date: "",
  budget: "",
  actual_cost: "",
  progress: "0",
  description: "",
};

function ProjectsPage() {
  const ws = useWorkspace();
  const qc = useQueryClient();
  const load = useServerFn(loadProjects);
  const save = useServerFn(saveProject);
  const removeProject = useServerFn(deleteProject);
  const addTask = useServerFn(saveTask);
  const moveTask = useServerFn(patchTask);
  const removeTask = useServerFn(deleteTask);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [selected, setSelected] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");

  const canCreate = ws.can("projects", "create");
  const canEdit = ws.can("projects", "edit");
  const canDelete = ws.can("projects", "delete");

  const { data, isLoading } = useQuery({
    queryKey: ["projects", ws.tenantId],
    enabled: !!ws.tenantId,
    queryFn: () => load({ data: { tenantId: ws.tenantId! } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["projects", ws.tenantId] });
  const onError = (e: Error) => toast.error("Operação falhou", { description: e.message });

  const mSave = useMutation({
    mutationFn: save,
    onSuccess: () => {
      toast.success("Projeto salvo");
      setOpen(false);
      invalidate();
    },
    onError,
  });
  const mDelete = useMutation({ mutationFn: removeProject, onSuccess: invalidate, onError });
  const mTask = useMutation({
    mutationFn: addTask,
    onSuccess: () => {
      setTaskTitle("");
      invalidate();
    },
    onError,
  });
  const mMove = useMutation({ mutationFn: moveTask, onSuccess: invalidate, onError });
  const mDelTask = useMutation({ mutationFn: removeTask, onSuccess: invalidate, onError });

  const projects: Project[] = data?.projects ?? [];
  const tasks: Task[] = data?.tasks ?? [];
  const current = projects.find((p) => p.id === selected) ?? projects[0] ?? null;
  const currentTasks = useMemo(
    () => tasks.filter((t) => t.project_id === current?.id),
    [tasks, current?.id],
  );

  const totals = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const budget = projects.reduce((s, p) => s + Number(p.budget ?? 0), 0);
    const cost = projects.reduce((s, p) => s + Number(p.actual_cost ?? 0), 0);
    const late = projects.filter(
      (p) => p.end_date && p.status !== "done" && new Date(`${p.end_date}T00:00:00`) < new Date(),
    ).length;
    return { active, budget, cost, late };
  }, [projects]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({
      name: p.name,
      code: p.code ?? "",
      party_id: p.party_id ?? "",
      status: p.status,
      priority: p.priority,
      start_date: p.start_date ?? "",
      end_date: p.end_date ?? "",
      budget: String(p.budget ?? 0),
      actual_cost: String(p.actual_cost ?? 0),
      progress: String(p.progress ?? 0),
      description: p.description ?? "",
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
        name: form.name,
        code: form.code || null,
        party_id: form.party_id || null,
        description: form.description || null,
        status: form.status as Project["status"] as "planning",
        priority: form.priority as "medium",
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: Number(form.budget.replace(",", ".")) || 0,
        actual_cost: Number(form.actual_cost.replace(",", ".")) || 0,
        progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
      },
    });
  }

  if (!ws.tenantId) return <p className="text-sm text-muted-foreground">Selecione uma empresa para ver os projetos.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-muted-foreground">Escopo, prazos, orçamento e execução das entregas.</p>
        </div>
        {canCreate && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> Novo projeto
          </Button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={FolderKanban} label="Projetos ativos" value={String(totals.active)} hint={`${projects.length} no total`} />
        <Kpi icon={Wallet} label="Orçamento total" value={BRL(totals.budget)} />
        <Kpi
          icon={Wallet}
          label="Custo realizado"
          value={BRL(totals.cost)}
          hint={totals.budget ? `${((totals.cost / totals.budget) * 100).toFixed(0)}% do orçamento` : undefined}
          tone={totals.cost > totals.budget ? "negative" : undefined}
        />
        <Kpi icon={CalendarClock} label="Prazos estourados" value={String(totals.late)} tone={totals.late ? "negative" : undefined} />
      </div>

      {isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="space-y-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  current?.id === p.id ? "border-primary/50 bg-primary/5" : "border-border/60 bg-surface/50 hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {STATUS[p.status] ?? p.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.code ? `${p.code} · ` : ""}
                  {formatDate(p.start_date)} → {formatDate(p.end_date)}
                </p>
                <Progress value={p.progress ?? 0} className="mt-2 h-1.5" />
              </button>
            ))}
            {!projects.length && (
              <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Nenhum projeto cadastrado ainda.
              </p>
            )}
          </div>

          {current && (
            <section className="space-y-4 rounded-xl border border-border/60 bg-surface/50 p-4">
              <header className="flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                  <h2 className="font-display text-lg font-semibold">{current.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {PRIORITY[current.priority]} · Orçamento {BRL(Number(current.budget ?? 0))} · Custo{" "}
                    <span className={Number(current.actual_cost) > Number(current.budget) ? "text-negative" : ""}>
                      {BRL(Number(current.actual_cost ?? 0))}
                    </span>
                  </p>
                </div>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => openEdit(current)}>
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-negative"
                    onClick={() => mDelete.mutate({ data: { id: current.id, tenant_id: ws.tenantId! } })}
                  >
                    <Trash2 className="size-4" /> Excluir
                  </Button>
                )}
              </header>

              {current.description && <p className="text-sm text-muted-foreground">{current.description}</p>}

              {canCreate && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!taskTitle.trim()) return;
                    mTask.mutate({
                      data: {
                        tenant_id: ws.tenantId!,
                        project_id: current.id,
                        title: taskTitle.trim(),
                        status: "todo",
                        priority: "medium",
                      },
                    });
                  }}
                >
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Nova tarefa"
                  />
                  <Button type="submit" disabled={mTask.isPending}>
                    {mTask.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  </Button>
                </form>
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {TASK_STATUS.map((col) => {
                  const items = currentTasks.filter((t) => t.status === col.key);
                  return (
                    <div key={col.key} className="rounded-lg border border-border/60 bg-surface-2/50 p-3">
                      <header className="mb-2 flex items-center gap-2 text-sm font-medium">
                        {col.key === "done" && <CheckCircle2 className="size-4 text-positive" />}
                        {col.label}
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {items.length}
                        </Badge>
                      </header>
                      <div className="space-y-2">
                        {items.map((t) => (
                          <div key={t.id} className="rounded-md border border-border/50 bg-background/40 p-2 text-xs">
                            <p className="font-medium">{t.title}</p>
                            <p className="mt-1 text-muted-foreground">{formatDate(t.due_date)}</p>
                            <div className="mt-2 flex items-center gap-1">
                              {canEdit && (
                                <Select
                                  value={t.status}
                                  onValueChange={(v) =>
                                    mMove.mutate({
                                      data: {
                                        id: t.id,
                                        tenant_id: ws.tenantId!,
                                        status: v as "todo",
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7 flex-1 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TASK_STATUS.map((s) => (
                                      <SelectItem key={s.key} value={s.key}>
                                        {s.label}
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
                                  onClick={() => mDelTask.mutate({ data: { id: t.id, tenant_id: ws.tenantId! } })}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {!items.length && <p className="text-xs text-muted-foreground">—</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Início</Label>
                <Input
                  id="start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Término</Label>
                <Input
                  id="end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Orçamento</Label>
                <Input
                  id="budget"
                  inputMode="decimal"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Custo realizado</Label>
                <Input
                  id="cost"
                  inputMode="decimal"
                  value={form.actual_cost}
                  onChange={(e) => setForm({ ...form, actual_cost: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="progress">Progresso (%)</Label>
                <Input
                  id="progress"
                  inputMode="numeric"
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="desc">Descrição</Label>
                <Textarea
                  id="desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
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
  tone?: "negative";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`numeric text-2xl font-semibold ${tone === "negative" ? "text-negative" : ""}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}