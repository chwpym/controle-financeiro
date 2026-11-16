import React, { useState } from 'react';
import { Calendar, CheckCircle2, CreditCard, X } from 'lucide-react';
import type { Transaction } from '../types';
import { formatBRL, PAYMENT_METHODS, todayISO } from '../utils/format';

interface BatchSettleModalProps {
  transactions: Transaction[];
  onClose: () => void;
  onConfirm: (paymentMethod: string, paidAt: string) => void;
}

export const BatchSettleModal: React.FC<BatchSettleModalProps> = ({
  transactions,
  onClose,
  onConfirm,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [paidAt, setPaidAt] = useState<string>(todayISO());

  const totalCents = transactions.reduce((s, t) => s + t.amountCents, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(paymentMethod, paidAt || todayISO());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Baixa em Lote ({transactions.length} conta{transactions.length > 1 ? 's' : ''})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              {transactions.length} lançamento(s) pendente(s) selecionado(s)
            </span>
            <span className="font-mono-tabular font-bold text-sm text-slate-900 dark:text-white">
              {formatBRL(totalCents)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                Forma de pagamento / recebimento *
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-colors min-h-[40px] ${
                    paymentMethod === method
                      ? 'border-teal-700 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data da baixa *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors min-h-[44px]"
            >
              Baixar {transactions.length} conta(s)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
