import React, { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Globe, Settings } from 'lucide-react';
import type { Company } from '../../types';

export interface CompanySelectorProps {
  companies: Company[];
  selectedCompanyId: string | 'all';
  onSelectCompany: (companyId: string | 'all') => void;
  onManageCompanies: () => void;
  className?: string;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
  onManageCompanies,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCompanies = companies.filter((c) => c.status === 'active');
  const selectedCompany =
    selectedCompanyId === 'all'
      ? null
      : activeCompanies.find((c) => c.id === selectedCompanyId) || null;

  // Fechar ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id: string | 'all') => {
    onSelectCompany(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} data-testid="company-selector">
      {/* Botão de Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Selecionar empresa"
        className="min-h-[40px] max-w-[220px] sm:max-w-[260px] inline-flex items-center gap-2 px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
        data-testid="company-selector-trigger"
      >
        {selectedCompany ? (
          <div className="flex items-center gap-2 min-w-0">
            {selectedCompany.logoDataUrl ? (
              <img
                src={selectedCompany.logoDataUrl}
                alt={selectedCompany.tradeName}
                className="w-4 h-4 rounded-xs object-contain shrink-0 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
              />
            ) : (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                style={{ backgroundColor: selectedCompany.color || '#0F766E' }}
              />
            )}
            <span className="truncate max-w-[130px] sm:max-w-[160px] text-left">
              {selectedCompany.tradeName || selectedCompany.legalName}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[150px] text-left">
              Todas as Empresas
            </span>
            <span
              className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold font-mono-tabular text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title={`${activeCompanies.length} empresa(s) ativa(s)`}
            >
              {activeCompanies.length}
            </span>
          </div>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-auto transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu Suspenso */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Lista de empresas"
          className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          data-testid="company-selector-dropdown"
        >
          {/* Header do Menu */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              Alternar Empresa
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {activeCompanies.length} ativa(s)
            </span>
          </div>

          <div className="p-1.5 max-h-72 overflow-y-auto space-y-0.5">
            {/* Opção Consolidada: Todas as Empresas */}
            <button
              type="button"
              role="option"
              aria-selected={selectedCompanyId === 'all'}
              onClick={() => handleSelect('all')}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors min-h-[44px] ${
                selectedCompanyId === 'all'
                  ? 'bg-teal-50/80 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              data-testid="company-option-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-teal-100/70 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs truncate flex items-center gap-1.5">
                    <span>🌐 Todas as Empresas (Visão Consolidada)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    Consolidado de todas as unidades
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-[10px] font-bold font-mono-tabular text-slate-600 dark:text-slate-300">
                  {activeCompanies.length}
                </span>
                {selectedCompanyId === 'all' && (
                  <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                )}
              </div>
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* Lista de Empresas Ativas */}
            {activeCompanies.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                Nenhuma empresa ativa cadastrada.
              </div>
            ) : (
              activeCompanies.map((comp) => {
                const isSelected = selectedCompanyId === comp.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(comp.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors min-h-[44px] ${
                      isSelected
                        ? 'bg-teal-50/80 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                    data-testid={`company-option-${comp.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {comp.logoDataUrl ? (
                        <img
                          src={comp.logoDataUrl}
                          alt={comp.tradeName}
                          className="w-7 h-7 rounded-lg object-contain shrink-0 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-0.5"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs"
                          style={{ backgroundColor: comp.color || '#0F766E' }}
                        >
                          {(comp.tradeName || comp.legalName || 'E').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs truncate flex items-center gap-1.5">
                          <span className="truncate">{comp.tradeName || comp.legalName}</span>
                          {comp.isDefault && (
                            <span className="px-1.5 py-0.2 rounded-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider shrink-0 border border-amber-200/60 dark:border-amber-800/60">
                              Padrão
                            </span>
                          )}
                        </div>
                        {comp.document && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono-tabular truncate">
                            CNPJ: {comp.document}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé: Atalho Gerenciar Empresas */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onManageCompanies();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all min-h-[36px]"
              data-testid="manage-companies-shortcut"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Gerenciar Empresas...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
