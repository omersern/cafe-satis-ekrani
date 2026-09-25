import { useEffect, useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function AddCustomerModal({
  onClose,
  additionId,
  onCustomerAdded,
  initialSearchTerm,
  onError,
  onSuccess,
}) {
  const [formData, setFormData] = useState({ name: '', surname: '', phone_number: '', email_address: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialSearchTerm) return;
    const trimmed = initialSearchTerm.trim();
    if (/^\d{10}$/.test(trimmed.replace(/\D/g, ''))) {
      setFormData((prev) => ({
        ...prev,
        phone_number: prev.phone_number || trimmed.replace(/\D/g, '').slice(0, 10),
      }));
      return;
    }
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || parts[0],
        surname: prev.surname || parts.slice(1).join(' '),
      }));
    } else if (parts.length === 1) {
      setFormData((prev) => ({ ...prev, name: prev.name || parts[0] }));
    }
  }, [initialSearchTerm]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.surname.trim()) {
      onError?.('Ad ve soyad zorunludur.');
      return;
    }
    setLoading(true);
    try {
      const response = await saleApi('/app/customer/add', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          phone_number: formData.phone_number.trim() || undefined,
          email_address: formData.email_address.trim() || undefined,
        }),
      });
      await saleApi('/app/addition/customer/add', {
        method: 'POST',
        body: JSON.stringify({ addition_id: additionId, customer_id: response.id }),
      });
      onSuccess?.('Müşteri eklendi ve adisyona dahil edildi.');
      onCustomerAdded();
      onClose();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-lg">
      <SaleModalHeader title="Yeni müşteri" subtitle="Müşteri bilgilerini girin" onClose={onClose} />
      <SaleModalBody className="space-y-4">
        {['name', 'surname'].map((field) => (
          <div key={field}>
            <label className="text-sm font-medium text-slate-400">
              {field === 'name' ? 'Ad *' : 'Soyad *'}
            </label>
            <input
              type="text"
              value={formData[field]}
              onChange={(e) => setFormData((p) => ({ ...p, [field]: e.target.value }))}
              className={`${saleBtn.input} mt-2`}
            />
          </div>
        ))}
        <div>
          <label className="text-sm font-medium text-slate-400">Telefon</label>
          <input
            type="text"
            maxLength={10}
            placeholder="5xxxxxxxxx"
            value={formData.phone_number}
            onChange={(e) => setFormData((p) => ({ ...p, phone_number: e.target.value.replace(/\D/g, '') }))}
            className={`${saleBtn.input} mt-2`}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-400">E-posta</label>
          <input
            type="email"
            value={formData.email_address}
            onChange={(e) => setFormData((p) => ({ ...p, email_address: e.target.value }))}
            className={`${saleBtn.input} mt-2`}
          />
        </div>
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>İptal</button>
        <button type="button" onClick={handleSubmit} disabled={loading} className={saleBtn.primary}>
          {loading ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}

function customerLabel(customer) {
  if (customer.type == 2) return customer.company_name;
  return `${customer.name} ${customer.surname}`;
}

export { customerLabel };
