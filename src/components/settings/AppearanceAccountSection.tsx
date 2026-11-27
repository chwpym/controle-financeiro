import React from 'react';
import { Download, KeyRound, Moon, Rocket, Sun } from 'lucide-react';
import type { UserRole } from '../../types';
import { PWAInstallButton } from '../PWAInstallButton';

interface AppearanceAccountSectionProps {
  username: string;
  userRole: UserRole;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenChangePassword: () => void;
  onOpenUpdateCenter?: () => void;
  onOpenSystemRelease?: () => void;
}

export const AppearanceAccountSection: React.FC<AppearanceAccountSectionProps> = ({
  username,
  userRole,
  theme,
  onToggleTheme,
  onOpenChangePassword,
  onOpenUpdateCenter,
  onOpenSystemRelease,
}) => {
  const roleName = userRole === 'master' ? 'Master' : userRole === 'admin' ? 'Administrador' : 'Usuário';

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
      <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
        Aparência e Conta
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-900 dark:text-white">
            Tema visual
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              Segurança da conta ({username})
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Perfil atual: <strong>{roleName}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Trocar senha
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Aplicativo instalável (PWA)</span>
          </div>
          <PWAInstallButton />
        </div>

        {/* Shortcut to open the Update Center & PWA Cache Diagnostics / Atalho para abrir a Central de Atualizações */}
        {onOpenUpdateCenter && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Atualizações &amp; Diagnóstico
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Verificar versão ativa, limpar cache do PWA e histórico de releases
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenUpdateCenter}
              data-testid="settings-open-update-center"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] shrink-0 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>Central de Atualizações</span>
            </button>
          </div>
        )}

        {/* Shortcut to open System Release / License Activation (Phase 10.2) / Atalho para Liberação do Sistema */}
        {onOpenSystemRelease && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Licença de Uso &amp; Assinatura
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Inserir chave criptográfica de renovação ou consultar validade do CNPJ
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSystemRelease}
              data-testid="settings-open-system-release"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] shrink-0 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>Liberação do Sistema</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
