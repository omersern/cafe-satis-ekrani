export const SOUND_SETTINGS_KEYS = {
  afkTimeout: 'sale_afk_timeout_seconds',
};

export const DEFAULT_AFK_TIMEOUT_SECONDS = 600;
export const MIN_AFK_TIMEOUT_SECONDS = 60;
export const MAX_AFK_TIMEOUT_SECONDS = 3600;

export const SOUND_SETTINGS_EVENT = 'wpos:sound-settings-change';

function parseAfkTimeoutSeconds(value) {
  if (value == null || String(value).trim() === '') return DEFAULT_AFK_TIMEOUT_SECONDS;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_AFK_TIMEOUT_SECONDS;
  return Math.min(MAX_AFK_TIMEOUT_SECONDS, Math.max(MIN_AFK_TIMEOUT_SECONDS, Math.round(parsed)));
}

function lsGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export async function loadSoundSettings() {
  return {
    afkTimeoutSeconds: parseAfkTimeoutSeconds(lsGet(SOUND_SETTINGS_KEYS.afkTimeout)),
  };
}

export async function saveSoundSettings(partial) {
  if (partial.afkTimeoutSeconds != null) {
    lsSet(
      SOUND_SETTINGS_KEYS.afkTimeout,
      String(parseAfkTimeoutSeconds(partial.afkTimeoutSeconds))
    );
  }
  window.dispatchEvent(new CustomEvent(SOUND_SETTINGS_EVENT));
}

export function subscribeSoundSettings(callback) {
  const handler = () => callback();
  window.addEventListener(SOUND_SETTINGS_EVENT, handler);
  return () => window.removeEventListener(SOUND_SETTINGS_EVENT, handler);
}
