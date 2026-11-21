import React, { useMemo } from 'react';
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react';
import type { Contact, Transaction } from '../../types';
import {
  daysUntilDue,
  formatBRL,
  formatDateBR,
  todayISO,
} from '../../utils/format';

export interface DueAlertsCardProps {
  transactions: Transaction[];
  contacts: Contact[];
  notifyLeadDays: number;
  inAppAlertsEnabled: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  onQuickSettle: (tx: Transaction) => void;
  onOpenConsult: (tx: Transaction) => void;
  onNavigateToTransactions: (filter?: string) => void;
  dragControls?: React.ReactNode;
}

export const DueAlertsCard: React.FC<DueAlertsCardProps> = ({
  transactions,
  contacts,
  notifyLeadDays,
  inAppAlertsEnabled,
  notificationPermission,
  onRequestNotificationPermission,
  onQuickSettle,
  onOpenConsult,
  onNavigateToTransactions,
  dragControls,
}) => {
  const today = todayISO();
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  // Due-date alerts (all pending overdue or due within notifyLeadDays)
  const alerts = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.status !== 'pending') return false;
        const diff = daysUntilDue(t.dueDate, today);
        return diff <= notifyLeadDays;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);
  }, [transactions, today, notifyLeadDays]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Alertas de Vencimento
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {notifyLeadDays === 0
                ? 'Contas vencidas ou com vencimento hoje'
                : notifyLeadDays === 1
                  ? 'Contas vencidas ou com vencimento nas próximas 24 horas (1 dia)'
                  : `Contas vencidas ou com vencimento nos próximos ${notifyLeadDays} dias`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {notificationPermission !== 'unsupported' && notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={onRequestNotificationPermission}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[36px]"
            >
              <Bell className="w-3.5 h-3.5" />
              Ativar alertas no navegador
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateToTransactions('pending')}
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline px-2 py-1"
          >
            Ver todas as contas
          </button>
          {dragControls}
        </div>
      </div>

      {!inAppAlertsEnabled ? (
        <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
          <BellOff className="w-5 h-5 text-slate-400" />
          <span>Avisos no sistema desativados nas preferências de notificação.</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {notifyLeadDays === 0
            ? 'Nenhum vencimento crítico encontrado para hoje.'
            : notifyLeadDays === 1
              ? 'Nenhum vencimento crítico encontrado para o próximo 1 dia.'
              : `Nenhum vencimento crítico encontrado para os próximos ${notifyLeadDays} dias.`}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {alerts.map((tx) => {
            const diff = daysUntilDue(tx.dueDate, today);
            const contact = tx.contactId ? contactMap.get(tx.contactId) : undefined;
            const dueLabel =
              diff < 0
                ? `Vencida há ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? 's' : ''}`
                : diff === 0
                  ? 'Vence hoje'
                  : `Vence em ${diff} dia${diff > 1 ? 's' : ''}`;

            return (
              <div
                key={tx.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenConsult(tx)}
                      title="Consultar lançamento (somente leitura)"
                      className="text-left text-sm font-medium text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 truncate"
                    >
                      {tx.description}
                    </button>
                    <span
                      className={`text-xs font-semibold ${
                        diff < 0
                          ? 'text-red-600 dark:text-red-400'
                          : diff === 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      · {dueLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>{tx.type === 'payable' ? 'A Pagar' : 'A Receber'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">Venc. {formatDateBR(tx.dueDate)}</span>
                    {contact && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{contact.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span
                    className={`text-sm font-mono-tabular font-semibold ${
                      tx.type === 'receivable'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {formatBRL(tx.amountCents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQuickSettle(tx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity min-h-[38px]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {tx.type === 'receivable' ? 'Receber' : 'Pagar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
