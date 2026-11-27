import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';

interface NotificationsSectionProps {
  notifyLeadDays: number;
  onChangeNotifyLeadDays: (days: number) => void;
  inAppAlertsEnabled: boolean;
  onToggleInAppAlerts: (enabled: boolean) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
}

const LEAD_DAY_PRESETS = [
  { value: 0, label: 'No dia' },
  { value: 1, label: '1 dia' },
  { value: 3, label: '3 dias' },
  { value: 5, label: '5 dias' },
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
];

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  notifyLeadDays,
  onChangeNotifyLeadDays,
  inAppAlertsEnabled,
  onToggleInAppAlerts,
  notificationPermission,
  onRequestNotificationPermission,
}) => {
  const [notifySavedMsg, setNotifySavedMsg] = useState(false);

  const handleUpdateLeadDays = (rawDays: number) => {
    const sanitized = Number.isFinite(rawDays) ? Math.min(90, Math.max(0, Math.trunc(rawDays))) : 0;
    onChangeNotifyLeadDays(sanitized);
    setNotifySavedMsg(true);
  };

  return (
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
  );
};
