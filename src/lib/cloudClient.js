/**
 * Renderer → cloud API (local sale proxy yok).
 */
import { redirectToLogin, shouldClearStaffSession } from './sessionAuth';

const DEFAULT_API = import.meta.env.VITE_API_URL || import.meta.env.CAFE_CLOUD_API_URL || 'https://test-api.webbekpos.com';

let cachedConfig = null;
let socket = null;
let connecting = null;
let requestId = 0;
const pending = new Map();
const pingWaiters = new Set();

async function loadAppConfig() {
  if (cachedConfig) return cachedConfig;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('cafe-cloud-config') || '{}'); } catch { /* ignore */ }
  cachedConfig = { apiUrl: DEFAULT_API.replace(/\/$/, ''), ...saved };
  return cachedConfig;
}

export async function getCloudApiUrl() {
  const cfg = await loadAppConfig();
  return String(cfg.apiUrl || DEFAULT_API).replace(/\/$/, '');
}

export async function getCloudWsUrl() {
  const cfg = await loadAppConfig();
  const api = String(cfg.apiUrl || DEFAULT_API).replace(/\/$/, '');
  if (cfg.wsUrl) return String(cfg.wsUrl).replace(/\/$/, '');
  return api.replace(/^http/i, 'ws');
}

// Ekran yayını, RPC soket adresini değil doğrudan cloud API'nin screen endpointini kullanır.
// Böylece kaydedilmiş wsUrl içinde /ws veya /ws/screen olsa bile yol iki kez eklenmez.
export async function getCloudScreenWsUrl(machineId, role = 'viewer') {
  const url = new URL(await getCloudApiUrl());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/screen';
  url.search = '';
  url.searchParams.set('role', role);
  url.searchParams.set('machineId', String(machineId));
  return url.toString();
}

async function readStaffAuth() {
  try {
    const raw = localStorage.getItem('cafe-staff-session');
    if (!raw) return { token: null, clientId: null, deviceId: null };
    const s = JSON.parse(raw);
    return {
      token: s?.token || null,
      clientId: s?.clientId || null,
      deviceId: s?.deviceId || null,
    };
  } catch {
    return { token: null, clientId: null, deviceId: null };
  }
}

export async function cloudFetch(path, options = {}) {
  const base = await getCloudApiUrl();
  const { token, clientId, deviceId } = await readStaffAuth();
  const cfg = await loadAppConfig();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token && !options.skipToken) headers['X-Access-Token'] = token;
  const tokenSent = Boolean(token && !options.skipToken);
  const cid = options.clientId || clientId || cfg.clientId;
  const did = options.deviceId || deviceId || cfg.deviceId;
  if (cid) headers['X-ClientId'] = cid;
  if (did) headers['X-DeviceId'] = did;

  const target = path.startsWith('http') ? new URL(path) : null;
  const url = target ? target.pathname + target.search : path.startsWith('/') ? path : `/${path}`;
  const data = await rpc(url, {
    method: options.method || 'GET',
    headers,
    body: options.body == null ? undefined : typeof options.body === 'string' ? JSON.parse(options.body) : options.body,
    clientId: cid,
    deviceId: did,
    timeout: options.timeout,
  });
  const status = data && typeof data === 'object' ? data.__rpcStatus || 200 : 200;
  if (data && typeof data === 'object') delete data.__rpcStatus;
  const response = { ok: status >= 200 && status < 300, status, statusText: '' };

  if (shouldClearStaffSession(response, data, { tokenSent, skipToken: options.skipToken })) {
    redirectToLogin();
    throw new Error('Oturum süresi doldu.');
  }

  return { response, data, ok: response.ok };
}

function socketUrl(apiUrl, clientId, deviceId) {
  const url = new URL(apiUrl);
  const hostPath = url.host.startsWith('test-api.') ? '/ws/screen' : '/ws';
  const ws = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const result = new URL(`${ws}//${url.host}${hostPath}`);
  result.searchParams.set('clientId', clientId || '');
  result.searchParams.set('deviceId', deviceId || '');
  result.searchParams.set('role', 'rpc');
  return result.toString();
}

async function connectRpc(base, clientId, deviceId) {
  if (socket?.readyState === WebSocket.OPEN && socket.clientId === clientId && socket.deviceId === deviceId) return;
  if (connecting) {
    await connecting;
    if (socket?.readyState === WebSocket.OPEN && socket.clientId === clientId && socket.deviceId === deviceId) return;
  }
  if (socket) socket.close();
  connecting = new Promise((resolve, reject) => {
    const ws = new WebSocket(socketUrl(base, clientId, deviceId));
    const timer = setTimeout(() => { ws.close(); reject(new Error('Cloud WebSocket bağlantısı zaman aşımına uğradı')); }, 10000);
    ws.onopen = () => {
      clearTimeout(timer);
      ws.clientId = clientId;
      ws.deviceId = deviceId;
      socket = ws;
      resolve();
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('Cloud WebSocket bağlantısı kurulamadı')); };
    ws.onclose = () => {
      if (socket === ws) socket = null;
      for (const [id, item] of pending) { item.reject(new Error('Cloud WebSocket bağlantısı kesildi')); pending.delete(id); }
    };
    ws.onmessage = (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'PONG') {
        for (const waiter of pingWaiters) waiter();
        pingWaiters.clear();
        return;
      }
      if (message.type !== 'RPC_RESULT') {
        window.dispatchEvent(new CustomEvent(
          `wpos:${String(message.type || '').toLowerCase().replaceAll('_', '-')}`,
          { detail: message },
        ));
        return;
      }
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      item.resolve({ ...(message.body || {}), __rpcStatus: message.status });
    };
  }).finally(() => { connecting = null; });
  await connecting;
}

export async function pingCloud() {
  const cfg = await loadAppConfig();
  if (!cfg.clientId || !cfg.deviceId) return { online: typeof navigator === 'undefined' || navigator.onLine, latencyMs: null };
  const started = Date.now();
  try {
    await connectRpc(await getCloudApiUrl(), cfg.clientId, cfg.deviceId);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pingWaiters.delete(onPong);
        reject(new Error('Cloud ping timeout'));
      }, 3000);
      const onPong = () => { clearTimeout(timer); resolve(); };
      pingWaiters.add(onPong);
      socket.send(JSON.stringify({ type: 'PING' }));
    });
    return { online: true, latencyMs: Date.now() - started };
  } catch {
    return { online: false, latencyMs: null };
  }
}

async function rpc(path, options) {
  const base = await getCloudApiUrl();
  await connectRpc(base, options.clientId, options.deviceId);
  const id = String(++requestId);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Cloud isteği zaman aşımına uğradı')); }, options.timeout || 15000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    socket.send(JSON.stringify({ type: 'RPC', id, method: options.method, url: path, headers: options.headers, body: options.body }));
  });
}

export async function getCloudStatus() {
  const cfg = await loadAppConfig();
  if (!cfg.clientId || !cfg.deviceId) return { paired: false, online: true };
  const { online } = await pingCloud();
  return { paired: true, online, clientId: cfg.clientId, deviceId: cfg.deviceId };
}

export function saveCloudPairing(clientId, deviceId) {
  cachedConfig = { ...(cachedConfig || {}), clientId, deviceId };
  localStorage.setItem('cafe-cloud-config', JSON.stringify(cachedConfig));
  localStorage.setItem('cafe_sale_kv:client_id', JSON.stringify(clientId));
  localStorage.setItem('cafe_sale_kv:device_id', JSON.stringify(deviceId));
  window.dispatchEvent(new Event('wpos:cloud-paired'));
}

export function clearCloudPairing() {
  cachedConfig = null;
  localStorage.removeItem('cafe-cloud-config');
  localStorage.removeItem('cafe-staff-session');
  localStorage.removeItem('cafe_sale_kv:client_id');
  localStorage.removeItem('cafe_sale_kv:device_id');
  socket?.close();
}

export function invalidateCloudConfigCache() {
  cachedConfig = null;
}
