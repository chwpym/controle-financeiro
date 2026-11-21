export type KpiCardId = 'projected' | 'receivable' | 'payable' | 'overdue';
export type WidgetCardId =
  | 'monthly_chart'
  | 'categories'
  | 'payment_methods'
  | 'daily_cashflow'
  | 'alerts';

export type WidgetSpan = 1 | 2;

export interface DashboardLayoutState {
  kpiOrder: KpiCardId[];
  widgetOrder: WidgetCardId[];
  widgetSpans: Record<WidgetCardId, WidgetSpan>;
  visibleWidgets: Record<WidgetCardId, boolean>;
}

export const DEFAULT_KPI_ORDER: KpiCardId[] = ['projected', 'receivable', 'payable', 'overdue'];

export const DEFAULT_WIDGET_ORDER: WidgetCardId[] = [
  'monthly_chart',
  'categories',
  'payment_methods',
  'daily_cashflow',
  'alerts',
];

export const DEFAULT_WIDGET_SPANS: Record<WidgetCardId, WidgetSpan> = {
  monthly_chart: 2,
  categories: 1,
  payment_methods: 1,
  daily_cashflow: 2,
  alerts: 2,
};

export const DEFAULT_VISIBLE_WIDGETS: Record<WidgetCardId, boolean> = {
  monthly_chart: true,
  categories: true,
  payment_methods: true,
  daily_cashflow: true,
  alerts: true,
};

export const KPI_LABELS: Record<KpiCardId, string> = {
  projected: 'Saldo Previsto do Mês',
  receivable: 'Total a Receber',
  payable: 'Total a Pagar',
  overdue: 'Vencidas no Mês',
};

export const WIDGET_LABELS: Record<WidgetCardId, string> = {
  monthly_chart: 'Desempenho Mensal (BRL)',
  categories: 'Despesas por Categoria',
  payment_methods: 'Resumo por Forma de Pagamento',
  daily_cashflow: 'Fluxo de Caixa Diário (Projeção)',
  alerts: 'Alertas de Vencimento',
};

export function mergeOrder<T extends string>(saved: unknown, defaults: T[]): T[] {
  if (!Array.isArray(saved)) return [...defaults];
  const valid = saved.filter((item): item is T => typeof item === 'string' && defaults.includes(item as T));
  const unique = Array.from(new Set(valid));
  for (const d of defaults) {
    if (!unique.includes(d)) unique.push(d);
  }
  return unique;
}

export function reorderList<T>(list: T[], fromId: T, toId: T): T[] {
  const fromIdx = list.indexOf(fromId);
  const toIdx = list.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list;
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

export function shiftItem<T>(list: T[], id: T, delta: -1 | 1): T[] {
  const idx = list.indexOf(id);
  const targetIdx = idx + delta;
  if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

export function loadDashboardLayout(storageKey: string): DashboardLayoutState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {
        kpiOrder: [...DEFAULT_KPI_ORDER],
        widgetOrder: [...DEFAULT_WIDGET_ORDER],
        widgetSpans: { ...DEFAULT_WIDGET_SPANS },
        visibleWidgets: { ...DEFAULT_VISIBLE_WIDGETS },
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
    const visible = { ...DEFAULT_VISIBLE_WIDGETS };
    if (parsed.visibleWidgets && typeof parsed.visibleWidgets === 'object') {
      for (const id of DEFAULT_WIDGET_ORDER) {
        if (typeof parsed.visibleWidgets[id] === 'boolean') {
          visible[id] = parsed.visibleWidgets[id];
        }
      }
    }
    return {
      kpiOrder: mergeOrder(parsed.kpiOrder, DEFAULT_KPI_ORDER),
      widgetOrder: mergeOrder(parsed.widgetOrder, DEFAULT_WIDGET_ORDER),
      widgetSpans: spans,
      visibleWidgets: visible,
    };
  } catch {
    return {
      kpiOrder: [...DEFAULT_KPI_ORDER],
      widgetOrder: [...DEFAULT_WIDGET_ORDER],
      widgetSpans: { ...DEFAULT_WIDGET_SPANS },
      visibleWidgets: { ...DEFAULT_VISIBLE_WIDGETS },
    };
  }
}
