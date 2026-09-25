import { useCallback, useState } from 'react';
import { apiJson } from '../../../lib/api';
import { saleApi } from '../../../lib/saleApi';
import Keypad from '../Keypad';
import { SaleModalOverlay } from '../ui/SaleModal';

export default function EditAdditionModal({ onClose, onSelectAddition, onError, onConfirm }) {
  const [additionId, setAdditionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleKeypadChange = useCallback((value) => {
    const normalized = value === '0' ? '' : value.replace(/^0+(?=\d)/, '');
    setAdditionId(normalized);
    setError('');
  }, []);

  const proceedReopen = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const reopenResponse = await saleApi('/app/addition/reopen', {
        method: 'POST',
        body: JSON.stringify({ addition_id: parseInt(id, 10) }),
      });
      if (!reopenResponse.status) {
        setError(reopenResponse.message || 'Adisyon yeniden açılamadı.');
        return;
      }
      await window.env.addKey('addition_id', parseInt(id, 10));
      await window.env.addKey('is_edit_mode', true);
      onSelectAddition(parseInt(id, 10), true);
      onClose();
    } catch (err) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, [onClose, onSelectAddition]);

  const handleSearch = useCallback(async () => {
    if (!additionId) {
      setError('Adisyon numarası girin.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { data: detailResponse } = await apiJson('/app/addition/detail', {
        method: 'POST',
        body: JSON.stringify({ addition_id: parseInt(additionId, 10), include_closed: true }),
        freshToken: true,
      });

      if (!detailResponse?.status) {
        setError('Bu numarada adisyon bulunamadı.');
        return;
      }

      if (!detailResponse.data?.is_closed) {
        setError('Adisyon zaten açık. Yalnızca kapalı adisyonlar düzenlenir.');
        return;
      }

      onConfirm?.({
        title: 'Kapalı adisyon',
        message: `#${additionId} yeniden açılsın mı? Düzenleme modunda devam edeceksiniz.`,
        tone: 'primary',
        confirmLabel: 'Yeniden aç',
        onConfirm: () => proceedReopen(additionId),
      });
    } catch {
      setError('İşlem başarısız. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [additionId, onConfirm, proceedReopen]);

  const canSubmit = !isLoading && Boolean(additionId);
  const displayValue = additionId || '—';

  return (
    <SaleModalOverlay
      onClose={isLoading ? undefined : onClose}
      className="be-edit-addition-overlay max-w-none"
      zIndex="z-[55]"
    >
      <div className="compact-session-modal be-edit-addition-modal">
        <div className="compact-modal-head">
          <div>
            <h2>Adisyon düzenle</h2>
            <p>Kapalı adisyon numarasını girin</p>
          </div>
          <button type="button" onClick={onClose} disabled={isLoading} aria-label="Kapat">×</button>
        </div>

        <div className="compact-modal-body">
          <div className="be-edit-addition-note">
            <span className="be-edit-addition-note-icon" aria-hidden>✎</span>
            <p>
              Yalnızca <strong>kapalı</strong> adisyonlar düzenlenebilir. Yeniden açıldığında ürün ekleyip
              çıkarabilir, ardından tekrar kapatabilirsiniz.
            </p>
          </div>

          <div className="be-edit-addition-display" aria-live="polite">
            <span className="be-edit-addition-label">Adisyon no</span>
            <span className={`be-edit-addition-value${additionId ? '' : ' is-empty'}`}>
              {additionId ? `#${displayValue}` : displayValue}
            </span>
          </div>

          {!error && !additionId && (
            <p className="be-edit-addition-hint">Numarayı tuş takımından girin · Enter ile devam</p>
          )}

          {error ? (
            <p className="compact-error" role="alert">{error}</p>
          ) : null}

          <div className="be-keypad">
            <Keypad
              value={additionId || '0'}
              onValueChange={handleKeypadChange}
              integerOnly
              disabled={isLoading}
              onEnter={canSubmit ? handleSearch : undefined}
              fluid
            />
          </div>
        </div>

        <div className="compact-modal-footer be-edit-addition-footer">
          <button type="button" onClick={onClose} disabled={isLoading} className="be-button secondary">
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={!canSubmit}
            className="be-button primary"
          >
            {isLoading ? 'Kontrol ediliyor…' : 'Devam et'}
          </button>
        </div>
      </div>
    </SaleModalOverlay>
  );
}
