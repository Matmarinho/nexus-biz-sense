import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MailPlus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useWorkspace } from "@/components/app/workspace";
import {
  ACTIONS,
  ACTION_LABELS,
  MODULES,
  MODULE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  checkPermission,
  type ActionKey,
  type AppRole,
  type CustomPermissions,
  type ModuleKey,
} from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { inviteMember, listMembers, removeMember, revokeInvite, updateMember } from "@/lib/tenants.functions";

const ASSIGNABLE: AppRole[] = ["admin", "manager", "finance", "employee", "accountant", "client", "viewer"];

type Member = {
  id: string;
  user_id: string;
  role: AppRole;
  status: string;
  custom_permissions: CustomPermissions | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
};

export function TeamPanel() {
  const ws = useWorkspace();
  const queryClient = useQueryClient();
  const load = useServerFn(listMembers);
  const invite = useServerFn(inviteMember);
  const update = useServerFn(updateMember);
  const remove = useServerFn(removeMember);
  const revoke = useServerFn(revokeInvite);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");
  const [editing, setEditing] = useState<Member | null>(null);

  const canManage = ws.can("users", "manage_users");
  const tenantId = ws.tenantId;

  const { data, isLoading } = useQuery({
    queryKey: ["members", tenantId],
    queryFn: () => load({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["members", tenantId] });

  const inviteMut = useMutation({
    mutationFn: () => invite({ data: { tenantId: tenantId!, email, role, custom_permissions: {} } }),
    onSuccess: (res) => {
      toast.success(res.mode === "added" ? "Usuário adicionado à empresa" : "Convite criado");
      setEmail("");
      invalidate();
    },
    onError: (e: Error) => toast.error("Falha ao convidar", { description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { memberId: string; role?: AppRole; status?: "active" | "suspended"; custom_permissions?: CustomPermissions }) =>
      update({ data: { tenantId: tenantId!, ...vars } as never }),
    onSuccess: () => {
      toast.success("Acesso atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error("Falha ao atualizar", { description: e.message }),
  });

  const removeMut = useMutation({
    mutationFn: (memberId: string) => remove({ data: { tenantId: tenantId!, memberId } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      invalidate();
    },
    onError: (e: Error) => toast.error("Falha ao remover", { description: e.message }),
  });

  if (!tenantId) {
    return <p className="text-muted-foreground">Selecione uma empresa para gerenciar a equipe.</p>;
  }

  const members = (data?.members ?? []) as unknown as Member[];
  const invites = data?.invites ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Equipe e acessos</h1>
          <p className="text-sm text-muted-foreground">
            Papéis, permissões por módulo e convites de {ws.tenant?.trade_name ?? ws.tenant?.legal_name}.
          </p>
        </div>
        {canManage && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <MailPlus className="size-4" /> Convidar pessoa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar para a empresa</DialogTitle>
                <DialogDescription>
                  Se a pessoa já tiver conta, o acesso é liberado na hora. Caso contrário, um convite pendente é criado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-mail</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pessoa@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Papel</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => inviteMut.mutate()} disabled={!email || inviteMut.isPending}>
                  {inviteMut.isPending && <Loader2 className="size-4 animate-spin" />} Enviar convite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={m.profiles?.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-[11px]">
                            {(m.profiles?.full_name ?? m.profiles?.email ?? "U").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.profiles?.full_name ?? "Sem nome"}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.profiles?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) => updateMut.mutate({ memberId: m.id, role: v as AppRole })}
                        >
                          <SelectTrigger className="w-[13rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "secondary" : "outline"}>
                        {m.status === "active" ? "Ativo" : "Suspenso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Permissões" onClick={() => setEditing(m)}>
                            <UserCog className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={m.status === "active" ? "Suspender" : "Reativar"}
                            onClick={() =>
                              updateMut.mutate({
                                memberId: m.id,
                                status: m.status === "active" ? "suspended" : "active",
                              })
                            }
                          >
                            <ShieldCheck className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Remover"
                            className="text-negative"
                            onClick={() => removeMut.mutate(m.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convites pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm">{i.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[i.role as AppRole]} · expira em {formatDate(i.expires_at)}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      revoke({ data: { tenantId, inviteId: i.id } }).then(() => {
                        toast.success("Convite revogado");
                        invalidate();
                      })
                    }
                  >
                    Revogar
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PermissionsDialog
        member={editing}
        onClose={() => setEditing(null)}
        onSave={(perms) => {
          if (editing) updateMut.mutate({ memberId: editing.id, custom_permissions: perms });
          setEditing(null);
        }}
      />
    </div>
  );
}

function PermissionsDialog({
  member,
  onClose,
  onSave,
}: {
  member: Member | null;
  onClose: () => void;
  onSave: (perms: CustomPermissions) => void;
}) {
  const [perms, setPerms] = useState<CustomPermissions>({});
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (member && loadedFor !== member.id) {
    setLoadedFor(member.id);
    setPerms(member.custom_permissions ?? {});
  }

  const toggle = (mod: ModuleKey, action: ActionKey, value: boolean) =>
    setPerms((p) => ({ ...p, [mod]: { ...(p[mod] ?? {}), [action]: value } }));

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões de {member?.profiles?.full_name ?? member?.profiles?.email}</DialogTitle>
          <DialogDescription>
            Os interruptores sobrescrevem o padrão do papel {member ? ROLE_LABELS[member.role] : ""}. O servidor
            sempre revalida cada operação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {MODULES.map((mod) => (
            <div key={mod} className="rounded-lg border border-border/60 p-3">
              <p className="mb-2 text-sm font-medium">{MODULE_LABELS[mod]}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ACTIONS.map((action) => {
                  const override = perms[mod]?.[action];
                  const effective =
                    typeof override === "boolean"
                      ? override
                      : checkPermission(member?.role ?? null, null, mod, action);
                  return (
                    <label key={action} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">{ACTION_LABELS[action]}</span>
                      <Switch checked={effective} onCheckedChange={(v) => toggle(mod, action, v)} />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setPerms({})}>
            Limpar sobrescritas
          </Button>
          <Button onClick={() => onSave(perms)}>Salvar permissões</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}