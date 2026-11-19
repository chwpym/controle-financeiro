import React, { useEffect, useId, useMemo, useState } from 'react';
import { Eye, X } from 'lucide-react';
import type { Contact, Transaction } from '../types';
import { currentMonthKey, formatBRL, formatDateBR, isOverdue, todayISO } from '../utils/format';
import { KpiCard } from './common/KpiCard';
import {
  createDateFilterState,
  DateRangeFilter,
  matchesDateFilter,
  type DateFilterValue,
} from './DateRangeFilter';

export interface ContactHistoryModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  selectedMonth?: string;
  onOpenConsult: (tx: Transaction) => void;
}

/**
 * Modal de Ficha Financeira do contato com extrato filtrado por período, KPIs e consulta de recibo.
 */
export const ContactHistoryModal: React.FC<ContactHistoryModalProps> = ({
  contact,
  isOpen,
  onClose,
  transactions,
  selectedMonth = currentMonthKey(),
  onOpenConsult,
}) => {
  const titleId = useId();
  const [historyDateFilter, setHistoryDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'all')
  );

  useEffect(() => {
    if (isOpen) {
      setHistoryDateFilter(createDateFilterState(selectedMonth, 'all'));
    }
  }, [isOpen, contact?.id, selectedMonth]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const today = todayISO();

  const history = useMemo(() => {
    return transactions
      .filter((tx) => matchesDateFilter(tx, historyDateFilter, selectedMonth))
      .slice()
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [transactions, historyDateFilter, selectedMonth]);

  const { settledCents, pendingCents, overdueCents } = useMemo(() => {
    let settled = 0;
    let pending = 0;
    let overdue = 0;
    for (const tx of history) {
      if (tx.status === 'settled') settled += tx.amountCents;
      if (tx.status === 'pending') pending += tx.amountCents;
      if (isOverdue(tx, today)) overdue += tx.amountCents;
    }
    return { settledCents: settled, pendingCents: pending, overdueCents: overdue };
  }, [history, today]);

  if (!isOpen || !contact) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden overscroll-contain"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="text-base font-display font-semibold text-slate-900 dark:text-white truncate"
            >
              Ficha Financeira — {contact.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              {contact.personType}
              {contact.document ? ` · ${contact.document}` : ''}
              {contact.city ? ` · ${contact.city}/${contact.state}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto overscroll-contain">
          <DateRangeFilter
            value={historyDateFilter}
            onChange={setHistoryDateFilter}
            selectedMonth={selectedMonth}
            modes={['all', 'month', 'year', 'custom']}
            showDateFieldSelector
            compact
          />

          <div className="grid grid-cols-3 gap-3">
            <KpiCard title="Liquidado" amountCents={settledCents} tone="positive" compact />
            <KpiCard title="Em aberto" amountCents={pendingCents} tone="neutral" compact />
            <KpiCard title="Vencido" amountCents={overdueCents} tone="danger" compact />
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {transactions.length === 0
                ? 'Nenhuma conta a pagar ou receber vinculada a este contato ainda.'
                : 'Nenhuma conta vinculada encontrada para o período selecionado.'}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((tx) => {
                const overdue = isOverdue(tx, today);
                const statusLabel =
                  tx.status === 'settled'
                    ? tx.type === 'receivable'
                      ? 'Recebido'
                      : 'Pago'
                    : overdue
                      ? 'Vencido'
                      : 'Pendente';
                const statusColor =
                  tx.status === 'settled'
                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                    : overdue
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-amber-600 dark:text-amber-400 font-semibold';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenConsult(tx)}
                        className="text-left font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer"
                      >
                        {tx.description}
                      </button>
                      <div className="text-slate-500 dark:text-slate-400 font-mono-tabular mt-0.5">
                        Venc. {formatDateBR(tx.dueDate)} ·{' '}
                        {tx.type === 'receivable' ? 'A Receber' : 'A Pagar'} ·{' '}
                        <span className={statusColor}>{statusLabel}</span>
                        {tx.paymentMethod ? ` (${tx.paymentMethod})` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono-tabular font-bold ${
                          tx.type === 'receivable'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {formatBRL(tx.amountCents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenConsult(tx)}
                        title="Consultar e gerar recibo PDF"
                        aria-label={`Consultar ${tx.description}`}
                        className="p-1.5 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
