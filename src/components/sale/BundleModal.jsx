import { useEffect, useMemo, useState } from 'react';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from './ui/SaleModal';
import SaleSubmitButton from './ui/SaleSubmitButton';

function isTruthyFlag(value) {
  return value === 1 || value === true || value === '1';
}

export default function BundleModal({
  product,
  onClose,
  onSubmit,
  bundleGroups,
  bundleOptions,
  bundleFixedItems = [],
  allProducts,
}) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});

  const handleClose = isSubmitting ? undefined : onClose;

  const productGroups = useMemo(
    () => bundleGroups
      .filter((g) => Number(g.product_id) === Number(product.id))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [bundleGroups, product.id],
  );

  const productFixedItems = useMemo(
    () => bundleFixedItems
      .filter((f) => Number(f.product_id) === Number(product.id))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [bundleFixedItems, product.id],
  );

  useEffect(() => {
    const initial = {};
    productGroups.forEach((group) => {
      const options = bundleOptions.filter((o) => Number(o.group_id) === Number(group.id));
      if (isTruthyFlag(group.is_multiple)) {
        initial[group.id] = [];
      } else if (options.length === 1 && isTruthyFlag(group.is_required)) {
        initial[group.id] = options[0].product_id;
      }
    });
    setSelectedOptions(initial);
  }, [productGroups, bundleOptions]);

  const bundlePrice = parseFloat(product.sell_price) || 0;

  const normalTotal = useMemo(() => {
    let sum = productFixedItems.reduce((acc, item) => {
      const price = parseFloat(item.product_price ?? allProducts.find((p) => p.id == item.included_product_id)?.sell_price ?? 0);
      return acc + (Number.isFinite(price) ? price : 0);
    }, 0);

    productGroups.forEach((group) => {
      const selected = selectedOptions[group.id];
      if (!selected) return;
      const ids = Array.isArray(selected) ? selected : [selected];
      ids.forEach((productId) => {
        const option = bundleOptions.find(
          (o) => Number(o.group_id) === Number(group.id) && Number(o.product_id) === Number(productId),
        );
        const price = parseFloat(option?.product_price ?? allProducts.find((p) => p.id == productId)?.sell_price ?? 0);
        sum += Number.isFinite(price) ? price : 0;
      });
    });

    return sum;
  }, [productFixedItems, productGroups, selectedOptions, bundleOptions, allProducts]);

  const savings = Math.max(0, normalTotal - bundlePrice);

  const handleOptionSelect = (groupId, productId, isMultiple) => {
    setSelectedOptions((prev) => {
      if (isMultiple) {
        const current = prev[groupId] || [];
        const updated = current.some((id) => Number(id) === Number(productId))
          ? current.filter((id) => Number(id) !== Number(productId))
          : [...current, productId];
        return { ...prev, [groupId]: updated.length > 0 ? updated : undefined };
      }
      if (Number(prev[groupId]) === Number(productId)) {
        return { ...prev, [groupId]: undefined };
      }
      return { ...prev, [groupId]: productId };
    });
  };

  const buildBundleData = () => {
    const bundleData = productFixedItems.map((item) => ({
      group_id: null,
      group_name: 'Dahil',
      product_id: item.included_product_id,
      product_name: item.product_name || allProducts.find((p) => p.id == item.included_product_id)?.name || '',
      is_fixed: true,
    }));

    productGroups.forEach((group) => {
      const selected = selectedOptions[group.id];
      if (!selected) return;
      const ids = Array.isArray(selected) ? selected : [selected];
      ids.forEach((productId) => {
        const option = bundleOptions.find(
          (o) => Number(o.group_id) === Number(group.id) && Number(o.product_id) === Number(productId),
        );
        const catalogProduct = allProducts.find((p) => p.id == productId);
        bundleData.push({
          group_id: group.id,
          group_name: group.name,
          product_id: productId,
          product_name: option?.product_name || catalogProduct?.name || '',
        });
      });
    });

    return bundleData;
  };

  const handleSubmit = async () => {
    const missingRequired = productGroups.filter((group) => {
      if (!isTruthyFlag(group.is_required)) return false;
      const selected = selectedOptions[group.id];
      if (isTruthyFlag(group.is_multiple)) {
        return !selected || !selected.length;
      }
      return !selected;
    });

    if (missingRequired.length > 0) {
      setValidationError('Lütfen zorunlu menü seçimlerini yapın.');
      return;
    }

    if (productGroups.length === 0 && productFixedItems.length === 0) {
      setValidationError('Bu menü için içerik tanımlanmamış.');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);
    try {
      await onSubmit(product.id, quantity, {}, bundlePrice, note, buildBundleData());
    } catch {
      // hata üst bileşende gösterilir
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = productGroups.length > 0 || productFixedItems.length > 0;

  return (
    <SaleModalOverlay onClose={handleClose} className="max-w-lg">
      <SaleModalHeader title={product.name} subtitle="Menü seçimlerini yapın" onClose={handleClose} />
      <SaleModalBody className="space-y-4">
        {validationError && (
          <p className="rounded-2xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-500/20">{validationError}</p>
        )}

        {!hasContent ? (
          <p className="text-center text-sm text-slate-400">Bu menü için içerik tanımlanmamış.</p>
        ) : (
          <>
            {productFixedItems.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold text-white">Menüye dahil</h4>
                <div className="flex flex-wrap gap-2">
                  {productFixedItems.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-lg border border-slate-600 bg-slate-700/80 px-3 py-2 text-sm text-slate-200"
                    >
                      {item.product_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {productGroups.map((group) => {
              const options = bundleOptions
                .filter((o) => Number(o.group_id) === Number(group.id))
                .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
              const isMultiple = isTruthyFlag(group.is_multiple);
              const isRequired = isTruthyFlag(group.is_required);

              return (
                <div key={group.id}>
                  <h4 className="mb-3 font-semibold text-white">
                    {group.name}
                    {isRequired && <span className="ml-1 text-rose-400">*</span>}
                    {isMultiple && (
                      <span className="ml-2 text-xs text-blue-400">(çoklu seçim)</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map((option) => {
                      const selected = selectedOptions[group.id];
                      const isSelected = isMultiple
                        ? (selected || []).some((id) => Number(id) === Number(option.product_id))
                        : Number(selected) === Number(option.product_id);
                      const price = parseFloat(option.product_price ?? 0);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleOptionSelect(group.id, option.product_id, isMultiple)}
                          className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-600 text-white'
                              : 'border-slate-600 bg-slate-700 text-slate-200 hover:border-slate-500'
                          }`}
                        >
                          <span>{option.product_name}</span>
                          {price > 0 && (
                            <div className="mt-0.5 text-xs opacity-75">{price.toFixed(2)} ₺</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div className="border-t border-slate-700 pt-4">
          <h4 className="mb-2 text-center font-semibold text-white">Miktar</h4>
          <div className="flex items-center justify-center gap-4">
            <button type="button" disabled={isSubmitting} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className={saleBtn.qty}>-</button>
            <span className="w-14 text-center font-mono text-3xl text-white">{quantity}</span>
            <button type="button" disabled={isSubmitting} onClick={() => setQuantity((q) => q + 1)} className={saleBtn.qty}>+</button>
          </div>
        </div>

        <textarea
          value={note}
          disabled={isSubmitting}
          onChange={(e) => setNote(e.target.value.slice(0, 100))}
          placeholder="Sipariş notu (opsiyonel)"
          className={`${saleBtn.input} resize-none`}
          rows={2}
          maxLength={100}
        />

        <div className="rounded-lg bg-slate-700 p-3 text-center space-y-1">
          {normalTotal > 0 && normalTotal !== bundlePrice && (
            <div className="text-xs text-slate-400 line-through">{normalTotal.toFixed(2)} ₺</div>
          )}
          {savings > 0 && (
            <div className="text-xs text-emerald-400">{savings.toFixed(2)} ₺ tasarruf</div>
          )}
          <div className="text-xs text-slate-400">Menü fiyatı</div>
          <div className="text-xl font-bold text-white">{(bundlePrice * quantity).toFixed(2)} ₺</div>
        </div>
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" disabled={isSubmitting} onClick={onClose} className={saleBtn.ghost}>İptal</button>
        <SaleSubmitButton loading={isSubmitting} onClick={handleSubmit} className={saleBtn.primary} disabled={!hasContent}>
          Adisyona ekle
        </SaleSubmitButton>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
