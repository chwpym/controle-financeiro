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
  const d = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Validação matemática oficial dos 14 dígitos/caracteres do CNPJ
 * com suporte ao padrão tradicional e ao padrão oficial Alfanumérico da RFB (IN RFB nº 2.229/2024).
 * Posições 1 a 12: aceitam 0-9 e A-Z (char code - 48).
 * Posições 13 e 14 (DVs): estritamente numéricas 0-9.
 */
export function isValidCNPJ(value: string | null | undefined): boolean {
  if (!value) return false;
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 14) return false;
  // Rejeita sequências repetidas de 14 caracteres idênticos
  if (/^([A-Z0-9])\1{13}$/.test(clean)) return false;
  // Os dois últimos caracteres (DVs) devem ser estritamente dígitos 0-9
  if (!/^\d{2}$/.test(clean.slice(12))) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    const val = clean.charCodeAt(i) - 48;
    sum1 += val * weights1[i];
  }
  const rem1 = sum1 % 11;
  const d1 = rem1 < 2 ? 0 : 11 - rem1;
  if (d1 !== Number(clean[12])) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 12; i++) {
    const val = clean.charCodeAt(i) - 48;
    sum2 += val * weights2[i];
  }
  sum2 += (clean.charCodeAt(12) - 48) * weights2[12];
  const rem2 = sum2 % 11;
  const d2 = rem2 < 2 ? 0 : 11 - rem2;
  return d2 === Number(clean[13]);
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

export const MAX_INSTALLMENTS = 420;
export const QUICK_INSTALLMENT_PRESETS = [1, 2, 3, 6, 10, 12, 24, 36, 60, 120] as const;

/**
 * Distribui centavos exatos entre uma quantidade de parcelas,
 * alocando a sobra dos centavos na primeira parcela.
 */
export function distributeCents(totalCents: number, count: number): number[] {
  const safeCount = Math.max(1, Math.floor(count));
  const base = Math.floor(totalCents / safeCount);
  const remainder = totalCents - base * safeCount;
  const result: number[] = [];
  for (let i = 0; i < safeCount; i++) {
    result.push(Math.max(1, base + (i === 0 ? remainder : 0)));
  }
  return result;
}

export interface InstallmentBuildParams {
  userId: string;
  companyId?: string | null;
  type: TransactionType;
  description: string;
  amountCents: number;
  amountMode: 'total' | 'per_installment';
  firstDueDate: string;
  installments: number;
  categoryId: string | null;
  contactId: string | null;
  documentNumber: string;
  issueDate?: string | null;
  notes: string;
  markFirstSettled?: boolean;
  paymentMethod?: string;
}

export function buildInstallmentTransactions(params: InstallmentBuildParams): Transaction[] {
  const count = Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(params.installments || 1)));
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
      companyId: params.companyId || null,
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
      issueDate: params.issueDate || null,
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
  companyId?: string | null;
  type: TransactionType;
  description: string;
  amountCents: number;
  firstDueDate: string;
  interval: RecurrenceInterval;
  occurrences: number;
  categoryId: string | null;
  contactId: string | null;
  documentNumber: string;
  issueDate?: string | null;
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
      companyId: params.companyId || null,
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
      issueDate: params.issueDate || null,
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
    issueDate: tx.issueDate ?? null,
    installmentGroupId: tx.isRecurring ? tx.installmentGroupId || crypto.randomUUID() : null,
    installmentNumber: 1,
    installmentTotal: 1,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * EN: Normalizes CPF/CNPJ documents removing punctuation while preserving uppercase alphanumeric
 *     characters for RFB Alphanumeric CNPJs (IN RFB nº 2.229/2024).
 * PT: Normaliza documentos CPF/CNPJ removendo pontuação e mantendo caracteres alfanuméricos
 *     maiúsculos para suporte ao CNPJ Alfanumérico da Receita Federal.
 */
export function cleanDocumentDigits(doc: string | null | undefined): string {
  if (!doc) return '';
  return doc.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function findDuplicateContactDocument<T extends { id: string; name: string; document?: string }>(
  contacts: T[],
  targetDocument: string | null | undefined,
  currentContactId?: string | null
): T | null {
  const targetClean = cleanDocumentDigits(targetDocument);
  if (!targetClean || targetClean.length < 8) return null;

  for (const c of contacts) {
    if (currentContactId && c.id === currentContactId) continue;
    const cClean = cleanDocumentDigits(c.document);
    if (cClean && cClean === targetClean) {
      return c;
    }
  }
  return null;
}

export interface SettlementCalculationInput {
  baseAmountCents: number;
  interestCents?: number;
  discountCents?: number;
}

export interface SettlementCalculationResult {
  baseAmountCents: number;
  interestCents: number;
  discountCents: number;
  finalAmountCents: number;
  isValid: boolean;
  error?: string;
}

/**
 * Calcula o valor final liquidado (Valor Base + Juros - Desconto) em centavos,
 * bloqueando descontos superiores ao valor base do título.
 */
export function calculateSettlement(
  input: SettlementCalculationInput
): SettlementCalculationResult {
  const baseAmountCents = Math.max(0, Math.round(input.baseAmountCents || 0));
  const interestCents = Math.max(0, Math.round(input.interestCents || 0));
  const discountCents = Math.max(0, Math.round(input.discountCents || 0));

  if (discountCents > baseAmountCents) {
    return {
      baseAmountCents,
      interestCents,
      discountCents,
      finalAmountCents: baseAmountCents + interestCents,
      isValid: false,
      error: 'O desconto não pode ser maior que o valor do título.',
    };
  }

  return {
    baseAmountCents,
    interestCents,
    discountCents,
    finalAmountCents: baseAmountCents + interestCents - discountCents,
    isValid: true,
  };
}

/**
 * Retorna o valor final liquidado em centavos (Valor Base + Juros - Desconto).
 * Lança erro caso o desconto exceda o valor base do título.
 */
export function calculateSettledAmount(
  baseAmountCents: number,
  interestCents = 0,
  discountCents = 0
): number {
  const result = calculateSettlement({ baseAmountCents, interestCents, discountCents });
  if (!result.isValid) {
    throw new Error(result.error);
  }
  return result.finalAmountCents;
}

/**
 * Converte um lançamento à vista pendente em um lote de N parcelas flexíveis (até 420x).
 */
export function splitSingleTransactionIntoInstallments(
  originalTx: Transaction,
  installments: number,
  firstDueDate: string,
  amountMode: 'total' | 'per_installment'
): Transaction[] {
  const count = Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(installments || 1)));
  const now = new Date().toISOString();
  const groupId = count > 1 ? crypto.randomUUID() : null;
  const cleanDesc = (originalTx.description || '').replace(/\s*\(\d+\/\d+\)$/, '').trim();

  let amounts: number[];
  if (count === 1 || amountMode === 'per_installment') {
    amounts = Array(count).fill(Math.max(1, originalTx.amountCents));
  } else {
    amounts = distributeCents(originalTx.amountCents, count);
  }

  return amounts.map((cents, idx) => {
    const num = idx + 1;
    const suffix = count > 1 ? ` (${num}/${count})` : '';
    return {
      id: crypto.randomUUID(),
      userId: originalTx.userId,
      companyId: originalTx.companyId || null,
      type: originalTx.type,
      description: `${cleanDesc}${suffix}`,
      amountCents: cents,
      discountCents: 0,
      interestCents: 0,
      dueDate: addMonthsISO(firstDueDate, idx),
      paidAt: null,
      status: 'pending' as const,
      paymentMethod: '',
      categoryId: originalTx.categoryId || null,
      contactId: originalTx.contactId || null,
      documentNumber: (originalTx.documentNumber || '').trim(),
      issueDate: originalTx.issueDate || null,
      installmentGroupId: groupId,
      installmentNumber: num,
      installmentTotal: count,
      isRecurring: false,
      recurrenceInterval: null,
      notes: (originalTx.notes || '').trim(),
      source: originalTx.source || 'manual',
      createdAt: now,
      updatedAt: now,
    };
  });
}

export interface PartialSettlementResult {
  settledTx: Transaction;
  remainderTx: Transaction;
  updatedSiblings: Transaction[];
}

/**
 * EN: Executes a Partial Settlement (`Baixa Parcial`) on a pending transaction:
 *     1. Settles the current transaction with `paidAmountCents` (recording cash flow entry/exit).
 *     2. Generates a new pending installment for the remaining balance (`baseAmountCents - paidAmountCents`),
 *        linked to the same `installmentGroupId` with due date `remainderDueDate` (+30 days by default),
 *        and updates sibling `installmentTotal` counters consistently.
 * PT: Executa uma Baixa Parcial com Desdobro de Saldo Devedor:
 *     1. Quita o lançamento atual com o valor efetivamente pago (`paidAmountCents`).
 *     2. Gera automaticamente uma nova parcela pendente com o saldo remanescente vinculada ao mesmo
 *        `installmentGroupId`, renumerando o total de parcelas do contrato de forma íntegra.
 */
export function buildPartialSettlementSplit(params: {
  targetTx: Transaction;
  allTransactions: Transaction[];
  paidAmountCents: number;
  paymentMethod: string;
  paidAt: string;
  notes: string;
  remainderDueDate?: string;
}): PartialSettlementResult {
  const { targetTx, allTransactions, paymentMethod, paidAt, notes } = params;
  const now = new Date().toISOString();

  const baseAmountCents = Math.max(
    1,
    Math.round(targetTx.amountCents + (targetTx.discountCents || 0) - (targetTx.interestCents || 0))
  );
  const safePaidCents = Math.max(1, Math.min(baseAmountCents - 1, Math.round(params.paidAmountCents)));
  const remainderCents = Math.max(1, baseAmountCents - safePaidCents);

  const groupId = targetTx.installmentGroupId || crypto.randomUUID();
  const cleanDesc = (targetTx.description || '').replace(/\s*\(\d+\/\d+\)$/, '').trim();
  const nextDue = params.remainderDueDate || addDaysISO(targetTx.dueDate, 30);

  const siblings = targetTx.installmentGroupId
    ? allTransactions.filter(
        (t) => t.installmentGroupId === targetTx.installmentGroupId && t.id !== targetTx.id
      )
    : [];

  const newTotal = siblings.length + 2;

  // Order all existing items + new remainder chronologically to assign clean installment numbers
  const settledCurrent: Transaction = {
    ...targetTx,
    installmentGroupId: groupId,
    amountCents: safePaidCents,
    discountCents: 0,
    interestCents: 0,
    status: 'settled',
    paymentMethod,
    paidAt,
    notes: notes.trim()
      ? notes.trim()
      : `Baixa parcial (${formatBRL(safePaidCents)} de ${formatBRL(baseAmountCents)})`,
    updatedAt: now,
  };

  const remainderTx: Transaction = {
    ...targetTx,
    id: crypto.randomUUID(),
    installmentGroupId: groupId,
    amountCents: remainderCents,
    discountCents: 0,
    interestCents: 0,
    dueDate: nextDue,
    paidAt: null,
    status: 'pending',
    paymentMethod: '',
    notes: `Saldo remanescente de ${formatBRL(baseAmountCents)} (baixa parcial de ${formatBRL(safePaidCents)} em ${formatDateBR(paidAt)})`,
    createdAt: now,
    updatedAt: now,
  };

  const combinedGroup = [...siblings, settledCurrent, remainderTx].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.installmentNumber - b.installmentNumber
  );

  let finalSettled = settledCurrent;
  let finalRemainder = remainderTx;
  const updatedSiblings: Transaction[] = [];

  combinedGroup.forEach((item, idx) => {
    const num = idx + 1;
    const baseItemDesc = (item.description || cleanDesc).replace(/\s*\(\d+\/\d+\)$/, '').trim();
    const reindexed: Transaction = {
      ...item,
      installmentGroupId: groupId,
      installmentNumber: num,
      installmentTotal: newTotal,
      description: `${baseItemDesc} (${num}/${newTotal})`,
      updatedAt: now,
    };

    if (reindexed.id === settledCurrent.id) {
      finalSettled = reindexed;
    } else if (reindexed.id === remainderTx.id) {
      finalRemainder = reindexed;
    } else {
      updatedSiblings.push(reindexed);
    }
  });

  return {
    settledTx: finalSettled,
    remainderTx: finalRemainder,
    updatedSiblings,
  };
}

export interface RenegotiateResult {
  toDeleteIds: string[];
  toUpsert: Transaction[];
}

/**
 * Renegocia o saldo devedor restante de um parcelamento existente,
 * mantendo as parcelas já pagas (settled) 100% blindadas e recalculando
 * apenas as pendentes em um novo cronograma.
 */
export function renegotiateInstallmentGroup(
  groupTxs: Transaction[],
  newInstallmentsCount: number,
  newFirstDueDate: string
): RenegotiateResult {
  if (!groupTxs.length) {
    return { toDeleteIds: [], toUpsert: [] };
  }

  const baseTx = groupTxs[0];
  const groupId = baseTx.installmentGroupId || crypto.randomUUID();
  const cleanDesc = (baseTx.description || '').replace(/\s*\(\d+\/\d+\)$/, '').trim();
  const now = new Date().toISOString();

  // Separar parcelas quitadas (blindadas) e pendentes
  const settledTxs = groupTxs
    .filter((t) => t.status === 'settled')
    .sort((a, b) => a.installmentNumber - b.installmentNumber || a.dueDate.localeCompare(b.dueDate));

  const pendingTxs = groupTxs.filter((t) => t.status !== 'settled');

  const safeNewCount = Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(newInstallmentsCount || 1)));
  const settledCount = settledTxs.length;
  const newTotal = settledCount + safeNewCount;

  // Atualizar as parcelas pagas apenas no installmentTotal e descrição de índice, mantendo datas, valores e histórico
  const updatedSettled = settledTxs.map((tx, idx) => ({
    ...tx,
    installmentGroupId: groupId,
    installmentNumber: idx + 1,
    installmentTotal: newTotal,
    description: `${cleanDesc} (${idx + 1}/${newTotal})`,
    updatedAt: now,
  }));

  // Saldo devedor restante baseado nas parcelas pendentes
  const remainingCents = pendingTxs.reduce((sum, t) => sum + t.amountCents, 0);
  const distributedCents = distributeCents(remainingCents, safeNewCount);

  // Gerar novas parcelas para o saldo devedor
  const newPendingTxs: Transaction[] = distributedCents.map((cents, idx) => {
    const num = settledCount + idx + 1;
    return {
      id: crypto.randomUUID(),
      userId: baseTx.userId,
      companyId: baseTx.companyId || null,
      type: baseTx.type,
      description: `${cleanDesc} (${num}/${newTotal})`,
      amountCents: cents,
      discountCents: 0,
      interestCents: 0,
      dueDate: addMonthsISO(newFirstDueDate, idx),
      paidAt: null,
      status: 'pending' as const,
      paymentMethod: '',
      categoryId: baseTx.categoryId || null,
      contactId: baseTx.contactId || null,
      documentNumber: (baseTx.documentNumber || '').trim(),
      issueDate: baseTx.issueDate || null,
      installmentGroupId: groupId,
      installmentNumber: num,
      installmentTotal: newTotal,
      isRecurring: false,
      recurrenceInterval: null,
      notes: (baseTx.notes || '').trim(),
      source: baseTx.source || 'manual',
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    toDeleteIds: pendingTxs.map((t) => t.id),
    toUpsert: [...updatedSettled, ...newPendingTxs],
  };
}


