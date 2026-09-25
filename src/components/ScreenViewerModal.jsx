import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { queueCommand } from '../lib/api';
import { getCloudScreenWsUrl } from '../lib/cloudClient';
import useEscapeClose from '../hooks/useEscapeClose';

export default function ScreenViewerModal({ computer, onClose }) {
  const [frameUrl, setFrameUrl] = useState('');
  const [fps, setFps] = useState(0);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [controlling, setControlling] = useState(false);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const shellRef = useRef(null);
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const imageSurfaceRef = useRef(null);
  const socketRef = useRef(null);
  const moveFrameRef = useRef(0);
  const pendingMoveRef = useRef(null);
  useEscapeClose(onClose, !controlling);

  const send = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let currentUrl = '';
    let frames = 0;
    let started = performance.now();
    let socket;
    let streamTimer;

    (async () => {
      const screenUrl = await getCloudScreenWsUrl(computer.machineId);
      if (cancelled) return;
      socket = new WebSocket(screenUrl);
      socketRef.current = socket;
      socket.binaryType = 'arraybuffer';
      socket.onopen = () => {
        setConnected(true);
        setError('Client yayını bekleniyor…');
        queueCommand({ machineId: computer.machineId, commandType: 'screen_stream_start' })
          .then((result) => {
            if (cancelled) return;
            if (!result?.status) {
              setError(result?.message || 'Ekran yayını komutu istemciye gönderilemedi.');
              return;
            }
            streamTimer = setTimeout(() => {
              if (cancelled) return;
              setError((current) => current || 'İstemci ekran yayınına yanıt vermedi. İstemcinin cloud bağlantısını kontrol edin.');
            }, 12000);
          })
          .catch(() => setError('Ekran yayını komutu istemciye gönderilemedi.'));
      };
      socket.onmessage = ({ data }) => {
        if (typeof data === 'string') {
          try {
            const message = JSON.parse(data);
            if (message.type === 'control-status') {
              setControlling(Boolean(message.granted));
              if (message.reason) setError(message.reason);
            }
          } catch { /* geçersiz kontrol mesajı */ }
          return;
        }
        const nextUrl = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
        clearTimeout(streamTimer);
        setFrameUrl(nextUrl);
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = nextUrl;
        frames += 1;
        const now = performance.now();
        if (now - started >= 1000) {
          setFps(Math.round(frames * 1000 / (now - started)));
          frames = 0;
          started = now;
        }
        setError('');
      };
      socket.onerror = () => setError('Canlı görüntü bağlantısı kurulamadı.');
      socket.onclose = () => { setConnected(false); setControlling(false); setError((value) => value || 'Canlı görüntü bağlantısı kapandı.'); };
    })();

    return () => {
      cancelled = true;
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'release' }));
      socket?.close();
      clearTimeout(streamTimer);
      socketRef.current = null;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      if (moveFrameRef.current) cancelAnimationFrame(moveFrameRef.current);
      queueCommand({ machineId: computer.machineId, commandType: 'screen_stream_stop' }).catch(() => {});
    };
  }, [computer.machineId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const update = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const fittedSize = useMemo(() => {
    if (!frameSize.width || !frameSize.height || !viewportSize.width || !viewportSize.height) {
      return { width: 0, height: 0 };
    }
    const scale = Math.min(viewportSize.width / frameSize.width, viewportSize.height / frameSize.height);
    return { width: frameSize.width * scale, height: frameSize.height * scale };
  }, [frameSize, viewportSize]);

  useEffect(() => {
    if (!controlling) return undefined;
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      event.stopPropagation();
      send({ type: 'input', event: { kind: event.type, code: event.code } });
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); };
  }, [controlling, send]);

  function position(event) {
    const surface = imageSurfaceRef.current;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function pointer(event, kind) {
    if (!controlling) return;
    const point = position(event);
    if (!point) return;
    event.preventDefault();
    if (kind === 'move') {
      pendingMoveRef.current = point;
      if (moveFrameRef.current) return;
      moveFrameRef.current = requestAnimationFrame(() => {
        moveFrameRef.current = 0;
        const latest = pendingMoveRef.current;
        if (latest) send({ type: 'input', event: { kind, ...latest } });
      });
    } else {
      pendingMoveRef.current = point;
      send({ type: 'input', event: { kind, button: event.button, ...point } });
    }
  }

  function toggleControl() {
    send({ type: controlling ? 'release' : 'takeover' });
    if (controlling) setControlling(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md"
      style={{ position: 'fixed', inset: 0, zIndex: 100 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={shellRef}
        className="screen-viewer-shell flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          width: 'calc(100vw - 1.5rem)',
          height: 'calc(100vh - 1.5rem)',
          maxWidth: '1800px',
          minWidth: 0,
          minHeight: 'min(480px, calc(100vh - 1.5rem))',
          backgroundColor: 'var(--app-card-bg)',
        }}
      >
        <header className="screen-viewer-header flex h-[68px] shrink-0 items-center gap-4 px-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight">{computer.name}</h2>
            <div className="screen-viewer-meta mt-1 flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />{connected ? 'Bağlı' : 'Bağlantı yok'}</span>
              <span>{fps} FPS</span>{controlling && <span className="font-semibold text-[var(--app-accent)]">Uzaktan kontrol etkin</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className={`screen-viewer-control-btn min-h-10 rounded-lg px-4 text-sm font-semibold ${controlling ? 'is-active' : ''}`} onClick={toggleControl} disabled={!connected || !frameUrl}>{controlling ? 'Yönetimi bırak' : 'Yönetimi devral'}</button>
            <button className="screen-viewer-secondary-btn min-h-10 rounded-lg px-4 text-sm font-semibold" onClick={() => shellRef.current?.requestFullscreen?.()}>Tam ekran</button>
            <button className="screen-viewer-close-btn grid h-10 w-10 place-items-center rounded-lg text-lg" onClick={onClose} aria-label="Kapat">✕</button>
          </div>
        </header>
        <main ref={viewportRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black" style={{ flex: '1 1 0%', minHeight: 0, backgroundColor: '#000' }}>
          {frameUrl ? (
            <div
              ref={imageSurfaceRef}
              className={`relative shrink-0 overflow-hidden ${controlling ? 'cursor-none ring-2 ring-inset ring-blue-500/70' : ''}`}
              style={{ width: fittedSize.width, height: fittedSize.height }}
              tabIndex={controlling ? 0 : -1}
              onPointerMove={(e) => pointer(e, 'move')}
              onPointerDown={(e) => { e.currentTarget.focus(); e.currentTarget.setPointerCapture?.(e.pointerId); pointer(e, 'down'); }}
              onPointerUp={(e) => pointer(e, 'up')}
              onContextMenu={(e) => { if (controlling) e.preventDefault(); }}
              onWheel={(e) => {
                if (!controlling) return;
                const point = position(e);
                if (!point) return;
                e.preventDefault();
                send({ type: 'input', event: { kind: 'wheel', deltaY: Math.round(e.deltaY), ...point } });
              }}
            >
              <img
                ref={imageRef}
                src={frameUrl}
                alt={`${computer.name} canlı ekranı`}
                draggable="false"
                className="h-full w-full select-none"
                onLoad={(event) => {
                  const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                  setFrameSize((current) => current.width === width && current.height === height ? current : { width, height });
                }}
              />
            </div>
          ) : <div className="absolute inset-0 grid place-items-center"><div className="text-center"><span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-400" /><p className="mt-3 text-sm text-zinc-400">Client yayını başlatılıyor…</p></div></div>}
          {controlling && <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-blue-400/30 bg-blue-500/90 px-3 py-1.5 text-xs font-semibold shadow-lg">Kontrol sizde</div>}
          {error && <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900/95 px-4 py-2 text-xs text-zinc-300 shadow-xl">{error}</span>}
        </main>
        <footer className="screen-viewer-footer flex min-h-11 shrink-0 items-center justify-between gap-4 px-5 text-xs"><span>{controlling ? 'Fare ve klavye girişleri uzak bilgisayara gönderiliyor.' : 'Ekranı izliyorsunuz. İşlem yapmak için yönetimi devralın.'}</span>{controlling && <span>ESC uzak bilgisayara gönderilir</span>}</footer>
      </div>
    </div>
  );
}
