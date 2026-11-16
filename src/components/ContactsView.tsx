import React, { useMemo, useState } from 'react';
import { Building2, Edit2, Eye, Loader2, Search, Trash2, User, X } from 'lucide-react';
import type { Contact, ContactKind, PersonType, Transaction } from '../types';
import { api, ApiError } from '../utils/api';
import {
  currentMonthKey,
  formatBRL,
  formatDateBR,
  isOverdue,
  maskCEP,
  maskCNPJ,
  maskCPF,
  todayISO,
} from '../utils/format';
import {
  createDateFilterState,
  DateRangeFilter,
  matchesDateFilter,
  type DateFilterValue,
} from './DateRangeFilter';

interface ContactsViewProps {
  userId: string;
  selectedMonth?: string;
  contacts: Contact[];
  transactions: Transaction[];
  onOpenConsult: (tx: Transaction) => void;
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
}

interface ContactFormState {
  id: string | null;
  personType: PersonType;
  kind: ContactKind;
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const EMPTY_FORM: ContactFormState = {
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

export const ContactsView: React.FC<ContactsViewProps> = ({
  userId,
  selectedMonth = currentMonthKey(),
  contacts,
  transactions,
  onOpenConsult,
  onSaveContact,
  onDeleteContact,
}) => {
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PF' | 'PJ'>('ALL');
  const [lookupCnpjLoading, setLookupCnpjLoading] = useState(false);
  const [lookupCepLoading, setLookupCepLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [inspectContact, setInspectContact] = useState<Contact | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'all')
  );

  const openInspectContact = (c: Contact) => {
    setHistoryDateFilter(createDateFilterState(selectedMonth, 'all'));
    setInspectContact(c);
  };

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

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filterType !== 'ALL' && c.personType !== filterType) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tradeName.toLowerCase().includes(q) ||
        c.document.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    });
  }, [contacts, search, filterType]);

  const handleTogglePersonType = (nextType: PersonType) => {
    setFeedback(null);
    setForm((prev) => ({
      ...prev,
      personType: nextType,
      document:
        nextType === 'PF' ? maskCPF(prev.document) : maskCNPJ(prev.document),
    }));
  };

  const handleConsultCnpj = async () => {
    setFeedback(null);
    const digits = form.document.replace(/\D/g, '');
    if (digits.length !== 14) {
      setFeedback({ kind: 'error', text: 'Informe os 14 dígitos do CNPJ antes de consultar.' });
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
    setFeedback({ kind: 'success', text: 'Cadastro salvo com sucesso.' });
  };

  const handleEdit = (c: Contact) => {
    setFeedback(null);
    setForm({
      id: c.id,
      personType: c.personType,
      kind: c.kind,
      name: c.name,
      tradeName: c.tradeName,
      document: c.document,
      email: c.email,
      phone: c.phone,
      cep: c.cep,
      street: c.street,
      number: c.number,
      complement: c.complement,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Unified PF / PJ Form */}
      <div className="xl:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              {form.id ? 'Editar Cadastro' : 'Cadastro Unificado PF / PJ'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alterne rapidamente entre Pessoa Física e Jurídica
            </p>
          </div>
          {form.id && (
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setFeedback(null);
              }}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
            >
              Novo cadastro
            </button>
          )}
        </div>

        {/* Fast PF / PJ Toggle on the exact same screen */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => handleTogglePersonType('PJ')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[42px] ${
              form.personType === 'PJ'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Pessoa Jurídica (CNPJ)
          </button>
          <button
            type="button"
            onClick={() => handleTogglePersonType('PF')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[42px] ${
              form.personType === 'PF'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            Pessoa Física (CPF)
          </button>
        </div>

        {feedback && (
          <div
            className={`mb-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
              feedback.kind === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Document + Consultar button for PJ */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {form.personType === 'PJ' ? 'CNPJ' : 'CPF'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.document}
                onChange={(e) =>
                  setForm({
                    ...form,
                    document:
                      form.personType === 'PJ'
                        ? maskCNPJ(e.target.value)
                        : maskCPF(e.target.value),
                  })
                }
                placeholder={form.personType === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[44px]"
              />
              {form.personType === 'PJ' && (
                <button
                  type="button"
                  onClick={handleConsultCnpj}
                  disabled={lookupCnpjLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap min-h-[44px]"
                >
                  {lookupCnpjLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Consultar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {form.personType === 'PJ' ? 'Razão Social *' : 'Nome completo *'}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.personType === 'PJ' ? 'Ex: Empresa Exemplo Ltda' : 'Ex: João da Silva'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            {form.personType === 'PJ' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={form.tradeName}
                  onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Relação
              </label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as ContactKind })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              >
                <option value="both">Cliente e Fornecedor</option>
                <option value="supplier">Fornecedor (Contas a Pagar)</option>
                <option value="customer">Cliente (Contas a Receber)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail de contato (opcional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@empresa.com.br"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            {/* CEP + Consultar */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                CEP
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: maskCEP(e.target.value) })}
                  placeholder="00000-000"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={handleConsultCep}
                  disabled={lookupCepLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap min-h-[44px]"
                >
                  {lookupCepLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Consultar
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Logradouro / Rua
              </label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Número
              </label>
              <input
                type="text"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Complemento
              </label>
              <input
                type="text"
                value={form.complement}
                onChange={(e) => setForm({ ...form, complement: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  UF
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm uppercase min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors min-h-[44px]"
          >
            {form.id ? 'Atualizar cadastro' : 'Salvar cadastro'}
          </button>
        </form>
      </div>

      {/* Contacts List */}
      <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['ALL', 'PJ', 'PF'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[34px] ${
                  filterType === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {t === 'ALL' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum cliente ou fornecedor encontrado.
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
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openInspectContact(c)}
                        title="Abrir ficha financeira do contato"
                        className="text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 truncate"
                      >
                        {c.name}
                      </button>
                      <span className="text-xs font-mono-tabular text-teal-700 dark:text-teal-400 font-semibold shrink-0">
                        · {c.personType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                      {c.tradeName && <span>{c.tradeName}</span>}
                      {c.document && <span className="font-mono-tabular">{c.document}</span>}
                      {c.city && (
                        <span>
                          · {c.city}
                          {c.state ? `/${c.state}` : ''}
                        </span>
                      )}
                      {c.phone && <span className="font-mono-tabular">· {c.phone}</span>}
                      {linkedTxs.length > 0 && (
                        <span className="font-mono-tabular text-teal-700 dark:text-teal-400 font-medium">
                          · {linkedTxs.length} conta(s)
                          {pendingCents > 0 ? ` (${formatBRL(pendingCents)} em aberto)` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openInspectContact(c)}
                      className="p-2 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Ver ficha financeira e histórico"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Editar contato"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteContact(c.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="Excluir contato"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                                className="text-left font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400"
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
                                className="p-1.5 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40"
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
