import type { Contact, Transaction, TransactionType } from '../types';
import { maskCEP, maskCNPJ, maskCPF, todayISO } from './format';

export interface ParsedXmlPreviewItem {
  tempId: string;
  description: string;
  amountCents: number;
  dueDate: string;
  issueDate: string;
  documentNumber: string;
  supplierName: string;
  supplierDocument: string;
  customerName?: string;
  customerDocument?: string;
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
  operationType: 'entry' | 'exit';
  tpNF: number;
  supplierName: string;
  supplierTradeName: string;
  supplierDocument: string;
  supplierAddress: NfeXmlAddress;
  customerName: string;
  customerTradeName: string;
  customerDocument: string;
  customerAddress: NfeXmlAddress;
  invoiceNumber: string;
  issueDate: string;
  items: ParsedXmlPreviewItem[];
}

export interface NfseXmlAnalysis {
  kind: 'nfse';
  providerName: string;
  providerDocument: string;
  providerAddress: NfeXmlAddress;
  customerName: string;
  customerDocument: string;
  customerAddress: NfeXmlAddress;
  invoiceNumber: string;
  issueDate: string;
  items: ParsedXmlPreviewItem[];
}

export type XmlAnalysisResult = NfeXmlAnalysis | NfseXmlAnalysis | GenericXmlAnalysis;

function getTagText(parent: Element | Document | undefined | null, tagName: string): string {
  if (!parent) return '';
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

function getFirstElement(parent: Element | Document | undefined | null, tagNames: string[]): Element | undefined {
  if (!parent) return undefined;
  for (const name of tagNames) {
    const byNs = parent.getElementsByTagNameNS('*', name);
    if (byNs.length > 0) return byNs[0];
    const byName = parent.getElementsByTagName(name);
    if (byName.length > 0) return byName[0];
  }
  return undefined;
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

function extractAddress(container: Element | undefined | null): NfeXmlAddress {
  if (!container) {
    return { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
  }
  return {
    cep: getTagText(container, 'CEP') || getTagText(container, 'Cep'),
    street:
      getTagText(container, 'xLgr') ||
      getTagText(container, 'Endereco') ||
      getTagText(container, 'Logradouro') ||
      getTagText(container, 'tipoLogradouro'),
    number: getTagText(container, 'nro') || getTagText(container, 'Numero'),
    complement: getTagText(container, 'xCpl') || getTagText(container, 'Complemento'),
    neighborhood: getTagText(container, 'xBairro') || getTagText(container, 'Bairro'),
    city:
      getTagText(container, 'xMun') ||
      getTagText(container, 'Cidade') ||
      getTagText(container, 'Municipio') ||
      getTagText(container, 'CodigoMunicipio'),
    state: getTagText(container, 'UF') || getTagText(container, 'Uf'),
  };
}

function extractDocument(container: Element | undefined | null): string {
  if (!container) return '';
  return (
    getTagText(container, 'CNPJ') ||
    getTagText(container, 'Cnpj') ||
    getTagText(container, 'CPF') ||
    getTagText(container, 'Cpf')
  );
}

export function analyzeXmlDocument(xmlContent: string): XmlAnalysisResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Arquivo XML inválido ou malformado.');
  }

  // 1. Detect Brazilian NF-e (Modelo 55 ou 65)
  const infNFe = getFirstElement(doc, ['infNFe']);

  if (infNFe) {
    const ide = getFirstElement(infNFe, ['ide']);
    const rawTpNf = ide ? getTagText(ide, 'tpNF') : getTagText(infNFe, 'tpNF');
    const tpNF = rawTpNf === '1' ? 1 : 0;
    const nNF = (ide ? getTagText(ide, 'nNF') : '') || getTagText(infNFe, 'nNF');
    const rawDhEmi =
      (ide ? getTagText(ide, 'dhEmi') || getTagText(ide, 'dEmi') : '') ||
      getTagText(infNFe, 'dhEmi') ||
      getTagText(infNFe, 'dEmi') ||
      todayISO();
    const issueDate = normalizeDateString(rawDhEmi);

    // Emitente
    const emit = getFirstElement(infNFe, ['emit']);
    const supplierName = emit ? getTagText(emit, 'xNome') || getTagText(emit, 'xFant') : 'Fornecedor NF-e';
    const supplierTradeName = emit ? getTagText(emit, 'xFant') : '';
    const supplierDocument = extractDocument(emit);
    const enderEmit = emit ? getFirstElement(emit, ['enderEmit']) : undefined;
    const supplierAddress = extractAddress(enderEmit);

    // Destinatário
    const dest = getFirstElement(infNFe, ['dest']);
    const customerName = dest ? getTagText(dest, 'xNome') || getTagText(dest, 'xFant') : 'Cliente NF-e';
    const customerTradeName = dest ? getTagText(dest, 'xFant') : '';
    const customerDocument = extractDocument(dest);
    const enderDest = dest ? getFirstElement(dest, ['enderDest']) : undefined;
    const customerAddress = extractAddress(enderDest);

    const dupNodes = Array.from(
      infNFe.getElementsByTagNameNS('*', 'dup').length > 0
        ? infNFe.getElementsByTagNameNS('*', 'dup')
        : infNFe.getElementsByTagName('dup')
    );

    const primaryParty = tpNF === 1 ? customerName : supplierName;
    const groupId = dupNodes.length > 1 ? crypto.randomUUID() : null;

    if (dupNodes.length > 0) {
      const items: ParsedXmlPreviewItem[] = dupNodes.map((dup, index) => {
        const nDup = getTagText(dup, 'nDup') || String(index + 1);
        const dVenc = normalizeDateString(getTagText(dup, 'dVenc') || issueDate);
        const vDup = parseMoneyToCents(getTagText(dup, 'vDup'));
        return {
          tempId: crypto.randomUUID(),
          description: `NF-e ${nNF || 'S/N'} — ${primaryParty}${dupNodes.length > 1 ? ` (${index + 1}/${dupNodes.length})` : ''}`,
          amountCents: Math.max(1, vDup),
          dueDate: dVenc,
          issueDate,
          documentNumber: nNF ? `NFe-${nNF} / Dup ${nDup}` : `Dup ${nDup}`,
          supplierName,
          supplierDocument,
          customerName,
          customerDocument,
          installmentNumber: index + 1,
          installmentTotal: dupNodes.length,
          installmentGroupId: groupId,
        };
      });

      return {
        kind: 'nfe',
        operationType: tpNF === 1 ? 'exit' : 'entry',
        tpNF,
        supplierName,
        supplierTradeName,
        supplierDocument,
        supplierAddress,
        customerName,
        customerTradeName,
        customerDocument,
        customerAddress,
        invoiceNumber: nNF,
        issueDate,
        items,
      };
    }

    const vNF = parseMoneyToCents(getTagText(infNFe, 'vNF'));
    return {
      kind: 'nfe',
      operationType: tpNF === 1 ? 'exit' : 'entry',
      tpNF,
      supplierName,
      supplierTradeName,
      supplierDocument,
      supplierAddress,
      customerName,
      customerTradeName,
      customerDocument,
      customerAddress,
      invoiceNumber: nNF,
      issueDate,
      items: [
        {
          tempId: crypto.randomUUID(),
          description: `NF-e ${nNF || 'S/N'} — ${primaryParty}`,
          amountCents: Math.max(1, vNF),
          dueDate: issueDate,
          issueDate,
          documentNumber: nNF ? `NFe-${nNF}` : 'NFe',
          supplierName,
          supplierDocument,
          customerName,
          customerDocument,
          installmentNumber: 1,
          installmentTotal: 1,
          installmentGroupId: null,
        },
      ],
    };
  }

  // 2. Detect Brazilian NFS-e (Padrão ABRASF / Municipal)
  const nfseNode = getFirstElement(doc, [
    'InfNfse',
    'tcInfNfse',
    'CompNfse',
    'tcCompNfse',
    'NFS-e',
    'NFSe',
  ]);

  if (nfseNode) {
    const invoiceNumber = getTagText(nfseNode, 'Numero') || getTagText(doc, 'Numero');
    const rawDataEmissao =
      getTagText(nfseNode, 'DataEmissao') ||
      getTagText(doc, 'DataEmissao') ||
      getTagText(nfseNode, 'dEmi') ||
      todayISO();
    const issueDate = normalizeDateString(rawDataEmissao);

    // Prestador
    const prestadorNode = getFirstElement(nfseNode, ['PrestadorServico', 'Prestador', 'DadosPrestador']);
    const providerName =
      (prestadorNode
        ? getTagText(prestadorNode, 'RazaoSocial') ||
          getTagText(prestadorNode, 'NomeFantasia') ||
          getTagText(prestadorNode, 'xNome')
        : '') || 'Prestador NFS-e';
    const providerDocument = extractDocument(prestadorNode);
    const prestadorEnderecoNode = prestadorNode ? getFirstElement(prestadorNode, ['Endereco', 'EnderecoPrestador']) : undefined;
    const providerAddress = extractAddress(prestadorEnderecoNode);

    // Tomador
    const tomadorNode = getFirstElement(nfseNode, ['TomadorServico', 'Tomador', 'DadosTomador']);
    const customerName =
      (tomadorNode
        ? getTagText(tomadorNode, 'RazaoSocial') ||
          getTagText(tomadorNode, 'NomeRazaoSocial') ||
          getTagText(tomadorNode, 'xNome')
        : '') || 'Tomador NFS-e';
    const customerDocument = extractDocument(tomadorNode);
    const tomadorEnderecoNode = tomadorNode ? getFirstElement(tomadorNode, ['Endereco', 'EnderecoTomador']) : undefined;
    const customerAddress = extractAddress(tomadorEnderecoNode);

    // Valores
    const valoresNode = getFirstElement(nfseNode, ['ValoresNfse', 'Valores', 'ValoresServico']);
    const vLiq = valoresNode ? parseMoneyToCents(getTagText(valoresNode, 'ValorLiquidoNfse')) : 0;
    const vServ = valoresNode ? parseMoneyToCents(getTagText(valoresNode, 'ValorServicos')) : 0;
    const amountCents = vLiq > 0 ? vLiq : vServ > 0 ? vServ : parseMoneyToCents(getTagText(doc, 'ValorLiquidoNfse') || getTagText(doc, 'ValorServicos'));

    const item: ParsedXmlPreviewItem = {
      tempId: crypto.randomUUID(),
      description: `NFS-e ${invoiceNumber || 'S/N'} — ${providerName}`,
      amountCents: Math.max(1, amountCents),
      dueDate: issueDate,
      issueDate,
      documentNumber: invoiceNumber ? `NFSe-${invoiceNumber}` : 'NFSe',
      supplierName: providerName,
      supplierDocument: providerDocument,
      customerName,
      customerDocument,
      installmentNumber: 1,
      installmentTotal: 1,
      installmentGroupId: null,
    };

    return {
      kind: 'nfse',
      providerName,
      providerDocument,
      providerAddress,
      customerName,
      customerDocument,
      customerAddress,
      invoiceNumber,
      issueDate,
      items: [item],
    };
  }

  // 3. Generic XML extraction
  const root = doc.documentElement;
  const children = Array.from(root.children);
  if (children.length === 0) {
    throw new Error('Nenhum registro encontrado neste XML.');
  }

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
      const docNum = mapping.documentField ? r[mapping.documentField] || '' : '';
      const supplier = mapping.contactField ? r[mapping.contactField] || '' : '';
      return {
        tempId: crypto.randomUUID(),
        description: desc,
        amountCents: cents,
        dueDate: due,
        issueDate: due,
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
  return items.map((item) => {
    const defaultContactName =
      type === 'receivable'
        ? item.customerName || item.supplierName
        : item.supplierName || item.customerName;

    return {
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
      issueDate: item.issueDate ? item.issueDate.slice(0, 10) : null,
      installmentGroupId: item.installmentGroupId,
      installmentNumber: item.installmentNumber,
      installmentTotal: item.installmentTotal,
      isRecurring: false,
      recurrenceInterval: null,
      notes: defaultContactName ? `Importado via XML (${defaultContactName})` : 'Importado via XML',
      source: 'xml',
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function buildContactFromXmlParty(
  userId: string,
  kind: 'supplier' | 'customer',
  name: string,
  tradeName: string | undefined,
  rawDocument: string,
  address: NfeXmlAddress
): Contact {
  const digits = rawDocument.replace(/\D/g, '');
  const personType = digits.length === 11 ? 'PF' : 'PJ';
  const formattedDoc =
    digits.length === 11 ? maskCPF(digits) : digits.length === 14 ? maskCNPJ(digits) : rawDocument;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId,
    personType,
    kind,
    name: name.trim() || (kind === 'supplier' ? 'Fornecedor XML' : 'Cliente XML'),
    tradeName: (tradeName || '').trim(),
    document: formattedDoc,
    phone: '',
    email: '',
    cep: address.cep ? maskCEP(address.cep) : '',
    street: address.street || '',
    number: address.number || '',
    complement: address.complement || '',
    neighborhood: address.neighborhood || '',
    city: address.city || '',
    state: (address.state || '').toUpperCase().slice(0, 2),
    createdAt: now,
    updatedAt: now,
  };
}
