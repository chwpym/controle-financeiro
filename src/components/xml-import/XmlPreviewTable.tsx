import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatBRL, formatDateBR } from '../../utils/format';
import type { ParsedXmlPreviewItem } from '../../utils/xmlParser';

interface XmlPreviewTableProps {
  items: ParsedXmlPreviewItem[];
  excludedIds: Set<string>;
  duplicateIds: Set<string>;
  onToggleItem: (id: string) => void;
  onUncheckDuplicates: () => void;
}

export const XmlPreviewTable: React.FC<XmlPreviewTableProps> = ({
  items,
  excludedIds,
  duplicateIds,
  onToggleItem,
  onUncheckDuplicates,
}) => {
  const selectedItems = items.filter((item) => !excludedIds.has(item.tempId));
  const totalPreviewCents = selectedItems.reduce((s, item) => s + item.amountCents, 0);

  return (
    <div className="space-y-3">
      {/* Duplicate Warning Banner */}
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
            className="font-semibold text-amber-900 dark:text-amber-100 underline hover:opacity-80"
          >
            Desmarcar duplicados
          </button>
        </div>
      )}

      {/* Preview Table Header */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
          <span>
            {selectedItems.length} de {items.length} item(ns) selecionado(s)
          </span>
          <span className="font-mono-tabular font-semibold">
            Total selecionado: {formatBRL(totalPreviewCents)}
          </span>
        </div>

        {/* Scrollable Items Container */}
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              Selecione campos de valor válidos para visualizar os itens da prévia.
            </div>
          ) : (
            items.map((item) => {
              const isDup = duplicateIds.has(item.tempId);
              const checked = !excludedIds.has(item.tempId);
              return (
                <div
                  key={item.tempId}
                  className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs ${
                    checked ? '' : 'opacity-45 bg-slate-50/50 dark:bg-slate-950/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleItem(item.tempId)}
                      aria-label={`Selecionar ${item.description}`}
                      className="mt-0.5 rounded border-slate-300 text-teal-700"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        {item.description}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono-tabular flex flex-wrap items-center gap-1.5">
                        <span>Venc. {formatDateBR(item.dueDate)}</span>
                        {item.issueDate && (
                          <span className="text-slate-400 dark:text-slate-500">
                            (Emissão: {formatDateBR(item.issueDate)})
                          </span>
                        )}
                        {item.documentNumber && <span>· {item.documentNumber}</span>}
                        {item.installmentTotal > 1 && (
                          <span>
                            · Parcela {item.installmentNumber}/{item.installmentTotal}
                          </span>
                        )}
                        {isDup && (
                          <span className="text-amber-700 dark:text-amber-400 font-sans font-semibold">
                            · Possível duplicata
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white shrink-0">
                    {formatBRL(item.amountCents)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
