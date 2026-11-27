import React, { useMemo, useState } from 'react';
import type { Category, Company, Contact, Transaction } from '../types';
import { formatBRL, isOverdue, todayISO } from '../utils/format';
import { BatchSettleModal } from './BatchSettleModal';
import { createDateFilterState, matchesDateFilter, type DateFilterValue } from './DateRangeFilter';
import { BatchActionBar, TransactionFilters, TransactionTable } from './transactions';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Modal } from './ui/Modal';

interface TransactionsViewProps {
  selectedMonth: string;
  initialFilter?: string;
  initialTypeFilter?: 'all' | 'payable' | 'receivable';
  filterTriggerKey?: number;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
  companies?: Company[];
  selectedCompanyId?: string | 'all';
  onOpenNew: () => void;
  onOpenConsult: (tx: Transaction) => void;
  onOpenEdit: (tx: Transaction) => void;
  onOpenXmlImport: () => void;
  onOpenExcelImport: () => void;
  onToggleSettle: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onBatchSettle: (txs: Transaction[], paymentMethod: string, paidAt: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onDeleteSingle: (tx: Transaction) => void;
  onDeleteGroup: (groupId: string) => void;
  onManageInstallments?: (tx: Transaction) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedMonth,
  initialFilter = 'all',
  initialTypeFilter = 'all',
  filterTriggerKey = 0,
  transactions,
  categories,
  contacts,
  companies = [],
  selectedCompanyId = 'all',
  onOpenNew,
  onOpenConsult,
  onOpenEdit,
  onOpenXmlImport,
  onOpenExcelImport,
  onToggleSettle,
  onDuplicate,
  onBatchSettle,
  onBatchDelete,
  onDeleteSingle,
  onDeleteGroup,
  onManageInstallments,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'month')
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'payable' | 'receivable'>(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);

  // Sync external navigation filters (e.g. from Executive AlertsDrawer) even when already on TransactionsView
  // Sincroniza filtros disparados externamente (ex: Central de Avisos Executiva)
  React.useEffect(() => {
    setStatusFilter(initialFilter);
    setTypeFilter(initialTypeFilter);
  }, [initialFilter, initialTypeFilter, filterTriggerKey]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchAllHistory, setSearchAllHistory] = useState<boolean>(true);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSettleOpen, setBatchSettleOpen] = useState(false);
  const [confirmBatchDeleteOpen, setConfirmBatchDeleteOpen] = useState(false);

  const today = todayISO();
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const { filtered, totals } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ignoreDateFilter = q.length > 0 && searchAllHistory;
    let rec = 0;
    let pay = 0;
    const rows = transactions.filter((t) => {
      if (!ignoreDateFilter && !matchesDateFilter(t, dateFilter, selectedMonth)) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'settled' && t.status !== 'settled') return false;
      if (statusFilter === 'overdue' && !isOverdue(t, today)) return false;
      if (statusFilter === 'recurring' && !t.isRecurring) return false;
      if (selectedCompanyId && selectedCompanyId !== 'all' && t.companyId !== selectedCompanyId) return false;
      if (categoryFilter !== 'all' && (t.categoryId || '') !== categoryFilter) return false;
      if (contactFilter !== 'all' && (t.contactId || '') !== contactFilter) return false;
      if (q) {
        const contact = t.contactId ? contactMap.get(t.contactId) : undefined;
        const catName = (t.categoryId && catMap.get(t.categoryId)?.name.toLowerCase()) || '';
        const match =
          t.description.toLowerCase().includes(q) ||
          t.documentNumber.toLowerCase().includes(q) ||
          (contact?.name.toLowerCase() || '').includes(q) ||
          (contact?.tradeName.toLowerCase() || '').includes(q) ||
          (contact?.document.toLowerCase() || '').includes(q) ||
          catName.includes(q) ||
          (t.paymentMethod || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (t.type === 'receivable') rec += t.amountCents;
      else pay += t.amountCents;
      return true;
    });
    return { filtered: rows, totals: { rec, pay, net: rec - pay } };
  }, [
    transactions, dateFilter, selectedMonth, typeFilter, statusFilter,
    categoryFilter, contactFilter, selectedCompanyId, search, searchAllHistory, today, contactMap, catMap,
  ]);

  const selection = useMemo(() => {
    const selected = filtered.filter((t) => selectedIds.has(t.id));
    const pending = selected.filter((t) => t.status === 'pending');
    const totalCents = selected.reduce((s, t) => s + t.amountCents, 0);
    return { selected, pending, totalCents };
  }, [filtered, selectedIds]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(filtered.map((t) => t.id)));
  };

  return (
    <div className="space-y-5">
      <TransactionFilters
        selectedMonth={selectedMonth}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        contactFilter={contactFilter}
        onContactFilterChange={setContactFilter}
        search={search}
        onSearchChange={setSearch}
        searchAllHistory={searchAllHistory}
        onSearchAllHistoryChange={setSearchAllHistory}
        categories={categories}
        contacts={contacts}
        filteredCount={filtered.length}
        totals={totals}
        onOpenXmlImport={onOpenXmlImport}
        onOpenExcelImport={onOpenExcelImport}
        onOpenNew={onOpenNew}
      />

      <BatchActionBar
        selectedCount={selection.selected.length}
        pendingCount={selection.pending.length}
        selectedTotalCents={selection.totalCents}
        onOpenBatchSettle={() => setBatchSettleOpen(true)}
        onOpenBatchDelete={() => setConfirmBatchDeleteOpen(true)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <TransactionTable
        transactions={filtered}
        catMap={catMap}
        contactMap={contactMap}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        selectedIds={selectedIds}
        allVisibleSelected={allVisibleSelected}
        today={today}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onOpenNew={onOpenNew}
        onOpenConsult={onOpenConsult}
        onOpenEdit={onOpenEdit}
        onToggleSettle={onToggleSettle}
        onDuplicate={onDuplicate}
        onRequestDelete={setConfirmDeleteTx}
        onManageInstallments={onManageInstallments}
      />

      {batchSettleOpen && selection.pending.length > 0 && (
        <BatchSettleModal
          transactions={selection.pending}
          onClose={() => setBatchSettleOpen(false)}
          onConfirm={(method, paidAt) => {
            onBatchSettle(selection.pending, method, paidAt);
            setSelectedIds(new Set());
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmBatchDeleteOpen}
        onClose={() => setConfirmBatchDeleteOpen(false)}
        onConfirm={() => {
          onBatchDelete(selection.selected.map((t) => t.id));
          setSelectedIds(new Set());
          setConfirmBatchDeleteOpen(false);
        }}
        title="Excluir lançamentos selecionados"
        confirmLabel="Confirmar exclusão"
        message={
          <>
            Deseja excluir os <strong>{selection.selected.length}</strong> lançamentos selecionados (
            {formatBRL(selection.totalCents)})? Esta ação não pode ser desfeita.
          </>
        }
      />

      <Modal
        isOpen={Boolean(confirmDeleteTx)}
        onClose={() => setConfirmDeleteTx(null)}
        title="Confirmar exclusão"
        size="sm"
        footer={
          confirmDeleteTx && (
            <div className="flex flex-col sm:flex-row justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setConfirmDeleteTx(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => { onDeleteSingle(confirmDeleteTx); setConfirmDeleteTx(null); }}>
                Excluir esta parcela
              </Button>
              {confirmDeleteTx.installmentGroupId && confirmDeleteTx.installmentTotal > 1 && (
                <Button
                  variant="danger"
                  className="bg-red-800 hover:bg-red-900"
                  onClick={() => { onDeleteGroup(confirmDeleteTx.installmentGroupId!); setConfirmDeleteTx(null); }}
                >
                  Excluir todas ({confirmDeleteTx.installmentTotal}x)
                </Button>
              )}
            </div>
          )
        }
      >
        {confirmDeleteTx && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Deseja excluir <strong>{confirmDeleteTx.description}</strong> ({formatBRL(confirmDeleteTx.amountCents)})?
          </p>
        )}
      </Modal>
    </div>
  );
};
