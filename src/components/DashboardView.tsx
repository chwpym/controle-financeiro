import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  CalendarClock,
  Check,
  CheckCircle2,
  GripVertical,
  Maximize2,
  Minimize2,
  Move,
  Plus,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import type { Category, Contact, Transaction } from '../types';
import {
  daysUntilDue,
  formatBRL,
  formatDateBR,
  isOverdue,
  shiftMonthKey,
  todayISO,
} from '../utils/format';

interface DashboardViewProps {
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

type KpiCardId = 'projected' | 'receivable' | 'payable' | 'overdue';
type WidgetCardId = 'monthly_chart' | 'categories' | 'payment_methods' | 'daily_cashflow' | 'alerts';
type WidgetSpan = 1 | 2;

interface DashboardLayoutState {
  kpiOrder: KpiCardId[];
  widgetOrder: WidgetCardId[];
  widgetSpans: Record<WidgetCardId, WidgetSpan>;
}

const DEFAULT_KPI_ORDER: KpiCardId[] = ['projected', 'receivable', 'payable', 'overdue'];
const DEFAULT_WIDGET_ORDER: WidgetCardId[] = [
  'monthly_chart',
  'categories',
  'payment_methods',
  'daily_cashflow',
  'alerts',
];
const DEFAULT_WIDGET_SPANS: Record<WidgetCardId, WidgetSpan> = {
  monthly_chart: 2,
  categories: 1,
  payment_methods: 1,
  daily_cashflow: 2,
  alerts: 2,
};

const KPI_LABELS: Record<KpiCardId, string> = {
  projected: 'Saldo Previsto do Mês',
  receivable: 'Total a Receber',
  payable: 'Total a Pagar',
  overdue: 'Vencidas no Mês',
};

const WIDGET_LABELS: Record<WidgetCardId, string> = {
  monthly_chart: 'Desempenho Mensal (BRL)',
  categories: 'Despesas por Categoria',
  payment_methods: 'Resumo por Forma de Pagamento',
  daily_cashflow: 'Fluxo de Caixa Diário (Projeção)',
  alerts: 'Alertas de Vencimento',
};

function mergeOrder<T extends string>(saved: unknown, defaults: T[]): T[] {
  if (!Array.isArray(saved)) return [...defaults];
  const valid = saved.filter((item): item is T => typeof item === 'string' && defaults.includes(item as T));
  const unique = Array.from(new Set(valid));
  for (const d of defaults) {
    if (!unique.includes(d)) unique.push(d);
  }
  return unique;
}

function loadDashboardLayout(storageKey: string): DashboardLayoutState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {
        kpiOrder: [...DEFAULT_KPI_ORDER],
        widgetOrder: [...DEFAULT_WIDGET_ORDER],
        widgetSpans: { ...DEFAULT_WIDGET_SPANS },
      };
    }
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
    const spans = { ...DEFAULT_WIDGET_SPANS };
    if (parsed.widgetSpans && typeof parsed.widgetSpans === 'object') {
      for (const id of DEFAULT_WIDGET_ORDER) {
        const val = parsed.widgetSpans[id];
        if (val === 1 || val === 2) spans[id] = val;
      }
    }
    return {
      kpiOrder: mergeOrder(parsed.kpiOrder, DEFAULT_KPI_ORDER),
      widgetOrder: mergeOrder(parsed.widgetOrder, DEFAULT_WIDGET_ORDER),
      widgetSpans: spans,
    };
  } catch {
    return {
      kpiOrder: [...DEFAULT_KPI_ORDER],
      widgetOrder: [...DEFAULT_WIDGET_ORDER],
      widgetSpans: { ...DEFAULT_WIDGET_SPANS },
    };
  }
}

function reorderList<T>(list: T[], fromId: T, toId: T): T[] {
  const fromIdx = list.indexOf(fromId);
  const toIdx = list.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list;
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

function shiftItem<T>(list: T[], id: T, delta: -1 | 1): T[] {
  const idx = list.indexOf(id);
  const targetIdx = idx + delta;
  if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
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

  // Drag-and-drop state
  const [draggingKpi, setDraggingKpi] = useState<KpiCardId | null>(null);
  const [dragOverKpi, setDragOverKpi] = useState<KpiCardId | null>(null);
  const [draggingWidget, setDraggingWidget] = useState<WidgetCardId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<WidgetCardId | null>(null);
  const dragAllowedRef = useRef(false);

  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);
  const today = todayISO();
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  // Reload layout if user changes
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
      (id) => layout.widgetSpans[id] === DEFAULT_WIDGET_SPANS[id]
    );
    return !(sameKpi && sameWidgets && sameSpans);
  }, [layout]);

  const handleResetLayout = () => {
    const defaults: DashboardLayoutState = {
      kpiOrder: [...DEFAULT_KPI_ORDER],
      widgetOrder: [...DEFAULT_WIDGET_ORDER],
      widgetSpans: { ...DEFAULT_WIDGET_SPANS },
    };
    setLayout(defaults);
    try {
      localStorage.removeItem(layoutKey);
    } catch {
      // ignore
    }
  };

  // Month KPIs
  const monthStats = useMemo(() => {
    const monthRows = transactions.filter((t) => t.dueDate.startsWith(selectedMonth));
    let receivableTotal = 0;
    let receivableSettled = 0;
    let payableTotal = 0;
    let payableSettled = 0;
    let overdueTotal = 0;
    let overdueCount = 0;

    for (const t of monthRows) {
      if (t.type === 'receivable') {
        receivableTotal += t.amountCents;
        if (t.status === 'settled') receivableSettled += t.amountCents;
      } else {
        payableTotal += t.amountCents;
        if (t.status === 'settled') payableSettled += t.amountCents;
      }
      if (isOverdue(t, today)) {
        overdueTotal += t.amountCents;
        overdueCount += 1;
      }
    }

    const projectedBalance = receivableTotal - payableTotal;
    const realizedBalance = receivableSettled - payableSettled;

    return {
      monthRows,
      receivableTotal,
      receivableSettled,
      payableTotal,
      payableSettled,
      overdueTotal,
      overdueCount,
      projectedBalance,
      realizedBalance,
    };
  }, [transactions, selectedMonth, today]);

  // 6-Month trailing & upcoming performance chart
  const sixMonthSeries = useMemo(() => {
    const keys = [-4, -3, -2, -1, 0, 1].map((delta) => shiftMonthKey(selectedMonth, delta));
    return keys.map((ym) => {
      let rec = 0;
      let pay = 0;
      for (const t of transactions) {
        if (!t.dueDate.startsWith(ym)) continue;
        if (t.type === 'receivable') rec += t.amountCents;
        else pay += t.amountCents;
      }
      const [y, m] = ym.split('-');
      const shortMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(
        new Date(Number(y), Number(m) - 1, 1)
      );
      return {
        ym,
        label: shortMonth.replace('.', ''),
        receivableCents: rec,
        payableCents: pay,
      };
    });
  }, [transactions, selectedMonth]);

  const maxChartCents = useMemo(() => {
    const maxVal = sixMonthSeries.reduce(
      (acc, item) => Math.max(acc, item.receivableCents, item.payableCents),
      0
    );
    return Math.max(maxVal, 10000);
  }, [sixMonthSeries]);

  // Category breakdown (Payables of selectedMonth)
  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    let sum = 0;
    for (const t of monthStats.monthRows) {
      if (t.type !== 'payable') continue;
      const key = t.categoryId || '__none__';
      totals.set(key, (totals.get(key) || 0) + t.amountCents);
      sum += t.amountCents;
    }
    const items = Array.from(totals.entries())
      .map(([catId, cents]) => {
        const cat = catId !== '__none__' ? catMap.get(catId) : undefined;
        return {
          id: catId,
          name: cat?.name || 'Sem categoria',
          color: cat?.color || '#64748B',
          cents,
          pct: sum > 0 ? Math.round((cents / sum) * 100) : 0,
        };
      })
      .sort((a, b) => b.cents - a.cents);
    return { items, sum };
  }, [monthStats.monthRows, catMap]);

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

  // Daily Cash Flow Projection for selectedMonth
  const dailyCashFlow = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 30;

    const byDay = new Map<number, { rec: number; pay: number }>();
    for (const t of monthStats.monthRows) {
      const dayNum = Number(t.dueDate.slice(8, 10));
      if (!dayNum) continue;
      const cur = byDay.get(dayNum) || { rec: 0, pay: 0 };
      if (t.type === 'receivable') cur.rec += t.amountCents;
      else cur.pay += t.amountCents;
      byDay.set(dayNum, cur);
    }

    let running = 0;
    let minBalance = 0;
    let minDay = 1;
    let maxAbs = 10000;
    let activeDays = 0;

    const points = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const item = byDay.get(day) || { rec: 0, pay: 0 };
      if (item.rec > 0 || item.pay > 0) activeDays += 1;
      running += item.rec - item.pay;
      if (running < minBalance) {
        minBalance = running;
        minDay = day;
      }
      maxAbs = Math.max(maxAbs, Math.abs(running));
      return {
        day,
        dateIso: `${selectedMonth}-${String(day).padStart(2, '0')}`,
        rec: item.rec,
        pay: item.pay,
        balance: running,
      };
    });

    return {
      points,
      daysInMonth,
      minBalance,
      minDay,
      endingBalance: running,
      maxAbs,
      activeDays,
    };
  }, [monthStats.monthRows, selectedMonth]);

  // Payment Method Breakdown (settled transactions of selectedMonth)
  const paymentMethodSummary = useMemo(() => {
    const map = new Map<string, { rec: number; pay: number; count: number }>();
    let totalSettled = 0;

    for (const t of monthStats.monthRows) {
      if (t.status !== 'settled') continue;
      const method = t.paymentMethod?.trim() || 'Não informado';
      const cur = map.get(method) || { rec: 0, pay: 0, count: 0 };
      if (t.type === 'receivable') cur.rec += t.amountCents;
      else cur.pay += t.amountCents;
      cur.count += 1;
      totalSettled += t.amountCents;
      map.set(method, cur);
    }

    const items = Array.from(map.entries())
      .map(([method, data]) => {
        const total = data.rec + data.pay;
        return {
          method,
          ...data,
          total,
          pct: totalSettled > 0 ? Math.round((total / totalSettled) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { items, totalSettled };
  }, [monthStats.monthRows]);

  // KPI Card renderer
  const renderKpiCard = (id: KpiCardId, index: number) => {
    const isDragging = draggingKpi === id;
    const isOver = dragOverKpi === id && draggingKpi !== null && draggingKpi !== id;

    let icon: React.ReactNode;
    let valueNode: React.ReactNode;
    let subtitleNode: React.ReactNode;

    if (id === 'projected') {
      icon = <Wallet className="w-4 h-4 text-teal-700 dark:text-teal-400" />;
      valueNode = (
        <div
          className={`mt-2.5 text-2xl font-display font-bold font-mono-tabular ${
            monthStats.projectedBalance >= 0
              ? 'text-slate-900 dark:text-white'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatBRL(monthStats.projectedBalance)}
        </div>
      );
      subtitleNode = (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
          Realizado: {formatBRL(monthStats.realizedBalance)}
        </p>
      );
    } else if (id === 'receivable') {
      icon = <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      valueNode = (
        <div className="mt-2.5 text-2xl font-display font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">
          {formatBRL(monthStats.receivableTotal)}
        </div>
      );
      subtitleNode = (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
          Recebido: {formatBRL(monthStats.receivableSettled)}
        </p>
      );
    } else if (id === 'payable') {
      icon = <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      valueNode = (
        <div className="mt-2.5 text-2xl font-display font-bold font-mono-tabular text-rose-700 dark:text-rose-400">
          {formatBRL(monthStats.payableTotal)}
        </div>
      );
      subtitleNode = (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
          Pago: {formatBRL(monthStats.payableSettled)}
        </p>
      );
    } else {
      icon = <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      valueNode = (
        <div
          className={`mt-2.5 text-2xl font-display font-bold font-mono-tabular ${
            monthStats.overdueCount > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-900 dark:text-white'
          }`}
        >
          {formatBRL(monthStats.overdueTotal)}
        </div>
      );
      subtitleNode = (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {monthStats.overdueCount === 0
            ? 'Nenhuma conta vencida'
            : `${monthStats.overdueCount} lançamento${monthStats.overdueCount > 1 ? 's' : ''} em atraso`}
        </p>
      );
    }

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
          setDraggingWidget(null);
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
            updateLayout((prev) => ({
              ...prev,
              kpiOrder: reorderList(prev.kpiOrder, draggingKpi, id),
            }));
          }
          setDraggingKpi(null);
          setDragOverKpi(null);
        }}
        onDragEnd={() => {
          setDraggingKpi(null);
          setDragOverKpi(null);
        }}
        className={`group relative rounded-2xl bg-white dark:bg-slate-900 border p-5 transition-all ${
          isOver
            ? 'border-teal-600 dark:border-teal-400 ring-2 ring-teal-500/30 bg-teal-50/40 dark:bg-teal-950/20'
            : reorderMode
              ? 'border-dashed border-teal-400 dark:border-teal-700 cursor-grab active:cursor-grabbing'
              : 'border-slate-200 dark:border-slate-800'
        } ${isDragging ? 'opacity-45 scale-[0.98]' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              data-drag-handle
              title="Arraste para reordenar este card"
              aria-label={`Arrastar ${KPI_LABELS[id]}`}
              className={`inline-flex items-center justify-center rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing transition-opacity ${
                reorderMode ? 'opacity-100 text-teal-600 dark:text-teal-400' : 'opacity-60 group-hover:opacity-100'
              }`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className="truncate">{KPI_LABELS[id]}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {reorderMode && (
              <div className="flex items-center gap-0.5 mr-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    updateLayout((prev) => ({ ...prev, kpiOrder: shiftItem(prev.kpiOrder, id, -1) }))
                  }
                  aria-label={`Mover ${KPI_LABELS[id]} para esquerda`}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={index === layout.kpiOrder.length - 1}
                  onClick={() =>
                    updateLayout((prev) => ({ ...prev, kpiOrder: shiftItem(prev.kpiOrder, id, 1) }))
                  }
                  aria-label={`Mover ${KPI_LABELS[id]} para direita`}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
            {icon}
          </div>
        </div>
        {valueNode}
        {subtitleNode}
      </div>
    );
  };

  // Main Widget renderer
  const renderWidgetCard = (id: WidgetCardId, index: number) => {
    const span = layout.widgetSpans[id] || DEFAULT_WIDGET_SPANS[id];
    const isDragging = draggingWidget === id;
    const isOver = dragOverWidget === id && draggingWidget !== null && draggingWidget !== id;

    const dragControls = (
      <div className="flex items-center gap-1 shrink-0">
        {reorderMode && (
          <>
            <button
              type="button"
              onClick={() =>
                updateLayout((prev) => ({
                  ...prev,
                  widgetSpans: {
                    ...prev.widgetSpans,
                    [id]: span === 2 ? 1 : 2,
                  },
                }))
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
              onClick={() =>
                updateLayout((prev) => ({
                  ...prev,
                  widgetOrder: shiftItem(prev.widgetOrder, id, -1),
                }))
              }
              aria-label={`Mover ${WIDGET_LABELS[id]} antes`}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === layout.widgetOrder.length - 1}
              onClick={() =>
                updateLayout((prev) => ({
                  ...prev,
                  widgetOrder: shiftItem(prev.widgetOrder, id, 1),
                }))
              }
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

    let cardContent: React.ReactNode = null;

    if (id === 'monthly_chart') {
      cardContent = (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Desempenho Mensal (BRL)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparativo de receitas e despesas ao redor do mês selecionado
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  A Receber
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
                  A Pagar
                </span>
              </div>
              {dragControls}
            </div>
          </div>

          <div className="relative h-60 w-full">
            <svg
              viewBox="0 0 600 220"
              className="w-full h-full overflow-visible"
              role="img"
              aria-label="Gráfico comparativo mensal de contas a receber e pagar"
            >
              {[0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 185 - ratio * 155;
                return (
                  <g key={ratio}>
                    <line
                      x1="0"
                      x2="600"
                      y1={y}
                      y2={y}
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeDasharray="3 3"
                    />
                  </g>
                );
              })}

              {sixMonthSeries.map((pt, idx) => {
                const groupWidth = 600 / sixMonthSeries.length;
                const center = idx * groupWidth + groupWidth / 2;
                const recH = Math.max(3, (pt.receivableCents / maxChartCents) * 155);
                const payH = Math.max(3, (pt.payableCents / maxChartCents) * 155);
                const isSelected = pt.ym === selectedMonth;

                return (
                  <g
                    key={pt.ym}
                    onMouseEnter={() => setHoveredBarIdx(idx)}
                    onMouseLeave={() => setHoveredBarIdx(null)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <rect
                        x={center - 34}
                        y={18}
                        width={68}
                        height={172}
                        rx={8}
                        className="fill-slate-100 dark:fill-slate-800/60"
                      />
                    )}
                    <rect
                      x={center - 20}
                      y={185 - recH}
                      width={17}
                      height={recH}
                      rx={4}
                      className="fill-emerald-600 dark:fill-emerald-500 transition-opacity"
                      opacity={hoveredBarIdx === null || hoveredBarIdx === idx ? 1 : 0.45}
                    />
                    <rect
                      x={center + 3}
                      y={185 - payH}
                      width={17}
                      height={payH}
                      rx={4}
                      className="fill-rose-600 dark:fill-rose-500 transition-opacity"
                      opacity={hoveredBarIdx === null || hoveredBarIdx === idx ? 1 : 0.45}
                    />
                    <text
                      x={center}
                      y={206}
                      textAnchor="middle"
                      className={`text-[11px] uppercase ${
                        isSelected
                          ? 'fill-slate-900 dark:fill-white font-bold'
                          : 'fill-slate-500 dark:fill-slate-400 font-medium'
                      }`}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hoveredBarIdx !== null && sixMonthSeries[hoveredBarIdx] && (
              <div className="mt-2 flex items-center justify-center gap-4 text-xs font-mono-tabular text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 rounded-lg py-1.5 px-3 border border-slate-200 dark:border-slate-700">
                <span className="font-semibold uppercase">{sixMonthSeries[hoveredBarIdx].ym}</span>
                <span>Receber: {formatBRL(sixMonthSeries[hoveredBarIdx].receivableCents)}</span>
                <span>Pagar: {formatBRL(sixMonthSeries[hoveredBarIdx].payableCents)}</span>
              </div>
            )}
          </div>
        </>
      );
    } else if (id === 'categories') {
      cardContent = (
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Despesas por Categoria
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribuição de contas a pagar no mês
              </p>
            </div>
            {dragControls}
          </div>

          {categoryBreakdown.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-xs text-slate-500 dark:text-slate-400">
              <p>Nenhuma despesa registrada neste mês.</p>
              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="mt-3 inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Lançar conta
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 flex-1">
              {categoryBreakdown.items.slice(0, 6).map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate pr-2">
                      {cat.name}
                    </span>
                    <span className="font-mono-tabular text-slate-900 dark:text-white font-semibold shrink-0">
                      {formatBRL(cat.cents)} · {cat.pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, cat.pct)}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else if (id === 'payment_methods') {
      cardContent = (
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Resumo por Forma de Pagamento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Movimentação já liquidada no mês selecionado
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
                {formatBRL(paymentMethodSummary.totalSettled)}
              </span>
              {dragControls}
            </div>
          </div>

          {paymentMethodSummary.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhuma conta baixada neste mês ainda.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {paymentMethodSummary.items.map((item) => (
                <div key={item.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.method} · <span className="text-slate-500">{item.count}x</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white shrink-0">
                      {formatBRL(item.total)} ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 dark:bg-teal-500"
                      style={{ width: `${Math.max(4, item.pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                    <span>Entradas: {formatBRL(item.rec)}</span>
                    <span>Saídas: {formatBRL(item.pay)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else if (id === 'daily_cashflow') {
      cardContent = (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Fluxo de Caixa Diário (Projeção)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evolução acumulada dia a dia no mês selecionado
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right font-mono-tabular">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Menor saldo</div>
                <div
                  className={`text-sm font-bold ${
                    dailyCashFlow.minBalance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {formatBRL(dailyCashFlow.minBalance)}
                  {dailyCashFlow.minBalance < 0
                    ? ` (dia ${String(dailyCashFlow.minDay).padStart(2, '0')})`
                    : ''}
                </div>
              </div>
              {dragControls}
            </div>
          </div>

          {dailyCashFlow.activeDays === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Sem vencimentos registrados neste mês para projetar o saldo diário.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-40 w-full">
                {(() => {
                  const pts = dailyCashFlow.points;
                  const maxAbs = dailyCashFlow.maxAbs;
                  const zeroY = 75;
                  const scale = 60 / maxAbs;
                  const coords = pts.map((pt, idx) => {
                    const x = pts.length > 1 ? (idx / (pts.length - 1)) * 560 + 20 : 300;
                    const y = zeroY - pt.balance * scale;
                    return { x, y, pt };
                  });
                  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                  const minPoint = coords[dailyCashFlow.minDay - 1];

                  return (
                    <svg
                      viewBox="0 0 600 155"
                      className="w-full h-full overflow-visible"
                      role="img"
                      aria-label="Curva de saldo acumulado diário do mês"
                    >
                      <line
                        x1="20"
                        x2="580"
                        y1={zeroY}
                        y2={zeroY}
                        className="stroke-slate-300 dark:stroke-slate-700"
                        strokeDasharray="4 4"
                      />
                      <polyline
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="stroke-teal-700 dark:stroke-teal-400"
                        points={polyline}
                      />
                      {minPoint && dailyCashFlow.minBalance < 0 && (
                        <circle
                          cx={minPoint.x}
                          cy={minPoint.y}
                          r={4.5}
                          className="fill-red-600 dark:fill-red-400"
                        />
                      )}
                      <text x="20" y="148" className="text-[10px] fill-slate-400 font-mono-tabular">
                        Dia 01
                      </text>
                      <text
                        x="300"
                        y="148"
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono-tabular"
                      >
                        Dia {String(Math.ceil(dailyCashFlow.daysInMonth / 2)).padStart(2, '0')}
                      </text>
                      <text
                        x="580"
                        y="148"
                        textAnchor="end"
                        className="text-[10px] fill-slate-400 font-mono-tabular"
                      >
                        Dia {String(dailyCashFlow.daysInMonth).padStart(2, '0')}
                      </text>
                    </svg>
                  );
                })()}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {dailyCashFlow.activeDays} dia(s) com vencimentos · Saldo final:{' '}
                  <strong className="font-mono-tabular text-slate-900 dark:text-white">
                    {formatBRL(dailyCashFlow.endingBalance)}
                  </strong>
                </span>
                {onOpenAnalytics && (
                  <button
                    type="button"
                    onClick={onOpenAnalytics}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap"
                  >
                    Ver gráficos detalhados
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      );
    } else if (id === 'alerts') {
      cardContent = (
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
    }

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
          setDraggingKpi(null);
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
            updateLayout((prev) => ({
              ...prev,
              widgetOrder: reorderList(prev.widgetOrder, draggingWidget, id),
            }));
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
        {cardContent}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {/* Compact Dashboard Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {reorderMode
            ? 'Arraste qualquer card ou use as setas para priorizar suas informações financeiras.'
            : 'Arraste os cards pelo ícone de alça para reorganizar a ordem do painel.'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
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

          {isCustomLayout && (
            <button
              type="button"
              onClick={handleResetLayout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar padrão</span>
            </button>
          )}

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

      {/* KPI Strip (Drag-and-drop reorderable) */}
      <section
        aria-label="Resumo financeiro do mês"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {layout.kpiOrder.map((id, idx) => renderKpiCard(id, idx))}
      </section>

      {/* Main Dashboard Widgets Grid (Drag-and-drop reorderable) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 grid-flow-row-dense gap-6">
        {layout.widgetOrder.map((id, idx) => renderWidgetCard(id, idx))}
      </div>
    </div>
  );
};
