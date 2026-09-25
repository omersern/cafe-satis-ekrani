import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearAllNotifications,
  listNotifications,
  markNotificationRead,
} from '../lib/api';

function playDing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(740, ctx.currentTime);
    o.frequency.setValueAtTime(980, ctx.currentTime + 0.07);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.31);
    o.onended = () => ctx.close();
  } catch { /* sessiz */ }
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function typeLabel(type) {
  if (type === 'support') return 'Destek';
  if (type === 'usb_connected') return 'USB +';
  if (type === 'usb_disconnected') return 'USB −';
  return 'Bildirim';
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);
  const seenUnread = useRef(new Set());

  const unreadCount = items.filter((item) => !item.readAt).length;

  const refresh = useCallback(async () => {
    try {
      const res = await listNotifications();
      const list = res?.data || [];
      const unread = list.filter((item) => !item.readAt);
      const newUnread = unread.some((item) => !seenUnread.current.has(item.id));
      if (newUnread && unread.length > 0) playDing();
      seenUnread.current = new Set(unread.map((item) => item.id));
      setItems(list);
    } catch { /* sessiz */ }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('wpos:notifications-refresh', refresh);
    return () => window.removeEventListener('wpos:notifications-refresh', refresh);
  }, [refresh]);

  useEffect(() => {
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && wrapRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  const handleOpen = () => {
    setOpen((value) => !value);
  };

  const handleRead = async (item) => {
    if (item.readAt) return;
    try {
      await markNotificationRead(item.id);
      await refresh();
    } catch { /* sessiz */ }
  };

  const handleClearAll = async () => {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      await clearAllNotifications();
      seenUnread.current = new Set();
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="edge-notifications-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`edge-notifications-button${open ? ' is-open' : ''}`}
        onClick={handleOpen}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Bildirimler'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="edge-notifications-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="edge-notifications-panel" role="dialog" aria-label="Bildirimler">
          <div className="edge-notifications-head">
            <strong>Bildirimler</strong>
            <button
              type="button"
              className="edge-notifications-clear"
              disabled={busy || items.length === 0}
              onClick={handleClearAll}
            >
              Tümünü sil
            </button>
          </div>

          {items.length === 0 ? (
            <p className="edge-notifications-empty">Henüz bildirim yok.</p>
          ) : (
            <ul className="edge-notifications-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`edge-notification-item${item.readAt ? ' is-read' : ' is-unread'}`}
                    onClick={() => handleRead(item)}
                  >
                    <span className="edge-notification-meta">
                      <span className={`edge-notification-type type-${item.type}`}>{typeLabel(item.type)}</span>
                      <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                    </span>
                    <strong>{item.title}</strong>
                    {item.body && <span>{item.body}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="edge-notifications-foot">
            Okunan bildirimler 3 saat sonra otomatik silinir.
          </p>
        </div>
      )}
    </div>
  );
}
