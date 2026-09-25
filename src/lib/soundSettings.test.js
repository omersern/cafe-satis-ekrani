import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSoundSettings, saveSoundSettings, SOUND_SETTINGS_KEYS } from './soundSettings.js';

test('AFK defaults, bounds and persisted changes', async () => {
  const values = new Map();
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  try {
    for (const value of [null, '', 'invalid', '   ']) {
      values.set(SOUND_SETTINGS_KEYS.afkTimeout, value);
      assert.equal((await loadSoundSettings()).afkTimeoutSeconds, 600);
    }
    for (const [input, expected] of [[900, 900], [0, 60], [7200, 3600]]) {
      await saveSoundSettings({ afkTimeoutSeconds: input });
      assert.equal((await loadSoundSettings()).afkTimeoutSeconds, expected);
    }
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});
