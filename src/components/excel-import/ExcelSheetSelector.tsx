import React from 'react';

export interface ExcelSheetSelectorProps {
  sheetNames: string[];
  selectedSheet: string;
  onSheetChange: (sheet: string) => void;
}

export const ExcelSheetSelector: React.FC<ExcelSheetSelectorProps> = ({
  sheetNames,
  selectedSheet,
  onSheetChange,
}) => {
  if (sheetNames.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
      <label
        htmlFor="excel-sheet-select"
        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
      >
        Aba da planilha:
      </label>
      <select
        id="excel-sheet-select"
        aria-label="Aba da planilha"
        value={selectedSheet}
        onChange={(e) => onSheetChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px]"
      >
        {sheetNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};
