/**
 * EN: Custom React Hook for the Evolved XML Import Center (Phase 11.1).
 *     Manages single & multi-XML batch state, intelligent issuer/recipient company detection,
 *     inline installment editing (due date + cents), real-time reconciliation & commercial
 *     adjustments (+ additions / - deductions), and non-destructive contact registration.
 * PT: Hook React customizado para a Central de Importação de XML Evoluída (Fase 11.1).
 *     Gerencia estado individual e em lote (Multi-XML), detecção fiscal Emitente/Destinatário,
 *     edição inline de parcelas (vencimento + valor em centavos), batimento em tempo real com
 *     ajustes comerciais (+ acréscimos / - abatimentos) e cadastro de contato sem perder dados.
 */

import { useCallback, useMemo, useState } from 'react';
import type { Category, Company, Contact, Transaction, TransactionType } from '../types';
import { cleanDocumentDigits } from '../utils/format';
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

/**
 * EN: Complete state for a single loaded XML invoice inside the batch queue.
 * PT: Estado individual completo de uma nota XML carregada na fila de importação.
 */
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
  requiresCompanyAttention: boolean;
}

const normalizeText = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

const DEFAULT_POSITIVE_REASON = POSITIVE_ADJUSTMENT_REASONS[0].value;
const DEFAULT_NEGATIVE_REASON = NEGATIVE_ADJUSTMENT_REASONS[0].value;

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

export function useXmlImport({
  userId,
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

  // EN: Matches a contact by cleaned CPF/CNPJ first, falling back to normalized name.
  // PT: Localiza um contato primeiro pelo CPF/CNPJ limpo e, em seguida, pelo nome normalizado.
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

  // EN: Creates an `XmlInvoiceEntry` from a parsed file with automatic fiscal detection.
  // PT: Cria um `XmlInvoiceEntry` a partir de um arquivo processado com detecção fiscal automática.
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
        return {
          id,
          fileName,
          analysis,
          error: null,
          detection,
          txType: 'payable',
          companyId: detection.companyId,
          categoryId: '',
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
        categoryId: '',
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
    [companies, selectedCompanyId, tryMatchContact]
  );

  /**
   * EN: Handles multiple XML files dropped or selected at once (`multiple`).
   *     When `append` is true, adds new files to the existing batch; otherwise replaces.
   * PT: Processa um ou múltiplos arquivos XML enviados (`multiple`).
   *     Quando `append` for verdadeiro, adiciona ao lote atual; caso contrário, substitui.
   */
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

  // Backwards-compatible single file handler / Handler compatível para arquivo único
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

  // Helper to mutate the currently active entry / Helper para atualizar a nota ativa
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

  // Compute summary metrics for every entry (used both in single view and batch table)
  // Calcula o resumo reativo de cada nota (usado tanto na visão individual quanto no lote)
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

      const activeCompanies = companies.filter((c) => c.status === 'active');
      const hasRegisteredCompanies = (activeCompanies.length || companies.length) > 0;
      const requiresCompanyAttention = Boolean(
        entry.detection?.matchedRole === 'none' && hasRegisteredCompanies && !entry.companyId
      );

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
        requiresCompanyAttention,
      };
    },
    [existingTransactions, companies]
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
        if (!entry.analysis || entry.analysis.kind === 'generic') {
          return { ...entry, txType: newType };
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
          contactId: matched ? matched.id : '',
          editedItems: adapted,
        };
      });
    },
    [updateActiveEntry, tryMatchContact]
  );

  const setCompanyId = useCallback(
    (newCompanyId: string) => {
      updateActiveEntry((entry) => ({ ...entry, companyId: newCompanyId }));
    },
    [updateActiveEntry]
  );

  const setCategoryId = useCallback(
    (newCategoryId: string) => {
      updateActiveEntry((entry) => ({ ...entry, categoryId: newCategoryId }));
    },
    [updateActiveEntry]
  );

  const setContactId = useCallback(
    (newContactId: string) => {
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

        // Keep adjustmentReason aligned if sign flips
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

  /**
   * EN: Inline editing handler for an installment's due date (`YYYY-MM-DD`) or value (`amountCents`).
   * PT: Handler de edição inline para alterar o vencimento (`YYYY-MM-DD`) ou o valor (`amountCents`) da parcela.
   */
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

  // Active counterparty details based on current txType / Dados do fornecedor ou cliente ativo
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

  // Quick one-click auto contact creation / Criação automática com 1 clique
  const handleAutoCreateContact = useCallback(async () => {
    if (!activeContact || !activeEntry) return;
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

      // Link this newly created contact to all loaded entries sharing the same document
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

  // Callback after saving a contact from the full ContactDrawer modal without losing XML state
  // Callback após gravar um contato no modal/gaveta completo sem fechar nem perder a nota importada
  const handleCustomContactSaved = useCallback(
    async (newContact: Contact) => {
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

  // Build transactions for a single ComputedInvoiceSummary
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

  // Confirm import of the currently inspected single XML / Confirmar importação da nota individual
  const handleConfirmImport = useCallback(() => {
    if (!activeSummary) return;
    const validSelected = activeSummary.selectedItems.filter((it) => it.amountCents > 0);
    if (validSelected.length === 0) {
      setGlobalError('Selecione pelo menos 1 parcela com valor maior que zero para importar.');
      return;
    }
    if (activeSummary.requiresCompanyAttention) {
      setGlobalError('Por segurança fiscal, selecione a qual empresa pertence este lançamento antes de importar.');
      return;
    }

    const txs = buildTransactionsForSummary(activeSummary);
    onImport(txs);
    onClose();
  }, [activeSummary, buildTransactionsForSummary, onImport, onClose]);

  // Confirm batch import of all selected valid XMLs / Confirmar importação em massa de todas as notas
  const handleConfirmBatchImport = useCallback(() => {
    const selectedSummaries = entrySummaries.filter(
      (s) => !s.entry.error && s.entry.selectedForBatch && s.selectedItems.some((it) => it.amountCents > 0)
    );

    if (selectedSummaries.length === 0) {
      setGlobalError('Selecione pelo menos 1 nota fiscal válida para importar em lote.');
      return;
    }

    const missingCompany = selectedSummaries.find((s) => s.requiresCompanyAttention);
    if (missingCompany) {
      setActiveEntryId(missingCompany.entry.id);
      setViewMode('single');
      setGlobalError(
        `A nota "${missingCompany.entry.fileName}" não possui CNPJ vinculado. Escolha a empresa antes de concluir.`
      );
      return;
    }

    const allTransactions = selectedSummaries.flatMap((s) => buildTransactionsForSummary(s));
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
        (s) => !s.entry.error && s.entry.selectedForBatch && s.selectedItems.some((it) => it.amountCents > 0)
      ),
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
    // Multi-XML / Batch state
    entries,
    entrySummaries,
    activeEntry,
    activeEntryId,
    setActiveEntryId,
    viewMode,
    setViewMode,
    validBatchSummaries,
    batchTotalCents,
    batchTotalInstallments,
    handleFilesSelected,
    handleClearFiles,
    handleRemoveEntry,
    toggleBatchEntrySelection,
    handleConfirmBatchImport,

    // Single active invoice state (backwards-compatible + enhanced)
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

    // Reconciliation & Commercial Adjustments
    invoiceTotalCents: activeSummary?.invoiceTotalCents || 0,
    installmentsTotalCents: activeSummary?.installmentsTotalCents || 0,
    divergenceCents: activeSummary?.divergenceCents || 0,
    adjustmentType: activeSummary?.adjustmentType || ('exact' as XmlAdjustmentType),
    adjustmentReason: activeEntry?.adjustmentReason || DEFAULT_POSITIVE_REASON,
    setAdjustmentReason,
    adjustmentNotes: activeEntry?.adjustmentNotes || '',
    setAdjustmentNotes,
    requiresCompanyAttention: activeSummary?.requiresCompanyAttention || false,

    // Actions
    handleFileChange,
    handleTypeChange,
    toggleItem,
    updateInstallmentItem,
    handleAutoCreateContact,
    handleCustomContactSaved,
    handleConfirmImport,
  };
}
