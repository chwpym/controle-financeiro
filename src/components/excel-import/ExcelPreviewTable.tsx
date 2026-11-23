import React from 'react';
import { AlertTriangle, UserPlus } from 'lucide-react';
import type { MappedExcelPreviewRow } from '../../utils/excelParser';
import { formatBRL, formatDateBR } from '../../utils/format';

export interface ExcelPreviewTableProps {
  previewRows: MappedExcelPreviewRow[];
  selectedCount: number;
  totalSelectedCents: number;
  duplicateRowIndices: Set<number>;
  unmatchedContactNames: string[];
  creatingContacts: boolean;
  onToggleRow: (idx: number) => void;
  onToggleAll: () => void;
  onUncheckDuplicates: () => void;
  onCreateUnmatchedContacts: () => void;
}

export const ExcelPreviewTable: React.FC<ExcelPreviewTableProps> = ({
  previewRows,
  selectedCount,
  totalSelectedCents,
  duplicateRowIndices,
  unmatchedContactNames,
  creatingContacts,
  onToggleRow,
  onToggleAll,
  onUncheckDuplicates,
  onCreateUnmatchedContacts,
}) => {
  return (
    <div className="space-y-3">
      {/* Smart Warnings: Duplicates & Unmatched Contacts */}
      {(duplicateRowIndices.size > 0 || unmatchedContactNames.length > 0) && (
        <div className="space-y-2">
          {duplicateRowIndices.size > 0 && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Possível duplicidade em {duplicateRowIndices.size} linha(s) (mesmo valor, vencimento e documento/descrição).
                </span>
              </div>
              <button
                type="button"
                onClick={onUncheckDuplicates}
                className="font-semibold text-amber-900 dark:text-amber-100 underline hover:opacity-80 transition-opacity"
              >
                Desmarcar duplicatas
              </button>
            </div>
          )}

          {unmatchedContactNames.length > 0 && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-teal-900 dark:text-teal-200 font-medium">
                {unmatchedContactNames.length} contato(s) da planilha ainda não estão cadastrados (
                {unmatchedContactNames.slice(0, 3).join(', ')}
                {unmatchedContactNames.length > 3 ? '...' : ''}).
              </span>
              <button
                type="button"
                disabled={creatingContacts}
                onClick={onCreateUnmatchedContacts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {creatingContacts
                  ? 'Cadastrando...'
                  : `Cadastrar ${unmatchedContactNames.length} contatos automaticamente`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview Table with Row Selection */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Pré-visualização ({selectedCount} de {previewRows.length} selecionado(s))
            </span>
            {previewRows.length > 0 && (
              <button
                type="button"
                onClick={onToggleAll}
                className="text-teal-700 dark:text-teal-400 font-semibold hover:underline"
              >
                {selectedCount === previewRows.length
                  ? 'Desmarcar todos'
                  : 'Selecionar todos'}
              </button>
            )}
          </div>
          <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
            Total selecionado: {formatBRL(totalSelectedCents)}
          </span>
        </div>

        <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {previewRows.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-500">
              Nenhuma linha com valor numérico válido encontrada na coluna selecionada.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-3 w-8"></th>
                  <th className="py-2 px-3">Vencimento</th>
                  <th className="py-2 px-3">Descrição</th>
                  <th className="py-2 px-3">Tipo / Status</th>
                  <th className="py-2 px-3">Categoria / Contato</th>
                  <th className="py-2 px-3 text-right">Valor (BRL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewRows.map((row) => {
                  const isDup = duplicateRowIndices.has(row.rowIndex);
                  return (
                    <tr
                      key={row.rowIndex}
                      className={
                        row.selected
                          ? ''
                          : 'opacity-45 bg-slate-50/50 dark:bg-slate-950/30'
                      }
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => onToggleRow(row.rowIndex)}
                          aria-label={`Selecionar linha ${row.description}`}
                          className="rounded border-slate-300 text-teal-700"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono-tabular whitespace-nowrap">
                        {formatDateBR(row.dueDate)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {row.description}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {row.documentNumber && (
                            <span className="text-slate-500">{row.documentNumber}</span>
                          )}
                          {isDup && (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">
                              Possível duplicata
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={
                            row.type === 'receivable'
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : 'text-rose-700 dark:text-rose-400 font-semibold'
                          }
                        >
                          {row.type === 'receivable' ? 'A Receber' : 'A Pagar'}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {row.status === 'settled'
                            ? `Baixado${row.paymentMethod ? ` (${row.paymentMethod})` : ''}`
                            : 'Pendente'}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        <div>{row.categoryLabel}</div>
                        {row.contactLabel !== '—' && (
                          <div className="text-[11px] text-slate-500">
                            {row.contactLabel}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-tabular font-semibold whitespace-nowrap">
                        {formatBRL(row.amountCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
