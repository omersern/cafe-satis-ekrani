import { useCallback, useEffect } from 'react';

export default function Keypad({
  value,
  onValueChange,
  showFractionButtons = false,
  cartTotals,
  disabled = false,
  integerOnly = false,
  keyboard = true,
  onEnter,
  fluid = false,
}) {
  const applyKey = useCallback((btnValue) => {
    if (disabled) return;
    let current = String(value);
    if (btnValue === 'C') current = '0';
    else if (btnValue === 'backspace') current = current.slice(0, -1) || '0';
    else if (btnValue === '.') {
      if (integerOnly) return;
      if (!current.includes('.')) current += '.';
    } else {
      current = current === '0' && btnValue !== '.' ? String(btnValue) : current + String(btnValue);
    }
    if (integerOnly) {
      current = current.replace(/\D/g, '') || '0';
      if (current.length > 1 && current.startsWith('0')) {
        current = String(parseInt(current, 10));
      }
    }
    onValueChange(current);
  }, [disabled, integerOnly, onValueChange, value]);

  const handleFractionClick = (fraction) => {
    if (disabled) return;
    if (cartTotals?.remaining > 0) {
      onValueChange(String(cartTotals.remaining / fraction));
    }
  };

  useEffect(() => {
    if (disabled || !keyboard) return undefined;

    const onKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag)) return;

      if (event.key === 'Enter') {
        if (!onEnter) return;
        event.preventDefault();
        onEnter();
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        applyKey('backspace');
        return;
      }
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        applyKey(event.key);
        return;
      }
      if (!integerOnly && (event.key === '.' || event.key === ',')) {
        event.preventDefault();
        applyKey('.');
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [applyKey, disabled, integerOnly, keyboard, onEnter]);

  const keyClass = fluid
    ? 'flex h-10 w-full min-w-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-base font-semibold text-white transition-colors hover:bg-slate-600 disabled:pointer-events-none disabled:opacity-40'
    : 'flex h-10 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-base font-semibold text-white transition-colors hover:bg-slate-600 disabled:pointer-events-none disabled:opacity-40';

  const mainKeys = integerOnly
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0];

  return (
    <div className={`flex w-full items-center justify-center ${fluid ? '' : 'gap-2'} ${disabled ? 'opacity-60' : ''}`}>
      <div className={`grid w-full grid-cols-3 gap-2 ${fluid ? '' : 'max-w-max'}`}>
        {mainKeys.map((num) => (
          <button
            key={String(num)}
            type="button"
            disabled={disabled}
            onClick={() => applyKey(num)}
            className={`${keyClass}${num === 'C' ? ' text-xs font-bold' : ''}`}
          >
            {num}
          </button>
        ))}
        <button type="button" disabled={disabled} onClick={() => applyKey('backspace')} className={keyClass} aria-label="Sil">
          <svg width={16} height={16} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1={18} y1={9} x2={12} y2={15} />
            <line x1={12} y1={9} x2={18} y2={15} />
          </svg>
        </button>
      </div>

      {showFractionButtons && (
        <div className="grid grid-cols-1 gap-2">
          <button type="button" disabled={disabled} onClick={() => applyKey('C')} className={`${keyClass} text-xs font-bold`}>
            C
          </button>
          {[1, 2, 3].map((f) => (
            <button
              key={f}
              type="button"
              disabled={disabled}
              onClick={() => handleFractionClick(f)}
              className={`${keyClass} text-xs font-bold`}
            >
              1/
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
