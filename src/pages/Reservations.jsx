import { useCallback, useEffect, useMemo, useState } from 'react';
import ReservationFormModal from '../components/reservations/ReservationFormModal';
import MetroShell from '../components/metro/MetroShell';
import {
  DayCalendar,
  DaySidebarList,
  MonthCalendar,
  StatusLegend,
  WeekCalendar,
} from '../components/reservations/ReservationCalendar';
import SaleToast from '../components/sale/ui/SaleToast';
import { saleBtn } from '../components/sale/ui/SaleModal';
import { useAuth } from '../context/AuthContext';
import { PERMS } from '../lib/permissions';
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  defaultFormFromDate,
  getViewRange,
  isSameDay,
  parseReservationDate,
  reservationApi,
  reservationToForm,
  sortByStartTime,
} from '../lib/reservations';

const VIEWS = [
  { id: 'month', label: 'Ay' },
  { id: 'week', label: 'Hafta' },
  { id: 'day', label: 'Gün' },
];

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-blue-400 bg-blue-500/15',
    amber: 'text-amber-400 bg-amber-500/15',
    emerald: 'text-emerald-400 bg-emerald-500/15',
  };
  return (
    <div className="metro-card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones[tone] || tones.default}`}>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
      </div>
    </div>
  );
}

export default function Reservations() {
  const { can } = useAuth();
  const canList = can(PERMS.VIEW_RESERVATIONS);
  const canManage = can(PERMS.MANAGE_RESERVATIONS);

  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => defaultFormFromDate(new Date()));

  const [toast, setToast] = useState(null);

  const showError = useCallback((message) => {
    setToast({ message, tone: 'error' });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const showSuccess = useCallback((message) => {
    setToast({ message, tone: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const range = useMemo(() => getViewRange(view, cursor), [view, cursor]);

  const fetchReservations = useCallback(async () => {
    if (!canList) {
      setReservations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await reservationApi(`/reservations/list?${params.toString()}`);
      setReservations(sortByStartTime(res.data || []));
    } catch (error) {
      showError(error.message || 'Rezervasyonlar yüklenemedi.');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [canList, range.start, range.end, statusFilter, showError]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let todayCount = 0;
    let pendingCount = 0;
    let guestTotal = 0;

    reservations.forEach((r) => {
      const start = parseReservationDate(r.starts_at);
      if (start && start >= today && start < tomorrow) {
        todayCount += 1;
        guestTotal += Number(r.guest_count) || 0;
      }
      if (r.status === 'pending') pendingCount += 1;
    });

    return { todayCount, pendingCount, guestTotal };
  }, [reservations]);

  const headerLabel = useMemo(() => {
    if (view === 'month') {
      return cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const { start, end } = range;
      const endDay = new Date(end);
      endDay.setDate(endDay.getDate() - 1);
      return `${start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${endDay.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return cursor.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [view, cursor, range]);

  const shiftCursor = (dir) => {
    setCursor((prev) => {
      const next = new Date(prev);
      if (view === 'month') next.setMonth(next.getMonth() + dir);
      else if (view === 'week') next.setDate(next.getDate() + dir * 7);
      else next.setDate(next.getDate() + dir);
      return next;
    });
  };

  const goToday = () => {
    const now = new Date();
    setCursor(now);
    setSelectedDay(now);
  };

  const openCreate = (date) => {
    if (!canManage) return;
    setEditingId(null);
    setForm(defaultFormFromDate(date || selectedDay || new Date()));
    setModalOpen(true);
  };

  const openEdit = (reservation) => {
    setEditingId(reservation.id);
    setForm(reservationToForm(reservation));
    setModalOpen(true);
  };

  const handleSelectDay = (date) => {
    setSelectedDay(date);
    if (!isSameDay(date, cursor) && view === 'month') {
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    if (nextView === 'day' || nextView === 'week') setCursor(selectedDay);
  };

  return (
    <MetroShell title="Rezervasyonlar" subtitle="Masa ve misafir planlaması">
      <main className="reservation-shell sale-shell metro-scroll flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Bugünkü rezervasyon" value={stats.todayCount} />
            <StatCard label="Bekleyen onay" value={stats.pendingCount} tone="amber" />
            <StatCard label="Bugünkü misafir" value={stats.guestTotal} tone="emerald" />
          </div>

          <section className="metro-card overflow-hidden">
            <div className="space-y-4 border-b border-white/[0.06] p-4 sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="sale-tab-track">
                    {VIEWS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleViewChange(v.id)}
                        className={saleBtn.segment(view === v.id)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02]">
                    <button type="button" onClick={() => shiftCursor(-1)} className={`${saleBtn.icon} rounded-r-none`} aria-label="Önceki">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button type="button" onClick={goToday} className={`${saleBtn.ghost} !min-h-[48px] rounded-none px-4`}>Bugün</button>
                    <button type="button" onClick={() => shiftCursor(1)} className={`${saleBtn.icon} rounded-l-none`} aria-label="Sonraki">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <h2 className="min-w-0 truncate text-sm font-semibold capitalize text-white">{headerLabel}</h2>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => openCreate(selectedDay)}
                      className={`${saleBtn.primary} shrink-0`}
                    >
                      + Yeni rezervasyon
                    </button>
                  )}
                </div>
              </div>

              <div className="metro-scroll flex max-w-full gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={saleBtn.pill(statusFilter === 'all')}
                >
                  Tümü
                </button>
                {STATUS_ORDER.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation ${
                      statusFilter === key
                        ? `${STATUS_CONFIG[key].surface} ring-1 ${STATUS_CONFIG[key].ring}`
                        : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    {STATUS_CONFIG[key].label}
                  </button>
                ))}
              </div>

              <StatusLegend className="hidden sm:flex" />
            </div>

            <div className="p-3 sm:p-5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
                  Rezervasyonlar yükleniyor…
                </div>
              ) : (
                <div className={view === 'month' ? 'flex flex-col gap-4 lg:flex-row lg:items-start' : ''}>
                  <div className="min-w-0 flex-1">
                    {view === 'month' && (
                      <MonthCalendar
                        cursor={cursor}
                        reservations={reservations}
                        selectedDay={selectedDay}
                        onSelectDay={handleSelectDay}
                        onOpenReservation={openEdit}
                      />
                    )}
                    {view === 'week' && (
                      <WeekCalendar
                        cursor={cursor}
                        reservations={reservations}
                        onOpenReservation={openEdit}
                        onSlotClick={canManage ? openCreate : undefined}
                      />
                    )}
                    {view === 'day' && (
                      <DayCalendar
                        cursor={cursor}
                        reservations={reservations}
                        onOpenReservation={openEdit}
                        onSlotClick={canManage ? openCreate : undefined}
                      />
                    )}
                  </div>

                  {view === 'month' && (
                    <div className="w-full shrink-0 lg:w-72 xl:w-80">
                      <DaySidebarList
                        date={selectedDay}
                        reservations={reservations}
                        onOpenReservation={openEdit}
                        onAddClick={() => openCreate(selectedDay)}
                        canManage={canManage}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <ReservationFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        setForm={setForm}
        editingId={editingId}
        canManage={canManage}
        onSaved={fetchReservations}
        onError={showError}
        onSuccess={showSuccess}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-[5.25rem] z-[60] flex justify-center px-4 sm:px-8">
          <SaleToast
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => setToast(null)}
            className="pointer-events-auto w-full max-w-md"
          />
        </div>
      )}
    </MetroShell>
  );
}
