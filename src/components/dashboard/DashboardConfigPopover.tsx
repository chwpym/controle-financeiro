import React, { useEffect, useRef, useState } from 'react';
import { Columns, Maximize2, RotateCcw, Settings2, X } from 'lucide-react';
import {
  DEFAULT_WIDGET_ORDER,
  WIDGET_LABELS,
  type WidgetCardId,
  type WidgetSpan,
} from './types';

export interface DashboardConfigPopoverProps {
  visibleWidgets: Record<WidgetCardId, boolean>;
  widgetSpans: Record<WidgetCardId, WidgetSpan>;
  onToggleVisibility: (id: WidgetCardId) => void;
  onChangeSpan: (id: WidgetCardId, span: WidgetSpan) => void;
  onResetDefaults: () => void;
  isCustomLayout: boolean;
}

export const DashboardConfigPopover: React.FC<DashboardConfigPopoverProps> = ({
  visibleWidgets,
  widgetSpans,
  onToggleVisibility,
  onChangeSpan,
  onResetDefaults,
  isCustomLayout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold min-h-[40px] transition-colors ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <Settings2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>Personalizar</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Configurar visibilidade e largura dos widgets"
          className="absolute right-0 top-full mt-2 w-80 sm:w-88 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Widgets do Painel
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar personalização"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 space-y-2">
            {DEFAULT_WIDGET_ORDER.map((id) => {
              const isVisible = visibleWidgets[id] !== false;
              const span = widgetSpans[id] || 1;

              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => onToggleVisibility(id)}
                      className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <span
                      className={`text-xs truncate ${
                        isVisible
                          ? 'text-slate-800 dark:text-slate-200 font-medium'
                          : 'text-slate-400 dark:text-slate-500 line-through'
                      }`}
                    >
                      {WIDGET_LABELS[id]}
                    </span>
                  </label>

                  {isVisible && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onChangeSpan(id, span === 1 ? 2 : 1)}
                        title={span === 2 ? 'Mudar para 1 coluna' : 'Mudar para 2 colunas'}
                        aria-label={`Largura de ${WIDGET_LABELS[id]}: ${span === 2 ? '2 colunas' : '1 coluna'}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {span === 2 ? (
                          <>
                            <Maximize2 className="w-3 h-3 text-teal-600" />
                            <span>2 Col</span>
                          </>
                        ) : (
                          <>
                            <Columns className="w-3 h-3 text-slate-400" />
                            <span>1 Col</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!isCustomLayout}
              onClick={() => {
                onResetDefaults();
                setIsOpen(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar padrão</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors"
            >
              Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
