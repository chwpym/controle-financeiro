import React, { useMemo, useState } from 'react';
import { AlertTriangle, FileCode2, Upload, UserPlus, X } from 'lucide-react';
import type { Category, Contact, Transaction, TransactionType } from '../types';
import { formatBRL, formatDateBR, maskCEP, maskCNPJ, maskCPF } from '../utils/format';
import {
  analyzeXmlDocument,
  buildTransactionsFromXmlItems,
  mapGenericXmlRows,
  type GenericXmlMapping,
  type ParsedXmlPreviewItem,
  type XmlAnalysisResult,
} from '../utils/xmlParser';

interface XmlImportModalProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  existingTransactions: Transaction[];
  onClose: () => void;
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
}

const normalizeText = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

export const XmlImportModal: React.FC<XmlImportModalProps> = ({
  userId,
  categories,
  contacts,
  existingTransactions,
  onClose,
  onImport,
  onCreateContact,
}) => {
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<XmlAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [txType, setTxType] = useState<TransactionType>('payable');
  const [categoryId, setCategoryId] = useState('');
  const [contactId, setContactId] = useState('');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [creatingContact, setCreatingContact] = useState(false);

  // Generic mapping state
  const [mapping, setMapping] = useState<GenericXmlMapping>({
    descriptionField: '',
    amountField: '',
    dueDateField: '',
    documentField: '',
    contactField: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setExcludedIds(new Set());
    setContactId('');
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const res = analyzeXmlDocument(text);
        setAnalysis(res);

        if (res.kind === 'generic') {
          const fields = res.fields;
          const findMatch = (patterns: string[]) =>
            fields.find((f) => patterns.some((p) => f.toLowerCase().includes(p))) || '';

          setMapping({
            descriptionField: findMatch(['desc', 'hist', 'nome', 'titulo']) || fields[0] || '',
            amountField: findMatch(['valor', 'vdup', 'vnf', 'amount', 'total', 'preco']) || fields[0] || '',
            dueDateField: findMatch(['venc', 'data', 'date', 'due']) || '',
            documentField: findMatch(['doc', 'num', 'nf', 'boleto']) || '',
            contactField: findMatch(['forn', 'emit', 'clien', 'raz']) || '',
          });
        } else {
          // Try auto-matching contact by CNPJ/CPF or exact name
          const cleanDoc = res.supplierDocument.replace(/\D/g, '');
          const matched = contacts.find((c) => {
            if (cleanDoc && c.document.replace(/\D/g, '') === cleanDoc) return true;
            if (res.supplierName && normalizeText(c.name) === normalizeText(res.supplierName)) return true;
            return false;
          });
          if (matched) setContactId(matched.id);
        }
      } catch (err) {
        setAnalysis(null);
        setError(err instanceof Error ? err.message : 'Erro ao interpretar arquivo XML.');
      }
    };
    reader.readAsText(file);
  };

  const previewItems: ParsedXmlPreviewItem[] = useMemo(() => {
    if (!analysis) return [];
    if (analysis.kind === 'nfe') return analysis.items;
    return mapGenericXmlRows(analysis.rows, mapping);
  }, [analysis, mapping]);

  // Identify likely duplicates against existingTransactions
  const duplicateIds = useMemo(() => {
    const dups = new Set<string>();
    for (const item of previewItems) {
      const itemDoc = normalizeText(item.documentNumber);
      const itemDesc = normalizeText(item.description);
      const found = existingTransactions.some((ex) => {
        if (ex.amountCents !== item.amountCents || ex.dueDate !== item.dueDate) return false;
        if (itemDoc && ex.documentNumber && normalizeText(ex.documentNumber) === itemDoc) {
          return true;
        }
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

  const totalPreviewCents = useMemo(
    () => selectedItems.reduce((s, item) => s + item.amountCents, 0),
    [selectedItems]
  );

  const toggleItem = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uncheckDuplicates = () => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      for (const id of duplicateIds) next.add(id);
      return next;
    });
  };

  const genericSupplierCandidate = useMemo(() => {
    if (!analysis || analysis.kind !== 'generic') return '';
    const firstSupplier = previewItems.find((p) => p.supplierName.trim())?.supplierName.trim() || '';
    if (!firstSupplier) return '';
    const alreadyExists = contacts.some(
      (c) =>
        normalizeText(c.name) === normalizeText(firstSupplier) ||
        (c.tradeName && normalizeText(c.tradeName) === normalizeText(firstSupplier))
    );
    return alreadyExists ? '' : firstSupplier;
  }, [analysis, previewItems, contacts]);

  const handleAutoCreateNfeContact = async () => {
    if (!analysis || analysis.kind !== 'nfe') return;
    setCreatingContact(true);
    try {
      const digits = analysis.supplierDocument.replace(/\D/g, '');
      const personType = digits.length === 11 ? 'PF' : 'PJ';
      const formattedDoc =
        digits.length === 11
          ? maskCPF(digits)
          : digits.length === 14
            ? maskCNPJ(digits)
            : analysis.supplierDocument;

      const now = new Date().toISOString();
      const addr = analysis.supplierAddress;
      const newContact: Contact = {
        id: crypto.randomUUID(),
        userId,
        personType,
        kind: txType === 'payable' ? 'supplier' : 'customer',
        name: analysis.supplierName.trim() || 'Fornecedor NF-e',
        tradeName: analysis.supplierTradeName.trim(),
        document: formattedDoc,
        phone: '',
        email: '',
        cep: addr.cep ? maskCEP(addr.cep) : '',
        street: addr.street || '',
        number: addr.number || '',
        complement: addr.complement || '',
        neighborhood: addr.neighborhood || '',
        city: addr.city || '',
        state: (addr.state || '').toUpperCase().slice(0, 2),
        createdAt: now,
        updatedAt: now,
      };
      await onCreateContact(newContact);
      setContactId(newContact.id);
    } finally {
      setCreatingContact(false);
    }
  };

  const handleAutoCreateGenericContact = async () => {
    if (!genericSupplierCandidate) return;
    setCreatingContact(true);
    try {
      const digits = genericSupplierCandidate.replace(/\D/g, '');
      const personType = digits.length === 11 ? 'PF' : 'PJ';
      const now = new Date().toISOString();
      const newContact: Contact = {
        id: crypto.randomUUID(),
        userId,
        personType,
        kind: txType === 'payable' ? 'supplier' : 'customer',
        name: genericSupplierCandidate,
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
    const txs = buildTransactionsFromXmlItems(
      selectedItems,
      userId,
      txType,
      categoryId || null,
      contactId || null
    );
    onImport(txs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Importação de Pagamentos por XML
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importação XML"
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

          {/* Upload Zone */}
          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 py-6 text-center cursor-pointer hover:border-teal-600 transition-colors">
            <Upload className="w-6 h-6 text-teal-700 dark:text-teal-400" />
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique para selecionar um arquivo .XML'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suporta NF-e brasileira (com leitura automática de duplicatas/parcelas) e XML genérico
            </p>
            <input type="file" accept=".xml,text/xml,application/xml" onChange={handleFileChange} className="hidden" />
          </label>

          {analysis && (
            <>
              {analysis.kind === 'nfe' ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        NF-e reconhecida automaticamente
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                        Emitente: <strong>{analysis.supplierName}</strong>
                        {analysis.supplierDocument ? ` · Doc: ${analysis.supplierDocument}` : ''}
                        {analysis.invoiceNumber ? ` · NF ${analysis.invoiceNumber}` : ''}
                      </div>
                      {(analysis.supplierAddress.city || analysis.supplierAddress.street) && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Endereço XML: {[
                            analysis.supplierAddress.street,
                            analysis.supplierAddress.number,
                            analysis.supplierAddress.neighborhood,
                            analysis.supplierAddress.city && analysis.supplierAddress.state
                              ? `${analysis.supplierAddress.city}/${analysis.supplierAddress.state}`
                              : analysis.supplierAddress.city,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>

                    {!contactId && (
                      <button
                        type="button"
                        disabled={creatingContact}
                        onClick={handleAutoCreateNfeContact}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 min-h-[38px]"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {creatingContact ? 'Cadastrando...' : 'Cadastrar emitente e vincular'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Mapeamento de XML genérico (registro &lt;{analysis.recordTag}&gt;)
                    </div>
                    {!contactId && genericSupplierCandidate && (
                      <button
                        type="button"
                        disabled={creatingContact}
                        onClick={handleAutoCreateGenericContact}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Cadastrar "{genericSupplierCandidate}"
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Campo de Descrição
                      </label>
                      <select
                        value={mapping.descriptionField}
                        onChange={(e) => setMapping({ ...mapping, descriptionField: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                      >
                        <option value="">Padrão automático</option>
                        {analysis.fields.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Campo de Valor (R$) *
                      </label>
                      <select
                        value={mapping.amountField}
                        onChange={(e) => setMapping({ ...mapping, amountField: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                      >
                        <option value="">Selecione...</option>
                        {analysis.fields.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Campo de Vencimento
                      </label>
                      <select
                        value={mapping.dueDateField}
                        onChange={(e) => setMapping({ ...mapping, dueDateField: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                      >
                        <option value="">Data de hoje</option>
                        {analysis.fields.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Campo de Documento
                      </label>
                      <select
                        value={mapping.documentField}
                        onChange={(e) => setMapping({ ...mapping, documentField: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                      >
                        <option value="">Nenhum</option>
                        {analysis.fields.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Campo de Favorecido
                      </label>
                      <select
                        value={mapping.contactField}
                        onChange={(e) => setMapping({ ...mapping, contactField: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                      >
                        <option value="">Nenhum</option>
                        {analysis.fields.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Target Destination Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de lançamento
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  >
                    <option value="payable">Contas a Pagar</option>
                    <option value="receivable">Contas a Receber</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria padrão
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                  >
                    <option value="">Sem categoria</option>
                    {categories
                      .filter((c) => c.type === 'both' || c.type === txType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vincular contato
                  </label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
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

              {/* Duplicate Warning Banner */}
              {duplicateIds.size > 0 && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Possível duplicidade detectada em {duplicateIds.size} item(ns) (mesmo valor, vencimento e documento/descrição).
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

              {/* Preview Table */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                  <span>
                    {selectedItems.length} de {previewItems.length} item(ns) selecionado(s)
                  </span>
                  <span className="font-mono-tabular font-semibold">
                    Total selecionado: {formatBRL(totalPreviewCents)}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {previewItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Selecione os campos de valor válidos para visualizar os itens.
                    </div>
                  ) : (
                    previewItems.map((item) => {
                      const isDup = duplicateIds.has(item.tempId);
                      const checked = !excludedIds.has(item.tempId);
                      return (
                        <div
                          key={item.tempId}
                          className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs ${
                            checked ? '' : 'opacity-45 bg-slate-50/50 dark:bg-slate-950/30'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleItem(item.tempId)}
                              aria-label={`Selecionar ${item.description}`}
                              className="mt-0.5 rounded border-slate-300 text-teal-700"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-white truncate">
                                {item.description}
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 font-mono-tabular flex flex-wrap items-center gap-1.5">
                                <span>Venc. {formatDateBR(item.dueDate)}</span>
                                {item.documentNumber && <span>· {item.documentNumber}</span>}
                                {item.installmentTotal > 1 && (
                                  <span>
                                    · Parcela {item.installmentNumber}/{item.installmentTotal}
                                  </span>
                                )}
                                {isDup && (
                                  <span className="text-amber-700 dark:text-amber-400 font-sans font-semibold">
                                    · Possível duplicata
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white shrink-0">
                            {formatBRL(item.amountCents)}
                          </span>
                        </div>
                      );
                    })
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
            disabled={selectedItems.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            Importar {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

