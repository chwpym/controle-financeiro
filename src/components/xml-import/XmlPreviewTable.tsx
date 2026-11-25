/**
 * EN: Inline-Editable Installments Table & Real-Time Reconciliation Panel (Phase 11.1).
 *     Allows direct inline editing of each installment's Due Date (`dueDate`) and Amount in BRL
 *     (`amountCents`), displays real-time comparison (`Total da NF-e` vs `Soma das Parcelas`),
 *     never blocks the user on divergence, and records commercial adjustments (+ additions in
 *     `interestCents` / - deductions in `discountCents` + reason notes).
 * PT: Tabela de Parcelas com Edição Direta (Inline) e Painel de Batimento em Tempo Real (Fase 11.1).
 *     Permite editar diretamente o Vencimento (`dueDate`) e o Valor em Reais (`amountCents`) de cada
 *     duplicata, confronta `Total da NF-e` vs `Soma das Parcelas` em centavos inteiros e disponibiliza
 *     o seletor de ajustes comerciais (+ Acréscimo / - Abatimento) sem nunca bloquear o usuário.
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { formatBRL, formatDateBR, formatInputBRL, parseBRLToCents } from '../../utils/format';
import {
  NEGATIVE_ADJUSTMENT_REASONS,
  POSITIVE_ADJUSTMENT_REASONS,
  type ParsedXmlPreviewItem,
  type XmlAdjustmentType,
} from '../../utils/xmlParser';

export interface XmlPreviewTableProps {
  items: ParsedXmlPreviewItem[];
  excludedIds: Set<string>;
  duplicateIds: Set<string>;
  onToggleItem: (id: string) => void;
  onUncheckDuplicates: () => void;
  onUpdateItem?: (
    id: string,
    patch: Partial<Pick<ParsedXmlPreviewItem, 'dueDate' | 'amountCents' | 'description'>>
  ) => void;
  invoiceTotalCents?: number;
  installmentsTotalCents?: number;
  divergenceCents?: number;
  adjustmentType?: XmlAdjustmentType;
  adjustmentReason?: string;
  onChangeAdjustmentReason?: (reason: string) => void;
  adjustmentNotes?: string;
  onChangeAdjustmentNotes?: (notes: string) => void;
}

/**
 * EN: Controlled inline BRL currency cell that lets users type freely (e.g. "285,50")
 *     while syncing integer cents on every valid edit and formatting cleanly on blur.
 * PT: Célula controlada de valor BRL que permite digitação fluida (ex: "285,50")
 *     sincronizando centavos inteiros imediatamente e formatando ao sair do campo (`blur`).
 */
const InlineMoneyCell: React.FC<{
  tempId: string;
  amountCents: number;
  disabled?: boolean;
  onChangeCents?: (cents: number) => void;
}> = ({ tempId, amountCents, disabled, onChangeCents }) => {
  const [draft, setDraft] = useState<string | null>(null);

  const displayed = draft !== null ? draft : formatInputBRL(amountCents);

  if (!onChangeCents) {
    return (
      <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
        {formatBRL(amountCents)}
      </span>
    );
  }

  return (
    <div className="relative flex items-center w-28 sm:w-32">
      <span className="absolute left-2.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono-tabular pointer-events-none select-none">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        aria-label={`Valor da parcela ${tempId}`}
        data-testid={`xml-amount-input-${tempId}`}
        value={displayed}
        onFocus={() => setDraft(formatInputBRL(amountCents))}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseBRLToCents(raw);
          onChangeCents(parsed);
        }}
        onBlur={() => setDraft(null)}
        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-right font-mono-tabular font-semibold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600 disabled:opacity-50"
      />
    </div>
  );
};

export const XmlPreviewTable: React.FC<XmlPreviewTableProps> = ({
  items,
  excludedIds,
  duplicateIds,
  onToggleItem,
  onUncheckDuplicates,
  onUpdateItem,
  invoiceTotalCents,
  installmentsTotalCents,
  divergenceCents: propDivergenceCents,
  adjustmentType: propAdjustmentType,
  adjustmentReason = POSITIVE_ADJUSTMENT_REASONS[0].value,
  onChangeAdjustmentReason,
  adjustmentNotes = '',
  onChangeAdjustmentNotes,
}) => {
  const selectedItems = items.filter((item) => !excludedIds.has(item.tempId));
  const computedInstallmentsCents =
    installmentsTotalCents !== undefined
      ? installmentsTotalCents
      : Math.round(selectedItems.reduce((s, item) => s + Math.round(item.amountCents), 0));

  const resolvedInvoiceCents =
    invoiceTotalCents !== undefined && invoiceTotalCents > 0
      ? invoiceTotalCents
      : computedInstallmentsCents;

  const divergenceCents =
    propDivergenceCents !== undefined
      ? propDivergenceCents
      : Math.round(computedInstallmentsCents - resolvedInvoiceCents);

  const adjustmentType: XmlAdjustmentType =
    propAdjustmentType ||
    (divergenceCents === 0 ? 'exact' : divergenceCents > 0 ? 'positive' : 'negative');

  const reasonOptions =
    adjustmentType === 'positive' ? POSITIVE_ADJUSTMENT_REASONS : NEGATIVE_ADJUSTMENT_REASONS;

  return (
    <div className="space-y-3">
      {/* Duplicate Warning Banner / Alerta de Possível Duplicidade */}
      {duplicateIds.size > 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Possível duplicidade detectada em {duplicateIds.size} item(ns) (mesmo valor, vencimento e documento/descrição).
            </span>
          </div>
          <button
            type="button"
            onClick={onUncheckDuplicates}
            className="font-semibold text-amber-900 dark:text-amber-100 underline hover:opacity-80 cursor-pointer"
          >
            Desmarcar duplicados
          </button>
        </div>
      )}

      {/* Header Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        <span>
          {selectedItems.length} de {items.length} item(ns) selecionado(s)
        </span>
        <span className="font-mono-tabular font-semibold">
          Total selecionado: {formatBRL(computedInstallmentsCents)}
        </span>
      </div>

      {/* Responsive Semantic Table with Sticky Header & Inline Inputs */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Tabela de duplicatas e parcelas do XML"
        className="max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Selecione campos de valor válidos para visualizar os itens da prévia.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2.5 pl-3 pr-2 w-8">Inc.</th>
                <th className="py-2.5 px-2">Parcela / Documento</th>
                <th className="py-2.5 px-2 w-36">Vencimento</th>
                <th className="py-2.5 pl-2 pr-3 text-right w-36">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => {
                const isDup = duplicateIds.has(item.tempId);
                const checked = !excludedIds.has(item.tempId);
                return (
                  <tr
                    key={item.tempId}
                    className={`transition-colors ${
                      checked
                        ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                        : 'opacity-45 bg-slate-50/60 dark:bg-slate-950/40'
                    }`}
                  >
                    <td className="py-2 pl-3 pr-2 align-middle">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleItem(item.tempId)}
                        aria-label={`Selecionar ${item.description}`}
                        className="rounded border-slate-300 text-teal-700 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    <td className="py-2 px-2 align-middle min-w-[160px]">
                      <div
                        className="font-medium text-slate-900 dark:text-white truncate max-w-[260px]"
                        title={item.description}
                      >
                        {item.description}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular flex flex-wrap items-center gap-x-1.5">
                        {item.installmentTotal > 1 && (
                          <span className="font-semibold text-teal-700 dark:text-teal-400">
                            Parcela {item.installmentNumber}/{item.installmentTotal}
                          </span>
                        )}
                        {item.documentNumber && <span>{item.documentNumber}</span>}
                        {item.issueDate && (
                          <span className="text-slate-400 dark:text-slate-500">
                            · Emissão {formatDateBR(item.issueDate)}
                          </span>
                        )}
                        {isDup && (
                          <span className="text-amber-700 dark:text-amber-400 font-sans font-semibold">
                            · Possível duplicata
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-2 align-middle">
                      {onUpdateItem ? (
                        <input
                          type="date"
                          disabled={!checked}
                          aria-label={`Vencimento da parcela ${item.installmentNumber}`}
                          data-testid={`xml-duedate-input-${item.tempId}`}
                          value={item.dueDate}
                          onChange={(e) =>
                            onUpdateItem(item.tempId, { dueDate: e.target.value })
                          }
                          className="w-34 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular text-xs text-slate-900 dark:text-white dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600 disabled:opacity-50"
                        />
                      ) : (
                        <span className="font-mono-tabular">{formatDateBR(item.dueDate)}</span>
                      )}
                    </td>

                    <td className="py-2 pl-2 pr-3 align-middle text-right">
                      <div className="inline-flex justify-end">
                        <InlineMoneyCell
                          tempId={item.tempId}
                          amountCents={item.amountCents}
                          disabled={!checked}
                          onChangeCents={
                            onUpdateItem
                              ? (cents) => onUpdateItem(item.tempId, { amountCents: cents })
                              : undefined
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Real-Time Reconciliation & Commercial Adjustment Panel / Painel de Batimento Inteligente */}
      {items.length > 0 && (
        <div
          data-testid="xml-reconciliation-panel"
          className={`rounded-2xl border p-3.5 text-xs space-y-3 transition-colors ${
            adjustmentType === 'exact'
              ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20'
              : adjustmentType === 'positive'
                ? 'border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/50 dark:bg-indigo-950/25'
                : 'border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/25'
          }`}
        >
          {/* Comparison Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Total da NF-e:</span>
                <strong className="font-mono-tabular text-slate-900 dark:text-white">
                  {formatBRL(resolvedInvoiceCents)}
                </strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span>Soma das Parcelas:</span>
                <strong className="font-mono-tabular text-slate-900 dark:text-white">
                  {formatBRL(computedInstallmentsCents)}
                </strong>
              </div>
            </div>

            {/* Status Badge */}
            {adjustmentType === 'exact' ? (
              <span
                data-testid="xml-reconciliation-exact-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>✅ Valores Batendo (100% Conferido)</span>
              </span>
            ) : adjustmentType === 'positive' ? (
              <span
                data-testid="xml-reconciliation-positive-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200 font-mono-tabular"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>+ Acréscimo de {formatBRL(Math.abs(divergenceCents))} (Boleto Maior que a NF)</span>
              </span>
            ) : (
              <span
                data-testid="xml-reconciliation-negative-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-amber-200/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200 font-mono-tabular"
              >
                <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                <span>- Abatimento de {formatBRL(Math.abs(divergenceCents))} (Boleto Menor que a NF)</span>
              </span>
            )}
          </div>

          {/* Commercial Adjustment Reason & Notes (Never blocks the user) */}
          {adjustmentType !== 'exact' && (
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="xml-adjustment-reason"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  {adjustmentType === 'positive'
                    ? 'Motivo do Acréscimo (salvo em Juros/Encargos)'
                    : 'Motivo do Abatimento (salvo em Desconto)'}
                </label>
                <select
                  id="xml-adjustment-reason"
                  data-testid="xml-adjustment-reason-select"
                  value={adjustmentReason}
                  onChange={(e) => onChangeAdjustmentReason?.(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium min-h-[38px]"
                >
                  {reasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="xml-adjustment-notes"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1"
                >
                  Detalhe opcional nas observações
                </label>
                <input
                  id="xml-adjustment-notes"
                  data-testid="xml-adjustment-notes-input"
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => onChangeAdjustmentNotes?.(e.target.value)}
                  placeholder={
                    adjustmentType === 'positive'
                      ? 'Ex: CT-e 450 cobrado no boleto'
                      : 'Ex: Garantia peça NF dev. 89'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
