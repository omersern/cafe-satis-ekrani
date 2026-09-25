import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 4500;

const toneStyles = {
  error: {
    box: 'border-rose-500/25 bg-rose-950 shadow-black/40',
    icon: 'text-rose-400',
    text: 'text-rose-100',
    close: 'text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-300',
  },
  success: {
    box: 'border-emerald-500/25 bg-emerald-950 shadow-black/40',
    icon: 'text-emerald-400',
    text: 'text-emerald-100',
    close: 'text-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-300',
  },
};

export default function SaleToast({
  message,
  onDismiss,
  duration = DEFAULT_DURATION_MS,
  tone = 'error',
  className = '',
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const styles = toneStyles[tone] || toneStyles.error;

  return (
    <div
      role="alert"
      className={`t-toast ${visible ? 'is-open' : ''} pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl ${styles.box} ${className}`}
    >
      {tone === 'success' ? (
        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <p className={`flex-1 text-sm font-medium leading-snug ${styles.text}`}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={`shrink-0 rounded-lg p-1 transition-colors ${styles.close}`}
        aria-label="Kapat"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
