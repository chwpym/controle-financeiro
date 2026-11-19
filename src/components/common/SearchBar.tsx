import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  containerClassName?: string;
}

/**
 * Barra de busca padronizada com ícone de lupa, botão limpar e debounce opcional.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  onDebouncedChange,
  debounceMs = 250,
  containerClassName = '',
  className = '',
  placeholder = 'Buscar...',
  'aria-label': ariaLabel = 'Buscar',
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedCallbackRef = useRef(onDebouncedChange);
  const didMountRef = useRef(false);

  useEffect(() => {
    debouncedCallbackRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!debouncedCallbackRef.current) return;

    const timer = window.setTimeout(() => {
      debouncedCallbackRef.current?.(value);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [value, debounceMs]);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div role="search" className={`relative ${containerClassName}`}>
      <Search
        aria-hidden="true"
        className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className={`w-full pl-10 ${
          value ? 'pr-10' : 'pr-3.5'
        } py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 min-h-[40px] [&::-webkit-search-cancel-button]:appearance-none ${className}`}
        {...props}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
