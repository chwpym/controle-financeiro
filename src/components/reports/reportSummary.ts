import type { Transaction } from '../../types';
import { isOverdue } from '../../utils/format';
import type { ReportSummary } from './ReportExecutiveKpis';

export function computeReportSummary(scopedTransactions: Transaction[], today: string): ReportSummary {
  let recTotal = 0;
  let recSettled = 0;
  let payTotal = 0;
  let paySettled = 0;
  let overdueTotal = 0;

  for (const t of scopedTransactions) {
    if (t.type === 'receivable') {
      recTotal += t.amountCents;
      if (t.status === 'settled') recSettled += t.amountCents;
    } else {
      payTotal += t.amountCents;
      if (t.status === 'settled') paySettled += t.amountCents;
    }
    if (isOverdue(t, today)) overdueTotal += t.amountCents;
  }

  return {
    recTotal,
    recSettled,
    payTotal,
    paySettled,
    overdueTotal,
    projectedNet: recTotal - payTotal,
    realizedNet: recSettled - paySettled,
  };
}
