/**
 * EN: Ultra-Clean Fiscal Validation Card for NF-e & NFS-e Import (v1.11.0).
 *     1. Eliminates the redundant "Your Company" box and middle arrow — the top emerald pill
 *        already clearly shows `✅ Vinculado à empresa: ...`.
 *     2. Renders ONLY a single compact horizontal card for the Counterparty (Supplier on purchase,
 *        Customer on sale) with Legal/Trade Name, formatted CNPJ/CPF, City/UF, and either
 *        `[ + Cadastrar Fornecedor/Cliente ]` or a discreet `✓ Vinculado aos Contatos` badge,
 *        freeing >120px of vertical height so installments stay visible without scrolling.
 *     3. Keeps the Strict SEFAZ Two-Agent Fiscal Security Lock when neither CNPJ matches a
 *        registered company.
 * PT: Card Ultra-Clean de Validação Fiscal para Importação de NF-e e NFS-e (v1.11.0).
 *     1. Remove a caixa redundante da "Sua Empresa" e a seta central, mantendo a pílula verde no topo.
 *     2. Renderiza apenas um card horizontal compacto do Terceiro (Fornecedor na compra ou Cliente na venda)
 *        com Nome/Razão Social, CNPJ/CPF formatado, Cidade/UF e botão `[ + Cadastrar Fornecedor/Cliente ]`
 *        ou badge discreto `✓ Vinculado aos Contatos`, liberando mais de 120px de altura vertical.
 *     3. Mantém a Trava Rígida de Segurança Fiscal (SEFAZ) quando nenhum CNPJ pertencer às suas empresas.
 */

import React from 'react';
import {
  Building2,
  CheckCircle2,
  MapPin,
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
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2"
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
  const triggerRegisterContact = onOpenContactModal || onAutoCreateContact;

  const issuerName =
    analysis.kind === 'nfe'
      ? analysis.supplierName || analysis.supplierTradeName
      : analysis.providerName;
  const issuerDoc =
    analysis.kind === 'nfe' ? analysis.supplierDocument : analysis.providerDocument;
  const issuerAddress =
    analysis.kind === 'nfe' ? analysis.supplierAddress : analysis.providerAddress;

  const recipientName =
    analysis.customerName || (analysis.kind === 'nfe' ? analysis.customerTradeName : '');
  const recipientDoc = analysis.customerDocument;
  const recipientAddress = analysis.customerAddress;

  // Counterparty is the Issuer (Supplier) on Purchases (`recipient`), or Recipient (Customer) on Sales (`issuer`)
  // O Terceiro é o Emitente (Fornecedor) na Compra, ou o Destinatário (Cliente) na Venda
  const isSale = matchedRole === 'issuer' || txType === 'receivable';
  const counterpartyLabel = isSale ? 'Cliente (Destinatário)' : 'Fornecedor (Emitente)';
  const counterpartyName = isSale ? recipientName : issuerName;
  const counterpartyDoc = isSale ? recipientDoc : issuerDoc;
  const counterpartyAddr = isSale ? recipientAddress : issuerAddress;
  const counterpartyCityUf =
    counterpartyAddr.city && counterpartyAddr.state
      ? `${counterpartyAddr.city}/${counterpartyAddr.state}`
      : counterpartyAddr.city || counterpartyAddr.state || '';

  // Strict Fiscal Security Lock when NEITHER CNPJ matches a registered company
  // Trava Rígida de Segurança Fiscal quando nenhum dos dois CNPJs pertence a uma empresa sua
  if (isBlocked) {
    return (
      <div
        data-testid="xml-fiscal-validation-card"
        className="rounded-2xl border border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/25 p-3.5 text-xs space-y-2.5 overflow-hidden"
      >
        <div
          role="alert"
          data-testid="xml-fiscal-security-lock"
          className="space-y-2.5 text-rose-950 dark:text-rose-100"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-700 dark:text-rose-400 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-xs sm:text-sm">
                🛑 Trava de Segurança Fiscal: Nota não reconhecida
              </div>
              <p className="text-xs leading-relaxed text-rose-900 dark:text-rose-200">
                Nem o Emitente (<strong>{formatDocDisplay(issuerDoc)}</strong>) nem o Destinatário (
                <strong>{formatDocDisplay(recipientDoc)}</strong>) correspondem a uma empresa sua cadastrada. Uma nota fiscal só pode ser importada para a empresa que a emitiu ou comprou.
              </p>
              <p className="text-xs font-medium text-rose-900 dark:text-rose-200">
                Cadastre sua empresa primeiro em <strong>Minhas Empresas</strong> para prosseguir.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
      </div>
    );
  }

  // Ultra-Clean Matched State: Top Company Pill + Single Horizontal Counterparty Card
  // Estado Reconhecido Ultra-Clean: Pílula da Empresa no topo + Card Horizontal Único do Terceiro
  return (
    <div
      data-testid="xml-fiscal-validation-card"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 text-xs space-y-2.5 overflow-hidden"
    >
      {/* Top Status Bar: Matched Own Company Pill + Operation Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        {matchedCompany && (
          <span
            data-testid="xml-matched-company-pill"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 max-w-full min-w-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span className="truncate">
              ✅ Vinculado à empresa: {matchedCompany.tradeName || matchedCompany.legalName}
            </span>
          </span>
        )}

        <span
          data-testid="xml-operation-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
            isSale ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {isSale ? '🟢 Conta a Receber' : '🔴 Conta a Pagar'}
        </span>
      </div>

      {/* Single Compact Horizontal Counterparty Card (Supplier or Customer only) */}
      <div
        data-testid="xml-counterparty-card"
        className="min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                isSale
                  ? 'text-teal-700 dark:text-teal-400'
                  : 'text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {counterpartyLabel}
            </span>
          </div>

          <div
            className="font-semibold text-sm text-slate-900 dark:text-white truncate"
            title={counterpartyName || 'Não identificado'}
          >
            {counterpartyName || 'Não identificado'}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-mono-tabular">{formatDocDisplay(counterpartyDoc)}</span>
            {counterpartyCityUf && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                <span>{counterpartyCityUf}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Action: Discreet Bound Badge OR [+ Cadastrar Fornecedor/Cliente] */}
        <div className="shrink-0 flex items-center">
          {isContactBound ? (
            <span
              data-testid="xml-contact-bound-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 max-w-[220px]"
              title={boundContactName ? `Vinculado: ${boundContactName}` : 'Vinculado aos Contatos'}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">✓ Vinculado aos Contatos</span>
            </span>
          ) : (
            <button
              type="button"
              disabled={isCreatingContact}
              onClick={triggerRegisterContact}
              data-testid={isSale ? 'xml-register-customer-btn' : 'xml-register-supplier-btn'}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors min-h-[36px] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isCreatingContact
                  ? 'Cadastrando...'
                  : isSale
                    ? '+ Cadastrar Cliente'
                    : '+ Cadastrar Fornecedor'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
