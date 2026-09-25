import CartItem from './CartItem';
import { saleApi } from '../../lib/saleApi';
import { saleBtn } from './ui/SaleModal';

export default function Cart({
  cart,
  tableInfo,
  cartTotals,
  variantGroups,
  variants,
  isEditMode,
  isPaymentLoading = false,
  onItemAmountChange,
  onRemoveItem,
  onCancelAddition,
  deletionBlocked = false,
  onExitEditMode,
  onPriceChangeClick,
  onAmountClick,
  onCustomerClick,
  onSettingsClick,
  onDiscountClick,
  onPaymentClick,
  onKitchenSend,
  onTransferToTable,
  onOperationHistoryClick,
  canTransferToTable = false,
  showSessionButton = false,
  sessionActive = false,
  onSessionClick,
  onPrintSuccess,
  onPrintError,
}) {
  const handlePrint = async () => {
    if (!cart?.addition?.id) return;
    try {
      await saleApi('/app/addition/print', {
        method: 'POST',
        body: JSON.stringify({ addition_id: cart.addition.id }),
        skipLoading: true,
      });
      onPrintSuccess?.('Yazdırma emri gönderildi.');
    } catch (error) {
      onPrintError?.(error.message || 'Yazdırma emri gönderilemedi.');
    }
  };

  const displayAdditionId = cart?.addition?.id ?? null;
  const tableLabel = tableInfo
    ? `${tableInfo.category} · ${tableInfo.name}`
    : null;

  return (
    <aside className="sale-win11-cart flex w-full shrink-0 flex-col lg:w-[22rem]">
      <header className="sale-win11-cart-header">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              {cart ? (
                <>
                  {tableLabel ? (
                    <p
                      className="sale-win11-cart-title truncate leading-snug"
                      title={tableLabel}
                    >
                      <span className="font-medium text-[var(--sale-fg-muted)]">{tableInfo.category}</span>
                      <span className="text-[var(--sale-fg-muted)]"> · </span>
                      <span>{tableInfo.name}</span>
                    </p>
                  ) : cart.addition.name ? (
                    <p className="sale-win11-cart-title truncate leading-snug" title={cart.addition.name}>
                      {cart.addition.name}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs font-semibold tabular-nums text-[var(--sale-fg-muted)]">
                    #{displayAdditionId}
                  </p>
                </>
              ) : (
                <h2 className="sale-win11-cart-title">Adisyon oluşturulmadı</h2>
              )}
            </div>
            {isEditMode && (
              <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                DÜZENLEME
              </span>
            )}
          </div>
          {cart && !tableInfo && (
            <button
              type="button"
              onClick={onCustomerClick}
              className="mt-1 cursor-pointer text-sm font-semibold text-blue-400 hover:underline"
            >
              Müşteri Seç
            </button>
          )}
        </div>
        {cart && (
          <div className="flex items-center">
            {!isEditMode && (
              <>
                {showSessionButton && onSessionClick && (
                  <button
                    type="button"
                    onClick={onSessionClick}
                    className="sale-win11-icon-btn mr-2"
                    title={sessionActive ? 'Oturum işlemleri' : 'Oturum aç'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                      {sessionActive ? <circle cx="12" cy="10" r="2" fill="currentColor" stroke="none" /> : null}
                    </svg>
                  </button>
                )}
                {canTransferToTable && onTransferToTable && (
                  <button
                    type="button"
                    onClick={onTransferToTable}
                    className="sale-win11-icon-btn mr-2"
                    title="Masaya taşı"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                )}
                {onOperationHistoryClick && (
                  <button
                    type="button"
                    onClick={onOperationHistoryClick}
                    className="sale-win11-icon-btn mr-2"
                    title="İşlem geçmişi"
                    aria-label="İşlem geçmişi"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <path d="M3 3v5h5M12 7v5l3 2" />
                    </svg>
                  </button>
                )}
                <button type="button" onClick={handlePrint} className="sale-win11-icon-btn mr-2" title="Yazdır">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
                </button>
                {onDiscountClick && (
                  <button
                    type="button"
                    onClick={onDiscountClick}
                    className="sale-win11-icon-btn mr-2"
                    title="İndirim yap"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="19" x2="5" y1="5" y2="19" />
                      <circle cx="6.5" cy="6.5" r="2.5" />
                      <circle cx="17.5" cy="17.5" r="2.5" />
                    </svg>
                  </button>
                )}
                <button type="button" onClick={onSettingsClick} className="sale-win11-icon-btn" title="Adisyon Ayarları">
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={3} /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                </button>
              </>
            )}
            {isEditMode && (
              <button type="button" onClick={onExitEditMode} className="sale-win11-icon-btn ml-2" title="Düzenlemeyi Bırak (Eski Haline Getir)">
                <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              </button>
            )}
            <button type="button" onClick={onCancelAddition} disabled={deletionBlocked} className="sale-win11-icon-btn sale-win11-icon-btn-danger ml-2 disabled:cursor-not-allowed disabled:opacity-35" title={deletionBlocked ? 'Önce açık oturumu kapatın' : (isEditMode ? 'Adisyonu İptal Et' : 'Adisyonu Sil')}>
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        )}
      </header>

      <div id="cart" className="sale-win11-cart-body flex-1 space-y-3 overflow-y-auto">
        {cart && cart.products.length > 0 ? (
          cart.products.map((product) => (
            <CartItem
              key={product.id}
              product={product}
              variantGroups={variantGroups}
              variants={variants}
              onAmountChange={onItemAmountChange}
              onAmountClick={onAmountClick}
              onRemove={onRemoveItem}
              onPriceChange={onPriceChangeClick}
              locked={Boolean(cart.timer) && Number(product.id) === Number(cart.timer.timeLineId)}
            />
          ))
        ) : (
          <p className="py-10 text-center text-slate-500">
            {cart ? 'Adisyonda ürün bulunmuyor.' : 'Başlamak için bir ürün seçin'}
          </p>
        )}
      </div>

      {cart && (
        <footer className="sale-win11-cart-footer space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Ara toplam</span>
              <span className="font-medium text-white">
                {cartTotals.subtotal.toFixed(2).replace('.', ',')}
                {' '}
                ₺
              </span>
            </div>
            {Math.abs(cartTotals.roundingDifference) >= 0.01 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">
                  Yuvarlama ({cartTotals.unroundedSubtotal.toFixed(2).replace('.', ',')} → {cartTotals.subtotal.toFixed(2).replace('.', ',')})
                </span>
                <span className="shrink-0 font-medium text-white">
                  {cartTotals.roundingDifference > 0 ? '+' : ''}{cartTotals.roundingDifference.toFixed(2).replace('.', ',')} ₺
                </span>
              </div>
            )}
            {cartTotals.discount > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">İskonto</span>
                <span className="font-medium text-green-500">
                  -{cartTotals.discount.toFixed(2).replace('.', ',')}
                  {' '}
                  ₺
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Tahsil edilen</span>
              <span className="font-medium text-white">
                {cartTotals.paid.toFixed(2).replace('.', ',')}
                {' '}
                ₺
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-[var(--sale-border)] pt-2 text-lg font-bold">
              <span className="text-white">Kalan</span>
              <span className="text-white">
                {cartTotals.remaining.toFixed(2).replace('.', ',')}
                {' '}
                ₺
              </span>
            </div>
          </div>
          {tableInfo && onKitchenSend && (
            <button
              type="button"
              onClick={onKitchenSend}
              className="sale-win11-btn-kitchen w-full py-3 font-bold"
            >
              Mutfağa Gönder
            </button>
          )}
          <button
            type="button"
            onClick={onPaymentClick}
            disabled={isPaymentLoading}
            className={`w-full py-3 font-bold ${saleBtn.primary}`}
          >
            {isPaymentLoading ? 'Ödeme alınıyor…' : (cartTotals.remaining <= 0 ? 'Ödemeleri Yönet' : 'Ödeme Al')}
          </button>
        </footer>
      )}
    </aside>
  );
}
