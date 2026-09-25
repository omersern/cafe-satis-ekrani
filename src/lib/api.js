import { refreshSaleCatalog } from './saleCatalog';
import { cloudFetch } from './cloudClient';
import { redirectToLogin, shouldClearStaffSession, hadStaffToken } from './sessionAuth';

const hardwareAction = (action, body = {}) => cloudJson(`/cafeapp/hardware/${action}`, {
  method: 'POST', body, timeout: 35000,
});

function mapStationToComputer(station) {
  if (!station) return null;
  return {
    id: station.id,
    cloudId: station.id,
    machineId: station.edgeMachineId,
    name: station.name,
    hostname: station.hostname,
    deviceType: station.deviceType,
    ipAddress: station.ipAddress,
    macAddress: station.macAddress,
    tariffId: station.tariffId ?? 0,
    categoryId: station.categoryId ?? null,
    categoryName: station.categoryName ?? null,
    sort: station.sort ?? 0,
    status: station.status,
    lastSeenAt: station.lastSeenAt,
  };
}

async function cloudJson(path, options = {}) {
  const { data } = await cloudFetch(path, options);
  return data;
}

let paymentPermissionCache = null;
let paymentPermissionRequest = null;

/** Tüm iş API çağrıları Cafe arayüzünün kalıcı cloud WebSocket bağlantısından geçer. */
export async function apiJson(path, options = {}) {
  const { response, data } = await cloudFetch(path, options);
  if (shouldClearStaffSession(response, data, { tokenSent: hadStaffToken(options) })) {
    redirectToLogin();
  }
  return { response, data };
}

export async function openCashDrawer() {
  return hardwareAction('open-drawer');
}

export async function getDashboard() {
  return cloudJson('/cafeapp/dashboard');
}

export async function listComputers(params = {}) {
  const categoryId = params.categoryId ?? params.category_id;
  const qs = categoryId != null && String(categoryId) !== ''
    ? `?categoryId=${encodeURIComponent(categoryId)}`
    : '';
  const data = await cloudJson(`/cafeapp/stations${qs}`);
  if (!data?.status) return data;
  return {
    ...data,
    data: (data.data || []).map(mapStationToComputer),
  };
}

export async function getTablesState() {
  return cloudJson('/cafeapp/tables-state');
}

export async function listStationCategories() {
  const data = await cloudJson('/cafeapp/bootstrap', { skipToken: true });
  return {
    status: Boolean(data?.status),
    data: data?.data?.stationCategories || [],
  };
}

export async function renameComputer(id, name) {
  return updateComputer(id, { name });
}

export async function createComputer(payload) {
  const data = await cloudJson('/cafeapp/stations/create', {
    method: 'POST',
    body: payload,
  });
  if (data?.data) {
    return { ...data, data: mapStationToComputer(data.data) };
  }
  return data;
}

export async function updateComputer(id, payload) {
  const data = await cloudJson(`/cafeapp/stations/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  if (data?.data) {
    return { ...data, data: mapStationToComputer(data.data) };
  }
  return data;
}

export async function deleteComputer(id) {
  return cloudJson(`/cafeapp/stations/${id}`, { method: 'DELETE' });
}

export async function wakeComputer(computer) {
  const id = computer?.cloudId || computer?.id;
  return cloudJson(`/cafeapp/stations/${encodeURIComponent(id)}/wake`, { method: 'POST', body: {} });
}

/** Cloud gün açık mı? */
export async function getDayOpenStatus({ force = true } = {}) {
  void force;
  const data = await cloudJson('/cafeapp/day-status');
  if (!data?.status) throw new Error(data?.message || 'Gün durumu alınamadı.');
  return {
    status: true,
    data: {
      open: Boolean(data.data?.open),
      activeDayDate: data?.data?.active_day_date || null,
    },
  };
}

export async function getDaySummary() {
  return cloudJson('/app/days/summary');
}

export async function getDayEndSummary() {
  return cloudJson('/app/days/end-summary');
}

export async function startDay(payload) {
  return cloudJson('/app/days/start', { method: 'POST', body: payload });
}

export async function endDay(payload) {
  return cloudJson('/app/days/end', { method: 'POST', body: payload });
}

export async function listActiveSessions() {
  return cloudJson('/cafeapp/sessions/active');
}

export async function listSessionHistory(limit = 100) {
  return cloudJson(`/cafeapp/sessions/history?limit=${limit}`);
}

export async function startSession(machineId, payload = {}) {
  return cloudJson('/cafeapp/sessions/start', {
    method: 'POST',
    body: { machineId, sessionType: 'guest', ...payload },
  });
}

export async function endSession(machineId, payload = {}) {
  return cloudJson('/cafeapp/sessions/end', {
    method: 'POST',
    body: { machineId, ...payload },
  });
}

export async function extendSession(machineId, payload = {}) {
  return cloudJson('/cafeapp/sessions/extend', {
    method: 'POST',
    body: { machineId, ...payload },
  });
}

export async function queueCommand(payload) {
  return cloudJson('/cafeapp/commands/send', {
    method: 'POST',
    body: {
      machineId: payload.machineId,
      commandType: payload.commandType,
      payload: payload.payload ?? null,
    },
  });
}

export async function listMembers() {
  return cloudJson('/cafeapp/members');
}

function normalizeServiceType(value) {
  if (value == null || value === '') return null;
  return String(value).toLowerCase().replace(/[\s_-]/g, '');
}

/** Edge /api/tariffs ile aynı: servis tipi null olan tarifeler tüm servislere açık. */
export function filterTariffsByServiceType(tariffs, serviceType) {
  const list = Array.isArray(tariffs) ? tariffs : [];
  const normalized = normalizeServiceType(serviceType);
  if (!normalized) return list;

  return list
    .filter((tariff) => {
      const raw = tariff?.serviceType ?? tariff?.service_type ?? null;
      if (!raw) return true;
      return normalizeServiceType(raw) === normalized;
    })
    .sort((a, b) => {
      const def = Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault));
      if (def !== 0) return def;
      return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
    });
}

export async function listTariffs(params = {}) {
  const serviceType = params.serviceType ?? params.service_type ?? null;
  const response = await cloudJson('/cafeapp/tariffs');
  if (!serviceType || !Array.isArray(response?.data)) return response;
  return {
    ...response,
    data: filterTariffsByServiceType(response.data, serviceType),
  };
}

export async function listTableTimers() {
  return cloudJson('/cafeapp/timers');
}

export async function listOpenAdditions() {
  return cloudJson('/app/addition/list?with_tables=1');
}

export async function startTableTimer(tableId, payload = {}) {
  return cloudJson('/cafeapp/timers/start', {
    method: 'POST',
    body: { tableId, ...payload },
  });
}

export async function stopTableTimer(tableId, payload = {}) {
  return cloudJson('/cafeapp/timers/stop', {
    method: 'POST',
    body: { tableId, ...payload },
  });
}

export async function extendTableTimer(tableId, addMinutes) {
  return cloudJson('/cafeapp/timers/extend', {
    method: 'POST',
    body: { tableId, addMinutes },
  });
}

/* Client giriş talepleri (internet kafe) */
export async function listLoginRequests() {
  return cloudJson('/cafeapp/sessions/login-requests');
}

export async function approveLoginRequest(id, payload = {}) {
  return cloudJson(`/cafeapp/sessions/login-requests/${id}/approve`, {
    method: 'POST',
    body: payload,
  });
}

export async function rejectLoginRequest(id) {
  return cloudJson(`/cafeapp/sessions/login-requests/${id}/reject`, {
    method: 'POST',
    body: {},
  });
}

export async function listNotifications() {
  return cloudJson('/cafeapp/notifications');
}

export async function markNotificationRead(id) {
  return cloudJson(`/cafeapp/notifications/${id}/read`, {
    method: 'POST',
    body: {},
  });
}

export async function clearAllNotifications() {
  return cloudJson('/cafeapp/notifications', {
    method: 'DELETE',
  });
}

export async function getPaymentPermission() {
  if (paymentPermissionCache && Date.now() - paymentPermissionCache.at < 30000) {
    return paymentPermissionCache.value;
  }
  if (!paymentPermissionRequest) {
    paymentPermissionRequest = cloudJson('/cafeapp/settings/payment-permission')
      .then((value) => {
        paymentPermissionCache = { at: Date.now(), value };
        return value;
      })
      .finally(() => { paymentPermissionRequest = null; });
  }
  return paymentPermissionRequest;
}

export async function getSettings() {
  return cloudJson('/cafeapp/settings');
}

export async function saveSettings(payload) {
  return cloudJson('/cafeapp/settings', {
    method: 'PUT',
    body: payload,
  });
}

/** Açılış / ayarlar: doğrudan cloud bootstrap + satış katalogu. */
export async function prefetchCloudStartup() {
  const [bootstrapRes, catalog] = await Promise.allSettled([
    cloudFetch('/cafeapp/bootstrap', { skipToken: true }),
    refreshSaleCatalog(),
  ]);

  const bootstrap =
    bootstrapRes.status === 'fulfilled' && bootstrapRes.value.data?.status
      ? bootstrapRes.value.data.data || {}
      : null;

  if (bootstrapRes.status === 'fulfilled' && !bootstrapRes.value.data?.status) {
    throw new Error(bootstrapRes.value.data?.message || 'Cihaz doğrulanamadı.');
  }
  if (bootstrapRes.status === 'rejected') {
    throw bootstrapRes.reason;
  }

  return {
    bootstrap: {
      tariffCount: bootstrap?.tariffs?.length ?? 0,
      memberCount: bootstrap?.members?.length ?? 0,
      stationCount: bootstrap?.stations?.length ?? 0,
    },
    catalog: {
      productCount: catalog.status === 'fulfilled' ? catalog.value?.products?.length ?? 0 : 0,
      categoryCount: catalog.status === 'fulfilled' ? catalog.value?.categories?.length ?? 0 : 0,
    },
  };
}

export function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
