import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, CreditCard, Repeat, X } from 'lucide-react';
import type { Contact, Transaction } from '../types';
import {
  formatBRL,
  formatDateBR,
  nextRecurrenceDate,
  parseBRLToCents,
  PAYMENT_METHODS,
  RECURRENCE_LABELS,
  todayISO,
} from '../utils/format';

interface SettleModalProps {
  transaction: Transaction;
  contact?: Contact;
  onClose: () => void;
  onConfirm: (
    paymentMethod: string,
    paidAt: string,
    notes: string,
    discountCents: number,
    interestCents: number,
    generateNextRecurring: boolean
  ) => void;
}

export const SettleModal: React.FC<SettleModalProps> = ({
  transaction,
  contact,
  onClose,
  onConfirm,
}) => {
  const isReceivable = transaction.type === 'receivable';
  const [paymentMethod, setPaymentMethod] = useState<string>(
    transaction.paymentMethod || 'PIX'
  );
  const [paidAt, setPaidAt] = useState<string>(todayISO());
  const [discountRaw, setDiscountRaw] = useState<string>('');
  const [interestRaw, setInterestRaw] = useState<string>('');
  const [notes, setNotes] = useState<string>(transaction.notes || '');
  const [generateNextRecurring, setGenerateNextRecurring] = useState<boolean>(
    Boolean(transaction.isRecurring)
  );

  const discountCents = useMemo(() => parseBRLToCents(discountRaw), [discountRaw]);
  const interestCents = useMemo(() => parseBRLToCents(interestRaw), [interestRaw]);

  const finalAmountCents = useMemo(
    () => Math.max(1, transaction.amountCents - discountCents + interestCents),
    [transaction.amountCents, discountCents, interestCents]
  );

  const nextDue = useMemo(() => {
    if (!transaction.isRecurring) return '';
    return nextRecurrenceDate(
      transaction.dueDate,
      transaction.recurrenceInterval || 'monthly',
      1
    );
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(
      paymentMethod,
      paidAt || todayISO(),
      notes.trim(),
      discountCents,
      interestCents,
      Boolean(transaction.isRecurring && generateNextRecurring)
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-5 h-5 ${
                isReceivable ? 'text-emerald-600' : 'text-teal-700 dark:text-teal-400'
              }`}
            />
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              {isReceivable ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5 space-y-1.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {transaction.description}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Venc. {formatDateBR(transaction.dueDate)}
                {contact ? ` · ${contact.name}` : ''}
              </span>
              <span className="font-mono-tabular">
                Original: <strong>{formatBRL(transaction.amountCents)}</strong>
              </span>
            </div>
            {(discountCents > 0 || interestCents > 0) && (
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  Valor final após ajuste:
                </span>
                <span
                  className={`font-mono-tabular font-bold text-sm ${
                    isReceivable
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {formatBRL(finalAmountCents)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                {isReceivable ? 'Forma de recebimento *' : 'Forma de pagamento *'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-colors min-h-[40px] ${
                    paymentMethod === method
                      ? 'border-teal-700 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isReceivable ? 'Data recebimento *' : 'Data pagamento *'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  required
                  className="w-full pl-9 pr-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[42px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Desconto (- R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={discountRaw}
                onChange={(e) => setDiscountRaw(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Juros / Multa (+ R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={interestRaw}
                onChange={(e) => setInterestRaw(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Observação da baixa (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comprovante nº 123"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
            />
          </div>

          {transaction.isRecurring && (
            <label className="flex items-start gap-2.5 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/70 dark:bg-teal-950/30 p-3 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={generateNextRecurring}
                onChange={(e) => setGenerateNextRecurring(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700 w-4 h-4"
              />
              <div className="space-y-0.5">
                <div className="font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" />
                  <span>
                    Gerar próxima conta recorrente (
                    {RECURRENCE_LABELS[transaction.recurrenceInterval || 'monthly']})
                  </span>
                </div>
                <div className="text-teal-700 dark:text-teal-300 font-mono-tabular">
                  Cria automaticamente o próximo vencimento em {formatDateBR(nextDue)} (se ainda não existir).
                </div>
              </div>
            </label>
          )}

          <div className="pt-2 flex items-center justify-between gap-2">
            <div className="text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
              Total: <strong className="text-slate-900 dark:text-white">{formatBRL(finalAmountCents)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl text-white text-sm font-semibold transition-colors min-h-[44px] ${
                  isReceivable
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-teal-700 hover:bg-teal-800'
                }`}
              >
                {isReceivable ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
