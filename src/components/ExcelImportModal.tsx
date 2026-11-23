import React from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import type { Category, Contact, Transaction } from '../types';
import {
  ExcelDefaultsForm,
  ExcelDropzone,
  ExcelMappingTable,
  ExcelPreviewTable,
  ExcelSheetSelector,
  useExcelImport,
} from './excel-import';

export interface ExcelImportModalProps {
  userId: string;
  categories: Category[];
  contacts: Contact[];
  existingTransactions: Transaction[];
  onClose: () => void;
  onImport: (items: Transaction[]) => void;
  onCreateContact: (contact: Contact) => Promise<void> | void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = (props) => {
  const { categories, contacts, onClose } = props;
  const {
    fileName,
    workbookData,
    selectedSheet,
    sheetData,
    error,
    mapping,
    setMapping,
    defaultType,
    setDefaultType,
    defaultStatus,
    setDefaultStatus,
    defaultCategoryId,
    setDefaultCategoryId,
    defaultContactId,
    setDefaultContactId,
    previewRows,
    selectedCount,
    totalSelectedCents,
    duplicateRowIndices,
    unmatchedContactNames,
    creatingContacts,
    handleFileSelected,
    handleSheetChange,
    toggleRowSelection,
    toggleAllRows,
    uncheckDuplicates,
    createUnmatchedContacts,
    sampleOf,
    handleConfirmImport,
    downloadTemplate,
  } = useExcelImport(props);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl max-h-[94vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Importação por Planilha Excel (.XLSX / .XLS / .CSV)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importação Excel"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
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

          <ExcelDropzone
            fileName={fileName}
            onFileSelected={handleFileSelected}
            onDownloadTemplate={downloadTemplate}
          />

          {workbookData && sheetData && (
            <>
              <ExcelSheetSelector
                sheetNames={workbookData.sheetNames}
                selectedSheet={selectedSheet}
                onSheetChange={handleSheetChange}
              />

              <ExcelMappingTable
                headers={sheetData.headers}
                mapping={mapping}
                onMappingChange={setMapping}
                sampleOf={sampleOf}
                rowCount={sheetData.rows.length}
              />

              <ExcelDefaultsForm
                mapping={mapping}
                defaultType={defaultType}
                setDefaultType={setDefaultType}
                defaultStatus={defaultStatus}
                setDefaultStatus={setDefaultStatus}
                defaultCategoryId={defaultCategoryId}
                setDefaultCategoryId={setDefaultCategoryId}
                defaultContactId={defaultContactId}
                setDefaultContactId={setDefaultContactId}
                categories={categories}
                contacts={contacts}
              />

              <ExcelPreviewTable
                previewRows={previewRows}
                selectedCount={selectedCount}
                totalSelectedCents={totalSelectedCents}
                duplicateRowIndices={duplicateRowIndices}
                unmatchedContactNames={unmatchedContactNames}
                creatingContacts={creatingContacts}
                onToggleRow={toggleRowSelection}
                onToggleAll={toggleAllRows}
                onUncheckDuplicates={uncheckDuplicates}
                onCreateUnmatchedContacts={createUnmatchedContacts}
              />
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            Importar {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
