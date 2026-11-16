import React, { useMemo, useState } from 'react';
import type { Category, Contact, Transaction } from '../types';
import { formatBRL, formatDateBR, formatMonthLabel, isOverdue, todayISO } from '../utils/format';
import {
  createDateFilterState,
  DateRangeFilter,
  describeDateFilter,
  matchesDateFilter,
  type DateFilterValue,
} from './DateRangeFilter';

interface AnalyticsViewProps {
  selectedMonth: string;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  selectedMonth,
  transactions,
  categories,
}) => {
  const today = todayISO();
  const selectedYear = selectedMonth.slice(0, 4);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'month')
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'settled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAllDays, setShowAllDays] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const matchesNonDateFilters = useMemo(() => {
    return (t: Transaction) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'settled' && t.status !== 'settled') return false;
      if (statusFilter === 'overdue' && !isOverdue(t, today)) return false;
      if (categoryFilter === '__none__' && t.categoryId) return false;
      if (categoryFilter !== 'all' && categoryFilter !== '__none__' && t.categoryId !== categoryFilter) {
        return false;
      }
      return true;
    };
  }, [typeFilter, statusFilter, categoryFilter, today]);

  const scopedTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => matchesNonDateFilters(t) && matchesDateFilter(t, dateFilter, selectedMonth)
      ),
    [transactions, matchesNonDateFilters, dateFilter, selectedMonth]
  );

  const periodLabel = describeDateFilter(dateFilter, selectedMonth);

  // 12-month bar chart for selectedYear
  const annualMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const m = String(idx + 1).padStart(2, '0');
      const ym = `${selectedYear}-${m}`;
      let rec = 0;
      let pay = 0;
      for (const t of transactions) {
        if (!matchesNonDateFilters(t)) continue;
        const targetDate = dateFilter.dateField === 'paidAt' ? t.paidAt : t.dueDate;
        if (!targetDate || !targetDate.startsWith(ym)) continue;
        if (t.type === 'receivable') rec += t.amountCents;
        else pay += t.amountCents;
      }
      const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(new Date(Number(selectedYear), idx, 1))
        .replace('.', '');
      return { ym, label, rec, pay, net: rec - pay };
    });
  }, [transactions, selectedYear, matchesNonDateFilters, dateFilter.dateField]);

  const maxAnnualCents = useMemo(() => {
    return Math.max(
      10000,
      annualMonths.reduce((m, item) => Math.max(m, item.rec, item.pay), 0)
    );
  }, [annualMonths]);

  // Daily Cash Flow for selectedMonth
  const dailyCashFlow = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 30;

    const byDay = new Map<number, { rec: number; pay: number; count: number }>();
    for (const t of transactions) {
      if (!matchesNonDateFilters(t)) continue;
      const targetDate = dateFilter.dateField === 'paidAt' ? t.paidAt : t.dueDate;
      if (!targetDate || !targetDate.startsWith(selectedMonth)) continue;

      const dayNum = Number(targetDate.slice(8, 10));
      if (!dayNum) continue;
      const cur = byDay.get(dayNum) || { rec: 0, pay: 0, count: 0 };
      if (t.type === 'receivable') cur.rec += t.amountCents;
      else cur.pay += t.amountCents;
      cur.count += 1;
      byDay.set(dayNum, cur);
    }

    let running = 0;
    let minBalance = 0;
    let minDay = 1;
    let maxAbs = 10000;

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const item = byDay.get(day) || { rec: 0, pay: 0, count: 0 };
      const net = item.rec - item.pay;
      running += net;
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
        net,
        balance: running,
        count: item.count,
      };
    });

    const activeDays = days.filter((d) => d.count > 0);
    return {
      days,
      activeDays,
      daysInMonth,
      minBalance,
      minDay,
      endingBalance: running,
      maxAbs,
    };
  }, [transactions, selectedMonth, matchesNonDateFilters, dateFilter.dateField]);

  // Category distribution across scopedTransactions
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { pay: number; rec: number; count: number }>();
    let grandTotal = 0;

    for (const t of scopedTransactions) {
      const key = t.categoryId || '__none__';
      const cur = map.get(key) || { pay: 0, rec: 0, count: 0 };
      if (t.type === 'payable') cur.pay += t.amountCents;
      else cur.rec += t.amountCents;
      cur.count += 1;
      grandTotal += t.amountCents;
      map.set(key, cur);
    }

    const items = Array.from(map.entries())
      .map(([catId, data]) => {
        const cat = catId !== '__none__' ? catMap.get(catId) : undefined;
        const total = data.pay + data.rec;
        return {
          id: catId,
          name: cat?.name || 'Sem categoria',
          color: cat?.color || '#64748B',
          ...data,
          total,
          pct: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { items, grandTotal };
  }, [scopedTransactions, catMap]);

  // Payment method distribution across scopedTransactions
  const paymentMethodReport = useMemo(() => {
    const map = new Map<string, { rec: number; pay: number; count: number }>();
    let settledTotal = 0;
    let pendingTotal = 0;

    for (const t of scopedTransactions) {
      if (t.status !== 'settled') {
        pendingTotal += t.amountCents;
        continue;
      }
      const method = t.paymentMethod?.trim() || 'Não informado';
      const cur = map.get(method) || { rec: 0, pay: 0, count: 0 };
      if (t.type === 'receivable') cur.rec += t.amountCents;
      else cur.pay += t.amountCents;
      cur.count += 1;
      settledTotal += t.amountCents;
      map.set(method, cur);
    }

    const items = Array.from(map.entries())
      .map(([method, data]) => {
        const total = data.rec + data.pay;
        return {
          method,
          ...data,
          total,
          pct: settledTotal > 0 ? Math.round((total / settledTotal) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { items, settledTotal, pendingTotal };
  }, [scopedTransactions]);

  return (
    <div className="space-y-6">
      {/* Analytics Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <DateRangeFilter
          value={dateFilter}
          onChange={setDateFilter}
          selectedMonth={selectedMonth}
          modes={['month', 'year', 'custom', 'all']}
          showDateFieldSelector
          label="Período dos Gráficos"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'payable' | 'receivable')}
            aria-label="Filtrar gráficos por tipo"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="all">Tipo: Todos (Pagar e Receber)</option>
            <option value="payable">Somente A Pagar</option>
            <option value="receivable">Somente A Receber</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'pending' | 'overdue' | 'settled')
            }
            aria-label="Filtrar gráficos por situação"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="all">Situação: Todas</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Somente vencidas</option>
            <option value="settled">Pagas / Recebidas</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrar gráficos por categoria"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="all">Categoria: Todas</option>
            <option value="__none__">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Annual 12-Month Evolution Chart */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Evolução Mensal em {selectedYear}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparativo mês a mês de receitas e despesas (considerando filtros de tipo, status e categoria)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
              Receber
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
              Pagar
            </span>
          </div>
        </div>

        <div className="h-56 w-full overflow-x-auto">
          <svg
            viewBox="0 0 720 195"
            className="w-full min-w-[540px] h-full"
            role="img"
            aria-label="Gráfico anual mês a mês"
          >
            {[0.25, 0.5, 0.75, 1].map((r) => (
              <line
                key={r}
                x1="0"
                x2="720"
                y1={165 - r * 140}
                y2={165 - r * 140}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeDasharray="3 3"
              />
            ))}
            {annualMonths.map((m, idx) => {
              const colW = 720 / 12;
              const cx = idx * colW + colW / 2;
              const recH = Math.max(2, (m.rec / maxAnnualCents) * 140);
              const payH = Math.max(2, (m.pay / maxAnnualCents) * 140);
              return (
                <g key={m.ym}>
                  <rect
                    x={cx - 12}
                    y={165 - recH}
                    width={10}
                    height={recH}
                    rx={3}
                    className="fill-emerald-600 dark:fill-emerald-500"
                  />
                  <rect
                    x={cx + 2}
                    y={165 - payH}
                    width={10}
                    height={payH}
                    rx={3}
                    className="fill-rose-600 dark:fill-rose-500"
                  />
                  <text
                    x={cx}
                    y={184}
                    textAnchor="middle"
                    className={`text-[10px] uppercase ${
                      m.ym === selectedMonth
                        ? 'fill-slate-900 dark:fill-white font-bold'
                        : 'fill-slate-500 dark:fill-slate-400'
                    }`}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Daily Cash Flow (Month curve + day-by-day ledger) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Fluxo de Caixa Diário — {formatMonthLabel(selectedMonth)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entradas, saídas e saldo acumulado dia a dia
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right font-mono-tabular">
              <div className="text-[11px] text-slate-500">Menor saldo</div>
              <div
                className={`text-xs font-bold ${
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
            {dailyCashFlow.activeDays.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllDays((v) => !v)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                {showAllDays ? 'Só dias c/ movimento' : 'Todos os dias'}
              </button>
            )}
          </div>
        </div>

        {dailyCashFlow.activeDays.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Nenhuma movimentação encontrada em {formatMonthLabel(selectedMonth)} para os filtros atuais.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="h-44 w-full">
              {(() => {
                const pts = dailyCashFlow.days;
                const zeroY = 74;
                const scale = 58 / dailyCashFlow.maxAbs;
                const coords = pts.map((pt, idx) => {
                  const x = pts.length > 1 ? (idx / (pts.length - 1)) * 560 + 20 : 300;
                  const y = zeroY - pt.balance * scale;
                  return { x, y };
                });
                const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                const minPt = coords[dailyCashFlow.minDay - 1];

                return (
                  <svg
                    viewBox="0 0 600 150"
                    className="w-full h-full overflow-visible"
                    role="img"
                    aria-label="Curva de saldo diário acumulado"
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
                    {minPt && dailyCashFlow.minBalance < 0 && (
                      <circle
                        cx={minPt.x}
                        cy={minPt.y}
                        r={4.5}
                        className="fill-red-600 dark:fill-red-400"
                      />
                    )}
                    <text x="20" y="142" className="text-[10px] fill-slate-400 font-mono-tabular">
                      01/{selectedMonth.slice(5, 7)}
                    </text>
                    <text
                      x="580"
                      y="142"
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono-tabular"
                    >
                      {String(dailyCashFlow.daysInMonth).padStart(2, '0')}/{selectedMonth.slice(5, 7)}
                    </text>
                  </svg>
                );
              })()}
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3 text-right">Entradas</th>
                    <th className="py-2 px-3 text-right">Saídas</th>
                    <th className="py-2 px-3 text-right">Saldo Acum.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono-tabular">
                  {(showAllDays ? dailyCashFlow.days : dailyCashFlow.activeDays).map((d) => (
                    <tr key={d.dateIso} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-200">
                        {formatDateBR(d.dateIso)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">
                        {d.rec > 0 ? formatBRL(d.rec) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-rose-700 dark:text-rose-400">
                        {d.pay > 0 ? formatBRL(d.pay) : '—'}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          d.balance < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatBRL(d.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Category & Payment Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Participação por Categoria
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Período: {periodLabel}
              </p>
            </div>
            <span className="text-xs font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
              {formatBRL(categoryBreakdown.grandTotal)}
            </span>
          </div>

          {categoryBreakdown.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-500 dark:text-slate-400">
              Nenhum lançamento encontrado no período selecionado.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {categoryBreakdown.items.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {cat.name} · <span className="text-slate-500">{cat.count}x</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white shrink-0">
                      {formatBRL(cat.total)} · {cat.pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, cat.pct)}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500">
                    <span>Receitas: {formatBRL(cat.rec)}</span>
                    <span>Despesas: {formatBRL(cat.pay)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method Breakdown */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Por Forma de Pagamento / Recebimento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Totais liquidados no período ({periodLabel})
              </p>
            </div>
            <span className="text-xs font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
              {formatBRL(paymentMethodReport.settledTotal)}
            </span>
          </div>

          {paymentMethodReport.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-500 dark:text-slate-400">
              Nenhuma conta liquidada neste período.
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {paymentMethodReport.items.map((item) => (
                <div key={item.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.method} · <span className="text-slate-500">{item.count}x</span>
                    </span>
                    <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white shrink-0">
                      {formatBRL(item.total)} · {item.pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 dark:bg-teal-500"
                      style={{ width: `${Math.max(4, item.pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500">
                    <span>Entradas: {formatBRL(item.rec)}</span>
                    <span>Saídas: {formatBRL(item.pay)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono-tabular text-slate-500">
            <span>Em aberto no período:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatBRL(paymentMethodReport.pendingTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
