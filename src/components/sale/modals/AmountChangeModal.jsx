import { useCallback, useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import Keypad from '../Keypad';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function AmountChangeModal({
  product, additionId, onClose, onUpdated, onError,
}) {
  const [newAmount, setNewAmount] = useState(String(product.amount));
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseInt(newAmount, 10);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const unchanged = isValid && parsedAmount === product.amount;
  const canSubmit = !loading && isValid && !unchanged;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const amount = parseInt(newAmount, 10);
    setLoading(true);
    try {
      if (amount <= 0) {
        await saleApi('/app/addition/product/remove', {
          method: 'POST',
          body: JSON.stringify({ addition_id: additionId, product_id: product.id }),
        });
      } else {
        await saleApi('/app/addition/product/change', {
          method: 'POST',
          body: JSON.stringify({
            type: 'amount',
            addition_id: additionId,
            product_id: product.id,
            amount,
          }),
        });
      }
      onUpdated(additionId);
      onClose();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  }, [additionId, canSubmit, newAmount, onClose, onError, onUpdated, product.id]);

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-sm" zIndex="z-[55]">
      <SaleModalHeader title="Adet değiştir" subtitle={product.name} onClose={onClose} />
      <SaleModalBody>
        <div className="mb-4 rounded-lg p-3 text-center font-mono text-3xl tracking-wider text-[var(--sale-fg)]">
          {isValid ? parsedAmount : '—'}
        </div>
        <Keypad
          value={newAmount}
          onValueChange={setNewAmount}
          integerOnly
          disabled={loading}
          onEnter={handleSubmit}
        />
        {isValid && parsedAmount === 0 && (
          <p className="mt-3 text-center text-xs text-[var(--sale-fg-muted)]">
            0 girilirse ürün adisyondan kaldırılır.
          </p>
        )}
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>Vazgeç</button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={saleBtn.primary}
        >
          {loading ? 'Kaydediliyor…' : 'Adeti değiştir'}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
