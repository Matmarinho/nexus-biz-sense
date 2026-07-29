import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, Save, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/app/theme-provider";
import { useWorkspace } from "@/components/app/workspace";
import { savePreferences, saveProfile } from "@/lib/session.functions";
import { updateTenant } from "@/lib/tenants.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Nexus ERP" },
      {
        name: "description",
        content: "Ajuste identidade da empresa, moeda, tema, preferências pessoais e segurança da conta.",
      },
      { property: "og:title", content: "Configurações · Nexus ERP" },
      { property: "og:description", content: "Parâmetros do workspace, perfil e autenticação multifator." },
    ],
  }),
  component: SettingsPage,
});

const CURRENCIES = ["BRL", "USD", "EUR", "GBP", "ARS", "CLP", "MXN"];

function SettingsPage() {
  const ws = useWorkspace();
  const { theme, setTheme, privacy, togglePrivacy } = useTheme();
  const updateT = useServerFn(updateTenant);
  const savePrefs = useServerFn(savePreferences);
  const saveProf = useServerFn(saveProfile);

  const [company, setCompany] = useState({
    legal_name: "",
    trade_name: "",
    tax_id: "",
    segment: "",
    currency: "BRL",
    accent_color: "#8B5CF6",
  });
  const [profile, setProfile] = useState({ full_name: "", phone: "" });

  useEffect(() => {
    if (ws.tenant) {
      setCompany({
        legal_name: ws.tenant.legal_name ?? "",
        trade_name: ws.tenant.trade_name ?? "",
        tax_id: ws.tenant.tax_id ?? "",
        segment: ws.tenant.segment ?? "",
        currency: ws.tenant.currency ?? "BRL",
        accent_color: ws.tenant.accent_color ?? "#8B5CF6",
      });
    }
  }, [ws.tenant]);

  useEffect(() => {
    if (ws.profile) {
      setProfile({ full_name: ws.profile.full_name ?? "", phone: ws.profile.phone ?? "" });
    }
  }, [ws.profile]);

  const canEditCompany = ws.can("settings", "edit");

  const companyMut = useMutation({
    mutationFn: () =>
      updateT({
        data: {
          tenantId: ws.tenantId!,
          patch: {
            legal_name: company.legal_name,
            trade_name: company.trade_name || null,
            tax_id: company.tax_id || null,
            segment: company.segment || null,
            currency: company.currency,
            accent_color: company.accent_color,
          },
        },
      }),
    onSuccess: async () => {
      toast.success("Empresa atualizada");
      await ws.refresh();
    },
    onError: (e: Error) => toast.error("Falha ao salvar", { description: e.message }),
  });

  const profileMut = useMutation({
    mutationFn: () => saveProf({ data: { full_name: profile.full_name, phone: profile.phone } }),
    onSuccess: async () => {
      toast.success("Perfil atualizado");
      await ws.refresh();
    },
    onError: (e: Error) => toast.error("Falha ao salvar", { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Empresa, preferências pessoais e segurança da conta.</p>
      </header>

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identidade e parâmetros</CardTitle>
              <CardDescription>
                {ws.tenantId ? "Aplicado apenas à empresa ativa." : "Selecione uma empresa para editar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FieldText
                label="Razão social"
                value={company.legal_name}
                onChange={(v) => setCompany((c) => ({ ...c, legal_name: v }))}
                disabled={!canEditCompany}
              />
              <FieldText
                label="Nome fantasia"
                value={company.trade_name}
                onChange={(v) => setCompany((c) => ({ ...c, trade_name: v }))}
                disabled={!canEditCompany}
              />
              <FieldText
                label="Documento fiscal"
                value={company.tax_id}
                onChange={(v) => setCompany((c) => ({ ...c, tax_id: v }))}
                disabled={!canEditCompany}
              />
              <FieldText
                label="Segmento"
                value={company.segment}
                onChange={(v) => setCompany((c) => ({ ...c, segment: v }))}
                disabled={!canEditCompany}
              />
              <div className="space-y-2">
                <Label>Moeda padrão</Label>
                <Select
                  value={company.currency}
                  onValueChange={(v) => setCompany((c) => ({ ...c, currency: v }))}
                  disabled={!canEditCompany}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent">Cor de destaque</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="accent"
                    type="color"
                    className="h-10 w-16 p-1"
                    value={company.accent_color}
                    onChange={(e) => setCompany((c) => ({ ...c, accent_color: e.target.value }))}
                    disabled={!canEditCompany}
                  />
                  <span className="numeric text-sm text-muted-foreground">{company.accent_color}</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => companyMut.mutate()}
                  disabled={!ws.tenantId || !canEditCompany || companyMut.isPending}
                >
                  {companyMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar empresa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aparência e painel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={theme}
                  onValueChange={(v) => {
                    setTheme(v as "dark" | "light" | "system");
                    savePrefs({ data: { theme: v as "dark" | "light" | "system" } }).catch(() => {});
                  }}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
                <span>
                  <span className="block text-sm font-medium">Modo privacidade</span>
                  <span className="block text-xs text-muted-foreground">
                    Oculta valores sensíveis na tela (atalho Shift + P).
                  </span>
                </span>
                <Switch
                  checked={privacy}
                  onCheckedChange={() => {
                    togglePrivacy();
                    savePrefs({ data: { privacy_mode: !privacy } }).catch(() => {});
                  }}
                />
              </label>
              {ws.tenantId && (
                <Button
                  variant="outline"
                  onClick={() =>
                    savePrefs({ data: { last_tenant_id: ws.tenantId } }).then(() =>
                      toast.success("Empresa ativa definida como padrão"),
                    )
                  }
                >
                  Definir empresa atual como padrão
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meu perfil</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FieldText
                label="Nome completo"
                value={profile.full_name}
                onChange={(v) => setProfile((p) => ({ ...p, full_name: v }))}
              />
              <FieldText
                label="Telefone"
                value={profile.phone}
                onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
              />
              <div className="sm:col-span-2">
                <Button onClick={() => profileMut.mutate()} disabled={profileMut.isPending}>
                  {profileMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="mt-4 space-y-4">
          <PasswordCard />
          <MfaCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function change() {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("Falha ao alterar senha", { description: error.message });
    setPassword("");
    toast.success("Senha atualizada");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> Senha
        </CardTitle>
        <CardDescription>Defina uma nova senha com pelo menos 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1 space-y-2">
          <Label htmlFor="new-pass">Nova senha</Label>
          <Input
            id="new-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button onClick={change} disabled={password.length < 8 || loading}>
          {loading && <Loader2 className="size-4 animate-spin" />} Alterar senha
        </Button>
      </CardContent>
    </Card>
  );
}

type Factor = { id: string; friendly_name?: string | null; status: string };

function MfaCard() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data?.totp ?? []) as Factor[]) ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startEnroll() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Nexus ${new Date().toLocaleDateString("pt-BR")}`,
    });
    setLoading(false);
    if (error || !data) return toast.error("Falha ao iniciar MFA", { description: error?.message });
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify() {
    if (!enrolling) return;
    setLoading(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (cErr || !challenge) {
      setLoading(false);
      return toast.error("Falha no desafio", { description: cErr?.message });
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolling.id,
      challengeId: challenge.id,
      code,
    });
    setLoading(false);
    if (error) return toast.error("Código inválido", { description: error.message });
    toast.success("Autenticação em dois fatores ativada");
    setEnrolling(null);
    setCode("");
    refresh();
  }

  async function unenroll(id: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast.error("Falha ao remover", { description: error.message });
    toast.success("Fator removido");
    refresh();
  }

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4" /> Autenticação em dois fatores (TOTP)
          {verified.length > 0 && <Badge variant="secondary">Ativa</Badge>}
        </CardTitle>
        <CardDescription>
          Use Google Authenticator, 1Password ou Authy para gerar códigos de 6 dígitos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <span className="flex items-center gap-2 text-sm">
              <Smartphone className="size-4 text-primary" /> {f.friendly_name ?? "Aplicativo autenticador"}
            </span>
            <Button variant="ghost" size="icon" className="text-negative" onClick={() => unenroll(f.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {enrolling ? (
          <div className="space-y-3">
            <img src={enrolling.qr} alt="QR code para configurar o autenticador" className="size-48 rounded-lg bg-white p-2" />
            <p className="text-xs text-muted-foreground">
              Ou digite a chave manualmente: <span className="numeric">{enrolling.secret}</span>
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="otp">Código de 6 dígitos</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-40"
                />
              </div>
              <Button onClick={verify} disabled={code.length !== 6 || loading}>
                {loading && <Loader2 className="size-4 animate-spin" />} Confirmar
              </Button>
              <Button variant="ghost" onClick={() => setEnrolling(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={startEnroll} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} Adicionar autenticador
          </Button>
        )}
      </CardContent>
    </Card>
  );
}