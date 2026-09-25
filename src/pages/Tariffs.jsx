import { useCallback, useEffect, useState } from 'react';
import MetroShell from '../components/metro/MetroShell';
import { listTariffs, money } from '../lib/api';

const SERVICE_LABELS = {
  pc: 'PC / İnternet',
  playstation: 'PlayStation',
  bilardo: 'Bilardo',
  vr: 'VR',
  masatenisi: 'Masa Tenisi',
};

const SERVICE_ORDER = ['pc', 'playstation', 'bilardo', 'vr', 'masatenisi', 'general'];

function groupTariffs(rows) {
  const groups = new Map();
  for (const tariff of rows) {
    const key = tariff.serviceType || 'general';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: key === 'general' ? 'Genel / Tüm servisler' : SERVICE_LABELS[key] || key,
        rows: [],
      });
    }
    groups.get(key).rows.push(tariff);
  }
  return Array.from(groups.values()).sort((a, b) => {
    const aIndex = SERVICE_ORDER.indexOf(a.key);
    const bIndex = SERVICE_ORDER.indexOf(b.key);
    return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex)
      || a.label.localeCompare(b.label, 'tr');
  });
}

/**
 * Salt okunur tarife listesi.
 * Tanım / düzenleme yalnızca POSM-Web → Kafe → Tarifeler.
 * Program açılışında Splash bootstrap ile buluttan iner.
 */
export default function Tariffs() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const tariffGroups = groupTariffs(rows);

  const refresh = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const res = await listTariffs();
      setRows(res?.data || []);
    } catch (err) {
      console.error(err);
      setError('Tarifeler yüklenemedi. İnternet / eşleştirme durumunu kontrol edin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <MetroShell title="Tarifeler" subtitle="Fiyatlandırma ve dönem tarifeleri">
      <div className="win11-metro-inner space-y-4">
        {error && <div className="cafe-banner">{error}</div>}

        <div className="win11-metro-card flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm opacity-80">
            Tarifeler bu ekrandan yalnızca görüntülenebilir, düzenlemek için yönetim arayüzünü kullanmalısınız.
          </p>
          <button type="button" className="cafe-btn cafe-btn-ghost" onClick={refresh}>
            Yenile
          </button>
        </div>

        {loading && <p className="text-sm opacity-70">Yükleniyor…</p>}

        {!loading && rows.length === 0 && (
          <p className="win11-metro-card p-6 text-center text-sm opacity-70">
            Henüz tarife yok. POSM&apos;den tarife ekleyip programı yeniden başlatın veya
            Splash senkronunu bekleyin.
          </p>
        )}

        <div className="space-y-7">
          {tariffGroups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold">{group.label}</h2>
                <span className="cafe-badge cafe-badge-offline">{group.rows.length} tarife</span>
                <div className="h-px flex-1 bg-[var(--win11-metro-border)]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.rows.map((t) => (
                  <article key={t.id} className="win11-metro-card p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold">{t.name}</h3>
                      {t.isDefault && <span className="cafe-badge cafe-badge-online">Varsayılan</span>}
                    </div>
                    <p className="text-2xl font-semibold tracking-tight">{money(t.hourlyRate)}</p>
                    <p className="win11-metro-subtitle mt-1">/saat</p>
                    <ul className="mt-2 space-y-0.5 text-xs opacity-80">
                      <li>Açılış: {money(t.openingFee || 0)}</li>
                      <li>Ücretsiz: {t.freeMinutes || 0} dk</li>
                      {t.schedules?.length > 0 && <li>+{t.schedules.length} dönem fiyatı</li>}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </MetroShell>
  );
}
