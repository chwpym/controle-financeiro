import React from 'react';
import { Building2, Loader2, User } from 'lucide-react';
import type { Contact, ContactKind, PersonType } from '../../types';
import { maskCNPJ, maskCPF } from '../../utils/format';
import type { ContactFormData } from './ContactDrawer';
import { ContactDuplicateWarning } from './ContactDuplicateWarning';
import { ContactKindSelector } from './ContactKindSelector';

interface ContactFormGeneralProps {
  form: ContactFormData;
  setForm: React.Dispatch<React.SetStateAction<ContactFormData>>;
  duplicateContact: Contact | null;
  onConsultCnpj: () => Promise<void>;
  lookupCnpjLoading: boolean;
  onEditExisting?: (contact: Contact) => void;
}

export const ContactFormGeneral: React.FC<ContactFormGeneralProps> = ({
  form,
  setForm,
  duplicateContact,
  onConsultCnpj,
  lookupCnpjLoading,
  onEditExisting,
}) => {
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

                <ContactDuplicateWarning duplicateContact={duplicateContact} onEditExisting={onEditExisting} />
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

              <ContactKindSelector kind={form.kind} onSelect={handleKindSelect} />
            </div>
  );
};
