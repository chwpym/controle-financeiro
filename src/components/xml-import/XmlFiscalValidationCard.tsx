/**
 * EN: Strict Two-Agent Fiscal Validation Card for NF-e & NFS-e Import (v1.11.0).
 *     1. Prevents visual overflow on long legal names via `min-w-0` + `overflow-hidden` + `truncate`.
 *     2. Enforces the strict SEFAZ Two-Agent Rule: an invoice only exists between Issuer and Recipient.
 *        Eliminates arbitrary third-party company dropdowns.
 *     3. When neither CNPJ matches a registered company, displays the hard Fiscal Security Lock
 *        with `[ 🏢 Ir para Minhas Empresas ]` and `[ Cancelar ]`, hiding contact creation buttons.
 *     4. When matched:
 *        - Recipient = Your Company -> badge `🏢 Sua Empresa (Compradora)` + `[ + Cadastrar Fornecedor ]` on Issuer.
 *        - Issuer = Your Company -> badge `🏢 Sua Empresa (Vendedora)` + `[ + Cadastrar Cliente ]` on Recipient.
 * PT: Card de Validação Fiscal Estrita de Dois Agentes para NF-e e NFS-e (v1.11.0).
 *     1. Elimina vazamento de layout em nomes longos com `min-w-0` + `overflow-hidden` + `truncate`.
 *     2. Aplica a Regra Estrita de Dois Agentes (SEFAZ): sem dropdown de empresa terceira arbitrária.
 *     3. Se nenhum CNPJ for reconhecido, exibe a Trava de Segurança Fiscal com `[ 🏢 Ir para Minhas Empresas ]`
 *        e `[ Cancelar ]`, ocultando botões de cadastro de Fornecedor/Cliente.
 *     4. Quando reconhecido: exibe `🏢 Sua Empresa (Compradora/Vendedora)` e o botão `[ + Cadastrar Fornecedor/Cliente ]`
 *        exclusivamente na contraparte correta.
 */

import React from 'react';
import {
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
  companies?: Company[];
  txType: TransactionType;
  onChangeTxType?: (type: TransactionType) => void;
  isContactBound: boolean;
  boundContactName?: string;
  isCreatingContact: boolean;
  onAutoCreateContact: () => void;
  onOpenContactModal?: () => void;
  onNavigateToCompanies?: () => void;
  onCancel?: () => void;
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
  txType,
  onChangeTxType,
  isContactBound,
  boundContactName,
  isCreatingContact,
  onAutoCreateContact,
  onOpenContactModal,
  onNavigateToCompanies,
  onCancel,
}) => {
  const isGeneric = analysis.kind === 'generic';

  // Generic XML header (non-fiscal) / Cabeçalho simples para XML genérico
  if (isGeneric) {
    return (
      <div
        data-testid="xml-fiscal-validation-card"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-xs flex flex-wrap items-center justify-between gap-2"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-slate-200/70 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>Mapeamento de XML Genérico</span>
        </span>

        {onChangeTxType && (
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
        )}
      </div>
    );
  }

  const matchedRole = detection?.matchedRole || 'none';
  const isBlocked = matchedRole === 'none' || !detection?.matchedCompany;
  const matchedCompany = detection?.matchedCompany || null;

  const issuerDisplayName =
    analysis.kind === 'nfe'
      ? analysis.supplierName || analysis.supplierTradeName
      : analysis.providerName;
  const issuerDoc =
    analysis.kind === 'nfe' ? analysis.supplierDocument : analysis.providerDocument;

  const recipientDisplayName = analysis.customerName || (analysis.kind === 'nfe' ? analysis.customerTradeName : '');
  const recipientDoc = analysis.customerDocument;

  const triggerRegisterContact = onOpenContactModal || onAutoCreateContact;

  return (
    <div
      data-testid="xml-fiscal-validation-card"
      className={`rounded-2xl border p-4 text-xs space-y-3 overflow-hidden transition-colors ${
        isBlocked
          ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/25'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
      }`}
    >
      {/* Top Status Bar when Company IS Matched */}
      {!isBlocked && matchedCompany && (
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 max-w-full min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span className="truncate">
              Vinculado à empresa: {matchedCompany.tradeName || matchedCompany.legalName}
            </span>
          </span>

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
              txType === 'receivable'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {txType === 'receivable'
              ? 'Conta a Receber (Venda)'
              : 'Conta a Pagar (Compra)'}
          </span>
        </div>
      )}

      {/* Issuer (Seller) vs Recipient (Buyer) Responsive Grid — Overflow-Safe (`min-w-0 overflow-hidden`) */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2.5 min-w-0">
        {/* Card 1: Emitente (Vendedor / Prestador) */}
        <div
          data-testid="xml-issuer-card"
          className={`min-w-0 overflow-hidden rounded-xl border p-3 bg-white dark:bg-slate-900/90 flex flex-col justify-between gap-2 ${
            matchedRole === 'issuer'
              ? 'border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                Emitente (Vendedor)
              </span>

              {matchedRole === 'issuer' ? (
                <span
                  data-testid="xml-badge-own-seller"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 shrink-0"
                >
                  🏢 Sua Empresa (Vendedora)
                </span>
              ) : matchedRole === 'recipient' ? (
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                  Fornecedor
                </span>
              ) : null}
            </div>

            <div
              className="font-semibold text-slate-900 dark:text-white truncate"
              title={issuerDisplayName || 'Não identificado'}
            >
              {issuerDisplayName || 'Não identificado'}
            </div>

            <div className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {formatDocDisplay(issuerDoc)}
            </div>
          </div>

          {/* Counterparty action ONLY on Issuer when Recipient is Your Company (Payable) */}
          {matchedRole === 'recipient' && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 min-w-0">
              {isContactBound ? (
                <span
                  data-testid="xml-supplier-bound-badge"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 max-w-full min-w-0"
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Fornecedor vinculado{boundContactName ? `: ${boundContactName}` : ''}
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isCreatingContact}
                  onClick={triggerRegisterContact}
                  data-testid="xml-register-supplier-btn"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isCreatingContact ? 'Cadastrando...' : '+ Cadastrar Fornecedor'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Directional Arrow */}
        <div className="hidden sm:flex items-center justify-center text-slate-400 shrink-0 px-0.5">
          <ArrowRight className="w-4 h-4" />
        </div>

        {/* Card 2: Destinatário (Comprador / Tomador) */}
        <div
          data-testid="xml-recipient-card"
          className={`min-w-0 overflow-hidden rounded-xl border p-3 bg-white dark:bg-slate-900/90 flex flex-col justify-between gap-2 ${
            matchedRole === 'recipient'
              ? 'border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                Destinatário (Comprador)
              </span>

              {matchedRole === 'recipient' ? (
                <span
                  data-testid="xml-badge-own-buyer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 shrink-0"
                >
                  🏢 Sua Empresa (Compradora)
                </span>
              ) : matchedRole === 'issuer' ? (
                <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 shrink-0">
                  Cliente
                </span>
              ) : null}
            </div>

            <div
              className="font-semibold text-slate-900 dark:text-white truncate"
              title={recipientDisplayName || 'Não identificado'}
            >
              {recipientDisplayName || 'Não identificado'}
            </div>

            <div className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {formatDocDisplay(recipientDoc)}
            </div>
          </div>

          {/* Counterparty action ONLY on Recipient when Issuer is Your Company (Receivable) */}
          {matchedRole === 'issuer' && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 min-w-0">
              {isContactBound ? (
                <span
                  data-testid="xml-customer-bound-badge"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 max-w-full min-w-0"
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Cliente vinculado{boundContactName ? `: ${boundContactName}` : ''}
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isCreatingContact}
                  onClick={triggerRegisterContact}
                  data-testid="xml-register-customer-btn"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isCreatingContact ? 'Cadastrando...' : '+ Cadastrar Cliente'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Strict Fiscal Security Lock Alert when NEITHER CNPJ matches a registered company */}
      {isBlocked && (
        <div
          role="alert"
          data-testid="xml-fiscal-security-lock"
          className="rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 p-3.5 space-y-3 text-rose-950 dark:text-rose-100"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-700 dark:text-rose-400 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-xs sm:text-sm">
                🛑 Trava de Segurança Fiscal: Nota não reconhecida
              </div>
              <p className="text-xs leading-relaxed text-rose-900 dark:text-rose-200">
                Nem o Emitente nem o Destinatário correspondem a uma empresa sua cadastrada. Uma nota fiscal só pode ser importada para a empresa que a emitiu ou comprou.
              </p>
              <p className="text-xs font-medium text-rose-900 dark:text-rose-200">
                Cadastre sua empresa primeiro em <strong>Minhas Empresas</strong> para prosseguir.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onNavigateToCompanies && (
              <button
                type="button"
                onClick={onNavigateToCompanies}
                data-testid="xml-go-to-companies-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-colors min-h-[38px] cursor-pointer shadow-2xs"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>🏢 Ir para Minhas Empresas</span>
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                data-testid="xml-lock-cancel-btn"
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-900 dark:text-rose-200 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors min-h-[38px] cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
