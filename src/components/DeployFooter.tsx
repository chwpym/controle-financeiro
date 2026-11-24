import React from 'react';
import { getLocalBuildInfo } from '../utils/pwaUpdate';

export interface DeployFooterProps {
  isOnline: boolean;
  onOpenUpdateCenter: () => void;
}

/**
 * Discrete application footer displaying copyright info on the left and an interactive
 * Deploy Version & Status Badge on the right that opens the Update Center modal.
 * Rodapé discreto da aplicação exibindo os direitos autorais à esquerda e o Deploy Badge
 * clicável à direita com status Online/Offline, versão, commit e atalho para a Central de Atualizações.
 */
export const DeployFooter: React.FC<DeployFooterProps> = ({ isOnline, onOpenUpdateCenter }) => {
  const { version, commit } = getLocalBuildInfo();

  return (
    <footer
      data-testid="app-deploy-footer"
      className="mt-10 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"
    >
      <div className="text-center sm:text-left">
        FluxoClaro © 2026 · Gestão Financeira
      </div>

      <button
        type="button"
        onClick={onOpenUpdateCenter}
        data-testid="deploy-version-badge"
        title="Abrir Central de Atualizações & Diagnóstico"
        className="group inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-2xs cursor-pointer"
      >
        {/* Bolinha indicadora de status Online/Offline com pulso suave */}
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          {isOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isOnline ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </span>

        {/* Versão e commit com numerais tabulares */}
        <span className="font-mono-tabular text-[11px] font-medium text-slate-700 dark:text-slate-300">
          v{version} • {commit}
        </span>

        {/* Pílula sutil [ Atualizações ] */}
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/70 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/60 transition-colors">
          Atualizações
        </span>
      </button>
    </footer>
  );
};
