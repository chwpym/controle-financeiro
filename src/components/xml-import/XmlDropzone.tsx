import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface XmlDropzoneProps {
  fileName: string;
  onFileSelected: (file: File) => void;
}

export const XmlDropzone: React.FC<XmlDropzoneProps> = ({ fileName, onFileSelected }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xml') || file.type.includes('xml'))) {
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
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
        isDragOver
          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-teal-600'
      }`}
    >
      <Upload className="w-6 h-6 text-teal-700 dark:text-teal-400" />
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique ou arraste um arquivo .XML aqui'}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Suporta NF-e (Compra e Venda), NFS-e de Serviços (ABRASF) e XMLs genéricos
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
};
