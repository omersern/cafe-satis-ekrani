import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAfkTimer from '../hooks/useAfkTimer';
import { ROUTES } from '../lib/routes';
import NotificationsBell from './NotificationsBell';

const pageMeta = {
  [ROUTES.metro]: ['Webbek Cafe', ''],
  [ROUTES.sale]: ['Satış', 'Adisyon ve masa yönetimi'],
  [ROUTES.additionReports]: ['Adisyon raporu', 'Satış ve ödeme geçmişi'],
  [ROUTES.reservations]: ['Rezervasyonlar', 'Masa ve misafir planlaması'],
  [ROUTES.tariffs]: ['Tarifeler', 'Fiyatlandırma tarifeleri'],
  [ROUTES.day]: ['Gün işlemleri', 'Vardiya ve kasa yönetimi'],
  [ROUTES.settings]: ['Ayarlar', 'Cafe uygulaması yapılandırması'],
};

export default function GlobalHeader({ onMenu }) {
  const location = useLocation();
  const { cloudStatus, refreshCloudStatus } = useAuth();
  const { afkLabel } = useAfkTimer();
  const [clock, setClock] = useState('');
  const [title, subtitle] = pageMeta[location.pathname] || ['Webbek WPOS', 'Cafe'];

  useEffect(() => {
    refreshCloudStatus?.();
    window.addEventListener('online', refreshCloudStatus);
    return () => window.removeEventListener('online', refreshCloudStatus);
  }, [refreshCloudStatus]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="edge-header">
      <button type="button" className="edge-menu-button" onClick={onMenu} aria-label="Ana menüyü aç"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>
      <div className="edge-header-copy"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      <div className="edge-header-actions">
        <NotificationsBell />
        {cloudStatus && (() => {
          const pending = cloudStatus.outbox?.pending ?? 0;
          const unsynced = cloudStatus.syncHealth?.unsyncedClosed ?? 0;
          const parts = [];
          if (pending > 0) {
            parts.push(cloudStatus.hasCloudAuth
              ? `${pending} kuyrukta`
              : `${pending} PIN ile gönderilecek`);
          }
          if (unsynced > 0) parts.push(`${unsynced} kapalı buluta gitmedi`);
          return (
            <span className={`edge-connection${cloudStatus.online ? ' is-online' : ''}`}>
              <i />
              {cloudStatus.online ? 'Çevrimiçi' : 'Çevrimdışı'}
              {parts.length > 0 ? ` · ${parts.join(' · ')}` : ''}
            </span>
          );
        })()}
        <span className="edge-afk-timer" title="Oturum zaman aşımı">
          <strong>{afkLabel}</strong>
        </span>
      </div>
    </header>
  );
}
