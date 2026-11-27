/**
 * EN: Custom React Hook for the Evolved XML Import Center (Phase 11.1.2).
 *     Manages single & multi-XML batch state, strict two-agent fiscal detection,
 *     mandatory Category + Contact validation with smart category auto-suggestion,
 *     flexible installment builder (`+ Adicionar Parcela`, `2x/3x/4x/6x` exact split, remove row),
 *     inline installment editing, and real-time commercial adjustments.
 * PT: Hook React customizado para a Central de Importação de XML Evoluída (Etapa 11.1.2).
 *     Gerencia estado individual e Multi-XML, detecção fiscal estrita, obrigatoriedade de
 *     Categoria e Contato com auto-sugestão inteligente, parcelamento flexível (`+ Adicionar Parcela`,
 *     rateio exato `2x/3x/4x/6x` e exclusão de avulsas), edição inline e batimento comercial.
 */

import { useCallback, useMemo, useState } from 'react';
import type { Category, Company, Contact, Transaction, TransactionType } from '../types';
import { addDaysISO, addMonthsISO, cleanDocumentDigits, distributeCents, todayISO } from '../utils/format';
import {
  adaptXmlItemsForType,
  buildContactFromXmlParty,
  buildTransactionsFromXmlItems,
  detectXmlOperation,
  mapGenericXmlRows,
  NEGATIVE_ADJUSTMENT_REASONS,
  parseMultipleXmlFiles,
  POSITIVE_ADJUSTMENT_REASONS,
  type GenericXmlMapping,
  type NfeXmlAddress,
  type ParsedXmlPreviewItem,
  type XmlAdjustmentType,
  type XmlAnalysisResult,
  type XmlOperationDetection,
} from '../utils/xmlParser';

export interface UseXmlImportProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  companies?: Company[];
  selectedCompanyId?: string | 'all';
  existingTransactions: Transaction[];
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
  onClose: () => void;
}

export interface XmlInvoiceEntry {
  id: string;
  fileName: string;
  analysis: XmlAnalysisResult | null;
  error: string | null;
  detection: XmlOperationDetection | null;
  txType: TransactionType;
  companyId: string;
  categoryId: string;
  contactId: string;
  editedItems: ParsedXmlPreviewItem[];
  excludedIds: Set<string>;
  mapping: GenericXmlMapping;
  adjustmentReason: string;
  adjustmentNotes: string;
  selectedForBatch: boolean;
}

export interface ComputedInvoiceSummary {
  entry: XmlInvoiceEntry;
  previewItems: ParsedXmlPreviewItem[];
  selectedItems: ParsedXmlPreviewItem[];
  duplicateIds: Set<string>;
  invoiceTotalCents: number;
  installmentsTotalCents: number;
  divergenceCents: number;
  adjustmentType: XmlAdjustmentType;
  resolvedReasonLabel: string;
  isBlockedByFiscalLock: boolean;
  isMissingMandatoryFields: boolean;
}

const normalizeText = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const DEFAULT_POSITIVE_REASON = POSITIVE_ADJUSTMENT_REASONS[0].value;
const DEFAULT_NEGATIVE_REASON = NEGATIVE_ADJUSTMENT_REASONS[0].value;

/**
 * EN: Auto-suggests the most suitable Category for `txType` (e.g. "Fornecedores" / "Peças" / "Compras"
 *     for payable; "Vendas" / "Serviços" / "Receitas" for receivable), falling back to the first compatible category.
 * PT: Pré-seleciona automaticamente a categoria mais adequada para o tipo de operação (ex: "Fornecedores" / "Peças"
 *     para Conta a Pagar; "Vendas de Produtos" / "Vendas" para Conta a Receber), ou a primeira compatível.
 */
export function suggestXmlCategoryId(categories: Category[], txType: TransactionType): string {
  const compatible = categories.filter((c) => c.type === 'both' || c.type === txType);
  if (compatible.length === 0) return '';

  const keywords =
    txType === 'payable'
      ? ['fornecedor', 'peca', 'compra', 'mercadoria', 'estoque', 'insumo', 'custo']
      : ['venda', 'produto', 'receita', 'faturamento', 'servico', 'cliente'];

  for (const kw of keywords) {
    const matched = compatible.find((c) => normalizeText(c.name).includes(kw));
    if (matched) return matched.id;
  }

  return compatible[0].id;
}

function buildDefaultGenericMapping(fields: string[]): GenericXmlMapping {
  const matchPattern = (patterns: string[]) =>
    fields.find((f) => patterns.some((p) => f.toLowerCase().includes(p))) || '';
  return {
    descriptionField: matchPattern(['desc', 'hist', 'nome', 'titulo']) || fields[0] || '',
    amountField: matchPattern(['valor', 'vdup', 'vnf', 'amount', 'total', 'preco']) || fields[0] || '',
    dueDateField: matchPattern(['venc', 'data', 'date', 'due']) || '',
    documentField: matchPattern(['doc', 'num', 'nf', 'boleto']) || '',
    contactField: matchPattern(['forn', 'emit', 'clien', 'raz']) || '',
  };
}

function getReasonLabel(type: XmlAdjustmentType, reasonValue: string): string {
  if (type === 'positive') {
    const found = POSITIVE_ADJUSTMENT_REASONS.find((r) => r.value === reasonValue);
    return found ? found.label : POSITIVE_ADJUSTMENT_REASONS[0].label;
  }
  if (type === 'negative') {
    const found = NEGATIVE_ADJUSTMENT_REASONS.find((r) => r.value === reasonValue);
    return found ? found.label : NEGATIVE_ADJUSTMENT_REASONS[0].label;
  }
  return '';
}

/**
 * EN: Re-indexes installment numbers, totals, shared group ID, and description `(i/N)` suffixes.
 * PT: Re-indexa numeração de parcelas, total, `installmentGroupId` compartilhado e sufixos `(i/N)`.
 */
function reindexXmlPreviewItems(
  items: ParsedXmlPreviewItem[],
  analysis: XmlAnalysisResult | null,
  txType: TransactionType
): ParsedXmlPreviewItem[] {
  const count = items.length;
  const groupId = count > 1 ? items[0]?.installmentGroupId || crypto.randomUUID() : null;

  return items.map((item, idx) => {
    const cleanBaseDesc = item.description.replace(/\s*\(\d+\/\d+\)$/, '').trim();
    const nextNumber = idx + 1;
    const baseItem: ParsedXmlPreviewItem = {
      ...item,
      installmentNumber: nextNumber,
      installmentTotal: count,
      installmentGroupId: groupId,
      description: count > 1 ? `${cleanBaseDesc} (${nextNumber}/${count})` : cleanBaseDesc,
    };

    if (analysis && analysis.kind !== 'generic') {
      return adaptXmlItemsForType(analysis, [baseItem], txType)[0];
    }
    return baseItem;
  });
}

export function useXmlImport({
  userId,
  categories,
  contacts,
  companies = [],
  selectedCompanyId = 'all',
  existingTransactions,
  onImport,
  onCreateContact,
  onClose,
}: UseXmlImportProps) {
  const [entries, setEntries] = useState<XmlInvoiceEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [creatingContact, setCreatingContact] = useState(false);

  const tryMatchContact = useCallback(
    (docNum: string, name: string, contactPool: Contact[] = contacts) => {
      const cleanDoc = cleanDocumentDigits(docNum);
      return contactPool.find((c) => {
        const candidateClean = cleanDocumentDigits(c.document);
        if (cleanDoc && cleanDoc.length >= 11 && candidateClean === cleanDoc) return true;
        return Boolean(name && normalizeText(c.name) === normalizeText(name));
      });
    },
    [contacts]
  );

  const createEntryFromParsed = useCallback(
    (
      id: string,
      fileName: string,
      analysis: XmlAnalysisResult | null,
      parseError: string | null
    ): XmlInvoiceEntry => {
      if (!analysis || parseError) {
        return {
          id,
          fileName,
          analysis: null,
          error: parseError || 'Erro ao interpretar arquivo XML.',
          detection: null,
          txType: 'payable',
          companyId: '',
          categoryId: '',
          contactId: '',
          editedItems: [],
          excludedIds: new Set(),
          mapping: {
            descriptionField: '',
            amountField: '',
            dueDateField: '',
            documentField: '',
            contactField: '',
          },
          adjustmentReason: DEFAULT_POSITIVE_REASON,
          adjustmentNotes: '',
          selectedForBatch: false,
        };
      }

      const detection = detectXmlOperation(analysis, companies, selectedCompanyId);

      if (analysis.kind === 'generic') {
        const mapping = buildDefaultGenericMapping(analysis.fields);
        const mappedItems = mapGenericXmlRows(analysis.rows, mapping);
        const defaultCat = suggestXmlCategoryId(categories, 'payable');
        return {
          id,
          fileName,
          analysis,
          error: null,
          detection,
          txType: 'payable',
          companyId: detection.companyId,
          categoryId: defaultCat,
          contactId: '',
          editedItems: mappedItems,
          excludedIds: new Set(),
          mapping,
          adjustmentReason: DEFAULT_POSITIVE_REASON,
          adjustmentNotes: '',
          selectedForBatch: mappedItems.length > 0,
        };
      }

      const txType = detection.txType;
      const adaptedItems = adaptXmlItemsForType(analysis, analysis.items, txType);
      const matchedContact = tryMatchContact(
        detection.counterpartyDocument,
        detection.counterpartyName
      );
      const suggestedCatId = suggestXmlCategoryId(categories, txType);

      const sumItems = adaptedItems.reduce((s, it) => s + it.amountCents, 0);
      const diff = Math.round(sumItems - analysis.invoiceTotalCents);

      return {
        id,
        fileName,
        analysis,
        error: null,
        detection,
        txType,
        companyId: detection.companyId,
        categoryId: suggestedCatId,
        contactId: matchedContact ? matchedContact.id : '',
        editedItems: adaptedItems,
        excludedIds: new Set(),
        mapping: {
          descriptionField: '',
          amountField: '',
          dueDateField: '',
          documentField: '',
          contactField: '',
        },
        adjustmentReason: diff < 0 ? DEFAULT_NEGATIVE_REASON : DEFAULT_POSITIVE_REASON,
        adjustmentNotes: '',
        selectedForBatch: true,
      };
    },
    [companies, selectedCompanyId, categories, tryMatchContact]
  );

  const handleFilesSelected = useCallback(
    async (files: File[], append = false) => {
      if (!files || files.length === 0) return;
      setGlobalError(null);

      const results = await parseMultipleXmlFiles(files);
      const builtEntries = results.map((r) =>
        createEntryFromParsed(r.id, r.fileName, r.analysis, r.error)
      );

      setEntries((prev) => {
        const combined = append ? [...prev, ...builtEntries] : builtEntries;
        const firstValid = combined.find((e) => !e.error) || combined[0] || null;
        setActiveEntryId(firstValid ? firstValid.id : null);
        setViewMode(combined.length > 1 ? 'batch' : 'single');

        if (combined.length === 1 && combined[0].error) {
          setGlobalError(combined[0].error);
        }
        return combined;
      });
    },
    [createEntryFromParsed]
  );

  const handleFileChange = useCallback(
    (file: File) => {
      void handleFilesSelected([file], false);
    },
    [handleFilesSelected]
  );

  const handleClearFiles = useCallback(() => {
    setEntries([]);
    setActiveEntryId(null);
    setViewMode('single');
    setGlobalError(null);
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== entryId);
      if (next.length === 0) {
        setActiveEntryId(null);
        setViewMode('single');
      } else {
        if (next.length === 1) {
          setViewMode('single');
        }
        setActiveEntryId((curr) => (curr === entryId ? next[0].id : curr));
      }
      return next;
    });
  }, []);

  const toggleBatchEntrySelection = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, selectedForBatch: !e.selectedForBatch } : e))
    );
  }, []);

  const updateActiveEntry = useCallback(
    (updater: (entry: XmlInvoiceEntry) => XmlInvoiceEntry) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== activeEntryId) return entry;
          return updater(entry);
        })
      );
    },
    [activeEntryId]
  );

  const activeEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.find((e) => e.id === activeEntryId) || entries[0];
  }, [entries, activeEntryId]);

  const computeEntrySummary = useCallback(
    (entry: XmlInvoiceEntry): ComputedInvoiceSummary => {
      const previewItems = entry.editedItems;
      const selectedItems = previewItems.filter((item) => !entry.excludedIds.has(item.tempId));

      const duplicateIds = new Set<string>();
      for (const item of previewItems) {
        const itemDoc = normalizeText(item.documentNumber);
        const itemDesc = normalizeText(item.description);
        const found = existingTransactions.some((ex) => {
          if (ex.amountCents !== item.amountCents || ex.dueDate !== item.dueDate) return false;
          if (itemDoc && ex.documentNumber && normalizeText(ex.documentNumber) === itemDoc) return true;
          return normalizeText(ex.description) === itemDesc;
        });
        if (found) duplicateIds.add(item.tempId);
      }

      const installmentsTotalCents = Math.round(
        selectedItems.reduce((sum, item) => sum + Math.round(item.amountCents), 0)
      );

      const invoiceTotalCents =
        entry.analysis && entry.analysis.kind !== 'generic'
          ? Math.round(entry.analysis.invoiceTotalCents)
          : installmentsTotalCents;

      const divergenceCents = Math.round(installmentsTotalCents - invoiceTotalCents);
      const adjustmentType: XmlAdjustmentType =
        divergenceCents === 0 ? 'exact' : divergenceCents > 0 ? 'positive' : 'negative';

      const resolvedReasonLabel = getReasonLabel(adjustmentType, entry.adjustmentReason);

      const isBlockedByFiscalLock = Boolean(
        entry.analysis &&
          entry.analysis.kind !== 'generic' &&
          (!entry.detection || entry.detection.matchedRole === 'none' || !entry.companyId)
      );

      // Mandatory Category & Contact validation (Phase 11.1.2)
      const isMissingMandatoryFields = Boolean(!entry.categoryId || !entry.contactId);

      return {
        entry,
        previewItems,
        selectedItems,
        duplicateIds,
        invoiceTotalCents,
        installmentsTotalCents,
        divergenceCents,
        adjustmentType,
        resolvedReasonLabel,
        isBlockedByFiscalLock,
        isMissingMandatoryFields,
      };
    },
    [existingTransactions]
  );

  const entrySummaries = useMemo(
    () => entries.map((e) => computeEntrySummary(e)),
    [entries, computeEntrySummary]
  );

  const activeSummary = useMemo(() => {
    if (!activeEntry) return null;
    return entrySummaries.find((s) => s.entry.id === activeEntry.id) || computeEntrySummary(activeEntry);
  }, [activeEntry, entrySummaries, computeEntrySummary]);

  const handleTypeChange = useCallback(
    (newType: TransactionType) => {
      updateActiveEntry((entry) => {
        const currentCatObj = categories.find((c) => c.id === entry.categoryId);
        const isCurrentCatValid = Boolean(
          currentCatObj && (currentCatObj.type === 'both' || currentCatObj.type === newType)
        );
        const nextCatId = isCurrentCatValid
          ? entry.categoryId
          : suggestXmlCategoryId(categories, newType);

        if (!entry.analysis || entry.analysis.kind === 'generic') {
          return { ...entry, txType: newType, categoryId: nextCatId };
        }
        const docToMatch =
          newType === 'receivable'
            ? entry.analysis.customerDocument
            : entry.analysis.kind === 'nfe'
              ? entry.analysis.supplierDocument
              : entry.analysis.providerDocument;
        const nameToMatch =
          newType === 'receivable'
            ? entry.analysis.customerName
            : entry.analysis.kind === 'nfe'
              ? entry.analysis.supplierName
              : entry.analysis.providerName;
        const matched = tryMatchContact(docToMatch, nameToMatch);
        const adapted = adaptXmlItemsForType(entry.analysis, entry.editedItems, newType);
        return {
          ...entry,
          txType: newType,
          categoryId: nextCatId,
          contactId: matched ? matched.id : '',
          editedItems: adapted,
        };
      });
    },
    [updateActiveEntry, categories, tryMatchContact]
  );

  const setCompanyId = useCallback(
    (newCompanyId: string) => {
      updateActiveEntry((entry) => ({ ...entry, companyId: newCompanyId }));
    },
    [updateActiveEntry]
  );

  const setCategoryId = useCallback(
    (newCategoryId: string) => {
      setGlobalError(null);
      updateActiveEntry((entry) => ({ ...entry, categoryId: newCategoryId }));
    },
    [updateActiveEntry]
  );

  const setContactId = useCallback(
    (newContactId: string) => {
      setGlobalError(null);
      updateActiveEntry((entry) => ({ ...entry, contactId: newContactId }));
    },
    [updateActiveEntry]
  );

  const setMapping = useCallback(
    (newMapping: GenericXmlMapping) => {
      updateActiveEntry((entry) => {
        if (!entry.analysis || entry.analysis.kind !== 'generic') {
          return { ...entry, mapping: newMapping };
        }
        const remapped = mapGenericXmlRows(entry.analysis.rows, newMapping);
        return {
          ...entry,
          mapping: newMapping,
          editedItems: remapped,
          excludedIds: new Set(),
        };
      });
    },
    [updateActiveEntry]
  );

  const setExcludedIds = useCallback(
    (nextExcluded: Set<string>) => {
      updateActiveEntry((entry) => ({ ...entry, excludedIds: new Set(nextExcluded) }));
    },
    [updateActiveEntry]
  );

  const toggleItem = useCallback(
    (tempId: string) => {
      updateActiveEntry((entry) => {
        const next = new Set(entry.excludedIds);
        if (next.has(tempId)) next.delete(tempId);
        else next.add(tempId);

        const nextSelected = entry.editedItems.filter((it) => !next.has(it.tempId));
        const sumCents = nextSelected.reduce((s, it) => s + it.amountCents, 0);
        const invCents =
          entry.analysis && entry.analysis.kind !== 'generic'
            ? entry.analysis.invoiceTotalCents
            : sumCents;
        const diff = Math.round(sumCents - invCents);
        let nextReason = entry.adjustmentReason;
        if (diff > 0 && !POSITIVE_ADJUSTMENT_REASONS.some((r) => r.value === nextReason)) {
          nextReason = DEFAULT_POSITIVE_REASON;
        } else if (diff < 0 && !NEGATIVE_ADJUSTMENT_REASONS.some((r) => r.value === nextReason)) {
          nextReason = DEFAULT_NEGATIVE_REASON;
        }

        return { ...entry, excludedIds: next, adjustmentReason: nextReason };
      });
    },
    [updateActiveEntry]
  );

  const updateInstallmentItem = useCallback(
    (tempId: string, patch: Partial<Pick<ParsedXmlPreviewItem, 'dueDate' | 'amountCents' | 'description'>>) => {
      updateActiveEntry((entry) => {
        const nextItems = entry.editedItems.map((item) => {
          if (item.tempId !== tempId) return item;
          return {
            ...item,
            ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
            ...(patch.amountCents !== undefined
              ? { amountCents: Math.max(0, Math.round(patch.amountCents)) }
              : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
          };
        });

        const nextSelected = nextItems.filter((it) => !entry.excludedIds.has(it.tempId));
        const sumCents = nextSelected.reduce((s, it) => s + it.amountCents, 0);
        const invCents =
          entry.analysis && entry.analysis.kind !== 'generic'
            ? entry.analysis.invoiceTotalCents
            : sumCents;
        const diff = Math.round(sumCents - invCents);

        let nextReason = entry.adjustmentReason;
        if (diff > 0 && !POSITIVE_ADJUSTMENT_REASONS.some((r) => r.value === nextReason)) {
          nextReason = DEFAULT_POSITIVE_REASON;
        } else if (diff < 0 && !NEGATIVE_ADJUSTMENT_REASONS.some((r) => r.value === nextReason)) {
          nextReason = DEFAULT_NEGATIVE_REASON;
        }

        return {
          ...entry,
          editedItems: nextItems,
          adjustmentReason: nextReason,
        };
      });
    },
    [updateActiveEntry]
  );

  /**
   * EN: Adds a new manual installment row (`[ + Adicionar Parcela ]`) carrying the remaining
   *     balance needed to close the NF total (or equal fallback) and due date `+30 days` from the last row.
   * PT: Adiciona uma nova parcela (`[ + Adicionar Parcela ]`) preenchida automaticamente com o saldo
   *     restante que falta para fechar a NF e vencimento para `+30 dias` da última parcela.
   */
  const handleAddInstallment = useCallback(() => {
    updateActiveEntry((entry) => {
      const currentSelected = entry.editedItems.filter((it) => !entry.excludedIds.has(it.tempId));
      const sumSelectedCents = currentSelected.reduce((s, it) => s + Math.round(it.amountCents), 0);
      const targetInvoiceCents =
        entry.analysis && entry.analysis.kind !== 'generic'
          ? Math.round(entry.analysis.invoiceTotalCents)
          : sumSelectedCents;

      const remainingCents = Math.round(targetInvoiceCents - sumSelectedCents);
      const newAmountCents =
        remainingCents > 0
          ? remainingCents
          : Math.max(100, entry.editedItems[entry.editedItems.length - 1]?.amountCents || 100);

      const lastItem = entry.editedItems[entry.editedItems.length - 1];
      const baseDueDate = lastItem?.dueDate || todayISO();
      const nextDueDate = addDaysISO(baseDueDate, 30);

      const nNF =
        entry.analysis && entry.analysis.kind !== 'generic' ? entry.analysis.invoiceNumber : '';
      const nextIndex = entry.editedItems.length + 1;
      const docPrefix =
        entry.analysis?.kind === 'nfe'
          ? nNF
            ? `NFe-${nNF} / Dup ${String(nextIndex).padStart(3, '0')}`
            : `Dup ${String(nextIndex).padStart(3, '0')}`
          : entry.analysis?.kind === 'nfse'
            ? nNF
              ? `NFSe-${nNF} / Parc ${nextIndex}`
              : `Parc ${nextIndex}`
            : lastItem?.documentNumber || '';

      const newItem: ParsedXmlPreviewItem = {
        tempId: crypto.randomUUID(),
        description: lastItem?.description || 'Parcela XML',
        amountCents: newAmountCents,
        dueDate: nextDueDate,
        issueDate: lastItem?.issueDate || todayISO(),
        documentNumber: docPrefix,
        supplierName: lastItem?.supplierName || '',
        supplierDocument: lastItem?.supplierDocument || '',
        customerName: lastItem?.customerName,
        customerDocument: lastItem?.customerDocument,
        installmentNumber: nextIndex,
        installmentTotal: nextIndex,
        installmentGroupId: lastItem?.installmentGroupId || crypto.randomUUID(),
        isManualAdded: true,
      };

      const reindexed = reindexXmlPreviewItems(
        [...entry.editedItems, newItem],
        entry.analysis,
        entry.txType
      );

      return {
        ...entry,
        editedItems: reindexed,
      };
    });
  }, [updateActiveEntry]);

  /**
   * EN: Splits the total NF value into `count` equal installments (`2x | 3x | 4x | 6x`) in 1 click
   *     using exact integer cent math (`distributeCents`), placing any cent remainder on the 1st row.
   * PT: Divide o valor total da NF em `count` parcelas iguais (`2x | 3x | 4x | 6x`) com 1 clique
   *     via matemática inteira de centavos (`distributeCents`), alocando sobras na 1ª parcela.
   */
  const handleSplitInstallments = useCallback(
    (count: number) => {
      const safeCount = Math.max(1, Math.min(60, Math.floor(count)));
      updateActiveEntry((entry) => {
        const firstRef = entry.editedItems[0];
        const currentSum = entry.editedItems.reduce((s, it) => s + Math.round(it.amountCents), 0);
        const totalToSplit =
          entry.analysis && entry.analysis.kind !== 'generic' && entry.analysis.invoiceTotalCents > 0
            ? Math.round(entry.analysis.invoiceTotalCents)
            : Math.max(safeCount, currentSum);

        const centsShares = distributeCents(totalToSplit, safeCount);
        const firstDueDate = firstRef?.dueDate || todayISO();
        const issueDate = firstRef?.issueDate || firstDueDate;
        const groupId = safeCount > 1 ? crypto.randomUUID() : null;
        const nNF =
          entry.analysis && entry.analysis.kind !== 'generic' ? entry.analysis.invoiceNumber : '';

        const generated: ParsedXmlPreviewItem[] = centsShares.map((cents, idx) => {
          const num = idx + 1;
          const docStr =
            entry.analysis?.kind === 'nfe'
              ? nNF
                ? `NFe-${nNF} / Dup ${String(num).padStart(3, '0')}`
                : `Dup ${String(num).padStart(3, '0')}`
              : entry.analysis?.kind === 'nfse'
                ? nNF
                  ? `NFSe-${nNF}${safeCount > 1 ? ` / Parc ${num}` : ''}`
                  : 'NFSe'
                : firstRef?.documentNumber || '';

          return {
            tempId: crypto.randomUUID(),
            description: firstRef?.description || 'Parcela XML',
            amountCents: cents,
            dueDate: idx === 0 ? firstDueDate : addMonthsISO(firstDueDate, idx),
            issueDate,
            documentNumber: docStr,
            supplierName: firstRef?.supplierName || '',
            supplierDocument: firstRef?.supplierDocument || '',
            customerName: firstRef?.customerName,
            customerDocument: firstRef?.customerDocument,
            installmentNumber: num,
            installmentTotal: safeCount,
            installmentGroupId: groupId,
            isManualAdded: idx > 0,
          };
        });

        const reindexed = reindexXmlPreviewItems(generated, entry.analysis, entry.txType);
        return {
          ...entry,
          editedItems: reindexed,
          excludedIds: new Set(),
        };
      });
    },
    [updateActiveEntry]
  );

  /**
   * EN: Removes a manually added installment row (`[ ✕ ]`) and re-indexes remaining installments.
   * PT: Remove uma parcela avulsa adicionada manualmente (`[ ✕ ]`) e renumera as restantes.
   */
  const handleRemoveInstallment = useCallback(
    (tempId: string) => {
      updateActiveEntry((entry) => {
        if (entry.editedItems.length <= 1) return entry;
        const filtered = entry.editedItems.filter((it) => it.tempId !== tempId);
        const nextExcluded = new Set(entry.excludedIds);
        nextExcluded.delete(tempId);
        const reindexed = reindexXmlPreviewItems(filtered, entry.analysis, entry.txType);
        return {
          ...entry,
          editedItems: reindexed,
          excludedIds: nextExcluded,
        };
      });
    },
    [updateActiveEntry]
  );

  const setAdjustmentReason = useCallback(
    (reason: string) => {
      updateActiveEntry((entry) => ({ ...entry, adjustmentReason: reason }));
    },
    [updateActiveEntry]
  );

  const setAdjustmentNotes = useCallback(
    (notes: string) => {
      updateActiveEntry((entry) => ({ ...entry, adjustmentNotes: notes }));
    },
    [updateActiveEntry]
  );

  const activeContact = useMemo(() => {
    const analysis = activeEntry?.analysis;
    if (!analysis || analysis.kind === 'generic') return null;
    const isRec = activeEntry.txType === 'receivable';
    if (analysis.kind === 'nfe') {
      return {
        title: isRec
          ? 'Cliente identificado (Destinatário NF-e)'
          : 'Fornecedor identificado (Emitente NF-e)',
        name: isRec ? analysis.customerName : analysis.supplierName,
        tradeName: isRec ? analysis.customerTradeName : analysis.supplierTradeName,
        document: isRec ? analysis.customerDocument : analysis.supplierDocument,
        address: (isRec ? analysis.customerAddress : analysis.supplierAddress) as NfeXmlAddress,
      };
    }
    return {
      title: isRec
        ? 'Cliente identificado (Tomador NFS-e)'
        : 'Prestador identificado (Prestador NFS-e)',
      name: isRec ? analysis.customerName : analysis.providerName,
      tradeName: '',
      document: isRec ? analysis.customerDocument : analysis.providerDocument,
      address: (isRec ? analysis.customerAddress : analysis.providerAddress) as NfeXmlAddress,
    };
  }, [activeEntry]);

  const handleAutoCreateContact = useCallback(async () => {
    if (!activeContact || !activeEntry) return;
    setGlobalError(null);
    setCreatingContact(true);
    try {
      const newContact = buildContactFromXmlParty(
        userId,
        activeEntry.txType === 'payable' ? 'supplier' : 'customer',
        activeContact.name,
        activeContact.tradeName,
        activeContact.document,
        activeContact.address
      );
      await onCreateContact(newContact);

      const createdDocClean = cleanDocumentDigits(newContact.document);
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === activeEntry.id) {
            return { ...entry, contactId: newContact.id };
          }
          if (!entry.contactId && entry.analysis && entry.analysis.kind !== 'generic') {
            const targetDoc =
              entry.txType === 'receivable'
                ? entry.analysis.customerDocument
                : entry.analysis.kind === 'nfe'
                  ? entry.analysis.supplierDocument
                  : entry.analysis.providerDocument;
            if (createdDocClean && cleanDocumentDigits(targetDoc) === createdDocClean) {
              return { ...entry, contactId: newContact.id };
            }
          }
          return entry;
        })
      );
    } finally {
      setCreatingContact(false);
    }
  }, [activeContact, activeEntry, userId, onCreateContact]);

  const handleCustomContactSaved = useCallback(
    async (newContact: Contact) => {
      setGlobalError(null);
      await onCreateContact(newContact);
      const createdDocClean = cleanDocumentDigits(newContact.document);
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === activeEntryId) {
            return { ...entry, contactId: newContact.id };
          }
          if (!entry.contactId && entry.analysis && entry.analysis.kind !== 'generic') {
            const targetDoc =
              entry.txType === 'receivable'
                ? entry.analysis.customerDocument
                : entry.analysis.kind === 'nfe'
                  ? entry.analysis.supplierDocument
                  : entry.analysis.providerDocument;
            if (createdDocClean && cleanDocumentDigits(targetDoc) === createdDocClean) {
              return { ...entry, contactId: newContact.id };
            }
          }
          return entry;
        })
      );
    },
    [onCreateContact, activeEntryId]
  );

  const buildTransactionsForSummary = useCallback(
    (summary: ComputedInvoiceSummary): Transaction[] => {
      const { entry, selectedItems, divergenceCents, adjustmentType, resolvedReasonLabel } = summary;
      const validItems = selectedItems.filter((it) => it.amountCents > 0);
      if (validItems.length === 0) return [];

      return buildTransactionsFromXmlItems(
        validItems,
        userId,
        entry.txType,
        entry.categoryId || null,
        entry.contactId || null,
        {
          companyId: entry.companyId || null,
          adjustment:
            adjustmentType === 'exact'
              ? null
              : {
                  divergenceCents,
                  adjustmentType,
                  reasonLabel: resolvedReasonLabel,
                  notes: entry.adjustmentNotes,
                },
        }
      );
    },
    [userId]
  );

  const handleConfirmImport = useCallback(() => {
    if (!activeSummary) return;
    if (activeSummary.isBlockedByFiscalLock) {
      setGlobalError(
        'Trava de Segurança Fiscal: Nem o Emitente nem o Destinatário correspondem a uma empresa sua cadastrada.'
      );
      return;
    }
    if (activeSummary.isMissingMandatoryFields) {
      setGlobalError('Selecione a Categoria padrão e o Contato antes de importar.');
      return;
    }
    const validSelected = activeSummary.selectedItems.filter((it) => it.amountCents > 0);
    if (validSelected.length === 0) {
      setGlobalError('Selecione pelo menos 1 parcela com valor maior que zero para importar.');
      return;
    }

    const txs = buildTransactionsForSummary(activeSummary);
    onImport(txs);
    onClose();
  }, [activeSummary, buildTransactionsForSummary, onImport, onClose]);

  const handleConfirmBatchImport = useCallback(() => {
    const candidateSummaries = entrySummaries.filter(
      (s) =>
        !s.entry.error &&
        !s.isBlockedByFiscalLock &&
        s.entry.selectedForBatch &&
        s.selectedItems.some((it) => it.amountCents > 0)
    );

    if (candidateSummaries.length === 0) {
      setGlobalError('Nenhuma nota fiscal válida vinculada a uma empresa sua para importar.');
      return;
    }

    const missingFieldsSummary = candidateSummaries.find((s) => s.isMissingMandatoryFields);
    if (missingFieldsSummary) {
      setActiveEntryId(missingFieldsSummary.entry.id);
      setViewMode('single');
      setGlobalError(
        `A nota "${missingFieldsSummary.entry.fileName}" exige Categoria padrão e Contato vinculados antes de importar.`
      );
      return;
    }

    const allTransactions = candidateSummaries.flatMap((s) => buildTransactionsForSummary(s));
    if (allTransactions.length === 0) {
      setGlobalError('Nenhuma parcela válida encontrada nas notas selecionadas.');
      return;
    }

    onImport(allTransactions);
    onClose();
  }, [entrySummaries, buildTransactionsForSummary, onImport, onClose]);

  const validBatchSummaries = useMemo(
    () =>
      entrySummaries.filter(
        (s) =>
          !s.entry.error &&
          !s.isBlockedByFiscalLock &&
          !s.isMissingMandatoryFields &&
          s.entry.selectedForBatch &&
          s.selectedItems.some((it) => it.amountCents > 0)
      ),
    [entrySummaries]
  );

  const hasBlockedBatchEntries = useMemo(
    () => entrySummaries.some((s) => !s.entry.error && s.entry.selectedForBatch && s.isBlockedByFiscalLock),
    [entrySummaries]
  );

  const batchTotalCents = useMemo(
    () => validBatchSummaries.reduce((acc, s) => acc + s.installmentsTotalCents, 0),
    [validBatchSummaries]
  );

  const batchTotalInstallments = useMemo(
    () => validBatchSummaries.reduce((acc, s) => acc + s.selectedItems.filter((i) => i.amountCents > 0).length, 0),
    [validBatchSummaries]
  );

  return {
    entries,
    entrySummaries,
    activeEntry,
    activeEntryId,
    setActiveEntryId,
    viewMode,
    setViewMode,
    validBatchSummaries,
    hasBlockedBatchEntries,
    batchTotalCents,
    batchTotalInstallments,
    handleFilesSelected,
    handleClearFiles,
    handleRemoveEntry,
    toggleBatchEntrySelection,
    handleConfirmBatchImport,

    fileName: activeEntry?.fileName || '',
    analysis: activeEntry?.analysis || null,
    detection: activeEntry?.detection || null,
    error: globalError || activeEntry?.error || null,
    txType: activeEntry?.txType || 'payable',
    companyId: activeEntry?.companyId || '',
    setCompanyId,
    categoryId: activeEntry?.categoryId || '',
    setCategoryId,
    contactId: activeEntry?.contactId || '',
    setContactId,
    excludedIds: activeEntry?.excludedIds || new Set<string>(),
    setExcludedIds,
    creatingContact,
    mapping: activeEntry?.mapping || {
      descriptionField: '',
      amountField: '',
      dueDateField: '',
      documentField: '',
      contactField: '',
    },
    setMapping,
    activeContact,
    previewItems: activeSummary?.previewItems || [],
    duplicateIds: activeSummary?.duplicateIds || new Set<string>(),
    selectedItems: activeSummary?.selectedItems || [],

    invoiceTotalCents: activeSummary?.invoiceTotalCents || 0,
    installmentsTotalCents: activeSummary?.installmentsTotalCents || 0,
    divergenceCents: activeSummary?.divergenceCents || 0,
    adjustmentType: activeSummary?.adjustmentType || ('exact' as XmlAdjustmentType),
    adjustmentReason: activeEntry?.adjustmentReason || DEFAULT_POSITIVE_REASON,
    setAdjustmentReason,
    adjustmentNotes: activeEntry?.adjustmentNotes || '',
    setAdjustmentNotes,
    isBlockedByFiscalLock: activeSummary?.isBlockedByFiscalLock || false,
    isMissingMandatoryFields: activeSummary?.isMissingMandatoryFields || false,

    handleFileChange,
    handleTypeChange,
    toggleItem,
    updateInstallmentItem,
    handleAddInstallment,
    handleSplitInstallments,
    handleRemoveInstallment,
    handleAutoCreateContact,
    handleCustomContactSaved,
    handleConfirmImport,
  };
}
