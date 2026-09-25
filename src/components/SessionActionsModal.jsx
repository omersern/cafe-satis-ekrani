import { useEffect, useState } from 'react';
import { endSession, extendSession, listComputers, money, queueCommand } from '../lib/api';
import ScreenViewerModal from './ScreenViewerModal';
import useEscapeClose from '../hooks/useEscapeClose';

const EXTEND = [15, 30, 60];


function hms(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function SessionActionsModal({ computer, session, onClose, onChanged, onClosedWithReceipt }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const [liveLastSeen, setLiveLastSeen] = useState(computer?.lastSeenAt ?? null);
  const machineId = computer?.machineId;
  useEffect(() => {
    if (!machineId) return undefined;
    setLiveLastSeen(computer?.lastSeenAt ?? null);
    let alive = true;
    const poll = async () => {
      try {
        const res = await listComputers();
        const row = (res?.data || []).find((c) => String(c.machineId) === String(machineId));
        if (alive && row?.lastSeenAt) setLiveLastSeen(row.lastSeenAt);
      } catch { /* sessiz geç */ }
    };
    poll();
    window.addEventListener('wpos:tables-refresh', poll);
    return () => {
      alive = false;
      window.removeEventListener('wpos:tables-refresh', poll);
    };
  }, [machineId]);

  useEscapeClose(() => closePromptOpen ? setClosePromptOpen(false) : onClose(), !busy);

  useEffect(() => {
    if (!closePromptOpen || busy) return undefined;
    const handleEnter = (event) => {
      if (event.key !== 'Enter' || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSession();
    };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [closePromptOpen, busy]);

  if (!computer || !session) return null;

  const awaiting = session.status === 'awaiting_payment';
  const paused = Number(session.pausedSeconds || 0) + (session.pausedAt ? Math.max(0, (now - new Date(session.pausedAt).getTime()) / 1000) : 0);
  const seconds = Math.max(Number(session.elapsedSeconds || 0), Math.floor((now - new Date(session.startedAt).getTime()) / 1000 - paused));
  const elapsed = Math.floor(seconds / 60);
  const remainingMin = session.durationMinutes == null ? null : Math.max(0, Number(session.durationMinutes) - elapsed);
  const remainingSec = session.durationMinutes == null ? null : Math.max(0, Number(session.durationMinutes) * 60 - seconds);
  const progress = session.durationMinutes ? Math.min(100, elapsed / Number(session.durationMinutes) * 100) : 0;
  const lowTime = remainingMin != null && remainingMin <= 10;
  const total = (session.timeAmount || 0) + (session.productTotal || 0);

  const isClient = Boolean(computer.machineId);
  const online = isClient && liveLastSeen && (now - new Date(liveLastSeen).getTime()) < 25000;

  const typeLabel = {
    pc: 'PC',
    playstation: 'PlayStation',
    vr: 'VR',
    bilardo: 'Bilardo',
    masatenisi: 'Masa Tenisi',
    table: 'Masa',
  }[computer.deviceType] || 'Masa';
  const statusChip = awaiting
    ? { text: 'Hesap bekliyor', cls: 'bg-red-500/15 text-red-500' }
    : session.isPaused
      ? { text: 'Duraklatıldı', cls: 'bg-amber-500/15 text-amber-500' }
      : { text: 'Oturum açık', cls: 'bg-emerald-500/15 text-emerald-500' };

  // Öne çıkan büyük değer: süreli oturumda kalan, süresizde kullanılan.
  const heroValue = remainingSec == null ? hms(seconds) : hms(remainingSec);
  const heroLabel = remainingSec == null ? 'Geçen süre' : 'Kalan süre';
  const heroTone = awaiting ? 'text-red-500' : lowTime ? 'text-amber-500' : 'text-[var(--win11-metro-fg)]';
  const startedAt = new Date(session.startedAt ?? session.started_at);
  const startedAtLabel = Number.isNaN(startedAt.getTime())
    ? '—'
    : new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(startedAt);

  async function run(action) {
    setBusy(true); setError('');
    try { await action(); await onChanged?.(); } catch (err) { setError(err.message || 'İşlem başarısız'); } finally { setBusy(false); }
  }
  const command = (commandType, payload) => run(async () => {
    const res = await queueCommand({ machineId: computer.machineId, commandType, payload });
    if (!res?.status) throw new Error(res?.message || 'Komut gönderilemedi');
  });
  const closeSession = (powerAction = null) => run(async () => {
    setClosePromptOpen(false);
    const res = await endSession(computer.machineId, powerAction
      ? { lockAfter: false, powerAction }
      : {});
    if (!res?.status) throw new Error(res?.message);
    res?.data?.receipt && onClosedWithReceipt ? onClosedWithReceipt(res.data.receipt) : onClose();
  });

  return <>
    <div className="cafe-modal-backdrop compact-session-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-manager-title">
      <div className="compact-manager-modal">
        <div className="compact-modal-head">
          <div><h2 id="session-manager-title">{computer.name}</h2><p>{typeLabel} · Başlangıç {startedAtLabel} · {session.memberUsername || (session.sessionType === 'member' ? 'Üye' : 'Misafir')}</p></div>
          <div className="compact-head-status">{isClient && <span className={online ? 'online' : ''}><i />{online ? 'Çevrimiçi' : 'Çevrimdışı'}</span>}<b className={!awaiting && !session.isPaused ? 'session-open' : ''}>{statusChip.text}</b></div>
          <button type="button" onClick={onClose} aria-label="Kapat">×</button>
        </div>

        <div className="compact-manager-body">
          {isClient && !online && !awaiting && <div className="compact-warning">İstemciye ulaşılamıyor.</div>}
          {error && <div className="compact-error" role="alert">{error}</div>}
          <div className="compact-metrics"><div><span>{heroLabel}</span><strong className={awaiting ? 'danger' : lowTime ? 'warning' : ''}>{heroValue}</strong></div><div><span>Güncel hesap</span><strong>{money(total)}</strong></div></div>
          {session.durationMinutes && <div className="compact-progress"><span className={awaiting ? 'danger' : lowTime ? 'warning' : ''} style={{ width: `${progress}%` }} /><small>{elapsed} / {session.durationMinutes} dk</small></div>}

          {session.durationMinutes != null && <div className="compact-control-row">
            <span>Süre ekle</span>
            {EXTEND.map((minutes) => <button key={minutes} type="button" disabled={busy} onClick={() => run(async () => { const response = await extendSession(computer.machineId, { additionalMinutes: minutes }); if (!response?.status) throw new Error(response?.message); })}>+{minutes} dk</button>)}
            {computer.deviceType === 'pc' && <button type="button" disabled={busy} onClick={() => run(async () => { const response = await extendSession(computer.machineId, { unlimited: true }); if (!response?.status) throw new Error(response?.message); })}>Sınırsız</button>}
          </div>}

          <div className="compact-control-row actions">
            <span>Bilgisayar</span>
            <button type="button" className="primary" onClick={() => setViewerOpen(true)}>Ekranı aç</button>
            <button type="button" disabled={busy || awaiting} onClick={() => command('lock')}>Kilitle</button>
            <button type="button" disabled={busy || awaiting} onClick={() => command('unlock')}>Kilidi aç</button>
          </div>

        </div>

        <div className="compact-modal-footer"><button type="button" className="be-button secondary" onClick={onClose} disabled={busy}>Kapat</button><button type="button" className="be-button danger" disabled={busy} onClick={() => computer.deviceType === 'pc' ? setClosePromptOpen(true) : closeSession()}>{busy ? 'İşleniyor…' : 'Hesabı kapat'}</button></div>
      </div>
    </div>
    {closePromptOpen && <div className="cafe-modal-backdrop z-[70]" role="alertdialog" aria-modal="true" aria-labelledby="power-action-title"><div className="compact-confirm-modal"><h2 id="power-action-title">Hesabı kapat</h2><p>{computer.name} için sonraki işlemi seçin.</p><button autoFocus type="button" className="be-button primary" disabled={busy} onClick={() => closeSession()}>Yalnızca hesabı kapat <kbd>Enter</kbd></button><div><button type="button" className="be-button secondary" disabled={busy} onClick={() => closeSession('restart')}>Yeniden başlat</button><button type="button" className="be-button danger" disabled={busy} onClick={() => closeSession('shutdown')}>Bilgisayarı kapat</button></div><button type="button" className="compact-cancel" disabled={busy} onClick={() => setClosePromptOpen(false)}>Vazgeç</button></div></div>}
    {viewerOpen && <ScreenViewerModal computer={computer} onClose={() => setViewerOpen(false)} />}
  </>;
}
