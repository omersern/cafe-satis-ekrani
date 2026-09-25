import { buildBundleDisplay, splitProductNoteLines } from '../../lib/additionFormat';
import { saleBtn } from './ui/SaleModal';

function parseBundleData(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function getBundleDisplay(product) {
  const bundleData = parseBundleData(product.bundle_data);
  if (bundleData?.length) return buildBundleDisplay(bundleData);
  return product.bundle_display || null;
}

export default function CartItem({ product, variantGroups, variants, onAmountChange, onAmountClick, onRemove, onPriceChange, locked = false }) {
  const getProductVariantDisplay = () => {
    if (
      !product.selected_variants
      || Object.keys(product.selected_variants).length === 0
      || !variantGroups?.length
      || !variants?.length
    ) return null;

    const variantTexts = [];
    Object.entries(product.selected_variants).forEach(([groupId, variantIds]) => {
      const group = variantGroups.find((vg) => vg.id == groupId);
      if (!group) return;
      if (Array.isArray(variantIds)) {
        const names = variantIds.map((id) => variants.find((v) => v.id == id)?.name || '').filter(Boolean).join(' ');
        if (names) variantTexts.push(`${group.name}: ${names}`);
      } else {
        const variant = variants.find((v) => v.id == variantIds);
        if (variant) variantTexts.push(`${group.name}: ${variant.name}`);
      }
    });
    return variantTexts.length > 0 ? variantTexts.join(', ') : null;
  };

  const variantDisplay = getProductVariantDisplay();
  const bundleDisplay = getBundleDisplay(product);

  return (
    <div className="sale-win11-cart-item flex items-center" data-id={product.id}>
      <div className="flex-1 min-w-0">
        <p className="min-w-0 truncate font-semibold text-[var(--sale-fg)]">{product.name}</p>
        {variantDisplay && <p className="mt-1 text-xs text-[var(--sale-fg-muted)]">{variantDisplay}</p>}
        {bundleDisplay && <p className="mt-1 text-xs text-amber-400/90">{bundleDisplay}</p>}
        {product.note && (
          <div className="mt-1 flex flex-col gap-0.5">
            {splitProductNoteLines(product.note).map((line, index) => (
              <span key={`${index}-${line}`} className="block text-xs leading-snug text-[var(--sale-fg-subtle)]">
                {line}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={locked}
          className="mt-0.5 w-fit font-bold text-[var(--app-accent)] enabled:cursor-pointer enabled:hover:opacity-80"
          onClick={() => onPriceChange?.(product)}
        >
          {parseFloat(product.product_price).toFixed(2)}
          {' '}
          ₺
        </button>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {locked ? (
          <span className="text-xs font-medium text-[var(--sale-fg-subtle)]">Süre ürünü</span>
        ) : (
          <>
        <button
          type="button"
          onClick={() => onAmountChange(product.id, product.amount - 1)}
          className={saleBtn.qty}
        >
          -
        </button>
        <button
          type="button"
          onClick={() => onAmountClick?.(product)}
          className="min-w-[2rem] px-1 text-center font-semibold text-[var(--sale-fg)] transition-colors hover:text-[var(--app-accent)]"
          title="Adeti değiştir"
        >
          {product.amount}
        </button>
        <button
          type="button"
          onClick={() => onAmountChange(product.id, product.amount + 1)}
          className={saleBtn.qty}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="sale-win11-icon-btn sale-win11-icon-btn-danger ml-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
          </>
        )}
      </div>
    </div>
  );
}
