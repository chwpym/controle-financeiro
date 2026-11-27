import React, { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import type { Contact, Transaction } from '../../types';
import {
  QUICK_INSTALLMENT_PRESETS,
  splitSingleTransactionIntoInstallments,
  todayISO,
} from '../../utils/format';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { InstallmentOriginalSummary } from './InstallmentOriginalSummary';
import { InstallmentDateField } from './InstallmentDateField';
import { useInstallmentCount } from './useInstallmentCount';
import { InstallmentSplitPreview } from './InstallmentSplitPreview';

export interface InstallmentSplitScenarioAProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  contactMap: Map<string, Contact>;
  cleanTitle: string;
  onApplyRenegotiation: (toDeleteIds: string[], toUpsert: Transaction[]) => void;
}

export const InstallmentSplitScenarioA: React.FC<InstallmentSplitScenarioAProps> = ({
  isOpen,
  onClose,
  transaction,
  contactMap,
  cleanTitle,
  onApplyRenegotiation,
}) => {
  const today = todayISO();
  const [splitDueDate, setSplitDueDate] = useState<string>(transaction.dueDate || today);
  const [splitAmountMode, setSplitAmountMode] = useState<'total' | 'per_installment'>('total');
  const [splitShowFullPreview, setSplitShowFullPreview] = useState<boolean>(false);
  const {
    count: splitCount,
    input: splitInput,
    limitExceeded: splitLimitExceeded,
    handlePreset: handleSplitPreset,
    handleInputChange: handleSplitInputChange,
  } = useInstallmentCount(3, () => setSplitShowFullPreview(false));

  const splitPreviewTxs = useMemo(() => {
    return splitSingleTransactionIntoInstallments(
      transaction,
      splitCount,
      splitDueDate,
      splitAmountMode
    );
  }, [transaction, splitCount, splitDueDate, splitAmountMode]);

  const handleConfirmSplit = () => {
    onApplyRenegotiation([transaction.id], splitPreviewTxs);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={<Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
      title={`Parcelar Lançamento — ${cleanTitle}`}
      subtitle="Transforme esta conta à vista em múltiplas parcelas com datas e valores automáticos."
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 w-full">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirmSplit} className="w-full sm:w-auto">
            Confirmar e Transformar em {splitCount}x
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-4">
          <InstallmentOriginalSummary transaction={transaction} contactMap={contactMap} />

          {/* Atalhos Rápidos */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Quantidade de Parcelas (Atalhos rápidos)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_INSTALLMENT_PRESETS.filter((p) => p > 1).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSplitPreset(preset)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                    splitCount === preset && !splitLimitExceeded
                      ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>

          {/* Input livre + Modo de cálculo + 1º Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="split-count-input"
                className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
              >
                Ou digite a quantidade (1 a 420x):
              </label>
              <input
                id="split-count-input"
                type="number"
                min={1}
                max={420}
                value={splitInput}
                placeholder="Ex: 7, 48, 84, 180..."
                onChange={(e) => handleSplitInputChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[40px] focus:outline-none focus:ring-2 ${
                  splitLimitExceeded
                    ? 'border-amber-500 focus:ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-teal-600/30 focus:border-teal-600'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="split-amount-mode"
                className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
              >
                Cálculo do valor
              </label>
              <select
                id="split-amount-mode"
                value={splitAmountMode}
                onChange={(e) => setSplitAmountMode(e.target.value as 'total' | 'per_installment')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[40px]"
              >
                <option value="total">Dividir valor total ({splitCount}x)</option>
                <option value="per_installment">Repetir valor em cada parcela</option>
              </select>
            </div>

            <InstallmentDateField
              id="split-first-due-date"
              label="1º Vencimento"
              value={splitDueDate}
              onChange={setSplitDueDate}
            />
          </div>

          {splitLimitExceeded && (
            <p
              role="alert"
              className="rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-200"
            >
              ⚠️ O limite padrão do sistema é de até 420 parcelas (35 anos). Caso necessite de um
              prazo superior para este contrato, entre em contato com o desenvolvedor/suporte para
              liberar o limite.
            </p>
          )}

          <InstallmentSplitPreview
            splitCount={splitCount}
            splitPreviewTxs={splitPreviewTxs}
            showFull={splitShowFullPreview}
            onToggleFull={() => setSplitShowFullPreview((prev) => !prev)}
          />
        </div>
      </div>
    </Modal>
  );
};
