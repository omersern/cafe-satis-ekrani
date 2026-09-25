import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';
import { buildBundleDisplay, buildVariantDisplay } from '../../../lib/additionFormat';

function tableLabel(category, name) {
  if (!name) return '—';
  return category ? `${category} / ${name}` : name;
}

function eventTime(item) {
  if (item.date || item.time) return [item.date, item.time].filter(Boolean).join(' ');
  if (!item.occurred_at) return '';
  const date = new Date(item.occurred_at);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('tr-TR');
}

const labels = {
  created: 'Adisyon açıldı',
  product_sale: 'Ürün satışı',
  product_add: 'Ürün eklendi',
  product_remove: 'Ürün silindi',
  product_qty_change: 'Ürün adedi değişti',
  product_price_change: 'Ürün fiyatı değişti',
  payment: 'Ödeme alındı',
  payment_add: 'Ödeme alındı',
  payment_delete: 'Ödeme silindi',
  discount_apply: 'Genel iskonto uygulandı',
  discount_clear: 'Genel iskonto kaldırıldı',
  settings_change: 'Adisyon ayarları değiştirildi',
  print: 'Fiş yazdırıldı',
  table_transfer: 'Masaya taşındı',
  cancel: 'Adisyon iptal edildi',
  reopen: 'Adisyon yeniden açıldı',
  restore: 'Adisyon geri yüklendi',
};

function money(value) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function bundleDisplay(value) {
  if (Array.isArray(value)) return buildBundleDisplay(value);
  try { return buildBundleDisplay(JSON.parse(value || '[]')); } catch { return null; }
}

function eventDetail(item, variantGroups, variants) {
  const detail = item.details && typeof item.details === 'object' ? item.details : item;
  if (item.action === 'table_transfer') {
    return `${tableLabel(detail.from_table_category, detail.from_table_name)} → ${tableLabel(detail.to_table_category, detail.to_table_name)}`;
  }
  if (item.action === 'product_qty_change') return `${detail.product_name || 'Ürün'}: ${detail.old_amount} → ${detail.new_amount}`;
  if (item.action === 'product_price_change') return `${detail.product_name || 'Ürün'}: ${money(detail.old_price)} → ${money(detail.new_price)}`;
  if (['product_add', 'product_remove', 'product_sale'].includes(item.action)) {
    return `${detail.product_name || 'Ürün'} · ${detail.amount || 1} adet${detail.price != null ? ` · ${money(detail.price)}` : ''}`;
  }
  if (['payment', 'payment_add', 'payment_delete'].includes(item.action)) {
    return `${detail.payment_method_name || 'Ödeme'} · ${money(detail.amount)}`;
  }
  if (item.action === 'discount_apply') return `${detail.discount_type === 'percent' ? `%${detail.discount_value}` : money(detail.discount_value)} · ${money(detail.discount_amount)} indirim`;
  if (item.action === 'settings_change' && detail.field === 'name') return `${detail.old_name || 'Adsız'} → ${detail.new_name || 'Adsız'}`;
  if (item.action === 'settings_change' && detail.field === 'customer_add') return 'Müşteri eklendi';
  if (item.action === 'settings_change' && detail.field === 'customer_remove') return 'Müşteri kaldırıldı';
  if (item.action === 'print' && detail.total != null) return `${detail.product_count || 0} ürün · ${money(detail.total)}`;
  return null;
}

export default function OperationHistoryModal({ history = [], variantGroups = [], variants = [], onClose }) {
  return (
    <SaleModalOverlay onClose={onClose} className="max-w-lg">
      <SaleModalHeader
        title="İşlem geçmişi"
        subtitle={`${history.length} işlem`}
        onClose={onClose}
      />
      <SaleModalBody>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--sale-fg-subtle)]">
            Bu adisyonda kayıtlı işlem bulunmuyor.
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <div key={`${item.occurred_at || item.date || ''}-${index}`} className="rounded-xl border border-[var(--sale-border)] bg-[var(--sale-surface)] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--app-accent)]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--sale-fg)]">{labels[item.action] || item.label || item.action || 'İşlem'}</p>
                    {eventDetail(item, variantGroups, variants) && <p className="mt-1 text-sm text-[var(--sale-fg-muted)]">{eventDetail(item, variantGroups, variants)}</p>}
                    {['product_add', 'product_remove', 'product_sale'].includes(item.action) && (() => {
                      const detail = item.details && typeof item.details === 'object' ? item.details : item;
                      const variantText = buildVariantDisplay(detail.variants || detail.selected_variants, variantGroups, variants);
                      const bundleText = bundleDisplay(detail.bundle_data);
                      return (variantText || bundleText || detail.note) ? (
                        <div className="mt-2 space-y-1 text-xs text-[var(--sale-fg-subtle)]">
                          {variantText && <p>{variantText}</p>}
                          {bundleText && <p>{bundleText}</p>}
                          {detail.note && <p className="italic">Not: {detail.note}</p>}
                        </div>
                      ) : null;
                    })()}
                    {eventTime(item) && (
                      <p className="mt-1 text-xs text-[var(--sale-fg-subtle)]">
                        {[eventTime(item), item.user_display].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.primary}>Kapat</button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
