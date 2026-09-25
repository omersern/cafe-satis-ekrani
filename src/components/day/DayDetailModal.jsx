import { DayModalBody, DayModalHeader, DayModalOverlay } from './DayModalShell';

function formatPrice(price) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(Number(price) || 0);
}

function paymentRatio(methods, name, ciro) {
  const amount = methods?.find((p) => p.name === name)?.total_amount || 0;
  const base = parseFloat(ciro) || 1;
  return ((amount / base) * 100).toFixed(0);
}

/** posv2 DayDetailModal — birebir */
export default function DayDetailModal({ day, onClose }) {
  if (!day) return null;

  return (
    <DayModalOverlay onClose={onClose} className="max-w-4xl">
      <DayModalHeader
        title={day.date}
        subtitle="Gün detayı"
        accent="blue"
        onClose={onClose}
        icon={(
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
      />
      <DayModalBody>
        <div className="day-win11-stat-grid">
          <div className="day-win11-stat-card">
            <div className="day-win11-stat-value day-win11-stat-value-success">
              {day.total_daily_sales}
            </div>
            <div className="day-win11-stat-label">Satış tutarı</div>
          </div>
          <div className="day-win11-stat-card">
            <div className="day-win11-stat-value day-win11-stat-value-accent">
              {paymentRatio(day.payment_methods, 'POS', day.ciro)}%
            </div>
            <div className="day-win11-stat-label">POS oranı</div>
          </div>
          <div className="day-win11-stat-card">
            <div className="day-win11-stat-value day-win11-stat-value-accent">
              {paymentRatio(day.payment_methods, 'Nakit', day.ciro)}%
            </div>
            <div className="day-win11-stat-label">Nakit oranı</div>
          </div>
          <div className="day-win11-stat-card">
            <div className="day-win11-stat-value day-win11-stat-value-accent">
              {paymentRatio(day.payment_methods, 'İkram', day.ciro)}%
            </div>
            <div className="day-win11-stat-label">İkram oranı</div>
          </div>
          <div className="day-win11-stat-card">
            <div className="day-win11-stat-value day-win11-stat-value-purple">
              {day.total_items_sold > 0
                ? formatPrice(parseFloat(day.ciro) / day.total_items_sold)
                : formatPrice(0)}
            </div>
            <div className="day-win11-stat-label">Ort. satış</div>
          </div>
        </div>

        <div className="day-win11-detail-grid">
          <section className="day-win11-panel">
            <div className="day-win11-panel-header">
              <h4 className="day-win11-panel-title">Mali özet</h4>
            </div>
            <div className="day-win11-panel-body day-win11-panel-scroll">
              <div className="day-win11-summary-block day-win11-summary-block-system">
                <div className="day-win11-summary-block-title">Sistem</div>
                <div className="day-win11-summary-rows">
                  {day.payment_methods?.map((odeme) => (
                    <div key={odeme.name} className="day-win11-summary-row">
                      <span>{odeme.friendly_name}</span>
                      <span>{odeme.system_formatted}</span>
                    </div>
                  ))}
                  <div className="day-win11-summary-row day-win11-summary-row-total">
                    <span>Toplam</span>
                    <span>{day.system_total}</span>
                  </div>
                </div>
              </div>

              {day.has_manual_entries && (
                <div className="day-win11-summary-block day-win11-summary-block-user">
                  <div className="day-win11-summary-block-title">Kullanıcı</div>
                  <div className="day-win11-summary-rows">
                    {day.payment_methods?.map((odeme) => (
                      <div key={`user-${odeme.name}`} className="day-win11-summary-row">
                        <span className="inline-flex items-center gap-1.5">
                          {odeme.friendly_name}
                          {odeme.is_manual && <span className="day-win11-dot" />}
                        </span>
                        <span>{odeme.formatted_amount}</span>
                      </div>
                    ))}
                    <div className="day-win11-summary-row day-win11-summary-row-total">
                      <span>Toplam</span>
                      <span>{day.total_payments}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="day-win11-summary-block day-win11-summary-block-neutral">
                <div className="day-win11-summary-row">
                  <span>Kasada olan para</span>
                  <span>{formatPrice(day.cash_on_hand || 0)}</span>
                </div>
                <div className="day-win11-summary-row">
                  <span>Kasadan alınan para</span>
                  <span>{formatPrice(day.cash_withdrawn || 0)}</span>
                </div>
                <div className="day-win11-summary-row">
                  <span>Kasada kalan para</span>
                  <span>{formatPrice(day.cash_money || 0)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="day-win11-panel">
            <div className="day-win11-panel-header">
              <h4 className="day-win11-panel-title">En çok satılan 5 ürün</h4>
            </div>
            <div className="day-win11-panel-body">
              {day.top_5_products?.map((urun, index) => (
                <div key={`${urun.product_name}-${index}`} className="day-win11-top-product">
                  <span className="day-win11-top-rank">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="day-win11-top-name">{urun.product_name}</p>
                    <p className="day-win11-top-sales">{urun.total_sales}</p>
                  </div>
                  <span className="day-win11-top-qty">{urun.amount} adet</span>
                </div>
              ))}
              {(!day.top_5_products || day.top_5_products.length === 0) && (
                <p className="day-win11-empty">Satış verisi bulunamadı</p>
              )}
            </div>
          </section>
        </div>

        <div className="day-win11-notes-grid">
          <div className="day-win11-note-card">
            <h5 className="day-win11-note-title">Başlangıç notu</h5>
            <p className="day-win11-note-text">{day.start_note || 'Not girilmemiş'}</p>
          </div>
          <div className="day-win11-note-card">
            <h5 className="day-win11-note-title">Bitiş notu</h5>
            <p className="day-win11-note-text">{day.end_note || 'Not girilmemiş'}</p>
          </div>
        </div>

        <div className="day-win11-meta-grid">
          <div>
            <div className="day-win11-meta-value">{day.start_user_name || '—'}</div>
            <div className="day-win11-meta-label">Başlatan</div>
          </div>
          <div>
            <div className="day-win11-meta-value">{day.start_date || '—'}</div>
            <div className="day-win11-meta-label">Başlangıç</div>
          </div>
          <div>
            <div className="day-win11-meta-value">{day.end_date || '—'}</div>
            <div className="day-win11-meta-label">Bitiş</div>
          </div>
          <div>
            <div className="day-win11-meta-value">{day.end_user_name || '—'}</div>
            <div className="day-win11-meta-label">Bitiren</div>
          </div>
        </div>
      </DayModalBody>
    </DayModalOverlay>
  );
}
