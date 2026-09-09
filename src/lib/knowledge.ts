import {
  BarChart3, Boxes, Brain, Building2, Clock, Code2, Compass, FileSignature,
  Shield, Sparkles, Target, TrendingUp, Users, Wallet, Workflow,
} from "lucide-react";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "tip"; text: string }
  | { type: "code"; text: string };

export type Article = {
  slug: string;
  title: string;
  desc: string;
  cat: string;
  minutes: number;
  level: "Essencial" | "Intermediário" | "Avançado";
  icon: React.ElementType;
  body: ArticleBlock[];
};

export const KNOWLEDGE_CATEGORIES = [
  { id: "todos", label: "Todos", icon: Compass },
  { id: "primeiros-passos", label: "Primeiros passos", icon: Sparkles },
  { id: "financeiro", label: "Gestão Financeira", icon: Wallet },
  { id: "comercial", label: "Comercial e CRM", icon: Target },
  { id: "estoque", label: "Estoque e Compras", icon: Boxes },
  { id: "bi", label: "BI e Indicadores", icon: BarChart3 },
  { id: "seguranca", label: "Segurança e acessos", icon: Shield },
  { id: "api", label: "API e integrações", icon: Code2 },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  KNOWLEDGE_CATEGORIES.map((c) => [c.id, c.label]),
);

export const ARTICLES: Article[] = [
  {
    slug: "criar-empresa-e-convidar-time",
    title: "Como criar sua empresa e convidar o time",
    desc: "Do primeiro login ao workspace configurado com papéis e permissões por módulo.",
    cat: "primeiros-passos", minutes: 4, level: "Essencial", icon: Building2,
    body: [
      { type: "p", text: "Toda a plataforma gira em torno da empresa (workspace). Cada empresa tem dados totalmente isolados: lançamentos, clientes, produtos, pedidos e relatórios nunca cruzam de uma para outra." },
      { type: "h", text: "Criando a primeira empresa" },
      { type: "steps", items: [
        "Faça login e o assistente de abertura aparece automaticamente.",
        "Informe razão social, nome fantasia, documento fiscal e segmento.",
        "Escolha a moeda padrão — ela define a formatação em todos os módulos.",
        "Confirme: você já entra como administrador com acesso total.",
      ]},
      { type: "h", text: "Convidando pessoas" },
      { type: "p", text: "Em Usuários e permissões você adiciona quem vai trabalhar com você. Cada convite carrega um papel, e o papel define o que a pessoa vê e faz." },
      { type: "list", items: [
        "Administrador — controle total da empresa, inclusive convites e configurações.",
        "Gerente — opera todos os módulos, sem gerenciar usuários.",
        "Financeiro — financeiro, relatórios e cadastros de clientes/fornecedores.",
        "Contador — apenas visualização e exportação.",
        "Colaborador — visualiza painel, projetos e cadastros.",
        "Visualizador — somente leitura.",
      ]},
      { type: "tip", text: "Precisa de algo fora do papel padrão? Use a matriz de permissões para liberar ou bloquear ação por ação, módulo a módulo." },
    ],
  },
  {
    slug: "tour-dashboard-executivo",
    title: "Tour guiado pelo Dashboard Executivo",
    desc: "Entenda o Índice de Saúde do Negócio, tendências e alertas inteligentes.",
    cat: "primeiros-passos", minutes: 6, level: "Essencial", icon: TrendingUp,
    body: [
      { type: "p", text: "O painel responde três perguntas em segundos: quanto entrou, quanto saiu e para onde o caixa está indo." },
      { type: "h", text: "Saldos por conta" },
      { type: "p", text: "Cada conta bancária cadastrada aparece com saldo atual, entradas e saídas do mês. Apenas lançamentos liquidados entram nesses números — títulos em aberto ficam separados em 'A receber' e 'A pagar'." },
      { type: "h", text: "Cofre e investimentos" },
      { type: "p", text: "O bloco Cofre soma o que está aplicado e projeta o rendimento usando o CDI atualizado automaticamente pelo Banco Central, ponderado pelo percentual do CDI de cada aplicação." },
      { type: "h", text: "Índice de Saúde do Negócio" },
      { type: "list", items: [
        "Liquidez — caixa disponível frente aos compromissos do período.",
        "Margem — resultado sobre a receita realizada.",
        "Inadimplência — peso dos títulos vencidos em aberto.",
        "Tendência — direção dos últimos meses de resultado.",
      ]},
      { type: "tip", text: "Use os seletores de conta, mês e janela de gráficos para recortar tudo: uma conta específica, o consolidado geral ou uma janela de 6, 12 ou 24 meses." },
    ],
  },
  {
    slug: "lancamentos-modo-planilha",
    title: "Lançamentos financeiros no modo planilha",
    desc: "Edição inline, filtros por situação e atalhos que aceleram o dia a dia.",
    cat: "financeiro", minutes: 7, level: "Intermediário", icon: Wallet,
    body: [
      { type: "p", text: "O modo planilha mostra os lançamentos em grade densa, com edição direto na célula — sem abrir formulário para cada ajuste." },
      { type: "h", text: "Editando" },
      { type: "steps", items: [
        "Clique na célula (descrição, valor, vencimento, situação).",
        "Digite o novo conteúdo e pressione Enter para salvar.",
        "Esc cancela a edição sem gravar.",
        "Em séries parceladas, escolha se a alteração vale só para a parcela ou para toda a série.",
      ]},
      { type: "h", text: "Filtros rápidos" },
      { type: "p", text: "Ao abrir Gestão Financeira você escolhe entre Financeiro e Faturamento. No Financeiro, os blocos Despesas, Pagos, À pagar, Vencidos e Receitas filtram a grade instantaneamente." },
      { type: "tip", text: "Dar baixa é o que move o saldo: enquanto o lançamento estiver pendente ele aparece em 'A pagar'/'A receber' e não afeta entradas e saídas do mês." },
    ],
  },
  {
    slug: "parcelamentos-e-recorrencias",
    title: "Parcelamentos e recorrências",
    desc: "Repita lançamentos por semana, mês, trimestre ou ano e gerencie a série inteira.",
    cat: "financeiro", minutes: 5, level: "Intermediário", icon: Clock,
    body: [
      { type: "p", text: "Um contrato de 12 meses não precisa de 12 lançamentos manuais. Informe o valor e a quantidade de parcelas que a plataforma gera a série completa." },
      { type: "h", text: "Total ou por parcela" },
      { type: "list", items: [
        "Valor total — dividido entre as parcelas, com o arredondamento ajustado na última.",
        "Valor por parcela — cada parcela recebe exatamente o valor informado.",
      ]},
      { type: "h", text: "Frequências" },
      { type: "list", items: ["Semanal", "Quinzenal", "Mensal", "Trimestral", "Anual"] },
      { type: "tip", text: "Cada parcela recebe a numeração (3/12) e todas ficam ligadas pela mesma série, então dá para editar ou excluir tudo de uma vez." },
    ],
  },
  {
    slug: "open-finance-bancos-e-score",
    title: "Open Finance: conectar bancos e ler o score",
    desc: "Saldo, limite de cartão, rendimentos e percentual do CDI em um só painel.",
    cat: "financeiro", minutes: 8, level: "Avançado", icon: Sparkles,
    body: [
      { type: "p", text: "A aba Bancos concentra a fotografia financeira: cada conta traz saldo atual, limite de cartão usado e disponível, valor aplicado e o percentual do CDI da aplicação." },
      { type: "h", text: "Cadastrando uma conta" },
      { type: "steps", items: [
        "Abra Gestão Financeira e vá até Bancos.",
        "Clique em Nova conta e informe nome, instituição e tipo.",
        "Preencha o saldo de abertura — é o ponto de partida do cálculo.",
        "Se houver cartão, informe limite total e valor já usado.",
        "Se houver aplicação, informe o valor investido e o percentual do CDI.",
      ]},
      { type: "h", text: "Score de crédito" },
      { type: "p", text: "O score fica no cartão da conta e serve de referência rápida para negociação de limites e taxas." },
      { type: "tip", text: "O rendimento é recalculado sozinho: a taxa CDI é atualizada diariamente a partir da série oficial do Banco Central." },
    ],
  },
  {
    slug: "pipeline-de-vendas",
    title: "Pipeline de vendas que fecha negócio",
    desc: "Kanban de oportunidades, previsão ponderada e atividades por responsável.",
    cat: "comercial", minutes: 6, level: "Intermediário", icon: Target,
    body: [
      { type: "p", text: "O CRM organiza oportunidades em colunas por etapa. Arraste o cartão para avançar e a previsão ponderada se recalcula na hora." },
      { type: "h", text: "Previsão ponderada" },
      { type: "p", text: "Cada etapa tem uma probabilidade. A previsão é a soma dos valores multiplicados pela probabilidade da etapa em que cada negócio está." },
      { type: "list", items: [
        "Negócios abertos — em disputa, entram na previsão.",
        "Ganhos — encerrados com sucesso, viram base da taxa de conversão.",
        "Perdidos — encerrados sem venda, saem da previsão e ficam no histórico.",
      ]},
      { type: "tip", text: "Um negócio marcado como ganho dispara automaticamente o evento deal.won para os webhooks configurados." },
    ],
  },
  {
    slug: "cadastros-da-operacao",
    title: "Cadastros que sustentam a operação",
    desc: "Clientes, fornecedores, produtos e categorias sem duplicidade.",
    cat: "comercial", minutes: 4, level: "Essencial", icon: Users,
    body: [
      { type: "p", text: "Relatório bom depende de cadastro limpo. Clientes e fornecedores vivem na mesma base, diferenciados pelo tipo — e quem é os dois marca 'ambos'." },
      { type: "list", items: [
        "Clientes e fornecedores — nome, documento, contato e observações.",
        "Produtos — código, unidade, preço de custo e venda, estoque mínimo.",
        "Categorias — separam receitas de despesas nos gráficos.",
        "Centros de custo — rateiam despesas por área ou projeto.",
      ]},
      { type: "tip", text: "Dentro do formulário de lançamento existe um botão + em cada campo: dá para criar categoria, cliente ou conta sem sair da tela." },
    ],
  },
  {
    slug: "controle-de-estoque",
    title: "Controle de estoque com movimentações",
    desc: "Entradas, saídas e ajustes atualizando saldo automaticamente.",
    cat: "estoque", minutes: 5, level: "Intermediário", icon: Boxes,
    body: [
      { type: "p", text: "O saldo do produto nunca é digitado à mão: ele é resultado das movimentações registradas." },
      { type: "list", items: [
        "Entrada — compra, devolução ou produção.",
        "Saída — venda, perda ou consumo interno.",
        "Ajuste — correção após inventário.",
      ]},
      { type: "p", text: "Ao registrar a movimentação, o saldo do produto é recalculado na mesma hora pelo banco de dados, sem depender da tela aberta." },
      { type: "tip", text: "Defina o estoque mínimo: quando o saldo cai abaixo dele, o evento stock.low é disparado para suas integrações." },
    ],
  },
  {
    slug: "ciclo-de-compras",
    title: "Ciclo de compras: da requisição ao recebimento",
    desc: "Pedidos, itens, custos e impacto direto no fluxo de caixa.",
    cat: "estoque", minutes: 6, level: "Intermediário", icon: Workflow,
    body: [
      { type: "p", text: "Pedidos de compra e de venda usam a mesma estrutura: cabeçalho com fornecedor/cliente e datas, e uma lista de itens." },
      { type: "h", text: "Itens do pedido" },
      { type: "steps", items: [
        "Adicione o item escolhendo um produto — descrição e preço vêm preenchidos.",
        "Ajuste quantidade e preço unitário se necessário.",
        "Repita para os demais itens; o total é somado automaticamente.",
        "Informe desconto e frete: o total final é itens − desconto + frete.",
      ]},
      { type: "tip", text: "Ao marcar o pedido como faturado, o evento order.invoiced é disparado para as integrações ativas." },
    ],
  },
  {
    slug: "indicadores-executivos",
    title: "Construindo indicadores executivos",
    desc: "Como o BI calcula liquidez, inadimplência e projeções de caixa.",
    cat: "bi", minutes: 9, level: "Avançado", icon: BarChart3,
    body: [
      { type: "p", text: "Os indicadores partem sempre dos lançamentos liquidados, com data efetiva igual à data de pagamento." },
      { type: "h", text: "Projeção de caixa" },
      { type: "p", text: "A projeção combina duas fontes: a média móvel dos meses realizados e os títulos já agendados para o futuro. O resultado é a linha pontilhada nos gráficos." },
      { type: "h", text: "Exportação" },
      { type: "p", text: "Todo card e tabela do painel pode ser exportado em CSV para planilha ou em PDF para apresentação, respeitando a conta e o mês selecionados." },
      { type: "tip", text: "O Modo Privacidade (Shift + P) borra todos os valores na tela — útil em reunião com a tela compartilhada." },
    ],
  },
  {
    slug: "copiloto-de-ia",
    title: "Copiloto de IA aplicado à gestão",
    desc: "Perguntas em linguagem natural sobre seus próprios números.",
    cat: "bi", minutes: 5, level: "Avançado", icon: Brain,
    body: [
      { type: "p", text: "O copiloto interpreta os indicadores calculados e devolve leitura executiva: onde o caixa está apertando, qual categoria cresceu e o que exige atenção no mês." },
      { type: "list", items: [
        "Resumo executivo do mês em linguagem simples.",
        "Destaque das categorias com maior variação.",
        "Alerta de concentração de vencimentos.",
      ]},
      { type: "tip", text: "O copiloto lê apenas os dados da empresa ativa, respeitando as mesmas permissões do seu usuário." },
    ],
  },
  {
    slug: "mfa-e-politica-de-senhas",
    title: "MFA obrigatório e política de senhas",
    desc: "Ative segundo fator por empresa e bloqueie senhas vazadas.",
    cat: "seguranca", minutes: 4, level: "Essencial", icon: Shield,
    body: [
      { type: "p", text: "A segurança tem duas camadas: a conta de cada pessoa e a política da empresa." },
      { type: "h", text: "Segundo fator (TOTP)" },
      { type: "steps", items: [
        "Vá em Configurações › Segurança.",
        "Clique em ativar dois fatores e leia o QR Code no aplicativo autenticador.",
        "Digite o código de 6 dígitos para confirmar.",
      ]},
      { type: "h", text: "Exigir para toda a empresa" },
      { type: "p", text: "Administradores podem exigir o segundo fator de todos os membros. Quem ainda não cadastrou é levado à tela de ativação antes de acessar o workspace." },
      { type: "tip", text: "Senhas que já apareceram em vazamentos públicos são recusadas no cadastro e na troca de senha." },
    ],
  },
  {
    slug: "trilha-de-auditoria",
    title: "Trilha de auditoria e logs do sistema",
    desc: "Quem fez o quê, quando e de onde — com exportação CSV/PDF.",
    cat: "seguranca", minutes: 5, level: "Avançado", icon: FileSignature,
    body: [
      { type: "p", text: "Cada criação, alteração e exclusão relevante é registrada com usuário, ação, entidade, data e endereço de origem." },
      { type: "list", items: [
        "A trilha da empresa fica em Auditoria e logs.",
        "A visão global de todas as empresas fica no Console supremo.",
        "Os registros não podem ser editados nem apagados pela interface.",
      ]},
      { type: "tip", text: "Exporte em CSV para análise em planilha ou em PDF quando precisar anexar a um processo." },
    ],
  },
  {
    slug: "primeiros-endpoints-da-api",
    title: "Autenticação e primeiros endpoints da API",
    desc: "Chaves, escopos e chamadas REST autenticadas por empresa.",
    cat: "api", minutes: 7, level: "Avançado", icon: Code2,
    body: [
      { type: "p", text: "A API é autenticada por chave, e cada chave pertence a uma empresa. Tudo que ela enxerga é o dado daquela empresa." },
      { type: "h", text: "Gerando a chave" },
      { type: "steps", items: [
        "Abra Integrações API.",
        "Crie uma chave com nome e escopos (leitura e/ou escrita).",
        "Copie o valor mostrado uma única vez — ele não é exibido de novo.",
      ]},
      { type: "h", text: "Fazendo a primeira chamada" },
      { type: "code", text: `curl -H "Authorization: Bearer SUA_CHAVE" \\\n  https://seu-dominio/api/public/v1/transactions?status=pending` },
      { type: "h", text: "Endpoints disponíveis" },
      { type: "list", items: [
        "GET /api/public/v1/transactions — lista lançamentos (filtros: status, direction, from, to, limit).",
        "POST /api/public/v1/transactions — cria um lançamento (exige escopo de escrita).",
        "GET /api/public/v1/products — catálogo com saldo de estoque.",
        "GET /api/public/v1/orders — pedidos de venda e compra com itens.",
      ]},
      { type: "tip", text: "Revogar uma chave é imediato: a partir do clique, qualquer chamada com ela recebe 401." },
    ],
  },
  {
    slug: "webhooks-e-automacoes",
    title: "Webhooks e automações sem código",
    desc: "Dispare fluxos quando um lançamento vence ou um negócio é ganho.",
    cat: "api", minutes: 6, level: "Intermediário", icon: Workflow,
    body: [
      { type: "p", text: "Webhook é o caminho inverso da API: em vez de você perguntar, a plataforma avisa quando algo acontece." },
      { type: "h", text: "Eventos disponíveis" },
      { type: "list", items: [
        "transaction.created — lançamento criado.",
        "transaction.paid — lançamento liquidado.",
        "transaction.overdue — lançamento venceu sem baixa.",
        "deal.won — negócio ganho no CRM.",
        "stock.low — produto abaixo do estoque mínimo.",
        "order.invoiced — pedido faturado.",
      ]},
      { type: "h", text: "Validando a assinatura" },
      { type: "p", text: "Cada envio traz os cabeçalhos x-nexus-timestamp e x-nexus-signature. A assinatura é um HMAC-SHA256 do texto \"timestamp.corpo\" usando o segredo do seu webhook." },
      { type: "code", text: `const base = \`\${timestamp}.\${rawBody}\`;\nconst esperado = hmacSha256Hex(segredo, base);\nif (esperado !== assinatura.replace("sha256=", "")) rejeitar();` },
      { type: "h", text: "Reentregas" },
      { type: "p", text: "Se o seu servidor não responder com sucesso, a plataforma tenta de novo em 1, 5, 15, 60 e 240 minutos. Todas as tentativas ficam registradas no histórico de entregas." },
      { type: "tip", text: "Use o botão de teste para receber um evento de exemplo e conferir a validação da assinatura antes de ir para produção." },
    ],
  },
];

export const findArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug) ?? null;

export const relatedArticles = (article: Article, count = 3) =>
  ARTICLES.filter((a) => a.slug !== article.slug && a.cat === article.cat)
    .concat(ARTICLES.filter((a) => a.slug !== article.slug && a.cat !== article.cat))
    .slice(0, count);
