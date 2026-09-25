import { darkTheme, lightTheme, tokensToCssVars } from './themeTokens';
import {
  AUTO_LIGHT_END_HOUR,
  AUTO_LIGHT_START_HOUR,
  getAutoScheduleInfo as buildAutoScheduleInfo,
  getNextAutoTransition,
  isAutoLightHours,
} from './themeSchedule';

/** localStorage: tercih (auto | light | dark) */
export const CAFE_THEME_KEY = 'cafe-theme';
/** Otomatik modda son çözümlenen tema (flash önleme) */
export const CAFE_THEME_RESOLVED_KEY = 'cafe-theme-resolved';

export const THEMES = {
  auto: 'auto',
  light: 'light',
  dark: 'dark',
};

const VALID_PREFERENCES = new Set([THEMES.auto, THEMES.light, THEMES.dark]);

let themePreference = THEMES.dark;
let currentTheme = THEMES.dark;
let autoInterval = null;
let autoTimeout = null;

function applyCssVars(tokens) {
  const root = document.documentElement;
  const vars = tokensToCssVars(tokens);
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.style.backgroundColor = tokens.appBg;
}

function normalizePreference(value) {
  return VALID_PREFERENCES.has(value) ? value : THEMES.dark;
}

function resolveAutoTheme(now = new Date()) {
  return isAutoLightHours(now) ? THEMES.light : THEMES.dark;
}

function persistPreference() {
  try {
    localStorage.setItem(CAFE_THEME_KEY, themePreference);
    if (themePreference === THEMES.auto) {
      localStorage.setItem(CAFE_THEME_RESOLVED_KEY, currentTheme);
    } else {
      localStorage.removeItem(CAFE_THEME_RESOLVED_KEY);
    }
  } catch {
    // ignore
  }
}

function emitThemeChange() {
  window.dispatchEvent(
    new CustomEvent('wpos:theme-change', {
      detail: { theme: currentTheme, preference: themePreference },
    })
  );
}

function applyResolvedTheme(resolved, { persist = true } = {}) {
  const next = resolved === THEMES.light ? THEMES.light : THEMES.dark;
  const tokens = next === THEMES.light ? lightTheme : darkTheme;
  const root = document.documentElement;

  if (next === THEMES.dark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  applyCssVars(tokens);
  currentTheme = next;

  if (persist) {
    persistPreference();
  }

  emitThemeChange();
}

function stopAutoScheduler() {
  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = null;
  }
  if (autoTimeout) {
    clearTimeout(autoTimeout);
    autoTimeout = null;
  }
}

function syncAutoTheme({ persist = false } = {}) {
  const resolved = resolveAutoTheme();
  if (resolved !== currentTheme) {
    applyResolvedTheme(resolved, { persist });
  } else if (persist) {
    persistPreference();
  }
}

function scheduleNextAutoTransition() {
  if (autoTimeout) {
    clearTimeout(autoTimeout);
    autoTimeout = null;
  }
  if (themePreference !== THEMES.auto) return;

  const now = new Date();
  const { at } = getNextAutoTransition(now);
  const delay = Math.max(1000, at.getTime() - now.getTime() + 500);

  autoTimeout = setTimeout(() => {
    syncAutoTheme({ persist: true });
    scheduleNextAutoTransition();
  }, delay);
}

function startAutoScheduler() {
  stopAutoScheduler();
  syncAutoTheme({ persist: true });
  scheduleNextAutoTransition();
  autoInterval = setInterval(() => {
    syncAutoTheme({ persist: true });
  }, 60000);
}

export function applyThemePreference(preference, { persist = true } = {}) {
  themePreference = normalizePreference(preference);

  if (themePreference === THEMES.auto) {
    const resolved = resolveAutoTheme();
    applyResolvedTheme(resolved, { persist });
    startAutoScheduler();
    return currentTheme;
  }

  stopAutoScheduler();
  applyResolvedTheme(themePreference, { persist });
  return currentTheme;
}

/**
 * Geriye uyumluluk: light/dark/auto tercih uygular.
 * light|dark sabit; auto saat bazlı.
 */
export function applyTheme(mode) {
  if (mode === THEMES.auto) {
    return applyThemePreference(THEMES.auto);
  }
  return applyThemePreference(mode === THEMES.light ? THEMES.light : THEMES.dark);
}

function readStoredPreference() {
  try {
    const fromLs = localStorage.getItem(CAFE_THEME_KEY);
    if (VALID_PREFERENCES.has(fromLs)) return fromLs;
  } catch {
    // ignore
  }
  return THEMES.dark;
}

/** Açılışta flash önleme + scheduler */
export function applyBootstrapTheme() {
  const stored = readStoredPreference();

  if (stored === THEMES.auto) {
    try {
      const cached = localStorage.getItem(CAFE_THEME_RESOLVED_KEY);
      if (cached === THEMES.light || cached === THEMES.dark) {
        themePreference = THEMES.auto;
        applyResolvedTheme(cached, { persist: false });
        startAutoScheduler();
        return currentTheme;
      }
    } catch {
      // ignore
    }
    themePreference = THEMES.auto;
    applyResolvedTheme(resolveAutoTheme(), { persist: false });
    startAutoScheduler();
    return currentTheme;
  }

  themePreference = stored;
  applyResolvedTheme(stored === THEMES.light ? THEMES.light : THEMES.dark, { persist: false });
  return currentTheme;
}

export function initTheme() {
  applyThemePreference(readStoredPreference(), { persist: false });
}

/** Tercih (auto | light | dark) */
export function getThemePreference() {
  return themePreference;
}

/** Çözümlenmiş aktif tema (light | dark) */
export function getTheme() {
  return currentTheme;
}

/**
 * Geriye uyumluluk: çözümlenmiş light/dark (UI dark class için).
 * Tercih auto ise o anki saat dilimindeki tema.
 */
export function getStoredTheme() {
  if (themePreference === THEMES.auto) {
    return currentTheme || resolveAutoTheme();
  }
  try {
    const v = localStorage.getItem(CAFE_THEME_KEY);
    if (v === THEMES.auto) {
      const cached = localStorage.getItem(CAFE_THEME_RESOLVED_KEY);
      if (cached === THEMES.light || cached === THEMES.dark) return cached;
      return resolveAutoTheme();
    }
    if (v === THEMES.light || v === THEMES.dark) return v;
  } catch {
    // ignore
  }
  return currentTheme || THEMES.dark;
}

/** Header toggle: o anki çözümlenmiş temanın tersini sabit tercih yap */
export function toggleTheme() {
  const resolved = getTheme() || getStoredTheme();
  const next = resolved === THEMES.dark ? THEMES.light : THEMES.dark;
  applyThemePreference(next);
  return next;
}

export function getAutoScheduleInfo(now = new Date()) {
  const info = buildAutoScheduleInfo(now);
  const resolved = resolveAutoTheme(now);
  return {
    resolved,
    isDaytime: info.isDaytime,
    lightStartLabel: info.lightStartLabel,
    lightEndLabel: info.lightEndLabel,
    nextTransition: info.nextTransition,
    nextMode: info.nextMode,
    nextLabel: info.nextLabel,
    lightStartHour: AUTO_LIGHT_START_HOUR,
    lightEndHour: AUTO_LIGHT_END_HOUR,
  };
}
