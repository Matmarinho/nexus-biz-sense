## Visão geral

Vou construir a **Fase 1: Fundação + Financeiro** — a base sobre a qual todos os módulos seguintes (contratos, CRM, projetos, IA, i18n) serão encaixados sem retrabalho. O que for entregue já será funcional de ponta a ponta, com dados reais gravados no banco, isolamento por empresa garantido no próprio banco, e uma empresa de demonstração separada para os gráficos nascerem preenchidos.

Não vou implementar nesta fase: Open Finance, emissão fiscal real, assinatura digital, CRM, projetos/timesheet, IA generativa e cobrança real por cartão. Esses entram nas fases seguintes.

## O que você vai poder fazer ao final desta fase

1. Entrar pela tela de login premium (escura, vidro fosco, com Google ou e-mail/senha).
2. Criar sua empresa em um onboarding guiado (dados, segmento, plano recomendado).
3. Alternar entre várias empresas por um seletor no topo, com logo e cor próprias de cada uma.
4. Convidar pessoas e definir o que cada uma vê e faz, por módulo e por ação.
5. Cadastrar contas bancárias, clientes, fornecedores, categorias e centros de custo.
6. Lançar contas a pagar e a receber, marcar como pagas, registrar recorrências e transferências.
7. Ver a **Visão Executiva** com Índice de Saúde Empresarial, cards comparativos e alertas.
8. Ver a **Visão Financeira** com fluxo de caixa, receita x despesa, despesas por categoria, inadimplência, mapa de calor e projeção de 30/60/90 dias.
9. Ativar o **Modo Privacidade** (Shift + P) para ocultar valores em reuniões.
10. Usar a **Command Bar** (Ctrl/Cmd + K) para navegar e executar ações rápidas.
11. Entrar no **Painel Supremo** (superadmin) e administrar todos os tenants, planos e usuários.

## Sua conta suprema

- Sua conta será criada com o e-mail **biritoques@gmail.com** e papel `superadmin`.
- A senha **não fica no código**: no primeiro acesso você recebe o link de definição de senha e escolhe a sua. Você pode alterar e-mail e senha depois em Configurações da Conta.
- O papel é concedido por regra no banco, ligada ao e-mail verificado — nunca por um campo editável no perfil, para impedir escalonamento de privilégios.
- Como superadmin você tem acesso total: ver todos os tenants, entrar em qualquer workspace, conceder/revogar papéis, suspender empresas, mudar planos e limites de qualquer conta.

## Design

- **Modo escuro (padrão):** fundo preto/grafite, superfícies em vidro fosco, destaque em roxo, tipografia clara esbranquiçada.
- **Modo claro:** superfícies claras, mesmo roxo de destaque, contraste acessível.
- **Valores:** positivos com sinal `+` em verde; negativos com sinal `-` em vermelho. Nunca só cor — sempre sinal e ícone junto, por acessibilidade.
- Cantos arredondados, sombras discretas, animações curtas, espaçamento generoso.
- Cada empresa pode ter logo e cor de destaque próprios, aplicados ao trocar de workspace.

## Detalhes técnicos

**Stack:** o projeto roda em TanStack Start (React + TypeScript + Vite), não Next.js. Toda a lógica de servidor usa server functions do próprio TanStack. Estilização com Tailwind + shadcn/ui, gráficos com Recharts, animações com Motion.

**Backend:** Lovable Cloud (PostgreSQL gerenciado, autenticação, storage e funções de servidor). Nada de credenciais no front-end.

**Tabelas da Fase 1** (todas com `id` uuid, `tenant_id`, `created_at`, `updated_at`, `created_by`):
`profiles`, `user_roles` (papel global, tabela separada), `tenants`, `tenant_users` (papel + permissões personalizadas em JSONB), `tenant_invites`, `tenant_branding`, `plans`, `subscriptions`, `usage_counters`, `bank_accounts`, `financial_categories`, `cost_centers`, `customers_vendors`, `financial_transactions`, `recurring_rules`, `transfers`, `alerts`, `notifications`, `audit_logs`, `dashboard_layouts`, `user_preferences`, `consents`.

**Isolamento (RLS):** toda tabela operacional com Row Level Security ativa e políticas que exigem que o `tenant_id` da linha pertença a um workspace do usuário autenticado, via função `security definer` (`is_tenant_member`, `has_tenant_permission`, `has_role`). Grants explícitos por tabela. Uma falha no front-end não expõe dados de outra empresa.

**Permissões:** matriz módulo × ação (`view`, `create`, `edit`, `delete`, `approve`, `export`, `manage_users`, `manage_settings`), com papéis pré-definidos (Admin, Gestor, Financeiro, Funcionário, Contador, Cliente, Visualizador) e overrides por usuário. Verificação no servidor e no banco, nunca só na tela.

**Auditoria:** toda criação, alteração e exclusão em tabelas sensíveis grava em `audit_logs` com usuário, IP, ação e diff.

**Planos:** os quatro planos (Startup R$ 91,23/mês, Pro Scale R$ 255,23/mês com selo "Mais Popular", Enterprise R$ 613,98/mês, Holding sob consulta) ficam cadastrados no banco com seus limites. Os limites (workspaces, usuários, documentos, leituras de IA) são checados no servidor. Nesta fase a seleção de plano é registrada e o checkout real fica como próximo passo — te consulto sobre o provedor de pagamento antes.

**Dados de demonstração:** um tenant `Demo — Alpha Serviços` marcado com `is_demo = true`, semeado por migração com 12 meses de movimentação fictícia. Aparece rotulado como demonstração e pode ser removido com um clique, sem tocar nos dados reais.

**Cálculo do Índice de Saúde:** score 0–100 ponderado por liquidez, fluxo de caixa projetado, crescimento de receita, evolução de despesas, inadimplência e contas vencidas — com a composição sempre exibida e o aviso de que é informativo e não substitui orientação contábil.

## Fases seguintes (para alinharmos depois)

- **Fase 2:** contratos (CLM) com reajuste por IPCA/IGP-M, alertas de vencimento e Visão Contratual.
- **Fase 3:** CRM, projetos, Kanban, timesheet e faturamento por horas.
- **Fase 4:** IA (OCR de comprovantes, relatórios em linguagem natural, assistente de onboarding), Open Finance e documentos fiscais.
- **Fase 5:** internacionalização (pt/en/es), multimoeda, API pública documentada e integrações.

## Perguntas que ainda vou te fazer no caminho

- Qual provedor de pagamento usar para as assinaturas (avalio e recomendo antes).
- Se quer o gate por plano bloqueando módulos já na Fase 1 ou apenas sinalizando.

Se aprovar, começo pela fundação (banco, RLS, autenticação, login, onboarding, workspaces, permissões, painel supremo) e sigo direto para o financeiro e a Central de Inteligência.