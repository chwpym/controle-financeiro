import { useMemo } from 'react';
import type { Transaction } from '../../types';
import { isOverdue, todayISO } from '../../utils/format';
import type { DashboardMonthStats } from './DashboardKpis';

export interface DashboardStatsResult {
  monthStats: DashboardMonthStats & { monthRows: Transaction[] };
}

export function useDashboardStats(
  transactions: Transaction[],
  selectedMonth: string
): DashboardStatsResult {
  const today = todayISO();

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

    return {
      monthRows,
      receivableTotal,
      receivableSettled,
      payableTotal,
      payableSettled,
      overdueTotal,
      overdueCount,
      projectedBalance: receivableTotal - payableTotal,
      realizedBalance: receivableSettled - payableSettled,
    };
  }, [transactions, selectedMonth, today]);

  return { monthStats };
}
