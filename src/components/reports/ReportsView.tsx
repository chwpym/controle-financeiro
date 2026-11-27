import React from 'react';
import type { Category, Company, Contact, Transaction } from '../../types';
import { DateRangeFilter } from '../DateRangeFilter';
import { ReportActionsBar } from './ReportActionsBar';
import { ReportCategoryBreakdown } from './ReportCategoryBreakdown';
import { ReportExecutiveKpis } from './ReportExecutiveKpis';
import { ReportFiltersBar } from './ReportFiltersBar';
import { useReportFilters } from './useReportFilters';

interface ReportsViewProps {
  username: string;
  selectedMonth: string;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
  companies?: Company[];
  selectedCompanyId?: string | 'all';
  onOpenConsult: (tx: Transaction) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  username,
  selectedMonth,
  transactions,
  categories,
  contacts,
  companies = [],
  selectedCompanyId = 'all',
  onOpenConsult,
}) => {
  const f = useReportFilters({ selectedMonth, transactions, categories, contacts });

  return (
    <div className="space-y-6">
      {/* Header Controls, Date Filter, Granular Filters & Export Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <DateRangeFilter
              value={f.dateFilter}
              onChange={f.setDateFilter}
              selectedMonth={selectedMonth}
              modes={['month', 'year', 'custom', 'all']}
              showDateFieldSelector
            />
          </div>

          <ReportActionsBar
            username={username}
            periodLabel={f.periodLabel}
            filterSummary={f.filterSummary}
            scopedTransactions={f.scopedTransactions}
            categories={categories}
            contacts={contacts}
            companies={companies}
            selectedCompanyId={selectedCompanyId}
          />
        </div>

        <ReportFiltersBar
          categories={categories}
          contacts={contacts}
          typeFilter={f.typeFilter}
          setTypeFilter={f.setTypeFilter}
          statusFilter={f.statusFilter}
          setStatusFilter={f.setStatusFilter}
          categoryFilter={f.categoryFilter}
          setCategoryFilter={f.setCategoryFilter}
          contactFilter={f.contactFilter}
          setContactFilter={f.setContactFilter}
          paymentMethodFilter={f.paymentMethodFilter}
          setPaymentMethodFilter={f.setPaymentMethodFilter}
          search={f.search}
          setSearch={f.setSearch}
          hasExtraFilters={f.hasExtraFilters}
          resetFilters={f.resetFilters}
          filterSummary={f.filterSummary}
        />
      </div>

      {/* Period Summary Grid (4 essential KPIs) */}
      <ReportExecutiveKpis summary={f.summary} count={f.scopedTransactions.length} />

      {/* Detailed Report Table */}
      <ReportCategoryBreakdown
        periodLabel={f.periodLabel}
        scopedTransactions={f.scopedTransactions}
        catMap={f.catMap}
        contactMap={f.contactMap}
        today={f.today}
        onOpenConsult={onOpenConsult}
      />
    </div>
  );
};
