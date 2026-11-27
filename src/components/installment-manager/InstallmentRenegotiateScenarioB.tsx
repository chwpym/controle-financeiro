import React, { useMemo, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import type { Transaction } from '../../types';
import {
  formatBRL,
  formatDateBR,
  QUICK_INSTALLMENT_PRESETS,
  renegotiateInstallmentGroup,
  todayISO,
} from '../../utils/format';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { InstallmentDateField } from './InstallmentDateField';
import { useInstallmentCount } from './useInstallmentCount';
import { InstallmentSettledNotice } from './InstallmentSettledNotice';
import { InstallmentHeaderCard } from './InstallmentHeaderCard';
import { InstallmentScheduleList } from './InstallmentScheduleList';

export interface InstallmentRenegotiateScenarioBProps {
  isOpen: boolean;
  onClose: () => void;
  groupTxs: Transaction[];
  cleanTitle: string;
  onApplyRenegotiation: (toDeleteIds: string[], toUpsert: Transaction[]) => void;
}

export const InstallmentRenegotiateScenarioB: React.FC<InstallmentRenegotiateScenarioBProps> = ({
  isOpen,
  onClose,
  groupTxs,
  cleanTitle,
  onApplyRenegotiation,
}) => {
  const today = todayISO();
  const settledTxs = useMemo(() => groupTxs.filter((t) => t.status === 'settled'), [groupTxs]);
  const pendingTxs = useMemo(() => groupTxs.filter((t) => t.status !== 'settled'), [groupTxs]);
  const contractTotalCents = useMemo(() => groupTxs.reduce((s, t) => s + t.amountCents, 0), [groupTxs]);
  const settledTotalCents = useMemo(() => settledTxs.reduce((s, t) => s + t.amountCents, 0), [settledTxs]);
  const pendingTotalCents = useMemo(() => pendingTxs.reduce((s, t) => s + t.amountCents, 0), [pendingTxs]);

  const defaultNewDate = pendingTxs[0]?.dueDate || today;
  const [renegDueDate, setRenegDueDate] = useState<string>(defaultNewDate);
  const {
    count: renegCount,
    input: renegInput,
    limitExceeded: renegLimitExceeded,
    handlePreset: handleRenegPreset,
    handleInputChange: handleRenegInputChange,
  } = useInstallmentCount(Math.max(2, pendingTxs.length || 2));

  const renegPlan = useMemo(() => {
    if (pendingTxs.length === 0) return null;
    return renegotiateInstallmentGroup(groupTxs, renegCount, renegDueDate);
  }, [groupTxs, pendingTxs.length, renegCount, renegDueDate]);

  const handleConfirmRenegotiate = () => {
    if (!renegPlan) return;
    onApplyRenegotiation(renegPlan.toDeleteIds, renegPlan.toUpsert);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={<Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
      title={`Gestão do Contrato / Parcelamento — ${cleanTitle}`}
      subtitle="Visualize todas as parcelas do contrato e renegocie o saldo pendente mantendo as parcelas pagas protegidas."
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 w-full">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">{pendingTxs.length === 0 ? 'Fechar' : 'Cancelar'}</Button>
          {pendingTxs.length > 0 ? (
            <Button variant="primary" onClick={handleConfirmRenegotiate} className="w-full sm:w-auto">Salvar Nova Negociação</Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-4">
          <InstallmentHeaderCard
            contractTotalCents={contractTotalCents}
            settledTotalCents={settledTotalCents}
            pendingTotalCents={pendingTotalCents}
            totalCount={groupTxs.length}
            settledCount={settledTxs.length}
            pendingCount={pendingTxs.length}
          />

          <InstallmentScheduleList groupTxs={groupTxs} today={today} />

          {pendingTxs.length === 0 ? (
            <InstallmentSettledNotice settledCount={settledTxs.length} />
          ) : (
            <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/70 bg-indigo-50/30 dark:bg-slate-900/90 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Renegociar Saldo Restante ({formatBRL(pendingTotalCents)})
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Redividir saldo devedor em:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_INSTALLMENT_PRESETS.filter((p) => p > 1).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleRenegPreset(preset)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                        renegCount === preset && !renegLimitExceeded
                          ? 'bg-indigo-700 text-white border-indigo-700 dark:bg-indigo-600 dark:border-indigo-600'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reneg-count-input"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Ou digite a nova quantidade (1 a 420x):
                  </label>
                  <input
                    id="reneg-count-input"
                    type="number"
                    min={1}
                    max={420}
                    value={renegInput}
                    placeholder="Ex: 5, 12, 24, 36..."
                    onChange={(e) => handleRenegInputChange(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[40px] focus:outline-none focus:ring-2 ${
                      renegLimitExceeded
                        ? 'border-amber-500 focus:ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-600/30 focus:border-indigo-600'
                    }`}
                  />
                </div>

                <InstallmentDateField
                  id="reneg-first-due-date"
                  label="Novo 1º Vencimento do Saldo"
                  value={renegDueDate}
                  onChange={setRenegDueDate}
                />
              </div>

              {renegLimitExceeded && (
                <p
                  role="alert"
                  className="rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-200"
                >
                  ⚠️ O limite padrão do sistema é de até 420 parcelas (35 anos).
                </p>
              )}

              {renegPlan && (
                <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 space-y-1 text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Novo Contrato ({settledTxs.length + renegCount} parcelas no total):
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono-tabular">
                    • {settledTxs.length} parcelas já quitadas ({formatBRL(settledTotalCents)}) são 100% blindadas e mantidas.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono-tabular">
                    • Saldo restante de {formatBRL(pendingTotalCents)} será dividido em{' '}
                    <strong>{renegCount} novas parcelas</strong> a partir de{' '}
                    {formatDateBR(renegDueDate)}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
