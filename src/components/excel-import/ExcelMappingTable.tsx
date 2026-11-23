import React from 'react';
import { Table2 } from 'lucide-react';
import type { ExcelFieldMapping } from '../../utils/excelParser';

export interface ExcelMappingTableProps {
  headers: string[];
  mapping: ExcelFieldMapping;
  onMappingChange: (m: ExcelFieldMapping) => void;
  sampleOf: (col: string) => string;
  rowCount?: number;
}

type OptionalToggleKey =
  | 'useDescription'
  | 'useDueDate'
  | 'useType'
  | 'useStatus'
  | 'usePaymentMethod'
  | 'useCategory'
  | 'useContact'
  | 'useDocument'
  | 'useNotes';

type ColKey =
  | 'descriptionCol'
  | 'dueDateCol'
  | 'typeCol'
  | 'statusCol'
  | 'paymentMethodCol'
  | 'categoryCol'
  | 'contactCol'
  | 'documentCol'
  | 'notesCol';

interface OptionalFieldConfig {
  label: string;
  toggleKey: OptionalToggleKey;
  colKey: ColKey;
  fallbackHint: string;
}

const OPTIONAL_FIELD_CONFIGS: OptionalFieldConfig[] = [
  {
    label: 'Descrição da Conta',
    toggleKey: 'useDescription',
    colKey: 'descriptionCol',
    fallbackHint: 'Se desmarcado: "Importado Excel #N"',
  },
  {
    label: 'Data de Vencimento',
    toggleKey: 'useDueDate',
    colKey: 'dueDateCol',
    fallbackHint: 'Se desmarcado: data de hoje',
  },
  {
    label: 'Tipo (Pagar / Receber)',
    toggleKey: 'useType',
    colKey: 'typeCol',
    fallbackHint: 'Se desmarcado: usa o tipo padrão abaixo',
  },
  {
    label: 'Situação (Pago / Pendente)',
    toggleKey: 'useStatus',
    colKey: 'statusCol',
    fallbackHint: 'Se desmarcado: usa a situação padrão abaixo',
  },
  {
    label: 'Forma de Pagamento',
    toggleKey: 'usePaymentMethod',
    colKey: 'paymentMethodCol',
    fallbackHint: 'Aplicada quando a conta estiver paga/recebida',
  },
  {
    label: 'Categoria',
    toggleKey: 'useCategory',
    colKey: 'categoryCol',
    fallbackHint: 'Associa pelo nome ou usa a categoria padrão',
  },
  {
    label: 'Contato (PF / PJ)',
    toggleKey: 'useContact',
    colKey: 'contactCol',
    fallbackHint: 'Associa por nome ou CPF/CNPJ',
  },
  {
    label: 'Documento / NF',
    toggleKey: 'useDocument',
    colKey: 'documentCol',
    fallbackHint: 'Opcional (Ex: NF-1042)',
  },
  {
    label: 'Observações',
    toggleKey: 'useNotes',
    colKey: 'notesCol',
    fallbackHint: 'Opcional',
  },
];

export const ExcelMappingTable: React.FC<ExcelMappingTableProps> = ({
  headers,
  mapping,
  onMappingChange,
  sampleOf,
  rowCount,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            Escolha os campos a importar de acordo com as colunas da planilha
          </span>
        </div>
        <span className="text-[11px] font-mono-tabular text-slate-500">
          {headers.length} coluna(s)
          {typeof rowCount === 'number' ? ` · ${rowCount} linha(s)` : ''}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {/* Mandatory Amount Field */}
        <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-teal-50/40 dark:bg-teal-950/20">
          <div className="sm:col-span-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked
              disabled
              aria-label="Campo obrigatório Valor"
              className="rounded border-slate-300 text-teal-700"
            />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Valor (R$) *
              </div>
              <div className="text-[11px] text-slate-500">Campo obrigatório</div>
            </div>
          </div>
          <div className="sm:col-span-5">
            <select
              aria-label="Coluna de Valor"
              value={mapping.amountCol}
              onChange={(e) => onMappingChange({ ...mapping, amountCol: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px]"
            >
              <option value="">Selecione a coluna...</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 truncate">
            Ex: {sampleOf(mapping.amountCol)}
          </div>
        </div>

        {/* Selectable Table Fields */}
        {OPTIONAL_FIELD_CONFIGS.map((cfg) => {
          const enabled = mapping[cfg.toggleKey];
          const selectedCol = mapping[cfg.colKey];
          return (
            <div
              key={cfg.toggleKey}
              className={`px-4 py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center ${
                enabled ? '' : 'opacity-65'
              }`}
            >
              <label className="sm:col-span-4 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    onMappingChange({
                      ...mapping,
                      [cfg.toggleKey]: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded border-slate-300 text-teal-700"
                />
                <div>
                  <div className="text-xs font-medium text-slate-900 dark:text-white">
                    {cfg.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {cfg.fallbackHint}
                  </div>
                </div>
              </label>

              <div className="sm:col-span-5">
                <select
                  disabled={!enabled}
                  aria-label={`Coluna para ${cfg.label}`}
                  value={selectedCol}
                  onChange={(e) =>
                    onMappingChange({
                      ...mapping,
                      [cfg.colKey]: e.target.value,
                      [cfg.toggleKey]: Boolean(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px] disabled:bg-slate-100 dark:disabled:bg-slate-900"
                >
                  <option value="">Não importar / Usar padrão</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 truncate">
                {enabled && selectedCol ? `Ex: ${sampleOf(selectedCol)}` : 'Desativado'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
