import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSettings, saveSettings } from '../../lib/api';
import { PERMS } from '../../lib/permissions';
import {
  loadSoundSettings,
  saveSoundSettings,
  MIN_AFK_TIMEOUT_SECONDS,
  MAX_AFK_TIMEOUT_SECONDS,
} from '../../lib/soundSettings';
import {
  SettingsGroup,
  SettingsMessage,
  SettingsRow,
  SettingsToggle,
  settingsBtnPrimary,
  settingsSelectClass,
} from './SettingsLayout';

export default function GeneralSettings() {
  const { staff, can } = useAuth();
  const canEdit = can(PERMS.MANAGE_SETTINGS);

  const [form, setForm] = useState({
    auto_open_sale_on_table_select: 'true',
    login_request_sound: 'true',
  });
  const [afkSeconds, setAfkSeconds] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError('');
      const settingsRes = await getSettings();
      if (settingsRes?.data) {
        const serverSettings = { ...settingsRes.data };
        delete serverSettings.allow_guest;
        delete serverSettings.auto_lock_on_end;
        delete serverSettings.login_auto_approve;
        delete serverSettings.client_login_background_url;
        delete serverSettings.client_authority_password;
        setForm((prev) => ({ ...prev, ...serverSettings }));
      }
    } catch (err) {
      console.error(err);
      setError('Ayarlar yüklenemedi.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadSoundSettings().then((settings) => setAfkSeconds(settings.afkTimeoutSeconds));
  }, []);

  async function handleSave() {
    if (!canEdit) {
      setError('Ayar kaydetme yetkiniz yok.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await saveSettings(form);
      if (!res?.status) throw new Error(res?.message || 'Kaydedilemedi');
      setMessage('Ayarlar kaydedildi.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <SettingsMessage tone="error">{error}</SettingsMessage>}
      {message && <SettingsMessage tone="success">{message}</SettingsMessage>}

      <SettingsGroup title="PC Seçenekleri" description="">
        <SettingsRow
          label="Masa seçince satış ekranını aç"
          border={false}
          description="Kapalıyken masa seçilir ama Masalar ekranında kalınır."
        >
          <SettingsToggle
            checked={String(form.auto_open_sale_on_table_select) !== 'false'}
            disabled={!canEdit}
            ariaLabel="Masa seçince satış ekranını aç"
            onChange={(v) =>
              setForm((f) => ({ ...f, auto_open_sale_on_table_select: v ? 'true' : 'false' }))
            }
          />
        </SettingsRow>
        <SettingsRow
          label="Giriş talebi sesi"
          description="Client'tan giriş talebi gelince ses çal"
        >
          <SettingsToggle
            checked={String(form.login_request_sound) !== 'false'}
            disabled={!canEdit}
            ariaLabel="Giriş talebi sesi"
            onChange={(v) =>
              setForm((f) => ({ ...f, login_request_sound: v ? 'true' : 'false' }))
            }
          />
        </SettingsRow>
        {canEdit && (
          <div className="flex justify-end border-t border-[var(--settings-border)] px-5 py-3">
            <button
              type="button"
              className={settingsBtnPrimary}
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup title="Cihaz seçenekleri" description="Bu seçenekler yalnızca bu cihaza özeldir.">
        <SettingsRow
          label="AFK süresi"
          description="Ekranda hiçbir işlem yapılmadığında giriş ekranına dönülmesi için beklenecek süre."
          border={false}
        >
          <select
            className={settingsSelectClass}
            aria-label="AFK süresi"
            disabled={!canEdit || afkSeconds == null}
            value={afkSeconds == null ? '' : Math.ceil(afkSeconds / 60)}
            onChange={async (e) => {
              const seconds = Number(e.target.value) * 60;
              await saveSoundSettings({ afkTimeoutSeconds: seconds });
              setAfkSeconds(seconds);
            }}
          >
            {afkSeconds == null && <option value="">Yükleniyor…</option>}
            {Array.from(
              { length: (MAX_AFK_TIMEOUT_SECONDS - MIN_AFK_TIMEOUT_SECONDS) / 60 + 1 },
              (_, index) => MIN_AFK_TIMEOUT_SECONDS / 60 + index
            ).map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} dakika</option>
            ))}
          </select>
        </SettingsRow>
      </SettingsGroup>

    </div>
  );
}
