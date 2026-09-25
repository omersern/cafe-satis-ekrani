import { useEffect, useMemo, useState } from 'react';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from './ui/SaleModal';
import SaleSubmitButton from './ui/SaleSubmitButton';

function QuantityModal({ product, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = isSubmitting ? undefined : onClose;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(product.id, quantity, {}, parseFloat(product.sell_price), note);
    } catch {
      // hata üst bileşende gösterilir
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SaleModalOverlay onClose={handleClose} className="max-w-md">
      <SaleModalHeader title={product.name} subtitle="Eklenecek miktarı belirtin" onClose={handleClose} />
      <SaleModalBody>
        <div className="flex items-center justify-center gap-6">
          <button type="button" disabled={isSubmitting} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className={saleBtn.qty}>-</button>
          <span className="w-16 text-center font-mono text-5xl text-white">{quantity}</span>
          <button type="button" disabled={isSubmitting} onClick={() => setQuantity((q) => q + 1)} className={saleBtn.qty}>+</button>
        </div>
        <textarea
          value={note}
          disabled={isSubmitting}
          onChange={(e) => setNote(e.target.value.slice(0, 100))}
          placeholder="Sipariş notu (opsiyonel)"
          className={`${saleBtn.input} mt-4 resize-none`}
          rows={2}
          maxLength={100}
        />
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" disabled={isSubmitting} onClick={onClose} className={saleBtn.ghost}>İptal</button>
        <SaleSubmitButton loading={isSubmitting} onClick={handleSubmit} className={saleBtn.primary}>
          Adisyona ekle
        </SaleSubmitButton>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}

export default function VariantModal({ product, onClose, onSubmit, variantGroups, variants }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = isSubmitting ? undefined : onClose;

  const productVariantGroups = useMemo(
    () => variantGroups.filter((vg) => vg.product_id === product.id),
    [variantGroups, product.id],
  );

  useEffect(() => {
    const initial = {};
    productVariantGroups.forEach((group) => {
      if (group.is_multiple) initial[group.id] = [];
    });
    setSelectedVariants(initial);
  }, [productVariantGroups]);

  const calculatePrice = () => {
    let price = parseFloat(product.sell_price);
    Object.entries(selectedVariants).forEach(([groupId, variantIds]) => {
      if (Array.isArray(variantIds)) {
        variantIds.forEach((variantId) => {
          const variant = variants.find((v) => v.id === variantId);
          if (variant) price += parseFloat(variant.price_modifier);
        });
      } else if (variantIds) {
        const variant = variants.find((v) => v.id === variantIds);
        if (variant) price += parseFloat(variant.price_modifier);
      }
    });
    return price;
  };

  const handleVariantSelect = (groupId, variantId, isMultiple) => {
    setSelectedVariants((prev) => {
      if (isMultiple) {
        const current = prev[groupId] || [];
        const updated = current.includes(variantId)
          ? current.filter((id) => id !== variantId)
          : [...current, variantId];
        return { ...prev, [groupId]: updated.length > 0 ? updated : undefined };
      }
      if (prev[groupId] === variantId) {
        return { ...prev, [groupId]: undefined };
      }
      return { ...prev, [groupId]: variantId };
    });
  };

  const handleSubmit = async () => {
    const missingRequired = productVariantGroups.filter(
      (group) => group.is_required && !selectedVariants[group.id],
    );
    if (missingRequired.length > 0) {
      setValidationError('Lütfen tüm zorunlu seçenekleri belirtin.');
      return;
    }
    setValidationError('');
    setIsSubmitting(true);
    try {
      await onSubmit(product.id, quantity, selectedVariants, calculatePrice(), note);
    } catch {
      // hata üst bileşende gösterilir
    } finally {
      setIsSubmitting(false);
    }
  };

  if (productVariantGroups.length === 0) {
    return (
      <QuantityModal
        product={product}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <SaleModalOverlay onClose={handleClose} className="max-w-lg">
      <SaleModalHeader title={product.name} subtitle="Seçenekleri belirtin" onClose={handleClose} />
      <SaleModalBody className="space-y-4">
        {validationError && (
          <p className="rounded-2xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-500/20">{validationError}</p>
        )}
        {productVariantGroups.sort((a, b) => a.sort_order - b.sort_order).map((group) => {
          const groupVariants = variants.filter((v) => v.group_id === group.id).sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={group.id}>
              <h4 className="mb-3 font-semibold text-white">
                {group.name}
                {group.is_required == 1 && <span className="ml-1 text-rose-400">*</span>}
                {group.is_multiple == 1 && (
                  <span className="ml-2 text-xs text-blue-400">(çoklu seçim)</span>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {groupVariants.map((variant) => {
                  const isSelected = group.is_multiple
                    ? (selectedVariants[group.id] || []).includes(variant.id)
                    : selectedVariants[group.id] === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleVariantSelect(group.id, variant.id, group.is_multiple)}
                      className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                        isSelected
                          ? saleBtn.choice(true)
                          : saleBtn.choice(false)
                      }`}
                    >
                      <span>{variant.name}</span>
                      {parseFloat(variant.price_modifier) !== 0 && (
                        <div className="mt-0.5 text-xs opacity-75">
                          {parseFloat(variant.price_modifier) > 0 ? '+' : ''}
                          {parseFloat(variant.price_modifier).toFixed(2)} ₺
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="border-t border-slate-700 pt-4">
          <h4 className="mb-2 text-center font-semibold text-white">Miktar</h4>
          <div className="flex items-center justify-center gap-4">
            <button type="button" disabled={isSubmitting} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-xl font-bold text-white transition-colors hover:bg-slate-600">-</button>
            <span className="w-14 text-center font-mono text-3xl text-white">{quantity}</span>
            <button type="button" disabled={isSubmitting} onClick={() => setQuantity((q) => q + 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-xl font-bold text-white transition-colors hover:bg-slate-600">+</button>
          </div>
        </div>
        <textarea value={note} disabled={isSubmitting} onChange={(e) => setNote(e.target.value.slice(0, 100))} placeholder="Ürün için not ekleyin... (opsiyonel)" className={`${saleBtn.input} resize-none`} rows={2} maxLength={100} />
        <div className="rounded-lg bg-slate-700 p-3 text-center">
          <div className="text-xs text-slate-400">Toplam Fiyat</div>
          <div className="text-xl font-bold text-white">{(calculatePrice() * quantity).toFixed(2)} ₺</div>
        </div>
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" disabled={isSubmitting} onClick={onClose} className={saleBtn.ghost}>İptal</button>
        <SaleSubmitButton loading={isSubmitting} onClick={handleSubmit} className={saleBtn.primary}>
          Adisyona ekle
        </SaleSubmitButton>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
