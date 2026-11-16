import * as XLSX from 'xlsx';
import type {
  Category,
  Contact,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types';
import { todayISO } from './format';

export interface ParsedExcelSheet {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ExcelWorkbookAnalysis {
  sheetNames: string[];
  workbook: XLSX.WorkBook;
}

export interface ExcelFieldMapping {
  descriptionCol: string;
  useDescription: boolean;

  amountCol: string;

  dueDateCol: string;
  useDueDate: boolean;

  typeCol: string;
  useType: boolean;

  statusCol: string;
  useStatus: boolean;

  paymentMethodCol: string;
  usePaymentMethod: boolean;

  categoryCol: string;
  useCategory: boolean;

  contactCol: string;
  useContact: boolean;

  documentCol: string;
  useDocument: boolean;

  notesCol: string;
  useNotes: boolean;
}

export interface MappedExcelPreviewRow {
  rowIndex: number;
  selected: boolean;
  description: string;
  amountCents: number;
  dueDate: string;
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod: string;
  categoryId: string | null;
  categoryLabel: string;
  contactId: string | null;
  contactLabel: string;
  rawContactName: string;
  documentNumber: string;
  notes: string;
}

export function analyzeExcelBuffer(buffer: ArrayBuffer): ExcelWorkbookAnalysis {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Nenhuma aba encontrada nesta planilha.');
  }
  return {
    sheetNames: workbook.SheetNames,
    workbook,
  };
}

export function extractExcelSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): ParsedExcelSheet {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Aba selecionada não encontrada.');
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (matrix.length < 2) {
    throw new Error('A planilha precisa ter pelo menos 1 linha de cabeçalho e 1 linha de dados.');
  }

  const rawHeaders = matrix[0] || [];
  const headers: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < rawHeaders.length; i++) {
    let label = String(rawHeaders[i] ?? '').trim();
    if (!label) label = `Coluna ${i + 1}`;
    let unique = label;
    let suffix = 2;
    while (used.has(unique)) {
      unique = `${label} (${suffix++})`;
    }
    used.add(unique);
    headers.push(unique);
  }

  const rows: Record<string, unknown>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const arr = matrix[r] || [];
    const hasAnyValue = arr.some((cell) => String(cell ?? '').trim() !== '');
    if (!hasAnyValue) continue;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = arr[c] ?? '';
    }
    rows.push(obj);
  }

  if (rows.length === 0) {
    throw new Error('Nenhuma linha com dados encontrada nesta aba.');
  }

  return { sheetName, headers, rows };
}

export function suggestExcelMapping(headers: string[]): ExcelFieldMapping {
  const findCol = (patterns: string[]) =>
    headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p))) || '';

  const descCol = findCol(['descri', 'hist', 'titulo', 'título', 'conta', 'nome']);
  const amountCol = findCol(['valor', 'total', 'quantia', 'r$', 'brl', 'amount', 'preco', 'preço']);
  const dueCol = findCol(['venc', 'data', 'date', 'due']);
  const typeCol = findCol(['tipo', 'natureza', 'movimento']);
  const statusCol = findCol(['status', 'situa', 'pago', 'baixa']);
  const methodCol = findCol(['forma', 'pgto', 'pagamento', 'recebimento', 'meio']);
  const catCol = findCol(['categ', 'grupo', 'plano']);
  const contactCol = findCol(['contato', 'fornec', 'client', 'favorec', 'pagador', 'raz']);
  const docCol = findCol(['doc', 'nota', 'nf', 'boleto', 'num', 'nº']);
  const notesCol = findCol(['obs', 'nota', 'coment', 'detal']);

  return {
    descriptionCol: descCol || headers[0] || '',
    useDescription: true,
    amountCol: amountCol || headers[0] || '',
    dueDateCol: dueCol,
    useDueDate: Boolean(dueCol),
    typeCol,
    useType: Boolean(typeCol),
    statusCol,
    useStatus: Boolean(statusCol),
    paymentMethodCol: methodCol,
    usePaymentMethod: Boolean(methodCol),
    categoryCol: catCol,
    useCategory: Boolean(catCol),
    contactCol,
    useContact: Boolean(contactCol),
    documentCol: docCol,
    useDocument: Boolean(docCol),
    notesCol,
    useNotes: Boolean(notesCol),
  };
}

function parseCellMoneyToCents(raw: unknown): number {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw === 0) return 0;
    return Math.round(Math.abs(raw) * 100);
  }
  const str = String(raw ?? '').trim().replace(/[R$\s]/g, '');
  if (!str) return 0;
  let norm = str;
  if (str.includes(',') && str.includes('.')) {
    // Decide which is decimal separator by last position
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      norm = str.replace(/\./g, '').replace(',', '.');
    } else {
      norm = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    norm = str.replace(',', '.');
  }
  const n = Number.parseFloat(norm);
  if (!Number.isFinite(n) || n === 0) return 0;
  return Math.round(Math.abs(n) * 100);
}

function parseCellDateISO(raw: unknown): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const str = String(raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  return todayISO();
}

function parseCellType(raw: unknown, fallback: TransactionType): TransactionType {
  const str = String(raw ?? '').trim().toLowerCase();
  if (!str) return fallback;
  if (
    str.includes('receb') ||
    str.includes('receit') ||
    str.includes('entrad') ||
    str.includes('credit') ||
    str.includes('crédit')
  ) {
    return 'receivable';
  }
  if (
    str.includes('pag') ||
    str.includes('despes') ||
    str.includes('said') ||
    str.includes('saíd') ||
    str.includes('debit') ||
    str.includes('débit')
  ) {
    return 'payable';
  }
  return fallback;
}

function parseCellStatus(raw: unknown, fallback: TransactionStatus): TransactionStatus {
  const str = String(raw ?? '').trim().toLowerCase();
  if (!str) return fallback;
  if (
    str.includes('pago') ||
    str.includes('paga') ||
    str.includes('receb') ||
    str.includes('quit') ||
    str.includes('liquid') ||
    str === 'ok' ||
    str === 'sim' ||
    str === 'settled'
  ) {
    return 'settled';
  }
  if (str.includes('pend') || str.includes('abert') || str.includes('venc') || str === 'não' || str === 'nao') {
    return 'pending';
  }
  return fallback;
}

export interface ExcelMapDefaults {
  defaultType: TransactionType;
  defaultStatus: TransactionStatus;
  defaultCategoryId: string | null;
  defaultContactId: string | null;
  categories: Category[];
  contacts: Contact[];
}

export function mapExcelRowsToPreview(
  rows: Record<string, unknown>[],
  mapping: ExcelFieldMapping,
  defaults: ExcelMapDefaults,
  excludedRowIndices: Set<number>
): MappedExcelPreviewRow[] {
  const today = todayISO();

  return rows
    .map((row, index) => {
      const amountCents = mapping.amountCol ? parseCellMoneyToCents(row[mapping.amountCol]) : 0;
      if (amountCents <= 0) return null;

      const description =
        mapping.useDescription && mapping.descriptionCol
          ? String(row[mapping.descriptionCol] ?? '').trim() || `Planilha linha ${index + 2}`
          : `Importado Excel #${index + 1}`;

      const dueDate =
        mapping.useDueDate && mapping.dueDateCol
          ? parseCellDateISO(row[mapping.dueDateCol])
          : today;

      const type =
        mapping.useType && mapping.typeCol
          ? parseCellType(row[mapping.typeCol], defaults.defaultType)
          : defaults.defaultType;

      const status =
        mapping.useStatus && mapping.statusCol
          ? parseCellStatus(row[mapping.statusCol], defaults.defaultStatus)
          : defaults.defaultStatus;

      const paymentMethod =
        mapping.usePaymentMethod && mapping.paymentMethodCol
          ? String(row[mapping.paymentMethodCol] ?? '').trim()
          : '';

      // Match category by name if mapped, else fallback
      let categoryId = defaults.defaultCategoryId;
      let categoryLabel =
        (categoryId && defaults.categories.find((c) => c.id === categoryId)?.name) || 'Sem categoria';

      if (mapping.useCategory && mapping.categoryCol) {
        const rawCat = String(row[mapping.categoryCol] ?? '').trim();
        if (rawCat) {
          const foundCat = defaults.categories.find(
            (c) => c.name.trim().toLowerCase() === rawCat.toLowerCase()
          );
          if (foundCat) {
            categoryId = foundCat.id;
            categoryLabel = foundCat.name;
          } else {
            categoryLabel = `${categoryLabel} (${rawCat})`;
          }
        }
      }

      // Match contact by name, tradeName, or digits of CPF/CNPJ
      let contactId = defaults.defaultContactId;
      let contactLabel =
        (contactId && defaults.contacts.find((c) => c.id === contactId)?.name) || '—';
      let rawContactName = '';

      if (mapping.useContact && mapping.contactCol) {
        const rawContact = String(row[mapping.contactCol] ?? '').trim();
        if (rawContact) {
          rawContactName = rawContact;
          const digits = rawContact.replace(/\D/g, '');
          const foundContact = defaults.contacts.find((c) => {
            if (c.name.trim().toLowerCase() === rawContact.toLowerCase()) return true;
            if (c.tradeName && c.tradeName.trim().toLowerCase() === rawContact.toLowerCase()) return true;
            if (digits.length >= 11 && c.document.replace(/\D/g, '') === digits) return true;
            return false;
          });
          if (foundContact) {
            contactId = foundContact.id;
            contactLabel = foundContact.name;
          } else {
            contactLabel = rawContact;
          }
        }
      }

      const documentNumber =
        mapping.useDocument && mapping.documentCol
          ? String(row[mapping.documentCol] ?? '').trim()
          : '';

      const notes =
        mapping.useNotes && mapping.notesCol
          ? String(row[mapping.notesCol] ?? '').trim()
          : '';

      return {
        rowIndex: index,
        selected: !excludedRowIndices.has(index),
        description: description.slice(0, 200),
        amountCents,
        dueDate,
        type,
        status,
        paymentMethod: status === 'settled' ? paymentMethod || 'PIX' : '',
        categoryId,
        categoryLabel,
        contactId,
        contactLabel,
        rawContactName,
        documentNumber: documentNumber.slice(0, 60),
        notes: notes.slice(0, 500),
      };
    })
    .filter((item): item is MappedExcelPreviewRow => item !== null);
}

export function buildTransactionsFromExcelRows(
  items: MappedExcelPreviewRow[],
  userId: string
): Transaction[] {
  const now = new Date().toISOString();
  return items
    .filter((item) => item.selected)
    .map((item) => ({
      id: crypto.randomUUID(),
      userId,
      type: item.type,
      description: item.description,
      amountCents: Math.max(1, item.amountCents),
      discountCents: 0,
      interestCents: 0,
      dueDate: item.dueDate,
      paidAt: item.status === 'settled' ? item.dueDate : null,
      status: item.status,
      paymentMethod: item.status === 'settled' ? item.paymentMethod : '',
      categoryId: item.categoryId,
      contactId: item.contactId,
      documentNumber: item.documentNumber,
      installmentGroupId: null,
      installmentNumber: 1,
      installmentTotal: 1,
      isRecurring: false,
      recurrenceInterval: null,
      notes: item.notes || 'Importado via Excel',
      source: 'excel',
      createdAt: now,
      updatedAt: now,
    }));
}

export function downloadExcelImportTemplate(): void {
  const sample = [
    {
      Descrição: 'Fornecedor Exemplo Ltda',
      'Valor (R$)': 1250.5,
      Vencimento: '25/11/2026',
      Tipo: 'A Pagar',
      Situação: 'Pendente',
      'Forma Pgto': '',
      Categoria: 'Fornecedores',
      Contato: 'Fornecedor Exemplo Ltda',
      Documento: 'NF-1042',
      Observações: 'Compra de mercadorias',
    },
    {
      Descrição: 'Mensalidade Cliente ABC',
      'Valor (R$)': 890.0,
      Vencimento: '20/11/2026',
      Tipo: 'A Receber',
      Situação: 'Recebido',
      'Forma Pgto': 'PIX',
      Categoria: 'Vendas / Serviços',
      Contato: 'Cliente ABC',
      Documento: 'REC-088',
      Observações: 'Recebido via PIX',
    },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sample);
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importação');
  XLSX.writeFile(wb, 'modelo-importacao-fluxoclaro.xlsx');
}
