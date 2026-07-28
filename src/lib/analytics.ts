export type Txn = {
  id: string;
  direction: "income" | "expense" | string;
  status: "pending" | "paid" | "canceled" | string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  description: string;
  category_id: string | null;
  party_id: string | null;
  bank_account_id: string | null;
  cost_center_id: string | null;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthKey = (iso: string) => iso.slice(0, 7);

export function lastMonths(n: number, from = new Date()) {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const isPaid = (t: Txn) => t.status === "paid";
const effDate = (t: Txn) => t.payment_date ?? t.due_date;

export type MonthPoint = {
  month: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
};

export function monthlySeries(txns: Txn[], months: string[]): MonthPoint[] {
  const map = new Map(months.map((m) => [m, { income: 0, expense: 0 }]));
  for (const t of txns) {
    if (!isPaid(t)) continue;
    const k = monthKey(effDate(t));
    const bucket = map.get(k);
    if (!bucket) continue;
    if (t.direction === "income") bucket.income += Number(t.amount);
    else bucket.expense += Number(t.amount);
  }
  let cumulative = 0;
  return months.map((m) => {
    const b = map.get(m)!;
    const net = b.income - b.expense;
    cumulative += net;
    return { month: m, income: b.income, expense: b.expense, net, cumulative };
  });
}

export type Kpis = {
  income: number;
  expense: number;
  net: number;
  margin: number | null;
  incomeDelta: number | null;
  expenseDelta: number | null;
  netDelta: number | null;
  receivable: number;
  payable: number;
  overdueIn: number;
  overdueOut: number;
  balance: number;
  runwayMonths: number | null;
  burn: number;
};

const delta = (cur: number, prev: number) =>
  prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / Math.abs(prev)) * 100;

export function computeKpis(txns: Txn[], openingBalance: number, months: string[]): Kpis {
  const series = monthlySeries(txns, months);
  const cur = series[series.length - 1] ?? { income: 0, expense: 0, net: 0 };
  const prev = series[series.length - 2] ?? { income: 0, expense: 0, net: 0 };
  const today = todayISO();

  let receivable = 0;
  let payable = 0;
  let overdueIn = 0;
  let overdueOut = 0;
  let paidNetAll = 0;

  for (const t of txns) {
    const amount = Number(t.amount);
    if (t.status === "canceled") continue;
    if (isPaid(t)) {
      paidNetAll += t.direction === "income" ? amount : -amount;
      continue;
    }
    if (t.direction === "income") {
      receivable += amount;
      if (t.due_date < today) overdueIn += amount;
    } else {
      payable += amount;
      if (t.due_date < today) overdueOut += amount;
    }
  }

  const last3 = series.slice(-3);
  const burn =
    last3.length > 0 ? last3.reduce((a, b) => a + b.expense, 0) / last3.length : 0;
  const balance = openingBalance + paidNetAll;
  const avgNet = last3.length ? last3.reduce((a, b) => a + b.net, 0) / last3.length : 0;

  return {
    income: cur.income,
    expense: cur.expense,
    net: cur.net,
    margin: cur.income > 0 ? (cur.net / cur.income) * 100 : null,
    incomeDelta: delta(cur.income, prev.income),
    expenseDelta: delta(cur.expense, prev.expense),
    netDelta: delta(cur.net, prev.net),
    receivable,
    payable,
    overdueIn,
    overdueOut,
    balance,
    burn,
    runwayMonths: avgNet < 0 && burn > 0 ? Math.max(0, balance / Math.abs(avgNet)) : null,
  };
}

export type HealthPillar = {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Índice de Saúde Empresarial (0–100) a partir de pilares ponderados. */
export function businessHealth(kpis: Kpis, series: MonthPoint[]) {
  const margin = kpis.margin ?? 0;
  const profitability = clamp(50 + margin * 2);

  const liquidity = clamp(
    kpis.payable + kpis.overdueOut > 0
      ? ((kpis.balance + kpis.receivable) / (kpis.payable + kpis.overdueOut)) * 40
      : kpis.balance > 0
        ? 90
        : 40,
  );

  const punctuality = clamp(
    kpis.receivable + kpis.payable > 0
      ? 100 - ((kpis.overdueIn + kpis.overdueOut) / (kpis.receivable + kpis.payable)) * 100
      : 100,
  );

  const growthBase = series.slice(-6);
  const firstHalf = growthBase.slice(0, 3).reduce((a, b) => a + b.income, 0);
  const secondHalf = growthBase.slice(-3).reduce((a, b) => a + b.income, 0);
  const growthPct = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  const growth = clamp(50 + growthPct * 1.5);

  const positiveMonths = series.slice(-6).filter((m) => m.net >= 0).length;
  const consistency = clamp((positiveMonths / Math.max(1, series.slice(-6).length)) * 100);

  const pillars: HealthPillar[] = [
    {
      key: "profitability",
      label: "Rentabilidade",
      score: profitability,
      weight: 0.3,
      detail: `Margem líquida do mês: ${margin.toFixed(1).replace(".", ",")}%`,
    },
    {
      key: "liquidity",
      label: "Liquidez",
      score: liquidity,
      weight: 0.25,
      detail: "Caixa + recebíveis frente às obrigações em aberto",
    },
    {
      key: "punctuality",
      label: "Pontualidade",
      score: punctuality,
      weight: 0.2,
      detail: "Participação de títulos vencidos na carteira",
    },
    {
      key: "growth",
      label: "Crescimento",
      score: growth,
      weight: 0.15,
      detail: `Receita do último trimestre vs. anterior: ${growthPct.toFixed(1).replace(".", ",")}%`,
    },
    {
      key: "consistency",
      label: "Consistência",
      score: consistency,
      weight: 0.1,
      detail: `${positiveMonths} de ${series.slice(-6).length} meses com resultado positivo`,
    },
  ];

  const score = Math.round(pillars.reduce((a, p) => a + p.score * p.weight, 0));
  const status =
    score >= 80
      ? { label: "Excelente", tone: "positive" as const }
      : score >= 60
        ? { label: "Saudável", tone: "positive" as const }
        : score >= 40
          ? { label: "Atenção", tone: "warning" as const }
          : { label: "Crítico", tone: "negative" as const };

  return { score, status, pillars, growthPct };
}

/** Projeção simples: média móvel dos últimos meses + títulos já agendados. */
export function forecast(series: MonthPoint[], txns: Txn[], balance: number, horizon = 3) {
  const base = series.slice(-3);
  const avgIncome = base.length ? base.reduce((a, b) => a + b.income, 0) / base.length : 0;
  const avgExpense = base.length ? base.reduce((a, b) => a + b.expense, 0) / base.length : 0;

  const scheduled = new Map<string, { income: number; expense: number }>();
  for (const t of txns) {
    if (t.status !== "pending") continue;
    const k = monthKey(t.due_date);
    const b = scheduled.get(k) ?? { income: 0, expense: 0 };
    if (t.direction === "income") b.income += Number(t.amount);
    else b.expense += Number(t.amount);
    scheduled.set(k, b);
  }

  const now = new Date();
  let running = balance;
  const out = [];
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const sch = scheduled.get(key) ?? { income: 0, expense: 0 };
    const income = Math.max(avgIncome, sch.income);
    const expense = Math.max(avgExpense, sch.expense);
    running += income - expense;
    out.push({ month: key, income, expense, net: income - expense, cumulative: running });
  }
  return out;
}

export function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return map;
}