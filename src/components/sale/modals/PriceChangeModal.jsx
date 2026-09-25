import { useCallback, useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import Keypad from '../Keypad';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function PriceChangeModal({
  product, additionId, onClose, onUpdated, onError,
}) {
  const [newPrice, setNewPrice] = useState(String(product.product_price));
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (loading || parseFloat(newPrice) < 0) return;
    setLoading(true);
    try {
      await saleApi('/app/addition/product/change', {
        method: 'POST',
        body: JSON.stringify({
          type: 'price',
          addition_id: additionId,
          product_id: product.id,
          price: newPrice,
        }),
      });
      onUpdated(additionId);
      onClose();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  }, [additionId, loading, newPrice, onClose, onError, onUpdated, product.id]);

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-sm" zIndex="z-[55]">
      <SaleModalHeader title="Fiyat değiştir" subtitle={product.name} onClose={onClose} />
      <SaleModalBody>
        <div className="mb-4 rounded-lg p-3 text-center font-mono text-3xl tracking-wider text-white">
          {parseFloat(newPrice || 0).toFixed(2).replace('.', ',')}
          <span className="ml-1 text-2xl">₺</span>
        </div>
        <Keypad
          value={newPrice}
          onValueChange={setNewPrice}
          disabled={loading}
          onEnter={handleSubmit}
        />
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>Vazgeç</button>
        <button type="button" onClick={handleSubmit} disabled={loading} className={saleBtn.primary}>
          {loading ? 'Kaydediliyor…' : 'Fiyatı değiştir'}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
