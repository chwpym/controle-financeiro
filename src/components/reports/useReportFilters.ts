import { useMemo, useState } from 'react';
import type { Category, Contact, Transaction } from '../../types';
import { isOverdue, todayISO } from '../../utils/format';
import {
  createDateFilterState,
  describeDateFilter,
  matchesDateFilter,
  type DateFilterValue,
} from '../DateRangeFilter';

import { computeReportSummary } from './reportSummary';

export type ReportTypeFilter = 'all' | 'payable' | 'receivable';
export type ReportStatusFilter = 'all' | 'pending' | 'overdue' | 'settled';

interface Params {
  selectedMonth: string;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
}

export function useReportFilters({ selectedMonth, transactions, categories, contacts }: Params) {
  const today = todayISO();

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'month')
  );
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const hasExtraFilters =
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    contactFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    search.trim() !== '';

  const resetFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setContactFilter('all');
    setPaymentMethodFilter('all');
    setSearch('');
  };

  const scopedTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (!matchesDateFilter(t, dateFilter, selectedMonth)) return false;

      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'settled' && t.status !== 'settled') return false;
      if (statusFilter === 'overdue' && !isOverdue(t, today)) return false;

      if (categoryFilter === '__none__' && t.categoryId) return false;
      if (categoryFilter !== 'all' && categoryFilter !== '__none__' && t.categoryId !== categoryFilter) {
        return false;
      }

      if (contactFilter === '__none__' && t.contactId) return false;
      if (contactFilter !== 'all' && contactFilter !== '__none__' && t.contactId !== contactFilter) {
        return false;
      }

      if (paymentMethodFilter === '__none__' && t.paymentMethod) return false;
      if (
        paymentMethodFilter !== 'all' &&
        paymentMethodFilter !== '__none__' &&
        t.paymentMethod !== paymentMethodFilter
      ) {
        return false;
      }

      if (q) {
        const contact = t.contactId ? contactMap.get(t.contactId) : undefined;
        const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
        const match =
          t.description.toLowerCase().includes(q) ||
          t.documentNumber.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          (t.paymentMethod || '').toLowerCase().includes(q) ||
          (contact?.name.toLowerCase() || '').includes(q) ||
          (contact?.tradeName.toLowerCase() || '').includes(q) ||
          (contact?.document.toLowerCase() || '').includes(q) ||
          (cat?.name.toLowerCase() || '').includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    transactions,
    dateFilter,
    selectedMonth,
    typeFilter,
    statusFilter,
    categoryFilter,
    contactFilter,
    paymentMethodFilter,
    search,
    today,
    contactMap,
    catMap,
  ]);

  const periodLabel = describeDateFilter(dateFilter, selectedMonth);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (typeFilter === 'payable') parts.push('Tipo: A Pagar');
    if (typeFilter === 'receivable') parts.push('Tipo: A Receber');

    if (statusFilter === 'pending') parts.push('Status: Pendentes');
    if (statusFilter === 'overdue') parts.push('Status: Vencidas');
    if (statusFilter === 'settled') parts.push('Status: Pagas/Recebidas');

    if (categoryFilter === '__none__') parts.push('Categoria: Sem categoria');
    else if (categoryFilter !== 'all') {
      parts.push(`Categoria: ${catMap.get(categoryFilter)?.name || categoryFilter}`);
    }

    if (contactFilter === '__none__') parts.push('Contato: Sem contato');
    else if (contactFilter !== 'all') {
      parts.push(`Contato: ${contactMap.get(contactFilter)?.name || contactFilter}`);
    }

    if (paymentMethodFilter === '__none__') parts.push('Forma Pgto: Não informada');
    else if (paymentMethodFilter !== 'all') {
      parts.push(`Forma Pgto: ${paymentMethodFilter}`);
    }

    if (search.trim()) parts.push(`Busca: "${search.trim()}"`);

    return parts.length > 0 ? parts.join(' | ') : undefined;
  }, [
    typeFilter,
    statusFilter,
    categoryFilter,
    contactFilter,
    paymentMethodFilter,
    search,
    catMap,
    contactMap,
  ]);

  const summary = useMemo(
    () => computeReportSummary(scopedTransactions, today),
    [scopedTransactions, today]
  );

  return {
    today,
    dateFilter,
    setDateFilter,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    contactFilter,
    setContactFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    search,
    setSearch,
    catMap,
    contactMap,
    hasExtraFilters,
    resetFilters,
    scopedTransactions,
    periodLabel,
    filterSummary,
    summary,
  };
}
