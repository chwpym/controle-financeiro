import React from 'react';
import type { UserRole } from '../../types';
import { AppearanceAccountSection } from './AppearanceAccountSection';
import { NotificationsSection } from './NotificationsSection';
import { RolePermissionsCard } from './RolePermissionsCard';

interface PreferencesSettingsTabProps {
  username: string;
  userRole: UserRole;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  notifyLeadDays: number;
  onChangeNotifyLeadDays: (days: number) => void;
  inAppAlertsEnabled: boolean;
  onToggleInAppAlerts: (enabled: boolean) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  onOpenChangePassword: () => void;
  onOpenUpdateCenter?: () => void;
  onOpenSystemRelease?: () => void;
}

export const PreferencesSettingsTab: React.FC<PreferencesSettingsTabProps> = ({
  username,
  userRole,
  theme,
  onToggleTheme,
  notifyLeadDays,
  onChangeNotifyLeadDays,
  inAppAlertsEnabled,
  onToggleInAppAlerts,
  notificationPermission,
  onRequestNotificationPermission,
  onOpenChangePassword,
  onOpenUpdateCenter,
  onOpenSystemRelease,
}) => (
  <>
    <NotificationsSection
      notifyLeadDays={notifyLeadDays}
      onChangeNotifyLeadDays={onChangeNotifyLeadDays}
      inAppAlertsEnabled={inAppAlertsEnabled}
      onToggleInAppAlerts={onToggleInAppAlerts}
      notificationPermission={notificationPermission}
      onRequestNotificationPermission={onRequestNotificationPermission}
    />

    <AppearanceAccountSection
      username={username}
      userRole={userRole}
      theme={theme}
      onToggleTheme={onToggleTheme}
      onOpenChangePassword={onOpenChangePassword}
      onOpenUpdateCenter={onOpenUpdateCenter}
      onOpenSystemRelease={onOpenSystemRelease}
    />

    <RolePermissionsCard />
  </>
);
