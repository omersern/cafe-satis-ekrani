import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/** posv2 PinDots */
function PinDots({ length, hasError }) {
  return (
    <div
      className={`flex justify-center gap-3 ${hasError ? 'animate-pin-shake' : ''}`}
      aria-live="polite"
      aria-label={`PIN: ${length} / 6`}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={`h-3 w-3 rounded-full transition-colors duration-150 ${
            hasError
              ? 'bg-red-500'
              : i < length
                ? 'win11-pin-dot-filled'
                : 'win11-pin-dot-empty'
          }`}
        />
      ))}
    </div>
  );
}

const KEY_FLASH_MS = 130;

/** posv2 KeypadKey — lit flash */
function KeypadKey({ onPress, children, variant = 'digit', ariaLabel, disabled }) {
  const [lit, setLit] = useState(false);
  const timerRef = useRef(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const flash = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLit(true);
    timerRef.current = setTimeout(() => setLit(false), KEY_FLASH_MS);
  }, []);

  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) flash();
      }}
      onClick={() => {
        if (!disabled) onPress?.();
      }}
      aria-label={ariaLabel}
      className={`win11-pin-key win11-pin-key-${variant} ${lit ? 'win11-pin-key-lit' : ''}`}
    >
      {children}
    </button>
  );
}

/**
 * posv2-tauri PinLogin UI + cloud PIN authentication.
 */
export default function PinLogin() {
  const { staffList, loadingStaff, login } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const pinInputRef = useRef(null);
  const busyRef = useRef(false);
  const selectedRef = useRef(selectedUser);
  const loginRef = useRef(login);

  useEffect(() => {
    loginRef.current = login;
  }, [login]);
  useEffect(() => {
    selectedRef.current = selectedUser;
  }, [selectedUser]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const focusPinInput = useCallback(() => {
    requestAnimationFrame(() => {
      pinInputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!selectedUser && staffList.length > 0) {
      setSelectedUser(staffList[0]);
    }
  }, [staffList, selectedUser]);

  useEffect(() => {
    focusPinInput();
  }, [selectedUser, focusPinInput]);

  const tryLogin = useCallback(
    async (nextPin, user) => {
      if (!user || nextPin.length !== 6 || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await loginRef.current(user.id, nextPin);
      } catch (err) {
        setError(true);
        setErrorMsg(err?.message || 'Hatalı PIN girdiniz.');
        setPin('');
        setTimeout(() => {
          setError(false);
          setErrorMsg('');
          focusPinInput();
        }, 600);
      } finally {
        busyRef.current = false;
        setBusy(false);
        focusPinInput();
      }
    },
    [focusPinInput]
  );

  const addDigit = useCallback(
    (d) => {
      if (busyRef.current) return;
      setError(false);
      setErrorMsg('');
      setPin((prev) => {
        if (prev.length >= 6) return prev;
        const next = prev + d;
        if (next.length === 6) {
          const user = selectedRef.current;
          queueMicrotask(() => void tryLogin(next, user));
        }
        return next;
      });
    },
    [tryLogin]
  );

  const clearPin = useCallback(() => {
    if (busyRef.current) return;
    setError(false);
    setErrorMsg('');
    setPin('');
    focusPinInput();
  }, [focusPinInput]);

  const backspace = useCallback(() => {
    if (busyRef.current) return;
    setError(false);
    setPin((p) => p.slice(0, -1));
    focusPinInput();
  }, [focusPinInput]);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target?.tagName;
      if (
        (tag === 'INPUT' || tag === 'TEXTAREA') &&
        e.target !== pinInputRef.current &&
        !e.target?.readOnly
      ) {
        return;
      }
      if (busyRef.current) {
        e.preventDefault();
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        e.stopPropagation();
        addDigit(e.key);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
        return;
      }
      if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        clearPin();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        setPin((current) => {
          if (current.length === 6) {
            queueMicrotask(() => void tryLogin(current, selectedRef.current));
          }
          return current;
        });
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (staffList.length === 0) return;
        setSelectedUser((prev) => {
          const idx = staffList.findIndex((u) => u.id === prev?.id);
          const nextIdx =
            e.key === 'ArrowDown'
              ? (idx + 1) % staffList.length
              : idx <= 0
                ? staffList.length - 1
                : idx - 1;
          return staffList[nextIdx];
        });
        setPin('');
        setError(false);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [addDigit, backspace, clearPin, tryLogin, staffList]);

  const roleLabel = (user) => {
    if (user.role === 'admin' || (user.roleId != null && Number(user.roleId) !== 1)) {
      return 'Yönetici';
    }
    return 'Kasiyer';
  };

  return (
    <div
      className="win11-pin-shell fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
      onMouseDown={(e) => {
        if (e.target?.closest?.('button')) return;
        e.preventDefault();
        focusPinInput();
      }}
    >
      <input
        ref={pinInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value=""
        readOnly
        aria-label="PIN girişi"
        className="sr-only absolute left-0 top-0 h-px w-px opacity-0"
        tabIndex={0}
      />

      <div className="win11-pin-panel flex min-h-[540px] w-full max-w-4xl overflow-hidden">
        <section className="win11-pin-users flex w-1/2 flex-col border-r">
          <div className="win11-pin-users-header px-6 py-5">
            <h1 className="text-xl font-semibold">Webbek WPOS</h1>
            <p className="mt-1 text-sm opacity-70">Hesabınızı seçin</p>
          </div>

          <div className="metro-scroll flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
            {loadingStaff && (
              <p className="px-2 py-10 text-center text-sm opacity-50">Yükleniyor…</p>
            )}
            {!loadingStaff && staffList.length === 0 && (
              <p className="px-2 py-10 text-center text-sm opacity-50">
                Kullanıcı bulunamadı
              </p>
            )}
            {staffList.map((user) => {
              const selected = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedUser(user);
                    setPin('');
                    setError(false);
                    focusPinInput();
                  }}
                  className={`win11-pin-user-row touch-manipulation focus:outline-none focus-visible:outline-none ${
                    selected ? 'win11-pin-user-row-active' : ''
                  }`}
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="text-xs opacity-60">{roleLabel(user)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="win11-pin-users-foot px-6 py-3 text-center text-xs opacity-50">
            ↑ ↓ ile seç · rakamlarla PIN gir
          </div>
        </section>

        <section className="flex w-1/2 flex-col items-center justify-center p-8">
          {selectedUser ? (
            <>
              <p className="text-lg font-semibold">{selectedUser.name}</p>
              <p className="mb-8 mt-1 text-sm opacity-60">PIN kodunuzu girin</p>

              <PinDots length={pin.length} hasError={error} />

              {error && (
                <p className="mt-3 text-sm text-red-500" role="alert">
                  {errorMsg || 'Hatalı PIN'}
                </p>
              )}

              <div className="mt-8 grid w-64 grid-cols-3 gap-2.5 sm:w-72">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <KeypadKey
                    key={digit}
                    disabled={busy}
                    onPress={() => addDigit(String(digit))}
                    ariaLabel={`Rakam ${digit}`}
                  >
                    {digit}
                  </KeypadKey>
                ))}
                <KeypadKey
                  variant="danger"
                  disabled={busy}
                  onPress={clearPin}
                  ariaLabel="PIN temizle"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </KeypadKey>
                <KeypadKey disabled={busy} onPress={() => addDigit('0')} ariaLabel="0">
                  0
                </KeypadKey>
                <KeypadKey
                  variant="muted"
                  disabled={busy}
                  onPress={backspace}
                  ariaLabel="Son rakamı sil"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                    />
                  </svg>
                </KeypadKey>
              </div>
            </>
          ) : (
            <div className="text-center opacity-60">
              <p className="text-base font-medium">Hesap seçilmedi</p>
              <p className="mt-2 text-sm">Soldan kullanıcınızı seçin</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
