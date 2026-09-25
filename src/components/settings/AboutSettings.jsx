import { SettingsGroup, SettingsRow } from './SettingsLayout';

export default function AboutSettings() {
  return (
    <div className="space-y-6">
      <SettingsGroup>
        <SettingsRow label="Uygulama" border={false}>
          <span className="text-sm font-medium text-[var(--settings-fg)]">Webbek WPOS Cafe</span>
        </SettingsRow>
        <SettingsRow label="Çalışma ortamı">
          <span className="settings-badge settings-badge-success">Web</span>
        </SettingsRow>
        <SettingsRow label="Lisans durumu" description="Cihaz lisansı">
          <span className="settings-badge settings-badge-success">Aktif</span>
        </SettingsRow>
        <div className="border-t border-[var(--settings-border)] px-5 py-4 text-center text-xs text-[var(--settings-subtle)]">
          © {new Date().getFullYear()} Webbek WPOS. Tüm hakları saklıdır.
        </div>
      </SettingsGroup>
    </div>
  );
}
