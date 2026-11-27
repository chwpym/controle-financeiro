import React from 'react';
import { Loader2 } from 'lucide-react';
import { maskCEP } from '../../utils/format';
import type { ContactFormData } from './ContactDrawer';

interface ContactFormAddressProps {
  form: ContactFormData;
  setForm: React.Dispatch<React.SetStateAction<ContactFormData>>;
  onConsultCep: () => Promise<void>;
  lookupCepLoading: boolean;
}

export const ContactFormAddress: React.FC<ContactFormAddressProps> = ({
  form,
  setForm,
  onConsultCep,
  lookupCepLoading,
}) => {
  return (
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
  );
};
