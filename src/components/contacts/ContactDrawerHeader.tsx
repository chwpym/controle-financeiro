import React from 'react';
import { Building2, MapPin, User, Users, X } from 'lucide-react';
import type { ContactFormData } from './ContactDrawer';

interface ContactDrawerHeaderProps {
  form: ContactFormData;
  onClose: () => void;
  activeTab: 'general' | 'address';
  setActiveTab: (tab: 'general' | 'address') => void;
}

export const ContactDrawerHeader: React.FC<ContactDrawerHeaderProps> = ({
  form,
  onClose,
  activeTab,
  setActiveTab,
}) => {
  return (
  <>
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

  </>
  );
};
