import React from 'react';
import { formatInputBRL, parseBRLToCents } from '../../utils/format';

export interface MoneyInputProps {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  id?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  valueCents,
  onChangeCents,
  label = 'Valor',
  error,
  helperText,
  disabled = false,
  className = '',
  autoFocus = false,
  id,
}) => {
  const inputId = id || 'money-input';
  const displayValue = formatInputBRL(valueCents);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const cents = Number(raw) || 0;
    onChangeCents(cents);
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-xs font-bold text-slate-400 dark:text-slate-500 font-mono select-none">
          R$
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          autoFocus={autoFocus}
          value={displayValue}
          onChange={handleInputChange}
          className={`w-full bg-white dark:bg-slate-900 border rounded-xl pl-10 pr-3.5 py-2 font-mono font-bold text-base text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-400 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-700 focus:ring-teal-500/40 focus:border-teal-600'
          } ${className}`}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};
