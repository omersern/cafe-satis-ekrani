import { useCallback, useEffect, useMemo, useState } from 'react';
import { saleApi } from '../../lib/saleApi';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from './ui/SaleModal';

const STATUS_LABELS = {
  pending: 'YENİ SİPARİŞ',
  preparing: 'HAZIRLANIYOR',
  ready: 'HAZIRLANDI',
  served: 'TESLİM EDİLDİ',
};

const STATUS_COLORS = {
  pending: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'bg-orange-500', btn: 'bg-orange-500 hover:bg-orange-600' },
  preparing: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', badge: 'bg-blue-500', btn: 'bg-blue-500 hover:bg-blue-600' },
  ready: { bg: 'bg-green-500/10', border: 'border-green-500/30', badge: 'bg-green-500', btn: 'bg-green-500 hover:bg-green-600' },
  served: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', badge: 'bg-slate-500', btn: 'bg-slate-500 hover:bg-slate-600' },
};

const VALID_TRANSITIONS = {
  pending: ['preparing', 'ready', 'served'],
  preparing: ['ready', 'served'],
  ready: ['served'],
  served: [],
};

export default function KitchenView({ onStatusChange, onError, onConfirm }) {
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(null);

  const loadKitchenOrders = useCallback(async (initial = false) => {
    try {
      if (initial) setIsLoading(true);
      const response = await saleApi('/app/kitchen/orders', { method: 'GET' });
      setKitchenOrders(response.data || []);
    } catch {
      if (initial) setKitchenOrders([]);
    } finally {
      if (initial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKitchenOrders(true);
    const refresh = () => loadKitchenOrders(false);
    window.addEventListener('wpos:kitchen-refresh', refresh);
    return () => window.removeEventListener('wpos:kitchen-refresh', refresh);
  }, [loadKitchenOrders]);

  const handleBulkStatusChange = async (orderIds, newStatus) => {
    try {
      for (const orderId of orderIds) {
        await saleApi('/app/kitchen/status', {
          method: 'POST',
          body: JSON.stringify({ order_id: orderId, status: newStatus }),
        });
      }
      await loadKitchenOrders(false);
      setStatusModal(null);
      onStatusChange?.();
    } catch (error) {
      onError?.(error.message);
    }
  };

  const handleCancelOrder = (orderIds) => {
    onConfirm?.({
      title: 'Siparişi iptal et',
      message: 'Bu siparişi iptal etmek istediğinize emin misiniz?',
      onConfirm: () => handleBulkStatusChange(orderIds, 'cancelled'),
    });
  };

  const filteredOrders = useMemo(
    () => kitchenOrders.filter((order) => order.status === activeTab),
    [kitchenOrders, activeTab],
  );

  const getCountByStatus = (status) => kitchenOrders.filter((o) => o.status === status).length;

  return (
    <div className="px-6 py-8 sm:px-10">
      {statusModal && (
        <SaleModalOverlay onClose={() => setStatusModal(null)} className="max-w-sm" zIndex="z-[55]">
          <SaleModalHeader
            title="Durum güncelle"
            subtitle={statusModal.orderName}
            onClose={() => setStatusModal(null)}
          />
          <SaleModalBody className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <span>Mevcut:</span>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold text-white ${STATUS_COLORS[statusModal.currentStatus]?.badge}`}>
                {STATUS_LABELS[statusModal.currentStatus]}
              </span>
            </div>
            {(VALID_TRANSITIONS[statusModal.currentStatus] || []).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleBulkStatusChange(statusModal.orderIds, status)}
                className={`w-full rounded-lg px-4 py-4 text-sm font-semibold text-white transition-colors ${STATUS_COLORS[status]?.btn}`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </SaleModalBody>
          <SaleModalFooter>
            <button type="button" onClick={() => setStatusModal(null)} className={saleBtn.ghost}>Vazgeç</button>
          </SaleModalFooter>
        </SaleModalOverlay>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Mutfak Siparişleri</h2>
        <p className="mt-1 text-sm text-slate-500">Sipariş durumlarını yönetin</p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const count = getCountByStatus(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative ${saleBtn.pill(activeTab === key)}`}
            >
              {label}
              {' '}
              (
              {count}
              )
              {key === 'pending' && count > 0 && activeTab !== key && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="metro-card py-16 text-center">
          <p className="text-slate-500">
            {activeTab === 'served' ? 'Son 1 saatte teslim edilen sipariş yok' : 'Sipariş bulunmuyor'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOrders.map((order, idx) => {
            const itemIds = order.items?.map((item) => item.id) || [];
            const colors = STATUS_COLORS[activeTab];
            return (
              <div
                key={`${order.id}-${order.created_at}-${idx}`}
                className={`flex h-96 flex-col rounded-xl border-2 p-4 shadow-lg transition-all duration-200 ${STATUS_COLORS[activeTab]?.bg} ${STATUS_COLORS[activeTab]?.border}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {order.order_method === 'quick' ? 'Hızlı Satış' : order.table_name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      #
                      {order.id}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${colors.badge} ${activeTab === 'pending' ? 'animate-pulse' : ''}`}>
                    {STATUS_LABELS[activeTab]}
                  </span>
                </div>

                <p className="mb-3 text-xs text-slate-500">
                  {new Date(order.created_at).toLocaleString('tr-TR', {
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
                  })}
                </p>

                <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-lg bg-slate-900/50 p-3">
                  {order.items?.map((item, itemIdx) => (
                    <div key={item.id || itemIdx} className={itemIdx > 0 ? 'border-t border-white/[0.06] pt-3' : ''}>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-white">{item.quantity}x</span>
                        <span className="font-medium text-slate-200">{item.product_name}</span>
                      </div>
                      {item.variations?.length > 0 && (
                        <div className="ml-6 mt-1 text-xs text-slate-500">
                          {item.variations.map((v, vidx) => <div key={vidx}>• {v}</div>)}
                        </div>
                      )}
                      {item.note && (
                        <div className="ml-6 mt-2 rounded-lg bg-amber-500/10 px-2 py-1 text-xs italic text-amber-300">
                          {item.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex gap-2 pt-2">
                  {(activeTab === 'pending' || activeTab === 'preparing') && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(itemIds)}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 transition-all duration-200 hover:bg-red-500/20 active:scale-95"
                    >
                      İptal
                    </button>
                  )}
                  {activeTab !== 'served' && (
                    <button
                      type="button"
                      onClick={() => setStatusModal({
                        orderIds: itemIds,
                        currentStatus: activeTab,
                        orderName: order.table_name || 'Hızlı Satış',
                      })}
                      className="flex-1 rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-slate-600 active:scale-95"
                    >
                      Durum Güncelle
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
