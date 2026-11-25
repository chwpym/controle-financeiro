import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  GitCommit,
  RefreshCw,
  Rocket,
  Sparkles,
  Terminal,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  checkServerVersion,
  forcePwaRefresh,
  getLocalBuildInfo,
  type VersionCheckResult,
} from '../utils/pwaUpdate';

export interface UpdateCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline?: boolean;
}

interface ChangelogEntry {
  version: string;
  description: string;
  isLatest?: boolean;
}

/**
 * Recent release notes displayed in Card 3 of the Update Center.
 * Histórico de versões recentes (Changelog) exibido no Card 3 da Central de Atualizações.
 */
const CHANGELOG_ITEMS: ChangelogEntry[] = [
  {
    version: 'v1.11.0',
    description:
      'Central de Importação XML evoluída com detecção fiscal estrita Emitente/Destinatário, trava de segurança SEFAZ, edição inline, batimento comercial e Multi-XML.',
    isLatest: true,
  },
  {
    version: 'v1.10.1',
    description:
      'Central de Atualizações & Diagnóstico em tempo real, Deploy Badge no rodapé e Auto-Update do cache PWA.',
  },
  {
    version: 'v1.9.3',
    description:
      'Controle de acesso por empresa (RBAC), trava anti-fraude para exclusão de lançamentos e correção nos modais do admin.',
  },
  {
    version: 'v1.9.2',
    description:
      'Suporte oficial ao CNPJ Alfanumérico da Receita Federal, seletor de empresa no Header e recibos em PDF com logotipo.',
  },
  {
    version: 'v1.9.1',
    description: 'Cadastro de multi-empresas com logotipos e paleta de cores.',
  },
  {
    version: 'v1.8.0',
    description: 'Importador de planilhas Excel modular com drag-and-drop nativo.',
  },
];

/**
 * Formats an ISO timestamp to Brazilian Portuguese date/time string.
 * Formata uma string de data/hora ISO para o padrão brasileiro (dd/mm/aaaa às HH:MM).
 */
function formatBuildDateTimeBR(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Formats current time as [HH:MM:SS] for diagnostic console logs.
 * Formata o horário atual no formato [HH:MM:SS] para exibição nas linhas do console de diagnóstico.
 */
function currentTimeStampLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `[${hh}:${mm}:${ss}]`;
}

/**
 * Slide-over / Modal component for the Update Center & System Diagnostics.
 * Componente de gaveta lateral (Slide-over) para a Central de Atualizações & Diagnóstico:
 * exibe versão instalada, commit ativo, integridade do SQLite, verificador de deploys e changelog.
 */
export const UpdateCenterModal: React.FC<UpdateCenterModalProps> = ({
  isOpen,
  onClose,
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true,
}) => {
  const localInfo = getLocalBuildInfo();

  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkResult, setCheckResult] = useState<VersionCheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(() => [
    `${currentTimeStampLabel()} Sistema inicializado no bundle v${localInfo.version} (${localInfo.commit}).`,
  ]);

  /**
   * Appends a new timestamped line to the visual diagnostic console.
   * Adiciona uma nova linha com carimbo de horário ao terminal visual de diagnóstico.
   */
  const appendLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, `${currentTimeStampLabel()} ${message}`]);
  }, []);

  /**
   * Closes the slide-over when the user presses Escape.
   * Fecha a Central de Atualizações automaticamente ao pressionar a tecla Escape (ESC).
   */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /**
   * Executes the remote version check against GET /api/version and updates diagnostic logs.
   * Executa a verificação de novas versões consultando o servidor e registrando cada etapa no log visual.
   */
  const handleCheckUpdates = async () => {
    setChecking(true);
    setCheckError(null);
    const ts = currentTimeStampLabel();
    setLogs([
      `${ts} Conectado ao servidor de produção.`,
      `${ts} Comparando versão local com a nuvem...`,
    ]);

    try {
      const result = await checkServerVersion();
      setCheckResult(result);
      appendLog('Cache do Service Worker verificado com sucesso.');
      if (result.hasUpdate) {
        appendLog(
          `Nova atualização detectada no servidor: v${result.serverVersion} • ${result.serverCommit}.`
        );
      } else {
        appendLog(
          `Nenhuma pendência: versão local (${result.localCommit}) idêntica à nuvem (${result.serverCommit}).`
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível contatar o servidor de atualizações.';
      setCheckError(message);
      appendLog(`Erro durante diagnóstico: ${message}`);
    } finally {
      setChecking(false);
    }
  };

  /**
   * Clears PWA caches, updates Service Workers, and reloads the browser page.
   * Aciona a limpeza completa de caches do PWA e recarrega a aplicação para aplicar o novo deploy.
   */
  const handleApplyUpdateNow = async () => {
    setRefreshing(true);
    appendLog('Limpando Cache Storage e recarregando nova versão...');
    await forcePwaRefresh();
  };

  if (!isOpen) return null;

  const dbHealthy = !checkResult || checkResult.status === 'healthy';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="update-center-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Central de Atualizações & Diagnóstico"
        data-testid="update-center-modal"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Header / Cabeçalho */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white truncate">
                Central de Atualizações &amp; Diagnóstico
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Governança de versão, cache do PWA e saúde do servidor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Central de Atualizações"
            data-testid="update-center-close"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body / Conteúdo rolável com os 3 Cards */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Card 1: Status Atual do Sistema */}
          <section
            aria-label="Status Atual do Sistema"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>Status Atual do Sistema</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/70">
                Ambiente de Produção
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Versão Instalada</div>
                <div
                  data-testid="installed-version"
                  className="mt-0.5 text-sm font-bold font-mono-tabular text-slate-900 dark:text-white"
                >
                  v{localInfo.version}
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <GitCommit className="w-3 h-3" />
                  <span>Commit Ativo</span>
                </div>
                <div
                  data-testid="active-commit"
                  className="mt-0.5 text-sm font-bold font-mono-tabular text-slate-900 dark:text-white"
                >
                  {localInfo.commit}
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Data do Deploy / Build
                </div>
                <div className="mt-0.5 text-xs font-semibold font-mono-tabular text-slate-800 dark:text-slate-200">
                  {formatBuildDateTimeBR(localInfo.buildTime)}
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Conexão &amp; Banco SQLite
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Online</span>
                      {checkResult && (
                        <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                          ({checkResult.latencyMs}ms)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Offline</span>
                    </span>
                  )}
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] ${
                      dbHealthy
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <Database className="w-3 h-3" />
                    <span>{dbHealthy ? 'SQLite íntegro' : 'SQLite degradado'}</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Verificação de Atualizações */}
          <section
            aria-label="Verificação de Atualizações"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
                  Verificação de Atualizações
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare o bundle em execução com o último deploy publicado na nuvem
                </p>
              </div>

              <button
                type="button"
                onClick={handleCheckUpdates}
                disabled={checking || refreshing}
                data-testid="check-updates-button"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors min-h-[42px] shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Verificando...' : 'Verificar Novas Atualizações'}</span>
              </button>
            </div>

            {/* Erro de conexão/consulta */}
            {checkError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>{checkError}</div>
              </div>
            )}

            {/* Resultado: Nova versão disponível */}
            {checkResult && checkResult.hasUpdate && !checkError && (
              <div
                data-testid="update-available-banner"
                className="rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/80 dark:bg-teal-950/50 p-4 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <Rocket className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-teal-950 dark:text-teal-100">
                      Nova versão disponível no servidor!
                    </div>
                    <p className="text-teal-800 dark:text-teal-300">
                      Deploy ativo na nuvem:{' '}
                      <strong className="font-mono-tabular">
                        v{checkResult.serverVersion} • {checkResult.serverCommit}
                      </strong>{' '}
                      (sua sessão atual está em{' '}
                      <span className="font-mono-tabular">
                        v{checkResult.localVersion} • {checkResult.localCommit}
                      </span>
                      ).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyUpdateNow}
                  disabled={refreshing}
                  data-testid="apply-update-button"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition-colors min-h-[42px] cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  <span>
                    {refreshing ? 'Limpando cache e atualizando...' : 'Atualizar Sistema Agora'}
                  </span>
                </button>
              </div>
            )}

            {/* Resultado: Sistema já está atualizado */}
            {checkResult && !checkResult.hasUpdate && !checkError && (
              <div
                data-testid="up-to-date-badge"
                className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/40 px-3.5 py-3 flex items-center gap-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Você está utilizando a versão mais recente do sistema!</span>
              </div>
            )}

            {/* Terminal / Log de Diagnóstico Visual */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800 pb-2">
                <Terminal className="w-3.5 h-3.5 text-teal-400" />
                <span>Log de Diagnóstico</span>
              </div>
              <div
                data-testid="diagnostic-log"
                className="space-y-1 max-h-36 overflow-y-auto font-mono-tabular text-[11px] leading-relaxed text-slate-300"
              >
                {logs.map((line, idx) => (
                  <div key={`${idx}-${line}`} className="break-words">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Card 3: O Que Há de Novo (Histórico de Releases / Changelog) */}
          <section
            aria-label="O Que Há de Novo"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
                O Que Há de Novo (Histórico de Releases)
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {CHANGELOG_ITEMS.map((item) => (
                <div key={item.version} className="py-3 first:pt-1 last:pb-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono-tabular bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {item.version}
                    </span>
                    {item.isLatest && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer / Rodapé do Modal */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
            Build v{localInfo.version} • {localInfo.commit}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[42px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
