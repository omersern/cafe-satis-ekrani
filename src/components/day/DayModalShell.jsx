import useEscapeClose from '../../hooks/useEscapeClose';

const touch = 'touch-manipulation select-none active:scale-[0.98] transition-transform';

export const dayBtn = {
  ghost: `day-win11-btn day-win11-btn-ghost ${touch}`,
  success: `day-win11-btn day-win11-btn-success ${touch}`,
  danger: `day-win11-btn day-win11-btn-danger ${touch}`,
  link: `day-win11-btn-link ${touch}`,
};

export function DayModalOverlay({ children, onClose, className = 'max-w-lg' }) {
  useEscapeClose(onClose);
  return (
    <div
      className="day-win11-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`day-win11-modal win11-metro-card flex max-h-[90vh] w-full flex-col overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function DayModalHeader({ title, subtitle, icon, accent = 'blue', onClose }) {
  return (
    <div className="day-win11-modal-header">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className={`day-win11-modal-icon day-win11-modal-icon-${accent}`}>{icon}</div>
        )}
        <div className="min-w-0">
          <h3 className="day-win11-modal-title">{title}</h3>
          {subtitle && <p className="day-win11-modal-subtitle">{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="win11-metro-icon-btn" aria-label="Kapat">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function DayModalBody({ children }) {
  return <div className="day-win11-modal-body metro-scroll flex-1 overflow-y-auto">{children}</div>;
}

export function DayModalFooter({ children }) {
  return <div className="day-win11-modal-footer">{children}</div>;
}
