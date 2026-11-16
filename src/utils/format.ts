import type { RecurrenceInterval, Transaction, TransactionType } from '../types';

export function formatBRL(cents: number): string {
  const value = (cents || 0) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatInputBRL(cents: number): string {
  const value = (cents || 0) / 100;
  return value.toFixed(2).replace('.', ',');
}

export function parseBRLToCents(raw: string): number {
  const cleaned = raw.trim().replace(/[R$\s]/g, '');
  if (!cleaned) return 0;
  // Handle both "1.234,56" and "1234.56"
  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const date = new Date(y, m - 1, 1);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shiftMonthKey(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonthsISO(isoDate: string, monthsToAdd: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const target = new Date(y, m - 1 + monthsToAdd, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(d, lastDayOfTargetMonth);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function addDaysISO(isoDate: string, daysToAdd: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const target = new Date(y, m - 1, d + daysToAdd);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

export function nextRecurrenceDate(isoDate: string, interval: RecurrenceInterval, step = 1): string {
  if (interval === 'biweekly') return addDaysISO(isoDate, 15 * step);
  if (interval === 'yearly') return addMonthsISO(isoDate, 12 * step);
  return addMonthsISO(isoDate, step);
}

export const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  monthly: 'Mensal',
  biweekly: 'Quinzenal',
  yearly: 'Anual',
};

export const RECURRING_TEMPLATES = [
  'Energia Elétrica',
  'Água e Saneamento',
  'Licença de Software',
  'Internet e Telefonia',
  'Aluguel',
  'Contabilidade',
] as const;

export function isOverdue(tx: Transaction, referenceToday = todayISO()): boolean {
  return tx.status === 'pending' && tx.dueDate < referenceToday;
}

export function daysUntilDue(dueDate: string, referenceToday = todayISO()): number {
  const a = new Date(`${referenceToday}T00:00:00`);
  const b = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export const PAYMENT_METHODS = [
  'PIX',
  'Dinheiro',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Boleto',
  'Transferência (TED/DOC)',
  'Cheque',
  'Outro',
] as const;

export interface InstallmentBuildParams {
  userId: string;
  type: TransactionType;
  description: string;
  amountCents: number;
  amountMode: 'total' | 'per_installment';
  firstDueDate: string;
  installments: number;
  categoryId: string | null;
  contactId: string | null;
  documentNumber: string;
  notes: string;
  markFirstSettled?: boolean;
  paymentMethod?: string;
}

export function buildInstallmentTransactions(params: InstallmentBuildParams): Transaction[] {
  const count = Math.max(1, Math.min(60, Math.floor(params.installments || 1)));
  const now = new Date().toISOString();
  const groupId = count > 1 ? crypto.randomUUID() : null;

  const amounts: number[] = [];
  if (count === 1 || params.amountMode === 'per_installment') {
    for (let i = 0; i < count; i++) {
      amounts.push(Math.max(1, params.amountCents));
    }
  } else {
    const base = Math.floor(params.amountCents / count);
    const remainder = params.amountCents - base * count;
    for (let i = 0; i < count; i++) {
      amounts.push(Math.max(1, base + (i === 0 ? remainder : 0)));
    }
  }

  return amounts.map((cents, idx) => {
    const num = idx + 1;
    const dueDate = addMonthsISO(params.firstDueDate, idx);
    const isSettled = idx === 0 && Boolean(params.markFirstSettled);
    const suffix = count > 1 ? ` (${num}/${count})` : '';
    return {
      id: crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      description: `${params.description.trim()}${suffix}`,
      amountCents: cents,
      discountCents: 0,
      interestCents: 0,
      dueDate,
      paidAt: isSettled ? dueDate : null,
      status: isSettled ? 'settled' : 'pending',
      paymentMethod: isSettled ? (params.paymentMethod || 'PIX') : '',
      categoryId: params.categoryId || null,
      contactId: params.contactId || null,
      documentNumber: params.documentNumber.trim(),
      installmentGroupId: groupId,
      installmentNumber: num,
      installmentTotal: count,
      isRecurring: false,
      recurrenceInterval: null,
      notes: params.notes.trim(),
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    };
  });
}

export interface RecurringBuildParams {
  userId: string;
  type: TransactionType;
  description: string;
  amountCents: number;
  firstDueDate: string;
  interval: RecurrenceInterval;
  occurrences: number;
  categoryId: string | null;
  contactId: string | null;
  documentNumber: string;
  notes: string;
  markFirstSettled?: boolean;
  paymentMethod?: string;
}

export function buildRecurringTransactions(params: RecurringBuildParams): Transaction[] {
  const count = Math.max(1, Math.min(24, Math.floor(params.occurrences || 1)));
  const now = new Date().toISOString();
  const groupId = crypto.randomUUID();
  const cleanDesc = params.description.trim();

  return Array.from({ length: count }, (_, idx) => {
    const dueDate = nextRecurrenceDate(params.firstDueDate, params.interval, idx);
    const isSettled = idx === 0 && Boolean(params.markFirstSettled);
    return {
      id: crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      description: cleanDesc,
      amountCents: Math.max(1, params.amountCents),
      discountCents: 0,
      interestCents: 0,
      dueDate,
      paidAt: isSettled ? dueDate : null,
      status: isSettled ? 'settled' : 'pending',
      paymentMethod: isSettled ? (params.paymentMethod || 'PIX') : '',
      categoryId: params.categoryId || null,
      contactId: params.contactId || null,
      documentNumber: params.documentNumber.trim(),
      installmentGroupId: groupId,
      installmentNumber: 1,
      installmentTotal: 1,
      isRecurring: true,
      recurrenceInterval: params.interval,
      notes: params.notes.trim(),
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function buildDuplicatedTransaction(tx: Transaction, nextDueDate?: string): Transaction {
  const now = new Date().toISOString();
  const baseAmount = Math.max(1, tx.amountCents + (tx.discountCents || 0) - (tx.interestCents || 0));
  const computedDue =
    nextDueDate ||
    (tx.isRecurring && tx.recurrenceInterval
      ? nextRecurrenceDate(tx.dueDate, tx.recurrenceInterval, 1)
      : addMonthsISO(tx.dueDate, 1));

  return {
    ...tx,
    id: crypto.randomUUID(),
    amountCents: baseAmount,
    discountCents: 0,
    interestCents: 0,
    dueDate: computedDue,
    paidAt: null,
    status: 'pending',
    paymentMethod: '',
    installmentGroupId: tx.isRecurring ? tx.installmentGroupId || crypto.randomUUID() : null,
    installmentNumber: 1,
    installmentTotal: 1,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  };
}
