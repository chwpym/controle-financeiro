import React from 'react';
import { Shield } from 'lucide-react';

export const RolePermissionsCard: React.FC = () => (
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
);
