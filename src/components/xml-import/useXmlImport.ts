import { useCallback, useMemo, useState } from 'react';
import type { Category, Contact, Transaction, TransactionType } from '../../types';
import {
  analyzeXmlDocument,
  buildContactFromXmlParty,
  buildTransactionsFromXmlItems,
  mapGenericXmlRows,
  type GenericXmlMapping,
  type ParsedXmlPreviewItem,
  type XmlAnalysisResult,
} from '../../utils/xmlParser';

interface UseXmlImportProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  existingTransactions: Transaction[];
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
  onClose: () => void;
}

const normalizeText = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

export function useXmlImport({
  userId,
  contacts,
  existingTransactions,
  onImport,
  onCreateContact,
  onClose,
}: UseXmlImportProps) {
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<XmlAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txType, setTxType] = useState<TransactionType>('payable');
  const [categoryId, setCategoryId] = useState('');
  const [contactId, setContactId] = useState('');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [creatingContact, setCreatingContact] = useState(false);
  const [mapping, setMapping] = useState<GenericXmlMapping>({
    descriptionField: '',
    amountField: '',
    dueDateField: '',
    documentField: '',
    contactField: '',
  });

  const tryMatchContact = useCallback(
    (docNum: string, name: string) => {
      const cleanDoc = docNum.replace(/\D/g, '');
      return contacts.find((c) => {
        if (cleanDoc && c.document.replace(/\D/g, '') === cleanDoc) return true;
        return Boolean(name && normalizeText(c.name) === normalizeText(name));
      });
    },
    [contacts]
  );

  const handleFileChange = (file: File) => {
    setError(null);
    setExcludedIds(new Set());
    setContactId('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const res = analyzeXmlDocument(text);
        setAnalysis(res);

        if (res.kind === 'generic') {
          const fields = res.fields;
          const matchPattern = (patterns: string[]) =>
            fields.find((f) => patterns.some((p) => f.toLowerCase().includes(p))) || '';
          setMapping({
            descriptionField: matchPattern(['desc', 'hist', 'nome', 'titulo']) || fields[0] || '',
            amountField: matchPattern(['valor', 'vdup', 'vnf', 'amount', 'total', 'preco']) || fields[0] || '',
            dueDateField: matchPattern(['venc', 'data', 'date', 'due']) || '',
            documentField: matchPattern(['doc', 'num', 'nf', 'boleto']) || '',
            contactField: matchPattern(['forn', 'emit', 'clien', 'raz']) || '',
          });
        } else {
          const initialType: TransactionType = res.kind === 'nfe' && res.tpNF === 1 ? 'receivable' : 'payable';
          setTxType(initialType);
          const docToMatch =
            initialType === 'receivable'
              ? res.customerDocument
              : res.kind === 'nfe'
                ? res.supplierDocument
                : res.providerDocument;
          const nameToMatch =
            initialType === 'receivable'
              ? res.customerName
              : res.kind === 'nfe'
                ? res.supplierName
                : res.providerName;
          const matched = tryMatchContact(docToMatch, nameToMatch);
          if (matched) setContactId(matched.id);
        }
      } catch (err) {
        setAnalysis(null);
        setError(err instanceof Error ? err.message : 'Erro ao interpretar arquivo XML.');
      }
    };
    reader.readAsText(file);
  };

  const handleTypeChange = (newType: TransactionType) => {
    setTxType(newType);
    if (!analysis || analysis.kind === 'generic') return;
    const docToMatch =
      newType === 'receivable'
        ? analysis.customerDocument
        : analysis.kind === 'nfe'
          ? analysis.supplierDocument
          : analysis.providerDocument;
    const nameToMatch =
      newType === 'receivable'
        ? analysis.customerName
        : analysis.kind === 'nfe'
          ? analysis.supplierName
          : analysis.providerName;
    const matched = tryMatchContact(docToMatch, nameToMatch);
    setContactId(matched ? matched.id : '');
  };

  const activeContact = useMemo(() => {
    if (!analysis || analysis.kind === 'generic') return null;
    const isRec = txType === 'receivable';
    if (analysis.kind === 'nfe') {
      return {
        title: isRec ? 'Cliente identificado (Destinatário NF-e)' : 'Fornecedor identificado (Emitente NF-e)',
        name: isRec ? analysis.customerName : analysis.supplierName,
        tradeName: isRec ? analysis.customerTradeName : analysis.supplierTradeName,
        document: isRec ? analysis.customerDocument : analysis.supplierDocument,
        address: isRec ? analysis.customerAddress : analysis.supplierAddress,
      };
    }
    return {
      title: isRec ? 'Cliente identificado (Tomador NFS-e)' : 'Prestador identificado (Prestador NFS-e)',
      name: isRec ? analysis.customerName : analysis.providerName,
      tradeName: '',
      document: isRec ? analysis.customerDocument : analysis.providerDocument,
      address: isRec ? analysis.customerAddress : analysis.providerAddress,
    };
  }, [analysis, txType]);

  const previewItems: ParsedXmlPreviewItem[] = useMemo(() => {
    if (!analysis) return [];
    return analysis.kind === 'generic' ? mapGenericXmlRows(analysis.rows, mapping) : analysis.items;
  }, [analysis, mapping]);

  const duplicateIds = useMemo(() => {
    const dups = new Set<string>();
    for (const item of previewItems) {
      const itemDoc = normalizeText(item.documentNumber);
      const itemDesc = normalizeText(item.description);
      const found = existingTransactions.some((ex) => {
        if (ex.amountCents !== item.amountCents || ex.dueDate !== item.dueDate) return false;
        if (itemDoc && ex.documentNumber && normalizeText(ex.documentNumber) === itemDoc) return true;
        return normalizeText(ex.description) === itemDesc;
      });
      if (found) dups.add(item.tempId);
    }
    return dups;
  }, [previewItems, existingTransactions]);

  const selectedItems = useMemo(
    () => previewItems.filter((item) => !excludedIds.has(item.tempId)),
    [previewItems, excludedIds]
  );

  const toggleItem = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAutoCreateContact = async () => {
    if (!activeContact) return;
    setCreatingContact(true);
    try {
      const newContact = buildContactFromXmlParty(
        userId,
        txType === 'payable' ? 'supplier' : 'customer',
        activeContact.name,
        activeContact.tradeName,
        activeContact.document,
        activeContact.address
      );
      await onCreateContact(newContact);
      setContactId(newContact.id);
    } finally {
      setCreatingContact(false);
    }
  };

  const handleConfirmImport = () => {
    if (selectedItems.length === 0) {
      setError('Selecione pelo menos 1 lançamento válido para importar.');
      return;
    }
    onImport(
      buildTransactionsFromXmlItems(
        selectedItems,
        userId,
        txType,
        categoryId || null,
        contactId || null
      )
    );
    onClose();
  };

  return {
    fileName,
    analysis,
    error,
    txType,
    categoryId,
    setCategoryId,
    contactId,
    setContactId,
    excludedIds,
    setExcludedIds,
    creatingContact,
    mapping,
    setMapping,
    activeContact,
    previewItems,
    duplicateIds,
    selectedItems,
    handleFileChange,
    handleTypeChange,
    toggleItem,
    handleAutoCreateContact,
    handleConfirmImport,
  };
}
