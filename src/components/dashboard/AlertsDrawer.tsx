import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  X,
} from 'lucide-react';
import type { Company, Contact, Transaction } from '../../types';
import { daysUntilDue, formatBRL, formatDateBR, todayISO } from '../../utils/format';

export interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Transaction[];
  contacts: Contact[];
  companies?: Company[];
  onQuickSettle: (tx: Transaction) => void;
  onOpenConsult?: (tx: Transaction) => void;
}

export type AlertFilterDeadline = 'all' | 'overdue' | 'today' | '3days';

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  contacts,
  companies = [],
  onQuickSettle,
  onOpenConsult,
}) => {
  const [filter, setFilter] = useState<AlertFilterDeadline>('all');
  const today = todayISO();

  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset filter when opened
  useEffect(() => {
    if (isOpen) {
      setFilter('all');
    }
  }, [isOpen]);

  const { itemsWithStatus, countOverdue, countToday, count3days, totalPendingCents } = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let next3daysCount = 0;
    let sumCents = 0;

    const mapped = alerts.map((tx) => {
      const days = daysUntilDue(tx.dueDate, today);
      sumCents += tx.amountCents;

      let statusKind: 'overdue' | 'today' | '3days' | 'future' = 'future';
      if (days < 0) {
        statusKind = 'overdue';
        overdueCount++;
      } else if (days === 0) {
        statusKind = 'today';
        todayCount++;
      } else if (days > 0 && days <= 3) {
        statusKind = '3days';
        next3daysCount++;
      }

      return {
        tx,
        days,
        statusKind,
      };
    });

    return {
      itemsWithStatus: mapped,
      countOverdue: overdueCount,
      countToday: todayCount,
      count3days: next3daysCount,
      totalPendingCents: sumCents,
    };
  }, [alerts, today]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return itemsWithStatus;
    if (filter === 'overdue') return itemsWithStatus.filter((i) => i.statusKind === 'overdue');
    if (filter === 'today') return itemsWithStatus.filter((i) => i.statusKind === 'today');
    if (filter === '3days') return itemsWithStatus.filter((i) => i.statusKind === '3days');
    return itemsWithStatus;
  }, [itemsWithStatus, filter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="alerts-drawer-backdrop"
    >
      <div
        className="relative w-full max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300"
        data-testid="alerts-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Avisos e Pendências de Vencimento"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Central de Avisos e Vencimentos</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold font-mono-tabular">
                  {alerts.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total pendente acumulado: <strong className="font-mono-tabular text-slate-700 dark:text-slate-200">{formatBRL(totalPendingCents)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar gaveta (Esc)"
            data-testid="alerts-drawer-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 shrink-0 bg-slate-50/40 dark:bg-slate-950/20">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] ${
              filter === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            data-testid="alerts-filter-all"
          >
            <span>Todas</span>
            <span className="font-mono-tabular px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/15 text-[10px]">
              {alerts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] ${
              filter === 'overdue'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
            data-testid="alerts-filter-overdue"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Vencidas</span>
            <span className="font-mono-tabular px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/15 text-[10px]">
              {countOverdue}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] ${
              filter === 'today'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
            data-testid="alerts-filter-today"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Vencendo Hoje</span>
            <span className="font-mono-tabular px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/15 text-[10px]">
              {countToday}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('3days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] ${
              filter === '3days'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-900/60 hover:bg-teal-50 dark:hover:bg-teal-950/30'
            }`}
            data-testid="alerts-filter-3days"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Próximos 3 dias</span>
            <span className="font-mono-tabular px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/15 text-[10px]">
              {count3days}
            </span>
          </button>
        </div>

        {/* Drawer Body - Alert Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3" data-testid="alerts-drawer-list">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Tudo em dia por aqui!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nenhum aviso encontrado para o filtro selecionado.
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map(({ tx, days, statusKind }) => {
              const contact = tx.contactId ? contactMap.get(tx.contactId) : null;
              const company = tx.companyId ? companyMap.get(tx.companyId) : null;
              const isReceivable = tx.type === 'receivable';

              return (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  data-testid={`alert-card-${tx.id}`}
                >
                  <div className="min-w-0 space-y-1.5">
                    {/* Header line: badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {statusKind === 'overdue' ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wider border border-rose-200 dark:border-rose-800/60">
                          Vencida há {Math.abs(days)} {Math.abs(days) === 1 ? 'dia' : 'dias'}
                        </span>
                      ) : statusKind === 'today' ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800/60">
                          Vence Hoje
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 text-[10px] font-bold uppercase tracking-wider border border-teal-200 dark:border-teal-800/60">
                          Vence em {days} {days === 1 ? 'dia' : 'dias'}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isReceivable
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isReceivable ? 'A Receber' : 'A Pagar'}
                      </span>

                      {company && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border"
                          style={{
                            backgroundColor: `${company.color || '#0F766E'}15`,
                            color: company.color || '#0F766E',
                            borderColor: `${company.color || '#0F766E'}30`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: company.color || '#0F766E' }}
                          />
                          <span className="truncate max-w-[120px]">
                            {company.tradeName || company.legalName}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {tx.description}
                    </h4>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>Vencimento: <strong className="font-mono-tabular text-slate-700 dark:text-slate-300">{formatDateBR(tx.dueDate)}</strong></span>
                      {contact && (
                        <span>
                          {contact.personType === 'PJ' ? '🏢' : '👤'} {contact.tradeName || contact.name}
                        </span>
                      )}
                      {tx.installmentTotal > 1 && (
                        <span className="font-mono-tabular">
                          Parcela {tx.installmentNumber}/{tx.installmentTotal}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Amount */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <div
                        className={`text-base font-bold font-mono-tabular ${
                          isReceivable
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {formatBRL(tx.amountCents)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onOpenConsult && (
                        <button
                          type="button"
                          onClick={() => onOpenConsult(tx)}
                          aria-label="Consultar detalhes"
                          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onQuickSettle(tx)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity min-h-[36px]"
                        data-testid={`quick-settle-${tx.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isReceivable ? 'Receber' : 'Pagar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Exibindo <strong>{filteredItems.length}</strong> de <strong>{alerts.length}</strong> aviso(s)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[36px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
