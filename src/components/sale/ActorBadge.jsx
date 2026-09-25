import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Baş harf + İ detay (isim + tarih/saat)
 * Overflow/header altında kalmaması için fixed portal kullanır.
 */
export default function ActorBadge({ initials, display, date, time, className = '' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const panelId = useId();
  const hasActor = Boolean(initials || display);
  const when = [date, time].filter(Boolean).join(' ');

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setCoords(null);
      return undefined;
    }

    const update = () => {
      const rect = btnRef.current.getBoundingClientRect();
      const panelWidth = 168;
      const gap = 6;
      let left = rect.left;
      if (left + panelWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - panelWidth - 8);
      }
      const preferAbove = rect.top > 72;
      setCoords({
        left,
        top: preferAbove ? rect.top - gap : rect.bottom + gap,
        place: preferAbove ? 'above' : 'below',
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (btnRef.current?.contains(event.target)) return;
      const panel = document.getElementById(panelId);
      if (panel?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, panelId]);

  if (!hasActor) return null;

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      {initials && (
        <span
          className="rounded bg-[color-mix(in_srgb,var(--sale-fg)_10%,transparent)] px-1 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--sale-fg-muted)]"
          title={display || initials}
        >
          {initials}
        </span>
      )}
      <button
        ref={btnRef}
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--sale-border)] text-[10px] font-bold text-[var(--sale-fg-muted)] transition-colors hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]"
        aria-label="İşlem bilgisi"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        İ
      </button>
      {open && coords && createPortal(
        <span
          id={panelId}
          role="tooltip"
          className="pointer-events-auto fixed z-[9999] min-w-[140px] max-w-[220px] rounded-lg border border-[var(--sale-border)] bg-[var(--sale-surface)] px-2.5 py-2 text-left shadow-xl"
          style={{
            left: coords.left,
            top: coords.top,
            transform: coords.place === 'above' ? 'translateY(-100%)' : 'none',
          }}
        >
          <span className="block text-xs font-medium text-[var(--sale-fg)]">{display || initials}</span>
          {when && <span className="mt-0.5 block text-[10px] text-[var(--sale-fg-muted)]">{when}</span>}
        </span>,
        document.body,
      )}
    </span>
  );
}
