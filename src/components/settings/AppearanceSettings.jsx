import { useEffect, useMemo, useState } from 'react';
import {
  applyThemePreference,
  getAutoScheduleInfo,
  getTheme,
  getThemePreference,
  THEMES,
} from '../../lib/theme';
import {
  applySidebarPosition,
  getSidebarPosition,
  applyInteractionMode,
  getInteractionMode,
  INTERACTION_MODES,
  SIDEBAR_POSITIONS,
} from '../../lib/layout';
import { SettingsGroup } from './SettingsLayout';

function CheckBadge() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent)] text-white">
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function ThemePreview({ variant }) {
  if (variant === 'auto') {
    return (
      <div className="relative h-20 overflow-hidden rounded-md border border-[var(--settings-card-border)]">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-amber-50 to-slate-800" />
        <div className="absolute left-2 top-2 h-5 w-5 rounded-full bg-amber-300 shadow-sm" />
        <div className="absolute bottom-2 right-2 h-3 w-3 rounded-full bg-slate-200/80" />
      </div>
    );
  }
  if (variant === 'light') {
    return (
      <div className="h-20 rounded-md border border-[#e5e5e5] bg-[#f3f3f3] p-2">
        <div className="mb-1.5 h-2 w-2/3 rounded bg-[#1a1a1a]/70" />
        <div className="h-1.5 w-full rounded bg-[#1a1a1a]/10" />
        <div className="mt-2 h-4 rounded bg-white ring-1 ring-black/[0.06]" />
      </div>
    );
  }
  return (
    <div className="h-20 rounded-md border border-slate-700 bg-[#2d2d2d] p-2">
      <div className="mb-1.5 h-2 w-2/3 rounded bg-white/80" />
      <div className="h-1.5 w-full rounded bg-white/10" />
      <div className="mt-2 h-4 rounded bg-[#333] ring-1 ring-white/[0.08]" />
    </div>
  );
}

const OPTIONS = [
  { id: THEMES.auto, title: 'Otomatik', subtitle: '07:00 – 18:00 açık', variant: 'auto' },
  { id: THEMES.light, title: 'Açık', subtitle: 'Her zaman açık tema', variant: 'light' },
  { id: THEMES.dark, title: 'Koyu', subtitle: 'Her zaman koyu tema', variant: 'dark' },
];

const SIDEBAR_OPTIONS = [
  { id: SIDEBAR_POSITIONS.left, title: 'Sol' },
  { id: SIDEBAR_POSITIONS.right, title: 'Sağ' },
  { id: SIDEBAR_POSITIONS.top, title: 'Üst' },
  { id: SIDEBAR_POSITIONS.bottom, title: 'Alt' },
];

const INTERACTION_OPTIONS = [
  { id: INTERACTION_MODES.desktop, title: 'Masaüstü', subtitle: 'Mevcut fare ve klavye düzeni' },
  { id: INTERACTION_MODES.touch, title: 'Dokunmatik', subtitle: 'Büyük temas alanları ve rahat boşluklar' },
];

function SidebarPreview({ position }) {
  return (
    <div className={`settings-sidebar-preview is-${position}`} aria-hidden="true">
      <span className="settings-sidebar-preview-rail" />
      <span className="settings-sidebar-preview-content">
        <i /><i /><i />
      </span>
    </div>
  );
}

function InteractionPreview({ mode }) {
  return (
    <div className={`flex h-20 overflow-hidden rounded-md border border-[var(--settings-card-border)] p-2 ${mode === INTERACTION_MODES.touch ? 'gap-2 bg-[var(--settings-row-hover)]' : 'gap-1.5'}`} aria-hidden="true">
      <span className={`rounded bg-[var(--app-accent)]/70 ${mode === INTERACTION_MODES.touch ? 'w-7' : 'w-4'}`} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <i className={`block rounded bg-[var(--settings-fg)]/20 ${mode === INTERACTION_MODES.touch ? 'h-3 w-2/3' : 'h-2 w-1/2'}`} />
        <i className={`block rounded bg-[var(--settings-fg)]/10 ${mode === INTERACTION_MODES.touch ? 'h-8' : 'h-5'}`} />
        <i className={`block rounded bg-[var(--settings-fg)]/10 ${mode === INTERACTION_MODES.touch ? 'h-8' : 'h-3'}`} />
      </span>
    </div>
  );
}

/** posv2 AppearanceSettings — otomatik saat dilimi dahil */
export default function AppearanceSettings() {
  const [preference, setPreference] = useState(getThemePreference);
  const [resolved, setResolved] = useState(getTheme);
  const [scheduleTick, setScheduleTick] = useState(0);
  const [sidebarPosition, setSidebarPosition] = useState(getSidebarPosition);
  const [interactionMode, setInteractionMode] = useState(getInteractionMode);

  useEffect(() => {
    const onChange = (e) => {
      setPreference(e.detail.preference ?? getThemePreference());
      setResolved(e.detail.theme ?? getTheme());
    };
    window.addEventListener('wpos:theme-change', onChange);
    return () => window.removeEventListener('wpos:theme-change', onChange);
  }, []);

  useEffect(() => {
    if (preference !== THEMES.auto) return undefined;
    const id = setInterval(() => setScheduleTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [preference]);

  const schedule = useMemo(() => {
    if (preference !== THEMES.auto) return null;
    return getAutoScheduleInfo();
  }, [preference, scheduleTick, resolved]);

  const select = (next) => {
    applyThemePreference(next);
    setPreference(next);
    setResolved(getTheme());
  };

  return (
    <div className="space-y-6">
      <SettingsGroup title="Çalışma modu" description="Kullandığınız ekrana uygun kontrol boyutlarını seçin">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {INTERACTION_OPTIONS.map(({ id, title, subtitle }) => {
            const selected = interactionMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setInteractionMode(applyInteractionMode(id))}
                className={`relative rounded-lg border p-3 text-left transition-all touch-manipulation ${
                  selected
                    ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_6%,var(--settings-card-bg))] ring-2 ring-[var(--app-accent)]/20'
                    : 'border-[var(--settings-border)] hover:bg-[var(--settings-row-hover)]'
                }`}
              >
                {selected && <span className="absolute right-2 top-2"><CheckBadge /></span>}
                <InteractionPreview mode={id} />
                <div className="mt-3">
                  <div className="text-sm font-semibold text-[var(--settings-fg)]">{title}</div>
                  <div className="mt-0.5 text-xs text-[var(--settings-subtle)]">{subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Tema modu" description="Uygulamanın renk görünümünü seçin">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {OPTIONS.map(({ id, title, subtitle, variant }) => {
            const selected = preference === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => select(id)}
                className={`relative rounded-lg border p-3 text-left transition-all touch-manipulation ${
                  selected
                    ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_6%,var(--settings-card-bg))] ring-2 ring-[var(--app-accent)]/20'
                    : 'border-[var(--settings-border)] hover:bg-[var(--settings-row-hover)]'
                }`}
              >
                {selected && (
                  <div className="absolute right-2 top-2">
                    <CheckBadge />
                  </div>
                )}
                <ThemePreview variant={variant} />
                <div className="mt-3">
                  <div className="text-sm font-semibold text-[var(--settings-fg)]">{title}</div>
                  <div className="mt-0.5 text-xs text-[var(--settings-subtle)]">{subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Sidebar konumu" description="Ana navigasyonun ekrandaki yerini seçin">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {SIDEBAR_OPTIONS.map(({ id, title }) => {
            const selected = sidebarPosition === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSidebarPosition(applySidebarPosition(id))}
                className={`relative rounded-lg border p-3 text-left transition-all touch-manipulation ${
                  selected
                    ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_6%,var(--settings-card-bg))] ring-2 ring-[var(--app-accent)]/20'
                    : 'border-[var(--settings-border)] hover:bg-[var(--settings-row-hover)]'
                }`}
              >
                {selected && <span className="absolute right-2 top-2"><CheckBadge /></span>}
                <SidebarPreview position={id} />
                <span className="mt-3 block text-sm font-semibold text-[var(--settings-fg)]">{title}</span>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      {preference === THEMES.auto && schedule && (
        <SettingsGroup title="Otomatik mod">
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-row-title">Şu anki tema</span>
              <span className="settings-row-desc">
                {schedule.isDaytime ? 'Açık mod aktif' : 'Koyu mod aktif'}
              </span>
            </div>
            <span className="settings-badge settings-badge-success">
              {schedule.isDaytime ? 'Açık' : 'Koyu'}
            </span>
          </div>
          <div className="settings-row settings-row-border">
            <div className="settings-row-label">
              <span className="settings-row-title">Açık mod saatleri</span>
              <span className="settings-row-desc">Her gün tekrarlanır</span>
            </div>
            <span className="text-sm font-medium text-[var(--settings-fg)]">
              {schedule.lightStartLabel} – {schedule.lightEndLabel}
            </span>
          </div>
          <div className="settings-row settings-row-border">
            <div className="settings-row-label">
              <span className="settings-row-title">Sonraki geçiş</span>
            </div>
            <span className="text-sm text-[var(--settings-muted)]">
              {schedule.nextMode === 'light' ? 'Açık mod' : 'Koyu mod'}
              {' · '}
              {schedule.nextLabel}
            </span>
          </div>
        </SettingsGroup>
      )}
    </div>
  );
}
