import React, { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Download,
  Edit2,
  HardDriveDownload,
  HardDriveUpload,
  KeyRound,
  Moon,
  Palette,
  Plus,
  Search,
  Shield,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { Category, CategoryType, Contact, LocalBackupPayload, Transaction, UserRole } from '../types';
import { downloadLocalBackup, parseLocalBackupFile } from '../utils/exporters';
import { PWAInstallButton } from './PWAInstallButton';

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
}

const COLOR_PRESETS = [
  '#0F766E',
  '#0D9488',
  '#16A34A',
  '#65A30D',
  '#2563EB',
  '#0284C7',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#475569',
  '#0F172A',
];

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
}) => {
  // Create form
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<CategoryType>('payable');
  const [catColor, setCatColor] = useState('#0F766E');

  // Category filters (search + usage filter + type filter)
  const [catSearch, setCatSearch] = useState('');
  const [catUsageFilter, setCatUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [catTypeFilter, setCatTypeFilter] = useState<'all' | CategoryType>('all');

  // Inline category editing
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState<CategoryType>('payable');
  const [editCatColor, setEditCatColor] = useState('#0F766E');

  const [backupMessage, setBackupMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [notifySavedMsg, setNotifySavedMsg] = useState(false);

  const LEAD_DAY_PRESETS = [
    { value: 0, label: 'No dia' },
    { value: 1, label: '1 dia' },
    { value: 3, label: '3 dias' },
    { value: 5, label: '5 dias' },
    { value: 7, label: '7 dias' },
    { value: 15, label: '15 dias' },
    { value: 30, label: '30 dias' },
  ];

  const handleUpdateLeadDays = (rawDays: number) => {
    const sanitized = Number.isFinite(rawDays) ? Math.min(90, Math.max(0, Math.trunc(rawDays))) : 0;
    onChangeNotifyLeadDays(sanitized);
    setNotifySavedMsg(true);
  };

  // Count registered transactions per category
  const usageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.categoryId) {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + 1);
      }
    }
    return map;
  }, [transactions]);

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return categories.filter((cat) => {
      const count = usageCounts.get(cat.id) || 0;
      if (catUsageFilter === 'used' && count === 0) return false;
      if (catUsageFilter === 'unused' && count > 0) return false;
      if (catTypeFilter !== 'all' && cat.type !== catTypeFilter) return false;
      if (q && !cat.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [categories, usageCounts, catUsageFilter, catTypeFilter, catSearch]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const now = new Date().toISOString();
    onSaveCategory({
      id: crypto.randomUUID(),
      userId,
      name: catName.trim(),
      type: catType,
      color: /^#[0-9A-Fa-f]{6}$/.test(catColor) ? catColor : '#0F766E',
      createdAt: now,
      updatedAt: now,
    });
    setCatName('');
  };

  const startEditingCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatColor(cat.color);
  };

  const saveEditingCategory = (cat: Category) => {
    if (!editCatName.trim()) return;
    onSaveCategory({
      ...cat,
      name: editCatName.trim(),
      type: editCatType,
      color: /^#[0-9A-Fa-f]{6}$/.test(editCatColor) ? editCatColor : cat.color,
      updatedAt: new Date().toISOString(),
    });
    setEditingCatId(null);
  };

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

  const roleName = userRole === 'master' ? 'Master' : userRole === 'admin' ? 'Administrador' : 'Usuário';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left column: Customizable Categories with usage filter & full color controls */}
      <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
            Categorias Personalizáveis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize suas despesas e receitas em BRL do jeito que preferir, filtre por uso e escolha qualquer cor
          </p>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome da categoria
              </label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Marketing, Logística..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Uso
              </label>
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value as CategoryType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
              >
                <option value="payable">A Pagar</option>
                <option value="receivable">A Receber</option>
                <option value="both">Ambos</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" />
              Cor:
            </span>
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setCatColor(color)}
                aria-label={`Selecionar cor ${color}`}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  catColor.toUpperCase() === color
                    ? 'border-slate-900 dark:border-white scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <label
              title="Escolher qualquer cor personalizada"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px] font-mono-tabular cursor-pointer"
            >
              <input
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(catColor) ? catColor : '#0F766E'}
                onChange={(e) => setCatColor(e.target.value.toUpperCase())}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span>Personalizada</span>
            </label>
            <input
              type="text"
              value={catColor}
              onChange={(e) => setCatColor(e.target.value)}
              maxLength={7}
              aria-label="Código hexadecimal da cor"
              className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular uppercase"
            />
          </div>
        </form>

        {/* Category Filter Controls */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Filtrar categorias..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
              />
            </div>

            <select
              value={catTypeFilter}
              onChange={(e) => setCatTypeFilter(e.target.value as 'all' | CategoryType)}
              aria-label="Filtrar por tipo de categoria"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
            >
              <option value="all">Todos os tipos</option>
              <option value="payable">A Pagar</option>
              <option value="receivable">A Receber</option>
              <option value="both">Ambos</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setCatUsageFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[34px] ${
                  catUsageFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Todas ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setCatUsageFilter('used')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[34px] ${
                  catUsageFilter === 'used'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Com cadastros ({categories.filter((c) => (usageCounts.get(c.id) || 0) > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setCatUsageFilter('unused')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[34px] ${
                  catUsageFilter === 'unused'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Sem cadastros ({categories.filter((c) => (usageCounts.get(c.id) || 0) === 0).length})
              </button>
            </div>
          </div>
        </div>

        {/* Category Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
          {filteredCategories.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhuma categoria encontrada para este filtro.
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const txCount = usageCounts.get(cat.id) || 0;
              const isEditing = editingCatId === cat.id;

              if (isEditing) {
                return (
                  <div key={cat.id} className="py-3.5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <input
                        type="text"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="sm:col-span-6 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                      />
                      <select
                        value={editCatType}
                        onChange={(e) => setEditCatType(e.target.value as CategoryType)}
                        className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
                      >
                        <option value="payable">A Pagar</option>
                        <option value="receivable">A Receber</option>
                        <option value="both">Ambos</option>
                      </select>
                      <div className="sm:col-span-3 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => saveEditingCategory(cat)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold min-h-[38px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 min-h-[38px]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditCatColor(color)}
                          className={`w-5 h-5 rounded-full border-2 ${
                            editCatColor.toUpperCase() === color
                              ? 'border-slate-900 dark:border-white scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <input
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(editCatColor) ? editCatColor : '#0F766E'}
                        onChange={(e) => setEditCatColor(e.target.value.toUpperCase())}
                        aria-label="Seletor de cor da categoria"
                        className="w-7 h-7 rounded cursor-pointer border border-slate-200 dark:border-slate-700 p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={editCatColor}
                        onChange={(e) => setEditCatColor(e.target.value)}
                        maxLength={7}
                        className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular uppercase"
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div key={cat.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <label
                      title="Clique para trocar a cor rapidamente"
                      className="relative w-5 h-5 rounded-md shrink-0 cursor-pointer border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: cat.color }}
                    >
                      <input
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(cat.color) ? cat.color : '#0F766E'}
                        onChange={(e) =>
                          onSaveCategory({
                            ...cat,
                            color: e.target.value.toUpperCase(),
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        aria-label={`Alterar cor de ${cat.name}`}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                        <span>
                          {cat.type === 'payable'
                            ? 'Contas a Pagar'
                            : cat.type === 'receivable'
                              ? 'Contas a Receber'
                              : 'Pagar e Receber'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-mono-tabular ${
                            txCount > 0
                              ? 'text-teal-700 dark:text-teal-400 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {txCount > 0
                            ? `${txCount} lançamento${txCount > 1 ? 's' : ''} cadastrado${txCount > 1 ? 's' : ''}`
                            : 'Sem lançamentos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditingCategory(cat)}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title="Editar nome, tipo ou cor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title="Excluir categoria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right column: Local Backup, Notifications, Theme, Account & Role Matrix */}
      <div className="lg:col-span-5 space-y-6">
        {/* Local Backup (NO cloud backup) */}
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

        {/* Dedicated Notifications Section */}
        <section
          aria-labelledby="settings-notifications-heading"
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
              <div>
                <h2
                  id="settings-notifications-heading"
                  className="text-base font-display font-semibold text-slate-900 dark:text-white"
                >
                  Notificações
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Defina com quantos dias de antecedência deseja ser lembrado das contas a vencer.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Avisos no sistema
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Exibir contador no ícone de sino da barra superior e alertas no painel
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={inAppAlertsEnabled}
                aria-label="Alternar avisos de vencimento no sistema"
                onClick={() => onToggleInAppAlerts(!inAppAlertsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  inAppAlertsEnabled
                    ? 'bg-teal-700 dark:bg-teal-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    inAppAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Antecedência do lembrete
              </label>
              <div className="flex flex-wrap gap-2">
                {LEAD_DAY_PRESETS.map((preset) => {
                  const isActive = notifyLeadDays === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleUpdateLeadDays(preset.value)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold font-mono-tabular min-h-[40px] transition-colors ${
                        isActive
                          ? 'bg-teal-700 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-600'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label
                htmlFor="notify-lead-days-input"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Ou informe exatamente (0 a 90 dias):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="notify-lead-days-input"
                  type="number"
                  min={0}
                  max={90}
                  step={1}
                  value={notifyLeadDays}
                  onChange={(e) => {
                    const nextVal = e.target.value === '' ? 0 : Number(e.target.value);
                    handleUpdateLeadDays(nextVal);
                  }}
                  className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold font-mono-tabular text-slate-900 dark:text-white text-center min-h-[40px]"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {notifyLeadDays === 1 ? 'dia antes' : 'dias antes'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {notifyLeadDays === 0
                  ? 'Lembrando apenas contas vencendo hoje ou já vencidas.'
                  : `Lembrando contas vencidas ou que vencem em até ${notifyLeadDays} ${
                      notifyLeadDays === 1 ? 'dia' : 'dias'
                    }.`}
              </span>
              {notifySavedMsg && (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Salvo neste dispositivo
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Notificações do navegador:{' '}
                <strong>
                  {notificationPermission === 'granted'
                    ? 'Ativadas'
                    : notificationPermission === 'denied'
                      ? 'Bloqueadas no navegador'
                      : notificationPermission === 'unsupported'
                        ? 'Não suportadas'
                        : 'Desativadas'}
                </strong>
              </div>
              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Ativar alertas no navegador
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Appearance & Account */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
            Aparência e Conta
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Tema visual
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Segurança da conta ({username})
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Perfil atual: <strong>{roleName}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Trocar senha
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Aplicativo instalável (PWA)</span>
              </div>
              <PWAInstallButton />
            </div>
          </div>
        </div>

        {/* Role Permissions Overview */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
              O que cada tipo de usuário pode fazer
            </h2>
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              <strong className="text-slate-900 dark:text-white">Usuário:</strong> Gerencia suas próprias contas a pagar/receber, parcelas, baixas com forma de pagamento, contatos PF/PJ, categorias, XML, relatórios e backup local.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Administrador:</strong> Tudo do Usuário + acesso ao Painel Administrativo para criar contas comuns/admin, suspender acessos e redefinir senhas (não altera contas Master).
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">Master:</strong> Controle total — tudo do Administrador + poder exclusivo de criar, editar, redefinir senha e remover outros usuários Master.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
