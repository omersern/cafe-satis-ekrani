import { cloudFetch } from './cloudClient';
import { listComputers, listStationCategories } from './api';

export const HOUR_START = 8;
export const HOUR_END = 24;
export const HOUR_HEIGHT_PX = 56;

export const STATUS_CONFIG = {
  pending: {
    label: 'Bekliyor',
    surface: 'bg-amber-500/15 text-amber-200 border-amber-500/25',
    dot: 'bg-amber-400',
    ring: 'ring-amber-500/30',
    pill: 'bg-amber-500/15 text-amber-300 ring-amber-500/25',
  },
  confirmed: {
    label: 'Onaylandı',
    surface: 'bg-blue-500/15 text-blue-200 border-blue-500/25',
    dot: 'bg-blue-400',
    ring: 'ring-blue-500/30',
    pill: 'bg-blue-500/15 text-blue-300 ring-blue-500/25',
  },
  completed: {
    label: 'Tamamlandı',
    surface: 'bg-slate-500/15 text-slate-200 border-slate-500/25',
    dot: 'bg-slate-400',
    ring: 'ring-slate-500/30',
    pill: 'bg-slate-500/15 text-slate-300 ring-slate-500/25',
  },
  cancelled: {
    label: 'İptal',
    surface: 'bg-rose-500/15 text-rose-200 border-rose-500/25',
    dot: 'bg-rose-400',
    ring: 'ring-rose-500/30',
    pill: 'bg-rose-500/15 text-rose-300 ring-rose-500/25',
  },
  no_show: {
    label: 'Gelmedi',
    surface: 'bg-orange-500/15 text-orange-200 border-orange-500/25',
    dot: 'bg-orange-400',
    ring: 'ring-orange-500/30',
    pill: 'bg-orange-500/15 text-orange-300 ring-orange-500/25',
  },
};

export const STATUS_ORDER = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
export const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export async function reservationApi(path, options = {}) {
  if (path === '/tables/categories/list') {
    const response = await listStationCategories();
    if (!response?.status) throw new Error(response?.message || 'Masa kategorileri alınamadı.');
    return response;
  }

  if (path.startsWith('/tables/list')) {
    const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
    const params = new URLSearchParams(query);
    const categoryId = params.get('categoryId');
    const response = await listComputers(
      categoryId && categoryId !== '0' ? { categoryId } : {}
    );
    if (!response?.status) throw new Error(response?.message || 'Masalar alınamadı.');
    const tables = (response.data || [])
      .filter((table) => table.cloudId != null || table.id != null)
      .map((table) => ({
        ...table,
        id: table.cloudId ?? table.id,
        category_id: table.categoryId,
        category_name: table.categoryName,
      }));
    return { ...response, data: { tables } };
  }

  const { method = 'GET', body, ...rest } = options;
  const cloudPath = `/management/reservations${path.replace('/reservations', '')}`;
  const { data } = await cloudFetch(cloudPath, {
    method,
    body: body ?? undefined,
    ...rest,
  });

  if (data?.status === false) {
    throw new Error(data?.message || 'Rezervasyon isteği başarısız');
  }

  return data;
}

export function parseReservationDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toLocalInputValue(date) {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInputValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getViewRange(view, cursor) {
  const start = new Date(cursor);
  const end = new Date(cursor);

  if (view === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 42);
  } else if (view === 'week') {
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else {
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

export function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getMonthGridDays(cursor) {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    date.setHours(0, 0, 0, 0);
    return date;
  });
}

export function defaultFormFromDate(date) {
  const start = new Date(date);
  start.setHours(19, 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 2);
  return {
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    guest_count: '2',
    table_category_id: '',
    table_id: '',
    starts_at: toLocalInputValue(start),
    ends_at: toLocalInputValue(end),
    status: 'pending',
    notes: '',
  };
}

export function reservationToForm(reservation) {
  return {
    customer_name: reservation.customer_name || '',
    customer_phone: reservation.customer_phone || '',
    customer_email: reservation.customer_email || '',
    guest_count: String(reservation.guest_count || 2),
    table_category_id: '',
    table_id: reservation.table_id ? String(reservation.table_id) : '',
    starts_at: toLocalInputValue(parseReservationDate(reservation.starts_at)),
    ends_at: toLocalInputValue(parseReservationDate(reservation.ends_at)),
    status: reservation.status || 'pending',
    notes: reservation.notes || '',
  };
}

export function formatTime(date) {
  if (!date) return '-';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function sortByStartTime(list) {
  return [...list].sort(
    (a, b) => (parseReservationDate(a.starts_at)?.getTime() || 0) - (parseReservationDate(b.starts_at)?.getTime() || 0),
  );
}

export function groupReservationsByDay(reservations) {
  const map = new Map();
  reservations.forEach((r) => {
    const start = parseReservationDate(r.starts_at);
    if (!start) return;
    const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  map.forEach((items, key) => map.set(key, sortByStartTime(items)));
  return map;
}

export function getTimelineHeight() {
  return (HOUR_END - HOUR_START) * HOUR_HEIGHT_PX;
}

export function getEventPosition(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const dayStartMin = HOUR_START * 60;
  const dayEndMin = HOUR_END * 60;
  const startMin = startDate.getHours() * 60 + startDate.getMinutes();
  const endMin = endDate.getHours() * 60 + endDate.getMinutes();
  const clampedStart = Math.max(dayStartMin, startMin);
  const clampedEnd = Math.min(dayEndMin, Math.max(endMin, clampedStart + 30));
  if (clampedEnd <= dayStartMin || clampedStart >= dayEndMin) return null;
  const top = ((clampedStart - dayStartMin) / 60) * HOUR_HEIGHT_PX;
  const height = Math.max(28, ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT_PX);
  return { top, height };
}
