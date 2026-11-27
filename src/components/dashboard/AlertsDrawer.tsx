/**
 * EN: Executive & Detailed Due-Date Alerts Drawer (v1.11.0).
 *     Features a top segmented toggle:
 *       - `[ 📋 Resumo Executivo ]` (default): Consolidates overdue payables, due-today accounts,
 *         next-3-days accounts, and pending receivables into clean summary rows with counts,
 *         accumulated BRL totals, and direct navigation buttons that close the drawer and filter
 *         the Transactions screen.
 *       - `[ 📄 Lista Detalhada ]`: Displays individual alert cards with deadline filter pills and
 *         1-click `[ Pagar ]` / `[ Receber ]` actions.
 * PT: Central de Avisos com Visão Executiva e Lista Detalhada (v1.11.0).
 *     Possui controle segmentado no topo:
 *       - `[ 📋 Resumo Executivo ]` (padrão): Agrupa contas a pagar vencidas, vencendo hoje,
 *         próximos 3 dias e contas a receber pendentes em linhas consolidadas com totais em BRL
 *         e botões de navegação direta.
 *       - `[ 📄 Lista Detalhada ]`: Mantém os cards individuais com filtros de prazo e baixa rápida.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  X,
} from 'lucide-react';
import type { Company, Contact, Transaction } from '../../types';
import { daysUntilDue, formatBRL, formatDateBR, todayISO } from '../../utils/format';

export interface AlertsNavigationTarget {
  statusFilter?: string;
  typeFilter?: 'all' | 'payable' | 'receivable';
}

export interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Transaction[];
  contacts: Contact[];
  companies?: Company[];
  onQuickSettle: (tx: Transaction) => void;
  onOpenConsult?: (tx: Transaction) => void;
  onNavigateToTransactions?: (target: AlertsNavigationTarget) => void;
}

export type AlertFilterDeadline = 'all' | 'overdue' | 'today' | '3days';
export type AlertsViewMode = 'executive' | 'detailed';

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  contacts,
  companies = [],
  onQuickSettle,
  onOpenConsult,
  onNavigateToTransactions,
}) => {
  const [viewMode, setViewMode] = useState<AlertsViewMode>('executive');
  const [filter, setFilter] = useState<AlertFilterDeadline>('all');
  const today = todayISO();

  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  // Close on Escape / Fechar na tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset to default Executive Summary view when opened / Restaurar visão executiva ao abrir
  useEffect(() => {
    if (isOpen) {
      setViewMode('executive');
      setFilter('all');
    }
  }, [isOpen]);

  const {
    itemsWithStatus,
    countOverdue,
    countToday,
    count3days,
    totalPendingCents,
    executiveBuckets,
  } = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let next3daysCount = 0;
    let sumCents = 0;

    // Consolidated Executive Summary counters (Payables vs Receivables)
    let overduePayablesCount = 0;
    let overduePayablesCents = 0;
    let dueTodayCount = 0;
    let dueTodayCents = 0;
    let due3DaysCount = 0;
    let due3DaysCents = 0;
    let futurePayablesCount = 0;
    let futurePayablesCents = 0;
    let receivablesCount = 0;
    let receivablesCents = 0;

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

      if (tx.type === 'receivable') {
        receivablesCount++;
        receivablesCents += tx.amountCents;
      }

      if (tx.type === 'payable' && days < 0) {
        overduePayablesCount++;
        overduePayablesCents += tx.amountCents;
      } else if (days === 0) {
        dueTodayCount++;
        dueTodayCents += tx.amountCents;
      } else if (days > 0 && days <= 3) {
        due3DaysCount++;
        due3DaysCents += tx.amountCents;
      } else if (tx.type === 'payable' && days > 3) {
        futurePayablesCount++;
        futurePayablesCents += tx.amountCents;
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
      executiveBuckets: {
        overduePayablesCount,
        overduePayablesCents,
        dueTodayCount,
        dueTodayCents,
        due3DaysCount,
        due3DaysCents,
        futurePayablesCount,
        futurePayablesCents,
        receivablesCount,
        receivablesCents,
      },
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

  const handleActionNavigate = (
    target: AlertsNavigationTarget,
    fallbackDeadlineFilter: AlertFilterDeadline
  ) => {
    if (onNavigateToTransactions) {
      onClose();
      onNavigateToTransactions(target);
    } else {
      // Fallback when rendered standalone without navigation callback: switch to Detailed List with filter
      setFilter(fallbackDeadlineFilter);
      setViewMode('detailed');
    }
  };

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
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="truncate">Central de Avisos e Vencimentos</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold font-mono-tabular shrink-0">
                  {alerts.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total pendente acumulado:{' '}
                <strong className="font-mono-tabular text-slate-700 dark:text-slate-200">
                  {formatBRL(totalPendingCents)}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar gaveta (Esc)"
            data-testid="alerts-drawer-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Segmented Control: [ 📋 Resumo Executivo ] | [ 📄 Lista Detalhada ] */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 space-y-3 shrink-0">
          <div
            role="tablist"
            aria-label="Modo de visualização dos avisos"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'executive'}
              data-testid="alerts-mode-executive"
              onClick={() => setViewMode('executive')}
              className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                viewMode === 'executive'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
              <span>📋 Resumo Executivo</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'detailed'}
              data-testid="alerts-mode-detailed"
              onClick={() => setViewMode('detailed')}
              className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                viewMode === 'detailed'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
              <span>📄 Lista Detalhada ({alerts.length})</span>
            </button>
          </div>

          {/* Deadline Filter Pills (shown only in Detailed List mode) */}
          {viewMode === 'detailed' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[32px] cursor-pointer ${
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
          )}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3" data-testid="alerts-drawer-list">
          {alerts.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Tudo em dia por aqui!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nenhuma pendência ou vencimento próximo no momento.
                </p>
              </div>
            </div>
          ) : viewMode === 'executive' ? (
            /* MODE 1: Consolidated Executive Summary / Visão Executiva Agrupada */
            <div className="space-y-3" data-testid="alerts-executive-summary">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visão consolidada por prioridade financeira. Clique em uma linha para filtrar diretamente na tela de Contas ou alterne para a <strong>Lista Detalhada</strong> acima.
              </p>

              {/* 🔴 Contas a Pagar Vencidas */}
              {executiveBuckets.overduePayablesCount > 0 && (
                <div
                  data-testid="exec-topic-overdue-payables"
                  className="rounded-2xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/50 dark:bg-rose-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                      <span aria-hidden="true">🔴</span>
                      <span>Contas a Pagar Vencidas</span>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-300">
                      <strong>{executiveBuckets.overduePayablesCount}</strong> duplicata(s) totalizando{' '}
                      <strong className="font-mono-tabular">
                        {formatBRL(executiveBuckets.overduePayablesCents)}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="exec-btn-overdue-payables"
                    onClick={() =>
                      handleActionNavigate(
                        { statusFilter: 'overdue', typeFilter: 'payable' },
                        'overdue'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shrink-0 min-h-[38px] cursor-pointer"
                  >
                    <span>Ver no Contas a Pagar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 🟡 Contas a Vencer Hoje */}
              {executiveBuckets.dueTodayCount > 0 && (
                <div
                  data-testid="exec-topic-today"
                  className="rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/50 dark:bg-amber-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <span aria-hidden="true">🟡</span>
                      <span>Contas a Vencer Hoje</span>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-300">
                      <strong>{executiveBuckets.dueTodayCount}</strong> conta(s) totalizando{' '}
                      <strong className="font-mono-tabular">
                        {formatBRL(executiveBuckets.dueTodayCents)}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="exec-btn-today"
                    onClick={() =>
                      handleActionNavigate(
                        { statusFilter: 'pending', typeFilter: 'all' },
                        'today'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shrink-0 min-h-[38px] cursor-pointer"
                  >
                    <span>Ver Contas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 🟢 Contas a Vencer nos Próximos 3 Dias */}
              {executiveBuckets.due3DaysCount > 0 && (
                <div
                  data-testid="exec-topic-3days"
                  className="rounded-2xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/50 dark:bg-emerald-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                      <span aria-hidden="true">🟢</span>
                      <span>Contas a Vencer nos Próximos 3 Dias</span>
                    </div>
                    <p className="text-xs text-emerald-900 dark:text-emerald-300">
                      <strong>{executiveBuckets.due3DaysCount}</strong> conta(s) totalizando{' '}
                      <strong className="font-mono-tabular">
                        {formatBRL(executiveBuckets.due3DaysCents)}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="exec-btn-3days"
                    onClick={() =>
                      handleActionNavigate(
                        { statusFilter: 'pending', typeFilter: 'all' },
                        '3days'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors shrink-0 min-h-[38px] cursor-pointer"
                  >
                    <span>Ver Contas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Contas a Pagar Futuras (> 3 dias quando antecedência configurada for maior) */}
              {executiveBuckets.futurePayablesCount > 0 && (
                <div
                  data-testid="exec-topic-future-payables"
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span aria-hidden="true">📅</span>
                      <span>Demais Contas a Pagar no Prazo de Alerta</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>{executiveBuckets.futurePayablesCount}</strong> conta(s) totalizando{' '}
                      <strong className="font-mono-tabular">
                        {formatBRL(executiveBuckets.futurePayablesCents)}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleActionNavigate(
                        { statusFilter: 'pending', typeFilter: 'payable' },
                        'all'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 min-h-[38px] cursor-pointer"
                  >
                    <span>Ver no Contas a Pagar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 🔵 Contas a Receber Pendentes */}
              {executiveBuckets.receivablesCount > 0 && (
                <div
                  data-testid="exec-topic-receivables"
                  className="rounded-2xl border border-sky-200 dark:border-sky-900/70 bg-sky-50/50 dark:bg-sky-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-sky-950 dark:text-sky-200 flex items-center gap-2">
                      <span aria-hidden="true">🔵</span>
                      <span>Contas a Receber Pendentes</span>
                    </div>
                    <p className="text-xs text-sky-900 dark:text-sky-300">
                      <strong>{executiveBuckets.receivablesCount}</strong> fatura(s) totalizando{' '}
                      <strong className="font-mono-tabular">
                        {formatBRL(executiveBuckets.receivablesCents)}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="exec-btn-receivables"
                    onClick={() =>
                      handleActionNavigate(
                        { statusFilter: 'pending', typeFilter: 'receivable' },
                        'all'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors shrink-0 min-h-[38px] cursor-pointer"
                  >
                    <span>Ver no Contas a Receber</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
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
            /* MODE 2: Detailed Individual Cards List / Lista Detalhada de Cards */
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
                      <span>
                        Vencimento:{' '}
                        <strong className="font-mono-tabular text-slate-700 dark:text-slate-300">
                          {formatDateBR(tx.dueDate)}
                        </strong>
                      </span>
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
                          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors cursor-pointer"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onQuickSettle(tx)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity min-h-[36px] cursor-pointer"
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
            {viewMode === 'executive' ? (
              <>
                Resumo consolidado de <strong>{alerts.length}</strong> pendência(s)
              </>
            ) : (
              <>
                Exibindo <strong>{filteredItems.length}</strong> de <strong>{alerts.length}</strong> aviso(s)
              </>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[36px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
