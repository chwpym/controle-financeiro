import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { Category, Contact, Transaction } from '../../types';
import { CategoryExpenseChart } from './CategoryExpenseChart';
import { DailyCashFlowChart } from './DailyCashFlowChart';
import { DueAlertsCard } from './DueAlertsCard';
import { MonthlyPerformanceChart } from './MonthlyPerformanceChart';
import { PaymentMethodSummary } from './PaymentMethodSummary';
import {
  DEFAULT_WIDGET_SPANS,
  reorderList,
  shiftItem,
  WIDGET_LABELS,
  type WidgetCardId,
  type WidgetSpan,
} from './types';

export interface DashboardWidgetGridProps {
  widgetOrder: WidgetCardId[];
  widgetSpans: Record<WidgetCardId, WidgetSpan>;
  visibleWidgets: Record<WidgetCardId, boolean>;
  reorderMode: boolean;
  onUpdateWidgetOrder: (order: WidgetCardId[]) => void;
  onChangeWidgetSpan: (id: WidgetCardId, span: WidgetSpan) => void;
  transactions: Transaction[];
  monthRows: Transaction[];
  selectedMonth: string;
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

export const DashboardWidgetGrid: React.FC<DashboardWidgetGridProps> = ({
  widgetOrder,
  widgetSpans,
  visibleWidgets,
  reorderMode,
  onUpdateWidgetOrder,
  onChangeWidgetSpan,
  transactions,
  monthRows,
  selectedMonth,
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
  const [draggingWidget, setDraggingWidget] = useState<WidgetCardId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<WidgetCardId | null>(null);
  const dragAllowedRef = useRef(false);

  const renderWidgetContent = (id: WidgetCardId, dragControls: React.ReactNode) => {
    switch (id) {
      case 'monthly_chart':
        return (
          <MonthlyPerformanceChart
            transactions={transactions}
            selectedMonth={selectedMonth}
            dragControls={dragControls}
          />
        );
      case 'categories':
        return (
          <CategoryExpenseChart
            monthRows={monthRows}
            categories={categories}
            onOpenNewTransaction={onOpenNewTransaction}
            dragControls={dragControls}
          />
        );
      case 'payment_methods':
        return (
          <PaymentMethodSummary
            monthRows={monthRows}
            dragControls={dragControls}
          />
        );
      case 'daily_cashflow':
        return (
          <DailyCashFlowChart
            monthRows={monthRows}
            selectedMonth={selectedMonth}
            onOpenAnalytics={onOpenAnalytics}
            dragControls={dragControls}
          />
        );
      case 'alerts':
        return (
          <DueAlertsCard
            transactions={transactions}
            contacts={contacts}
            notifyLeadDays={notifyLeadDays}
            inAppAlertsEnabled={inAppAlertsEnabled}
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={onRequestNotificationPermission}
            onQuickSettle={onQuickSettle}
            onOpenConsult={onOpenConsult}
            onNavigateToTransactions={onNavigateToTransactions}
            dragControls={dragControls}
          />
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 grid-flow-row-dense gap-6">
      {widgetOrder
        .filter((id) => visibleWidgets[id] !== false)
        .map((id, index) => {
          const span = widgetSpans[id] || DEFAULT_WIDGET_SPANS[id];
          const isDragging = draggingWidget === id;
          const isOver = dragOverWidget === id && draggingWidget !== null && draggingWidget !== id;

          const dragControls = (
            <div className="flex items-center gap-1 shrink-0">
              {reorderMode && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeWidgetSpan(id, (widgetSpans[id] || span) === 2 ? 1 : 2)
                    }
                    title={span === 2 ? 'Reduzir para meia largura' : 'Expandir para largura total'}
                    className="hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {span === 2 ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    <span>{span === 2 ? '1/2' : 'Largo'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onUpdateWidgetOrder(shiftItem(widgetOrder, id, -1))}
                    aria-label={`Mover ${WIDGET_LABELS[id]} antes`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === widgetOrder.length - 1}
                    onClick={() => onUpdateWidgetOrder(shiftItem(widgetOrder, id, 1))}
                    aria-label={`Mover ${WIDGET_LABELS[id]} depois`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <span
                data-drag-handle
                title="Arraste para reordenar este card"
                aria-label={`Arrastar ${WIDGET_LABELS[id]}`}
                className={`inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing transition-colors ${
                  reorderMode ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40' : ''
                }`}
              >
                <GripVertical className="w-4 h-4" />
              </span>
            </div>
          );

          return (
            <section
              key={id}
              aria-label={WIDGET_LABELS[id]}
              draggable
              onPointerDown={(e) => {
                dragAllowedRef.current =
                  reorderMode || Boolean((e.target as HTMLElement).closest('[data-drag-handle]'));
              }}
              onDragStart={(e) => {
                if (!dragAllowedRef.current) {
                  e.preventDefault();
                  return;
                }
                setDraggingWidget(id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', `widget:${id}`);
              }}
              onDragOver={(e) => {
                if (!draggingWidget || draggingWidget === id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverWidget !== id) setDragOverWidget(id);
              }}
              onDragLeave={() => {
                if (dragOverWidget === id) setDragOverWidget(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingWidget && draggingWidget !== id) {
                  onUpdateWidgetOrder(reorderList(widgetOrder, draggingWidget, id));
                }
                setDraggingWidget(null);
                setDragOverWidget(null);
              }}
              onDragEnd={() => {
                setDraggingWidget(null);
                setDragOverWidget(null);
              }}
              className={`${
                span === 2 ? 'lg:col-span-2' : 'lg:col-span-1'
              } rounded-2xl bg-white dark:bg-slate-900 border p-5 sm:p-6 transition-all ${
                isOver
                  ? 'border-teal-600 dark:border-teal-400 ring-2 ring-teal-500/30 bg-teal-50/40 dark:bg-teal-950/20'
                  : reorderMode
                    ? 'border-dashed border-teal-400 dark:border-teal-700 cursor-grab active:cursor-grabbing'
                    : 'border-slate-200 dark:border-slate-800'
              } ${isDragging ? 'opacity-45 scale-[0.99]' : ''}`}
            >
              {renderWidgetContent(id, dragControls)}
            </section>
          );
        })}
    </div>
  );
};
