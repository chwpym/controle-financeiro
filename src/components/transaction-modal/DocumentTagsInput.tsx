import React, { useState } from 'react';
import { Plus, Tag, X } from 'lucide-react';

export interface DocumentTagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function parseDocumentTags(raw?: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const cleaned = part.trim();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      result.push(cleaned);
    }
  }
  return result;
}

/**
 * Campo multi-tag para adicionar um ou mais números de Nota Fiscal / Documento.
 */
export const DocumentTagsInput: React.FC<DocumentTagsInputProps> = ({
  tags,
  onChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  const commitRawTags = (raw: string) => {
    const incoming = parseDocumentTags(raw);
    if (incoming.length === 0) return;
    const merged = Array.from(new Set([...tags, ...incoming]));
    onChange(merged);
  };

  const handleInputChange = (raw: string) => {
    if (raw.includes(',')) {
      const parts = raw.split(',');
      const trailing = parts.pop() ?? '';
      commitRawTags(parts.join(','));
      setInputValue(trailing);
      return;
    }
    setInputValue(raw);
  };

  const handleAddClick = () => {
    commitRawTags(inputValue);
    setInputValue('');
  };

  return (
    <div>
      <label
        htmlFor="tx-document-number"
        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
      >
        Nº Documento / Nota Fiscal
      </label>
      <div className="flex items-center gap-2">
        <input
          id="tx-document-number"
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => {
            if (inputValue.trim()) handleAddClick();
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddClick();
            }
          }}
          placeholder="Ex: NF-159342 (Enter ou vírgula)"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[44px] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleAddClick}
          disabled={disabled || !inputValue.trim()}
          className="px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[44px] inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar NF
        </button>
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 text-xs font-mono-tabular font-medium"
            >
              <Tag className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{tag}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Remover nota ${tag}`}
                className="p-0.5 rounded hover:bg-teal-200/70 dark:hover:bg-teal-800/70 text-teal-700 dark:text-teal-300 cursor-pointer disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
