import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  GripVertical,
  Wallet,
} from 'lucide-react';
import { KpiCard, type KpiTone } from '../common/KpiCard';
import { formatBRL } from '../../utils/format';
import {
  KPI_LABELS,
  reorderList,
  shiftItem,
  type KpiCardId,
} from './types';

export interface DashboardMonthStats {
  projectedBalance: number;
  realizedBalance: number;
  receivableTotal: number;
  receivableSettled: number;
  payableTotal: number;
  payableSettled: number;
  overdueTotal: number;
  overdueCount: number;
}

export interface DashboardKpisProps {
  monthStats: DashboardMonthStats;
  kpiOrder: KpiCardId[];
  reorderMode?: boolean;
  onUpdateKpiOrder: (newOrder: KpiCardId[]) => void;
  onNavigateToTransactions?: (filter?: string) => void;
}

export const DashboardKpis: React.FC<DashboardKpisProps> = ({
  monthStats,
  kpiOrder,
  reorderMode = false,
  onUpdateKpiOrder,
  onNavigateToTransactions,
}) => {
  const [draggingKpi, setDraggingKpi] = useState<KpiCardId | null>(null);
  const [dragOverKpi, setDragOverKpi] = useState<KpiCardId | null>(null);
  const dragAllowedRef = useRef(false);

  const getKpiConfig = (id: KpiCardId) => {
    switch (id) {
      case 'projected':
        return {
          title: KPI_LABELS.projected,
          amountCents: monthStats.projectedBalance,
          tone: (monthStats.projectedBalance >= 0 ? 'neutral' : 'danger') as KpiTone,
          icon: <Wallet className="w-4 h-4 text-teal-700 dark:text-teal-400" />,
          subtitle: `Realizado: ${formatBRL(monthStats.realizedBalance)}`,
          filter: 'all',
        };
      case 'receivable':
        return {
          title: KPI_LABELS.receivable,
          amountCents: monthStats.receivableTotal,
          tone: 'positive' as KpiTone,
          icon: <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          subtitle: `Recebido: ${formatBRL(monthStats.receivableSettled)}`,
          filter: 'receivable',
        };
      case 'payable':
        return {
          title: KPI_LABELS.payable,
          amountCents: monthStats.payableTotal,
          tone: 'negative' as KpiTone,
          icon: <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          subtitle: `Pago: ${formatBRL(monthStats.payableSettled)}`,
          filter: 'payable',
        };
      case 'overdue':
        return {
          title: KPI_LABELS.overdue,
          amountCents: monthStats.overdueTotal,
          tone: (monthStats.overdueCount > 0 ? 'danger' : 'neutral') as KpiTone,
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          subtitle:
            monthStats.overdueCount === 0
              ? 'Nenhuma conta vencida'
              : `${monthStats.overdueCount} lançamento${monthStats.overdueCount > 1 ? 's' : ''} em atraso`,
          filter: 'overdue',
        };
    }
  };

  const handleCardClick = (id: KpiCardId) => {
    if (reorderMode || !onNavigateToTransactions) return;
    const config = getKpiConfig(id);
    onNavigateToTransactions(config.filter);
  };

  return (
    <section
      aria-label="Resumo financeiro do mês"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {kpiOrder.map((id, index) => {
        const config = getKpiConfig(id);
        const isDragging = draggingKpi === id;
        const isOver = dragOverKpi === id && draggingKpi !== null && draggingKpi !== id;

        const headerActions = (
          <div className="flex items-center gap-1.5 shrink-0">
            {reorderMode && (
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onUpdateKpiOrder(shiftItem(kpiOrder, id, -1))}
                  aria-label={`Mover ${config.title} para esquerda`}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={index === kpiOrder.length - 1}
                  onClick={() => onUpdateKpiOrder(shiftItem(kpiOrder, id, 1))}
                  aria-label={`Mover ${config.title} para direita`}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
            <span
              data-drag-handle
              title="Arraste para reordenar este card"
              aria-label={`Arrastar ${config.title}`}
              className={`inline-flex items-center justify-center rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-opacity ${
                reorderMode ? 'opacity-100 text-teal-600 dark:text-teal-400' : 'opacity-60 group-hover:opacity-100'
              }`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            {config.icon}
          </div>
        );

        return (
          <div
            key={id}
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
              setDraggingKpi(id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', `kpi:${id}`);
            }}
            onDragOver={(e) => {
              if (!draggingKpi || draggingKpi === id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverKpi !== id) setDragOverKpi(id);
            }}
            onDragLeave={() => {
              if (dragOverKpi === id) setDragOverKpi(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggingKpi && draggingKpi !== id) {
                onUpdateKpiOrder(reorderList(kpiOrder, draggingKpi, id));
              }
              setDraggingKpi(null);
              setDragOverKpi(null);
            }}
            onDragEnd={() => {
              setDraggingKpi(null);
              setDragOverKpi(null);
            }}
            onClick={() => handleCardClick(id)}
            className={`group transition-all ${
              onNavigateToTransactions && !reorderMode ? 'cursor-pointer hover:border-teal-500/50 hover:shadow-xs' : ''
            }`}
          >
            <KpiCard
              title={config.title}
              amountCents={config.amountCents}
              tone={config.tone}
              icon={headerActions}
              subtitle={config.subtitle}
              className={`transition-all ${
                isOver
                  ? 'border-teal-600 dark:border-teal-400 ring-2 ring-teal-500/30 bg-teal-50/40 dark:bg-teal-950/20'
                  : reorderMode
                    ? 'border-dashed border-teal-400 dark:border-teal-700 cursor-grab active:cursor-grabbing'
                    : ''
              } ${isDragging ? 'opacity-45 scale-[0.98]' : ''}`}
            />
          </div>
        );
      })}
    </section>
  );
};
