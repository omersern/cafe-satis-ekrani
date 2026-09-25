import { useEffect, useState } from 'react';
import { saleBtn } from './ui/SaleModal';

export default function PaymentProductItem({ item, onSelect, onQuantityChange, isSelected, disabled = false }) {
  const [quantity, setQuantity] = useState(1);
  const maxQty = item.amount;

  useEffect(() => {
    onQuantityChange(item.id, quantity);
  }, [quantity, item.id, onQuantityChange]);

  return (
    <div className="flex min-h-[64px] items-center justify-between border-b border-white/[0.06] py-3 last:border-0">
      <div className="flex flex-1 items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={disabled}
          onChange={(e) => onSelect(item.id, e.target.checked, quantity)}
          className={saleBtn.check}
        />
        <div>
          <p className="text-base font-medium text-white">{item.name}</p>
          {item.variant_display && <p className="text-sm text-slate-500">{item.variant_display}</p>}
          <p className="text-sm text-slate-600">Kalan: {maxQty}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isSelected && maxQty > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" disabled={disabled} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className={saleBtn.qty}>-</button>
            <span className="w-8 text-center text-base font-semibold">{quantity}</span>
            <button type="button" disabled={disabled} onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} className={saleBtn.qty}>+</button>
          </div>
        )}
        <p className="ml-2 min-w-[4.5rem] text-right text-base font-semibold tabular-nums text-white">
          {parseFloat(item.product_price * maxQty).toFixed(2)} ₺
        </p>
      </div>
    </div>
  );
}
