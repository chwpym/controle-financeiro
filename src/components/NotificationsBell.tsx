import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Settings, SlidersHorizontal } from 'lucide-react';
import type { Contact, Transaction } from '../types';
import { daysUntilDue, formatBRL, formatDateBR, todayISO } from '../utils/format';

interface NotificationsBellProps {
  alerts: Transaction[];
  contacts: Contact[];
  notifyLeadDays: number;
  inAppAlertsEnabled: boolean;
  onToggleInAppAlerts: (enabled: boolean) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  onOpenConsult: (tx: Transaction) => void;
  onQuickSettle: (tx: Transaction) => void;
  onNavigateToTransactions: (filter?: string) => void;
  onOpenSettings: () => void;
  onOpenAlertsDrawer?: () => void;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({
  alerts,
  contacts,
  notifyLeadDays,
  inAppAlertsEnabled,
  onToggleInAppAlerts,
  notificationPermission,
  onRequestNotificationPermission,
  onOpenConsult,
  onQuickSettle,
  onNavigateToTransactions,
  onOpenSettings,
  onOpenAlertsDrawer,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = todayISO();
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const activeCount = inAppAlertsEnabled ? alerts.length : 0;

  const leadDescription =
    notifyLeadDays === 0
      ? 'Vencidas ou vencendo hoje'
      : notifyLeadDays === 1
        ? 'Vencidas ou em até 1 dia'
        : `Vencidas ou em até ${notifyLeadDays} dias`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          inAppAlertsEnabled
            ? `Avisos de vencimento (${activeCount})`
            : 'Avisos de vencimento (desativados)'
        }
        title={
          inAppAlertsEnabled
            ? activeCount > 0
              ? `${activeCount} aviso(s) de vencimento`
              : 'Nenhum aviso de vencimento no momento'
            : 'Avisos no sistema desativados'
        }
        className={`relative min-h-[40px] inline-flex items-center gap-2 px-3 sm:px-3.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
          open
            ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600'
            : inAppAlertsEnabled && activeCount > 0
              ? 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800 dark:bg-teal-700 dark:border-teal-600 dark:hover:bg-teal-600'
              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span className="relative inline-flex items-center justify-center">
          {inAppAlertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 opacity-70" />}
          {inAppAlertsEnabled && activeCount > 0 && (
            <span
              className={`-top-2 -right-2 absolute min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold font-mono-tabular flex items-center justify-center leading-none ring-2 ${
                open || activeCount > 0
                  ? 'bg-rose-600 text-white ring-teal-700 dark:ring-teal-700'
                  : 'bg-rose-600 text-white ring-white dark:ring-slate-900'
              }`}
            >
              {activeCount > 99 ? '99+' : activeCount}
            </span>
          )}
        </span>
        <span className="hidden sm:inline tracking-wide uppercase">Avisos</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Central de avisos de vencimento"
          className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-16 sm:top-full sm:mt-2 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden"
        >
          {/* Popover Header */}
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/50">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
                  Avisos de Vencimento
                </h3>
                {inAppAlertsEnabled && (
                  <span className="text-xs font-mono-tabular font-semibold text-slate-500 dark:text-slate-400">
                    ({alerts.length})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {leadDescription}
              </p>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 select-none">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {inAppAlertsEnabled ? 'Ativo' : 'Pausado'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={inAppAlertsEnabled}
                aria-label="Alternar avisos no sistema"
                onClick={() => onToggleInAppAlerts(!inAppAlertsEnabled)}
                className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
                  inAppAlertsEnabled
                    ? 'bg-teal-700 dark:bg-teal-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    inAppAlertsEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Popover Body */}
          {!inAppAlertsEnabled ? (
            <div className="p-6 text-center space-y-3">
              <BellOff className="w-8 h-8 mx-auto text-slate-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Avisos no sistema pausados
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ative a chave acima para voltar a visualizar lembretes de contas a vencer na barra superior.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleInAppAlerts(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px]"
              >
                <Bell className="w-3.5 h-3.5" />
                Ativar avisos
              </button>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Nenhum vencimento próximo
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Não há contas vencidas ou com vencimento dentro do prazo configurado ({notifyLeadDays}{' '}
                {notifyLeadDays === 1 ? 'dia' : 'dias'}).
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.slice(0, 5).map((tx) => {
                const diff = daysUntilDue(tx.dueDate, today);
                const contact = tx.contactId ? contactMap.get(tx.contactId) : undefined;
                const dueLabel =
                  diff < 0
                    ? `Vencida há ${Math.abs(diff)}d`
                    : diff === 0
                      ? 'Vence hoje'
                      : `Vence em ${diff}d`;

                return (
                  <div
                    key={tx.id}
                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onOpenConsult(tx);
                        }}
                        className="text-left text-xs font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 truncate block w-full"
                      >
                        {tx.description}
                      </button>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span
                          className={`font-semibold ${
                            diff < 0
                              ? 'text-red-600 dark:text-red-400'
                              : diff === 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {dueLabel}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                          {formatDateBR(tx.dueDate)}
                        </span>
                        {contact && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                              {contact.name}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs font-mono-tabular">
                        <span
                          className={`font-bold ${
                            tx.type === 'receivable'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {formatBRL(tx.amountCents)}
                        </span>
                        <span className="text-[11px] font-sans text-slate-400">
                          {tx.type === 'receivable' ? 'A Receber' : 'A Pagar'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onQuickSettle(tx);
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold hover:opacity-90 min-h-[34px]"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {tx.type === 'receivable' ? 'Receber' : 'Pagar'}
                    </button>
                  </div>
                );
              })}
              {alerts.length > 5 && (
                <div className="px-4 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                  Mostrando 5 de {alerts.length} pendências urgentes.
                </div>
              )}
            </div>
          )}

          {/* Popover Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1"
              >
                <Settings className="w-3.5 h-3.5" />
                Antecedência ({notifyLeadDays}d)
              </button>
              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline py-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Push navegador
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (onOpenAlertsDrawer) {
                  onOpenAlertsDrawer();
                } else {
                  onNavigateToTransactions('pending');
                }
              }}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline py-1"
              data-testid="notifications-see-all-alerts"
            >
              Ver todos os avisos →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
