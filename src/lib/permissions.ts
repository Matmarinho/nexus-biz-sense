import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const MODULES = [
  "dashboard",
  "finance",
  "parties",
  "reports",
  "contracts",
  "projects",
  "crm",
  "settings",
  "users",
] as const;
export type ModuleKey = (typeof MODULES)[number];

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "manage_users",
] as const;
export type ActionKey = (typeof ACTIONS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Painéis",
  finance: "Financeiro",
  parties: "Clientes e fornecedores",
  reports: "Relatórios",
  contracts: "Contratos",
  projects: "Projetos",
  crm: "Comercial",
  settings: "Configurações",
  users: "Usuários",
};

export const ACTION_LABELS: Record<ActionKey, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  approve: "Aprovar",
  export: "Exportar",
  manage_users: "Gerenciar usuários",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador da empresa",
  manager: "Gestor",
  finance: "Financeiro",
  employee: "Funcionário",
  accountant: "Contador externo",
  client: "Cliente",
  viewer: "Visualizador",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  superadmin: "Acesso total à plataforma e a todas as empresas.",
  admin: "Controle total desta empresa, incluindo usuários e configurações.",
  manager: "Opera todos os módulos, exceto a gestão de usuários.",
  finance: "Financeiro, clientes/fornecedores, relatórios e painéis.",
  employee: "Consulta painéis, projetos e cadastros básicos.",
  accountant: "Somente leitura e exportação dos dados autorizados.",
  client: "Acesso restrito ao painel compartilhado.",
  viewer: "Somente leitura.",
};

export type CustomPermissions = Partial<Record<ModuleKey, Partial<Record<ActionKey, boolean>>>>;

/** Espelha public.has_tenant_permission no banco. A decisão final é sempre do servidor. */
export function checkPermission(
  role: AppRole | null | undefined,
  overrides: CustomPermissions | null | undefined,
  module: ModuleKey,
  action: ActionKey,
): boolean {
  if (!role) return false;
  if (role === "superadmin" || role === "admin") return true;

  const ov = overrides?.[module]?.[action];
  if (typeof ov === "boolean") return ov;

  switch (role) {
    case "manager":
      return action !== "manage_users";
    case "finance":
      return ["finance", "reports", "parties", "dashboard"].includes(module);
    case "accountant":
      return action === "view" || action === "export";
    case "employee":
      return action === "view" && ["dashboard", "projects", "parties"].includes(module);
    case "client":
      return action === "view" && module === "dashboard";
    case "viewer":
      return action === "view";
    default:
      return false;
  }
}