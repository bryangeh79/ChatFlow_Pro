import { mockSystemSettings } from '../../mock/system-settings';

export function SystemSettingsPageShell() {
  return {
    title: 'System Settings',
    settings: mockSystemSettings,
  };
}
