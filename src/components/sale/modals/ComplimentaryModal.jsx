import { useEffect, useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

async function readComplimentaryTypes() {
  const raw = await window.env.getKey('complimentaryTypes');
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

export default function ComplimentaryModal({
  selectedProducts,
  paymentProducts,
  amount,
  onClose,
  onConfirm,
}) {
  const [complimentaryTypes, setComplimentaryTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    readComplimentaryTypes()
      .then((types) => {
        setComplimentaryTypes(types);
        if (types.length > 0) setSelectedType(String(types[0].id));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleConfirm = async () => {
    setError('');
    if (!selectedType) {
      setError('Lütfen ikram tipini seçin.');
      return;
    }
    if (!note.trim()) {
      setError('Lütfen ikram notunu girin.');
      return;
    }
    try {
      setIsSubmitting(true);
      await onConfirm({ type_id: selectedType, note: note.trim() });
    } catch (err) {
      setError(err?.message || 'İkram işlemi tamamlanamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SaleModalOverlay onClose={onClose} className="max-w-md" zIndex="z-[70]">
        <SaleModalBody className="flex flex-col items-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
          <p className="mt-3 text-sm text-slate-500">İkram tipleri yükleniyor…</p>
        </SaleModalBody>
      </SaleModalOverlay>
    );
  }

  return (
    <SaleModalOverlay onClose={isSubmitting ? undefined : onClose} className="max-w-lg" zIndex="z-[70]">
      <SaleModalHeader title="İkram detayları" subtitle="Tip ve not belirtin" onClose={isSubmitting ? undefined : onClose} />
      <SaleModalBody className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950 px-4 py-3 text-sm font-medium text-rose-100">
            {error}
          </div>
        )}
        <div className="rounded-2xl bg-orange-500/10 p-4 text-center ring-1 ring-orange-500/20">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-300/80">İkram tutarı</p>
          <p className="mt-1 text-2xl font-bold text-orange-300">
            {parseFloat(amount).toFixed(2)}
            {' '}
            ₺
          </p>
        </div>

        {selectedProducts?.length > 0 && (
          <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Seçili ürünler</p>
            <div className="space-y-1">
              {selectedProducts.map((selProd) => {
                const product = paymentProducts.find((p) => p.id === selProd.id);
                if (!product) return null;
                return (
                  <div key={selProd.id} className="flex justify-between text-sm">
                    <span className="text-slate-300">
                      {product.name}
                      {' '}
                      x
                      {selProd.amount}
                    </span>
                    <span className="font-semibold text-white">
                      {(parseFloat(product.product_price) * selProd.amount).toFixed(2)}
                      {' '}
                      ₺
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-400">İkram tipi *</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`${saleBtn.input} mt-2`}
          >
            <option value="" disabled>İkram tipini seçin…</option>
            {complimentaryTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          {selectedType && (
            <p className="mt-1.5 text-xs text-slate-500">
              {complimentaryTypes.find((t) => String(t.id) === String(selectedType))?.description}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-400">İkram notu *</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="İkram nedenini açıklayın…"
            rows={3}
            maxLength={500}
            className={`${saleBtn.input} mt-2 resize-none`}
          />
          <p className="mt-1 text-right text-xs text-slate-600">{note.length}/500</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          Bu ürün ikram olarak işaretlenecektir. Müşteri hesabına kaydetmek için müşteri seç akışını kullanın.
        </div>
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} disabled={isSubmitting} className={saleBtn.ghost}>İptal</button>
        <button type="button" onClick={handleConfirm} disabled={isSubmitting} className={saleBtn.orange}>
          {isSubmitting ? 'İşleniyor…' : 'İkram et'}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
