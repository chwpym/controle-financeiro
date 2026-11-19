import type { Transaction, TransactionType } from '../types';
import { todayISO } from './format';

export interface ParsedXmlPreviewItem {
  tempId: string;
  description: string;
  amountCents: number;
  dueDate: string;
  documentNumber: string;
  supplierName: string;
  supplierDocument: string;
  installmentNumber: number;
  installmentTotal: number;
  installmentGroupId: string | null;
}

export interface GenericXmlAnalysis {
  kind: 'generic';
  recordTag: string;
  fields: string[];
  rows: Record<string, string>[];
}

export interface NfeXmlAddress {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface NfeXmlAnalysis {
  kind: 'nfe';
  supplierName: string;
  supplierTradeName: string;
  supplierDocument: string;
  supplierAddress: NfeXmlAddress;
  invoiceNumber: string;
  items: ParsedXmlPreviewItem[];
}

export type XmlAnalysisResult = NfeXmlAnalysis | GenericXmlAnalysis;

function getTagText(parent: Element | Document, tagName: string): string {
  const byNs = parent.getElementsByTagNameNS('*', tagName);
  if (byNs.length > 0 && byNs[0].textContent) {
    return byNs[0].textContent.trim();
  }
  const byName = parent.getElementsByTagName(tagName);
  if (byName.length > 0 && byName[0].textContent) {
    return byName[0].textContent.trim();
  }
  return '';
}

function parseMoneyToCents(val: string): number {
  const cleaned = val.trim().replace(/[R$\s]/g, '');
  if (!cleaned) return 0;
  let norm = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    norm = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    norm = cleaned.replace(',', '.');
  }
  const n = Number.parseFloat(norm);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function normalizeDateString(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }
  return todayISO();
}

export function analyzeXmlDocument(xmlContent: string): XmlAnalysisResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Arquivo XML inválido ou malformado.');
  }

  // Detect Brazilian NF-e
  const infNFe =
    doc.getElementsByTagNameNS('*', 'infNFe')[0] ||
    doc.getElementsByTagName('infNFe')[0];

  if (infNFe) {
    const emit =
      infNFe.getElementsByTagNameNS('*', 'emit')[0] ||
      infNFe.getElementsByTagName('emit')[0];
    const supplierName = emit ? getTagText(emit, 'xNome') || getTagText(emit, 'xFant') : 'Fornecedor NF-e';
    const supplierTradeName = emit ? getTagText(emit, 'xFant') : '';
    const supplierDocument = emit ? getTagText(emit, 'CNPJ') || getTagText(emit, 'CPF') : '';
    const enderEmit = emit
      ? emit.getElementsByTagNameNS('*', 'enderEmit')[0] || emit.getElementsByTagName('enderEmit')[0]
      : undefined;
    const supplierAddress: NfeXmlAddress = {
      cep: enderEmit ? getTagText(enderEmit, 'CEP') : '',
      street: enderEmit ? getTagText(enderEmit, 'xLgr') : '',
      number: enderEmit ? getTagText(enderEmit, 'nro') : '',
      complement: enderEmit ? getTagText(enderEmit, 'xCpl') : '',
      neighborhood: enderEmit ? getTagText(enderEmit, 'xBairro') : '',
      city: enderEmit ? getTagText(enderEmit, 'xMun') : '',
      state: enderEmit ? getTagText(enderEmit, 'UF') : '',
    };
    const nNF = getTagText(infNFe, 'nNF') || '';
    const dhEmi = getTagText(infNFe, 'dhEmi') || getTagText(infNFe, 'dEmi') || todayISO();
    const dupNodes = Array.from(
      infNFe.getElementsByTagNameNS('*', 'dup').length > 0
        ? infNFe.getElementsByTagNameNS('*', 'dup')
        : infNFe.getElementsByTagName('dup')
    );

    const groupId = dupNodes.length > 1 ? crypto.randomUUID() : null;
    if (dupNodes.length > 0) {
      const items: ParsedXmlPreviewItem[] = dupNodes.map((dup, index) => {
        const nDup = getTagText(dup, 'nDup') || String(index + 1);
        const dVenc = normalizeDateString(getTagText(dup, 'dVenc') || dhEmi);
        const vDup = parseMoneyToCents(getTagText(dup, 'vDup'));
        return {
          tempId: crypto.randomUUID(),
          description: `NF-e ${nNF || 'S/N'} — ${supplierName}${dupNodes.length > 1 ? ` (${index + 1}/${dupNodes.length})` : ''}`,
          amountCents: Math.max(1, vDup),
          dueDate: dVenc,
          documentNumber: nNF ? `NFe-${nNF} / Dup ${nDup}` : `Dup ${nDup}`,
          supplierName,
          supplierDocument,
          installmentNumber: index + 1,
          installmentTotal: dupNodes.length,
          installmentGroupId: groupId,
        };
      });
      return {
        kind: 'nfe',
        supplierName,
        supplierTradeName,
        supplierDocument,
        supplierAddress,
        invoiceNumber: nNF,
        items,
      };
    }

    const vNF = parseMoneyToCents(getTagText(infNFe, 'vNF'));
    return {
      kind: 'nfe',
      supplierName,
      supplierTradeName,
      supplierDocument,
      supplierAddress,
      invoiceNumber: nNF,
      items: [
        {
          tempId: crypto.randomUUID(),
          description: `NF-e ${nNF || 'S/N'} — ${supplierName}`,
          amountCents: Math.max(1, vNF),
          dueDate: normalizeDateString(dhEmi),
          documentNumber: nNF ? `NFe-${nNF}` : 'NFe',
          supplierName,
          supplierDocument,
          installmentNumber: 1,
          installmentTotal: 1,
          installmentGroupId: null,
        },
      ],
    };
  }

  // Generic XML extraction: find repeating leaf-containing element nodes
  const root = doc.documentElement;
  const children = Array.from(root.children);
  if (children.length === 0) {
    throw new Error('Nenhum registro encontrado neste XML.');
  }

  // Group direct children by tagName; if root has 1 wrapper tag (like <pagamentos><item>...</item></pagamentos>), go 1 level deeper
  let recordNodes = children;
  if (children.length === 1 && children[0].children.length > 0) {
    recordNodes = Array.from(children[0].children);
  }

  const fieldSet = new Set<string>();
  const rows: Record<string, string>[] = recordNodes.map((node) => {
    const row: Record<string, string> = {};
    if (node.children.length === 0) {
      const k = node.localName || node.tagName;
      fieldSet.add(k);
      row[k] = (node.textContent || '').trim();
    } else {
      for (const child of Array.from(node.children)) {
        const k = child.localName || child.tagName;
        fieldSet.add(k);
        row[k] = (child.textContent || '').trim();
      }
    }
    return row;
  });

  const fields = Array.from(fieldSet);
  if (fields.length === 0 || rows.length === 0) {
    throw new Error('Não foi possível extrair colunas deste XML.');
  }

  return {
    kind: 'generic',
    recordTag: recordNodes[0].localName || recordNodes[0].tagName,
    fields,
    rows,
  };
}

export interface GenericXmlMapping {
  descriptionField: string;
  amountField: string;
  dueDateField: string;
  documentField: string;
  contactField: string;
}

export function mapGenericXmlRows(
  rows: Record<string, string>[],
  mapping: GenericXmlMapping
): ParsedXmlPreviewItem[] {
  return rows
    .map((r, i) => {
      const desc = (mapping.descriptionField && r[mapping.descriptionField]) || `Pagamento XML #${i + 1}`;
      const cents = mapping.amountField ? parseMoneyToCents(r[mapping.amountField] || '') : 0;
      const due = mapping.dueDateField ? normalizeDateString(r[mapping.dueDateField] || '') : todayISO();
      const docNum = mapping.documentField ? (r[mapping.documentField] || '') : '';
      const supplier = mapping.contactField ? (r[mapping.contactField] || '') : '';
      return {
        tempId: crypto.randomUUID(),
        description: desc,
        amountCents: cents,
        dueDate: due,
        documentNumber: docNum,
        supplierName: supplier,
        supplierDocument: '',
        installmentNumber: 1,
        installmentTotal: 1,
        installmentGroupId: null,
      };
    })
    .filter((item) => item.amountCents > 0);
}

export function buildTransactionsFromXmlItems(
  items: ParsedXmlPreviewItem[],
  userId: string,
  type: TransactionType,
  categoryId: string | null,
  contactId: string | null
): Transaction[] {
  const now = new Date().toISOString();
  return items.map((item) => ({
    id: crypto.randomUUID(),
    userId,
    type,
    description: item.description.slice(0, 200),
    amountCents: Math.max(1, item.amountCents),
    discountCents: 0,
    interestCents: 0,
    dueDate: item.dueDate,
    paidAt: null,
    status: 'pending',
    paymentMethod: '',
    categoryId,
    contactId,
    documentNumber: item.documentNumber.slice(0, 60),
    issueDate: null,
    installmentGroupId: item.installmentGroupId,
    installmentNumber: item.installmentNumber,
    installmentTotal: item.installmentTotal,
    isRecurring: false,
    recurrenceInterval: null,
    notes: item.supplierName ? `Importado via XML (${item.supplierName})` : 'Importado via XML',
    source: 'xml',
    createdAt: now,
    updatedAt: now,
  }));
}
