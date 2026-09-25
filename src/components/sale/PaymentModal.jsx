import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saleApi } from '../../lib/saleApi';
import { openCashDrawer } from '../../lib/api';
import { recomputePaidFromPayments } from '../../lib/splitBill';
import { loadSplitBillPlan, removeSplitBillPlan, saveSplitBillPlan } from '../../lib/splitBillStore';
import ActorBadge from './ActorBadge';
import ComplimentaryModal from './modals/ComplimentaryModal';
import SplitBillModal from './modals/SplitBillModal';
import Keypad from './Keypad';
import PaymentProductItem from './PaymentProductItem';
import SplitBillSticky from './SplitBillSticky';
import { SaleSpinner } from './SaleOverlayLoader';
import { saleBtn } from './ui/SaleModal';
import SaleToast from './ui/SaleToast';
import useEscapeClose from '../../hooks/useEscapeClose';

export default function PaymentModal({
  additionId,
  cartTotals,
  onClose,
  paymentMethods,
  onPaymentSuccess,
  onSuccess,
  onConfirm,
  onBusyChange,
}) {
  const [keypadValue, setKeypadValue] = useState('0');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentProducts, setPaymentProducts] = useState([]);
  const [additionPayments, setAdditionPayments] = useState([]);
  const [isLoadingPaymentData, setIsLoadingPaymentData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showComplimentaryModal, setShowComplimentaryModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitPlan, setSplitPlan] = useState(null);
  const [activeShareIndex, setActiveShareIndex] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const splitLoadedForRef = useRef(null);
  const modalRef = useRef(null);
  useEscapeClose(onClose, !isPaying && !isRefreshing);

  const showPaymentError = useCallback((message) => {
    setPaymentError(message || 'Bir hata oluştu');
  }, []);

  const clearPaymentError = useCallback(() => setPaymentError(''), []);

  const refreshPaymentData = useCallback(async (refreshing = false) => {
    if (!additionId) return [];

    if (refreshing) setIsRefreshing(true);
    else setIsLoadingPaymentData(true);

    try {
      const [productsResponse, paymentsResponse] = await Promise.all([
        saleApi('/app/addition/payments/products/get', {
          method: 'POST',
          body: JSON.stringify({ addition_id: additionId }),
          skipLoading: true,
        }),
        saleApi('/app/addition/payments/get', {
          method: 'POST',
          body: JSON.stringify({ addition_id: additionId }),
          skipLoading: true,
        }),
      ]);
      setPaymentProducts(productsResponse.data?.filtered?.filter((item) => item.amount > 0) || []);
      setAdditionPayments(paymentsResponse.data || []);
      return paymentsResponse.data || [];
    } catch (error) {
      setPaymentProducts([]);
      setAdditionPayments([]);
      showPaymentError(error.message);
      return [];
    } finally {
      setIsLoadingPaymentData(false);
      setIsRefreshing(false);
    }
  }, [additionId, showPaymentError]);

  useEffect(() => {
    onBusyChange?.(isPaying || isRefreshing);
  }, [isPaying, isRefreshing, onBusyChange]);

  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  useEffect(() => {
    refreshPaymentData(false);
  }, [additionId, refreshPaymentData]);

  useEffect(() => {
    splitLoadedForRef.current = null;
    setSplitPlan(null);
    setActiveShareIndex(null);
  }, [additionId]);

  useEffect(() => {
    if (!additionId || isLoadingPaymentData) return undefined;

    if (splitLoadedForRef.current === additionId) return undefined;
    splitLoadedForRef.current = additionId;

    let active = true;
    (async () => {
      const stored = await loadSplitBillPlan(additionId);
      if (!active || !stored) return;
      setSplitPlan({
        ...stored,
        paid: recomputePaidFromPayments(
          stored.shares,
          additionPayments,
          stored.baselinePaymentCount ?? 0,
        ),
      });
    })();

    return () => { active = false; };
  }, [additionId, isLoadingPaymentData, additionPayments]);

  useEffect(() => {
    if (!additionId || !splitPlan) return undefined;
    saveSplitBillPlan(additionId, splitPlan);
    return undefined;
  }, [additionId, splitPlan]);

  const dismissSplitPlan = useCallback(async () => {
    setSplitPlan(null);
    setActiveShareIndex(null);
    if (additionId) await removeSplitBillPlan(additionId);
  }, [additionId]);

  const resetPaymentForm = useCallback(() => {
    setSelectedProducts([]);
    setSelectedMethod('');
    setKeypadValue('0');
  }, []);

  const handleProductSelect = (productId, isChecked, amount = 1) => {
    setSelectedProducts((prev) => {
      if (isChecked) return [...prev.filter((p) => p.id !== productId), { id: productId, amount }];
      return prev.filter((p) => p.id !== productId);
    });
  };

  const handleProductQuantityChange = useCallback((productId, newAmount) => {
    setSelectedProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, amount: newAmount } : p)));
  }, []);

  const selectedTotal = useMemo(() => selectedProducts.reduce((total, selProd) => {
    const product = paymentProducts.find((p) => p.id === selProd.id);
    return product ? total + (parseFloat(product.product_price) * selProd.amount) : total;
  }, 0), [selectedProducts, paymentProducts]);

  useEffect(() => {
    setKeypadValue(selectedTotal > 0 ? selectedTotal.toFixed(2) : '0');
  }, [selectedTotal]);

  const complimentaryPaymentMethod = paymentMethods.find(
    (m) => m.friendly_name?.includes('İkram') || m.name?.includes('İkram'),
  );

  const visibleMethods = paymentMethods.filter((m) => m.id !== 4 || selectedProducts.length > 0);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Rakam/nokta/backspace Keypad içinde; Space yalnızca kalan tutarı doldurur.
  useEffect(() => {
    const handleSpaceRemaining = (event) => {
      if (event.code !== 'Space') return;
      if (selectedProducts.length > 0 || isLoadingPaymentData || isRefreshing || isPaying
        || showComplimentaryModal || showSplitModal) return;

      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (target?.isContentEditable || ['input', 'textarea', 'select', 'button'].includes(tag)) return;

      event.preventDefault();
      if (cartTotals?.remaining > 0) setKeypadValue(String(cartTotals.remaining));
    };
    document.addEventListener('keydown', handleSpaceRemaining);
    return () => document.removeEventListener('keydown', handleSpaceRemaining);
  }, [cartTotals?.remaining, isLoadingPaymentData, isPaying, isRefreshing, selectedProducts.length, showComplimentaryModal, showSplitModal]);

  const markShareAfterPayment = useCallback((amount) => {
    setSplitPlan((prev) => {
      if (!prev) return null;
      const newPaid = [...prev.paid];
      const idx = activeShareIndex ?? newPaid.findIndex(
        (isPaid, i) => !isPaid && Math.abs(amount - prev.shares[i]) < 0.011,
      );
      if (idx >= 0 && !newPaid[idx] && Math.abs(amount - prev.shares[idx]) < 0.011) {
        newPaid[idx] = true;
      }
      return { ...prev, paid: newPaid };
    });
    setActiveShareIndex(null);
  }, [activeShareIndex]);

  const processPaymentResponse = useCallback(async (response, paidAmount) => {
    if (selectedMethod == 2) {
      openCashDrawer().catch(console.error);
    }
    if (response.close === 1) {
      await onPaymentSuccess(true);
      return;
    }
    markShareAfterPayment(paidAmount);
    resetPaymentForm();
    await refreshPaymentData(true);
    await onPaymentSuccess(false);
  }, [selectedMethod, onPaymentSuccess, resetPaymentForm, refreshPaymentData, markShareAfterPayment]);

  const handlePay = async () => {
    const amount = parseFloat(keypadValue);
    if (!selectedMethod || amount <= 0) {
      showPaymentError('Lütfen bir ödeme yöntemi seçin ve geçerli bir tutar girin.');
      return;
    }

    if (complimentaryPaymentMethod && selectedMethod == complimentaryPaymentMethod.id) {
      if (selectedProducts.length > 0) {
        setShowComplimentaryModal(true);
        return;
      }
      showPaymentError('Tutar bazlı ikram ödemesi alamazsınız, ürün seçerek ilerleyin.');
      return;
    }

    setIsPaying(true);
    clearPaymentError();
    try {
      let response;
      let paidAmount = amount;
      if (selectedProducts.length > 0) {
        paidAmount = selectedTotal;
        response = await saleApi('/app/addition/payments/products/pay', {
          method: 'POST',
          body: JSON.stringify({ addition_id: additionId, payment_type: selectedMethod, selected_products: selectedProducts }),
          skipLoading: true,
        });
      } else {
        response = await saleApi('/app/addition/payments/add', {
          method: 'POST',
          body: JSON.stringify({ addition_id: additionId, payment_type: selectedMethod, amount }),
          skipLoading: true,
        });
      }
      await processPaymentResponse(response, paidAmount);
    } catch (error) {
      showPaymentError(error.message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleComplimentaryConfirm = async (complimentaryData) => {
    if (selectedProducts.length === 0) {
      throw new Error('İkram edilecek ürünleri seçmelisiniz.');
    }
    setIsPaying(true);
    clearPaymentError();
    try {
      const response = await saleApi('/app/addition/payments/complimentary/products', {
        method: 'POST',
        body: JSON.stringify({
          addition_id: additionId,
          selected_products: selectedProducts,
          complimentary_type_id: complimentaryData.type_id,
          complimentary_note: complimentaryData.note,
        }),
        skipLoading: true,
      });
      await processPaymentResponse(response, selectedTotal);
      setShowComplimentaryModal(false);
      onSuccess?.('Ödeme ikram olarak alındı.');
    } catch (error) {
      throw error;
    } finally {
      setIsPaying(false);
    }
  };

  const handleRemovePayment = (paymentId) => {
    onConfirm?.({
      title: 'Ödemeyi kaldır',
      message: 'Bu ödemeyi adisyondan kaldırmak istediğinize emin misiniz?',
      onConfirm: async () => {
        try {
          await saleApi('/app/addition/payments/delete', {
            method: 'POST',
            body: JSON.stringify({ payment_id: paymentId, addition_id: additionId }),
            skipLoading: true,
          });
          const payments = await refreshPaymentData(true);
          if (payments) {
            setSplitPlan((prev) => (
              prev
                ? { ...prev, paid: recomputePaidFromPayments(prev.shares, payments, prev.baselinePaymentCount) }
                : null
            ));
          }
          await onPaymentSuccess(false);
        } catch (error) {
          showPaymentError(error.message);
        }
      },
    });
  };

  const totalPaid = useMemo(
    () => additionPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0),
    [additionPayments],
  );

  const handleSplitConfirm = useCallback((preview) => {
    setSplitPlan({
      shares: preview.shares,
      personCount: preview.personCount,
      baseTotal: preview.total,
      baselinePaymentCount: additionPayments.length,
      paid: Array(preview.personCount).fill(false),
    });
    setActiveShareIndex(null);
  }, [additionPayments.length]);

  const handleSelectShare = useCallback((amount, index) => {
    setActiveShareIndex(index);
    setKeypadValue(amount.toFixed(2));
    setSelectedProducts([]);
  }, []);

  const isComplimentary = complimentaryPaymentMethod && selectedMethod == complimentaryPaymentMethod.id;
  const isOverlayActive = isLoadingPaymentData || isRefreshing || isPaying;
  const overlayMessage = isPaying
    ? 'Ödeme işleniyor…'
    : (isRefreshing ? 'Güncelleniyor…' : 'Ödeme verileri yükleniyor…');

  return (
    <>
      {splitPlan && (
        <div className="theme-modal-shell pointer-events-none fixed inset-y-0 left-0 z-[65] hidden items-center p-5 sm:flex">
          <div className="pointer-events-auto">
            <SplitBillSticky
              plan={splitPlan}
              activeShareIndex={activeShareIndex}
              onSelectShare={handleSelectShare}
              onDismiss={dismissSplitPlan}
            />
          </div>
        </div>
      )}

      <div className="theme-modal-shell fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div ref={modalRef} tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl outline-none lg:flex-row">
          {isOverlayActive && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-[2px]">
              <SaleSpinner className="h-10 w-10 text-blue-400" />
              <p className="mt-3 text-sm font-medium text-white">{overlayMessage}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={isPaying || isRefreshing}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/50 text-2xl text-slate-400 transition-colors hover:bg-slate-600 disabled:opacity-40"
          >
            ×
          </button>

          {splitPlan && (
            <div className="border-b border-slate-700 bg-amber-50/5 p-3 sm:hidden">
              <SplitBillSticky
                plan={splitPlan}
                activeShareIndex={activeShareIndex}
                onSelectShare={handleSelectShare}
                onDismiss={dismissSplitPlan}
                compact
              />
            </div>
          )}

          <div className="flex w-full flex-col p-6 sm:p-8 lg:w-1/2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="text-2xl font-bold text-white">Ödeme Ekranı</h3>
              {cartTotals.remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSplitModal(true)}
                  disabled={isOverlayActive}
                  className={`${saleBtn.ghost} shrink-0 !min-h-[36px] gap-2 px-3 py-1.5 text-xs sm:text-sm`}
                  title="Hesabı böl"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Hesabı böl</span>
                </button>
              )}
            </div>
            <div className="mt-4 flex-1 overflow-y-auto pr-2">
              {paymentProducts.length > 0 ? paymentProducts.map((item) => (
                <PaymentProductItem
                  key={item.id}
                  item={item}
                  onSelect={handleProductSelect}
                  onQuantityChange={handleProductQuantityChange}
                  isSelected={selectedProducts.some((p) => p.id === item.id)}
                  disabled={isOverlayActive}
                />
              )) : (
                <p className="py-4 text-center text-slate-400">Ödenecek ürün bulunmuyor.</p>
              )}
            </div>
            <div className="mt-auto shrink-0 space-y-2 border-t border-slate-700 pt-6">
              <div className="flex justify-between text-lg font-semibold text-slate-400">
                <span>Seçili Toplam</span>
                <span>{selectedTotal.toFixed(2).replace('.', ',')} ₺</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-slate-300">
                <span>Adisyon Kalan</span>
                <span className="text-green-400">{cartTotals.remaining.toFixed(2).replace('.', ',')} ₺</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col bg-slate-900 p-6 sm:p-8 lg:w-1/2 lg:rounded-r-2xl">
            {additionPayments.length > 0 && (
              <div className="mt-2 flex-grow-0 rounded-lg border border-slate-700 bg-slate-800 p-3">
                <h4 className="mb-2 shrink-0 text-sm text-slate-400">Alınan Ödemeler</h4>
                <div className="max-h-24 overflow-y-auto pr-2">
                  {additionPayments.map((p) => (
                    <div key={p.id} className="mt-2 flex items-center justify-between text-sm font-semibold">
                      <span className="flex min-w-0 items-center gap-1.5 text-slate-300">
                        <span className="truncate">{p.payment_name || p.payment_friendly_name}</span>
                        <ActorBadge
                          initials={p.user_initials}
                          display={p.user_display}
                          date={p.date}
                          time={p.time}
                          className="shrink-0"
                        />
                        <small className="ml-1 shrink-0 text-slate-500">{p.time}</small>
                      </span>
                      <div className="flex items-center text-white">
                        <span>{parseFloat(p.amount).toFixed(2)} ₺</span>
                        <button type="button" onClick={() => handleRemovePayment(p.id)} disabled={isOverlayActive} className="ml-2 text-lg text-slate-500 transition-colors hover:text-red-400 disabled:opacity-40">×</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 shrink-0 border-t border-slate-700 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">Toplam</span>
                    <span className="text-white">{totalPaid.toFixed(2)} ₺</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-1 flex-col justify-center">
              <div className="rounded-lg p-3 text-center font-mono text-3xl tracking-wider text-white">
                <span>{parseFloat(keypadValue || 0).toFixed(2).replace('.', ',')}</span>
                <span className="ml-1 text-2xl">₺</span>
              </div>
              <Keypad
                value={keypadValue}
                onValueChange={setKeypadValue}
                showFractionButtons
                cartTotals={cartTotals}
                disabled={isOverlayActive || isLoadingPaymentData || isRefreshing || isPaying}
                keyboard={selectedProducts.length === 0}
              />
            </div>

            <div className="mt-auto">
              <div className="mb-3 mt-4 grid grid-cols-3 gap-3">
                {visibleMethods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isOverlayActive}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`rounded-lg border p-3 text-xs font-semibold transition-colors ${
                      selectedMethod === m.id
                        ? (complimentaryPaymentMethod && m.id === complimentaryPaymentMethod.id
                          ? 'border-orange-600 bg-orange-600 text-white'
                          : `${saleBtn.choice(true)} text-xs`)
                        : `${saleBtn.choice(false)} text-xs`
                    }`}
                  >
                    {m.friendly_name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={isOverlayActive || !selectedMethod || parseFloat(keypadValue) <= 0}
                className={`w-full p-4 text-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isComplimentary
                    ? 'rounded-lg bg-orange-600 text-white hover:bg-orange-700'
                    : `${saleBtn.primary} w-full p-4 text-lg`
                }`}
              >
                {isPaying ? 'Ödeme alınıyor…' : (isComplimentary ? 'İkram Et' : 'Tahsil Et')}
              </button>
            </div>
          </div>

          <SaleToast
            message={paymentError}
            onDismiss={clearPaymentError}
            className="absolute left-6 right-16 top-4 z-[70]"
          />
        </div>
      </div>

      {showSplitModal && (
        <SplitBillModal
          remainingTotal={cartTotals.remaining}
          onClose={() => setShowSplitModal(false)}
          onConfirm={handleSplitConfirm}
        />
      )}

      {showComplimentaryModal && (
        <ComplimentaryModal
          selectedProducts={selectedProducts}
          paymentProducts={paymentProducts}
          amount={parseFloat(keypadValue)}
          onClose={() => setShowComplimentaryModal(false)}
          onConfirm={handleComplimentaryConfirm}
        />
      )}
    </>
  );
}
