/**
 * src/components/admin/AdminLicensesTab.tsx
 *
 * EN: "Licenças & Assinaturas" tab in the Master/Admin panel (Phase 10.2 — UX Polish v1.10.2).
 *     Displays all client companies, their formatted CNPJs, expiration dates, days remaining,
 *     and status badges (*Ativa*, *A Vencer*, *Expirada*).
 *     Provides:
 *     - 1-click instant cloud renewal (`[ +30 Dias ]`).
 *     - `[ 🔑 Gerar Código ]` button opening a quick Validity Selector Modal/Popover with preset
 *       chips (`7`, `15`, `30` default, `90`, `365` days), custom numeric day input, and
 *       `[ Gerar e Copiar Código ]` confirmation with automatic clipboard copy and visual feedback.
 *
 * PT: Aba "Licenças & Assinaturas" do Painel Administrativo Master (Fase 10.2 — Polimento v1.10.2).
 *     Lista todas as empresas clientes, seus CNPJs, datas de vencimento, dias restantes e badges
 *     de status (*Ativa*, *A Vencer* ou *Expirada*).
 *     Oferece:
 *     - Botão rápido `[ +30 Dias ]` (renova na hora com 1 clique na nuvem sem código).
 *     - Botão `[ 🔑 Gerar Código ]` que abre um seletor rápido de validade com pílulas prontas
 *       (`7 Dias` Degustação, `15 Dias`, `30 Dias` Mensal padrão, `90 Dias` Trimestral, `365 Dias` Anual),
 *       campo numérico livre para dias personalizados e confirmação `[ Gerar e Copiar Código ]`.
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import type { AdminLicenseRow } from '../../types';
import { api, ApiError } from '../../utils/api';
import { formatDateBR } from '../../utils/format';

/**
 * EN: Quick preset chips for license validity selection in the Master code generator.
 * PT: Opções rápidas em pílulas (chips) para escolha de validade no gerador de chaves do Master.
 */
const LICENSE_DAY_PRESETS: ReadonlyArray<{ days: number; label: string; hint: string }> = [
  { days: 7, label: '7 Dias', hint: 'Degustação' },
  { days: 15, label: '15 Dias', hint: 'Quinzenal' },
  { days: 30, label: '30 Dias', hint: 'Mensal' },
  { days: 90, label: '90 Dias', hint: 'Trimestral' },
  { days: 365, label: '365 Dias', hint: 'Anual' },
];

interface AdminLicensesTabProps {
  /** Notification toast callback / Callback para disparar toast de notificação */
  onNotify: (message: string) => void;
  /** Optional callback notified whenever a company license is renewed / Callback opcional após renovação */
  onLicenseChanged?: () => void;
}

export const AdminLicensesTab: React.FC<AdminLicensesTabProps> = ({
  onNotify,
  onLicenseChanged,
}) => {
  const generatorDialogTitleId = useId();
  const customDaysInputId = useId();
  const generatorDialogRef = useRef<HTMLDialogElement | null>(null);

  const [licenses, setLicenses] = useState<AdminLicenseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // EN: State for the quick Validity Selector modal opened when clicking `[ 🔑 Gerar Código ]`.
  // PT: Estados do seletor rápido de validade aberto ao clicar em `[ 🔑 Gerar Código ]`.
  const [generatorTarget, setGeneratorTarget] = useState<AdminLicenseRow | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDaysRaw, setCustomDaysRaw] = useState<string>('30');

  // EN: Stores the most recently generated emergency release key so Master can view/copy it visually.
  // PT: Armazena o último código de emergência gerado para exibição visual imediata, data de validade e cópia rápida.
  const [generatedCodeInfo, setGeneratedCodeInfo] = useState<{
    companyId: string;
    companyName: string;
    cnpj: string;
    licenseKey: string;
    validUntil: string;
    days: number;
    copied: boolean;
  } | null>(null);

  /**
   * EN: Fetches all company licenses from `GET /api/admin/licenses`.
   * PT: Carrega a listagem de licenças de todas as empresas via `GET /api/admin/licenses`.
   */
  const loadLicenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminLicenses();
      setLicenses(res.licenses || []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as licenças das empresas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  // EN: Synchronize native `<dialog>` open/close lifecycle when `generatorTarget` changes.
  // PT: Sincroniza a abertura e fechamento do `<dialog>` nativo do seletor de validade.
  useEffect(() => {
    const dialog = generatorDialogRef.current;
    if (!dialog) return;
    if (generatorTarget) {
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
  }, [generatorTarget]);

  /**
   * EN: Opens the Validity Selector modal for a company defaulting to 30 days (Monthly).
   * PT: Abre o seletor rápido de dias para a empresa selecionada, com 30 dias (Mensal) selecionado por padrão.
   */
  const handleOpenCodeGenerator = (row: AdminLicenseRow) => {
    setError(null);
    setSelectedDays(30);
    setCustomDaysRaw('30');
    setGeneratorTarget(row);
  };

  /**
   * EN: Updates both the numeric state and raw input when clicking a preset chip.
   * PT: Atualiza os dias selecionados e o campo numérico ao clicar em uma pílula rápida.
   */
  const handleSelectPresetDays = (days: number) => {
    setSelectedDays(days);
    setCustomDaysRaw(String(days));
  };

  /**
   * EN: 1-click cloud renewal (`+30 Dias`) calling `POST /api/admin/licenses/renew`.
   * PT: Renovação rápida na nuvem com 1 clique (`+30 Dias`) via `POST /api/admin/licenses/renew`.
   */
  const handleRenew30Days = async (row: AdminLicenseRow) => {
    setRenewingId(row.companyId);
    setError(null);
    try {
      const updated = await api.renewAdminLicense(row.companyId, 30);
      onNotify(
        `Licença de ${row.tradeName || row.legalName} renovada (+30 dias · até ${formatDateBR(
          updated.validUntil
        )}).`
      );
      await loadLicenses();
      onLicenseChanged?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Erro ao renovar licença da empresa.'
      );
    } finally {
      setRenewingId(null);
    }
  };

  /**
   * EN: Confirms generation of the signed release code for `chosenDays` days, copies it to the clipboard,
   *     closes the selector modal, and displays visual copy feedback + expiration date.
   * PT: Confirma a geração do código assinado para a quantidade de dias escolhida (`chosenDays`),
   *     copia automaticamente para a área de transferência e exibe o feedback visual com a data de validade.
   */
  const handleConfirmGenerateAndCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatorTarget) return;

    const parsedDays = Math.trunc(Number(customDaysRaw));
    const chosenDays = Number.isFinite(parsedDays) && parsedDays >= 1 ? Math.min(3650, parsedDays) : selectedDays;

    const row = generatorTarget;
    setGeneratingId(row.companyId);
    setError(null);

    try {
      const res = await api.generateLicenseCode(row.companyId, chosenDays);
      let copied = false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(res.licenseKey);
          copied = true;
        }
      } catch {
        // Ignore clipboard permission restrictions in headless/non-HTTPS contexts
      }

      setGeneratedCodeInfo({
        companyId: row.companyId,
        companyName: row.tradeName || row.legalName,
        cnpj: row.cnpj,
        licenseKey: res.licenseKey,
        validUntil: res.validUntil,
        days: chosenDays,
        copied,
      });

      setGeneratorTarget(null);

      onNotify(
        copied
          ? `Código ${res.licenseKey} (+${chosenDays} dias · até ${formatDateBR(
              res.validUntil
            )}) gerado e copiado!`
          : `Código gerado (+${chosenDays} dias · até ${formatDateBR(res.validUntil)}): ${res.licenseKey}`
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Erro ao gerar código de liberação de emergência.'
      );
    } finally {
      setGeneratingId(null);
    }
  };

  /**
   * EN: Renders status badge (*Ativa*, *A Vencer*, or *Expirada*).
   * PT: Renderiza o badge visual de status da assinatura (*Ativa*, *A Vencer* ou *Expirada*).
   */
  const renderStatusBadge = (row: AdminLicenseRow) => {
    if (row.isExpired || row.daysRemaining < 0 || row.licenseStatus === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/70">
          <XCircle className="w-3 h-3" aria-hidden="true" />
          Expirada
        </span>
      );
    }
    if (row.daysRemaining <= 5 || row.licenseStatus === 'expiring_soon') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          A Vencer ({row.daysRemaining}d)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/70">
        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
        Ativa ({row.daysRemaining}d)
      </span>
    );
  };

  return (
    <div className="space-y-4" data-testid="admin-licenses-tab">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Generated Emergency Code Card / Destaque Visual do Código Gerado, Cópia e Validade */}
      {generatedCodeInfo && (
        <div
          data-testid="generated-license-card"
          className="rounded-2xl border border-teal-300 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/30 p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>
                Chave de Liberação (+{generatedCodeInfo.days} dias) — {generatedCodeInfo.companyName} ({generatedCodeInfo.cnpj})
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              Válida até <strong data-testid="generated-license-valid-until">{formatDateBR(generatedCodeInfo.validUntil)}</strong> · Envie ao cliente para digitar em <em>Liberação do Sistema</em>:
            </div>
          </div>

          <div className="flex items-center gap-2">
            <code
              data-testid="generated-license-key-value"
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 font-mono-tabular font-bold text-sm tracking-widest text-teal-800 dark:text-teal-300"
            >
              {generatedCodeInfo.licenseKey}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(generatedCodeInfo.licenseKey);
                  setGeneratedCodeInfo((prev) => (prev ? { ...prev, copied: true } : null));
                  onNotify('Código copiado para a área de transferência!');
                } catch {
                  // ignore
                }
              }}
              data-testid="copy-generated-code-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold min-h-[38px] cursor-pointer"
            >
              {generatedCodeInfo.copied ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Licenses Table Card / Tabela de Empresas e Assinaturas */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
              Gestão de Licenças &amp; Assinaturas por Empresa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Renove mensalidades em 1 clique na nuvem ou emita chaves assinadas com validade personalizada para envio pelo WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLicenses}
            aria-label="Atualizar lista de licenças"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                <th scope="col" className="py-3 px-4">Empresa / Razão Social</th>
                <th scope="col" className="py-3 px-4">CNPJ</th>
                <th scope="col" className="py-3 px-4">Vencimento</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {!loading && licenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma empresa encontrada na base.
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => {
                  const isRenewing = renewingId === lic.companyId;
                  const isGenerating = generatingId === lic.companyId;
                  return (
                    <tr
                      key={lic.companyId}
                      data-testid={`license-row-${lic.companyId}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {lic.tradeName || lic.legalName}
                        </div>
                        {lic.tradeName && lic.tradeName !== lic.legalName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {lic.legalName}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-slate-700 dark:text-slate-300">
                        {lic.cnpj}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular font-semibold text-slate-800 dark:text-slate-200">
                        {formatDateBR(lic.validUntil)}
                      </td>
                      <td className="py-3.5 px-4">{renderStatusBadge(lic)}</td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isRenewing}
                            onClick={() => handleRenew30Days(lic)}
                            aria-label={`Adicionar 30 dias para ${lic.tradeName || lic.legalName}`}
                            data-testid={`renew-30d-${lic.companyId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold min-h-[36px] cursor-pointer disabled:opacity-60 transition-colors"
                          >
                            {isRenewing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>+30 Dias</span>
                          </button>

                          <button
                            type="button"
                            disabled={isGenerating}
                            onClick={() => handleOpenCodeGenerator(lic)}
                            aria-label={`Gerar código de liberação para ${lic.tradeName || lic.legalName}`}
                            data-testid={`generate-code-${lic.companyId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold min-h-[36px] cursor-pointer disabled:opacity-60 transition-colors"
                          >
                            {isGenerating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <KeyRound className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                            )}
                            <span>🔑 Gerar Código</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Validity Selector Modal / Popover Rápido de Escolha de Validade para Geração de Código */}
      {generatorTarget && (
        <dialog
          ref={generatorDialogRef}
          aria-labelledby={generatorDialogTitleId}
          {...({ closedby: 'any' } as Record<string, string>)}
          onCancel={() => setGeneratorTarget(null)}
          onClose={() => {
            if (generatorDialogRef.current) {
              generatorDialogRef.current.returnValue = '';
            }
          }}
          data-testid="license-code-generator-modal"
          className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0 text-slate-900 dark:text-slate-100 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-xs open:flex open:flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <h1
                id={generatorDialogTitleId}
                className="text-sm font-display font-bold text-slate-900 dark:text-white"
              >
                Gerar Código de Liberação
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setGeneratorTarget(null)}
              aria-label="Fechar seletor de validade"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleConfirmGenerateAndCopy} className="p-5 space-y-4">
            {/* Target Company Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2.5 text-xs space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-white">
                {generatorTarget.tradeName || generatorTarget.legalName}
              </div>
              <div className="font-mono-tabular text-slate-500 dark:text-slate-400">
                CNPJ: {generatorTarget.cnpj} · Venc. atual: {formatDateBR(generatorTarget.validUntil)}
              </div>
            </div>

            {/* Preset Validity Chips / Pílulas Rápidas de Dias */}
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Escolha o período de liberação:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LICENSE_DAY_PRESETS.map((preset) => {
                  const isActive = Number(customDaysRaw) === preset.days;
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => handleSelectPresetDays(preset.days)}
                      data-testid={`preset-days-${preset.days}`}
                      className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs transition-colors cursor-pointer min-h-[48px] ${
                        isActive
                          ? 'bg-teal-700 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-600 font-semibold shadow-2xs'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-mono-tabular font-bold">{preset.label}</span>
                      <span
                        className={`text-[10px] ${
                          isActive ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {preset.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Numeric Days Input / Campo Numérico Personalizado */}
            <div>
              <label
                htmlFor={customDaysInputId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Ou digite dias personalizados (ex: 45, 60, 180):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={customDaysInputId}
                  type="number"
                  min={1}
                  max={3650}
                  step={1}
                  value={customDaysRaw}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomDaysRaw(val);
                    const num = Math.trunc(Number(val));
                    if (Number.isFinite(num) && num >= 1) {
                      setSelectedDays(Math.min(3650, num));
                    }
                  }}
                  data-testid="custom-days-input"
                  className="w-28 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular font-semibold text-center text-slate-900 dark:text-white min-h-[42px]"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  dia(s) de validade a adicionar na chave
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setGeneratorTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(generatingId)}
                data-testid="confirm-generate-and-copy-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold min-h-[40px] cursor-pointer disabled:opacity-60 transition-colors"
              >
                {generatingId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Gerar e Copiar Código</span>
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
