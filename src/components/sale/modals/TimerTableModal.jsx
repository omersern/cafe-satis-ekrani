import { useEffect, useState } from 'react';
import { listTableTimers, money, stopTableTimer } from '../../../lib/api';
import { SaleModalOverlay } from '../ui/SaleModal';

function elapsedSeconds(timer, now) {
  if (!timer?.startedAt) return 0;
  const pausedNow = timer.pausedAt ? Math.max(0, (now - new Date(timer.pausedAt).getTime()) / 1000) : 0;
  return Math.max(0, Math.floor((now - new Date(timer.startedAt).getTime()) / 1000 - Number(timer.pausedSeconds || 0) - pausedNow));
}

function hms(total) {
  const seconds = Math.max(0, Math.floor(total));
  const hours = Math.floor(seconds / 3600);
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const rest = String(seconds % 60).padStart(2, '0');
  return hours ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

function startTime(timer) {
  const date = new Date(timer?.startedAt ?? timer?.started_at);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function TimerTableModal({ table, onClose, onChanged, onError }) {
  const [timer, setTimer] = useState(table?.timer);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await listTableTimers();
        const timers = response?.data || {};
        const keys = [table?.cloudId, table?.id, table?.localId].filter((value) => value != null);
        const next = keys.map((key) => timers[key] || timers[String(key)]).find(Boolean);
        if (active && next) setTimer(next);
      } catch { /* Son bilinen değer görünür kalır. */ }
    };
    refresh();
    window.addEventListener('wpos:tables-refresh', refresh);
    return () => {
      active = false;
      window.removeEventListener('wpos:tables-refresh', refresh);
    };
  }, [table?.id]);

  if (!table || !timer) return null;
  const seconds = elapsedSeconds(timer, now);
  const elapsedMinutes = Math.floor(seconds / 60);

  const stop = async () => {
    setBusy(true);
    try {
      const response = await stopTableTimer(table.id);
      if (!response?.status) throw new Error(response?.message || 'Masa durdurulamadı');
      await onChanged?.();
      const result = response.data;
      if (result) onError?.(`${table.name}: ${result.minutes} dk · ${money(result.amount)} adisyona eklendi.`);
      onClose();
    } catch (error) { onError?.(error?.message || 'İşlem başarısız'); }
    finally { setBusy(false); }
  };

  return (
    <SaleModalOverlay onClose={busy ? undefined : onClose} className="max-w-xl">
      <div className="compact-session-modal">
        <div className="compact-modal-head"><div><h2>{table.name}</h2><p>{timer.tariffName || 'Süre sayaçlı masa'} · {startTime(timer)} başlangıç</p></div><button type="button" onClick={onClose} aria-label="Kapat">×</button></div>
        <div className="compact-modal-body">
          <div className="compact-metrics"><div><span>Geçen süre</span><strong>{hms(seconds)}</strong></div><div><span>Güncel tutar</span><strong>{money(timer.amount)}</strong></div></div>
          {timer.plannedMinutes && <div className="compact-progress"><span style={{ width: `${Math.min(100, elapsedMinutes / Number(timer.plannedMinutes) * 100)}%` }} /><small>{elapsedMinutes} / {timer.plannedMinutes} dk</small></div>}
        </div>
        <div className="compact-modal-footer"><button type="button" className="be-button secondary" onClick={onClose} disabled={busy}>Kapat</button><button type="button" className="be-button danger" onClick={stop} disabled={busy}>{busy ? 'Durduruluyor…' : 'Masayı durdur'}</button></div>
      </div>
    </SaleModalOverlay>
  );
}
