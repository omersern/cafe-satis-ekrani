import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const selectTriggerBase =
  'w-full min-h-[40px] rounded-lg border px-3 py-2 text-sm transition-colors focus:border-[var(--app-accent)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--app-accent)_40%,transparent)]';

export default function SaleSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seçin',
  disabled = false,
  loading = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuMotion, setMenuMotion] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);
  const listId = useId();

  const selected = options.find((option) => String(option.value) === String(value));
  const displayLabel = selected?.label ?? (loading ? 'Yükleniyor…' : placeholder);
  const isPlaceholder = !selected;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuMaxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuMaxHeight && rect.top > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 100000,
      maxHeight: menuMaxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!menuVisible) return;
    updatePosition();
    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [menuVisible, updatePosition]);

  useEffect(() => {
    if (!menuVisible) return;
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      closeMenu();
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuVisible]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const openMenu = useCallback(() => {
    clearTimeout(closeTimerRef.current);
    setOpen(true);
    setMenuVisible(true);
    setMenuMotion('');
    requestAnimationFrame(() => setMenuMotion('is-open'));
  }, []);

  const closeMenu = useCallback(() => {
    if (!menuVisible || menuMotion === 'is-closing') return;
    setOpen(false);
    setMenuMotion('is-closing');
    closeTimerRef.current = setTimeout(() => {
      setMenuVisible(false);
      setMenuMotion('');
    }, 150);
  }, [menuMotion, menuVisible]);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    closeMenu();
  };

  const isDisabled = disabled || loading;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !isDisabled && (open ? closeMenu() : openMenu())}
        className={`sale-select-trigger ${selectTriggerBase} flex w-full items-center justify-between gap-3 text-left ${
          isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${open ? 'border-blue-500/40 ring-1 ring-blue-500/30' : ''}`}
      >
        <span className={`flex min-w-0 flex-1 items-center gap-2.5 truncate ${isPlaceholder ? 'sale-select-placeholder' : 'sale-select-label'}`}>
          {selected?.leading}
          <span className="truncate">{displayLabel}</span>
        </span>
        {loading ? (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" aria-hidden />
        ) : (
          <ChevronIcon open={open} />
        )}
      </button>

      {menuVisible && createPortal(
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          style={menuStyle}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={`sale-select-menu t-dropdown ${menuMotion} metro-scroll overflow-y-auto rounded-xl p-1.5`}
          data-origin={menuStyle.bottom != null ? 'bottom-left' : 'top-left'}
        >
          {options.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-500">Seçenek yok</p>
          ) : (
            options.map((option) => {
              const isSelected = String(option.value) === String(value);
              const isMuted = option.muted;
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base transition-colors touch-manipulation select-none active:scale-[0.99] ${
                    isSelected
                      ? 'sale-select-option-selected'
                      : isMuted
                        ? 'sale-select-option-muted hover:bg-slate-700'
                        : 'sale-select-option hover:bg-slate-700'
                  }`}
                >
                  {option.leading}
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && <CheckIcon />}
                </button>
              );
            })
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
