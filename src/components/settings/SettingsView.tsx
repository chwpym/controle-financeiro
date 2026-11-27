import React, { useState } from 'react';
import { Building2, SlidersHorizontal } from 'lucide-react';
import type { Category, Company, Contact, LocalBackupPayload, Transaction, UserRole } from '../../types';
import { BackupSettingsTab } from './BackupSettingsTab';
import { CategoriesSettingsTab } from './CategoriesSettingsTab';
import { CompaniesSettingsTab } from './CompaniesSettingsTab';
import { PreferencesSettingsTab } from './PreferencesSettingsTab';
import type { BackupMessage } from './settingsConstants';

interface SettingsViewProps {
  userId: string;
  username: string;
  userRole: UserRole;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  categories: Category[];
  contacts: Contact[];
  transactions: Transaction[];
  notifyLeadDays: number;
  onChangeNotifyLeadDays: (days: number) => void;
  inAppAlertsEnabled: boolean;
  onToggleInAppAlerts: (enabled: boolean) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  onSaveCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onRestoreBackup: (payload: LocalBackupPayload) => Promise<void>;
  onOpenChangePassword: () => void;
  onCompaniesChange?: (companies: Company[]) => void;
  /** Opens the Update Center & System Diagnostics slide-over / Abre a Central de Atualizações e Diagnóstico */
  onOpenUpdateCenter?: () => void;
  /** Opens the System Release / License Activation modal / Abre a tela de Liberação do Sistema */
  onOpenSystemRelease?: () => void;
  /** Initial sub-tab to focus ('companies' | 'general') / Aba inicial de configurações */
  initialTab?: 'companies' | 'general';
}

const TAB_ACTIVE =
  'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs';
const TAB_INACTIVE =
  'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60';

export const SettingsView: React.FC<SettingsViewProps> = ({
  userId,
  username,
  userRole,
  theme,
  onToggleTheme,
  categories,
  contacts,
  transactions,
  notifyLeadDays,
  onChangeNotifyLeadDays,
  inAppAlertsEnabled,
  onToggleInAppAlerts,
  notificationPermission,
  onRequestNotificationPermission,
  onSaveCategory,
  onDeleteCategory,
  onRestoreBackup,
  onOpenChangePassword,
  onCompaniesChange,
  onOpenUpdateCenter,
  onOpenSystemRelease,
  initialTab = 'companies',
}) => {
  const [backupMessage, setBackupMessage] = useState<BackupMessage>(null);
  const [settingsTab, setSettingsTab] = useState<'companies' | 'general'>(initialTab);

  React.useEffect(() => {
    setSettingsTab(initialTab);
  }, [initialTab]);

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      active ? TAB_ACTIVE : TAB_INACTIVE
    }`;

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div
        role="tablist"
        className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
        data-testid="settings-tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === 'companies'}
          onClick={() => setSettingsTab('companies')}
          className={tabClass(settingsTab === 'companies')}
        >
          <Building2 className="w-4 h-4" />
          <span>Minhas Empresas</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === 'general'}
          onClick={() => setSettingsTab('general')}
          className={tabClass(settingsTab === 'general')}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Categorias &amp; Preferências</span>
        </button>
      </div>

      {settingsTab === 'companies' ? (
        <CompaniesSettingsTab
          onCompaniesChange={onCompaniesChange}
          onNotify={(msg, type) => {
            if (type === 'error') {
              setBackupMessage({ kind: 'error', text: msg });
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <CategoriesSettingsTab
            userId={userId}
            categories={categories}
            transactions={transactions}
            onSaveCategory={onSaveCategory}
            onDeleteCategory={onDeleteCategory}
          />

          {/* Right column: Local Backup, Notifications, Theme, Account & Role Matrix */}
          <div className="lg:col-span-5 space-y-6">
            <BackupSettingsTab
              username={username}
              categories={categories}
              contacts={contacts}
              transactions={transactions}
              onRestoreBackup={onRestoreBackup}
              backupMessage={backupMessage}
              setBackupMessage={setBackupMessage}
            />
            <PreferencesSettingsTab
              username={username}
              userRole={userRole}
              theme={theme}
              onToggleTheme={onToggleTheme}
              notifyLeadDays={notifyLeadDays}
              onChangeNotifyLeadDays={onChangeNotifyLeadDays}
              inAppAlertsEnabled={inAppAlertsEnabled}
              onToggleInAppAlerts={onToggleInAppAlerts}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={onRequestNotificationPermission}
              onOpenChangePassword={onOpenChangePassword}
              onOpenUpdateCenter={onOpenUpdateCenter}
              onOpenSystemRelease={onOpenSystemRelease}
            />
          </div>
        </div>
      )}
    </div>
  );
};
