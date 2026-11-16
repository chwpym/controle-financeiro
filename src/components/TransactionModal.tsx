import React, { useMemo, useState } from 'react';
import { Calendar, Layers, Repeat, X } from 'lucide-react';
import type { Category, Contact, RecurrenceInterval, Transaction, TransactionType } from '../types';
import {
  addMonthsISO,
  buildInstallmentTransactions,
  buildRecurringTransactions,
  formatBRL,
  formatDateBR,
  formatInputBRL,
  nextRecurrenceDate,
  parseBRLToCents,
  PAYMENT_METHODS,
  RECURRENCE_LABELS,
  RECURRING_TEMPLATES,
  todayISO,
} from '../utils/format';

interface TransactionModalProps {
  userId: string;
  editingTransaction: Transaction | null;
  categories: Category[];
  contacts: Contact[];
  onClose: () => void;
  onSaveBatch: (items: Transaction[]) => void;
  onUpdateSingle: (item: Transaction) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  userId,
  editingTransaction,
  categories,
  contacts,
  onClose,
  onSaveBatch,
  onUpdateSingle,
}) => {
  const isEditing = Boolean(editingTransaction);

  const [type, setType] = useState<TransactionType>(editingTransaction?.type || 'payable');
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [amountRaw, setAmountRaw] = useState(
    editingTransaction ? formatInputBRL(editingTransaction.amountCents) : ''
  );
  const [dueDate, setDueDate] = useState(editingTransaction?.dueDate || todayISO());
  const [categoryId, setCategoryId] = useState(editingTransaction?.categoryId || '');
  const [contactId, setContactId] = useState(editingTransaction?.contactId || '');
  const [documentNumber, setDocumentNumber] = useState(editingTransaction?.documentNumber || '');
  const [notes, setNotes] = useState(editingTransaction?.notes || '');
  const [status, setStatus] = useState<'pending' | 'settled'>(
    editingTransaction?.status || 'pending'
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    editingTransaction?.paymentMethod || 'PIX'
  );

  // Entry mode on creation: installment (1x..60x) OR recurring fixed bill (água, energia, software...)
  const [entryMode, setEntryMode] = useState<'installment' | 'recurring'>(
    editingTransaction?.isRecurring ? 'recurring' : 'installment'
  );

  // Installments (when entryMode === 'installment')
  const [installments, setInstallments] = useState<number>(1);
  const [amountMode, setAmountMode] = useState<'total' | 'per_installment'>('total');

  // Recurrence (when entryMode === 'recurring' or editing recurring)
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(
    editingTransaction?.recurrenceInterval || 'monthly'
  );
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState<number>(6);

  const [markFirstSettled, setMarkFirstSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === 'both' || c.type === type),
    [categories, type]
  );

  const parsedCents = useMemo(() => parseBRLToCents(amountRaw), [amountRaw]);

  const installmentPreview = useMemo(() => {
    if (isEditing || entryMode !== 'installment' || installments <= 1 || parsedCents <= 0) {
      return [];
    }
    const count = Math.min(60, Math.max(2, installments));
    const list: { num: number; dueDate: string; cents: number }[] = [];
    if (amountMode === 'per_installment') {
      for (let i = 0; i < count; i++) {
        list.push({ num: i + 1, dueDate: addMonthsISO(dueDate, i), cents: parsedCents });
      }
    } else {
      const base = Math.floor(parsedCents / count);
      const rem = parsedCents - base * count;
      for (let i = 0; i < count; i++) {
        list.push({
          num: i + 1,
          dueDate: addMonthsISO(dueDate, i),
          cents: Math.max(1, base + (i === 0 ? rem : 0)),
        });
      }
    }
    return list;
  }, [isEditing, entryMode, installments, parsedCents, amountMode, dueDate]);

  const recurringPreview = useMemo(() => {
    if (isEditing || entryMode !== 'recurring' || parsedCents <= 0) return [];
    const count = Math.max(1, Math.min(24, recurrenceOccurrences));
    return Array.from({ length: count }, (_, idx) => ({
      num: idx + 1,
      dueDate: nextRecurrenceDate(dueDate, recurrenceInterval, idx),
      cents: parsedCents,
    }));
  }, [isEditing, entryMode, parsedCents, recurrenceOccurrences, dueDate, recurrenceInterval]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Informe a descrição do lançamento.');
      return;
    }
    if (parsedCents <= 0) {
      setError('Informe um valor válido em R$ maior que zero.');
      return;
    }
    if (!dueDate) {
      setError('Informe a data de vencimento.');
      return;
    }

    if (isEditing && editingTransaction) {
      const now = new Date().toISOString();
      const updated: Transaction = {
        ...editingTransaction,
        type,
        description: description.trim(),
        amountCents: parsedCents,
        dueDate,
        status,
        paidAt: status === 'settled' ? editingTransaction.paidAt || todayISO() : null,
        paymentMethod: status === 'settled' ? paymentMethod || 'PIX' : '',
        categoryId: categoryId || null,
        contactId: contactId || null,
        documentNumber: documentNumber.trim(),
        isRecurring: entryMode === 'recurring',
        recurrenceInterval: entryMode === 'recurring' ? recurrenceInterval : null,
        notes: notes.trim(),
        updatedAt: now,
      };
      onUpdateSingle(updated);
      onClose();
      return;
    }

    if (entryMode === 'recurring') {
      const items = buildRecurringTransactions({
        userId,
        type,
        description,
        amountCents: parsedCents,
        firstDueDate: dueDate,
        interval: recurrenceInterval,
        occurrences: recurrenceOccurrences,
        categoryId: categoryId || null,
        contactId: contactId || null,
        documentNumber,
        notes,
        markFirstSettled,
        paymentMethod: markFirstSettled ? paymentMethod : '',
      });
      onSaveBatch(items);
      onClose();
      return;
    }

    const items = buildInstallmentTransactions({
      userId,
      type,
      description,
      amountCents: parsedCents,
      amountMode,
      firstDueDate: dueDate,
      installments,
      categoryId: categoryId || null,
      contactId: contactId || null,
      documentNumber,
      notes,
      markFirstSettled,
      paymentMethod: markFirstSettled ? paymentMethod : '',
    });
    onSaveBatch(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Editar Lançamento' : 'Novo Lançamento (BRL)'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Type Segmented Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType('payable')}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
                type === 'payable'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Conta a Pagar (Despesa)
            </button>
            <button
              type="button"
              onClick={() => setType('receivable')}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
                type === 'receivable'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Conta a Receber (Receita)
            </button>
          </div>

          {/* Entry Mode Selector (Installments vs Recurring Fixed Bill) */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setEntryMode('installment')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] flex items-center justify-center gap-1.5 ${
                  entryMode === 'installment'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Único ou Parcelado</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('recurring')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] flex items-center justify-center gap-1.5 ${
                  entryMode === 'recurring'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Conta Recorrente / Fixa</span>
              </button>
            </div>
          )}

          {/* Quick Templates for Recurring Bills */}
          {entryMode === 'recurring' && !isEditing && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Modelos rápidos de contas fixas:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RECURRING_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setDescription(tpl)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                      description === tpl
                        ? 'border-teal-700 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrição *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  entryMode === 'recurring'
                    ? 'Ex: Energia Elétrica, Água, Licença ERP / Software'
                    : type === 'payable'
                      ? 'Ex: Aluguel, Fornecedor de embalagens'
                      : 'Ex: Venda de serviço, Mensalidade cliente'
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor em R$ (BRL) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEditing || (entryMode === 'installment' && installments === 1)
                  ? 'Data de vencimento *'
                  : '1º vencimento *'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Parcelamento Block */}
          {!isEditing && entryMode === 'installment' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Layers className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>Parcelamento</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  {installments === 1 ? 'À vista (1x)' : `${installments} parcelas mensais`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Quantidade de parcelas
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  >
                    <option value={1}>1x (Pagamento único)</option>
                    {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n}x parcelas mensais
                      </option>
                    ))}
                    <option value={36}>36x parcelas mensais</option>
                    <option value={48}>48x parcelas mensais</option>
                    <option value={60}>60x parcelas mensais</option>
                  </select>
                </div>

                {installments > 1 && (
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Cálculo do valor informado
                    </label>
                    <select
                      value={amountMode}
                      onChange={(e) => setAmountMode(e.target.value as 'total' | 'per_installment')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                    >
                      <option value="total">Dividir valor total em {installments}x</option>
                      <option value="per_installment">Repetir valor em cada parcela</option>
                    </select>
                  </div>
                )}
              </div>

              {installmentPreview.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Prévia das parcelas</span>
                    <span className="font-mono-tabular">
                      Total: {formatBRL(installmentPreview.reduce((s, p) => s + p.cents, 0))}
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {installmentPreview.map((p) => (
                      <div
                        key={p.num}
                        className="flex items-center justify-between text-xs font-mono-tabular text-slate-600 dark:text-slate-300 py-0.5"
                      >
                        <span>
                          Parcela {p.num}/{installments} · {formatDateBR(p.dueDate)}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatBRL(p.cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={markFirstSettled}
                  onChange={(e) => setMarkFirstSettled(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600 w-4 h-4"
                />
                <span>
                  {installments > 1
                    ? 'Marcar a 1ª parcela como já paga / recebida'
                    : 'Marcar como já paga / recebida'}
                </span>
              </label>

              {markFirstSettled && (
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    {type === 'receivable' ? 'Forma de recebimento' : 'Forma de pagamento'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Recurring Fixed Account Block */}
          {!isEditing && entryMode === 'recurring' && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-900 dark:text-teal-200">
                  <Repeat className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>Configuração de Conta Recorrente / Fixa</span>
                </div>
                <span className="text-[11px] font-mono-tabular text-teal-700 dark:text-teal-300">
                  {RECURRENCE_LABELS[recurrenceInterval]}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Ideal para água, energia, internet, aluguel ou licenças de software. Além das ocorrências abaixo, ao dar baixa em qualquer vencimento o sistema cria o próximo automaticamente.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Periodicidade
                  </label>
                  <select
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  >
                    <option value="monthly">Mensal (todo mês)</option>
                    <option value="biweekly">Quinzenal (a cada 15 dias)</option>
                    <option value="yearly">Anual (todo ano)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Gerar quantos períodos agora?
                  </label>
                  <select
                    value={recurrenceOccurrences}
                    onChange={(e) => setRecurrenceOccurrences(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  >
                    <option value={1}>Apenas o 1º (renova na baixa)</option>
                    <option value={3}>3 períodos</option>
                    <option value={6}>6 períodos</option>
                    <option value={12}>12 períodos (1 ano)</option>
                    <option value={24}>24 períodos (2 anos)</option>
                  </select>
                </div>
              </div>

              {recurringPreview.length > 0 && (
                <div className="pt-2 border-t border-teal-200/70 dark:border-teal-800/70">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Próximos vencimentos gerados</span>
                    <span className="font-mono-tabular">
                      {recurringPreview.length}x de {formatBRL(parsedCents)}
                    </span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {recurringPreview.map((p) => (
                      <div
                        key={p.num}
                        className="flex items-center justify-between text-xs font-mono-tabular text-slate-600 dark:text-slate-300"
                      >
                        <span>
                          {p.num}º vencimento · {formatDateBR(p.dueDate)}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatBRL(p.cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={markFirstSettled}
                  onChange={(e) => setMarkFirstSettled(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600 w-4 h-4"
                />
                <span>Marcar o 1º vencimento como já pago / recebido</span>
              </label>

              {markFirstSettled && (
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    {type === 'receivable' ? 'Forma de recebimento' : 'Forma de pagamento'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {isEditing && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'pending' | 'settled')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
                  >
                    <option value="pending">Pendente</option>
                    <option value="settled">{type === 'receivable' ? 'Recebido' : 'Pago'}</option>
                  </select>
                </div>
                {status === 'settled' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {type === 'receivable' ? 'Forma de recebimento' : 'Forma de pagamento'}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entryMode === 'recurring'}
                    onChange={(e) => setEntryMode(e.target.checked ? 'recurring' : 'installment')}
                    className="rounded border-slate-300 text-teal-700 w-4 h-4"
                  />
                  <span>Conta Recorrente / Fixa (renova ao dar baixa)</span>
                </label>
                {entryMode === 'recurring' && (
                  <select
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px]"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="yearly">Anual</option>
                  </select>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              >
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cliente / Fornecedor (PF ou PJ)
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              >
                <option value="">Não vinculado</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.personType}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nº Documento / Nota Fiscal
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex: NF-1042"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors min-h-[44px]"
            >
              {isEditing
                ? 'Salvar alterações'
                : entryMode === 'recurring'
                  ? `Salvar recorrente (${recurrenceOccurrences}x)`
                  : installments > 1
                    ? `Gerar ${installments} parcelas`
                    : 'Salvar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
