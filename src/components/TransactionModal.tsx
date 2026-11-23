import React, { useMemo, useRef, useState } from 'react';
import { Calendar, Layers, Repeat } from 'lucide-react';
import type { Category, Company, Contact, RecurrenceInterval, Transaction, TransactionType } from '../types';
import {
  buildInstallmentTransactions, buildRecurringTransactions, formatDateBR,
  formatInputBRL, parseBRLToCents, PAYMENT_METHODS, todayISO,
} from '../utils/format';
import { DocumentTagsInput, InstallmentSection, parseDocumentTags, RecurrenceSection } from './transaction-modal';
import { Modal } from './ui/Modal';

interface TransactionModalProps {
  userId: string;
  editingTransaction: Transaction | null;
  categories: Category[];
  contacts: Contact[];
  companies?: Company[];
  selectedCompanyId?: string | 'all';
  onClose: () => void;
  onSaveBatch: (items: Transaction[]) => void;
  onUpdateSingle: (item: Transaction) => void;
}

const INPUT_CLS = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[44px]';
const DATE_INPUT_CLS = `${INPUT_CLS} pl-10 font-mono-tabular dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0`;

export const TransactionModal: React.FC<TransactionModalProps> = ({
  userId,
  editingTransaction,
  categories,
  contacts,
  companies = [],
  selectedCompanyId = 'all',
  onClose,
  onSaveBatch,
  onUpdateSingle,
}) => {
  const isEditing = Boolean(editingTransaction);
  const activeCompanies = useMemo(
    () => companies.filter((c) => c.status === 'active'),
    [companies]
  );

  const defaultCompanyId = useMemo(() => {
    if (editingTransaction?.companyId) return editingTransaction.companyId;
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      const match = activeCompanies.find((c) => c.id === selectedCompanyId);
      if (match) return match.id;
    }
    const def = activeCompanies.find((c) => c.isDefault);
    if (def) return def.id;
    return activeCompanies[0]?.id || '';
  }, [editingTransaction, selectedCompanyId, activeCompanies]);

  const [companyId, setCompanyId] = useState<string>(defaultCompanyId);
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || 'payable');
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [amountRaw, setAmountRaw] = useState(editingTransaction ? formatInputBRL(editingTransaction.amountCents) : '');
  const [dueDate, setDueDate] = useState(editingTransaction?.dueDate || todayISO());
  const [categoryId, setCategoryId] = useState(editingTransaction?.categoryId || '');
  const [contactId, setContactId] = useState(editingTransaction?.contactId || '');
  const [documentTags, setDocumentTags] = useState<string[]>(() => parseDocumentTags(editingTransaction?.documentNumber));
  const [issueDate, setIssueDate] = useState(editingTransaction?.issueDate || '');
  const [notes, setNotes] = useState(editingTransaction?.notes || '');
  const [status, setStatus] = useState<'pending' | 'settled'>(editingTransaction?.status || 'pending');
  const [paymentMethod, setPaymentMethod] = useState<string>(editingTransaction?.paymentMethod || 'PIX');

  const [entryMode, setEntryMode] = useState<'installment' | 'recurring'>(editingTransaction?.isRecurring ? 'recurring' : 'installment');
  const [installments, setInstallments] = useState<number>(1);
  const [installmentsLimitExceeded, setInstallmentsLimitExceeded] = useState<boolean>(false);
  const [amountMode, setAmountMode] = useState<'total' | 'per_installment'>('total');
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(editingTransaction?.recurrenceInterval || 'monthly');
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState<number>(6);
  const [markFirstSettled, setMarkFirstSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const issueDateInputRef = useRef<HTMLInputElement>(null);
  const filteredCategories = useMemo(() => categories.filter((c) => c.type === 'both' || c.type === type), [categories, type]);
  const parsedCents = useMemo(() => parseBRLToCents(amountRaw), [amountRaw]);

  const isIssueAfterDue = Boolean(issueDate && dueDate && dueDate < issueDate);
  const isIssueInFuture = Boolean(issueDate && issueDate > todayISO());

  const renderDateField = (
    label: string, value: string, onChange: (v: string) => void,
    ref: React.RefObject<HTMLInputElement | null>, ariaLabel: string, id?: string
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <button
          type="button" title="Abrir calendário" aria-label={ariaLabel}
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            try { if (typeof el.showPicker === 'function') { el.showPicker(); return; } } catch { /* fallback */ }
            el.focus();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 absolute left-2 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
        </button>
        <input ref={ref} id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} className={DATE_INPUT_CLS} />
      </div>
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!description.trim()) return setError('Informe a descrição do lançamento.');
    if (parsedCents <= 0) return setError('Informe um valor válido em R$ maior que zero.');
    if (!dueDate) return setError('Informe a data de vencimento.');
    if (!isEditing && entryMode === 'installment' && installmentsLimitExceeded) {
      return setError('A quantidade de parcelas excede o limite padrão de 420x (35 anos). Ajuste para até 420 parcelas ou contate o suporte.');
    }

    const pendingDoc = (document.getElementById('tx-document-number') as HTMLInputElement | null)?.value;
    const unifiedDoc = Array.from(new Set([...documentTags, ...parseDocumentTags(pendingDoc)])).join(', ');

    if (isEditing && editingTransaction) {
      onUpdateSingle({
        ...editingTransaction,
        companyId: companyId || null,
        type, description: description.trim(), amountCents: parsedCents, dueDate, status,
        paidAt: status === 'settled' ? editingTransaction.paidAt || todayISO() : null,
        paymentMethod: status === 'settled' ? paymentMethod || 'PIX' : '',
        categoryId: categoryId || null, contactId: contactId || null,
        documentNumber: unifiedDoc, issueDate: issueDate || null,
        isRecurring: entryMode === 'recurring',
        recurrenceInterval: entryMode === 'recurring' ? recurrenceInterval : null,
        notes: notes.trim(), updatedAt: new Date().toISOString(),
      });
      return onClose();
    }

    const common = {
      userId, companyId: companyId || null, type, description, amountCents: parsedCents, firstDueDate: dueDate,
      categoryId: categoryId || null, contactId: contactId || null,
      documentNumber: unifiedDoc, issueDate: issueDate || null, notes,
      markFirstSettled, paymentMethod: markFirstSettled ? paymentMethod : '',
    };
    const items = entryMode === 'recurring'
      ? buildRecurringTransactions({ ...common, interval: recurrenceInterval, occurrences: recurrenceOccurrences })
      : buildInstallmentTransactions({ ...common, amountMode, installments });
    onSaveBatch(items);
    onClose();
  };

  const submitLabel = isEditing
    ? 'Salvar alterações'
    : entryMode === 'recurring' ? `Salvar recorrente (${recurrenceOccurrences}x)`
      : installments > 1 ? `Gerar ${installments} parcelas` : 'Salvar lançamento';

  return (
    <Modal
      isOpen onClose={onClose} size="xl"
      title={isEditing ? 'Editar Lançamento' : 'Novo Lançamento (BRL)'}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] cursor-pointer">Cancelar</button>
          <button type="submit" form="transaction-modal-form" className="px-5 py-2 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors min-h-[44px] cursor-pointer">{submitLabel}</button>
        </>
      }
    >
      <form id="transaction-modal-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">{error}</div>}

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button type="button" onClick={() => setType('payable')} className={`py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] cursor-pointer ${type === 'payable' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Conta a Pagar (Despesa)</button>
          <button type="button" onClick={() => setType('receivable')} className={`py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] cursor-pointer ${type === 'receivable' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Conta a Receber (Receita)</button>
        </div>

        {!isEditing && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button type="button" onClick={() => setEntryMode('installment')} className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer ${entryMode === 'installment' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>
              <Layers className="w-3.5 h-3.5" /><span>Único ou Parcelado</span>
            </button>
            <button type="button" onClick={() => setEntryMode('recurring')} className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer ${entryMode === 'recurring' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>
              <Repeat className="w-3.5 h-3.5" /><span>Conta Recorrente / Fixa</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={entryMode === 'recurring' ? 'Ex: Energia Elétrica, Água, Licença ERP / Software' : type === 'payable' ? 'Ex: Aluguel, Fornecedor de embalagens' : 'Ex: Venda de serviço, Mensalidade cliente'} className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Valor em R$ (BRL) *</label>
            <input type="text" inputMode="decimal" value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} placeholder="0,00" className={`${INPUT_CLS} font-mono-tabular`} />
          </div>
          {renderDateField(isEditing || (entryMode === 'installment' && installments === 1) ? 'Data de vencimento *' : '1º vencimento *', dueDate, setDueDate, dueDateInputRef, 'Abrir calendário de vencimento')}
        </div>

        {!isEditing && entryMode === 'installment' && (
          <InstallmentSection type={type} dueDate={dueDate} parsedCents={parsedCents} installments={installments} onInstallmentsChange={setInstallments} installmentsLimitExceeded={installmentsLimitExceeded} onLimitExceededChange={setInstallmentsLimitExceeded} amountMode={amountMode} onAmountModeChange={setAmountMode} markFirstSettled={markFirstSettled} onMarkFirstSettledChange={setMarkFirstSettled} paymentMethod={paymentMethod} onPaymentMethodChange={setPaymentMethod} />
        )}
        {!isEditing && entryMode === 'recurring' && (
          <RecurrenceSection type={type} description={description} onSelectTemplate={setDescription} dueDate={dueDate} parsedCents={parsedCents} recurrenceInterval={recurrenceInterval} onRecurrenceIntervalChange={setRecurrenceInterval} recurrenceOccurrences={recurrenceOccurrences} onRecurrenceOccurrencesChange={setRecurrenceOccurrences} markFirstSettled={markFirstSettled} onMarkFirstSettledChange={setMarkFirstSettled} paymentMethod={paymentMethod} onPaymentMethodChange={setPaymentMethod} />
        )}

        {isEditing && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'pending' | 'settled')} className={INPUT_CLS}>
                  <option value="pending">Pendente</option>
                  <option value="settled">{type === 'receivable' ? 'Recebido' : 'Pago'}</option>
                </select>
              </div>
              {status === 'settled' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{type === 'receivable' ? 'Forma de recebimento' : 'Forma de pagamento'}</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={INPUT_CLS}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={entryMode === 'recurring'} onChange={(e) => setEntryMode(e.target.checked ? 'recurring' : 'installment')} className="rounded border-slate-300 text-teal-700 w-4 h-4" />
                <span>Conta Recorrente / Fixa (renova ao dar baixa)</span>
              </label>
              {entryMode === 'recurring' && (
                <select value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[36px]">
                  <option value="monthly">Mensal</option><option value="biweekly">Quinzenal</option><option value="yearly">Anual</option>
                </select>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              🏢 Empresa
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={INPUT_CLS}
              data-testid="tx-company-select"
            >
              <option value="">Nenhuma / Sem vínculo</option>
              {activeCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName || c.legalName} {c.isDefault ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={INPUT_CLS}>
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente / Fornecedor (PF ou PJ)</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={INPUT_CLS}>
              <option value="">Não vinculado</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>[{c.personType}] {c.name}</option>)}
            </select>
          </div>
          <DocumentTagsInput tags={documentTags} onChange={setDocumentTags} />
          {renderDateField('Data de Entrada / Emissão NF', issueDate, setIssueDate, issueDateInputRef, 'Abrir calendário de emissão', 'tx-issue-date')}
          {(isIssueAfterDue || isIssueInFuture) && (
            <div className="sm:col-span-2 space-y-2" role="status">
              {isIssueAfterDue && <p className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-200">⚠️ Atenção: A emissão da NF ({formatDateBR(issueDate)}) é posterior ao vencimento ({formatDateBR(dueDate)}). Isso caracteriza pagamento antecipado / adiantamento.</p>}
              {isIssueInFuture && <p className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-200">⚠️ A data de emissão informada está no futuro.</p>}
            </div>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="tx-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
            <input id="tx-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className={INPUT_CLS} />
          </div>
        </div>
      </form>
    </Modal>
  );
};
