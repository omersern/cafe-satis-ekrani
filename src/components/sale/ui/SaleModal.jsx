import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import useEscapeClose from '../../../hooks/useEscapeClose';

const SaleModalCloseContext = createContext(null);

const touch = 'touch-manipulation select-none active:scale-[0.98] transition-transform';

const btnBase = `inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${touch}`;

export const saleBtn = {
  primary: `${btnBase} sale-btn-primary`,
  success: `inline-flex min-h-[40px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40 ${touch}`,
  ghost: `${btnBase} sale-btn-secondary`,
  danger: `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 active:bg-red-500/40 disabled:cursor-not-allowed disabled:opacity-40 ${touch}`,
  amber: `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 active:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40 ${touch}`,
  orange: `inline-flex min-h-[40px] items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-500/20 active:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-40 ${touch}`,
  icon: `inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-[var(--sale-fg-muted)] transition-colors hover:bg-[var(--sale-surface-hover)] hover:text-[var(--sale-fg)] active:bg-[var(--sale-border)] ${touch}`,
  qty: `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--sale-border)] bg-[var(--sale-surface)] text-sm font-bold text-[var(--sale-fg)] hover:bg-[var(--sale-surface-hover)] active:bg-[var(--sale-border)] ${touch}`,
  pill: (active) => `sale-pill ${active ? 'sale-pill-active' : 'sale-pill-inactive'}`,
  segment: (active) => `sale-segment ${active ? 'sale-segment-active' : 'sale-segment-inactive'}`,
  choice: (active) => (active ? 'sale-choice-active' : 'sale-choice-inactive'),
  action: (variant = 'secondary') => `sale-action-btn ${variant === 'round' ? 'sale-action-btn-round' : ''} ${variant === 'edit' ? 'sale-btn-edit' : 'sale-btn-secondary'}`,
  input: 'w-full min-h-[40px] rounded-md border border-[var(--sale-border)] bg-[var(--sale-surface)] px-3 py-2 text-sm text-[var(--sale-fg)] placeholder-[var(--sale-fg-subtle)] transition-colors focus:border-[var(--app-accent)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--app-accent)_40%,transparent)]',
  check: 'h-5 w-5 shrink-0 rounded border-[var(--sale-border)] bg-[var(--sale-surface)] text-[var(--app-accent)] focus:ring-[color-mix(in_srgb,var(--app-accent)_30%,transparent)]',
};

export function SaleModalOverlay({ children, onClose, className = 'max-w-md', zIndex = 'z-50' }) {
  const [motionState, setMotionState] = useState('');
  const closeTimerRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMotionState('is-open'));
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  const requestClose = useCallback(() => {
    if (!onClose || motionState === 'is-closing') return;
    setMotionState('is-closing');
    closeTimerRef.current = setTimeout(onClose, 150);
  }, [motionState, onClose]);

  useEscapeClose(requestClose, Boolean(onClose));
  return (
    <SaleModalCloseContext.Provider value={onClose ? requestClose : null}>
      <div
        className={`theme-modal-shell sale-win11-modal-overlay fixed inset-0 ${zIndex} flex items-center justify-center p-4`}
        onClick={requestClose}
        role="presentation"
      >
        <div
          className={`theme-modal-shell sale-win11-modal t-modal ${motionState} flex max-h-[90vh] w-full flex-col overflow-hidden ${className}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>
    </SaleModalCloseContext.Provider>
  );
}

export function SaleModalHeader({ title, subtitle, onClose, icon }) {
  const closeFromOverlay = useContext(SaleModalCloseContext);
  const handleClose = closeFromOverlay || onClose;
  return (
    <div className="sale-win11-modal-header flex shrink-0 items-center justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--app-accent)_15%,transparent)] text-[var(--app-accent)]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-[var(--sale-fg)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--sale-fg-subtle)]">{subtitle}</p>}
        </div>
      </div>
      {handleClose && (
        <button
          type="button"
          onClick={handleClose}
          className={`${saleBtn.icon} p-0`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function SaleModalBody({ children, className = '' }) {
  return (
    <div className={`metro-scroll flex-1 overflow-y-auto px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}

export function SaleModalFooter({ children }) {
  return (
    <div className="sale-win11-modal-footer flex shrink-0 justify-end gap-3">
      {children}
    </div>
  );
}
