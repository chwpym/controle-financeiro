import React from 'react';
import { FileCode2, X } from 'lucide-react';
import type { Category, Contact, Transaction } from '../types';
import {
  XmlContactMatcher,
  XmlDestinationFields,
  XmlDropzone,
  XmlGenericMapping,
  XmlPreviewTable,
  useXmlImport,
} from './xml-import';

interface XmlImportModalProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  existingTransactions: Transaction[];
  onClose: () => void;
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
}

export const XmlImportModal: React.FC<XmlImportModalProps> = (props) => {
  const { categories, contacts, onClose } = props;
  const {
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
  } = useXmlImport(props);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Importação Avançada de XML (NF-e / NFS-e)
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

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Account Type Toggle */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('payable')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
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
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                txType === 'receivable'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Conta a Receber (Venda / Receita)
            </button>
          </div>

          <XmlDropzone fileName={fileName} onFileSelected={handleFileChange} />

          {analysis && (
            <>
              {activeContact && (
                <XmlContactMatcher
                  txType={txType}
                  title={activeContact.title}
                  contactName={activeContact.name}
                  contactTradeName={activeContact.tradeName}
                  contactDocument={activeContact.document}
                  contactAddress={activeContact.address}
                  isBound={Boolean(contactId)}
                  isCreating={creatingContact}
                  onAutoCreate={handleAutoCreateContact}
                />
              )}

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
              />

              <XmlPreviewTable
                items={previewItems}
                excludedIds={excludedIds}
                duplicateIds={duplicateIds}
                onToggleItem={toggleItem}
                onUncheckDuplicates={() => setExcludedIds(new Set(duplicateIds))}
              />
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
