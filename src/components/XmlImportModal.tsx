/**
 * EN: Evolved XML Import Modal Component (Phase 11.1).
 *     Integrates Compact Post-Upload Dropzone, Intelligent Fiscal CNPJ Detection Card,
 *     Non-Destructive Contact Registration Drawer (`ContactDrawer`), Inline-Editable
 *     Installments Table with Real-Time Commercial Adjustments, and Multi-XML Batch Mode.
 * PT: Componente Principal do Modal de Importação de XML Evoluído (Fase 11.1).
 *     Integra Dropzone Compacto Pós-Upload, Card de Validação Fiscal Inteligente,
 *     Gaveta de Cadastro de Fornecedor/Cliente (`ContactDrawer`) sem perder os dados da nota,
 *     Tabela de Parcelas Inline com Ajustes Comerciais e Visão em Massa (Multi-XML).
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, FileCode2, Layers, X } from 'lucide-react';
import type { Category, Company, Contact, Transaction } from '../types';
import { api, ApiError } from '../utils/api';
import {
  cleanDocumentDigits,
  findDuplicateContactDocument,
  formatBRL,
  maskCEP,
  maskCNPJ,
  maskCPF,
} from '../utils/format';
import { ContactDrawer, type ContactFormData } from './ContactDrawer';
import {
  XmlBatchSummaryTable,
  XmlDestinationFields,
  XmlDropzone,
  XmlFiscalValidationCard,
  XmlGenericMapping,
  XmlPreviewTable,
  useXmlImport,
} from './xml-import';

export interface XmlImportModalProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  companies?: Company[];
  selectedCompanyId?: string | 'all';
  existingTransactions: Transaction[];
  onClose: () => void;
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
  onNavigateToCompanies?: () => void;
}

const EMPTY_CONTACT_FORM: ContactFormData = {
  id: null,
  personType: 'PJ',
  kind: 'supplier',
  name: '',
  tradeName: '',
  document: '',
  email: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

export const XmlImportModal: React.FC<XmlImportModalProps> = (props) => {
  const { userId, categories, contacts, companies = [], onClose, onNavigateToCompanies } = props;
  const {
    entries,
    entrySummaries,
    activeEntry,
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

    fileName,
    analysis,
    detection,
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

    invoiceTotalCents,
    installmentsTotalCents,
    divergenceCents,
    adjustmentType,
    adjustmentReason,
    setAdjustmentReason,
    adjustmentNotes,
    setAdjustmentNotes,
    isBlockedByFiscalLock,
    isMissingMandatoryFields,

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
  } = useXmlImport(props);

  // Embedded ContactDrawer state so the user can open [+ Cadastrar Fornecedor/Cliente]
  // without closing or losing the imported XML invoice state.
  // Estado da gaveta de cadastro aninhada para cadastrar Fornecedor/Cliente sem fechar a nota.
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [contactForm, setContactForm] = useState<ContactFormData>(EMPTY_CONTACT_FORM);
  const [lookupCnpjLoading, setLookupCnpjLoading] = useState(false);
  const [lookupCepLoading, setLookupCepLoading] = useState(false);
  const [contactFeedback, setContactFeedback] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);

  const duplicateContact = useMemo(
    () => findDuplicateContactDocument(contacts, contactForm.document, contactForm.id),
    [contacts, contactForm.document, contactForm.id]
  );

  const handleOpenContactDrawer = () => {
    setContactFeedback(null);
    if (activeContact) {
      const cleanAlnum = cleanDocumentDigits(activeContact.document);
      const digitsOnly = activeContact.document.replace(/\D/g, '');
      const isPf = digitsOnly.length === 11 && cleanAlnum.length === 11;
      setContactForm({
        id: null,
        personType: isPf ? 'PF' : 'PJ',
        kind: txType === 'receivable' ? 'customer' : 'supplier',
        name: activeContact.name || '',
        tradeName: activeContact.tradeName || '',
        document: isPf
          ? maskCPF(digitsOnly)
          : cleanAlnum.length === 14
            ? maskCNPJ(cleanAlnum)
            : activeContact.document || '',
        email: '',
        phone: '',
        cep: activeContact.address?.cep ? maskCEP(activeContact.address.cep) : '',
        street: activeContact.address?.street || '',
        number: activeContact.address?.number || '',
        complement: activeContact.address?.complement || '',
        neighborhood: activeContact.address?.neighborhood || '',
        city: activeContact.address?.city || '',
        state: (activeContact.address?.state || '').toUpperCase().slice(0, 2),
      });
    } else {
      setContactForm({
        ...EMPTY_CONTACT_FORM,
        kind: txType === 'receivable' ? 'customer' : 'supplier',
      });
    }
    setContactDrawerOpen(true);
  };

  const handleConsultCnpj = async () => {
    setContactFeedback(null);
    const digits = contactForm.document.replace(/\D/g, '');
    if (digits.length !== 14) {
      setContactFeedback({
        kind: 'error',
        text: 'Informe os 14 dígitos do CNPJ antes de consultar.',
      });
      return;
    }
    setLookupCnpjLoading(true);
    try {
      const data = await api.lookupCnpj(digits);
      setContactForm((prev) => ({
        ...prev,
        personType: 'PJ',
        document: data.cnpj || prev.document,
        name: data.name || prev.name,
        tradeName: data.tradeName || prev.tradeName,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        cep: data.cep || prev.cep,
        street: data.street || prev.street,
        number: data.number || prev.number,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
      setContactFeedback({
        kind: 'success',
        text: 'Dados consultados na Receita Federal com sucesso.',
      });
    } catch (err) {
      setContactFeedback({
        kind: 'error',
        text:
          err instanceof ApiError
            ? err.message
            : 'Não foi possível consultar o CNPJ agora. Confira os dados do XML e salve.',
      });
    } finally {
      setLookupCnpjLoading(false);
    }
  };

  const handleConsultCep = async () => {
    setContactFeedback(null);
    const digits = contactForm.cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setContactFeedback({ kind: 'error', text: 'Informe os 8 dígitos do CEP.' });
      return;
    }
    setLookupCepLoading(true);
    try {
      const data = await api.lookupCep(digits);
      setContactForm((prev) => ({
        ...prev,
        cep: data.cep || prev.cep,
        street: data.street || prev.street,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
      setContactFeedback({ kind: 'success', text: 'Endereço preenchido via CEP.' });
    } catch (err) {
      setContactFeedback({
        kind: 'error',
        text: err instanceof ApiError ? err.message : 'Falha ao consultar o CEP.',
      });
    } finally {
      setLookupCepLoading(false);
    }
  };

  const handleSubmitContactDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactFeedback(null);
    if (!contactForm.name.trim()) {
      setContactFeedback({
        kind: 'error',
        text: contactForm.personType === 'PJ' ? 'Informe a Razão Social.' : 'Informe o Nome.',
      });
      return;
    }
    if (duplicateContact) {
      setContactId(duplicateContact.id);
      setContactDrawerOpen(false);
      return;
    }

    const now = new Date().toISOString();
    const newContact: Contact = {
      id: crypto.randomUUID(),
      userId,
      personType: contactForm.personType,
      kind: contactForm.kind,
      name: contactForm.name.trim(),
      tradeName: contactForm.personType === 'PJ' ? contactForm.tradeName.trim() : '',
      document: contactForm.document.trim(),
      email: contactForm.email.trim(),
      phone: contactForm.phone.trim(),
      cep: contactForm.cep.trim(),
      street: contactForm.street.trim(),
      number: contactForm.number.trim(),
      complement: contactForm.complement.trim(),
      neighborhood: contactForm.neighborhood.trim(),
      city: contactForm.city.trim(),
      state: contactForm.state.trim().toUpperCase(),
      createdAt: now,
      updatedAt: now,
    };

    await handleCustomContactSaved(newContact);
    setContactDrawerOpen(false);
  };

  const boundContact = useMemo(
    () => contacts.find((c) => c.id === contactId),
    [contacts, contactId]
  );

  const compactInvoiceNum =
    analysis && analysis.kind !== 'generic' ? analysis.invoiceNumber : undefined;
  const compactPartyName =
    analysis?.kind === 'nfe'
      ? txType === 'receivable'
        ? analysis.customerTradeName || analysis.customerName
        : analysis.supplierTradeName || analysis.supplierName
      : analysis?.kind === 'nfse'
        ? txType === 'receivable'
          ? analysis.customerName
          : analysis.providerName
        : undefined;

  const isMultiBatchView = entries.length > 1 && viewMode === 'batch';
  const validSingleCount = selectedItems.filter((i) => i.amountCents > 0).length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
        <div className="w-full sm:max-w-3xl max-h-[94vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {/* Modal Header */}
          <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileCode2 className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white truncate">
                Importação Avançada de XML (NF-e / NFS-e)
              </h2>
              {entries.length > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-900 dark:bg-teal-950/70 dark:text-teal-300 shrink-0">
                  <Layers className="w-3 h-3" />
                  Lote ({entries.length})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar importação XML"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto">
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            {/* Pre-Upload Operation Toggle (shown when no XML is loaded yet) */}
            {entries.length === 0 && (
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleTypeChange('payable')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    txType === 'payable'
                      ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Conta a Pagar (Compra / Despesa)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('receivable')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    txType === 'receivable'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Conta a Receber (Venda / Receita)
                </button>
              </div>
            )}

            {/* Smart Dropzone (Shrinks to 1-line compact bar once file(s) are uploaded) */}
            <XmlDropzone
              fileName={fileName}
              fileCount={entries.length}
              invoiceNumber={compactInvoiceNum}
              partyName={compactPartyName}
              onFileSelected={handleFileChange}
              onFilesSelected={handleFilesSelected}
              onClear={handleClearFiles}
            />

            {/* Multi-XML View Switcher Bar when >1 file is loaded */}
            {entries.length > 1 && viewMode === 'single' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/50 dark:bg-teal-950/20 px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('batch')}
                  className="inline-flex items-center gap-1.5 font-semibold text-teal-800 dark:text-teal-300 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para Lista Consolidada ({entries.length} notas)</span>
                </button>
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  Editando: <strong>{activeEntry?.fileName}</strong>
                </span>
              </div>
            )}

            {/* Consolidated Multi-XML Batch Table */}
            {isMultiBatchView && (
              <XmlBatchSummaryTable
                summaries={entrySummaries}
                companies={companies}
                onToggleSelect={toggleBatchEntrySelection}
                onInspectEntry={(id) => {
                  setActiveEntryId(id);
                  setViewMode('single');
                }}
                onRemoveEntry={handleRemoveEntry}
              />
            )}

            {/* Single Invoice Inspection & Inline Editing View */}
            {!isMultiBatchView && analysis && (
              <>
                <XmlFiscalValidationCard
                  analysis={analysis}
                  detection={detection}
                  companies={companies}
                  txType={txType}
                  onChangeTxType={handleTypeChange}
                  isContactBound={Boolean(contactId)}
                  boundContactName={boundContact?.name}
                  isCreatingContact={creatingContact}
                  onAutoCreateContact={handleAutoCreateContact}
                  onOpenContactModal={handleOpenContactDrawer}
                  onNavigateToCompanies={
                    onNavigateToCompanies
                      ? () => {
                          onClose();
                          onNavigateToCompanies();
                        }
                      : undefined
                  }
                  onCancel={onClose}
                />

                {!isBlockedByFiscalLock && (
                  <>
                    {analysis.kind === 'generic' && (
                      <XmlGenericMapping
                        recordTag={analysis.recordTag}
                        fields={analysis.fields}
                        mapping={mapping}
                        onChangeMapping={setMapping}
                      />
                    )}

                    <XmlDestinationFields
                      txType={txType}
                      categories={categories}
                      categoryId={categoryId}
                      onChangeCategory={setCategoryId}
                      contacts={contacts}
                      contactId={contactId}
                      onChangeContact={setContactId}
                      showValidationHint
                    />

                    <XmlPreviewTable
                      items={previewItems}
                      excludedIds={excludedIds}
                      duplicateIds={duplicateIds}
                      onToggleItem={toggleItem}
                      onUncheckDuplicates={() => setExcludedIds(new Set(duplicateIds))}
                      onUpdateItem={updateInstallmentItem}
                      onAddInstallment={handleAddInstallment}
                      onSplitInstallments={handleSplitInstallments}
                      onRemoveInstallment={handleRemoveInstallment}
                      invoiceTotalCents={invoiceTotalCents}
                      installmentsTotalCents={installmentsTotalCents}
                      divergenceCents={divergenceCents}
                      adjustmentType={adjustmentType}
                      adjustmentReason={adjustmentReason}
                      onChangeAdjustmentReason={setAdjustmentReason}
                      adjustmentNotes={adjustmentNotes}
                      onChangeAdjustmentNotes={setAdjustmentNotes}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
              {isMultiBatchView && validBatchSummaries.length > 0 && (
                <span>
                  Lote selecionado:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {formatBRL(batchTotalCents)}
                  </strong>{' '}
                  ({batchTotalInstallments} parcela(s))
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[42px] cursor-pointer"
              >
                Cancelar
              </button>

              {entries.length > 1 ? (
                <>
                  {viewMode === 'single' && (
                    <button
                      type="button"
                      disabled={validSingleCount === 0 || isBlockedByFiscalLock || isMissingMandatoryFields}
                      onClick={handleConfirmImport}
                      className="px-4 py-2 rounded-xl border border-teal-600 text-teal-800 dark:text-teal-300 text-sm font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[42px] cursor-pointer"
                    >
                      Importar Apenas Esta ({validSingleCount})
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={validBatchSummaries.length === 0}
                    onClick={handleConfirmBatchImport}
                    data-testid="xml-import-all-btn"
                    className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[42px] cursor-pointer"
                  >
                    Importar Todas as Notas ({validBatchSummaries.length})
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={validSingleCount === 0 || isBlockedByFiscalLock || isMissingMandatoryFields}
                  onClick={handleConfirmImport}
                  data-testid="xml-confirm-import-btn"
                  className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[42px] cursor-pointer"
                >
                  Importar {!isBlockedByFiscalLock && validSingleCount > 0 ? `(${validSingleCount})` : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested Contact Registration Drawer (Preserves XML Import State) */}
      <ContactDrawer
        isOpen={contactDrawerOpen}
        onClose={() => setContactDrawerOpen(false)}
        form={contactForm}
        setForm={setContactForm}
        duplicateContact={duplicateContact}
        onConsultCnpj={handleConsultCnpj}
        onConsultCep={handleConsultCep}
        lookupCnpjLoading={lookupCnpjLoading}
        lookupCepLoading={lookupCepLoading}
        feedback={contactFeedback}
        onSubmit={handleSubmitContactDrawer}
        onEditExisting={(existing) => {
          setContactId(existing.id);
          setContactDrawerOpen(false);
        }}
      />
    </>
  );
};
