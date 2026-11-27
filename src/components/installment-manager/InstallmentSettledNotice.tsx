import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const InstallmentSettledNotice: React.FC<{ settledCount: number }> = ({ settledCount }) => (
  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center space-y-1">
    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
      Contrato totalmente quitado!
    </p>
    <p className="text-xs text-emerald-700 dark:text-emerald-400">
      Todas as {settledCount} parcelas deste contrato já foram liquidadas com sucesso.
    </p>
  </div>
);
