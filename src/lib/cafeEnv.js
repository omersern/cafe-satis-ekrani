/**
 * posv2 window.env shim — saleApi doğrudan cloud /app/* kullanır.
 * Yazıcı WS posv2 ile aynı: renderer → cloud /ws
 */
import { readStaffSession } from './auth';

const LS_PREFIX = 'cafe_sale_kv:';
const DEFAULT_WS = import.meta.env.VITE_WS_URL || import.meta.env.CAFE_CLOUD_WS_URL || 'wss://test-api.webbekpos.com';

const memory = new Map();

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function lsRemove(key) {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    // ignore
  }
}

async function resolveCloudIds() {
  try {
    const res = JSON.parse(localStorage.getItem('cafe-cloud-config') || '{}');
    if (res.clientId) lsSet('client_id', res.clientId);
    if (res.deviceId) lsSet('device_id', res.deviceId);
    if (res.apiUrl) lsSet('cloud_api_url', res.apiUrl);
    if (res.wsUrl) lsSet('cloud_ws_url', res.wsUrl);
    return res;
  } catch {
    return null;
  }
  return null;
}

export function installCafeEnv() {
  if (typeof window === 'undefined') return;

  window.env = {
    get API_URL() {
      return import.meta.env.VITE_API_URL || import.meta.env.CAFE_CLOUD_API_URL || 'https://test-api.webbekpos.com';
    },
    get WS_URL() {
      return lsGet('cloud_ws_url') || DEFAULT_WS;
    },
    async getKey(key) {
      if (key === 'auth_key' || key === 'auth_token') {
        const s = readStaffSession();
        return s?.token || lsGet('auth_key') || null;
      }
      if (key === 'auth_username' || key === 'auth_user_name') {
        const s = readStaffSession();
        return s?.staff?.name || lsGet(key) || null;
      }
      if (key === 'client_id' || key === 'device_id') {
        let v = lsGet(key);
        if (!v) {
          await resolveCloudIds();
          v = lsGet(key);
        }
        return v;
      }
      if (memory.has(key)) return memory.get(key);
      return lsGet(key);
    },
    async addKey(key, value) {
      memory.set(key, value);
      lsSet(key, value);
    },
    async removeKey(key) {
      memory.delete(key);
      lsRemove(key);
    },
  };

  resolveCloudIds().catch(() => {});
}
