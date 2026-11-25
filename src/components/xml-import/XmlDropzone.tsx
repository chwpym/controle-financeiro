/**
 * EN: Smart XML Dropzone with Multi-File Upload and Compact Post-Upload Bar (Phase 11.1).
 *     Shrinks from a full dashed dropzone (~180px) into a single-line compact bar once XML(s)
 *     are loaded, freeing ~150px of vertical height to inspect installments without scrolling.
 * PT: Dropzone Inteligente de XML com Upload em Massa e Barra Compacta Pós-Upload (Fase 11.1).
 *     Encolhe automaticamente de uma caixa tracejada grande para uma barra de 1 linha após carregar
 *     XML(s), liberando ~150px de altura vertical para visualizar as duplicatas sem rolagem.
 */

import React, { useRef, useState } from 'react';
import { FileText, FolderPlus, RefreshCw, Upload, X } from 'lucide-react';

export interface XmlDropzoneProps {
  fileName: string;
  fileCount?: number;
  invoiceNumber?: string;
  partyName?: string;
  onFileSelected?: (file: File) => void;
  onFilesSelected?: (files: File[], append?: boolean) => void;
  onClear?: () => void;
}

export const XmlDropzone: React.FC<XmlDropzoneProps> = ({
  fileName,
  fileCount = 0,
  invoiceNumber,
  partyName,
  onFileSelected,
  onFilesSelected,
  onClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const appendInputRef = useRef<HTMLInputElement>(null);

  const hasLoadedFiles = Boolean(fileName) || fileCount > 0;

  const processFileList = (fileList: FileList | null | undefined, append = false) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles = Array.from(fileList).filter(
      (f) => f.name.toLowerCase().endsWith('.xml') || f.type.includes('xml') || !f.type
    );
    const chosen = validFiles.length > 0 ? validFiles : [fileList[0]];

    if (onFilesSelected) {
      onFilesSelected(chosen, append);
    } else if (onFileSelected && chosen[0]) {
      onFileSelected(chosen[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, append = false) => {
    e.preventDefault();
    setIsDragOver(false);
    processFileList(e.dataTransfer.files, append);
  };

  // Compact 1-Line Post-Upload Mode / Modo Compacto Pós-Upload (1 linha)
  if (hasLoadedFiles) {
    const summaryLabel =
      fileCount > 1
        ? `${fileCount} arquivos XML carregados`
        : invoiceNumber
          ? `NF-e ${invoiceNumber}${partyName ? ` · ${partyName}` : ''}`
          : fileName;

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => handleDrop(e, fileCount > 1)}
        data-testid="xml-dropzone-compact"
        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs transition-colors ${
          isDragOver
            ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/30'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
          <span
            className="font-semibold text-slate-800 dark:text-slate-100 truncate"
            title={summaryLabel}
          >
            {summaryLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onFilesSelected && (
            <button
              type="button"
              onClick={() => appendInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800/80 bg-teal-50/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
              title="Adicionar mais arquivos XML ao lote"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ XMLs</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => replaceInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Trocar XML</span>
          </button>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpar arquivos XML"
              title="Limpar arquivos carregados"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>

        {/* Hidden input for replacing XML(s) */}
        <input
          ref={replaceInputRef}
          type="file"
          multiple
          accept=".xml,text/xml,application/xml"
          onChange={(e) => {
            processFileList(e.target.files, false);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Hidden input for appending additional XML(s) */}
        <input
          ref={appendInputRef}
          type="file"
          multiple
          accept=".xml,text/xml,application/xml"
          onChange={(e) => {
            processFileList(e.target.files, true);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>
    );
  }

  // Initial Empty Dropzone / Caixa Tracejada Inicial de Upload
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => handleDrop(e, false)}
      data-testid="xml-dropzone-empty"
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
        isDragOver
          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-teal-600'
      }`}
    >
      <Upload className="w-6 h-6 text-teal-700 dark:text-teal-400" />
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
        Clique ou arraste um ou mais arquivos .XML aqui
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Suporta NF-e (Compra e Venda), NFS-e de Serviços (ABRASF), XMLs genéricos e importação em massa
      </p>
      <input
        ref={replaceInputRef}
        type="file"
        multiple
        accept=".xml,text/xml,application/xml"
        onChange={(e) => {
          processFileList(e.target.files, false);
          e.target.value = '';
        }}
        className="hidden"
      />
    </label>
  );
};
