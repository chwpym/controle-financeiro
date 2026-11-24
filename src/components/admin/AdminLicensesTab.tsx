/**
 * src/components/admin/AdminLicensesTab.tsx
 *
 * EN: "Licenças & Assinaturas" tab in the Master/Admin panel (Phase 10.2).
 *     Displays all client companies, their formatted CNPJs, expiration dates, days remaining,
 *     and status badges (*Ativa*, *A Vencer*, *Expirada*).
 *     Provides 1-click instant cloud renewal (`[ +30 Dias ]`) and emergency signed code generation
 *     (`[ 🔑 Gerar Código ]`) with automatic clipboard copy for WhatsApp customer support.
 *
 * PT: Aba "Licenças & Assinaturas" do Painel Administrativo Master (Fase 10.2).
 *     Lista todas as empresas clientes, seus CNPJs, datas de vencimento, dias restantes e badges
 *     de status (*Ativa*, *A Vencer* ou *Expirada*).
 *     Oferece o botão rápido `[ +30 Dias ]` (renova na hora com 1 clique na nuvem sem código)
 *     e o botão `[ 🔑 Gerar Código ]` (gera e copia chave criptográfica de emergência para envio via WhatsApp).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type { AdminLicenseRow } from '../../types';
import { api, ApiError } from '../../utils/api';
import { formatDateBR } from '../../utils/format';

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
  const [licenses, setLicenses] = useState<AdminLicenseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // EN: Stores the most recently generated emergency release key so Master can also view/copy it visually.
  // PT: Armazena o último código de emergência gerado para exibição visual imediata e cópia rápida.
  const [generatedCodeInfo, setGeneratedCodeInfo] = useState<{
    companyId: string;
    companyName: string;
    cnpj: string;
    licenseKey: string;
    validUntil: string;
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
   * EN: Generates a 30-day signed emergency release key and copies it to the clipboard.
   * PT: Gera um código de liberação assinado (+30 dias) e copia automaticamente para a área de transferência.
   */
  const handleGenerateCode = async (row: AdminLicenseRow) => {
    setGeneratingId(row.companyId);
    setError(null);
    try {
      const res = await api.generateLicenseCode(row.companyId, 30);
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
        copied,
      });

      onNotify(
        copied
          ? `Código ${res.licenseKey} gerado e copiado para enviar ao cliente!`
          : `Código de liberação gerado: ${res.licenseKey}`
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

      {/* Generated Emergency Code Card / Destaque do Código de Emergência Gerado */}
      {generatedCodeInfo && (
        <div
          data-testid="generated-license-card"
          className="rounded-2xl border border-teal-300 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/30 p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>
                Chave de Emergência — {generatedCodeInfo.companyName} ({generatedCodeInfo.cnpj})
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              Válida até <strong>{formatDateBR(generatedCodeInfo.validUntil)}</strong> · Envie ao cliente para digitar em <em>Liberação do Sistema</em>:
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
              Renove mensalidades em 1 clique na nuvem ou emita chaves assinadas para liberação manual pelo WhatsApp.
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
                            onClick={() => handleGenerateCode(lic)}
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
    </div>
  );
};
