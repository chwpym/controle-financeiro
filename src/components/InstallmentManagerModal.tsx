import React, { useMemo, useState, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
} from 'lucide-react';
import type { Contact, Transaction } from '../types';
import {
  addMonthsISO,
  formatBRL,
  formatDateBR,
  isOverdue,
  MAX_INSTALLMENTS,
  QUICK_INSTALLMENT_PRESETS,
  renegotiateInstallmentGroup,
  splitSingleTransactionIntoInstallments,
  todayISO,
} from '../utils/format';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export interface InstallmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  transactions: Transaction[];
  contacts: Contact[];
  onApplyRenegotiation: (toDeleteIds: string[], toUpsert: Transaction[]) => void;
}

export const InstallmentManagerModal: React.FC<InstallmentManagerModalProps> = ({
  isOpen,
  onClose,
  transaction,
  transactions,
  contacts,
  onApplyRenegotiation,
}) => {
  if (!transaction) return null;

  const today = todayISO();
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  // Identificar se o lançamento já pertence a um grupo de parcelamento
  const groupTxs = useMemo(() => {
    if (transaction.installmentGroupId) {
      const list = transactions.filter((t) => t.installmentGroupId === transaction.installmentGroupId);
      if (list.length > 0) {
        return [...list].sort(
          (a, b) => a.installmentNumber - b.installmentNumber || a.dueDate.localeCompare(b.dueDate)
        );
      }
    }
    if (transaction.installmentTotal > 1) {
      const cleanDesc = transaction.description.replace(/\s*\(\d+\/\d+\)$/, '').trim();
      const list = transactions.filter(
        (t) =>
          t.userId === transaction.userId &&
          t.type === transaction.type &&
          t.installmentTotal === transaction.installmentTotal &&
          t.description.replace(/\s*\(\d+\/\d+\)$/, '').trim() === cleanDesc
      );
      if (list.length > 0) {
        return [...list].sort(
          (a, b) => a.installmentNumber - b.installmentNumber || a.dueDate.localeCompare(b.dueDate)
        );
      }
    }
    return [transaction];
  }, [transaction, transactions]);

  const isScenarioB = groupTxs.length > 1 || transaction.installmentTotal > 1;
  const cleanTitle = transaction.description.replace(/\s*\(\d+\/\d+\)$/, '').trim();

  // Estados Cenário A (Lançamento À Vista)
  const [splitCount, setSplitCount] = useState<number>(3);
  const [splitInput, setSplitInput] = useState<string>('3');
  const [splitLimitExceeded, setSplitLimitExceeded] = useState<boolean>(false);
  const [splitDueDate, setSplitDueDate] = useState<string>(transaction.dueDate || today);
  const [splitAmountMode, setSplitAmountMode] = useState<'total' | 'per_installment'>('total');
  const [splitShowFullPreview, setSplitShowFullPreview] = useState<boolean>(false);
  const splitDateInputRef = useRef<HTMLInputElement>(null);

  // Estados Cenário B (Lançamento Já Parcelado / Renegociação)
  const settledTxs = useMemo(() => groupTxs.filter((t) => t.status === 'settled'), [groupTxs]);
  const pendingTxs = useMemo(() => groupTxs.filter((t) => t.status !== 'settled'), [groupTxs]);
  const contractTotalCents = useMemo(() => groupTxs.reduce((s, t) => s + t.amountCents, 0), [groupTxs]);
  const settledTotalCents = useMemo(() => settledTxs.reduce((s, t) => s + t.amountCents, 0), [settledTxs]);
  const pendingTotalCents = useMemo(() => pendingTxs.reduce((s, t) => s + t.amountCents, 0), [pendingTxs]);

  const defaultNewDate = pendingTxs[0]?.dueDate || today;
  const [renegCount, setRenegCount] = useState<number>(Math.max(2, pendingTxs.length || 2));
  const [renegInput, setRenegInput] = useState<string>(String(Math.max(2, pendingTxs.length || 2)));
  const [renegLimitExceeded, setRenegLimitExceeded] = useState<boolean>(false);
  const [renegDueDate, setRenegDueDate] = useState<string>(defaultNewDate);
  const [renegShowFullPreview, setRenegShowFullPreview] = useState<boolean>(false);
  const renegDateInputRef = useRef<HTMLInputElement>(null);

  // Handlers Cenário A
  const handleSplitPreset = (val: number) => {
    const clamped = Math.max(1, Math.min(MAX_INSTALLMENTS, val));
    setSplitCount(clamped);
    setSplitInput(String(clamped));
    setSplitLimitExceeded(false);
    if (clamped <= 6) setSplitShowFullPreview(false);
  };

  const handleSplitInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setSplitInput('');
      setSplitLimitExceeded(false);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return;

    setSplitInput(digitsOnly);
    if (parsed > MAX_INSTALLMENTS) {
      setSplitLimitExceeded(true);
      setSplitCount(MAX_INSTALLMENTS);
      return;
    }

    setSplitLimitExceeded(false);
    const clamped = Math.max(1, parsed);
    setSplitCount(clamped);
    if (clamped <= 6) setSplitShowFullPreview(false);
  };

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

  // Handlers Cenário B
  const handleRenegPreset = (val: number) => {
    const clamped = Math.max(1, Math.min(MAX_INSTALLMENTS, val));
    setRenegCount(clamped);
    setRenegInput(String(clamped));
    setRenegLimitExceeded(false);
    if (clamped <= 6) setRenegShowFullPreview(false);
  };

  const handleRenegInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setRenegInput('');
      setRenegLimitExceeded(false);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return;

    setRenegInput(digitsOnly);
    if (parsed > MAX_INSTALLMENTS) {
      setRenegLimitExceeded(true);
      setRenegCount(MAX_INSTALLMENTS);
      return;
    }

    setRenegLimitExceeded(false);
    const clamped = Math.max(1, parsed);
    setRenegCount(clamped);
    if (clamped <= 6) setRenegShowFullPreview(false);
  };

  const renegPlan = useMemo(() => {
    if (pendingTxs.length === 0) return null;
    return renegotiateInstallmentGroup(groupTxs, renegCount, renegDueDate);
  }, [groupTxs, pendingTxs.length, renegCount, renegDueDate]);

  const handleConfirmRenegotiate = () => {
    if (!renegPlan) return;
    onApplyRenegotiation(renegPlan.toDeleteIds, renegPlan.toUpsert);
    onClose();
  };

  // Renderizadores de prévia compacta / expandida
  const renderRows = (
    items: { num: number; total: number; dueDate: string; cents: number }[]
  ) => (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono-tabular">
      {items.map((it) => (
        <div key={it.num} className="flex items-center justify-between py-1.5 px-2">
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            Parcela {it.num}/{it.total}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {formatDateBR(it.dueDate)}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatBRL(it.cents)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={<Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
      title={
        isScenarioB
          ? `Gestão do Contrato / Parcelamento — ${cleanTitle}`
          : `Parcelar Lançamento — ${cleanTitle}`
      }
      subtitle={
        isScenarioB
          ? 'Visualize todas as parcelas do contrato e renegocie o saldo pendente mantendo as parcelas pagas protegidas.'
          : 'Transforme esta conta à vista em múltiplas parcelas com datas e valores automáticos.'
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 w-full">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {isScenarioB && pendingTxs.length === 0 ? 'Fechar' : 'Cancelar'}
          </Button>

          {!isScenarioB ? (
            <Button
              variant="primary"
              onClick={handleConfirmSplit}
              className="w-full sm:w-auto"
            >
              Confirmar e Transformar em {splitCount}x
            </Button>
          ) : pendingTxs.length > 0 ? (
            <Button
              variant="primary"
              onClick={handleConfirmRenegotiate}
              className="w-full sm:w-auto"
            >
              Salvar Nova Negociação
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        {/* ========================================================= */}
        {/* CENÁRIO A: Lançamento À Vista                             */}
        {/* ========================================================= */}
        {!isScenarioB && (
          <div className="space-y-4">
            {/* Resumo do lançamento original */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Valor Original</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono-tabular text-sm">
                  {formatBRL(transaction.amountCents)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Contato / Fornecedor</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                  {contactMap.get(transaction.contactId || '')?.name || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Documento / NF</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 font-mono-tabular truncate block">
                  {transaction.documentNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Vencimento Original</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 font-mono-tabular">
                  {formatDateBR(transaction.dueDate)}
                </span>
              </div>
            </div>

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

              <div>
                <label
                  htmlFor="split-first-due-date"
                  className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                >
                  1º Vencimento
                </label>
                <div className="relative">
                  <input
                    ref={splitDateInputRef}
                    id="split-first-due-date"
                    type="date"
                    value={splitDueDate}
                    onChange={(e) => setSplitDueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[40px] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <button
                    type="button"
                    title="Abrir calendário"
                    onClick={() => splitDateInputRef.current?.showPicker?.()}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
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

            {/* Prévia das Parcelas */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <span>Prévia do Parcelamento ({splitCount}x)</span>
                <span className="font-mono-tabular text-teal-700 dark:text-teal-400">
                  Total: {formatBRL(splitPreviewTxs.reduce((s, t) => s + t.amountCents, 0))}
                </span>
              </div>

              {splitCount <= 6 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
                  {renderRows(
                    splitPreviewTxs.map((t) => ({
                      num: t.installmentNumber,
                      total: t.installmentTotal,
                      dueDate: t.dueDate,
                      cents: t.amountCents,
                    }))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-xl border border-teal-200/80 dark:border-teal-800/70 bg-white dark:bg-slate-900/80 p-3 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
                      • 1ª parcela de {formatBRL(splitPreviewTxs[0]?.amountCents || 0)} em{' '}
                      {formatDateBR(splitPreviewTxs[0]?.dueDate || '')}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
                      • Demais parcelas de{' '}
                      {formatBRL(splitPreviewTxs[1]?.amountCents || 0)} mensais até{' '}
                      {formatDateBR(splitPreviewTxs[splitPreviewTxs.length - 1]?.dueDate || '')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSplitShowFullPreview((prev) => !prev)}
                      className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-400 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {splitShowFullPreview
                          ? 'Recolher grade completa'
                          : `Expandir grade completa (${splitCount} parcelas)`}
                      </span>
                      {splitShowFullPreview ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {splitShowFullPreview && (
                    <div className="max-h-44 overflow-y-auto pr-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
                      {renderRows(
                        splitPreviewTxs.map((t) => ({
                          num: t.installmentNumber,
                          total: t.installmentTotal,
                          dueDate: t.dueDate,
                          cents: t.amountCents,
                        }))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CENÁRIO B: Lançamento Já Parcelado                        */}
        {/* ========================================================= */}
        {isScenarioB && (
          <div className="space-y-4">
            {/* 3 Cards de Resumo no Topo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                  Total do Contrato
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white font-mono-tabular block">
                  {formatBRL(contractTotalCents)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {groupTxs.length} parcelas no total
                </span>
              </div>

              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block mb-1">
                  Já Quitado
                </span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono-tabular block">
                  {formatBRL(settledTotalCents)}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-3 h-3" />
                  {settledTxs.length} de {groupTxs.length} quitadas (blindadas)
                </span>
              </div>

              <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-3.5">
                <span className="text-xs text-amber-800 dark:text-amber-300 font-medium block mb-1">
                  Saldo Restante
                </span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono-tabular block">
                  {formatBRL(pendingTotalCents)}
                </span>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {pendingTxs.length}{' '}
                  {pendingTxs.length === 1 ? 'parcela pendente' : 'parcelas pendentes'}
                </span>
              </div>
            </div>

            {/* Linha do tempo / Tabela de Parcelas Existentes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span>Cronograma Atual de Parcelas</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  Parcelas quitadas permanecem intocadas
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {groupTxs.map((tx) => {
                  const isSettled = tx.status === 'settled';
                  const overdue = isOverdue(tx, today);
                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center justify-between py-2 px-3 text-xs ${
                        isSettled
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : overdue
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular font-medium text-slate-800 dark:text-slate-200 min-w-[70px]">
                          {tx.installmentNumber}/{tx.installmentTotal}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono-tabular">
                          Venc: {formatDateBR(tx.dueDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono-tabular text-slate-900 dark:text-white">
                          {formatBRL(tx.amountCents)}
                        </span>

                        {isSettled ? (
                          <Badge variant="settled" size="sm" showIcon>
                            {tx.type === 'receivable' ? 'Recebido' : 'Pago'}{' '}
                            {tx.paidAt ? `(${formatDateBR(tx.paidAt)})` : ''}
                          </Badge>
                        ) : overdue ? (
                          <Badge variant="overdue" size="sm" showIcon>
                            Vencido
                          </Badge>
                        ) : (
                          <Badge variant="pending" size="sm" showIcon>
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloco de Renegociação */}
            {pendingTxs.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Contrato totalmente quitado!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Todas as {settledTxs.length} parcelas deste contrato já foram liquidadas com sucesso.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/70 bg-indigo-50/30 dark:bg-slate-900/90 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                  <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Renegociar Saldo Restante ({formatBRL(pendingTotalCents)})
                  </span>
                </div>

                {/* Atalhos rápidos para redistribuir */}
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

                {/* Input livre + Nova Data Inicial */}
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

                  <div>
                    <label
                      htmlFor="reneg-first-due-date"
                      className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Novo 1º Vencimento do Saldo
                    </label>
                    <div className="relative">
                      <input
                        ref={renegDateInputRef}
                        id="reneg-first-due-date"
                        type="date"
                        value={renegDueDate}
                        onChange={(e) => setRenegDueDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[40px] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0"
                      />
                      <button
                        type="button"
                        title="Abrir calendário"
                        onClick={() => renegDateInputRef.current?.showPicker?.()}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {renegLimitExceeded && (
                  <p
                    role="alert"
                    className="rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-200"
                  >
                    ⚠️ O limite padrão do sistema é de até 420 parcelas (35 anos).
                  </p>
                )}

                {/* Prévia da nova estrutura de parcelamento */}
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
        )}
      </div>
    </Modal>
  );
};
