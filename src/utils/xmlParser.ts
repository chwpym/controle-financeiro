/**
 * EN: XML Parser & Fiscal Intelligence Engine (Phase 11.1).
 *     Supports Brazilian NF-e (Model 55/65), NFS-e (ABRASF/Municipal), Generic XMLs,
 *     issuer/recipient CNPJ company matching, commercial adjustments, and batch multi-XML parsing.
 * PT: Motor de Leitura de XML e Inteligência Fiscal (Fase 11.1).
 *     Suporta NF-e (Modelo 55/65), NFS-e (ABRASF/Municipal), XMLs Genéricos,
 *     cruzamento inteligente de CNPJ Emitente/Destinatário, ajustes comerciais e leitura em massa.
 */

import type { Company, Contact, Transaction, TransactionType } from '../types';
import { cleanDocumentDigits, formatBRL, maskCEP, maskCNPJ, maskCPF, todayISO } from './format';

/**
 * EN: Represents a single installment/duplicata extracted or mapped from an XML document.
 * PT: Representa uma parcela/duplicata individual extraída ou mapeada de um documento XML.
 */
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

/**
 * EN: Analysis structure for non-fiscal/generic XML files.
 * PT: Estrutura de análise para arquivos XML genéricos (não fiscais).
 */
export interface GenericXmlAnalysis {
  kind: 'generic';
  recordTag: string;
  fields: string[];
  rows: Record<string, string>[];
}

/**
 * EN: Normalized Brazilian postal address extracted from NF-e or NFS-e tags.
 * PT: Endereço postal brasileiro normalizado extraído de tags NF-e ou NFS-e.
 */
export interface NfeXmlAddress {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

/**
 * EN: Structured analysis of a Brazilian NF-e (Model 55 / 65).
 * PT: Análise estruturada de uma NF-e brasileira (Modelo 55 / 65).
 */
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
  /**
   * EN: Total invoice amount in integer cents (<vNF> or <vLiq>).
   * PT: Valor total da Nota Fiscal em centavos inteiros (<vNF> ou <vLiq>).
   */
  invoiceTotalCents: number;
  items: ParsedXmlPreviewItem[];
}

/**
 * EN: Structured analysis of a Brazilian Municipal NFS-e (Service Invoice).
 * PT: Análise estruturada de uma NFS-e Municipal brasileira (Nota de Serviço).
 */
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
  /**
   * EN: Total service invoice amount in integer cents.
   * PT: Valor total da NFS-e em centavos inteiros.
   */
  invoiceTotalCents: number;
  items: ParsedXmlPreviewItem[];
}

export type XmlAnalysisResult = NfeXmlAnalysis | NfseXmlAnalysis | GenericXmlAnalysis;

/**
 * EN: Result of cross-referencing XML issuer/recipient CNPJs against registered companies.
 * PT: Resultado do cruzamento fiscal dos CNPJs de Emitente/Destinatário com as empresas cadastradas.
 */
export interface XmlOperationDetection {
  txType: TransactionType;
  matchedRole: 'recipient' | 'issuer' | 'none';
  matchedCompany: Company | null;
  companyId: string;
  counterpartyRole: 'supplier' | 'customer';
  counterpartyName: string;
  counterpartyTradeName: string;
  counterpartyDocument: string;
  counterpartyAddress: NfeXmlAddress;
}

/**
 * EN: Commercial adjustment options when installment sum diverges from the invoice total.
 * PT: Opções de ajuste comercial quando a soma das parcelas diverge do valor total da NF.
 */
export type XmlAdjustmentType = 'exact' | 'positive' | 'negative';

export interface XmlCommercialAdjustment {
  divergenceCents: number;
  adjustmentType: XmlAdjustmentType;
  reasonLabel: string;
  notes?: string;
}

export interface BuildXmlTransactionsOptions {
  companyId?: string | null;
  adjustment?: XmlCommercialAdjustment | null;
}

/**
 * EN: Batch parse result item for Multi-XML import.
 * PT: Item de resultado de leitura em lote para importação Multi-XML.
 */
export interface BatchParsedXmlFile {
  id: string;
  fileName: string;
  analysis: XmlAnalysisResult | null;
  error: string | null;
}

export const POSITIVE_ADJUSTMENT_REASONS = [
  { value: 'frete_por_fora', label: '🚚 Frete por Fora / Despesa de Entrega' },
  { value: 'juros_tarifa', label: '📈 Juros / Encargos / Tarifa Bancária' },
  { value: 'outro_acrescimo', label: '➕ Outro Acréscimo Comercial' },
] as const;

export const NEGATIVE_ADJUSTMENT_REASONS = [
  { value: 'credito_garantia', label: '🛡️ Crédito de Garantia / Peça com Defeito' },
  { value: 'desconto_comercial', label: '🏷️ Desconto Comercial no Boleto' },
  { value: 'devolucao_parcial', label: '🔄 Devolução Parcial de Mercadoria' },
  { value: 'outro_abatimento', label: '➖ Outro Abatimento' },
] as const;

// EN: Helper to read text content from an XML tag ignoring XML namespaces.
// PT: Helper para ler o texto de uma tag XML ignorando namespaces.
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

// EN: Helper to locate the first matching element from a list of candidate tag names.
// PT: Helper para localizar o primeiro elemento correspondente a partir de uma lista de tags candidatas.
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

// EN: Converts monetary XML strings (e.g. "1450.50" or "1.450,50") into integer cents safely.
// PT: Converte strings monetárias do XML (ex: "1450.50" ou "1.450,50") em centavos inteiros com segurança.
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

// EN: Normalizes ISO or Brazilian DD/MM/YYYY dates into YYYY-MM-DD format.
// PT: Normaliza datas ISO ou no padrão brasileiro DD/MM/AAAA para o formato AAAA-MM-DD.
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

const EMPTY_ADDRESS: NfeXmlAddress = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

/**
 * EN: Analyzes an XML string and extracts NF-e, NFS-e, or Generic XML structures.
 *     Note: Supplier NF-es almost always carry `<tpNF>1</tpNF>` (exit from the supplier),
 *     so we default item descriptions to the issuer (`supplierName`) unless overridden by company matching.
 * PT: Analisa o conteúdo XML e extrai estruturas de NF-e, NFS-e ou XML Genérico.
 *     Nota: Notas de fornecedores trazem `<tpNF>1</tpNF>` (saída do fornecedor),
 *     portanto nunca usamos `<tpNF>1</tpNF>` para forçar Conta a Receber por padrão.
 */
export function analyzeXmlDocument(xmlContent: string): XmlAnalysisResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Arquivo XML inválido ou malformado.');
  }

  // 1. Detect Brazilian NF-e (Modelo 55 ou 65) / Detectar NF-e Brasileira (Modelo 55 ou 65)
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

    // Issuer (Emitente / Vendedor)
    const emit = getFirstElement(infNFe, ['emit']);
    const supplierName = emit ? getTagText(emit, 'xNome') || getTagText(emit, 'xFant') : 'Fornecedor NF-e';
    const supplierTradeName = emit ? getTagText(emit, 'xFant') : '';
    const supplierDocument = extractDocument(emit);
    const enderEmit = emit ? getFirstElement(emit, ['enderEmit']) : undefined;
    const supplierAddress = extractAddress(enderEmit);

    // Recipient (Destinatário / Comprador)
    const dest = getFirstElement(infNFe, ['dest']);
    const customerName = dest ? getTagText(dest, 'xNome') || getTagText(dest, 'xFant') : 'Cliente NF-e';
    const customerTradeName = dest ? getTagText(dest, 'xFant') : '';
    const customerDocument = extractDocument(dest);
    const enderDest = dest ? getFirstElement(dest, ['enderDest']) : undefined;
    const customerAddress = extractAddress(enderDest);

    // Total Invoice Value (<ICMSTot><vNF> or <fat><vLiq>) / Valor Total da Nota Fiscal
    const icmsTot = getFirstElement(infNFe, ['ICMSTot']);
    const fatNode = getFirstElement(infNFe, ['fat']);
    const vNF =
      (icmsTot ? parseMoneyToCents(getTagText(icmsTot, 'vNF')) : 0) ||
      parseMoneyToCents(getTagText(infNFe, 'vNF')) ||
      (fatNode ? parseMoneyToCents(getTagText(fatNode, 'vLiq')) : 0);

    const dupNodes = Array.from(
      infNFe.getElementsByTagNameNS('*', 'dup').length > 0
        ? infNFe.getElementsByTagNameNS('*', 'dup')
        : infNFe.getElementsByTagName('dup')
    );

    // EN: Default party in description is the supplier (issuer); `formatXmlItemDescription` adapts when receivable.
    // PT: Parte padrão na descrição é o emitente (fornecedor); `formatXmlItemDescription` adapta quando for a receber.
    const primaryParty = supplierName || customerName;
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

      const sumDups = items.reduce((acc, it) => acc + it.amountCents, 0);

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
        invoiceTotalCents: vNF > 0 ? vNF : sumDups,
        items,
      };
    }

    const fallbackTotalCents = Math.max(1, vNF);
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
      invoiceTotalCents: fallbackTotalCents,
      items: [
        {
          tempId: crypto.randomUUID(),
          description: `NF-e ${nNF || 'S/N'} — ${primaryParty}`,
          amountCents: fallbackTotalCents,
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

  // 2. Detect Brazilian NFS-e (Padrão ABRASF / Municipal) / Detectar NFS-e de Serviços
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

    // Provider (Prestador)
    const prestadorNode = getFirstElement(nfseNode, ['PrestadorServico', 'Prestador', 'DadosPrestador']);
    const providerName =
      (prestadorNode
        ? getTagText(prestadorNode, 'RazaoSocial') ||
          getTagText(prestadorNode, 'NomeFantasia') ||
          getTagText(prestadorNode, 'xNome')
        : '') || 'Prestador NFS-e';
    const providerDocument = extractDocument(prestadorNode);
    const prestadorEnderecoNode = prestadorNode
      ? getFirstElement(prestadorNode, ['Endereco', 'EnderecoPrestador'])
      : undefined;
    const providerAddress = extractAddress(prestadorEnderecoNode);

    // Customer (Tomador)
    const tomadorNode = getFirstElement(nfseNode, ['TomadorServico', 'Tomador', 'DadosTomador']);
    const customerName =
      (tomadorNode
        ? getTagText(tomadorNode, 'RazaoSocial') ||
          getTagText(tomadorNode, 'NomeRazaoSocial') ||
          getTagText(tomadorNode, 'xNome')
        : '') || 'Tomador NFS-e';
    const customerDocument = extractDocument(tomadorNode);
    const tomadorEnderecoNode = tomadorNode
      ? getFirstElement(tomadorNode, ['Endereco', 'EnderecoTomador'])
      : undefined;
    const customerAddress = extractAddress(tomadorEnderecoNode);

    // Values (Valores)
    const valoresNode = getFirstElement(nfseNode, ['ValoresNfse', 'Valores', 'ValoresServico']);
    const vLiq = valoresNode ? parseMoneyToCents(getTagText(valoresNode, 'ValorLiquidoNfse')) : 0;
    const vServ = valoresNode ? parseMoneyToCents(getTagText(valoresNode, 'ValorServicos')) : 0;
    const rawAmount =
      vLiq > 0
        ? vLiq
        : vServ > 0
          ? vServ
          : parseMoneyToCents(getTagText(doc, 'ValorLiquidoNfse') || getTagText(doc, 'ValorServicos'));
    const safeAmountCents = Math.max(1, rawAmount);

    const item: ParsedXmlPreviewItem = {
      tempId: crypto.randomUUID(),
      description: `NFS-e ${invoiceNumber || 'S/N'} — ${providerName}`,
      amountCents: safeAmountCents,
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
      invoiceTotalCents: safeAmountCents,
      items: [item],
    };
  }

  // 3. Generic XML extraction / Extração de XML genérico
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

/**
 * EN: Cross-references XML issuer (`emit`/`Prestador`) and recipient (`dest`/`Tomador`) CNPJs
 *     against the user's registered companies to automatically determine Payable vs Receivable,
 *     target `companyId`, and counterparty role without relying on `<tpNF>`.
 * PT: Cruza os CNPJs de Emitente (`emit`/`Prestador`) e Destinatário (`dest`/`Tomador`) do XML
 *     com a lista de empresas cadastradas do usuário para detectar automaticamente se é
 *     Conta a Pagar ou Conta a Receber, vincular o `companyId` e identificar o Fornecedor/Cliente.
 */
export function detectXmlOperation(
  parsedXml: XmlAnalysisResult,
  userCompanies: Company[] = [],
  selectedCompanyId?: string | 'all' | null
): XmlOperationDetection {
  const activeCompanies = userCompanies.filter((c) => c.status === 'active');
  const pool = activeCompanies.length > 0 ? activeCompanies : userCompanies;

  const resolveFallbackCompanyId = (): string => {
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      const found = pool.find((c) => c.id === selectedCompanyId);
      if (found) return found.id;
    }
    const def = pool.find((c) => c.isDefault);
    if (def) return def.id;
    return pool[0]?.id || '';
  };

  if (parsedXml.kind === 'generic') {
    return {
      txType: 'payable',
      matchedRole: 'none',
      matchedCompany: null,
      companyId: resolveFallbackCompanyId(),
      counterpartyRole: 'supplier',
      counterpartyName: '',
      counterpartyTradeName: '',
      counterpartyDocument: '',
      counterpartyAddress: EMPTY_ADDRESS,
    };
  }

  const issuerDocClean = cleanDocumentDigits(
    parsedXml.kind === 'nfe' ? parsedXml.supplierDocument : parsedXml.providerDocument
  );
  const recipientDocClean = cleanDocumentDigits(parsedXml.customerDocument);

  const findByDoc = (cleanDoc: string): Company | null => {
    if (!cleanDoc || cleanDoc.length < 11) return null;
    // Prefer the currently selected company if multiple entries share the same CNPJ
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      const selectedMatch = pool.find(
        (c) => c.id === selectedCompanyId && cleanDocumentDigits(c.document) === cleanDoc
      );
      if (selectedMatch) return selectedMatch;
    }
    return pool.find((c) => cleanDocumentDigits(c.document) === cleanDoc) || null;
  };

  const recipientCompany = findByDoc(recipientDocClean);
  const issuerCompany = findByDoc(issuerDocClean);

  const issuerName = parsedXml.kind === 'nfe' ? parsedXml.supplierName : parsedXml.providerName;
  const issuerTradeName = parsedXml.kind === 'nfe' ? parsedXml.supplierTradeName : '';
  const issuerDocument = parsedXml.kind === 'nfe' ? parsedXml.supplierDocument : parsedXml.providerDocument;
  const issuerAddress = parsedXml.kind === 'nfe' ? parsedXml.supplierAddress : parsedXml.providerAddress;

  const recipientName = parsedXml.customerName;
  const recipientTradeName = parsedXml.kind === 'nfe' ? parsedXml.customerTradeName : '';
  const recipientDocument = parsedXml.customerDocument;
  const recipientAddress = parsedXml.customerAddress;

  // Rule 1: Recipient is one of our companies -> Payable (Purchase / Service Taken), Issuer is Supplier
  // Regra 1: Destinatário é uma empresa sua -> Conta a Pagar, Emitente é Fornecedor
  if (recipientCompany) {
    return {
      txType: 'payable',
      matchedRole: 'recipient',
      matchedCompany: recipientCompany,
      companyId: recipientCompany.id,
      counterpartyRole: 'supplier',
      counterpartyName: issuerName,
      counterpartyTradeName: issuerTradeName,
      counterpartyDocument: issuerDocument,
      counterpartyAddress: issuerAddress,
    };
  }

  // Rule 2: Issuer is one of our companies -> Receivable (Sale / Service Provided), Recipient is Customer
  // Regra 2: Emitente é uma empresa sua -> Conta a Receber, Destinatário é Cliente
  if (issuerCompany) {
    return {
      txType: 'receivable',
      matchedRole: 'issuer',
      matchedCompany: issuerCompany,
      companyId: issuerCompany.id,
      counterpartyRole: 'customer',
      counterpartyName: recipientName,
      counterpartyTradeName: recipientTradeName,
      counterpartyDocument: recipientDocument,
      counterpartyAddress: recipientAddress,
    };
  }

  // Rule 3: Strict Two-Agent Fiscal Integrity Lock (SEFAZ Rule):
  // An NF-e / NFS-e only exists between two parties (Issuer and Recipient).
  // If neither CNPJ matches a registered company, NEVER bind to an arbitrary third-party company!
  // Regra 3: Trava Estrita de Dois Agentes (SEFAZ):
  // Uma NF-e / NFS-e só existe entre Emitente e Destinatário.
  // Se nenhum CNPJ pertencer a uma empresa sua cadastrada, NUNCA vincular a uma empresa terceira!
  return {
    txType: 'payable',
    matchedRole: 'none',
    matchedCompany: null,
    companyId: '',
    counterpartyRole: 'supplier',
    counterpartyName: issuerName,
    counterpartyTradeName: issuerTradeName,
    counterpartyDocument: issuerDocument,
    counterpartyAddress: issuerAddress,
  };
}

/**
 * EN: Adapts item descriptions dynamically when switching between Payable (Supplier) and Receivable (Customer).
 * PT: Adapta dinamicamente a descrição das parcelas ao alternar entre Conta a Pagar (Fornecedor) e Conta a Receber (Cliente).
 */
export function adaptXmlItemsForType(
  analysis: XmlAnalysisResult,
  items: ParsedXmlPreviewItem[],
  txType: TransactionType
): ParsedXmlPreviewItem[] {
  if (analysis.kind === 'generic') return items;
  const prefix = analysis.kind === 'nfe' ? 'NF-e' : 'NFS-e';
  const num = analysis.invoiceNumber || 'S/N';
  const party =
    txType === 'receivable'
      ? analysis.customerName || (analysis.kind === 'nfe' ? analysis.supplierName : analysis.providerName)
      : analysis.kind === 'nfe'
        ? analysis.supplierName
        : analysis.providerName;

  return items.map((item) => ({
    ...item,
    description: `${prefix} ${num} — ${party}${item.installmentTotal > 1 ? ` (${item.installmentNumber}/${item.installmentTotal})` : ''}`,
  }));
}

/**
 * EN: Reads a `File` text safely in both browser and jsdom environments.
 * PT: Lê o conteúdo textual de um `File` com suporte a navegadores modernos e ambiente de testes jsdom.
 */
function readXmlFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Falha ao ler o arquivo ${file.name}.`));
    reader.readAsText(file);
  });
}

/**
 * EN: Parses multiple `.xml` files in parallel for Batch / Multi-XML Import.
 * PT: Processa múltiplos arquivos `.xml` em paralelo para Importação em Massa (Multi-XML).
 */
export async function parseMultipleXmlFiles(files: File[]): Promise<BatchParsedXmlFile[]> {
  return Promise.all(
    files.map(async (file) => {
      try {
        const content = await readXmlFileText(file);
        const analysis = analyzeXmlDocument(content);
        return {
          id: crypto.randomUUID(),
          fileName: file.name,
          analysis,
          error: null,
        };
      } catch (err) {
        return {
          id: crypto.randomUUID(),
          fileName: file.name,
          analysis: null,
          error: err instanceof Error ? err.message : 'Erro ao interpretar arquivo XML.',
        };
      }
    })
  );
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

/**
 * EN: Distributes integer cents proportionally across `count` items without floating-point drift.
 * PT: Distribui centavos inteiros entre `count` parcelas sem perda de precisão por ponto flutuante.
 */
function splitAdjustmentAcrossItems(totalAdjustmentCents: number, count: number): number[] {
  const safeCount = Math.max(1, count);
  const absTotal = Math.max(0, Math.round(Math.abs(totalAdjustmentCents)));
  if (absTotal === 0) return Array(safeCount).fill(0);
  const base = Math.floor(absTotal / safeCount);
  const remainder = absTotal - base * safeCount;
  return Array.from({ length: safeCount }, (_, idx) => base + (idx === 0 ? remainder : 0));
}

/**
 * EN: Builds final `Transaction[]` records from preview items, binding `companyId` and commercial
 *     adjustments (`interestCents` for positive divergence, `discountCents` for negative divergence)
 *     along with detailed audit notes.
 * PT: Gera os lançamentos `Transaction[]` finais a partir das parcelas revisadas, vinculando `companyId`
 *     e ajustes comerciais (`interestCents` para acréscimos, `discountCents` para abatimentos)
 *     com justificativa detalhada nas observações (`notes`).
 */
export function buildTransactionsFromXmlItems(
  items: ParsedXmlPreviewItem[],
  userId: string,
  type: TransactionType,
  categoryId: string | null,
  contactId: string | null,
  options?: BuildXmlTransactionsOptions
): Transaction[] {
  const now = new Date().toISOString();
  const companyId = options?.companyId || null;
  const adjustment = options?.adjustment;

  const isPositive = adjustment && adjustment.adjustmentType === 'positive' && adjustment.divergenceCents > 0;
  const isNegative = adjustment && adjustment.adjustmentType === 'negative' && adjustment.divergenceCents < 0;

  const interestShares = isPositive
    ? splitAdjustmentAcrossItems(adjustment.divergenceCents, items.length)
    : items.map(() => 0);

  const discountShares = isNegative
    ? splitAdjustmentAcrossItems(Math.abs(adjustment.divergenceCents), items.length)
    : items.map(() => 0);

  // Re-index selected installments cleanly if user unchecked some rows
  const totalSelected = items.length;
  const sharedGroupId =
    totalSelected > 1 ? items[0]?.installmentGroupId || crypto.randomUUID() : null;

  return items.map((item, idx) => {
    const defaultContactName =
      type === 'receivable'
        ? item.customerName || item.supplierName
        : item.supplierName || item.customerName;

    const baseNote = defaultContactName
      ? `Importado via XML (${defaultContactName})`
      : 'Importado via XML';

    let finalNotes = baseNote;
    if (isPositive && adjustment) {
      const absStr = formatBRL(Math.abs(adjustment.divergenceCents));
      const extraDetail = adjustment.notes?.trim() ? ` — ${adjustment.notes.trim()}` : '';
      finalNotes = `${baseNote} | Acréscimo (+${absStr}): ${adjustment.reasonLabel}${extraDetail}`;
    } else if (isNegative && adjustment) {
      const absStr = formatBRL(Math.abs(adjustment.divergenceCents));
      const extraDetail = adjustment.notes?.trim() ? ` — ${adjustment.notes.trim()}` : '';
      finalNotes = `${baseNote} | Abatimento (-${absStr}): ${adjustment.reasonLabel}${extraDetail}`;
    }

    return {
      id: crypto.randomUUID(),
      userId,
      companyId,
      type,
      description: item.description.slice(0, 200),
      amountCents: Math.max(1, Math.round(item.amountCents)),
      discountCents: discountShares[idx] || 0,
      interestCents: interestShares[idx] || 0,
      dueDate: item.dueDate,
      paidAt: null,
      status: 'pending',
      paymentMethod: '',
      categoryId,
      contactId,
      documentNumber: item.documentNumber.slice(0, 60),
      issueDate: item.issueDate ? item.issueDate.slice(0, 10) : null,
      installmentGroupId: sharedGroupId,
      installmentNumber: totalSelected > 1 ? idx + 1 : 1,
      installmentTotal: totalSelected,
      isRecurring: false,
      recurrenceInterval: null,
      notes: finalNotes,
      source: 'xml',
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * EN: Builds a pre-filled `Contact` object from XML party metadata (Issuer or Recipient).
 * PT: Constrói um objeto `Contact` pré-preenchido a partir dos dados da parte do XML (Emitente ou Destinatário).
 */
export function buildContactFromXmlParty(
  userId: string,
  kind: 'supplier' | 'customer',
  name: string,
  tradeName: string | undefined,
  rawDocument: string,
  address: NfeXmlAddress
): Contact {
  const cleanAlnum = cleanDocumentDigits(rawDocument);
  const digitsOnly = rawDocument.replace(/\D/g, '');
  const personType = digitsOnly.length === 11 && cleanAlnum.length === 11 ? 'PF' : 'PJ';
  const formattedDoc =
    personType === 'PF'
      ? maskCPF(digitsOnly)
      : cleanAlnum.length === 14
        ? maskCNPJ(cleanAlnum)
        : rawDocument;
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
