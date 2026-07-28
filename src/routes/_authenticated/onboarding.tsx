import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BRL } from "@/lib/format";
import { createTenant } from "@/lib/tenants.functions";
import { joinDemoTenant } from "@/lib/session.functions";
import { useWorkspace } from "@/components/app/workspace";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Criar empresa · Nexus ERP" },
      {
        name: "description",
        content: "Configure sua empresa em minutos: dados fiscais, plano e ambiente financeiro pronto para uso.",
      },
      { property: "og:title", content: "Criar empresa · Nexus ERP" },
      { property: "og:description", content: "Onboarding guiado da plataforma Nexus ERP." },
    ],
  }),
  component: OnboardingPage,
});

type PlanCode = "startup" | "pro" | "enterprise" | "holding";

function OnboardingPage() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const create = useServerFn(createTenant);
  const joinDemo = useServerFn(joinDemoTenant);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    legal_name: "",
    trade_name: "",
    tax_id: "",
    segment: "",
    headcount: "1-10",
    country: "BR",
    currency: "BRL",
    plan_code: "startup" as PlanCode,
    billing_cycle: "monthly" as "monthly" | "yearly",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const createMutation = useMutation({
    mutationFn: () => create({ data: { ...form, tax_id_kind: "cnpj", accent_color: "#8B5CF6" } }),
    onSuccess: async (res) => {
      toast.success("Empresa criada com sucesso");
      await ws.refresh();
      ws.setTenantId(res.tenant.id);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error("Não foi possível criar a empresa", { description: e.message }),
  });

  const demoMutation = useMutation({
    mutationFn: () => joinDemo({ data: undefined }),
    onSuccess: async (res) => {
      await ws.refresh();
      ws.setTenantId(res.tenantId);
      toast.success("Ambiente de demonstração liberado");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error("Falha ao abrir a demonstração", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Passo {step} de 3
        </span>
        <h1 className="font-display text-2xl font-semibold">Vamos configurar sua empresa</h1>
        <p className="text-sm text-muted-foreground">
          Leva menos de dois minutos. Você pode alterar tudo depois em Configurações.
        </p>
      </header>

      <Card className="border-border/60 bg-surface/60">
        <CardHeader>
          <CardTitle className="text-base">
            {step === 1 ? "Identificação" : step === 2 ? "Perfil do negócio" : "Plano"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Como sua empresa é identificada oficialmente."
              : step === 2
                ? "Isso ajusta categorias e indicadores sugeridos."
                : "Escolha o plano — pode ser alterado a qualquer momento."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="legal">Razão social *</Label>
                <Input
                  id="legal"
                  value={form.legal_name}
                  onChange={(e) => set({ legal_name: e.target.value })}
                  placeholder="Alpha Serviços Ltda."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trade">Nome fantasia</Label>
                  <Input
                    id="trade"
                    value={form.trade_name}
                    onChange={(e) => set({ trade_name: e.target.value })}
                    placeholder="Alpha"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax">CNPJ</Label>
                  <Input
                    id="tax"
                    value={form.tax_id}
                    onChange={(e) => set({ tax_id: e.target.value })}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="segment">Segmento</Label>
                <Input
                  id="segment"
                  value={form.segment}
                  onChange={(e) => set({ segment: e.target.value })}
                  placeholder="Serviços, varejo, tecnologia..."
                />
              </div>
              <div className="space-y-2">
                <Label>Número de colaboradores</Label>
                <Select value={form.headcount} onValueChange={(v) => set({ headcount: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>País</Label>
                <Select value={form.country} onValueChange={(v) => set({ country: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BR">Brasil</SelectItem>
                    <SelectItem value="PT">Portugal</SelectItem>
                    <SelectItem value="US">Estados Unidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={form.currency} onValueChange={(v) => set({ currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">Real (BRL)</SelectItem>
                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {ws.plans.map((plan) => {
                  const active = form.plan_code === plan.code;
                  const price =
                    form.billing_cycle === "yearly" ? Number(plan.price_yearly) : Number(plan.price_monthly);
                  return (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => set({ plan_code: plan.code as PlanCode })}
                      className={cn(
                        "rounded-xl border border-border/60 bg-surface-2/40 p-4 text-left transition-all hover:border-primary/60",
                        active && "border-primary bg-primary/10 ring-1 ring-primary/40",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{plan.name}</p>
                        {active && <Badge className="text-[10px]">Selecionado</Badge>}
                      </div>
                      <p className="numeric mt-1 text-lg font-semibold">
                        {price === 0 ? "Sob consulta" : BRL(price)}
                        {price > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">
                            /{form.billing_cycle === "yearly" ? "ano" : "mês"}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.audience}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                {(["monthly", "yearly"] as const).map((cycle) => (
                  <Button
                    key={cycle}
                    type="button"
                    variant={form.billing_cycle === cycle ? "default" : "outline"}
                    size="sm"
                    onClick={() => set({ billing_cycle: cycle })}
                  >
                    {cycle === "monthly" ? "Mensal" : "Anual"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? navigate({ to: "/dashboard" }) : setStep(step - 1))}
            >
              {step === 1 ? "Cancelar" : "Voltar"}
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 1 && form.legal_name.trim().length < 2}>
                Continuar
              </Button>
            ) : (
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Building2 className="size-4" />
                )}
                Criar empresa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/60 bg-transparent">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-medium">Só quer explorar?</p>
            <p className="text-sm text-muted-foreground">
              Abra a empresa de demonstração com 12 meses de dados financeiros reais simulados.
            </p>
          </div>
          <Button variant="outline" onClick={() => demoMutation.mutate()} disabled={demoMutation.isPending}>
            {demoMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Entrar na demonstração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}