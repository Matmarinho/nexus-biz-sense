import type { Txn } from "./analytics";

export type Account = {
  id: string;
  name: string;
  bank_name: string | null;
  account_type: string;
  opening_balance: number | string | null;
  invested_amount: number | string | null;
  yield_cdi_percent: number | string | null;
  card_limit: number | string | null;
  card_used: number | string | null;
  logo_url?: string | null;
  color?: string | null;
};

export type Transfer = {
  from_account_id: string;
  to_account_id: string;
  amount: number | string;
  transfer_date: string;
};

const n = (v: unknown) => Number(v ?? 0) || 0;
const isPaid = (t: Txn) => t.status === "paid";
const effDate = (t: Txn) => t.payment_date ?? t.due_date;

/** Taxa CDI anual padrão usada nas projeções (editável na interface). */
export const DEFAULT_CDI_ANNUAL = 14.9;

export type AccountSnapshot = {
  id: string;
  name: string;
  bank_name: string | null;
  account_type: string;
  logo_url: string | null;
  color: string | null;
  opening: number;
  /** entradas liquidadas no mês de referência */
  monthIn: number;
  /** saídas liquidadas no mês de referência */
  monthOut: number;
  /** saldo atual = abertura + liquidados + transferências */
  balance: number;
  /** títulos em aberto (não impactam entradas/saídas do mês) */
  receivable: number;
  payable: number;
  invested: number;
  cdiPercent: number;
  cardLimit: number;
  cardUsed: number;
};

/**
 * Consolida saldo, entradas e saídas por conta bancária.
 * Somente lançamentos liquidados (status "paid") entram em saldo/entradas/saídas.
 */
export function accountSnapshots(
  accounts: Account[],
  txns: Txn[],
  transfers: Transfer[],
  month: string,
): AccountSnapshot[] {
  const map = new Map<string, AccountSnapshot>();
  for (const a of accounts) {
    map.set(a.id, {
      id: a.id,
      name: a.name,
      bank_name: a.bank_name ?? null,
      account_type: a.account_type,
      logo_url: a.logo_url ?? null,
      color: a.color ?? null,
      opening: n(a.opening_balance),
      monthIn: 0,
      monthOut: 0,
      balance: n(a.opening_balance),
      receivable: 0,
      payable: 0,
      invested: n(a.invested_amount),
      cdiPercent: n(a.yield_cdi_percent),
      cardLimit: n(a.card_limit),
      cardUsed: n(a.card_used),
    });
  }

  for (const t of txns) {
    if (t.status === "canceled") continue;
    const acc = t.bank_account_id ? map.get(t.bank_account_id) : undefined;
    if (!acc) continue;
    const amount = n(t.amount);
    if (isPaid(t)) {
      acc.balance += t.direction === "income" ? amount : -amount;
      if (effDate(t).slice(0, 7) === month) {
        if (t.direction === "income") acc.monthIn += amount;
        else acc.monthOut += amount;
      }
    } else if (t.direction === "income") acc.receivable += amount;
    else acc.payable += amount;
  }

  for (const tr of transfers) {
    const from = map.get(tr.from_account_id);
    const to = map.get(tr.to_account_id);
    const amount = n(tr.amount);
    if (from) from.balance -= amount;
    if (to) to.balance += amount;
  }

  return [...map.values()];
}

export type ScopeTotals = {
  monthIn: number;
  monthOut: number;
  monthNet: number;
  balance: number;
  receivable: number;
  payable: number;
  invested: number;
  cardLimit: number;
  cardUsed: number;
  cdiWeighted: number;
};

export function totalsOf(snaps: AccountSnapshot[], unassigned?: { monthIn: number; monthOut: number; balance: number; receivable: number; payable: number }): ScopeTotals {
  const t: ScopeTotals = {
    monthIn: unassigned?.monthIn ?? 0,
    monthOut: unassigned?.monthOut ?? 0,
    monthNet: 0,
    balance: unassigned?.balance ?? 0,
    receivable: unassigned?.receivable ?? 0,
    payable: unassigned?.payable ?? 0,
    invested: 0,
    cardLimit: 0,
    cardUsed: 0,
    cdiWeighted: 0,
  };
  let weighted = 0;
  for (const s of snaps) {
    t.monthIn += s.monthIn;
    t.monthOut += s.monthOut;
    t.balance += s.balance;
    t.receivable += s.receivable;
    t.payable += s.payable;
    t.invested += s.invested;
    t.cardLimit += s.cardLimit;
    t.cardUsed += s.cardUsed;
    weighted += s.invested * s.cdiPercent;
  }
  t.monthNet = t.monthIn - t.monthOut;
  t.cdiWeighted = t.invested > 0 ? weighted / t.invested : 0;
  return t;
}

/** Lançamentos sem conta bancária vinculada (entram no consolidado geral). */
export function unassignedTotals(txns: Txn[], month: string) {
  const out = { monthIn: 0, monthOut: 0, balance: 0, receivable: 0, payable: 0 };
  for (const t of txns) {
    if (t.status === "canceled" || t.bank_account_id) continue;
    const amount = n(t.amount);
    if (isPaid(t)) {
      out.balance += t.direction === "income" ? amount : -amount;
      if (effDate(t).slice(0, 7) === month) {
        if (t.direction === "income") out.monthIn += amount;
        else out.monthOut += amount;
      }
    } else if (t.direction === "income") out.receivable += amount;
    else out.payable += amount;
  }
  return out;
}

/**
 * Rendimento composto de um valor aplicado a um percentual do CDI.
 * @param principal valor aplicado
 * @param cdiPercent percentual do CDI da aplicação (ex.: 102 = 102% do CDI)
 * @param cdiAnnual CDI anual em % (ex.: 14.9)
 * @param months horizonte em meses
 */
export function cdiProjection(principal: number, cdiPercent: number, cdiAnnual: number, months: number) {
  const effectiveAnnual = (cdiAnnual / 100) * (cdiPercent / 100);
  const monthlyRate = Math.pow(1 + effectiveAnnual, 1 / 12) - 1;
  const gross = principal * Math.pow(1 + monthlyRate, months);
  return { value: gross, yieldAmount: gross - principal, monthlyRate, effectiveAnnual };
}

export function cdiCurve(principal: number, cdiPercent: number, cdiAnnual: number, months = 12) {
  return Array.from({ length: months + 1 }, (_, i) => {
    const p = cdiProjection(principal, cdiPercent, cdiAnnual, i);
    return { month: i, label: i === 0 ? "hoje" : `${i}m`, value: p.value, yield: p.yieldAmount };
  });
}
