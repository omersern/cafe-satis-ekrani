import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listLoginRequests, approveLoginRequest, rejectLoginRequest, getSettings,
} from '../../lib/api';

function durationLabel(mins) {
  if (mins == null) return 'Süresiz';
  if (mins % 60 === 0) return `${mins / 60} saat`;
  if (mins > 60) return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
  return `${mins} dk`;
}

/** Kısa "dınk" — asset yok, Web Audio ile üretilir. */
function playDing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.36);
    o.onended = () => ctx.close();
  } catch {
    // ses çalınamadı — sorun değil
  }
}

export function useLoginRequests({ onError, onApproved }) {
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const soundOn = useRef(true);
  const seen = useRef(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await listLoginRequests();
      const list = res?.data || [];
      // Yeni gelen talep var mı? (ses için)
      const newOne = list.some((r) => !seen.current.has(r.id));
      if (newOne && soundOn.current && list.length > 0) playDing();
      seen.current = new Set(list.map((r) => r.id));
      setRequests(list);
    } catch {
      // sessiz — POS çalışmaya devam etsin
    }
  }, []);

  useEffect(() => {
    getSettings().then((res) => {
      soundOn.current = String(res?.data?.login_request_sound ?? 'true') !== 'false';
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('wpos:login-requests-refresh', refresh);
    return () => window.removeEventListener('wpos:login-requests-refresh', refresh);
  }, [refresh]);

  const handleApprove = async (r) => {
    setBusyId(r.id);
    try {
      const res = await approveLoginRequest(r.id);
      if (!res?.status) throw new Error(res?.message || 'Onaylanamadı');
      onApproved?.(`${r.computerName || r.machineId} açıldı`);
      await refresh();
    } catch (err) {
      onError?.(err?.message || 'Onaylanamadı');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (r) => {
    setBusyId(r.id);
    try {
      await rejectLoginRequest(r.id);
      await refresh();
    } catch (err) {
      onError?.(err?.message || 'Reddedilemedi');
    } finally {
      setBusyId(null);
    }
  };

  return { requests, busyId, approve: handleApprove, reject: handleReject, durationLabel };
}
