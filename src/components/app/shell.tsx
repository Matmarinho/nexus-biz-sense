import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  Building2,
  Cable,
  FileBarChart,
  ScrollText,
  ShoppingCart,
  ReceiptText,
  ArrowLeftRight,
  Coins,
  CalendarDays,
  ChevronsUpDown,
  Crown,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Moon,
  FolderKanban,
  FolderOpen,
  Package,
  PanelLeft,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Tags,
  Target,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import { useTheme } from "./theme-provider";
import { useWorkspace } from "./workspace";

const NAV_GROUPS = [
  {
    label: "Visão geral",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" as const }],
  },
  {
    label: "Cadastros",
    items: [
      { to: "/clientes", label: "Clientes", icon: Users, module: "parties" as const },
      { to: "/fornecedores", label: "Fornecedores", icon: Truck, module: "parties" as const },
      { to: "/produtos", label: "Produtos", icon: Package, module: "parties" as const },
      { to: "/categorias", label: "Categorias", icon: Tags, module: "parties" as const },
    ],
  },
  {
    label: "Operações",
    items: [
      { to: "/estoque", label: "Estoque", icon: Boxes, module: "parties" as const },
      { to: "/crm", label: "Gestão Comercial", icon: Target, module: "crm" as const },
      { to: "/projetos", label: "Projetos", icon: FolderKanban, module: "projects" as const },
      { to: "/vendas", label: "Vendas", icon: ShoppingCart, module: "crm" as const },
      { to: "/compras", label: "Compras", icon: ReceiptText, module: "parties" as const },
      { to: "/agenda", label: "Agenda", icon: CalendarDays, module: "dashboard" as const },
      { to: "/arquivos", label: "Arquivos", icon: FolderOpen, module: "dashboard" as const },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/financeiro", label: "Gestão Financeira", icon: Wallet, module: "finance" as const },
      { to: "/contas-pagar", label: "Contas a pagar", icon: Coins, module: "finance" as const },
      { to: "/contas-receber", label: "Contas a receber", icon: ArrowLeftRight, module: "finance" as const },
      { to: "/fluxo-caixa", label: "Fluxo de caixa", icon: BarChart3, module: "finance" as const },
      { to: "/relatorios", label: "Relatórios", icon: FileBarChart, module: "reports" as const },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/usuarios", label: "Usuários e permissões", icon: ShieldCheck, module: "users" as const },
      { to: "/auditoria", label: "Auditoria e logs", icon: ScrollText, module: "settings" as const },
      { to: "/integracoes", label: "Integrações API", icon: Cable, module: "settings" as const },
      { to: "/configuracoes", label: "Configurações", icon: Settings, module: "settings" as const },
    ],
  },
];

function initials(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.split("@")[0] || "U";
  return base
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, resolved, setTheme, privacy, togglePrivacy } = useTheme();
  const ws = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);

  const tenants = [
    ...ws.memberships.map((m) => ({ id: m.tenant_id, tenant: m.tenants, role: m.role })),
    ...ws.allTenants
      .filter((t) => !ws.memberships.some((m) => m.tenant_id === t.id))
      .map((t) => ({ id: t.id, tenant: t, role: "superadmin" as const })),
  ];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-surface/60 px-3 py-4 transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div className={cn("leading-tight", collapsed && "hidden")}>
            <p className="font-display text-sm font-semibold">Nexus ERP</p>
            <p className="text-[11px] text-muted-foreground">Gestão empresarial</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-4">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => ws.can(item.module, "view"));
            if (!items.length) return null;
            return (
              <div key={group.label} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </p>
                )}
                {items.map((item) => {
                  const active = pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        collapsed && "justify-center px-2",
                        active && "bg-accent text-foreground shadow-[inset_2px_0_0_0_var(--color-primary)]",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed && item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
          {ws.isSuperadmin && (
            <Link
              to="/console"
              title="Console supremo"
              className={cn(
                "mt-2 flex items-center gap-3 rounded-lg border border-primary/30 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10",
                collapsed && "justify-center px-2",
                pathname.startsWith("/console") && "bg-primary/10",
              )}
            >
              <Crown className="size-4 shrink-0" />
              {!collapsed && "Console supremo"}
            </Link>
          )}
        </nav>

        {!collapsed && (
          <div className="mt-4 rounded-xl border border-border/60 bg-surface-2/60 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Modo privacidade</p>
            <p className="mt-1">Pressione Shift + P para ocultar valores.</p>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            title="Recolher menu"
            onClick={() => setCollapsed((v) => !v)}
          >
            <PanelLeft className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="max-w-[16rem] justify-between gap-2">
                <span className="truncate">
                  {ws.tenant?.trade_name ?? ws.tenant?.legal_name ?? "Selecionar empresa"}
                </span>
                <ChevronsUpDown className="size-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Empresas</DropdownMenuLabel>
              {tenants.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => ws.setTenantId(t.id)} className="gap-2">
                  <span className="truncate">{t.tenant?.trade_name ?? t.tenant?.legal_name ?? t.id}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {ROLE_LABELS[t.role]}
                  </Badge>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/onboarding" })}>
                <Plus className="size-4" /> Nova empresa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={togglePrivacy} title="Modo privacidade (Shift + P)">
              {privacy ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Alternar tema"
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            >
              {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarImage src={ws.profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-[11px]">
                      {initials(ws.profile?.full_name, ws.profile?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[10rem] truncate text-sm sm:block">
                    {ws.profile?.full_name ?? ws.profile?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-1">
                  <p className="truncate text-sm">{ws.profile?.email}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {ws.role ? ROLE_LABELS[ws.role] : "Sem empresa"}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setTheme(theme === "system" ? "dark" : "system")}>
                  <Moon className="size-4" /> Tema: {theme === "system" ? "sistema" : theme}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-negative">
                  <LogOut className="size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}