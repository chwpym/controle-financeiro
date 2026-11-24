import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Rocket,
  Settings,
  Shield,
  Sun,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { AdminView } from './components/AdminView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuthScreen } from './components/AuthScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { CompanySelector } from './components/common/CompanySelector';
import { ContactsView } from './components/ContactsView';
import { AlertsDrawer } from './components/dashboard/AlertsDrawer';
import { DashboardView } from './components/DashboardView';
import { DeployFooter } from './components/DeployFooter';
import { ExcelImportModal } from './components/ExcelImportModal';
import { InstallmentManagerModal } from './components/InstallmentManagerModal';
import { NotificationsBell } from './components/NotificationsBell';
import { OfflineSyncBanner, PWAInstallButton } from './components/PWAInstallButton';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { SettleModal } from './components/SettleModal';
import { SystemReleaseModal } from './components/SystemReleaseModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsView } from './components/TransactionsView';
import { UpdateCenterModal } from './components/UpdateCenterModal';
import { XmlImportModal } from './components/XmlImportModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type {
  AppView,
  Category,
  Company,
  Contact,
  LicenseStatusResponse,
  LocalBackupPayload,
  SyncMutation,
  Transaction,
  UserProfile,
} from './types';
import { api, ApiError } from './utils/api';
import {
  buildDuplicatedTransaction,
  currentMonthKey,
  daysUntilDue,
  formatBRL,
  formatDateBR,
  formatMonthLabel,
  nextRecurrenceDate,
  shiftMonthKey,
  todayISO,
} from './utils/format';
import {
  enqueueSyncMutation,
  getSavedSession,
  listPendingMutations,
  loadSnapshotCache,
  removeSyncMutation,
  saveSession,
  saveSnapshotCache,
} from './utils/offlineDb';
import { getLocalBuildInfo } from './utils/pwaUpdate';

const THEME_KEY = 'fluxoclaro_theme';
const LEAD_DAYS_KEY = 'fluxoclaro_notify_days';
const NOTIFY_ENABLED_KEY = 'fluxoclaro_notify_enabled';
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export default function App() {
  const isOnline = useOnlineStatus();
  // EN: Compile-time version & commit hash displayed discreetly in the sidebar footer.
  // PT: Versão e hash do commit injetados no build, exibidos discretamente no rodapé da barra lateral.
  const localBuildInfo = useMemo(() => getLocalBuildInfo(), []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [notifyLeadDays, setNotifyLeadDays] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LEAD_DAYS_KEY);
      if (raw === null || raw.trim() === '') return 3;
      const val = Math.trunc(Number(raw));
      return Number.isFinite(val) && val >= 0 && val <= 90 ? val : 3;
    } catch {
      return 3;
    }
  });

  const [inAppAlertsEnabled, setInAppAlertsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NOTIFY_ENABLED_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const [user, setUser] = useState<UserProfile | null>(() => getSavedSession()?.user || null);
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [txInitialFilter, setTxInitialFilter] = useState<string>('all');

  const [categories, setCategories] = useState<Category[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');
  const [loadingData, setLoadingData] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals & Drawers
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [consultingTx, setConsultingTx] = useState<Transaction | null>(null);
  const [settlingTx, setSettlingTx] = useState<Transaction | null>(null);
  const [installmentManagerTx, setInstallmentManagerTx] = useState<Transaction | null>(null);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Controls visibility of the Update Center & System Diagnostics slide-over / Estado de abertura da Central de Atualizações
  const [updateCenterOpen, setUpdateCenterOpen] = useState(false);

  // System Licensing & Release Modal state (Phase 10.2) / Estado de Licenciamento e Modal de Liberação do Sistema
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusResponse | null>(null);
  const [systemReleaseOpen, setSystemReleaseOpen] = useState(false);

  // Toast message
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const notifiedKeyRef = useRef<string>('');
  const syncInFlightRef = useRef(false);
  const wasOfflineRef = useRef(!isOnline);
  const lastLoadedUserIdRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Theme sync on <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleChangeNotifyLeadDays = (days: number) => {
    const sanitized = Number.isFinite(days) ? Math.min(90, Math.max(0, Math.trunc(days))) : 3;
    setNotifyLeadDays(sanitized);
    try {
      localStorage.setItem(LEAD_DAYS_KEY, String(sanitized));
    } catch {
      // ignore
    }
  };

  const handleToggleInAppAlerts = (enabled: boolean) => {
    setInAppAlertsEnabled(enabled);
    try {
      localStorage.setItem(NOTIFY_ENABLED_KEY, String(enabled));
    } catch {
      // ignore
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      showToast('Alertas de vencimento ativados no navegador.');
    }
  };

  // Persist current in-memory state to IndexedDB snapshot
  const persistCache = useCallback(
    async (
      uid: string,
      nextCats: Category[],
      nextContacts: Contact[],
      nextTxs: Transaction[],
      nextCompanies: Company[] = [],
      syncedAt: string | null = null
    ) => {
      await saveSnapshotCache({
        userId: uid,
        categories: nextCats,
        contacts: nextContacts,
        transactions: nextTxs,
        companies: nextCompanies,
        lastSyncedAt: syncedAt,
      });
    },
    []
  );

  // Flush queued offline mutations & pull fresh snapshot from SQLite
  const syncWithServer = useCallback(
    async (uid: string, manual = false) => {
      if (!navigator.onLine) {
        if (manual) showToast('Você está offline. Conecte-se para sincronizar.');
        return;
      }
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      setIsSyncing(true);
      try {
        const queue = await listPendingMutations(uid);
        for (const m of queue) {
          if (m.kind === 'tx_batch_upsert') {
            await api.upsertTransactionsBatch(m.payload as Transaction[]);
          } else if (m.kind === 'tx_update') {
            await api.upsertTransaction(m.payload as Transaction);
          } else if (m.kind === 'tx_delete') {
            await api.deleteTransaction(m.payload as string);
          } else if (m.kind === 'tx_group_delete') {
            await api.deleteTransactionGroup(m.payload as string);
          } else if (m.kind === 'tx_batch_delete') {
            await api.deleteTransactionsBatch(m.payload as string[]);
          } else if (m.kind === 'contact_upsert') {
            await api.upsertContact(m.payload as Contact);
          } else if (m.kind === 'contact_delete') {
            await api.deleteContact(m.payload as string);
          } else if (m.kind === 'category_upsert') {
            await api.upsertCategory(m.payload as Category);
          } else if (m.kind === 'category_delete') {
            await api.deleteCategory(m.payload as string);
          } else if (m.kind === 'backup_restore') {
            await api.restoreBackup(m.payload as LocalBackupPayload);
          }
          await removeSyncMutation(m.id);
        }

        const [meRes, snap] = await Promise.all([api.me(), api.getSnapshot()]);
        const currentToken = getSavedSession()?.token;
        if (currentToken) {
          saveSession({ token: currentToken, user: meRes.user });
        }
        setUser((prev) => {
          if (
            prev &&
            prev.id === meRes.user.id &&
            prev.username === meRes.user.username &&
            prev.displayName === meRes.user.displayName &&
            prev.role === meRes.user.role &&
            prev.status === meRes.user.status
          ) {
            return prev;
          }
          return meRes.user;
        });
        setCategories(snap.categories);
        setContacts(snap.contacts);
        setTransactions(snap.transactions);
        if (snap.companies) {
          setCompanies(snap.companies);
        }
        await persistCache(uid, snap.categories, snap.contacts, snap.transactions, snap.companies || [], snap.serverTime);

        const remaining = await listPendingMutations(uid);
        setPendingCount(remaining.length);
        if (manual) {
          showToast(
            queue.length > 0
              ? `${queue.length} alteração(ões) sincronizada(s) com sucesso.`
              : 'Dados atualizados com o servidor.'
          );
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          saveSession(null);
          setUser(null);
          showToast(err.message);
        } else if (manual) {
          showToast('Não foi possível sincronizar agora. Os dados permanecem salvos localmente.');
        }
      } finally {
        syncInFlightRef.current = false;
        setIsSyncing(false);
      }
    },
    [persistCache, showToast]
  );

  // Refresh active company license status from backend (`GET /api/license/status`)
  // Atualiza o status da licença da empresa ativa junto ao backend e abre o modal se estiver expirada
  const refreshLicenseStatus = useCallback(
    async (companyIdOverride?: string | 'all') => {
      if (!user || !navigator.onLine) return;
      try {
        const targetId = companyIdOverride ?? selectedCompanyId;
        const status = await api.getLicenseStatus(targetId === 'all' ? undefined : targetId);
        setLicenseStatus(status);
        if (status.isExpired || status.daysRemaining < 0) {
          setSystemReleaseOpen(true);
        }
      } catch {
        // Ignore transient offline errors when checking license status
      }
    },
    [user, selectedCompanyId]
  );

  // Initial load once per authenticated user ID: instant IndexedDB hydration + initial sync
  const userId = user?.id || null;
  useEffect(() => {
    if (!userId) {
      lastLoadedUserIdRef.current = null;
      return;
    }
    if (lastLoadedUserIdRef.current === userId) return;
    lastLoadedUserIdRef.current = userId;

    let active = true;
    (async () => {
      setLoadingData(true);
      const cached = await loadSnapshotCache(userId);
      if (active && cached) {
        setCategories(cached.categories);
        setContacts(cached.contacts);
        setTransactions(cached.transactions);
        if (cached.companies) {
          setCompanies(cached.companies);
        }
      }
      const pending = await listPendingMutations(userId);
      if (active) setPendingCount(pending.length);
      if (active) setLoadingData(false);

      if (navigator.onLine) {
        await syncWithServer(userId, false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, syncWithServer]);

  // Automatic sync ONLY when transitioning from offline -> online
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current && userId) {
      wasOfflineRef.current = false;
      syncWithServer(userId, false);
    }
  }, [isOnline, userId, syncWithServer]);

  // Check license status whenever user logs in or switches the active company in the header
  // Verifica o status da licença sempre que o usuário autenticar ou trocar de empresa no seletor global
  useEffect(() => {
    if (!userId || !isOnline) return;
    refreshLicenseStatus(selectedCompanyId);
  }, [userId, isOnline, selectedCompanyId, refreshLicenseStatus]);

  // Helper that blocks frontend write mutations when the active company's license is expired
  // Helper que bloqueia mutações financeiras no frontend quando a licença está vencida, abrindo a tela de liberação
  const ensureLicenseAllowsWrite = useCallback((): boolean => {
    if (licenseStatus && (licenseStatus.isExpired || licenseStatus.daysRemaining < 0)) {
      setSystemReleaseOpen(true);
      showToast(
        'Licença de uso expirada. Insira o código em Liberação do Sistema para continuar lançando.'
      );
      return false;
    }
    return true;
  }, [licenseStatus, showToast]);

  // Due-date alerts shared between Bell Popover, Browser Notifications, and Dashboard
  const dueAlerts = useMemo(() => {
    const today = todayISO();
    return transactions
      .filter((t) => {
        if (t.status !== 'pending') return false;
        if (selectedCompanyId !== 'all' && t.companyId !== selectedCompanyId) return false;
        return daysUntilDue(t.dueDate, today) <= notifyLeadDays;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [transactions, notifyLeadDays, selectedCompanyId]);

  // Trigger browser due-date notification once per session/day when granted
  useEffect(() => {
    if (
      !user ||
      !inAppAlertsEnabled ||
      notificationPermission !== 'granted' ||
      dueAlerts.length === 0
    ) {
      return;
    }
    const today = todayISO();
    const key = `${user.id}:${today}:${notifyLeadDays}`;
    if (notifiedKeyRef.current === key) return;

    notifiedKeyRef.current = key;
    const totalCents = dueAlerts.reduce((s, t) => s + t.amountCents, 0);
    try {
      new Notification('FluxoClaro — Lembrete de Vencimentos', {
        body: `${dueAlerts.length} conta(s) pendente(s) vencendo ou em atraso (${formatBRL(totalCents)}).`,
        icon: '/pwa-192x192.png',
      });
    } catch {
      // Ignore browser notification restrictions
    }
  }, [user, inAppAlertsEnabled, notificationPermission, dueAlerts, notifyLeadDays]);

  const queueOrSync = useCallback(
    async (
      kind: SyncMutation['kind'],
      payload: unknown,
      onlineAction: () => Promise<unknown>
    ) => {
      if (!user) return;
      if (navigator.onLine) {
        try {
          await onlineAction();
          return;
        } catch (err) {
          // EN: If the server returns HTTP 403 (expired license or anti-fraud lock), surface the error instead of queuing offline!
          // PT: Se o servidor retornar HTTP 403 (licença expirada ou trava anti-fraude), exibe o alerta e não coloca na fila offline!
          if (err instanceof ApiError && err.status === 403) {
            showToast(err.message);
            if (err.message.toLowerCase().includes('licença')) {
              refreshLicenseStatus();
              setSystemReleaseOpen(true);
            }
            return;
          }
          // Fallback to offline queue if request failed transiently
        }
      }
      await enqueueSyncMutation({
        id: crypto.randomUUID(),
        userId: user.id,
        kind,
        payload,
        createdAt: new Date().toISOString(),
      });
      const pending = await listPendingMutations(user.id);
      setPendingCount(pending.length);
    },
    [user]
  );

  // CRUD Handlers (Offline-first optimistic update + IndexedDB cache + queue/sync)
  const handleSaveTransactionBatch = async (items: Transaction[]) => {
    if (!user || !ensureLicenseAllowsWrite()) return;
    const next = [...transactions, ...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setTransactions(next);
    await persistCache(user.id, categories, contacts, next);
    showToast(
      items.length > 1
        ? `${items.length} parcelas geradas com sucesso.`
        : 'Lançamento salvo com sucesso.'
    );
    await queueOrSync('tx_batch_upsert', items, () => api.upsertTransactionsBatch(items));
  };

  const handleUpdateSingleTransaction = async (item: Transaction) => {
    if (!user || !ensureLicenseAllowsWrite()) return;
    const next = transactions
      .map((t) => (t.id === item.id ? item : t))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setTransactions(next);
    await persistCache(user.id, categories, contacts, next);
    showToast('Lançamento atualizado.');
    await queueOrSync('tx_update', item, () => api.upsertTransaction(item));
  };

  const handleToggleSettle = async (tx: Transaction) => {
    if (!ensureLicenseAllowsWrite()) return;
    if (tx.status === 'pending') {
      setSettlingTx(tx);
      return;
    }
    const baseAmount = Math.max(
      1,
      tx.amountCents + (tx.discountCents || 0) - (tx.interestCents || 0)
    );
    const updated: Transaction = {
      ...tx,
      amountCents: baseAmount,
      discountCents: 0,
      interestCents: 0,
      status: 'pending',
      paidAt: null,
      paymentMethod: '',
      updatedAt: new Date().toISOString(),
    };
    await handleUpdateSingleTransaction(updated);
  };

  const handleConfirmSettle = async (
    paymentMethod: string,
    paidAt: string,
    notes: string,
    discountCents: number,
    interestCents: number,
    generateNextRecurring: boolean
  ) => {
    if (!settlingTx || !user) return;
    const baseAmount = Math.max(
      1,
      settlingTx.amountCents + (settlingTx.discountCents || 0) - (settlingTx.interestCents || 0)
    );
    const finalAmount = Math.max(1, baseAmount - discountCents + interestCents);

    const updated: Transaction = {
      ...settlingTx,
      amountCents: finalAmount,
      discountCents,
      interestCents,
      status: 'settled',
      paymentMethod,
      paidAt,
      notes,
      updatedAt: new Date().toISOString(),
    };

    const currentSettling = settlingTx;
    setSettlingTx(null);

    if (generateNextRecurring && currentSettling.isRecurring && currentSettling.recurrenceInterval) {
      const nextDue = nextRecurrenceDate(
        currentSettling.dueDate,
        currentSettling.recurrenceInterval,
        1
      );
      const alreadyHasNext = transactions.some((t) => {
        if (t.id === currentSettling.id) return false;
        if (currentSettling.installmentGroupId) {
          return t.installmentGroupId === currentSettling.installmentGroupId && t.dueDate >= nextDue;
        }
        return (
          t.description.trim().toLowerCase() === currentSettling.description.trim().toLowerCase() &&
          t.dueDate === nextDue
        );
      });

      if (!alreadyHasNext) {
        const nextOccurrence = buildDuplicatedTransaction(currentSettling, nextDue);
        const nextList = transactions
          .map((t) => (t.id === updated.id ? updated : t))
          .concat(nextOccurrence)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        setTransactions(nextList);
        await persistCache(user.id, categories, contacts, nextList);
        showToast('Conta baixada e próxima recorrência gerada.');
        await queueOrSync('tx_update', updated, () => api.upsertTransaction(updated));
        await queueOrSync('tx_batch_upsert', [nextOccurrence], () =>
          api.upsertTransactionsBatch([nextOccurrence])
        );
        return;
      }
    }

    await handleUpdateSingleTransaction(updated);
  };

  const handleDuplicateTransaction = async (tx: Transaction) => {
    if (!user || !ensureLicenseAllowsWrite()) return;
    const dup = buildDuplicatedTransaction(tx);
    const next = [...transactions, dup].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setTransactions(next);
    await persistCache(user.id, categories, contacts, next);
    showToast('Lançamento duplicado para o próximo vencimento.');
    await queueOrSync('tx_batch_upsert', [dup], () => api.upsertTransactionsBatch([dup]));
  };

  const handleBatchSettle = async (txs: Transaction[], paymentMethod: string, paidAt: string) => {
    if (!user || !ensureLicenseAllowsWrite()) return;
    const pendingList = txs.filter((t) => t.status === 'pending');
    if (pendingList.length === 0) return;
    const now = new Date().toISOString();
    const updatedMap = new Map<string, Transaction>();
    for (const t of pendingList) {
      updatedMap.set(t.id, {
        ...t,
        status: 'settled',
        paymentMethod,
        paidAt,
        updatedAt: now,
      });
    }
    const updatedItems = Array.from(updatedMap.values());
    const next = transactions
      .map((t) => updatedMap.get(t.id) || t)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setTransactions(next);
    await persistCache(user.id, categories, contacts, next);
    showToast(`${updatedItems.length} conta(s) baixada(s) em lote.`);
    await queueOrSync('tx_batch_upsert', updatedItems, () =>
      api.upsertTransactionsBatch(updatedItems)
    );
  };

  const handleBatchDelete = async (ids: string[]) => {
    if (!user || ids.length === 0 || !ensureLicenseAllowsWrite()) return;
    const idSet = new Set(ids);
    const next = transactions.filter((t) => !idSet.has(t.id));
    setTransactions(next);
    await persistCache(user.id, categories, contacts, next);
    showToast(`${ids.length} lançamento(s) excluído(s).`);
    await queueOrSync('tx_batch_delete', ids, () => api.deleteTransactionsBatch(ids));
  };

  const handleApplyRenegotiation = async (toDeleteIds: string[], toUpsert: Transaction[]) => {
    if (!user || !ensureLicenseAllowsWrite()) return;
    const deleteSet = new Set(toDeleteIds);
    const upsertMap = new Map(toUpsert.map((t) => [t.id, t]));
    const remaining = transactions.filter((t) => !deleteSet.has(t.id));
    const merged = remaining.map((t) => (upsertMap.has(t.id) ? upsertMap.get(t.id)! : t));
    for (const t of toUpsert) {
      if (!merged.some((m) => m.id === t.id)) {
        merged.push(t);
      }
    }
    merged.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setTransactions(merged);
    await persistCache(user.id, categories, contacts, merged);

    showToast(
      toDeleteIds.length > 0 && toUpsert.length > 1
        ? `Renegociação aplicada com sucesso (${toUpsert.length} parcelas no contrato).`
        : `${toUpsert.length} parcelas geradas com sucesso.`
    );

    if (toDeleteIds.length > 0) {
      await queueOrSync('tx_batch_delete', toDeleteIds, () => api.deleteTransactionsBatch(toDeleteIds));
    }
    if (toUpsert.length > 0) {
      await queueOrSync('tx_batch_upsert', toUpsert, () => api.upsertTransactionsBatch(toUpsert));
    }
  };

  const handleDeleteSingleTransaction = async (tx: Transaction) => {
    if (!user || !ensureLicenseAllowsWrite()) return;
    const next = transactions.filter((t) => t.id !== tx.id);
    setTransactions(next);
    await persistCache(user.id, categories, contacts, next);
    showToast('Lançamento excluído.');
    await queueOrSync('tx_delete', tx.id, () => api.deleteTransaction(tx.id));
  };

  const handleDeleteTransactionGroup = async (groupId: string) => {
    if (!user || !ensureLicenseAllowsWrite()) return;
    const next = transactions.filter((t) => t.installmentGroupId !== groupId);
    setTransactions(next);
    await persistCache(user.id, categories, contacts, next);
    showToast('Parcelamento completo excluído.');
    await queueOrSync('tx_group_delete', groupId, () => api.deleteTransactionGroup(groupId));
  };

  const handleSaveContact = async (contact: Contact) => {
    if (!user) return;
    const exists = contacts.some((c) => c.id === contact.id);
    const next = exists
      ? contacts.map((c) => (c.id === contact.id ? contact : c))
      : [...contacts, contact].sort((a, b) => a.name.localeCompare(b.name));
    setContacts(next);
    await persistCache(user.id, categories, next, transactions);
    await queueOrSync('contact_upsert', contact, () => api.upsertContact(contact));
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!user) return;
    const nextContacts = contacts.filter((c) => c.id !== contactId);
    const nextTxs = transactions.map((t) =>
      t.contactId === contactId ? { ...t, contactId: null } : t
    );
    setContacts(nextContacts);
    setTransactions(nextTxs);
    await persistCache(user.id, categories, nextContacts, nextTxs);
    showToast('Contato excluído.');
    await queueOrSync('contact_delete', contactId, () => api.deleteContact(contactId));
  };

  const handleSaveCategory = async (cat: Category) => {
    if (!user) return;
    const exists = categories.some((c) => c.id === cat.id);
    const next = exists
      ? categories.map((c) => (c.id === cat.id ? cat : c))
      : [...categories, cat].sort((a, b) => a.name.localeCompare(b.name));
    setCategories(next);
    await persistCache(user.id, next, contacts, transactions);
    showToast('Categoria adicionada.');
    await queueOrSync('category_upsert', cat, () => api.upsertCategory(cat));
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!user) return;
    const nextCats = categories.filter((c) => c.id !== catId);
    const nextTxs = transactions.map((t) =>
      t.categoryId === catId ? { ...t, categoryId: null } : t
    );
    setCategories(nextCats);
    setTransactions(nextTxs);
    await persistCache(user.id, nextCats, contacts, nextTxs);
    showToast('Categoria removida.');
    await queueOrSync('category_delete', catId, () => api.deleteCategory(catId));
  };

  const handleRestoreLocalBackup = async (payload: LocalBackupPayload) => {
    if (!user) return;
    const scopedCats = payload.categories.map((c) => ({ ...c, userId: user.id }));
    const scopedContacts = payload.contacts.map((c) => ({ ...c, userId: user.id }));
    const scopedTxs = payload.transactions.map((t) => ({ ...t, userId: user.id }));

    const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
      const map = new Map(current.map((i) => [i.id, i]));
      for (const item of incoming) map.set(item.id, item);
      return Array.from(map.values());
    };

    const nextCats = mergeById(categories, scopedCats);
    const nextContacts = mergeById(contacts, scopedContacts);
    const nextTxs = mergeById(transactions, scopedTxs).sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    );

    setCategories(nextCats);
    setContacts(nextContacts);
    setTransactions(nextTxs);
    await persistCache(user.id, nextCats, nextContacts, nextTxs);

    const scopedPayload: LocalBackupPayload = {
      ...payload,
      categories: scopedCats,
      contacts: scopedContacts,
      transactions: scopedTxs,
    };
    await queueOrSync('backup_restore', scopedPayload, () => api.restoreBackup(scopedPayload));
    showToast('Backup local restaurado.');
  };

  const handleAuthenticated = (token: string, loggedUser: UserProfile) => {
    saveSession({ token, user: loggedUser });
    setUser(loggedUser);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    saveSession(null);
    setUser(null);
    setCategories([]);
    setContacts([]);
    setTransactions([]);
    setPendingCount(0);
  };

  const isMasterOrAdmin = user?.role === 'master' || user?.role === 'admin';

  const navItems: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = useMemo(() => {
    const base: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'transactions', label: 'Contas P/R', icon: ListChecks },
      { id: 'contacts', label: 'Cadastros PF/PJ', icon: Users },
      { id: 'analytics', label: 'Gráficos', icon: TrendingUp },
      { id: 'reports', label: 'Relatórios', icon: BarChart3 },
      { id: 'settings', label: 'Ajustes e Backup', icon: Settings },
    ];
    if (isMasterOrAdmin) {
      base.push({ id: 'admin', label: 'Painel Master', icon: Shield });
    }
    return base;
  }, [isMasterOrAdmin]);

  if (!user) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const currentPageTitle =
    navItems.find((item) => item.id === activeView)?.label || 'FluxoClaro';

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-[width] duration-200`}
      >
        <div
          className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 ${
            sidebarCollapsed ? 'justify-center px-2 gap-1' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-display font-bold text-sm shrink-0">
              FC
            </div>
            {!sidebarCollapsed && (
              <span className="font-display font-bold text-lg tracking-tight truncate">
                FluxoClaro
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-expanded={!sidebarCollapsed}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={sidebarCollapsed ? item.label : undefined}
                aria-label={item.label}
                onClick={() => {
                  if (item.id === 'transactions') setTxInitialFilter('all');
                  setActiveView(item.id);
                }}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'
                } py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] cursor-pointer ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div
          className={`border-t border-slate-200 dark:border-slate-800 ${
            sidebarCollapsed ? 'p-3 space-y-2 flex flex-col items-center' : 'p-4 space-y-2.5'
          }`}
        >
          {sidebarCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setChangePassOpen(true)}
                title={`Alterar minha senha (${user.displayName})`}
                aria-label="Alterar minha senha"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair"
                aria-label="Sair"
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
              {/* Subtle semi-opaque version badge when sidebar is collapsed / Versão meio opaca na sidebar recolhida */}
              <button
                type="button"
                onClick={() => setUpdateCenterOpen(true)}
                title={`v${localBuildInfo.version} • ${localBuildInfo.commit} — Abrir Central de Atualizações`}
                aria-label={`Versão ${localBuildInfo.version}, abrir Central de Atualizações`}
                data-testid="sidebar-version-badge"
                className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-center py-1.5"
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>v{localBuildInfo.version}</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {user.displayName}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 truncate">
                    @{user.username} ·{' '}
                    {user.role === 'master'
                      ? 'Master'
                      : user.role === 'admin'
                        ? 'Admin'
                        : 'Usuário'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChangePassOpen(true)}
                  title="Alterar minha senha"
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
              {/* Subtle semi-opaque version & online status indicator opening UpdateCenterModal */}
              {/* Indicador discreto e meio opaco de versão e status online abrindo a Central de Atualizações */}
              <button
                type="button"
                onClick={() => setUpdateCenterOpen(true)}
                title="Abrir Central de Atualizações & Diagnóstico"
                data-testid="sidebar-version-badge"
                className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-center py-2"
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>
                  v{localBuildInfo.version} • {localBuildInfo.commit}
                </span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        } flex flex-col min-w-0 transition-[padding] duration-200`}
      >
        {/* Top Bar (Compact 56px on mobile, 64px on desktop) */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {currentPageTitle}
            </h1>
          </div>

          {/* Company Selector & Month Selector */}
          {(activeView === 'dashboard' ||
            activeView === 'transactions' ||
            activeView === 'analytics' ||
            activeView === 'reports') && (
            <div className="flex items-center gap-2">
              <CompanySelector
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onSelectCompany={setSelectedCompanyId}
                onManageCompanies={() => setActiveView('settings')}
              />
              <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
                  aria-label="Mês anterior"
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-slate-800 dark:text-slate-200 min-w-[125px] text-center whitespace-nowrap">
                  {formatMonthLabel(selectedMonth)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
                  aria-label="Próximo mês"
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block">
              <PWAInstallButton compact />
            </div>
            <button
              type="button"
              onClick={() => syncWithServer(user.id, true)}
              disabled={isSyncing || !isOnline}
              title={
                !isOnline
                  ? 'Sem conexão para sincronizar'
                  : pendingCount > 0
                    ? `Sincronizar ${pendingCount} alteração(ões) pendente(s)`
                    : 'Sincronizar manualmente com o servidor'
              }
              className={`min-h-[40px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                pendingCount > 0
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {pendingCount > 0 ? `Sincronizar (${pendingCount})` : 'Sincronizar'}
              </span>
              {pendingCount > 0 && <span className="sm:hidden font-mono-tabular">{pendingCount}</span>}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationsBell
              alerts={dueAlerts}
              contacts={contacts}
              notifyLeadDays={notifyLeadDays}
              inAppAlertsEnabled={inAppAlertsEnabled}
              onToggleInAppAlerts={handleToggleInAppAlerts}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={handleRequestNotificationPermission}
              onOpenConsult={(tx) => setConsultingTx(tx)}
              onQuickSettle={handleToggleSettle}
              onNavigateToTransactions={(filter) => {
                setTxInitialFilter(filter || 'all');
                setActiveView('transactions');
              }}
              onOpenSettings={() => setActiveView('settings')}
              onOpenAlertsDrawer={() => setAlertsDrawerOpen(true)}
            />
          </div>
        </header>

        <OfflineSyncBanner
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSyncNow={() => syncWithServer(user.id, true)}
        />

        {/* Preventive Expiration Warning Banner (daysRemaining <= 5 and >= 0) & Expired Read-Only Strip (Phase 10.2) */}
        {/* Banner Preventivo de Vencimento de Licença (quando faltam 5 dias ou menos) e Aviso de Expiração */}
        {licenseStatus &&
          licenseStatus.daysRemaining >= 0 &&
          licenseStatus.daysRemaining <= 5 && (
            <div
              role="status"
              data-testid="license-expiring-banner"
              className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <span>
                  ⚠️ <em>Atenção: A licença de uso desta empresa expira em{' '}
                  <strong className="font-mono-tabular">{licenseStatus.daysRemaining}</strong> dia(s) (
                  <strong className="font-mono-tabular">{formatDateBR(licenseStatus.validUntil)}</strong>).</em>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSystemReleaseOpen(true)}
                data-testid="banner-open-release-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
              >
                <span>🔑 Liberar Sistema</span>
              </button>
            </div>
          )}

        {licenseStatus && (licenseStatus.isExpired || licenseStatus.daysRemaining < 0) && (
          <div
            role="alert"
            data-testid="license-expired-banner"
            className="bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-red-900 dark:text-red-200"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
              <span>
                <strong>Licença de uso expirada</strong> ({formatDateBR(licenseStatus.validUntil)}). Consultas e relatórios seguem liberados; insira o código para voltar a lançar.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSystemReleaseOpen(true)}
              data-testid="expired-banner-open-release-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
            >
              <span>🔑 Liberar Sistema</span>
            </button>
          </div>
        )}

        {/* Mobile Month Strip */}
        {(activeView === 'dashboard' ||
          activeView === 'transactions' ||
          activeView === 'analytics' ||
          activeView === 'reports') && (
          <div className="sm:hidden px-4 pt-3 flex items-center justify-between gap-2">
            <div className="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
                aria-label="Mês anterior"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
                aria-label="Próximo mês"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {loadingData && transactions.length === 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"
                  />
                ))}
              </div>
              <div className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  userId={user.id}
                  selectedMonth={selectedMonth}
                  transactions={transactions}
                  categories={categories}
                  contacts={contacts}
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  notifyLeadDays={notifyLeadDays}
                  inAppAlertsEnabled={inAppAlertsEnabled}
                  notificationPermission={notificationPermission}
                  onRequestNotificationPermission={handleRequestNotificationPermission}
                  onQuickSettle={handleToggleSettle}
                  onOpenConsult={(tx) => setConsultingTx(tx)}
                  onOpenNewTransaction={() => {
                    if (!ensureLicenseAllowsWrite()) return;
                    setEditingTx(null);
                    setTxModalOpen(true);
                  }}
                  onNavigateToTransactions={(filter) => {
                    setTxInitialFilter(filter || 'all');
                    setActiveView('transactions');
                  }}
                  onOpenAnalytics={() => setActiveView('analytics')}
                />
              )}

              {activeView === 'transactions' && (
                <TransactionsView
                  selectedMonth={selectedMonth}
                  initialFilter={txInitialFilter}
                  transactions={transactions}
                  categories={categories}
                  contacts={contacts}
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  onOpenNew={() => {
                    if (!ensureLicenseAllowsWrite()) return;
                    setEditingTx(null);
                    setTxModalOpen(true);
                  }}
                  onOpenConsult={(tx) => setConsultingTx(tx)}
                  onOpenEdit={(tx) => {
                    if (!ensureLicenseAllowsWrite()) return;
                    setEditingTx(tx);
                    setTxModalOpen(true);
                  }}
                  onOpenXmlImport={() => {
                    if (!ensureLicenseAllowsWrite()) return;
                    setXmlModalOpen(true);
                  }}
                  onOpenExcelImport={() => {
                    if (!ensureLicenseAllowsWrite()) return;
                    setExcelModalOpen(true);
                  }}
                  onToggleSettle={handleToggleSettle}
                  onDuplicate={handleDuplicateTransaction}
                  onBatchSettle={handleBatchSettle}
                  onBatchDelete={handleBatchDelete}
                  onDeleteSingle={handleDeleteSingleTransaction}
                  onDeleteGroup={handleDeleteTransactionGroup}
                  onManageInstallments={(tx) => setInstallmentManagerTx(tx)}
                />
              )}

              {activeView === 'contacts' && (
                <ContactsView
                  userId={user.id}
                  selectedMonth={selectedMonth}
                  contacts={contacts}
                  transactions={transactions}
                  onSaveContact={handleSaveContact}
                  onDeleteContact={handleDeleteContact}
                  onOpenConsult={(tx) => setConsultingTx(tx)}
                />
              )}

              {activeView === 'analytics' && (
                <AnalyticsView
                  selectedMonth={selectedMonth}
                  transactions={transactions}
                  categories={categories}
                  contacts={contacts}
                />
              )}

              {activeView === 'reports' && (
                <ReportsView
                  username={user.username}
                  selectedMonth={selectedMonth}
                  transactions={transactions}
                  categories={categories}
                  contacts={contacts}
                  onOpenConsult={(tx) => setConsultingTx(tx)}
                />
              )}

              {activeView === 'settings' && (
                <SettingsView
                  userId={user.id}
                  username={user.username}
                  userRole={user.role}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  categories={categories}
                  contacts={contacts}
                  transactions={transactions}
                  notifyLeadDays={notifyLeadDays}
                  onChangeNotifyLeadDays={handleChangeNotifyLeadDays}
                  inAppAlertsEnabled={inAppAlertsEnabled}
                  onToggleInAppAlerts={handleToggleInAppAlerts}
                  notificationPermission={notificationPermission}
                  onRequestNotificationPermission={handleRequestNotificationPermission}
                  onSaveCategory={handleSaveCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onRestoreBackup={handleRestoreLocalBackup}
                  onOpenChangePassword={() => setChangePassOpen(true)}
                  onCompaniesChange={setCompanies}
                  onOpenUpdateCenter={() => setUpdateCenterOpen(true)}
                  onOpenSystemRelease={() => setSystemReleaseOpen(true)}
                />
              )}

              {activeView === 'admin' && isMasterOrAdmin && (
                <AdminView
                  currentUser={user}
                  onNotify={showToast}
                  onLicenseChanged={() => refreshLicenseStatus()}
                />
              )}
            </>
          )}

          {/* Deploy Badge Footer (Version, Commit, Online Status & Update Center trigger) / Rodapé com Badge de Versão e Status */}
          <DeployFooter
            isOnline={isOnline}
            onOpenUpdateCenter={() => setUpdateCenterOpen(true)}
          />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (4 primary thumb-zone tabs, <= 15% height cap) */}
      <nav
        aria-label="Navegação principal mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center"
      >
        {[
          { id: 'dashboard' as AppView, label: 'Resumo', icon: LayoutDashboard },
          { id: 'transactions' as AppView, label: 'Contas', icon: ListChecks },
          { id: 'contacts' as AppView, label: 'PF / PJ', icon: Users },
          { id: 'reports' as AppView, label: 'Relatórios', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] text-[10px] font-medium transition-colors ${
                active
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Drawer Menu (Settings, Master Panel, PWA Install, Password, Logout) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs">
          <div className="w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-display font-bold text-base">FluxoClaro</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="p-2 rounded-lg text-slate-500 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="py-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium min-h-[44px] ${
                        activeView === item.id
                          ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="text-xs px-1">
                <div className="font-semibold text-slate-900 dark:text-white">{user.displayName}</div>
                <div className="font-mono-tabular text-slate-500">@{user.username}</div>
              </div>
              <PWAInstallButton />
              {/* Mobile shortcut to open Update Center / Atalho no menu lateral mobile para a Central de Atualizações */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setUpdateCenterOpen(true);
                }}
                data-testid="mobile-open-update-center"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold min-h-[42px]"
              >
                <Rocket className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                Central de Atualizações
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setChangePassOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold min-h-[42px]"
              >
                <KeyRound className="w-4 h-4" />
                Alterar Minha Senha
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold min-h-[42px]"
              >
                <LogOut className="w-4 h-4" />
                Sair da conta
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Modals & Drawers */}
      <AlertsDrawer
        isOpen={alertsDrawerOpen}
        onClose={() => setAlertsDrawerOpen(false)}
        alerts={dueAlerts}
        contacts={contacts}
        companies={companies}
        onQuickSettle={handleToggleSettle}
        onOpenConsult={(tx) => setConsultingTx(tx)}
      />

      {txModalOpen && (
        <TransactionModal
          userId={user.id}
          editingTransaction={editingTx}
          categories={categories}
          contacts={contacts}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onClose={() => {
            setTxModalOpen(false);
            setEditingTx(null);
          }}
          onSaveBatch={handleSaveTransactionBatch}
          onUpdateSingle={handleUpdateSingleTransaction}
        />
      )}

      {installmentManagerTx && (
        <InstallmentManagerModal
          isOpen={Boolean(installmentManagerTx)}
          transaction={installmentManagerTx}
          transactions={transactions}
          contacts={contacts}
          onClose={() => setInstallmentManagerTx(null)}
          onApplyRenegotiation={handleApplyRenegotiation}
        />
      )}

      {settlingTx && (
        <SettleModal
          transaction={settlingTx}
          contact={contacts.find((c) => c.id === settlingTx.contactId)}
          onClose={() => setSettlingTx(null)}
          onConfirm={handleConfirmSettle}
        />
      )}

      {consultingTx && (
        <TransactionDetailModal
          transaction={consultingTx}
          category={categories.find((c) => c.id === consultingTx.categoryId)}
          contact={contacts.find((c) => c.id === consultingTx.contactId)}
          companies={companies}
          username={user.username}
          onClose={() => setConsultingTx(null)}
        />
      )}

      {xmlModalOpen && (
        <XmlImportModal
          userId={user.id}
          categories={categories}
          contacts={contacts}
          existingTransactions={transactions}
          onClose={() => setXmlModalOpen(false)}
          onImport={handleSaveTransactionBatch}
          onCreateContact={handleSaveContact}
        />
      )}

      {excelModalOpen && (
        <ExcelImportModal
          userId={user.id}
          categories={categories}
          contacts={contacts}
          existingTransactions={transactions}
          onClose={() => setExcelModalOpen(false)}
          onImport={handleSaveTransactionBatch}
          onCreateContact={handleSaveContact}
        />
      )}

      {changePassOpen && (
        <ChangePasswordModal
          onClose={() => setChangePassOpen(false)}
          onSuccess={showToast}
        />
      )}

      {/* Update Center & System Diagnostics Modal / Gaveta da Central de Atualizações & Diagnóstico */}
      <UpdateCenterModal
        isOpen={updateCenterOpen}
        onClose={() => setUpdateCenterOpen(false)}
        isOnline={isOnline}
      />

      {/* System Release / License Activation Modal (Phase 10.2) / Modal de Liberação do Sistema */}
      <SystemReleaseModal
        isOpen={systemReleaseOpen}
        onClose={() => setSystemReleaseOpen(false)}
        licenseStatus={licenseStatus}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onActivated={(validUntil, daysRemaining) => {
          setLicenseStatus((prev) =>
            prev
              ? {
                  ...prev,
                  isValid: true,
                  isExpired: false,
                  validUntil,
                  daysRemaining,
                }
              : null
          );
          showToast(`Sistema liberado com sucesso até ${formatDateBR(validUntil)}!`);
          refreshLicenseStatus();
          window.setTimeout(() => {
            setSystemReleaseOpen(false);
          }, 800);
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-xs font-semibold shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
