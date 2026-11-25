/**
 * EN: Consolidated Batch Table for Multi-XML Import (Phase 11.1).
 *     Displays all loaded XML files with fiscal status, operation badge (Payable/Receivable),
 *     installment count, total value, and actions to inspect/edit individually or remove.
 * PT: Tabela Consolidada para Importação em Massa Multi-XML (Fase 11.1).
 *     Exibe todas as notas XML carregadas com status fiscal, tipo de operação (Pagar/Receber),
 *     quantidade de parcelas, valor total e botões para conferir/editar individualmente ou remover.
 */

import React from 'react';
import { AlertCircle, CheckCircle2, Eye, ShieldAlert, Trash2 } from 'lucide-react';
import type { Company } from '../../types';
import type { ComputedInvoiceSummary } from '../../hooks/useXmlImport';
import { formatBRL } from '../../utils/format';

export interface XmlBatchSummaryTableProps {
  summaries: ComputedInvoiceSummary[];
  companies: Company[];
  onToggleSelect: (entryId: string) => void;
  onInspectEntry: (entryId: string) => void;
  onRemoveEntry: (entryId: string) => void;
}

export const XmlBatchSummaryTable: React.FC<XmlBatchSummaryTableProps> = ({
  summaries,
  companies,
  onToggleSelect,
  onInspectEntry,
  onRemoveEntry,
}) => {
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  return (
    <div className="space-y-2.5" data-testid="xml-batch-summary-table">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          Visão Consolidada do Lote ({summaries.length} arquivos XML)
        </span>
        <span>Clique em &ldquo;Conferir / Editar&rdquo; para ajustar parcelas ou descontos de uma nota</span>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Lote de notas fiscais XML carregadas"
        className="max-h-80 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <tr>
              <th className="py-2.5 pl-3 pr-2 w-8">Inc.</th>
              <th className="py-2.5 px-2">Nota / Emitente</th>
              <th className="py-2.5 px-2">Operação & Empresa</th>
              <th className="py-2.5 px-2 text-center">Parcelas</th>
              <th className="py-2.5 px-2 text-right">Total</th>
              <th className="py-2.5 pl-2 pr-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {summaries.map((summary) => {
              const { entry, selectedItems, installmentsTotalCents, adjustmentType, requiresCompanyAttention } =
                summary;
              const analysis = entry.analysis;
              const comp = entry.companyId ? companyMap.get(entry.companyId) : undefined;

              const invoiceLabel =
                analysis && analysis.kind !== 'generic'
                  ? `${analysis.kind === 'nfe' ? 'NF-e' : 'NFS-e'} ${analysis.invoiceNumber || 'S/N'}`
                  : entry.fileName;

              const partyLabel =
                analysis?.kind === 'nfe'
                  ? entry.txType === 'receivable'
                    ? analysis.customerName
                    : analysis.supplierName
                  : analysis?.kind === 'nfse'
                    ? entry.txType === 'receivable'
                      ? analysis.customerName
                      : analysis.providerName
                    : entry.fileName;

              return (
                <tr
                  key={entry.id}
                  className={`transition-colors ${
                    entry.error
                      ? 'bg-red-50/50 dark:bg-red-950/20'
                      : entry.selectedForBatch
                        ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                        : 'opacity-50 bg-slate-50/50 dark:bg-slate-950/30'
                  }`}
                >
                  <td className="py-2.5 pl-3 pr-2 align-middle">
                    <input
                      type="checkbox"
                      disabled={Boolean(entry.error)}
                      checked={Boolean(entry.selectedForBatch && !entry.error)}
                      onChange={() => onToggleSelect(entry.id)}
                      aria-label={`Incluir ${entry.fileName} no lote`}
                      className="rounded border-slate-300 text-teal-700 w-4 h-4 cursor-pointer disabled:opacity-40"
                    />
                  </td>

                  <td className="py-2.5 px-2 align-middle min-w-[160px]">
                    <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                      {invoiceLabel}
                    </div>
                    {entry.error ? (
                      <div className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[220px]">{entry.error}</span>
                      </div>
                    ) : (
                      <div
                        className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]"
                        title={partyLabel}
                      >
                        {partyLabel}
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-2 align-middle">
                    {!entry.error && (
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            entry.txType === 'receivable'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                          }`}
                        >
                          {entry.txType === 'receivable' ? 'A Receber' : 'A Pagar'}
                        </span>
                        <div className="text-[11px] flex items-center gap-1">
                          {requiresCompanyAttention ? (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 shrink-0" /> Escolher empresa
                            </span>
                          ) : comp ? (
                            <span className="text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 truncate max-w-[140px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              {comp.tradeName || comp.legalName}
                            </span>
                          ) : (
                            <span className="text-slate-400">Geral</span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-2 align-middle text-center font-mono-tabular">
                    {entry.error ? '—' : `${selectedItems.length}x`}
                  </td>

                  <td className="py-2.5 px-2 align-middle text-right font-mono-tabular">
                    {entry.error ? (
                      '—'
                    ) : (
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatBRL(installmentsTotalCents)}
                        </div>
                        {adjustmentType !== 'exact' && (
                          <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {adjustmentType === 'positive' ? '+ Acréscimo' : '- Abatimento'}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 pl-2 pr-3 align-middle text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {!entry.error && (
                        <button
                          type="button"
                          onClick={() => onInspectEntry(entry.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-300 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Conferir / Editar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveEntry(entry.id)}
                        aria-label={`Remover ${entry.fileName}`}
                        title="Remover arquivo do lote"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
