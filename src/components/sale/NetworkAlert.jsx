import { useEffect, useState } from 'react';

function OfflineIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function SlowIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.859a10 10 0 0 1 14 0" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
    </svg>
  );
}

const ALERT_CONFIG = {
  offline: {
    toneClass: 'sale-win11-network-alert--offline',
    badge: 'Çevrimdışı',
    title: 'İnternet bağlantısı yok',
    message: 'Bağlantınızı kontrol edin. Bu durumda işlem yapamazsınız.',
    Icon: OfflineIcon,
  },
  slow: {
    toneClass: 'sale-win11-network-alert--slow',
    badge: 'Yavaş bağlantı',
    title: 'Sunucuya erişim yavaş',
    message: 'İşlemler normalden daha uzun sürebilir.',
    Icon: SlowIcon,
  },
};

export default function NetworkAlert({ networkStatus }) {
  const isOffline = !networkStatus.isOnline;
  const isSlow = networkStatus.isSlow && networkStatus.isOnline;
  const show = isOffline || isSlow;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return undefined;
    }

    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [show, isOffline, isSlow]);

  if (!show) return null;

  const config = isOffline ? ALERT_CONFIG.offline : ALERT_CONFIG.slow;
  const { toneClass, badge, title, message, Icon } = config;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`sale-win11-network-alert ${toneClass}${visible ? ' is-visible' : ''}`}
    >
      <div className="sale-win11-network-alert__icon" aria-hidden>
        <Icon />
      </div>

      <div className="sale-win11-network-alert__content">
        <p className="sale-win11-network-alert__title">{title}</p>
        <p className="sale-win11-network-alert__message">{message}</p>
      </div>

      <span className="sale-win11-network-alert__badge">{badge}</span>
    </div>
  );
}
