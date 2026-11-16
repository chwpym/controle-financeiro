import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Edit2,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminSummary, AdminUserRow, UserProfile, UserRole } from '../types';
import { api, ApiError } from '../utils/api';
import { formatBRL, formatDateBR } from '../utils/format';

interface AdminViewProps {
  currentUser: UserProfile;
  onNotify: (text: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, onNotify }) => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');

  // Edit user modal
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');

  // Reset password modal (Master recovers/changes any user's password without email)
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [resetNewPass, setResetNewPass] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminUsers();
      setUsers(data.users);
      setSummary(data.summary);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createAdminUser({
        username: newUsername.trim(),
        displayName: newDisplayName.trim() || newUsername.trim(),
        password: newPassword,
        role: newRole,
      });
      setShowCreate(false);
      setNewUsername('');
      setNewDisplayName('');
      setNewPassword('');
      setNewRole('user');
      onNotify('Usuário criado com sucesso.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar usuário.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    try {
      await api.updateAdminUser(editingUser.id, {
        username: editUsername.trim(),
        displayName: editDisplayName.trim(),
        role: editRole,
      });
      setEditingUser(null);
      onNotify('Dados do usuário atualizados.');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar usuário.');
    }
  };

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setError(null);
    try {
      await api.resetUserPassword(resetTarget.id, resetNewPass);
      onNotify(`Senha de ${resetTarget.username} redefinida com sucesso.`);
      setResetTarget(null);
      setResetNewPass('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao redefinir senha.');
    }
  };

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

  return (
    <div className="space-y-6">
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
            <div className="font-semibold text-slate-900 dark:text-white">Usuário</div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Acesso ao próprio financeiro: contas P/R, parcelamentos, baixas com forma de pagamento, PF/PJ, categorias, XML, relatórios PDF/Excel, backup local e troca da própria senha.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-3.5 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-white">Administrador</div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Todas as funções de Usuário + gestão de usuários no Painel Administrativo: criar contas (Usuário/Admin), suspender ou reativar acessos e redefinir senhas de contas não-Master.
            </p>
          </div>
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 space-y-1">
            <div className="font-semibold text-teal-800 dark:text-teal-300">Usuário Master</div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Autoridade máxima: tudo que o Administrador faz + poder exclusivo para criar, editar, promover, redefinir senha e excluir outros Administradores e Usuários Master.
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
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px]"
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
                          onClick={() => {
                            setResetTarget(u);
                            setResetNewPass('');
                          }}
                          title="Alterar / Recuperar senha deste usuário"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                          Senha
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setEditUsername(u.username);
                            setEditDisplayName(u.displayName);
                            setEditRole(u.role);
                          }}
                          title="Editar usuário"
                          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              title={u.status === 'active' ? 'Suspender acesso' : 'Reativar acesso'}
                              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
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

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Criar Novo Usuário (Sem E-mail)
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium mb-1">Nome de usuário *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="ex: maria.financeiro"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nome completo</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Senha inicial *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Perfil de acesso</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                  {currentUser.role === 'master' && <option value="master">Usuário Master</option>}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium min-h-[42px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[42px]"
                >
                  Criar usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Editar Usuário (@{editingUser.username})
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium mb-1">Nome de usuário</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nome completo</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Perfil de acesso</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                  {currentUser.role === 'master' && <option value="master">Usuário Master</option>}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium min-h-[42px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[42px]"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Redefinir Senha — @{resetTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium min-h-[42px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[42px]"
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
