/**
 * AdminView.tsx
 *
 * EN: Administrative panel for user management, role-based access control (RBAC),
 *     per-company permissions, anti-fraud deletion locks, and credential resets.
 * PT: Painel administrativo para gestão de usuários, controle de acesso baseado em papéis (RBAC),
 *     permissões de acesso por empresa, travas anti-fraude de exclusão e redefinição de senhas.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Building2,
  CheckCircle2,
  Copy,
  Edit2,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { AdminSummary, AdminUserRow, Company, UserProfile, UserRole } from '../types';
import { api, ApiError } from '../utils/api';
import { formatBRL, formatDateBR } from '../utils/format';
import { AdminLicensesTab } from './admin/AdminLicensesTab';

interface AdminViewProps {
  currentUser: UserProfile;
  onNotify: (text: string) => void;
  /** Optional callback triggered when Master renews a company license / Callback opcional após renovar licença */
  onLicenseChanged?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  onNotify,
  onLicenseChanged,
}) => {
  // EN: Active section tab inside the Administrative Panel ('users' or 'licenses' for Master/Admin).
  // PT: Aba ativa dentro do Painel Administrativo ('users' para Usuários ou 'licenses' para Licenças & Assinaturas).
  const [adminTab, setAdminTab] = useState<'users' | 'licenses'>('users');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // EN: Modal-scoped error message so error alerts are displayed INSIDE the modals instead of behind them.
  // PT: Mensagem de erro exclusiva dos modais para garantir exibição DENTRO dos modais e não oculta no fundo.
  const [modalError, setModalError] = useState<string | null>(null);

  // EN: Create user modal state.
  // PT: Estados do formulário de criação de usuário.
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newCompanyIds, setNewCompanyIds] = useState<string[]>([]);
  const [newDefaultCompanyId, setNewDefaultCompanyId] = useState<string | null>(null);
  const [newCanDelete, setNewCanDelete] = useState(false);
  const [showCreateCloneMenu, setShowCreateCloneMenu] = useState(false);

  // EN: Edit user modal state.
  // PT: Estados do formulário de edição de usuário.
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editCompanyIds, setEditCompanyIds] = useState<string[]>([]);
  const [editDefaultCompanyId, setEditDefaultCompanyId] = useState<string | null>(null);
  const [editCanDelete, setEditCanDelete] = useState(true);
  const [showEditCloneMenu, setShowEditCloneMenu] = useState(false);

  // EN: Reset password modal state (allows master/admin to reset any user's password without email).
  // PT: Estados do modal de redefinição de senha (permite alterar senha sem envio de e-mail).
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [resetNewPass, setResetNewPass] = useState('');

  /**
   * EN: Loads users, admin summary, and active companies for assignment.
   * PT: Carrega usuários, resumo administrativo e lista de empresas ativas para vinculação.
   */
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, companiesData] = await Promise.all([
        api.getAdminUsers(),
        api.getCompanies().catch(() => ({ companies: [] })),
      ]);
      setUsers(usersData.users);
      setSummary(usersData.summary);
      setAvailableCompanies(companiesData.companies.filter((c) => c.status === 'active'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar usuários. Verifique se está online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  /**
   * EN: Opens the Create User modal, clearing inputs and errors.
   * PT: Abre o modal de criação de usuário, limpando campos e erros prévios.
   */
  const handleOpenCreate = () => {
    setModalError(null);
    setNewUsername('');
    setNewDisplayName('');
    setNewPassword('');
    setNewRole('user');
    // Default: for operator 'user', select all available companies if desired or empty
    setNewCompanyIds(availableCompanies.map((c) => c.id));
    setNewDefaultCompanyId(availableCompanies[0]?.id || null);
    setNewCanDelete(false); // Operador começa bloqueado para exclusão por padrão
    setShowCreateCloneMenu(false);
    setShowCreate(true);
  };

  /**
   * EN: Opens the Edit User modal with target user data and permissions.
   * PT: Abre o modal de edição com os dados e permissões do usuário alvo.
   */
  const handleOpenEdit = (u: AdminUserRow) => {
    setModalError(null);
    setEditingUser(u);
    setEditUsername(u.username);
    setEditDisplayName(u.displayName);
    setEditRole(u.role);
    setEditCompanyIds(u.companyIds ? [...u.companyIds] : []);
    setEditDefaultCompanyId(u.defaultCompanyId || (u.companyIds?.[0] || null));
    setEditCanDelete(u.canDelete !== false);
    setShowEditCloneMenu(false);
  };

  /**
   * EN: Opens the password reset modal for a specific user.
   * PT: Abre o modal de redefinição de senha para um usuário específico.
   */
  const handleOpenReset = (u: AdminUserRow) => {
    setModalError(null);
    setResetTarget(u);
    setResetNewPass('');
  };

  /**
   * EN: Clones companies, default company, and canDelete flag from an existing user into the create form.
   * PT: Clona empresas, empresa padrão e flag canDelete de outro usuário para o formulário de cadastro.
   */
  const handleCloneToCreate = (sourceUser: AdminUserRow) => {
    const targetCompIds = sourceUser.companyIds ? [...sourceUser.companyIds] : [];
    setNewCompanyIds(targetCompIds);
    setNewDefaultCompanyId(sourceUser.defaultCompanyId || (targetCompIds[0] || null));
    setNewCanDelete(sourceUser.canDelete !== false);
    setShowCreateCloneMenu(false);
    onNotify(`Permissões copiadas de @${sourceUser.username}.`);
  };

  /**
   * EN: Clones companies, default company, and canDelete flag from an existing user into the edit form.
   * PT: Clona empresas, empresa padrão e flag canDelete de outro usuário para o formulário de edição.
   */
  const handleCloneToEdit = (sourceUser: AdminUserRow) => {
    const targetCompIds = sourceUser.companyIds ? [...sourceUser.companyIds] : [];
    setEditCompanyIds(targetCompIds);
    setEditDefaultCompanyId(sourceUser.defaultCompanyId || (targetCompIds[0] || null));
    setEditCanDelete(sourceUser.canDelete !== false);
    setShowEditCloneMenu(false);
    onNotify(`Permissões copiadas de @${sourceUser.username}.`);
  };

  /**
   * EN: Handles creation of a new user account with RBAC parameters.
   * PT: Processa a criação da nova conta de usuário com parâmetros de permissão RBAC.
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setError(null);

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(newUsername.trim())) {
      setModalError('Nome de usuário inválido (3 a 32 caracteres sem espaços).');
      return;
    }
    if (newPassword.length < 4) {
      setModalError('Senha deve ter pelo menos 4 caracteres.');
      return;
    }

    try {
      await api.createAdminUser({
        username: newUsername.trim(),
        displayName: newDisplayName.trim() || newUsername.trim(),
        password: newPassword,
        role: newRole,
        companyIds: newRole === 'user' ? newCompanyIds : undefined,
        defaultCompanyId: newRole === 'user' ? newDefaultCompanyId : null,
        canDelete: newRole === 'user' ? newCanDelete : true,
      });
      setShowCreate(false);
      onNotify('Usuário criado com sucesso.');
      await loadData();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Erro ao criar usuário.');
    }
  };

  /**
   * EN: Saves edits to an existing user account.
   * PT: Salva as alterações de um usuário existente.
   */
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);
    setError(null);

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(editUsername.trim())) {
      setModalError('Nome de usuário inválido (3 a 32 caracteres sem espaços).');
      return;
    }

    try {
      await api.updateAdminUser(editingUser.id, {
        username: editUsername.trim(),
        displayName: editDisplayName.trim(),
        role: editRole,
        companyIds: editRole === 'user' ? editCompanyIds : undefined,
        defaultCompanyId: editRole === 'user' ? editDefaultCompanyId : null,
        canDelete: editRole === 'user' ? editCanDelete : true,
      });
      setEditingUser(null);
      onNotify('Dados do usuário atualizados.');
      await loadData();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Erro ao atualizar usuário.');
    }
  };

  /**
   * EN: Toggles user active / suspended status.
   * PT: Alterna status ativo / suspenso do usuário.
   */
  const handleToggleStatus = async (u: AdminUserRow) => {
    setError(null);
    try {
      const nextStatus = u.status === 'active' ? 'suspended' : 'active';
      await api.updateAdminUser(u.id, { status: nextStatus });
      onNotify(nextStatus === 'active' ? `Usuário ${u.username} reativado.` : `Usuário ${u.username} suspenso.`);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao alterar status.');
    }
  };

  /**
   * EN: Resets user password directly without email.
   * PT: Redefine a senha do usuário diretamente sem necessidade de e-mail.
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setModalError(null);
    setError(null);

    if (resetNewPass.length < 4) {
      setModalError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    try {
      await api.resetUserPassword(resetTarget.id, resetNewPass);
      onNotify(`Senha de ${resetTarget.username} redefinida com sucesso.`);
      setResetTarget(null);
      setResetNewPass('');
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Erro ao redefinir senha.');
    }
  };

  /**
   * EN: Deletes a user account.
   * PT: Exclui a conta de um usuário.
   */
  const handleDeleteUser = async (u: AdminUserRow) => {
    setError(null);
    try {
      await api.deleteAdminUser(u.id);
      onNotify(`Usuário ${u.username} removido.`);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao excluir usuário.');
    }
  };

  const roleLabel = (role: UserRole) =>
    role === 'master' ? 'Master' : role === 'admin' ? 'Admin' : 'Usuário';

  /**
   * EN: Helper to render summary of linked companies for a table row.
   * PT: Helper para formatar o resumo de empresas vinculadas na tabela.
   */
  const renderCompaniesSummary = (u: AdminUserRow) => {
    if (u.role === 'master' || u.role === 'admin') {
      return <span className="text-slate-600 dark:text-slate-400">Todas</span>;
    }
    const count = u.companyNames?.length ?? u.companyIds?.length ?? 0;
    if (count === 0) {
      return <span className="text-slate-400 dark:text-slate-500">Nenhuma</span>;
    }
    const label = count === 1 ? '1 empresa' : `${count} empresas`;
    const titleText = u.companyNames?.join(', ') || '';
    return (
      <span className="font-mono-tabular text-slate-700 dark:text-slate-300" title={titleText}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs: Users vs Licenses & Subscriptions (Phase 10.2) */}
      {/* Abas de Navegação do Painel Master: Usuários & Permissões vs Licenças & Assinaturas */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
        data-testid="admin-tabs"
      >
        <button
          type="button"
          onClick={() => setAdminTab('users')}
          data-testid="admin-tab-users"
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            adminTab === 'users'
              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          <span>Usuários &amp; Permissões</span>
        </button>

        {(currentUser.role === 'master' || currentUser.role === 'admin') && (
          <button
            type="button"
            onClick={() => setAdminTab('licenses')}
            data-testid="admin-tab-licenses"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              adminTab === 'licenses'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            <span>Licenças &amp; Assinaturas</span>
          </button>
        )}
      </div>

      {adminTab === 'licenses' ? (
        <AdminLicensesTab onNotify={onNotify} onLicenseChanged={onLicenseChanged} />
      ) : (
        <>
      {/* Admin Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Usuários Registrados</div>
            <div className="mt-1.5 text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-white">
              {summary.totalUsers}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {summary.activeUsers} ativo(s) · {summary.suspendedUsers} suspenso(s)
            </div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Master e Admins</div>
            <div className="mt-1.5 text-2xl font-display font-bold font-mono-tabular text-teal-700 dark:text-teal-400">
              {summary.masterAndAdminCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">Contas com gestão</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total de Lançamentos</div>
            <div className="mt-1.5 text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-white">
              {summary.totalTransactions}
            </div>
            <div className="mt-1 text-xs text-slate-500">Em toda a base SQLite</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Pendente Geral (BRL)</div>
            <div className="mt-1.5 text-xl font-display font-bold font-mono-tabular text-slate-900 dark:text-white">
              {formatBRL(summary.totalPendingCents)}
            </div>
            <div className="mt-1 text-xs text-slate-500">Somatório em aberto</div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Permissions Matrix Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
            Permissões por Tipo de Usuário
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-3.5 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-white">Usuário (Operador)</div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Acesso restrito às empresas vinculadas pelo administrador. Trava anti-fraude que bloqueia exclusão de lançamentos financeiros quando desativada.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-3.5 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-white">Administrador</div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Acesso irrestrito a todas as empresas cadastradas + gestão de usuários no painel: criar contas, vincular CNPJs, suspender acessos e redefinir senhas.
            </p>
          </div>
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 space-y-1">
            <div className="font-semibold text-teal-800 dark:text-teal-300">Usuário Master</div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Autoridade máxima irrestrita em todas as empresas e visão consolidada, com poder exclusivo para criar, editar, promover e excluir outros Masters e Admins.
            </p>
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuário por login, nome ou papel..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Usuário
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                <th className="py-3 px-4">Usuário / Nome</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4">Empresas</th>
                <th className="py-3 px-4">Permissão Exclusão</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registros</th>
                <th className="py-3 px-4">Último Acesso</th>
                <th className="py-3 px-4 text-right">Ações do Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{u.displayName}</span>
                      {u.id === currentUser.id && (
                        <span className="text-[11px] text-teal-700 dark:text-teal-400">(você)</span>
                      )}
                    </div>
                    <div className="font-mono-tabular text-slate-500 dark:text-slate-400">
                      @{u.username}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
                      {u.role !== 'user' && <Shield className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />}
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {renderCompaniesSummary(u)}
                  </td>
                  <td className="py-3 px-4">
                    {u.role === 'user' ? (
                      u.canDelete !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Pode Excluir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          Sem Exclusão
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
                        Total
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    <span
                      className={
                        u.status === 'active'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {u.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-600 dark:text-slate-300">
                    {u.transactionCount} contas · {u.contactCount} contatos
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-500 dark:text-slate-400">
                    {u.lastLoginAt ? formatDateBR(u.lastLoginAt) : 'Nunca entrou'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {u.role === 'master' && currentUser.role !== 'master' ? (
                      <span className="text-[11px] text-slate-400">Gerenciado apenas pelo Master</span>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenReset(u)}
                          title="Alterar / Recuperar senha deste usuário"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                          Senha
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          title="Editar usuário"
                          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              title={u.status === 'active' ? 'Suspender acesso' : 'Reativar acesso'}
                              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              {u.status === 'active' ? (
                                <Ban className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              title="Excluir usuário"
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* Create User Modal / Modal de Criação de Usuário */}
      {/* ========================================================================= */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                  Criar Novo Usuário
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setShowCreate(false);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Clone Permissions Button / Botão de Clonagem Rápida */}
              {users.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Copiar empresas e regras prontas:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreateCloneMenu((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      [ 📋 Copiar de Outro Usuário ]
                    </button>
                  </div>

                  {showCreateCloneMenu && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 max-h-40 overflow-y-auto">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Selecione o usuário de referência:
                      </div>
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleCloneToCreate(u)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-medium">{u.displayName} (@{u.username})</span>
                          <span className="text-[10px] text-slate-400">
                            {u.role} · {u.canDelete ? 'Exclui' : 'Sem Exclusão'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Basic Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nome de usuário *</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ex: operador.caixa"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Nome completo</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="ex: João da Silva"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Senha inicial *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Perfil de acesso</label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const next = e.target.value as UserRole;
                      setNewRole(next);
                      if (next === 'admin' || next === 'master') {
                        setNewCanDelete(true);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  >
                    <option value="user">Usuário (Operador)</option>
                    <option value="admin">Administrador</option>
                    {currentUser.role === 'master' && <option value="master">Usuário Master</option>}
                  </select>
                </div>
              </div>

              {/* Per-Company Permissions Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Empresas Liberadas
                    </span>
                  </div>
                  {newRole === 'user' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = availableCompanies.map((c) => c.id);
                          setNewCompanyIds(allIds);
                          if (!newDefaultCompanyId && allIds.length > 0) {
                            setNewDefaultCompanyId(allIds[0]);
                          }
                        }}
                        className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        [ Marcar Todas ]
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCompanyIds([]);
                          setNewDefaultCompanyId(null);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                      >
                        [ Desmarcar ]
                      </button>
                    </div>
                  )}
                </div>

                {newRole !== 'user' ? (
                  <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
                    Administradores e Masters possuem acesso irrestrito a todas as empresas cadastradas e à visão consolidada.
                  </div>
                ) : (
                  <>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                      {availableCompanies.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          Nenhuma empresa ativa cadastrada no sistema.
                        </div>
                      ) : (
                        availableCompanies.map((comp) => {
                          const checked = newCompanyIds.includes(comp.id);
                          return (
                            <label
                              key={comp.id}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewCompanyIds((prev) => [...prev, comp.id]);
                                    if (!newDefaultCompanyId) setNewDefaultCompanyId(comp.id);
                                  } else {
                                    setNewCompanyIds((prev) => prev.filter((id) => id !== comp.id));
                                    if (newDefaultCompanyId === comp.id) {
                                      const remaining = newCompanyIds.filter((id) => id !== comp.id);
                                      setNewDefaultCompanyId(remaining[0] || null);
                                    }
                                  }
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 text-teal-700 focus:ring-teal-600"
                              />
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: comp.color || '#0F766E' }}
                              />
                              <span className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
                                {comp.tradeName || comp.legalName}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Default Company Initial Dropdown */}
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Empresa Padrão Inicial
                      </label>
                      <select
                        value={newDefaultCompanyId || ''}
                        onChange={(e) => setNewDefaultCompanyId(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                      >
                        {newCompanyIds.length === 0 ? (
                          <option value="">Nenhuma empresa selecionada</option>
                        ) : (
                          availableCompanies
                            .filter((c) => newCompanyIds.includes(c.id))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.tradeName || c.legalName}
                              </option>
                            ))
                        )}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Anti-fraud Lock / Trava de Segurança Anti-Fraude */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCanDelete}
                    onChange={(e) => setNewCanDelete(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-teal-700 focus:ring-teal-600"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Pode excluir lançamentos financeiros
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Permite apagar contas a pagar/receber e exclusões em lote. Se desmarcado, o operador poderá apenas consultar, cadastrar, editar e liquidar.
                    </p>
                  </div>
                </label>
              </div>

              {/* Modal Error Banner / Destaque de Erro Dentro do Modal */}
              {modalError && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs font-medium text-red-700 dark:text-red-300">
                  {modalError}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setShowCreate(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium min-h-[40px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px] cursor-pointer"
                >
                  Criar usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Edit User Modal / Modal de Edição de Usuário */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                  Editar Usuário (@{editingUser.username})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setEditingUser(null);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Clone Permissions Button */}
              {users.length > 1 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Copiar empresas e regras prontas:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEditCloneMenu((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      [ 📋 Copiar de Outro Usuário ]
                    </button>
                  </div>

                  {showEditCloneMenu && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 max-h-40 overflow-y-auto">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Selecione o usuário de referência:
                      </div>
                      {users
                        .filter((u) => u.id !== editingUser.id)
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleCloneToEdit(u)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-medium">{u.displayName} (@{u.username})</span>
                            <span className="text-[10px] text-slate-400">
                              {u.role} · {u.canDelete ? 'Exclui' : 'Sem Exclusão'}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nome de usuário</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Nome completo</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Perfil de acesso</label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    const next = e.target.value as UserRole;
                    setEditRole(next);
                    if (next === 'admin' || next === 'master') {
                      setEditCanDelete(true);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                >
                  <option value="user">Usuário (Operador)</option>
                  <option value="admin">Administrador</option>
                  {currentUser.role === 'master' && <option value="master">Usuário Master</option>}
                </select>
              </div>

              {/* Per-Company Permissions Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Empresas Liberadas
                    </span>
                  </div>
                  {editRole === 'user' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = availableCompanies.map((c) => c.id);
                          setEditCompanyIds(allIds);
                          if (!editDefaultCompanyId && allIds.length > 0) {
                            setEditDefaultCompanyId(allIds[0]);
                          }
                        }}
                        className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        [ Marcar Todas ]
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditCompanyIds([]);
                          setEditDefaultCompanyId(null);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                      >
                        [ Desmarcar ]
                      </button>
                    </div>
                  )}
                </div>

                {editRole !== 'user' ? (
                  <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
                    Administradores e Masters possuem acesso irrestrito a todas as empresas cadastradas e à visão consolidada.
                  </div>
                ) : (
                  <>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                      {availableCompanies.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          Nenhuma empresa ativa cadastrada no sistema.
                        </div>
                      ) : (
                        availableCompanies.map((comp) => {
                          const checked = editCompanyIds.includes(comp.id);
                          return (
                            <label
                              key={comp.id}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditCompanyIds((prev) => [...prev, comp.id]);
                                    if (!editDefaultCompanyId) setEditDefaultCompanyId(comp.id);
                                  } else {
                                    setEditCompanyIds((prev) => prev.filter((id) => id !== comp.id));
                                    if (editDefaultCompanyId === comp.id) {
                                      const remaining = editCompanyIds.filter((id) => id !== comp.id);
                                      setEditDefaultCompanyId(remaining[0] || null);
                                    }
                                  }
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 text-teal-700 focus:ring-teal-600"
                              />
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: comp.color || '#0F766E' }}
                              />
                              <span className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
                                {comp.tradeName || comp.legalName}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Default Company Initial Dropdown */}
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Empresa Padrão Inicial
                      </label>
                      <select
                        value={editDefaultCompanyId || ''}
                        onChange={(e) => setEditDefaultCompanyId(e.target.value || null)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                      >
                        {editCompanyIds.length === 0 ? (
                          <option value="">Nenhuma empresa selecionada</option>
                        ) : (
                          availableCompanies
                            .filter((c) => editCompanyIds.includes(c.id))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.tradeName || c.legalName}
                              </option>
                            ))
                        )}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Anti-fraud Lock */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCanDelete}
                    onChange={(e) => setEditCanDelete(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-teal-700 focus:ring-teal-600"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Pode excluir lançamentos financeiros
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      Permite apagar contas a pagar/receber e exclusões em lote. Se desmarcado, o operador poderá apenas consultar, cadastrar, editar e liquidar.
                    </p>
                  </div>
                </label>
              </div>

              {/* Modal Error Banner */}
              {modalError && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs font-medium text-red-700 dark:text-red-300">
                  {modalError}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium min-h-[40px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px] cursor-pointer"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Reset Password Modal / Modal de Redefinição de Senha */}
      {/* ========================================================================= */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Redefinir Senha — @{resetTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setResetTarget(null);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Defina uma nova senha para <strong>{resetTarget.displayName}</strong> diretamente sem precisar de e-mail.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium mb-1">Nova senha *</label>
                <input
                  type="password"
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
                />
              </div>

              {/* Modal Error Banner */}
              {modalError && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs font-medium text-red-700 dark:text-red-300">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalError(null);
                    setResetTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium min-h-[40px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px] cursor-pointer"
                >
                  Definir nova senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
