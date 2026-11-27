import React, { useMemo } from 'react';
import type { Contact, Transaction } from '../../types';
import { InstallmentSplitScenarioA } from './InstallmentSplitScenarioA';
import { InstallmentRenegotiateScenarioB } from './InstallmentRenegotiateScenarioB';

export interface InstallmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  transactions: Transaction[];
  contacts: Contact[];
  onApplyRenegotiation: (toDeleteIds: string[], toUpsert: Transaction[]) => void;
}

const stripInstallmentSuffix = (desc: string) => desc.replace(/\s*\(\d+\/\d+\)$/, '').trim();

const sortGroup = (list: Transaction[]) =>
  [...list].sort(
    (a, b) => a.installmentNumber - b.installmentNumber || a.dueDate.localeCompare(b.dueDate)
  );

export const InstallmentManagerModal: React.FC<InstallmentManagerModalProps> = ({
  isOpen,
  onClose,
  transaction,
  transactions,
  contacts,
  onApplyRenegotiation,
}) => {
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  // Identificar se o lançamento já pertence a um grupo de parcelamento
  const groupTxs = useMemo(() => {
    if (!transaction) return [];
    if (transaction.installmentGroupId) {
      const list = transactions.filter((t) => t.installmentGroupId === transaction.installmentGroupId);
      if (list.length > 0) return sortGroup(list);
    }
    if (transaction.installmentTotal > 1) {
      const cleanDesc = stripInstallmentSuffix(transaction.description);
      const list = transactions.filter(
        (t) =>
          t.userId === transaction.userId &&
          t.type === transaction.type &&
          t.installmentTotal === transaction.installmentTotal &&
          stripInstallmentSuffix(t.description) === cleanDesc
      );
      if (list.length > 0) return sortGroup(list);
    }
    return [transaction];
  }, [transaction, transactions]);

  if (!transaction) return null;

  const isScenarioB = groupTxs.length > 1 || transaction.installmentTotal > 1;
  const cleanTitle = stripInstallmentSuffix(transaction.description);

  return isScenarioB ? (
    <InstallmentRenegotiateScenarioB
      isOpen={isOpen}
      onClose={onClose}
      groupTxs={groupTxs}
      cleanTitle={cleanTitle}
      onApplyRenegotiation={onApplyRenegotiation}
    />
  ) : (
    <InstallmentSplitScenarioA
      isOpen={isOpen}
      onClose={onClose}
      transaction={transaction}
      contactMap={contactMap}
      cleanTitle={cleanTitle}
      onApplyRenegotiation={onApplyRenegotiation}
    />
  );
};
