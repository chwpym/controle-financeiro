import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FolderDown,
  Loader2,
  MapPin,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import type { Contact, ContactKind, PersonType } from '../types';
import { maskCEP, maskCNPJ, maskCPF } from '../utils/format';

export interface ContactFormData {
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

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  form: ContactFormData;
  setForm: React.Dispatch<React.SetStateAction<ContactFormData>>;
  duplicateContact: Contact | null;
  onConsultCnpj: () => Promise<void>;
  onConsultCep: () => Promise<void>;
  lookupCnpjLoading: boolean;
  lookupCepLoading: boolean;
  feedback: { kind: 'error' | 'success'; text: string } | null;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: (id: string) => void;
  onEditExisting?: (contact: Contact) => void;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  duplicateContact,
  onConsultCnpj,
  onConsultCep,
  lookupCnpjLoading,
  lookupCepLoading,
  feedback,
  onSubmit,
  onDelete,
  onEditExisting,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'address'>('general');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      setShowConfirmDelete(false);
    }
  }, [isOpen, form.id]);

  if (!isOpen) return null;

  const handleTogglePersonType = (nextType: PersonType) => {
    setForm((prev) => ({
      ...prev,
      personType: nextType,
      document: nextType === 'PF' ? maskCPF(prev.document) : maskCNPJ(prev.document),
    }));
  };

  const handleKindSelect = (kind: ContactKind) => {
    setForm((prev) => ({ ...prev, kind }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-400">
              {form.personType === 'PJ' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {form.id ? 'Editar Cadastro de Pessoa' : 'Novo Cadastro de Pessoa'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {form.personType === 'PJ' ? 'Pessoa Jurídica (Empresa / Fornecedor)' : 'Pessoa Física (Cliente / Parceiro)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar gaveta (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (ERP Style) */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 shrink-0 bg-slate-50/40 dark:bg-slate-950/20">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'general'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            1. Geral & Contato
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'address'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            2. Endereço Completo
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className="px-6 pt-3 shrink-0">
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                feedback.kind === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                  : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
              }`}
            >
              {feedback.kind === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
              )}
              <span>{feedback.text}</span>
            </div>
          </div>
        )}

        {/* Drawer Body (Form Content) */}
        <form id="contact-drawer-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* PF / PJ Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipo de Inscrição
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTogglePersonType('PJ')}
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] ${
                      form.personType === 'PJ'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Pessoa Jurídica (CNPJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePersonType('PF')}
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] ${
                      form.personType === 'PF'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Pessoa Física (CPF)
                  </button>
                </div>
              </div>

              {/* Document + Consultar Button */}
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
                          form.personType === 'PJ' ? maskCNPJ(e.target.value) : maskCPF(e.target.value),
                      })
                    }
                    placeholder={form.personType === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[42px]"
                  />
                  {form.personType === 'PJ' && (
                    <button
                      type="button"
                      onClick={onConsultCnpj}
                      disabled={lookupCnpjLoading}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap min-h-[42px] cursor-pointer"
                    >
                      {lookupCnpjLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Consultar
                    </button>
                  )}
                </div>

                {/* Duplicate Document Warning */}
                {duplicateContact && (
                  <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Documento já cadastrado:</span> Pertence a{' '}
                        <strong>"{duplicateContact.name}"</strong>.
                      </div>
                    </div>
                    {onEditExisting && (
                      <button
                        type="button"
                        onClick={() => onEditExisting(duplicateContact)}
                        className="shrink-0 px-2.5 py-1 bg-amber-200/80 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Editar existente
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Razão Social / Nome Completo */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {form.personType === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={form.personType === 'PJ' ? 'Ex: Distribuidora Exemplo Ltda' : 'Ex: João da Silva'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                />
              </div>

              {/* Nome Fantasia (se PJ) */}
              {form.personType === 'PJ' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={form.tradeName}
                    onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                    placeholder="Ex: Exemplo Peças"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  />
                </div>
              )}

              {/* Contact Info (Telefone e E-mail) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / Celular
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  />
                </div>
              </div>

              {/* Participation Kind (Cliente / Fornecedor / Ambos - Estilo ERP) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Classificação da Pessoa (Participação)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleKindSelect('customer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] cursor-pointer ${
                      form.kind === 'customer'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-950/60 dark:border-teal-600 dark:text-teal-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKindSelect('supplier')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] cursor-pointer ${
                      form.kind === 'supplier'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-600 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Fornecedor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKindSelect('both')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] cursor-pointer ${
                      form.kind === 'both'
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Ambos
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* CEP + Consultar Button */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  CEP
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: maskCEP(e.target.value) })}
                    placeholder="00000-000"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={onConsultCep}
                    disabled={lookupCepLoading}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap min-h-[42px] cursor-pointer"
                  >
                    {lookupCepLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Consultar CEP
                  </button>
                </div>
              </div>

              {/* Logradouro e Número */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Logradouro / Rua
                  </label>
                  <input
                    type="text"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    placeholder="Rua, Avenida, Alameda..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
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
                    placeholder="123 ou S/N"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  />
                </div>
              </div>

              {/* Complemento e Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={form.complement}
                    onChange={(e) => setForm({ ...form, complement: e.target.value })}
                    placeholder="Sala, Apto, Galpão..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
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
                    placeholder="Centro, Industrial..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  />
                </div>
              </div>

              {/* Cidade e UF */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
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
                    placeholder="SP"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular uppercase min-h-[42px]"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Fixed Footer Bar (Padrão ERP: Gravar, Cancelar, Eliminar) */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between shrink-0 gap-3">
          <div>
            {form.id && onDelete && (
              <>
                {showConfirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Excluir?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(form.id!);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                    title="Eliminar cadastro"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px]"
            >
              Abandonar (Cancelar)
            </button>
            <button
              type="submit"
              form="contact-drawer-form"
              disabled={Boolean(duplicateContact)}
              className="px-5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] flex items-center gap-1.5 shadow-sm"
            >
              <FolderDown className="w-4 h-4" />
              {form.id ? 'Gravar Alterações' : 'Gravar Cadastro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
