/**
 * src/components/SystemReleaseModal.tsx
 *
 * EN: Modern System Release / License Activation modal (Phase 10.2).
 *     Displays the formatted System Date (`DD/MM/AAAA`), the active company's CNPJ (or a dropdown
 *     when the user has multiple authorized companies), a formatted uppercase alphanumeric Release Code
 *     input (`XXXX-XXXX-XXXX-XXXX`), inline error alerts inside the modal body, and `[ Abandonar ]` / `[ Confirmar ]` actions.
 *     When `isLocked` is true (license expired), hides the close `X` button and keeps the user aware of read-only mode
 *     until activated or dismissed via `[ Abandonar ]` if allowed, or keeps `[ X ]` hidden per lockout spec.
 *
 * PT: Modal moderno de Liberação do Sistema / Ativação de Licença por Tempo de Uso (Fase 10.2).
 *     Exibe a Data do Sistema formatada (`DD/MM/AAAA`), o CNPJ da empresa ativa (com seletor caso o
 *     usuário possua múltiplas empresas liberadas), campo monoespaçado em maiúsculas para o Código de
 *     Liberação (`XXXX-XXXX-XXXX-XXXX`), alertas de erro diretamente dentro do modal (acima dos botões)
 *     e os botões `[ Abandonar ]` e `[ Confirmar ]` com spinner de carregamento.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldAlert, X } from 'lucide-react';
import type { Company, LicenseStatusResponse } from '../types';
import { api, ApiError } from '../utils/api';
import { formatDateBR, maskCNPJ, todayISO } from '../utils/format';

export interface SystemReleaseModalProps {
  /** Controls whether the modal is visible / Controla a visibilidade do modal */
  isOpen: boolean;
  /** Callback fired when the modal closes / Callback disparado ao fechar ou abandonar */
  onClose: () => void;
  /** Current license status loaded from `/api/license/status` / Status atual da licença carregado da API */
  licenseStatus: LicenseStatusResponse | null;
  /** Authorized companies available to the user / Empresas liberadas para o usuário */
  companies: Company[];
  /** Currently selected company ID in header (`'all'` or specific ID) / ID da empresa ativa no seletor */
  selectedCompanyId?: string | 'all';
  /** Callback invoked after successful activation / Callback invocado após liberação com sucesso */
  onActivated: (validUntil: string, daysRemaining: number) => void;
}

/**
 * EN: Formats raw user input into uppercase 4-character alphanumeric blocks (`XXXX-XXXX-XXXX-XXXX`).
 * PT: Formata a digitação do código de liberação em blocos de 4 caracteres alfanuméricos maiúsculos (`XXXX-XXXX-XXXX-XXXX`).
 */
export function maskLicenseCodeInput(raw: string): string {
  let clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length > 16 && clean.startsWith('FLUX')) {
    clean = clean.slice(4);
  }
  clean = clean.slice(0, 16);
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    groups.push(clean.slice(i, i + 4));
  }
  return groups.join('-');
}

export const SystemReleaseModal: React.FC<SystemReleaseModalProps> = ({
  isOpen,
  onClose,
  licenseStatus,
  companies,
  selectedCompanyId,
  onActivated,
}) => {
  const titleId = useId();
  const sysDateInputId = useId();
  const cnpjControlId = useId();
  const codeInputId = useId();
  const codeHintId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // EN: Active companies list for optional multi-company dropdown.
  // PT: Lista de empresas ativas para o seletor quando o usuário possui mais de uma empresa.
  const activeCompanies = useMemo(
    () => companies.filter((c) => c.status === 'active'),
    [companies]
  );

  // EN: Determines whether the system is under total write lockout due to expiration (`daysRemaining < 0`).
  // PT: Determina se o sistema está sob bloqueio de expiração (`daysRemaining < 0`), ocultando o botão `X`.
  const isExpiredLockout = Boolean(
    licenseStatus && (licenseStatus.isExpired || licenseStatus.daysRemaining < 0)
  );

  const [targetCompanyId, setTargetCompanyId] = useState<string>('');
  const [releaseCode, setReleaseCode] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // EN: Synchronize selected company whenever modal opens or props change.
  // PT: Sincroniza a empresa selecionada sempre que o modal abre ou as propriedades mudam.
  useEffect(() => {
    if (!isOpen) return;
    setReleaseCode('');
    setModalError(null);
    setSuccessMsg(null);

    if (selectedCompanyId && selectedCompanyId !== 'all') {
      setTargetCompanyId(selectedCompanyId);
    } else if (licenseStatus?.companyId) {
      setTargetCompanyId(licenseStatus.companyId);
    } else {
      const def = activeCompanies.find((c) => c.isDefault) || activeCompanies[0];
      setTargetCompanyId(def?.id || '');
    }
  }, [isOpen, selectedCompanyId, licenseStatus?.companyId, activeCompanies]);

  // EN: Sync native `<dialog>` modal state via `showModal()` when supported by the environment.
  // PT: Sincroniza a abertura nativa do `<dialog>` com `showModal()` quando suportado pelo navegador/ambiente.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (typeof dialog.showModal === 'function' && !dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      } else if (!dialog.open) {
        dialog.setAttribute('open', '');
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [isOpen]);

  // EN: Resolved CNPJ displayed/submitted for license activation.
  // PT: CNPJ formatado resolvido da empresa selecionada ou retornado pelo status do servidor.
  const activeCnpj = useMemo(() => {
    const selectedComp = activeCompanies.find((c) => c.id === targetCompanyId);
    if (selectedComp?.document) {
      return maskCNPJ(selectedComp.document);
    }
    if (licenseStatus?.cnpj) {
      return licenseStatus.cnpj;
    }
    return '00.000.000/0000-00';
  }, [activeCompanies, targetCompanyId, licenseStatus?.cnpj]);

  // EN: Formatted System Date (`DD/MM/AAAA`) from server `systemDate` or local fallback.
  // PT: Data do Sistema formatada (`DD/MM/AAAA`) obtida do `systemDate` do backend ou data local.
  const formattedSystemDate = useMemo(() => {
    const iso = licenseStatus?.systemDate || todayISO();
    return formatDateBR(iso);
  }, [licenseStatus?.systemDate]);

  if (!isOpen) return null;

  /**
   * EN: Submits the release code to `POST /api/license/activate` and handles validation errors inline.
   * PT: Envia o código de liberação para `POST /api/license/activate` e exibe erros diretamente no modal.
   */
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSuccessMsg(null);

    const cleanKey = releaseCode.replace(/[^A-Z0-9]/gi, '');
    if (cleanKey.length < 16) {
      setModalError('Informe o código de liberação completo com 16 caracteres alfanuméricos.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.activateLicense(
        activeCnpj,
        releaseCode.trim(),
        targetCompanyId || undefined
      );
      setSuccessMsg(result.message || 'Sistema liberado com sucesso!');
      onActivated(result.validUntil, result.daysRemaining);
    } catch (err) {
      setModalError(
        err instanceof ApiError
          ? err.message
          : 'Código de liberação inválido ou incompatível com o CNPJ informado.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: isExpiredLockout ? 'none' : 'closerequest' } as Record<string, string>)}
      onCancel={(e) => {
        if (isExpiredLockout) {
          e.preventDefault();
          return;
        }
        onClose();
      }}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = '';
        }
      }}
      data-testid="system-release-modal"
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0 text-slate-900 dark:text-slate-100 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-xs open:flex open:flex-col"
    >
      {/* Modal Header / Cabeçalho da Tela de Liberação */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-700/10 dark:bg-teal-400/10 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <KeyRound className="w-4 h-4" aria-hidden="true" />
          </div>
          <h1
            id={titleId}
            className="text-base font-display font-bold text-slate-900 dark:text-white"
          >
            🔑 Liberação do Sistema
          </h1>
        </div>

        {/* Hide close [X] button when under total expiration lockout / Oculta [X] sob bloqueio total por expiração */}
        {!isExpiredLockout && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de liberação"
            data-testid="release-modal-close-x"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Form Body / Corpo do Formulário */}
      <form onSubmit={handleConfirm} className="p-6 space-y-4">
        {/* Expiration Lockout Notice / Aviso de Licença Vencida */}
        {isExpiredLockout && (
          <div
            data-testid="expired-lockout-banner"
            className="flex items-start gap-2.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-relaxed">
              <strong className="font-semibold block">Licença de uso expirada</strong>
              Insira abaixo o código de liberação fornecido pelo suporte para desbloquear novos lançamentos financeiros. A consulta de extratos e relatórios permanece disponível.
            </div>
          </div>
        )}

        {/* Current Validity Info Pill (when valid) / Informação de Validade Vigente */}
        {!isExpiredLockout && licenseStatus?.validUntil && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 px-3.5 py-2.5 text-xs">
            <span className="text-slate-600 dark:text-slate-400">Vencimento atual:</span>
            <span className="font-mono-tabular font-semibold text-teal-700 dark:text-teal-400">
              {formatDateBR(licenseStatus.validUntil)} ({licenseStatus.daysRemaining} dia(s))
            </span>
          </div>
        )}

        {/* 1. System Date (Disabled) / Data do Sistema */}
        <div>
          <label
            htmlFor={sysDateInputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Data do Sistema
          </label>
          <input
            id={sysDateInputId}
            type="text"
            value={formattedSystemDate}
            disabled
            readOnly
            data-testid="system-date-input"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-sm font-mono-tabular min-h-[42px] cursor-not-allowed"
          />
        </div>

        {/* 2. Active Company CNPJ (Dropdown if multi-company, read-only input otherwise) / CNPJ da Empresa */}
        <div>
          <label
            htmlFor={cnpjControlId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            CNPJ
          </label>
          {activeCompanies.length > 1 ? (
            <select
              id={cnpjControlId}
              value={targetCompanyId}
              onChange={(e) => {
                setTargetCompanyId(e.target.value);
                setModalError(null);
              }}
              data-testid="release-cnpj-select"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular text-slate-900 dark:text-white min-h-[42px]"
            >
              {activeCompanies.map((comp) => {
                const formatted = comp.document ? maskCNPJ(comp.document) : '00.000.000/0000-00';
                const label = comp.tradeName || comp.legalName;
                return (
                  <option key={comp.id} value={comp.id}>
                    {formatted} — {label}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              id={cnpjControlId}
              type="text"
              value={activeCnpj}
              disabled
              readOnly
              data-testid="release-cnpj-input"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-sm font-mono-tabular font-semibold min-h-[42px] cursor-not-allowed"
            />
          )}
        </div>

        {/* 3. Release Code Input / Código de Liberação */}
        <div>
          <label
            htmlFor={codeInputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Código de Liberação
          </label>
          <p id={codeHintId} className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
            Digite a chave alfanumérica de 16 caracteres enviada pelo administrador.
          </p>
          <input
            id={codeInputId}
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-describedby={codeHintId}
            aria-invalid={modalError ? 'true' : undefined}
            value={releaseCode}
            onChange={(e) => {
              setReleaseCode(maskLicenseCodeInput(e.target.value));
              if (modalError) setModalError(null);
            }}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            data-testid="release-code-input"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center text-base font-mono-tabular font-bold tracking-widest uppercase text-slate-900 dark:text-white focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:focus:outline-teal-400 min-h-[46px]"
          />
        </div>

        {/* Inline Error Alert directly above action buttons / Alerta de Erro DENTRO do Modal */}
        {modalError && (
          <div
            role="alert"
            data-testid="release-modal-error"
            className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-3 text-xs font-medium text-red-700 dark:text-red-300"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{modalError}</span>
          </div>
        )}

        {/* Inline Success Alert / Alerta de Sucesso */}
        {successMsg && (
          <div
            role="status"
            data-testid="release-modal-success"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons / Botões [ Abandonar ] e [ Confirmar ] */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            data-testid="release-cancel-button"
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[42px] cursor-pointer disabled:opacity-50"
          >
            Abandonar
          </button>

          <button
            type="submit"
            disabled={submitting}
            data-testid="release-confirm-button"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold min-h-[42px] cursor-pointer disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>Confirmar</span>
          </button>
        </div>
      </form>
    </dialog>
  );
};
