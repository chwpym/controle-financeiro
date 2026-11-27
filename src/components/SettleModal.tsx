/**
 * EN: Settlement / Payment Confirmation Modal with Partial Settlement Split Support (Phase 11.1.2).
 *     Allows entering the exact `Valor Recebido / Pago`. When `paidAmountCents < netTotalCents`,
 *     surfaces the Partial Settlement checkbox (`Baixa Parcial: Quitar R$ X e gerar nova parcela com
 *     o saldo restante R$ Y`) with an adjustable due date (`+30 dias` default) for the remaining balance.
 * PT: Modal de Liquidação / Baixa com Suporte a Baixa Parcial e Desdobro de Saldo Devedor (Etapa 11.1.2).
 *     Permite informar o valor efetivamente pago/recebido. Quando menor que o valor líquido da conta,
 *     exibe a opção de Baixa Parcial com geração automática de nova parcela para o saldo remanescente.
 */

import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, CreditCard, GitBranch, Repeat, X } from 'lucide-react';
import type { Contact, Transaction } from '../types';
import {
  addDaysISO,
  formatBRL,
  formatDateBR,
  formatInputBRL,
  nextRecurrenceDate,
  parseBRLToCents,
  PAYMENT_METHODS,
  RECURRENCE_LABELS,
  todayISO,
} from '../utils/format';

export interface PartialSettlementOptions {
  isPartial: true;
  paidAmountCents: number;
  remainderDueDate: string;
}

export interface SettleModalProps {
  transaction: Transaction;
  contact?: Contact;
  onClose: () => void;
  onConfirm: (
    paymentMethod: string,
    paidAt: string,
    notes: string,
    discountCents: number,
    interestCents: number,
    generateNextRecurring: boolean,
    partialOptions?: PartialSettlementOptions
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
  const [paidAmountRaw, setPaidAmountRaw] = useState<string>(() =>
    formatInputBRL(transaction.amountCents)
  );
  const [customPaidEdited, setCustomPaidEdited] = useState<boolean>(false);
  const [enablePartialSplit, setEnablePartialSplit] = useState<boolean>(true);
  const [remainderDueDate, setRemainderDueDate] = useState<string>(() =>
    addDaysISO(transaction.dueDate || todayISO(), 30)
  );
  const [notes, setNotes] = useState<string>(transaction.notes || '');
  const [generateNextRecurring, setGenerateNextRecurring] = useState<boolean>(
    Boolean(transaction.isRecurring)
  );

  const discountCents = useMemo(() => parseBRLToCents(discountRaw), [discountRaw]);
  const interestCents = useMemo(() => parseBRLToCents(interestRaw), [interestRaw]);

  const netFullAmountCents = useMemo(
    () => Math.max(1, transaction.amountCents - discountCents + interestCents),
    [transaction.amountCents, discountCents, interestCents]
  );

  const effectivePaidCents = useMemo(() => {
    if (!customPaidEdited) return netFullAmountCents;
    return parseBRLToCents(paidAmountRaw);
  }, [customPaidEdited, paidAmountRaw, netFullAmountCents]);

  const isPartialCandidate =
    customPaidEdited && effectivePaidCents > 0 && effectivePaidCents < netFullAmountCents;

  const remainderCents = isPartialCandidate
    ? Math.max(1, netFullAmountCents - effectivePaidCents)
    : 0;

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
    if (isPartialCandidate && enablePartialSplit) {
      onConfirm(
        paymentMethod,
        paidAt || todayISO(),
        notes.trim(),
        0,
        0,
        false,
        {
          isPartial: true,
          paidAmountCents: effectivePaidCents,
          remainderDueDate: remainderDueDate || addDaysISO(transaction.dueDate, 30),
        }
      );
      onClose();
      return;
    }

    // If user typed a lower value and unchecked Partial Split, treat difference as discount
    const resolvedDiscount =
      isPartialCandidate && !enablePartialSplit
        ? discountCents + remainderCents
        : discountCents;

    onConfirm(
      paymentMethod,
      paidAt || todayISO(),
      notes.trim(),
      resolvedDiscount,
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
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
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
                Total da Conta: <strong>{formatBRL(transaction.amountCents)}</strong>
              </span>
            </div>
          </div>

          {/* Paid / Received Value Field (Supports Partial Settlement) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="settle-paid-amount"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {isReceivable ? 'Valor Recebido Agora (R$) *' : 'Valor Pago Agora (R$) *'}
              </label>
              <input
                id="settle-paid-amount"
                data-testid="settle-paid-amount-input"
                type="text"
                inputMode="decimal"
                value={customPaidEdited ? paidAmountRaw : formatInputBRL(netFullAmountCents)}
                onChange={(e) => {
                  setCustomPaidEdited(true);
                  setPaidAmountRaw(e.target.value);
                }}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl border border-teal-500/60 dark:border-teal-600/70 bg-white dark:bg-slate-950 text-sm font-bold font-mono-tabular min-h-[42px]"
              />
            </div>

            <div>
              <label
                htmlFor="settle-paid-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {isReceivable ? 'Data recebimento *' : 'Data pagamento *'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="settle-paid-date"
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  required
                  className="w-full pl-9 pr-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[42px]"
                />
              </div>
            </div>
          </div>

          {/* Solução B: Partial Settlement Split Box when Paid < Total */}
          {isPartialCandidate && (
            <div
              data-testid="partial-settlement-panel"
              className="rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/35 p-3.5 space-y-2.5 text-xs"
            >
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePartialSplit}
                  onChange={(e) => setEnablePartialSplit(e.target.checked)}
                  data-testid="partial-settlement-checkbox"
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 w-4 h-4 shrink-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Baixa Parcial: Quitar {formatBRL(effectivePaidCents)} e gerar nova parcela com o saldo restante ({formatBRL(remainderCents)})
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                    Mantém o saldo devedor em aberto vinculado ao mesmo parcelamento sem lançar desconto indevido.
                  </p>
                </div>
              </label>

              {enablePartialSplit && (
                <div className="pt-2 border-t border-indigo-200/80 dark:border-indigo-800/70 flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="partial-remainder-due-date"
                    className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200"
                  >
                    Vencimento do saldo restante ({formatBRL(remainderCents)}):
                  </label>
                  <input
                    id="partial-remainder-due-date"
                    data-testid="partial-remainder-duedate-input"
                    type="date"
                    value={remainderDueDate}
                    onChange={(e) => setRemainderDueDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 font-mono-tabular text-xs min-h-[36px]"
                  />
                </div>
              )}
            </div>
          )}

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
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-colors min-h-[40px] cursor-pointer ${
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

          {!isPartialCandidate && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Desconto (- R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={discountRaw}
                  onChange={(e) => {
                    setCustomPaidEdited(false);
                    setDiscountRaw(e.target.value);
                  }}
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[40px]"
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
                  onChange={(e) => {
                    setCustomPaidEdited(false);
                    setInterestRaw(e.target.value);
                  }}
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[40px]"
                />
              </div>
            </div>
          )}

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

          {transaction.isRecurring && !isPartialCandidate && (
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
              Baixar agora:{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatBRL(effectivePaidCents > 0 ? effectivePaidCents : netFullAmountCents)}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={customPaidEdited && effectivePaidCents <= 0}
                data-testid="settle-confirm-btn"
                className={`px-5 py-2 rounded-xl text-white text-sm font-semibold transition-colors min-h-[44px] disabled:opacity-50 cursor-pointer ${
                  isReceivable
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-teal-700 hover:bg-teal-800'
                }`}
              >
                {isPartialCandidate && enablePartialSplit
                  ? 'Confirmar Baixa Parcial'
                  : isReceivable
                    ? 'Confirmar Recebimento'
                    : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
