import React, { useState } from 'react';
import { HardDriveDownload, HardDriveUpload } from 'lucide-react';
import type { Category, Contact, LocalBackupPayload, Transaction } from '../../types';
import { downloadLocalBackup, parseLocalBackupFile } from '../../utils/exporters';
import type { BackupMessage } from './settingsConstants';

interface BackupSettingsTabProps {
  username: string;
  categories: Category[];
  contacts: Contact[];
  transactions: Transaction[];
  onRestoreBackup: (payload: LocalBackupPayload) => Promise<void>;
  backupMessage: BackupMessage;
  setBackupMessage: (msg: BackupMessage) => void;
}

export const BackupSettingsTab: React.FC<BackupSettingsTabProps> = ({
  username,
  categories,
  contacts,
  transactions,
  onRestoreBackup,
  backupMessage,
  setBackupMessage,
}) => {
  const [restoring, setRestoring] = useState(false);

  const handleExportLocalBackup = () => {
    const payload: LocalBackupPayload = {
      version: 1,
      app: 'FluxoClaro',
      exportedAt: new Date().toISOString(),
      username,
      categories,
      contacts,
      transactions,
    };
    downloadLocalBackup(payload);
    setBackupMessage({
      kind: 'success',
      text: `Backup local exportado (${transactions.length} lançamentos, ${contacts.length} contatos, ${categories.length} categorias).`,
    });
  };

  const handleImportLocalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setRestoring(true);
      try {
        const parsed = parseLocalBackupFile(String(reader.result || ''));
        await onRestoreBackup(parsed);
        setBackupMessage({
          kind: 'success',
          text: `Backup local restaurado: ${parsed.transactions.length} lançamento(s) e ${parsed.contacts.length} contato(s).`,
        });
      } catch (err) {
        setBackupMessage({
          kind: 'error',
          text: err instanceof Error ? err.message : 'Falha ao restaurar backup local.',
        });
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
          Backup Local em Arquivo
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Exporte e restaure seus dados diretamente no seu dispositivo (sem envio para nuvem externa)
        </p>
      </div>

      {backupMessage && (
        <div
          className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
            backupMessage.kind === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
          }`}
        >
          {backupMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleExportLocalBackup}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[44px]"
        >
          <HardDriveDownload className="w-4 h-4" />
          Baixar Backup (.json)
        </button>

        <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[44px]">
          <HardDriveUpload className="w-4 h-4" />
          <span>{restoring ? 'Restaurando...' : 'Restaurar Arquivo'}</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleImportLocalBackup}
            disabled={restoring}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};
