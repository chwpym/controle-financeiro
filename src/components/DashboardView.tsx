import React, { useEffect, useMemo, useState } from 'react';
import { Check, Move, Plus } from 'lucide-react';
import type { Category, Contact, Transaction } from '../types';
import {
  DashboardConfigPopover,
  DashboardKpis,
  DashboardWidgetGrid,
  DEFAULT_KPI_ORDER,
  DEFAULT_VISIBLE_WIDGETS,
  DEFAULT_WIDGET_ORDER,
  DEFAULT_WIDGET_SPANS,
  loadDashboardLayout,
  useDashboardStats,
  type DashboardLayoutState,
  type KpiCardId,
  type WidgetCardId,
  type WidgetSpan,
} from './dashboard';

export interface DashboardViewProps {
  userId: string;
  selectedMonth: string;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
  notifyLeadDays: number;
  inAppAlertsEnabled: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  onQuickSettle: (tx: Transaction) => void;
  onOpenConsult: (tx: Transaction) => void;
  onOpenNewTransaction: () => void;
  onNavigateToTransactions: (filter?: string) => void;
  onOpenAnalytics?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userId,
  selectedMonth,
  transactions,
  categories,
  contacts,
  notifyLeadDays,
  inAppAlertsEnabled,
  notificationPermission,
  onRequestNotificationPermission,
  onQuickSettle,
  onOpenConsult,
  onOpenNewTransaction,
  onNavigateToTransactions,
  onOpenAnalytics,
}) => {
  const layoutKey = `fluxoclaro_dashboard_layout_${userId}`;
  const [layout, setLayout] = useState<DashboardLayoutState>(() => loadDashboardLayout(layoutKey));
  const [reorderMode, setReorderMode] = useState(false);
  const { monthStats } = useDashboardStats(transactions, selectedMonth);

  useEffect(() => {
    setLayout(loadDashboardLayout(layoutKey));
  }, [layoutKey]);

  const updateLayout = (updater: (prev: DashboardLayoutState) => DashboardLayoutState) => {
    setLayout((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(layoutKey, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  const isCustomLayout = useMemo(() => {
    const sameKpi = layout.kpiOrder.every((id, i) => id === DEFAULT_KPI_ORDER[i]);
    const sameWidgets = layout.widgetOrder.every((id, i) => id === DEFAULT_WIDGET_ORDER[i]);
    const sameSpans = DEFAULT_WIDGET_ORDER.every(
      (id) => (layout.widgetSpans[id] || DEFAULT_WIDGET_SPANS[id]) === DEFAULT_WIDGET_SPANS[id]
    );
    const sameVis = DEFAULT_WIDGET_ORDER.every(
      (id) => (layout.visibleWidgets[id] !== false) === DEFAULT_VISIBLE_WIDGETS[id]
    );
    return !(sameKpi && sameWidgets && sameSpans && sameVis);
  }, [layout]);

  const handleResetLayout = () => {
    setLayout({
      kpiOrder: [...DEFAULT_KPI_ORDER],
      widgetOrder: [...DEFAULT_WIDGET_ORDER],
      widgetSpans: { ...DEFAULT_WIDGET_SPANS },
      visibleWidgets: { ...DEFAULT_VISIBLE_WIDGETS },
    });
    try {
      localStorage.removeItem(layoutKey);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {reorderMode
            ? 'Arraste qualquer card ou use as setas para priorizar suas informações financeiras.'
            : 'Arraste os cards pelo ícone de alça para reorganizar a ordem do painel.'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <DashboardConfigPopover
            visibleWidgets={layout.visibleWidgets}
            widgetSpans={layout.widgetSpans}
            onToggleVisibility={(id: WidgetCardId) =>
              updateLayout((prev) => ({
                ...prev,
                visibleWidgets: { ...prev.visibleWidgets, [id]: !prev.visibleWidgets[id] },
              }))
            }
            onChangeSpan={(id: WidgetCardId, span: WidgetSpan) =>
              updateLayout((prev) => ({
                ...prev,
                widgetSpans: { ...prev.widgetSpans, [id]: span },
              }))
            }
            onResetDefaults={handleResetLayout}
            isCustomLayout={isCustomLayout}
          />

          <button
            type="button"
            onClick={() => setReorderMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold min-h-[40px] transition-colors ${
              reorderMode
                ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {reorderMode ? <Check className="w-3.5 h-3.5" /> : <Move className="w-3.5 h-3.5" />}
            <span>{reorderMode ? 'Concluir ordem' : 'Reordenar cards'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      <DashboardKpis
        monthStats={monthStats}
        kpiOrder={layout.kpiOrder}
        reorderMode={reorderMode}
        onUpdateKpiOrder={(kpiOrder: KpiCardId[]) => updateLayout((prev) => ({ ...prev, kpiOrder }))}
        onNavigateToTransactions={onNavigateToTransactions}
      />

      <DashboardWidgetGrid
        widgetOrder={layout.widgetOrder}
        widgetSpans={layout.widgetSpans}
        visibleWidgets={layout.visibleWidgets}
        reorderMode={reorderMode}
        onUpdateWidgetOrder={(widgetOrder: WidgetCardId[]) => updateLayout((prev) => ({ ...prev, widgetOrder }))}
        onChangeWidgetSpan={(id: WidgetCardId, span: WidgetSpan) =>
          updateLayout((prev) => ({ ...prev, widgetSpans: { ...prev.widgetSpans, [id]: span } }))
        }
        transactions={transactions}
        monthRows={monthStats.monthRows}
        selectedMonth={selectedMonth}
        categories={categories}
        contacts={contacts}
        notifyLeadDays={notifyLeadDays}
        inAppAlertsEnabled={inAppAlertsEnabled}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={onRequestNotificationPermission}
        onQuickSettle={onQuickSettle}
        onOpenConsult={onOpenConsult}
        onOpenNewTransaction={onOpenNewTransaction}
        onNavigateToTransactions={onNavigateToTransactions}
        onOpenAnalytics={onOpenAnalytics}
      />
    </div>
  );
};
