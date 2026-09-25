import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { prefetchCloudStartup } from '../../lib/api';
import { clearCloudPairing } from '../../lib/cloudClient';
import {
  SettingsGroup,
  SettingsMessage,
  SettingsRow,
  settingsBtnPrimary,
} from './SettingsLayout';

export default function CloudSettings() {
  const { cloudStatus, refreshCloudStatus } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    refreshCloudStatus?.();
  }, [refreshCloudStatus]);

  const refreshCatalog = useCallback(async () => {
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const result = await prefetchCloudStartup();
      setMessage(
        `Buluttan güncellendi · ürün ${result.catalog.productCount} · tarife ${result.bootstrap.tariffCount} · masa ${result.bootstrap.stationCount}`
      );
      await refreshCloudStatus?.();
    } catch (err) {
      setError(err.message || 'Buluttan veri alınamadı');
    } finally {
      setSyncing(false);
    }
  }, [refreshCloudStatus]);

  const unpair = useCallback(async () => {
    if (!window.confirm('Cihaz eşleştirmesi sıfırlansın mı? Setup ekranına dönülür.')) return;
    clearCloudPairing();
    window.location.href = '/setup';
  }, []);

  return (
    <div className="space-y-6">
      {error && <SettingsMessage tone="error">{error}</SettingsMessage>}
      {message && <SettingsMessage tone="success">{message}</SettingsMessage>}

      <SettingsGroup title="Durum" description="Bulut bağlantı durumu">
        <SettingsRow label="Eşleşme" border={false}>
          <span
            className={`settings-badge ${
              cloudStatus?.paired ? 'settings-badge-success' : 'settings-badge-warn'
            }`}
          >
            {cloudStatus?.paired ? 'Eşleşme başarılı' : 'Eşleşme başarısız'}
          </span>
        </SettingsRow>
        <SettingsRow label="Online">
          <span
            className={`settings-badge ${
              cloudStatus?.online ? 'settings-badge-success' : 'settings-badge-warn'
            }`}
          >
            {cloudStatus?.online ? 'Evet' : 'Hayır'}
          </span>
        </SettingsRow>
        <SettingsRow label="İşletme kimliği (client_id)">
          <span className="text-sm font-medium text-[var(--settings-fg)]">
            {cloudStatus?.clientId || '—'}
          </span>
        </SettingsRow>
        <SettingsRow label="Cihaz kimliği (device_id)" border={false}>
          <span className="text-sm font-medium text-[var(--settings-fg)]">
            {cloudStatus?.deviceId || '—'}
          </span>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        title="Katalog"
        description="Satış ekranı ürün listesini doğrudan buluttan yeniler (sessionStorage önbelleği)."
      >
        <SettingsRow label="Yenile" border={false}>
          <button
            type="button"
            className={settingsBtnPrimary}
            disabled={syncing || !cloudStatus?.paired}
            onClick={refreshCatalog}
          >
            {syncing ? 'Çekiliyor…' : 'Buluttan yenile'}
          </button>
        </SettingsRow>
      </SettingsGroup>

      {cloudStatus?.paired && (
        <SettingsGroup title="Cihaz" description="Eşleştirmeyi sıfırlamak verileri silmez ancak ilk kuruluma geri döner.">
          <div className="p-4">
            <button type="button" className="settings-btn settings-btn-danger" onClick={unpair}>
              Cihaz eşleştirmesini sıfırla
            </button>
          </div>
        </SettingsGroup>
      )}
    </div>
  );
}
