/** posv2 SettingsLayout — birebir */
export function SettingsGroup({ title, description, children, className = '' }) {
  return (
    <section className={`settings-group ${className}`}>
      {(title || description) && (
        <div className="settings-group-heading">
          {title && <h3 className="settings-group-title">{title}</h3>}
          {description && <p className="settings-group-desc">{description}</p>}
        </div>
      )}
      <div className="settings-group-card">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, description, children, border = true, className = '' }) {
  return (
    <div className={`settings-row ${border ? 'settings-row-border' : ''} ${className}`}>
      <div className="settings-row-label">
        <span className="settings-row-title">{label}</span>
        {description && <span className="settings-row-desc">{description}</span>}
      </div>
      {children != null && <div className="settings-row-control">{children}</div>}
    </div>
  );
}

export function SettingsMessage({ tone = 'info', children }) {
  const tones = {
    info: 'settings-msg-info',
    success: 'settings-msg-success',
    error: 'settings-msg-error',
  };
  return <div className={`settings-msg ${tones[tone] || tones.info}`}>{children}</div>;
}

export const settingsInputClass = 'settings-input';
export const settingsSelectClass = 'settings-select';
export const settingsBtnPrimary = 'settings-btn settings-btn-primary';
export const settingsBtnSecondary = 'settings-btn settings-btn-secondary';

export function SettingsToggle({ checked, onChange, disabled = false, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`settings-toggle ${checked ? 'is-on' : ''}`}
    >
      <span className="settings-toggle-thumb" aria-hidden />
    </button>
  );
}
