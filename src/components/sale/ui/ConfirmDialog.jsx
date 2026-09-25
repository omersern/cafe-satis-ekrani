import { useEffect } from 'react';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from './SaleModal';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Evet',
  cancelLabel = 'İptal',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const confirm = (event) => {
      if (event.key !== 'Enter' || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onConfirm?.();
      onCancel?.();
    };
    window.addEventListener('keydown', confirm);
    return () => window.removeEventListener('keydown', confirm);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const confirmClass = tone === 'primary' ? saleBtn.primary : saleBtn.danger;

  return (
    <SaleModalOverlay onClose={onCancel} className="max-w-sm" zIndex="z-[60]">
      <SaleModalHeader title={title} onClose={onCancel} />
      <SaleModalBody>
        <p className="text-sm leading-relaxed text-slate-400">{message}</p>
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onCancel} className={saleBtn.ghost}>{cancelLabel}</button>
        <button
          type="button"
          onClick={() => { onConfirm(); onCancel(); }}
          className={confirmClass}
        >
          {confirmLabel}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
