import React, { useMemo, useState } from 'react';
import {
  Building2,
  Edit2,
  Eye,
  Filter,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import type { Contact, PersonType, Transaction } from '../types';
import { api, ApiError } from '../utils/api';
import {
  currentMonthKey,
  findDuplicateContactDocument,
  formatBRL,
  formatDateBR,
  isOverdue,
  todayISO,
} from '../utils/format';
import {
  createDateFilterState,
  DateRangeFilter,
  matchesDateFilter,
  type DateFilterValue,
} from './DateRangeFilter';
import { ContactDrawer, type ContactFormData } from './ContactDrawer';

interface ContactsViewProps {
  userId: string;
  selectedMonth?: string;
  contacts: Contact[];
  transactions: Transaction[];
  onOpenConsult: (tx: Transaction) => void;
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
}

const EMPTY_FORM: ContactFormData = {
  id: null,
  personType: 'PJ',
  kind: 'both',
  name: '',
  tradeName: '',
  document: '',
  email: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

type QuickFilter = 'ALL' | 'PJ' | 'PF' | 'PENDING';

export const ContactsView: React.FC<ContactsViewProps> = ({
  userId,
  selectedMonth = currentMonthKey(),
  contacts,
  transactions,
  onOpenConsult,
  onSaveContact,
  onDeleteContact,
}) => {
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<QuickFilter>('ALL');
  const [lookupCnpjLoading, setLookupCnpjLoading] = useState(false);
  const [lookupCepLoading, setLookupCepLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [inspectContact, setInspectContact] = useState<Contact | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'all')
  );

  const today = todayISO();

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

  const duplicateContact = useMemo(() => {
    return findDuplicateContactDocument(contacts, form.document, form.id);
  }, [contacts, form.document, form.id]);

  const handleOpenNew = () => {
    setForm(EMPTY_FORM);
    setFeedback(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (c: Contact) => {
    setFeedback(null);
    setForm({
      id: c.id,
      personType: c.personType,
      kind: c.kind,
      name: c.name,
      tradeName: c.tradeName || '',
      document: c.document || '',
      email: c.email || '',
      phone: c.phone || '',
      cep: c.cep || '',
      street: c.street || '',
      number: c.number || '',
      complement: c.complement || '',
      neighborhood: c.neighborhood || '',
      city: c.city || '',
      state: c.state || '',
    });
    setIsDrawerOpen(true);
  };

  const handleConsultCnpj = async () => {
    setFeedback(null);
    const digits = form.document.replace(/\D/g, '');
    if (digits.length !== 14) {
      setFeedback({ kind: 'error', text: 'Informe os 14 dígitos do CNPJ antes de consultar.' });
      return;
    }

    const existingDup = findDuplicateContactDocument(contacts, digits, form.id);
    if (existingDup) {
      setFeedback({
        kind: 'error',
        text: `Atenção: Este CNPJ já pertence ao contato cadastrado "${existingDup.name}".`,
      });
      return;
    }

    setLookupCnpjLoading(true);
    try {
      const data = await api.lookupCnpj(digits);
      setForm((prev) => ({
        ...prev,
        personType: 'PJ',
        document: data.cnpj || prev.document,
        name: data.name || prev.name,
        tradeName: data.tradeName || prev.tradeName,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        cep: data.cep || prev.cep,
        street: data.street || prev.street,
        number: data.number || prev.number,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
      setFeedback({
        kind: 'success',
        text: `Dados preenchidos via CNPJ${data.situacao ? ` (${data.situacao})` : ''}. Você pode editar qualquer campo.`,
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof ApiError ? err.message : 'Não foi possível consultar o CNPJ agora. Preencha manualmente.',
      });
    } finally {
      setLookupCnpjLoading(false);
    }
  };

  const handleConsultCep = async () => {
    setFeedback(null);
    const digits = form.cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setFeedback({ kind: 'error', text: 'Informe os 8 dígitos do CEP antes de consultar.' });
      return;
    }

    setLookupCepLoading(true);
    try {
      const data = await api.lookupCep(digits);
      setForm((prev) => ({
        ...prev,
        cep: data.cep || prev.cep,
        street: data.street || prev.street,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
      setFeedback({
        kind: 'success',
        text: 'Endereço preenchido pela API de CEP. Você pode editar livremente.',
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof ApiError ? err.message : 'Não foi possível consultar o CEP agora. Preencha manualmente.',
      });
    } finally {
      setLookupCepLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!form.name.trim()) {
      setFeedback({
        kind: 'error',
        text: form.personType === 'PJ' ? 'Informe a Razão Social.' : 'Informe o Nome completo.',
      });
      return;
    }

    const duplicate = findDuplicateContactDocument(contacts, form.document, form.id);
    if (duplicate) {
      setFeedback({
        kind: 'error',
        text: `Não é possível salvar: este ${form.personType === 'PJ' ? 'CNPJ' : 'CPF'} já está cadastrado para "${duplicate.name}".`,
      });
      return;
    }

    const now = new Date().toISOString();
    const existing = form.id ? contacts.find((c) => c.id === form.id) : undefined;
    const contact: Contact = {
      id: form.id || crypto.randomUUID(),
      userId,
      personType: form.personType,
      kind: form.kind,
      name: form.name.trim(),
      tradeName: form.personType === 'PJ' ? form.tradeName.trim() : '',
      document: form.document.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      cep: form.cep.trim(),
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    onSaveContact(contact);
    setForm(EMPTY_FORM);
    setIsDrawerOpen(false);
    setFeedback(null);
  };

  const openInspectContact = (c: Contact) => {
    setHistoryDateFilter(createDateFilterState(selectedMonth, 'all'));
    setInspectContact(c);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-400">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                Cadastros PF / PJ
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gerencie seus clientes, fornecedores e parceiros de negócio com ficha financeira integrada.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs sm:text-sm font-semibold hover:bg-teal-800 transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0 min-h-[42px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Contato
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por razão social, fantasia, CPF/CNPJ ou cidade..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-xs min-h-[40px]"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Todos ({contacts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PJ')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'PJ'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Pessoa Jurídica ({pjCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PF')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'PF'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Pessoa Física ({pfCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PENDING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Com Pendências ({withPendingCount})
            </button>
          </div>
        </div>
      </div>

      {/* Spacious Contacts List / Cards */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nenhum contato encontrado
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? 'Nenhum resultado corresponde aos termos da pesquisa.'
                : 'Você ainda não cadastrou nenhum cliente ou fornecedor.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={handleOpenNew}
                className="mt-2 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar primeiro contato
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredContacts.map((c) => {
              const linkedTxs = contactTxMap.get(c.id) || [];
              const pendingCents = linkedTxs
                .filter((t) => t.status === 'pending')
                .reduce((s, t) => s + t.amountCents, 0);

              return (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Left Info Column */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                      {c.personType === 'PJ' ? <Building2 className="w-5 h-5 text-teal-700 dark:text-teal-400" /> : <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openInspectContact(c)}
                          title="Abrir ficha financeira do contato"
                          className="text-left text-sm sm:text-base font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 truncate cursor-pointer"
                        >
                          {c.name}
                        </button>

                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 font-mono-tabular shrink-0">
                          {c.personType}
                        </span>

                        {c.kind && c.kind !== 'both' && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 uppercase ${
                              c.kind === 'customer'
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                            }`}
                          >
                            {c.kind === 'customer' ? 'Cliente' : 'Fornecedor'}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {c.tradeName && <span className="text-slate-700 dark:text-slate-300 font-medium">({c.tradeName})</span>}
                        {c.document && <span className="font-mono-tabular font-medium text-slate-600 dark:text-slate-400">{c.document}</span>}
                        {c.city && (
                          <span>
                            · {c.city}
                            {c.state ? `/${c.state}` : ''}
                          </span>
                        )}
                        {c.phone && (
                          <span className="font-mono-tabular inline-flex items-center gap-1">
                            · <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Status & Actions Column */}
                  <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                    {/* Financial Badge */}
                    <div className="text-left md:text-right">
                      {linkedTtxInfo(linkedTxs.length, pendingCents)}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openInspectContact(c)}
                        className="p-2 rounded-xl text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
                        title="Ver ficha financeira e extrato"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
                        title="Editar cadastro (abrir gaveta)"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteContact(c.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
                        title="Excluir contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
      {inspectContact && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white truncate">
                  Ficha Financeira — {inspectContact.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  {inspectContact.personType}
                  {inspectContact.document ? ` · ${inspectContact.document}` : ''}
                  {inspectContact.city ? ` · ${inspectContact.city}/${inspectContact.state}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectContact(null)}
                aria-label="Fechar ficha"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const allHistory = contactTxMap.get(inspectContact.id) || [];
              const history = allHistory
                .filter((tx) => matchesDateFilter(tx, historyDateFilter, selectedMonth))
                .slice()
                .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
              const settledCents = history
                .filter((t) => t.status === 'settled')
                .reduce((s, t) => s + t.amountCents, 0);
              const pendingCents = history
                .filter((t) => t.status === 'pending')
                .reduce((s, t) => s + t.amountCents, 0);
              const overdueCents = history
                .filter((t) => isOverdue(t, today))
                .reduce((s, t) => s + t.amountCents, 0);

              return (
                <div className="p-6 space-y-4 overflow-y-auto">
                  <DateRangeFilter
                    value={historyDateFilter}
                    onChange={setHistoryDateFilter}
                    selectedMonth={selectedMonth}
                    modes={['all', 'month', 'year', 'custom']}
                    showDateFieldSelector
                    compact
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Liquidado
                      </div>
                      <div className="mt-1 text-sm sm:text-base font-mono-tabular font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBRL(settledCents)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Em aberto
                      </div>
                      <div className="mt-1 text-sm sm:text-base font-mono-tabular font-bold text-slate-900 dark:text-white">
                        {formatBRL(pendingCents)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Vencido
                      </div>
                      <div className="mt-1 text-sm sm:text-base font-mono-tabular font-bold text-red-600 dark:text-red-400">
                        {formatBRL(overdueCents)}
                      </div>
                    </div>
                  </div>

                  {history.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      {allHistory.length === 0
                        ? 'Nenhuma conta a pagar ou receber vinculada a este contato ainda.'
                        : 'Nenhuma conta vinculada encontrada para o período selecionado.'}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                      {history.map((tx) => {
                        const overdue = isOverdue(tx, today);
                        return (
                          <div
                            key={tx.id}
                            className="p-3.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onOpenConsult(tx)}
                                className="text-left font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer"
                              >
                                {tx.description}
                              </button>
                              <div className="text-slate-500 dark:text-slate-400 font-mono-tabular mt-0.5">
                                Venc. {formatDateBR(tx.dueDate)} ·{' '}
                                {tx.type === 'receivable' ? 'A Receber' : 'A Pagar'} ·{' '}
                                <span
                                  className={
                                    tx.status === 'settled'
                                      ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                      : overdue
                                        ? 'text-red-600 dark:text-red-400 font-semibold'
                                        : 'text-amber-600 dark:text-amber-400 font-semibold'
                                  }
                                >
                                  {tx.status === 'settled'
                                    ? tx.type === 'receivable'
                                      ? 'Recebido'
                                      : 'Pago'
                                    : overdue
                                      ? 'Vencido'
                                      : 'Pendente'}
                                </span>
                                {tx.paymentMethod ? ` (${tx.paymentMethod})` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`font-mono-tabular font-bold ${
                                  tx.type === 'receivable'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {formatBRL(tx.amountCents)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenConsult(tx)}
                                title="Consultar e gerar recibo PDF"
                                className="p-1.5 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

function linkedTtxInfo(count: number, pendingCents: number) {
  if (count === 0) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">
        Nenhuma conta vinculada
      </span>
    );
  }

  if (pendingCents > 0) {
    return (
      <div>
        <div className="text-xs font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
          {formatBRL(pendingCents)}
        </div>
        <div className="text-[11px] text-slate-500">
          {count} conta(s) ({formatBRL(pendingCents)} em aberto)
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        Contas em dia
      </div>
      <div className="text-[11px] text-slate-500">
        {count} conta(s) liquidada(s)
      </div>
    </div>
  );
}
