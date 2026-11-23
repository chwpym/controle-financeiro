import React, { useState, useRef } from 'react';
import { Download, Upload } from 'lucide-react';

export interface ExcelDropzoneProps {
  fileName: string;
  onFileSelected: (file: File) => void;
  onDownloadTemplate: () => void;
}

const VALID_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const VALID_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

export const ExcelDropzone: React.FC<ExcelDropzoneProps> = ({
  fileName,
  onFileSelected,
  onDownloadTemplate,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAcceptedFile = (file: File): boolean => {
    const lowerName = file.name.toLowerCase();
    const hasValidExt = VALID_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = VALID_MIME_TYPES.includes(file.type);
    return hasValidExt || hasValidMime;
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && isAcceptedFile(file)) {
      onFileSelected(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Envie sua planilha e escolha exatamente quais campos da tabela deseja importar.
        </span>
        <button
          type="button"
          onClick={onDownloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar planilha modelo (.xlsx)
        </button>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-teal-600'
        }`}
      >
        <Upload className="w-6 h-6 text-teal-700 dark:text-teal-400" />
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {isDragOver
            ? 'Solte sua planilha Excel aqui para carregar instantaneamente'
            : fileName
              ? `Arquivo selecionado: ${fileName}`
              : 'Clique ou arraste um arquivo .XLSX, .XLS ou .CSV aqui'}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          A primeira linha da aba deve conter os títulos das colunas da tabela
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </div>
  );
};
