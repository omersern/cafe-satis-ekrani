import { useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function CreateNewAdditionModal({ onClose, onAdditionCreated, onError }) {
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await saleApi('/app/addition/createOther', { method: 'GET' });
      await window.env.addKey('addition_id', response.data.addition_id);
      onAdditionCreated(response.data.addition_id);
      onClose();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-sm">
      <SaleModalBody>
        <p className="text-sm leading-relaxed text-slate-400">
          Bu işlem yeni bir boş adisyon oluşturacak ve sizi o adisyona alacaktır.
        </p>
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>İptal</button>
        <button type="button" onClick={handleCreate} disabled={loading} className={saleBtn.success}>
          {loading ? 'Oluşturuluyor…' : 'Oluştur'}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
