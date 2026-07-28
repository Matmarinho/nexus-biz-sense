import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronsUpDown,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Sun,
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

const NAV = [
  { to: "/dashboard", label: "Visão executiva", icon: LayoutDashboard, module: "dashboard" as const },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, module: "finance" as const },
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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-surface/60 px-3 py-4 lg:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Nexus ERP</p>
            <p className="text-[11px] text-muted-foreground">Gestão inteligente</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((item) => ws.can(item.module, "view")).map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-accent text-foreground shadow-[inset_2px_0_0_0_var(--color-primary)]",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
            >
              <Shield className="size-4" />
              Console supremo
            </Link>
          )}
        </nav>

        <div className="rounded-xl border border-border/60 bg-surface-2/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Modo privacidade</p>
          <p className="mt-1">Pressione Shift + P para ocultar valores.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
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