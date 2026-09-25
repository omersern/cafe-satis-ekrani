import {
  HOUR_END,
  HOUR_HEIGHT_PX,
  HOUR_START,
  STATUS_CONFIG,
  STATUS_ORDER,
  WEEKDAYS,
  formatTime,
  getEventPosition,
  getMonthGridDays,
  getTimelineHeight,
  getWeekStart,
  groupReservationsByDay,
  isSameDay,
  parseReservationDate,
  sortByStartTime,
} from '../../lib/reservations';

const TIMELINE_HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const TIMELINE_HEIGHT = getTimelineHeight();

function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

function StatusBadge({ status, className = '' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1', cfg.pill, className)}>
      {cfg.label}
    </span>
  );
}

function ReservationEvent({ reservation, style, onClick, compact }) {
  const cfg = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
  const start = parseReservationDate(reservation.starts_at);
  const end = parseReservationDate(reservation.ends_at);

  return (
    <button
      type="button"
      style={style}
      onClick={(e) => { e.stopPropagation(); onClick?.(reservation); }}
      className={cn(
        'absolute z-10 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition-all',
        'hover:z-20 hover:brightness-110 cursor-pointer touch-manipulation',
        cfg.surface,
        compact ? 'text-[10px] leading-tight' : 'text-xs',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('size-1.5 shrink-0 rounded-full', cfg.dot)} />
        <span className="truncate font-semibold">{reservation.customer_name}</span>
      </div>
      {!compact && start && (
        <p className="mt-0.5 truncate opacity-80">
          {formatTime(start)}
          {end ? ` – ${formatTime(end)}` : ''}
        </p>
      )}
      {!compact && reservation.table_name && (
        <p className="truncate text-[10px] opacity-70">{reservation.table_name}</p>
      )}
    </button>
  );
}

function TimelineColumn({ date, reservations, onOpenReservation, onSlotClick }) {
  const dayEvents = sortByStartTime(
    reservations.filter((r) => isSameDay(parseReservationDate(r.starts_at), date)),
  );

  return (
    <div className="relative border-r border-white/[0.06] bg-app-card last:border-r-0" style={{ height: TIMELINE_HEIGHT }}>
      {TIMELINE_HOURS.map((h) => (
        <div
          key={h}
          className="pointer-events-none absolute inset-x-0 border-b border-white/[0.04]"
          style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
        />
      ))}

      {TIMELINE_HOURS.map((h) => (
        <button
          key={`slot-${h}`}
          type="button"
          aria-label={`${date.toLocaleDateString('tr-TR')} ${String(h).padStart(2, '0')}:00`}
          className="absolute inset-x-0 cursor-pointer transition-colors hover:bg-blue-500/5 touch-manipulation"
          style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
          onClick={() => {
            const slot = new Date(date);
            slot.setHours(h, 0, 0, 0);
            onSlotClick?.(slot);
          }}
        />
      ))}

      {dayEvents.map((r) => {
        const pos = getEventPosition(parseReservationDate(r.starts_at), parseReservationDate(r.ends_at));
        if (!pos) return null;
        return (
          <ReservationEvent
            key={r.id}
            reservation={r}
            style={{ top: pos.top, height: pos.height, left: 4, right: 4 }}
            onClick={onOpenReservation}
          />
        );
      })}
    </div>
  );
}

function TimeGutter() {
  return (
    <div className="relative shrink-0 border-r border-white/[0.06] bg-white/[0.02]" style={{ width: 56, height: TIMELINE_HEIGHT }}>
      {TIMELINE_HOURS.map((h) => (
        <div
          key={h}
          className="absolute inset-x-0 flex items-start justify-end pr-2 pt-1 text-[10px] tabular-nums text-slate-500"
          style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
        >
          {String(h).padStart(2, '0')}
          :00
        </div>
      ))}
    </div>
  );
}

export function MonthCalendar({ cursor, reservations, selectedDay, onSelectDay, onOpenReservation }) {
  const cells = getMonthGridDays(cursor);
  const byDay = groupReservationsByDay(reservations);
  const today = new Date();
  const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-app-card">
      <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="border-r border-white/[0.06] px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr sm:auto-rows-[minmax(96px,1fr)]">
        {cells.map((date, index) => {
          const inMonth = date.getMonth() === cursor.getMonth();
          const isToday = isSameDay(date, today);
          const isSelected = selectedDay && isSameDay(date, selectedDay);
          const items = byDay.get(dayKey(date)) || [];
          const isLastCol = index % 7 === 6;

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDay?.(date)}
              className={cn(
                'flex min-h-[72px] flex-col border-b border-r border-white/[0.06] p-1.5 text-left transition-colors sm:min-h-[96px] sm:p-2',
                'cursor-pointer hover:bg-white/[0.04] touch-manipulation',
                isLastCol && 'border-r-0',
                !inMonth && 'bg-white/[0.01]',
                isSelected && 'bg-blue-500/10 ring-2 ring-inset ring-blue-500/30',
                isToday && !isSelected && 'bg-blue-500/[0.04]',
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <span className={cn(
                  'inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                  isToday && 'bg-blue-500 text-white',
                  !inMonth && !isToday && 'text-slate-600',
                )}
                >
                  {date.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-400">
                    {items.length}
                  </span>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {items.slice(0, 3).map((r) => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const start = parseReservationDate(r.starts_at);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpenReservation?.(r); }}
                      className={cn(
                        'flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-medium',
                        'cursor-pointer transition-opacity hover:opacity-90 touch-manipulation',
                        cfg.surface,
                      )}
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', cfg.dot)} />
                      <span className="truncate">{start ? `${formatTime(start)} ` : ''}{r.customer_name}</span>
                    </button>
                  );
                })}
                {items.length > 3 && (
                  <span className="px-1 text-[10px] font-medium text-slate-500">
                    +
                    {items.length - 3}
                    {' '}
                    rezervasyon
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WeekCalendar({ cursor, reservations, onOpenReservation, onSlotClick }) {
  const weekStart = getWeekStart(cursor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-app-card">
      <div className="metro-scroll overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid border-b border-white/[0.06] bg-white/[0.02]" style={{ gridTemplateColumns: '56px repeat(7, minmax(100px, 1fr))' }}>
            <div className="border-r border-white/[0.06]" />
            {days.map((d) => (
              <div key={d.toISOString()} className="border-r border-white/[0.06] px-2 py-3 text-center last:border-r-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {WEEKDAYS[(d.getDay() + 6) % 7]}
                </p>
                <p className={cn('mt-0.5 text-lg font-semibold tabular-nums', isSameDay(d, today) && 'text-blue-400')}>
                  {d.getDate()}
                </p>
                <p className="text-[10px] text-slate-500">{d.toLocaleDateString('tr-TR', { month: 'short' })}</p>
              </div>
            ))}
          </div>
          <div className="flex">
            <TimeGutter />
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))' }}>
              {days.map((day) => (
                <TimelineColumn
                  key={day.toISOString()}
                  date={day}
                  reservations={reservations}
                  onOpenReservation={onOpenReservation}
                  onSlotClick={onSlotClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DayCalendar({ cursor, reservations, onOpenReservation, onSlotClick }) {
  const dayReservations = sortByStartTime(
    reservations.filter((r) => isSameDay(parseReservationDate(r.starts_at), cursor)),
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-app-card">
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-base font-semibold capitalize text-white">
            {cursor.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-slate-500">{dayReservations.length} rezervasyon</p>
        </div>
        <div className="metro-scroll overflow-x-auto">
          <div className="flex min-w-[320px]">
            <TimeGutter />
            <div className="min-w-0 flex-1">
              <TimelineColumn
                date={cursor}
                reservations={reservations}
                onOpenReservation={onOpenReservation}
                onSlotClick={onSlotClick}
              />
            </div>
          </div>
        </div>
      </div>
      <AgendaPanel
        title="Gün programı"
        subtitle={cursor.toLocaleDateString('tr-TR', { weekday: 'long' })}
        items={dayReservations}
        onOpenReservation={onOpenReservation}
        emptyText="Bu gün için rezervasyon yok."
      />
    </div>
  );
}

export function AgendaPanel({
  title, subtitle, items, onOpenReservation, emptyText, onAddClick, canManage,
}) {
  return (
    <div className="flex w-full flex-col rounded-2xl border border-white/[0.08] bg-app-card">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="metro-scroll max-h-[420px] space-y-2 overflow-y-auto p-3 lg:max-h-[560px]">
        {items.length ? items.map((r) => (
          <AgendaItem key={r.id} reservation={r} onClick={() => onOpenReservation?.(r)} />
        )) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
            <p className="text-sm text-slate-500">{emptyText}</p>
            {canManage && onAddClick && (
              <button type="button" onClick={onAddClick} className="mt-2 text-sm font-medium text-blue-400 hover:underline touch-manipulation">
                Rezervasyon ekle
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AgendaItem({ reservation, onClick }) {
  const start = parseReservationDate(reservation.starts_at);
  const end = parseReservationDate(reservation.ends_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.05] touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{reservation.customer_name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-slate-500">
            {start ? formatTime(start) : '—'}
            {end ? ` – ${formatTime(end)}` : ''}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        {reservation.table_name && <span>{reservation.table_name}</span>}
        <span>{reservation.guest_count || 1} kişi</span>
      </div>
      {reservation.notes && <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{reservation.notes}</p>}
    </button>
  );
}

export function DaySidebarList({
  date, reservations, onOpenReservation, onAddClick, canManage,
}) {
  const items = sortByStartTime(
    reservations.filter((r) => isSameDay(parseReservationDate(r.starts_at), date)),
  );
  return (
    <AgendaPanel
      title={date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
      subtitle={`${items.length} rezervasyon`}
      items={items}
      onOpenReservation={onOpenReservation}
      emptyText="Seçili günde rezervasyon yok."
      onAddClick={onAddClick}
      canManage={canManage}
    />
  );
}

export function StatusLegend({ className = '' }) {
  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1.5', className)}>
      {STATUS_ORDER.map((key) => (
        <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={cn('size-2 rounded-full', STATUS_CONFIG[key].dot)} />
          {STATUS_CONFIG[key].label}
        </span>
      ))}
    </div>
  );
}

