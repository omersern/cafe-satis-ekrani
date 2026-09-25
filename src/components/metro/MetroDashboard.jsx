import HourlyChart from './HourlyChart';

function StatTile({ label, value, sub, accent = 'blue' }) {
  return (
    <div className={`win11-metro-stat win11-metro-stat-${accent}`}>
      <p className="win11-metro-stat-label">{label}</p>
      <p className="win11-metro-stat-value">{value}</p>
      {sub && <p className="win11-metro-stat-sub">{sub}</p>}
    </div>
  );
}

export default function MetroDashboard({ data, loading, error }) {
  const sales = data?.sales || {};
  const lowStocks = data?.lowStocks || [];
  const day = data?.day;
  const hourlyTrend = data?.hourlyTrend || Array.from(
    { length: 24 },
    (_, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, amount: 0, sales: 0 })
  );

  return (
    <main className="win11-metro-inner">
      <div className="win11-metro-stats">
        <StatTile
          label="Günlük Ciro"
          value={loading ? '…' : sales.ciro || '₺0,00'}
          sub={sales.ciroHedefUp ? 'Hedef geçildi' : null}
          accent="blue"
        />
        <StatTile
          label="Toplam Satış"
          value={loading ? '…' : sales.totalSales || '₺0,00'}
          sub={`${sales.totalPayments || '₺0,00'} ödeme`}
          accent="purple"
        />
        <StatTile
          label="Mutfak"
          value={loading ? '…' : String(data?.kitchenPendingCount || 0)}
          sub="bekleyen sipariş"
          accent="orange"
        />
        <StatTile
          label="Düşük Stok"
          value={loading ? '…' : String(lowStocks.length)}
          sub="ürün uyarıda"
          accent="red"
        />
      </div>

      {!loading && !day && (
        <div className="win11-metro-banner win11-metro-banner-warn">
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p>
            Gün başlatılmadı. Satış ekranı ve client oturumları kapalı — önce Gün işlemlerinden
            günü başlatın.
          </p>
        </div>
      )}

      {error && (
        <div className="win11-metro-banner win11-metro-banner-warn mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="win11-metro-grid cafe-metro-grid-single">
        <div className="win11-metro-primary">
          <section className="win11-metro-card win11-metro-card-chart">
            <div className="win11-metro-card-header">
              <div><h2 className="win11-metro-card-title">Saatlik satış</h2><p className="win11-metro-card-description">Gün içindeki satış hareketi</p></div>
            </div>
            <div className="win11-metro-card-body pb-4 pt-2">
              {loading ? (
                <div className="flex h-28 items-center justify-center">
                  <div className="win11-metro-loading-ring win11-metro-loading-ring-sm" />
                </div>
              ) : (
                <HourlyChart data={hourlyTrend} />
              )}
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}
