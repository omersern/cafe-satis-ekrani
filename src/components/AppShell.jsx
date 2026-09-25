import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { getInteractionMode, getSidebarPosition, INTERACTION_MODES } from '../lib/layout';
import { PERMS } from '../lib/permissions';
import { ROUTES } from '../lib/routes';
import GlobalHeader from './GlobalHeader';

const navItems = [
  { to: ROUTES.metro, label: 'Genel bakış', icon: 'home', end: true },
  { to: ROUTES.sale, label: 'Satış', icon: 'sale', permission: PERMS.SELL_PRODUCTS },
  { to: ROUTES.additionReports, label: 'Adisyon raporu', icon: 'reports', permission: PERMS.VIEW_REPORTS },
  { to: ROUTES.reservations, label: 'Rezervasyonlar', icon: 'calendar', permission: PERMS.VIEW_RESERVATIONS },
  { to: ROUTES.tariffs, label: 'Tarifeler', icon: 'tariffs' },
  { to: ROUTES.day, label: 'Gün işlemleri', icon: 'day', permissions: [PERMS.DAY_OPEN, PERMS.DAY_CLOSE] },
];

const paths = {
  home: <><path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M9 20v-6h6v6" /></>,
  sale: <><path d="M4 5h16l-1 5H5z" /><path d="M6 10v10h12V10M9 14h6" /></>,
  reports: <><path d="M6 3h12v18H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M14 14h2" /></>,
  tariffs: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.8-.5-1.7-.8-2.8-.8-1.5 0-2.5.7-2.5 1.8 0 2.8 5 1.3 5 4.3 0 1.2-1 2-2.7 2-1.2 0-2.3-.4-3-1M12 6v12" /></>,
  day: <><path d="M4 6h16v14H4z" /><path d="M8 3v6M16 3v6M4 11h16M8 15h3" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6a7 7 0 0 0-1.5.9l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.5.9l.3 2.6h4l.3-2.6a7 7 0 0 0 1.5-.9l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" /></>,
};

function Icon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AppShell({ children }) {
  const { can, staff, logout } = useAuth();
  const { hasPermission, ready: permissionsReady } = usePermissions();
  const [position, setPosition] = useState(getSidebarPosition);
  const [interactionMode, setInteractionMode] = useState(getInteractionMode);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const touchStartRef = useRef(null);
  const visibleItems = navItems.filter((item) => {
    if (item.to === ROUTES.metro) return permissionsReady && hasPermission('reports.sales');
    return item.permissions ? item.permissions.some(can) : !item.permission || can(item.permission);
  });

  useEffect(() => {
    const sync = (event) => setPosition(event.detail || getSidebarPosition());
    window.addEventListener('wpos:sidebar-position-change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('wpos:sidebar-position-change', sync); window.removeEventListener('storage', sync); };
  }, []);

  useEffect(() => {
    const sync = (event) => {
      const mode = event.detail || getInteractionMode();
      setInteractionMode(mode);
      if (mode === INTERACTION_MODES.touch) setMobileOpen(false);
    };
    window.addEventListener('wpos:interaction-mode-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('wpos:interaction-mode-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && profileRef.current?.contains(event.target)) return;
      setProfileOpen(false);
      if (event.type === 'keydown') setMobileOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);

  const handleEdgeSwipeStart = (event) => {
    if (event.pointerType !== 'touch') return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    touchStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleEdgeSwipeEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || interactionMode !== INTERACTION_MODES.touch || event.pointerType !== 'touch' || mobileOpen) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const edge = 36;
    const opens = (
      (position === 'left' && start.x <= edge && dx >= 64)
      || (position === 'right' && start.x >= window.innerWidth - edge && dx <= -64)
      || (position === 'top' && start.y <= edge && dy >= 64)
      || (position === 'bottom' && start.y >= window.innerHeight - edge && dy <= -64)
    );
    if (opens) setMobileOpen(true);
  };

  return (
    <div
      className={`edge-shell edge-sidebar-${position}${mobileOpen ? ' edge-sidebar-open' : ''}`}
    >
      {interactionMode === INTERACTION_MODES.touch && !mobileOpen && (
        <div
          className={`edge-swipe-zone is-${position}`}
          aria-hidden="true"
          onPointerDown={handleEdgeSwipeStart}
          onPointerUp={handleEdgeSwipeEnd}
          onPointerCancel={() => { touchStartRef.current = null; }}
        />
      )}
      <button type="button" className="edge-sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat" />
      <aside className="edge-sidebar" aria-label="Ana navigasyon">
        <NavLink to={ROUTES.metro} className="edge-brand" onClick={() => setMobileOpen(false)}>
          <img src="./favicon.png" alt="" />
          <span><strong>Webbek WPOS</strong><small>Eğlence merkezleri için.</small></span>
        </NavLink>
        <hr/>
        <nav className="edge-nav">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `edge-nav-item${isActive ? ' is-active' : ''}`}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="edge-sidebar-footer">
          {can(PERMS.MANAGE_SETTINGS) && <NavLink to={ROUTES.settings} onClick={() => setMobileOpen(false)} className={({ isActive }) => `edge-nav-item${isActive ? ' is-active' : ''}`}><Icon name="settings" /><span>Ayarlar</span></NavLink>}
          <div className="edge-user-wrap" ref={profileRef}>
            {profileOpen && <div className="edge-user-menu" role="menu"><button type="button" role="menuitem" onClick={logout}>Çıkış yap</button></div>}
            <button type="button" className="edge-user" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-haspopup="menu">
              <span className="edge-avatar">{(staff?.name || 'W').trim().charAt(0).toLocaleUpperCase('tr-TR')}</span>
              <span className="edge-user-copy"><strong>{staff?.name || 'Kullanıcı'}</strong><small>Aktif oturum</small></span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
            </button>
          </div>
        </div>
      </aside>
      <section className="edge-workspace">
        <GlobalHeader onMenu={() => setMobileOpen(true)} />
        <div className="edge-page">{children}</div>
      </section>
    </div>
  );
}
