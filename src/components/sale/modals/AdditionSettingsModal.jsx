import { useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function AdditionSettingsModal({
  addition, onClose, onUpdated, onError,
}) {
  const [additionName, setAdditionName] = useState(addition?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!addition?.id) return;
    setLoading(true);
    try {
      await saleApi('/app/addition/change/name', {
        method: 'POST',
        body: JSON.stringify({ addition_id: addition.id, name: additionName }),
      });
      onUpdated(addition.id);
      onClose();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-md">
      <SaleModalHeader title="Adisyon ayarları" subtitle="Adisyonu isimlendirin" onClose={onClose} />
      <SaleModalBody>
        <label className="text-sm font-medium text-slate-400">Adisyon adı (maks. 25 karakter)</label>
        <input
          type="text"
          value={additionName}
          onChange={(e) => setAdditionName(e.target.value)}
          maxLength={25}
          placeholder="Örn: Ahmet Bey'in siparişi"
          className={`${saleBtn.input} mt-2`}
        />
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>İptal</button>
        <button type="button" onClick={handleSave} disabled={loading} className={saleBtn.primary}>
          {loading ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
