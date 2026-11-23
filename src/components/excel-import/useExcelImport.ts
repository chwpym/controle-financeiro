import { useMemo, useState } from 'react';
import type {
  Category,
  Contact,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../types';
import {
  analyzeExcelBuffer,
  buildTransactionsFromExcelRows,
  downloadExcelImportTemplate,
  extractExcelSheet,
  mapExcelRowsToPreview,
  suggestExcelMapping,
  type ExcelFieldMapping,
  type ExcelWorkbookAnalysis,
  type MappedExcelPreviewRow,
  type ParsedExcelSheet,
} from '../../utils/excelParser';
import { maskCNPJ, maskCPF } from '../../utils/format';

export interface UseExcelImportProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  existingTransactions: Transaction[];
  onClose: () => void;
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
}

const normalizeText = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

export const useExcelImport = ({
  userId,
  categories,
  contacts,
  existingTransactions,
  onClose,
  onImport,
  onCreateContact,
}: UseExcelImportProps) => {
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

  const handleFileSelected = (file: File) => {
    setError(null);
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

  const previewRows: MappedExcelPreviewRow[] = useMemo(() => {
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

  const selectedCount = selectedRows.length;

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

  const createUnmatchedContacts = async () => {
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

  return {
    fileName,
    workbookData,
    selectedSheet,
    sheetData,
    error,
    setError,
    mapping,
    setMapping,
    defaultType,
    setDefaultType,
    defaultStatus,
    setDefaultStatus,
    defaultCategoryId,
    setDefaultCategoryId,
    defaultContactId,
    setDefaultContactId,
    excludedRows,
    setExcludedRows,
    previewRows,
    selectedRows,
    selectedCount,
    totalSelectedCents,
    duplicateRowIndices,
    unmatchedContactNames,
    creatingContacts,
    loadSheet,
    handleFileSelected,
    handleSheetChange,
    toggleRowSelection,
    toggleAllRows,
    uncheckDuplicates,
    createUnmatchedContacts,
    sampleOf,
    handleConfirmImport,
    downloadTemplate: downloadExcelImportTemplate,
  };
};
