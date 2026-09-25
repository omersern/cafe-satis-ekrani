import { useCallback, useEffect, useMemo, useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import {
  computeCartTotals,
  computeMaxDiscountAmount,
  formatDiscountLabel,
  getMaxAdditionDiscountPercent,
  validateDiscountInput,
} from '../../../lib/additionDiscount';
import Keypad from '../Keypad';
import { SaleModalOverlay } from '../ui/SaleModal';

function formatMoney(value) {
  return parseFloat(value || 0).toFixed(2).replace('.', ',');
}

export default function DiscountModal({
  addition,
  products,
  onClose,
  onUpdated,
  onError,
}) {
  const initialType = addition?.discount_type === 'amount' ? 'amount' : 'percent';
  const initialValue = addition?.discount_value
    ? String(addition.discount_value).replace('.', ',')
    : '';

  const [discountType, setDiscountType] = useState(initialType);
  const [value, setValue] = useState(initialValue);
  const [maxPercent, setMaxPercent] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getMaxAdditionDiscountPercent({ fresh: true }).then((max) => {
      if (active) setMaxPercent(max);
    });
    return () => { active = false; };
  }, []);

  const subtotal = useMemo(
    () => computeCartTotals({ products, addition, payments: [] }).subtotal,
    [products, addition],
  );

  const maxDiscountAmount = useMemo(
    () => computeMaxDiscountAmount(subtotal, maxPercent),
    [subtotal, maxPercent],
  );

  const preview = useMemo(() => {
    const normalized = value.replace(',', '.');
    const validation = validateDiscountInput(subtotal, discountType, normalized, maxPercent);
    if (!validation.ok) {
      return { ok: false, message: validation.message, discountAmount: 0, total: subtotal };
    }
    return {
      ok: true,
      discountAmount: validation.discountAmount,
      total: Math.max(0, subtotal - validation.discountAmount),
    };
  }, [value, discountType, subtotal, maxPercent]);

  const hasExistingDiscount = Boolean(addition?.discount_type && parseFloat(addition?.discount_amount) > 0);
  const displayValue = value || '0';
  const keypadValue = displayValue.replace(',', '.');
  const canSubmit = !loading && preview.ok && parseFloat(value.replace(',', '.')) > 0;

  const handleSubmit = useCallback(async () => {
    const normalized = value.replace(',', '.');
    const validation = validateDiscountInput(subtotal, discountType, normalized, maxPercent);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await saleApi('/app/addition/discount/apply', {
        method: 'POST',
        body: JSON.stringify({
          addition_id: addition.id,
          discount_type: discountType,
          discount_value: parseFloat(normalized),
        }),
      });
      onUpdated(addition.id);
      onClose();
    } catch (err) {
      onError?.(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [addition.id, discountType, maxPercent, onClose, onError, onUpdated, subtotal, value]);

  const handleClear = async () => {
    setLoading(true);
    setError('');
    try {
      await saleApi('/app/addition/discount/apply', {
        method: 'POST',
        body: JSON.stringify({
          addition_id: addition.id,
          discount_type: null,
          discount_value: 0,
        }),
      });
      onUpdated(addition.id);
      onClose();
    } catch (err) {
      onError?.(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SaleModalOverlay onClose={loading ? undefined : onClose} className="be-discount-overlay max-w-none" zIndex="z-[55]">
      <div className="compact-session-modal be-discount-modal">
        <div className="compact-modal-head">
          <div>
            <h2>İndirim yap</h2>
            <p>
              Ara toplam {formatMoney(subtotal)} ₺ · Maks. %{maxPercent}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Kapat">×</button>
        </div>

        <div className="compact-modal-body">
          <div className="compact-metrics be-discount-metrics">
            <div>
              <span>Ara toplam</span>
              <strong>{formatMoney(subtotal)} ₺</strong>
            </div>
            <div>
              <span>Yeni toplam</span>
              <strong className={preview.ok && parseFloat(value.replace(',', '.')) > 0 ? '' : 'be-discount-muted'}>
                {formatMoney(preview.total)} ₺
              </strong>
            </div>
          </div>

          {hasExistingDiscount && (
            <div className="be-discount-current">
              <span>Mevcut indirim</span>
              <strong>{formatDiscountLabel(addition)}</strong>
            </div>
          )}

          <fieldset className="compact-duration be-discount-type">
            <legend>İndirim türü</legend>
            <div>
              <button
                type="button"
                className={discountType === 'percent' ? 'is-active' : ''}
                aria-pressed={discountType === 'percent'}
                disabled={loading}
                onClick={() => { setDiscountType('percent'); setError(''); }}
              >
                Yüzde
              </button>
              <button
                type="button"
                className={discountType === 'amount' ? 'is-active' : ''}
                aria-pressed={discountType === 'amount'}
                disabled={loading}
                onClick={() => { setDiscountType('amount'); setError(''); }}
              >
                Tutar
              </button>
            </div>
          </fieldset>

          <div className="be-discount-value" aria-live="polite">
            <span className="be-discount-value-num">{displayValue.replace('.', ',')}</span>
            <span className="be-discount-value-unit">{discountType === 'percent' ? '%' : '₺'}</span>
          </div>

          <p className={`be-discount-preview ${preview.ok ? 'is-valid' : 'is-invalid'}`}>
            {preview.ok && parseFloat(value.replace(',', '.')) > 0 ? (
              <>
                <span>
                  İndirim:
                  {' '}
                  <strong>-{formatMoney(preview.discountAmount)} ₺</strong>
                </span>
                <span>
                  Limit:
                  {' '}
                  {formatMoney(maxDiscountAmount)} ₺
                </span>
              </>
            ) : (
              preview.message || `En fazla ${formatMoney(maxDiscountAmount)} ₺ indirim uygulanabilir.`
            )}
          </p>

          {error && (
            <p className="compact-error" role="alert">{error}</p>
          )}

          <div className="be-keypad">
            <Keypad
              value={keypadValue}
              onValueChange={(next) => {
                setValue(String(next).replace('.', ','));
                setError('');
              }}
              integerOnly={discountType === 'percent'}
              disabled={loading}
              onEnter={canSubmit ? handleSubmit : undefined}
              fluid
            />
          </div>
        </div>

        <div className="compact-modal-footer be-discount-footer">
          {hasExistingDiscount ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="be-button danger be-discount-clear"
            >
              Kaldır
            </button>
          ) : (
            <span className="be-discount-footer-spacer" aria-hidden />
          )}
          <div className="be-discount-footer-actions">
            <button type="button" onClick={onClose} disabled={loading} className="be-button secondary">
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="be-button primary"
            >
              {loading ? 'Kaydediliyor…' : 'Uygula'}
            </button>
          </div>
        </div>
      </div>
    </SaleModalOverlay>
  );
}
