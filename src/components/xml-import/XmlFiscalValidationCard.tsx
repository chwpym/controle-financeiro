/**
 * EN: Fiscal Validation Card for NF-e & NFS-e Import (Phase 11.1).
 *     Displays side-by-side Issuer (Seller/Provider) vs Recipient (Buyer/Customer),
 *     fiscal CNPJ match status against registered companies, Safety Lock alert when
 *     no company CNPJ matches, company selector dropdown, Payable/Receivable toggle,
 *     and a non-destructive [+ Cadastrar Fornecedor/Cliente] shortcut.
 * PT: Card de Validação Fiscal Inteligente para Importação de NF-e e NFS-e (Fase 11.1).
 *     Exibe lado a lado Emitente (Vendedor/Prestador) vs Destinatário (Comprador/Tomador),
 *     badge de vínculo fiscal com empresas cadastradas, Card de Alerta com Trava de Segurança
 *     quando nenhum CNPJ é reconhecido, seletor de empresa, Pagar/Receber e atalho de cadastro.
 */

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { Company, TransactionType } from '../../types';
import { maskCNPJ, maskCPF } from '../../utils/format';
import type { XmlAnalysisResult, XmlOperationDetection } from '../../utils/xmlParser';

export interface XmlFiscalValidationCardProps {
  analysis: XmlAnalysisResult;
  detection: XmlOperationDetection | null;
  companies: Company[];
  companyId: string;
  onChangeCompanyId: (companyId: string) => void;
  txType: TransactionType;
  onChangeTxType: (type: TransactionType) => void;
  isContactBound: boolean;
  boundContactName?: string;
  isCreatingContact: boolean;
  onAutoCreateContact: () => void;
  onOpenContactModal?: () => void;
}

function formatDocDisplay(raw: string): string {
  if (!raw) return 'Sem CPF/CNPJ';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) return maskCPF(digits);
  if (raw.replace(/[^A-Za-z0-9]/g, '').length === 14) return maskCNPJ(raw);
  return raw;
}

export const XmlFiscalValidationCard: React.FC<XmlFiscalValidationCardProps> = ({
  analysis,
  detection,
  companies,
  companyId,
  onChangeCompanyId,
  txType,
  onChangeTxType,
  isContactBound,
  boundContactName,
  isCreatingContact,
  onAutoCreateContact,
  onOpenContactModal,
}) => {
  const activeCompanies = companies.filter((c) => c.status === 'active');
  const selectableCompanies = activeCompanies.length > 0 ? activeCompanies : companies;

  const isGeneric = analysis.kind === 'generic';
  const isUnmatchedCompany = !isGeneric && (!detection || detection.matchedRole === 'none');
  const selectedCompanyObj = selectableCompanies.find((c) => c.id === companyId) || detection?.matchedCompany;

  const issuerName =
    analysis.kind === 'nfe'
      ? analysis.supplierTradeName || analysis.supplierName
      : analysis.kind === 'nfse'
        ? analysis.providerName
        : 'XML Genérico';
  const issuerLegalName =
    analysis.kind === 'nfe' ? analysis.supplierName : analysis.kind === 'nfse' ? analysis.providerName : '';
  const issuerDoc =
    analysis.kind === 'nfe'
      ? analysis.supplierDocument
      : analysis.kind === 'nfse'
        ? analysis.providerDocument
        : '';

  const recipientName =
    analysis.kind === 'nfe'
      ? analysis.customerTradeName || analysis.customerName
      : analysis.kind === 'nfse'
        ? analysis.customerName
        : '—';
  const recipientLegalName = analysis.kind !== 'generic' ? analysis.customerName : '';
  const recipientDoc = analysis.kind !== 'generic' ? analysis.customerDocument : '';

  const roleActionLabel = txType === 'receivable' ? 'Cliente' : 'Fornecedor';

  return (
    <div
      data-testid="xml-fiscal-validation-card"
      className={`rounded-2xl border p-4 text-xs space-y-3 transition-colors ${
        isUnmatchedCompany
          ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/60 dark:bg-amber-950/25'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
      }`}
    >
      {/* Top Status Row: Fiscal Badge + Operation Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!isUnmatchedCompany && selectedCompanyObj ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span>
                ✅ Vinculado à empresa: {selectedCompanyObj.tradeName || selectedCompanyObj.legalName}
              </span>
            </span>
          ) : isGeneric ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-slate-200/70 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Mapeamento de XML Genérico</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-amber-200/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
              <span>⚠️ CNPJ não cadastrado em Minhas Empresas (Trava de Segurança)</span>
            </span>
          )}

          {isContactBound && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-medium bg-teal-100/80 text-teal-900 dark:bg-teal-950/60 dark:text-teal-300">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[180px]">
                {roleActionLabel}: {boundContactName || 'Vinculado'}
              </span>
            </span>
          )}
        </div>

        {/* Payable vs Receivable Compact Pill Selector */}
        <div
          role="group"
          aria-label="Tipo da operação financeira"
          className="inline-flex p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-700"
        >
          <button
            type="button"
            onClick={() => onChangeTxType('payable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              txType === 'payable'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Conta a Pagar
          </button>
          <button
            type="button"
            onClick={() => onChangeTxType('receivable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              txType === 'receivable'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Conta a Receber
          </button>
        </div>
      </div>

      {/* Issuer (Seller) vs Recipient (Buyer) Visual Comparison */}
      {!isGeneric && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          {/* Issuer Box */}
          <div
            className={`rounded-xl border p-2.5 bg-white dark:bg-slate-900/80 ${
              detection?.matchedRole === 'issuer'
                ? 'border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/30'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Emitente (Vendedor)
              </span>
              {detection?.matchedRole === 'issuer' ? (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  Sua Empresa
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Fornecedor
                </span>
              )}
            </div>
            <div
              className="font-semibold text-slate-900 dark:text-white truncate"
              title={issuerLegalName || issuerName}
            >
              {issuerName || 'Não identificado'}
            </div>
            <div className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDocDisplay(issuerDoc)}
            </div>
          </div>

          {/* Directional Arrow */}
          <div className="hidden sm:flex items-center justify-center text-slate-400">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Recipient Box */}
          <div
            className={`rounded-xl border p-2.5 bg-white dark:bg-slate-900/80 ${
              detection?.matchedRole === 'recipient'
                ? 'border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/30'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Destinatário (Comprador)
              </span>
              {detection?.matchedRole === 'recipient' ? (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  Sua Empresa
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                  Cliente
                </span>
              )}
            </div>
            <div
              className="font-semibold text-slate-900 dark:text-white truncate"
              title={recipientLegalName || recipientName}
            >
              {recipientName || 'Não identificado'}
            </div>
            <div className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDocDisplay(recipientDoc)}
            </div>
          </div>
        </div>
      )}

      {/* Safety Alert Message when neither CNPJ belongs to registered companies */}
      {isUnmatchedCompany && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 px-3 py-2 text-[11px] text-amber-950 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
          <div>
            Nenhum dos CNPJs desta nota corresponde às suas empresas cadastradas. Confira abaixo a{' '}
            <strong>Empresa de Destino</strong> e confirme se é <strong>Conta a Pagar</strong> ou{' '}
            <strong>Conta a Receber</strong> antes de concluir.
          </div>
        </div>
      )}

      {/* Bottom Controls: Company Binding Dropdown + Counterparty Registration Shortcut */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 pt-1">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="xml-company-select"
            className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            🏢 Empresa vinculada ao lançamento {selectableCompanies.length > 0 ? '*' : ''}
          </label>
          <select
            id="xml-company-select"
            data-testid="xml-company-select"
            value={companyId}
            onChange={(e) => onChangeCompanyId(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs font-medium min-h-[38px] ${
              isUnmatchedCompany && !companyId && selectableCompanies.length > 0
                ? 'border-amber-500 ring-1 ring-amber-500/40'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <option value="">
              {selectableCompanies.length > 0
                ? 'Selecione a empresa...'
                : 'Sem empresa cadastrada (vincular geral)'}
            </option>
            {selectableCompanies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.tradeName || comp.legalName}
                {comp.document ? ` (${formatDocDisplay(comp.document)})` : ''}
                {comp.isDefault ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Counterparty Register Buttons (without closing or losing XML state) */}
        {!isGeneric && !isContactBound && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {onOpenContactModal && (
              <button
                type="button"
                onClick={onOpenContactModal}
                data-testid="xml-open-contact-modal-btn"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-600/40 dark:border-teal-500/40 bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/50 min-h-[38px] cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Cadastrar {roleActionLabel}</span>
              </button>
            )}
            <button
              type="button"
              disabled={isCreatingContact}
              onClick={onAutoCreateContact}
              data-testid="xml-quick-create-contact-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 min-h-[38px] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>
                {isCreatingContact
                  ? 'Vinculando...'
                  : onOpenContactModal
                    ? 'Cadastro Rápido (1-Clique)'
                    : `+ Cadastrar ${roleActionLabel}`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
