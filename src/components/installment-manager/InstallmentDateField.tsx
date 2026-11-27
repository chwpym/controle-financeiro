import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const InstallmentDateField: React.FC<Props> = ({ id, label, value, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[40px] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0"
        />
        <button
          type="button"
          title="Abrir calendário"
          onClick={() => ref.current?.showPicker?.()}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
