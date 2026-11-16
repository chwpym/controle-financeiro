import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Table2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  Category,
  Contact,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types';
import {
  analyzeExcelBuffer,
  buildTransactionsFromExcelRows,
  downloadExcelImportTemplate,
  extractExcelSheet,
  mapExcelRowsToPreview,
  suggestExcelMapping,
  type ExcelFieldMapping,
  type ExcelWorkbookAnalysis,
  type ParsedExcelSheet,
} from '../utils/excelParser';
import { formatBRL, formatDateBR, maskCNPJ, maskCPF } from '../utils/format';

interface ExcelImportModalProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  existingTransactions: Transaction[];
  onClose: () => void;
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
}

const normalizeText = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  userId,
  categories,
  contacts,
  existingTransactions,
  onClose,
  onImport,
  onCreateContact,
}) => {
  const [fileName, setFileName] = useState('');
  const [workbookData, setWorkbookData] = useState<ExcelWorkbookAnalysis | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetData, setSheetData] = useState<ParsedExcelSheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mapping, setMapping] = useState<ExcelFieldMapping>({
    descriptionCol: '',
    useDescription: true,
    amountCol: '',
    dueDateCol: '',
    useDueDate: true,
    typeCol: '',
    useType: false,
    statusCol: '',
    useStatus: false,
    paymentMethodCol: '',
    usePaymentMethod: false,
    categoryCol: '',
    useCategory: false,
    contactCol: '',
    useContact: false,
    documentCol: '',
    useDocument: false,
    notesCol: '',
    useNotes: false,
  });

  const [defaultType, setDefaultType] = useState<TransactionType>('payable');
  const [defaultStatus, setDefaultStatus] = useState<TransactionStatus>('pending');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [defaultContactId, setDefaultContactId] = useState('');
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [creatingContacts, setCreatingContacts] = useState(false);

  const loadSheet = (wb: ExcelWorkbookAnalysis, sheetName: string) => {
    const extracted = extractExcelSheet(wb.workbook, sheetName);
    setSelectedSheet(sheetName);
    setSheetData(extracted);
    setMapping(suggestExcelMapping(extracted.headers));
    setExcludedRows(new Set());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const analyzed = analyzeExcelBuffer(buffer);
        setWorkbookData(analyzed);
        loadSheet(analyzed, analyzed.sheetNames[0]);
      } catch (err) {
        setWorkbookData(null);
        setSheetData(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao ler a planilha Excel. Verifique se o arquivo é .xlsx, .xls ou .csv válido.'
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (nextSheet: string) => {
    if (!workbookData) return;
    setError(null);
    try {
      loadSheet(workbookData, nextSheet);
    } catch (err) {
      setSheetData(null);
      setError(err instanceof Error ? err.message : 'Falha ao ler a aba selecionada.');
    }
  };

  const previewRows = useMemo(() => {
    if (!sheetData) return [];
    return mapExcelRowsToPreview(
      sheetData.rows,
      mapping,
      {
        defaultType,
        defaultStatus,
        defaultCategoryId: defaultCategoryId || null,
        defaultContactId: defaultContactId || null,
        categories,
        contacts,
      },
      excludedRows
    );
  }, [
    sheetData,
    mapping,
    defaultType,
    defaultStatus,
    defaultCategoryId,
    defaultContactId,
    categories,
    contacts,
    excludedRows,
  ]);

  const selectedRows = useMemo(
    () => previewRows.filter((r) => r.selected),
    [previewRows]
  );

  const totalSelectedCents = useMemo(
    () => selectedRows.reduce((sum, r) => sum + r.amountCents, 0),
    [selectedRows]
  );

  // Detect duplicate rows against existingTransactions
  const duplicateRowIndices = useMemo(() => {
    const dups = new Set<number>();
    for (const row of previewRows) {
      const rowDoc = normalizeText(row.documentNumber);
      const rowDesc = normalizeText(row.description);
      const found = existingTransactions.some((ex) => {
        if (ex.amountCents !== row.amountCents || ex.dueDate !== row.dueDate) return false;
        if (rowDoc && ex.documentNumber && normalizeText(ex.documentNumber) === rowDoc) {
          return true;
        }
        return normalizeText(ex.description) === rowDesc;
      });
      if (found) dups.add(row.rowIndex);
    }
    return dups;
  }, [previewRows, existingTransactions]);

  // Detect unmatched contact names from mapped contact column
  const unmatchedContactNames = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of previewRows) {
      const raw = row.rawContactName.trim();
      if (!raw || row.contactId) continue;
      const key = normalizeText(raw);
      if (!seen.has(key)) {
        const digits = raw.replace(/\D/g, '');
        const exists = contacts.some((c) => {
          if (normalizeText(c.name) === key) return true;
          if (c.tradeName && normalizeText(c.tradeName) === key) return true;
          if (digits.length >= 11 && c.document.replace(/\D/g, '') === digits) return true;
          return false;
        });
        if (!exists) seen.set(key, raw);
      }
    }
    return Array.from(seen.values());
  }, [previewRows, contacts]);

  const uncheckDuplicates = () => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      for (const idx of duplicateRowIndices) next.add(idx);
      return next;
    });
  };

  const handleCreateUnmatchedContacts = async () => {
    if (unmatchedContactNames.length === 0) return;
    setCreatingContacts(true);
    try {
      const now = new Date().toISOString();
      for (const raw of unmatchedContactNames) {
        const digits = raw.replace(/\D/g, '');
        const lower = raw.toLowerCase();
        const looksPJ =
          digits.length === 14 ||
          /\b(ltda|s\.a\.|sa|me|epp|eireli|cia|comercio|comércio|servicos|serviços|industria|indústria)\b/.test(
            lower
          );
        const personType = digits.length === 11 || !looksPJ ? (digits.length === 14 ? 'PJ' : 'PF') : 'PJ';
        const matchingRows = previewRows.filter(
          (r) => normalizeText(r.rawContactName) === normalizeText(raw)
        );
        const hasPay = matchingRows.some((r) => r.type === 'payable');
        const hasRec = matchingRows.some((r) => r.type === 'receivable');
        const kind = hasPay && hasRec ? 'both' : hasRec ? 'customer' : 'supplier';

        const newContact: Contact = {
          id: crypto.randomUUID(),
          userId,
          personType,
          kind,
          name: raw,
          tradeName: '',
          document: digits.length === 11 ? maskCPF(digits) : digits.length === 14 ? maskCNPJ(digits) : '',
          phone: '',
          email: '',
          cep: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          createdAt: now,
          updatedAt: now,
        };
        await onCreateContact(newContact);
      }
    } finally {
      setCreatingContacts(false);
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.length === previewRows.length) {
      setExcludedRows(new Set(previewRows.map((r) => r.rowIndex)));
    } else {
      setExcludedRows(new Set());
    }
  };

  const sampleOf = (col: string) => {
    if (!sheetData || !col) return '—';
    const val = sheetData.rows[0]?.[col];
    if (val instanceof Date) return val.toLocaleDateString('pt-BR');
    const text = String(val ?? '').trim();
    return text ? text.slice(0, 32) : '(vazio na 1ª linha)';
  };

  const handleConfirmImport = () => {
    if (selectedRows.length === 0) {
      setError('Selecione pelo menos 1 lançamento válido para importar.');
      return;
    }
    const txs = buildTransactionsFromExcelRows(previewRows, userId);
    onImport(txs);
    onClose();
  };

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

  const optionalFieldConfigs: {
    label: string;
    toggleKey: OptionalToggleKey;
    colKey: ColKey;
    fallbackHint: string;
  }[] = [
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl max-h-[94vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Importação por Planilha Excel (.XLSX / .XLS / .CSV)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importação Excel"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Upload Zone + Template Download */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Envie sua planilha e escolha exatamente quais campos da tabela deseja importar.
              </span>
              <button
                type="button"
                onClick={downloadExcelImportTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar planilha modelo (.xlsx)
              </button>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 py-5 text-center cursor-pointer hover:border-teal-600 transition-colors">
              <Upload className="w-6 h-6 text-teal-700 dark:text-teal-400" />
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {fileName
                  ? `Arquivo selecionado: ${fileName}`
                  : 'Clique para selecionar um arquivo .XLSX, .XLS ou .CSV'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A primeira linha da aba deve conter os títulos das colunas da tabela
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {workbookData && sheetData && (
            <>
              {/* Sheet selector when multiple sheets exist */}
              {workbookData.sheetNames.length > 1 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Aba da planilha:
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px]"
                  >
                    {workbookData.sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field Selection & Column Mapping Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Escolha os campos a importar de acordo com as colunas da planilha
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-slate-500">
                    {sheetData.headers.length} coluna(s) · {sheetData.rows.length} linha(s)
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
                        value={mapping.amountCol}
                        onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px]"
                      >
                        <option value="">Selecione a coluna...</option>
                        {sheetData.headers.map((h) => (
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
                  {optionalFieldConfigs.map((cfg) => {
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
                              setMapping({
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
                            value={selectedCol}
                            onChange={(e) =>
                              setMapping({
                                ...mapping,
                                [cfg.colKey]: e.target.value,
                                [cfg.toggleKey]: Boolean(e.target.value),
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px] disabled:bg-slate-100 dark:disabled:bg-slate-900"
                          >
                            <option value="">Não importar / Usar padrão</option>
                            {sheetData.headers.map((h) => (
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

              {/* Default Fallbacks */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo padrão
                  </label>
                  <select
                    value={defaultType}
                    onChange={(e) => setDefaultType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  >
                    <option value="payable">Contas a Pagar</option>
                    <option value="receivable">Contas a Receber</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Situação padrão
                  </label>
                  <select
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value as TransactionStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  >
                    <option value="pending">Pendente</option>
                    <option value="settled">Pago / Recebido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria padrão
                  </label>
                  <select
                    value={defaultCategoryId}
                    onChange={(e) => setDefaultCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contato padrão
                  </label>
                  <select
                    value={defaultContactId}
                    onChange={(e) => setDefaultContactId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  >
                    <option value="">Não vincular</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.personType}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                        onClick={uncheckDuplicates}
                        className="font-semibold text-amber-900 dark:text-amber-100 underline hover:opacity-80"
                      >
                        Desmarcar duplicados
                      </button>
                    </div>
                  )}

                  {unmatchedContactNames.length > 0 && (
                    <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-teal-900 dark:text-teal-200 font-medium">
                        {unmatchedContactNames.length} contato(s) da planilha ainda não estão cadastrados ({unmatchedContactNames.slice(0, 3).join(', ')}
                        {unmatchedContactNames.length > 3 ? '...' : ''}).
                      </span>
                      <button
                        type="button"
                        disabled={creatingContacts}
                        onClick={handleCreateUnmatchedContacts}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {creatingContacts
                          ? 'Cadastrando...'
                          : `Cadastrar contatos novos (${unmatchedContactNames.length})`}
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
                      Pré-visualização ({selectedRows.length} de {previewRows.length} selecionado(s))
                    </span>
                    {previewRows.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllRows}
                        className="text-teal-700 dark:text-teal-400 font-semibold hover:underline"
                      >
                        {selectedRows.length === previewRows.length
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
                              className={row.selected ? '' : 'opacity-45 bg-slate-50/50 dark:bg-slate-950/30'}
                            >
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  onChange={() => toggleRowSelection(row.rowIndex)}
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
                                  <div className="text-[11px] text-slate-500">{row.contactLabel}</div>
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
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            Importar {selectedRows.length > 0 ? `(${selectedRows.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
