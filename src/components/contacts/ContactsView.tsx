import React, { useMemo, useState } from 'react';
import type { Contact, Transaction } from '../../types';
import { currentMonthKey } from '../../utils/format';
import { ContactHistoryModal } from '../ContactHistoryModal';
import { ContactDrawer } from './ContactDrawer';
import { ContactFilters, type QuickFilter } from './ContactFilters';
import { ContactTable } from './ContactTable';
import { useContactForm } from './useContactForm';

interface ContactsViewProps {
  userId: string;
  selectedMonth?: string;
  contacts: Contact[];
  transactions: Transaction[];
  onOpenConsult: (tx: Transaction) => void;
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  userId,
  selectedMonth = currentMonthKey(),
  contacts,
  transactions,
  onOpenConsult,
  onSaveContact,
  onDeleteContact,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<QuickFilter>('ALL');
  const [inspectContact, setInspectContact] = useState<Contact | null>(null);
  const {
    form,
    setForm,
    isDrawerOpen,
    setIsDrawerOpen,
    feedback,
    duplicateContact,
    handleOpenNew,
    handleEdit,
    handleSubmit,
    lookupCnpjLoading,
    lookupCepLoading,
    handleConsultCnpj,
    handleConsultCep,
  } = useContactForm(userId, contacts, onSaveContact);

  const contactTxMap = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      if (!tx.contactId) continue;
      const list = map.get(tx.contactId) || [];
      list.push(tx);
      map.set(tx.contactId, list);
    }
    return map;
  }, [transactions]);

  const pjCount = useMemo(() => contacts.filter((c) => c.personType === 'PJ').length, [contacts]);
  const pfCount = useMemo(() => contacts.filter((c) => c.personType === 'PF').length, [contacts]);
  const withPendingCount = useMemo(() => {
    return contacts.filter((c) => {
      const txs = contactTxMap.get(c.id) || [];
      return txs.some((t) => t.status === 'pending');
    }).length;
  }, [contacts, contactTxMap]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filterType === 'PJ' && c.personType !== 'PJ') return false;
      if (filterType === 'PF' && c.personType !== 'PF') return false;
      if (filterType === 'PENDING') {
        const txs = contactTxMap.get(c.id) || [];
        if (!txs.some((t) => t.status === 'pending')) return false;
      }

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tradeName.toLowerCase().includes(q) ||
        c.document.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    });
  }, [contacts, search, filterType, contactTxMap]);

  return (
    <div className="space-y-6">
      <ContactFilters
        search={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterChange={setFilterType}
        totalCount={contacts.length}
        pjCount={pjCount}
        pfCount={pfCount}
        withPendingCount={withPendingCount}
        onOpenNew={handleOpenNew}
      />

      <ContactTable
        contacts={filteredContacts}
        contactTxMap={contactTxMap}
        search={search}
        onOpenNew={handleOpenNew}
        onInspect={setInspectContact}
        onEdit={handleEdit}
        onDelete={onDeleteContact}
      />

      {/* Slide-over Drawer for Create / Edit (Modelo Gaveta ERP) */}
      <ContactDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        form={form}
        setForm={setForm}
        duplicateContact={duplicateContact}
        onConsultCnpj={handleConsultCnpj}
        onConsultCep={handleConsultCep}
        lookupCnpjLoading={lookupCnpjLoading}
        lookupCepLoading={lookupCepLoading}
        feedback={feedback}
        onSubmit={handleSubmit}
        onDelete={(id) => onDeleteContact(id)}
        onEditExisting={(existing) => handleEdit(existing)}
      />

      {/* Contact Financial History Modal */}
      <ContactHistoryModal
        contact={inspectContact}
        isOpen={Boolean(inspectContact)}
        onClose={() => setInspectContact(null)}
        transactions={contactTxMap.get(inspectContact?.id || '') || []}
        selectedMonth={selectedMonth}
        onOpenConsult={onOpenConsult}
      />
    </div>
  );
};
