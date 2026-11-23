import React from 'react';
import {
  Building2,
  Calendar,
  CreditCard,
  Eye,
  FileText,
  Lock,
  Repeat,
  Tag,
  User,
  X,
} from 'lucide-react';
import type { Category, Company, Contact, Transaction } from '../types';
import { exportTransactionReceiptPDF } from '../utils/exporters';
import { formatBRL, formatDateBR, isOverdue, RECURRENCE_LABELS, todayISO } from '../utils/format';

interface TransactionDetailModalProps {
  transaction: Transaction;
  category?: Category;
  contact?: Contact;
  company?: Company;
  companies?: Company[];
  username: string;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction: tx,
  category,
  contact,
  company,
  companies,
  username,
  onClose,
}) => {
  const today = todayISO();
  const overdue = isOverdue(tx, today);
  const isSettled = tx.status === 'settled';
  const isReceivable = tx.type === 'receivable';

  const resolvedCompany =
    company ||
    (companies
      ? companies.find((c) => c.id === tx.companyId) ||
        companies.find((c) => c.isDefault) ||
        companies[0]
      : undefined);

  const companyAddress = resolvedCompany
    ? [
        [resolvedCompany.street, resolvedCompany.number].filter(Boolean).join(', '),
        resolvedCompany.complement,
        resolvedCompany.neighborhood,
        [resolvedCompany.city, resolvedCompany.state].filter(Boolean).join(' / '),
        resolvedCompany.cep ? `CEP ${resolvedCompany.cep}` : '',
      ]
        .filter(Boolean)
        .join(' — ')
    : '';

  const statusText = isSettled
    ? isReceivable
      ? 'Recebido'
      : 'Pago'
    : overdue
      ? 'Vencido'
      : 'Pendente';

  const originLabel =
    tx.source === 'xml'
      ? 'Importação XML'
      : tx.source === 'excel'
        ? 'Importação Excel'
        : 'Lançamento Manual';

  const contactAddress = contact
    ? [
        [contact.street, contact.number].filter(Boolean).join(', '),
        contact.complement,
        contact.neighborhood,
        [contact.city, contact.state].filter(Boolean).join(' / '),
        contact.cep ? `CEP ${contact.cep}` : '',
      ]
        .filter(Boolean)
        .join(' — ')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Consulta de lançamento em modo somente leitura"
        className="w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Eye className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white truncate">
                Consulta de Lançamento
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Somente leitura — nenhuma alteração pode ser feita aqui</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar consulta"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read-only Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Official Company Header */}
          {resolvedCompany && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {resolvedCompany.logoDataUrl ? (
                  <img
                    src={resolvedCompany.logoDataUrl}
                    alt={resolvedCompany.tradeName}
                    className="max-h-16 max-w-[130px] object-contain rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-1 shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-2xs"
                    style={{ backgroundColor: resolvedCompany.color || '#0F766E' }}
                  >
                    {(resolvedCompany.tradeName || resolvedCompany.legalName || 'E').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Empresa Emitente / Unidade
                  </div>
                  <h3 className="text-sm sm:text-base font-display font-bold text-slate-900 dark:text-white truncate">
                    {resolvedCompany.tradeName || resolvedCompany.legalName}
                  </h3>
                  {resolvedCompany.legalName && resolvedCompany.tradeName && resolvedCompany.legalName !== resolvedCompany.tradeName && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {resolvedCompany.legalName}
                    </p>
                  )}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular flex flex-wrap gap-x-2.5 mt-0.5">
                    {resolvedCompany.document && <span>CNPJ: {resolvedCompany.document}</span>}
                    {resolvedCompany.stateRegistration && <span>IE: {resolvedCompany.stateRegistration}</span>}
                  </div>
                </div>
              </div>

              {companyAddress && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 text-left sm:text-right max-w-xs shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
                  {companyAddress}
                </div>
              )}
            </div>
          )}

          {/* Top Highlight Box */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isReceivable ? 'Conta a Receber' : 'Conta a Pagar'}
                </div>
                <h3 className="mt-0.5 text-base font-display font-bold text-slate-900 dark:text-white">
                  {tx.description}
                </h3>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`text-xl font-display font-bold font-mono-tabular ${
                    isReceivable
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {formatBRL(tx.amountCents)}
                </div>
                <div
                  className={`text-xs font-semibold mt-0.5 ${
                    isSettled
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : overdue
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {statusText}
                </div>
              </div>
            </div>

            {(tx.discountCents > 0 || tx.interestCents > 0) && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs font-mono-tabular">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Original: </span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatBRL(Math.max(1, tx.amountCents + tx.discountCents - tx.interestCents))}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Desconto: </span>
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    - {formatBRL(tx.discountCents)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Juros/Multa: </span>
                  <strong className="text-rose-700 dark:text-rose-400">
                    + {formatBRL(tx.interestCents)}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Data de Vencimento</span>
              </div>
              <div className="text-sm font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {formatDateBR(tx.dueDate)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Data da Baixa</span>
              </div>
              <div className="text-sm font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {tx.paidAt ? formatDateBR(tx.paidAt) : 'Ainda não baixado'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isReceivable ? 'Forma de Recebimento' : 'Forma de Pagamento'}</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {isSettled ? tx.paymentMethod || 'Não informada' : 'Pendente de baixa'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Categoria</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {category && (
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                <span>{category ? category.name : 'Sem categoria'}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
              <div className="text-slate-500 dark:text-slate-400">Parcelamento e Recorrência</div>
              <div className="text-sm font-mono-tabular font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>
                  {tx.installmentTotal > 1
                    ? `Parcela ${tx.installmentNumber} de ${tx.installmentTotal}`
                    : 'À vista (1/1)'}
                </span>
                {tx.isRecurring && (
                  <span className="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400">
                    <Repeat className="w-3.5 h-3.5" />
                    Recorrente ({RECURRENCE_LABELS[tx.recurrenceInterval || 'monthly']})
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
              <div className="text-slate-500 dark:text-slate-400">Documento / NF e Origem</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {tx.documentNumber || 'Sem documento'}{' '}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  · {originLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Linked Contact Block */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {contact?.personType === 'PJ' ? (
                <Building2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              ) : (
                <User className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              )}
              <span>
                {isReceivable ? 'Pagador / Cliente Vinculado' : 'Favorecido / Fornecedor Vinculado'}
              </span>
            </div>

            {contact ? (
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  [{contact.personType}] {contact.name}
                  {contact.tradeName ? ` (${contact.tradeName})` : ''}
                </div>
                {contact.document && (
                  <div className="font-mono-tabular">
                    {contact.personType === 'PJ' ? 'CNPJ' : 'CPF'}: {contact.document}
                  </div>
                )}
                {(contact.phone || contact.email) && (
                  <div>
                    {[contact.phone, contact.email].filter(Boolean).join(' · ')}
                  </div>
                )}
                {contactAddress && (
                  <div className="text-slate-500 dark:text-slate-400">{contactAddress}</div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                Nenhum contato PF/PJ vinculado a este lançamento.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1 text-xs">
            <div className="font-semibold text-slate-700 dark:text-slate-300">Observações</div>
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {tx.notes || 'Nenhuma observação registrada.'}
            </p>
          </div>

          {/* Audit Timestamps */}
          <div className="text-[11px] font-mono-tabular text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1">
            <span>ID: {tx.id.slice(0, 8).toUpperCase()}</span>
            <span>
              Cadastrado em {formatDateBR(tx.createdAt)} · Atualizado em {formatDateBR(tx.updatedAt)}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-50/70 dark:bg-slate-900">
          <button
            type="button"
            onClick={() =>
              exportTransactionReceiptPDF({
                transaction: tx,
                category,
                contact,
                company: resolvedCompany,
                username,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs sm:text-sm font-semibold hover:bg-teal-800 transition-colors min-h-[44px]"
          >
            <FileText className="w-4 h-4" />
            Exportar Recibo (PDF)
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
