import { useMemo, useState } from 'react';
import { computeBillSplit, formatSplitPlanLines, formatTry } from '../../../lib/splitBill';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function SplitBillModal({ remainingTotal, onClose, onConfirm }) {
  const [personCount, setPersonCount] = useState(2);

  const preview = useMemo(() => {
    if (remainingTotal <= 0) return null;
    return computeBillSplit(remainingTotal, personCount);
  }, [remainingTotal, personCount]);

  const adjustCount = (delta) => {
    setPersonCount((prev) => Math.max(2, Math.min(99, prev + delta)));
  };

  const planLines = useMemo(() => {
    if (!preview) return [];
    return formatSplitPlanLines(preview.shares);
  }, [preview]);

  const handleConfirm = () => {
    if (!preview) return;
    onConfirm(preview);
    onClose();
  };

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-md" zIndex="z-[60]">
      <SaleModalHeader
        title="Hesabı böl"
        subtitle={`Kalan tutar: ${formatTry(remainingTotal)} ₺`}
        onClose={onClose}
        icon={(
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      />
      <SaleModalBody>
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm text-slate-400">Kaç kişi ödeyecek?</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => adjustCount(-1)}
                disabled={personCount <= 2}
                className={`${saleBtn.qty} h-11 w-11 text-lg`}
                aria-label="Azalt"
              >
                −
              </button>
              <span className="split-bill-count">{personCount}</span>
              <button
                type="button"
                onClick={() => adjustCount(1)}
                disabled={personCount >= 99}
                className={`${saleBtn.qty} h-11 w-11 text-lg`}
                aria-label="Artır"
              >
                +
              </button>
            </div>
          </div>

          {preview && (
            <div className="split-bill-preview">
              <p className="split-bill-preview-label">Ödeme planı</p>
              <p className="split-bill-preview-summary">
                {planLines.join(', ')}
                .
              </p>
              <div className="split-bill-preview-total">
                <span className="split-bill-preview-total-label">Toplam</span>
                <span className="split-bill-preview-total-amount">
                  {formatTry(preview.shares.reduce((a, b) => a + b, 0))}
                  {' '}
                  ₺
                </span>
              </div>
            </div>
          )}
        </div>
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>
          İptal
        </button>
        <button type="button" onClick={handleConfirm} disabled={!preview} className={saleBtn.primary}>
          Planı uygula
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
