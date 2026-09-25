import { useCallback, useEffect, useState } from 'react';
import useDebounce from '../../../hooks/useDebounce';
import { saleApi } from '../../../lib/saleApi';
import AddCustomerModal, { customerLabel } from './AddCustomerModal';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function CustomerModal({
  additionId,
  onClose,
  onError,
  onSuccess,
  onConfirm,
}) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [additionCustomers, setAdditionCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');

  const debouncedSearch = useDebounce(searchInput, 400);

  const loadAdditionCustomers = useCallback(async () => {
    if (!additionId) return;
    try {
      const response = await saleApi('/app/addition/customer/list', {
        method: 'POST',
        body: JSON.stringify({ addition_id: additionId }),
      });
      setAdditionCustomers(response.data || []);
    } catch {
      setAdditionCustomers([]);
    }
  }, [additionId]);

  useEffect(() => { loadAdditionCustomers(); }, [loadAdditionCustomers]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        setSelectedCustomer(null);
        const response = await saleApi('/app/addition/customer/search', {
          method: 'POST',
          body: JSON.stringify({ searchTerm: debouncedSearch }),
        });
        if (active) setSearchResults(response.data || []);
      } catch {
        if (active) setSearchResults([]);
      }
    })();
    return () => { active = false; };
  }, [debouncedSearch]);

  const handleAddCustomerToAddition = async () => {
    if (!selectedCustomer || !additionId) return;
    try {
      await saleApi('/app/addition/customer/add', {
        method: 'POST',
        body: JSON.stringify({ addition_id: additionId, customer_id: selectedCustomer.id }),
      });
      setSearchResults([]);
      setSearchInput('');
      setSelectedCustomer(null);
      await loadAdditionCustomers();
      onSuccess?.('Müşteri adisyona eklendi.');
    } catch (error) {
      onError?.(error.message);
    }
  };

  const handleRemoveCustomer = (customerId) => {
    onConfirm?.({
      title: 'Müşteriyi kaldır',
      message: 'Bu müşteriyi adisyondan kaldırmak istediğinize emin misiniz?',
      onConfirm: async () => {
        try {
          await saleApi('/app/addition/customer/remove', {
            method: 'POST',
            body: JSON.stringify({ addition_id: additionId, customer_id: customerId }),
          });
          await loadAdditionCustomers();
        } catch (error) {
          onError?.(error.message);
        }
      },
    });
  };

  const handleUpdateCustomerPhone = async () => {
    if (!editingCustomer || !newPhoneNumber) return;
    try {
      await saleApi('/app/customer/edit', {
        method: 'POST',
        body: JSON.stringify({ id: editingCustomer.id, phone_number: newPhoneNumber }),
      });
      setShowEditCustomer(false);
      setEditingCustomer(null);
      setNewPhoneNumber('');
      await loadAdditionCustomers();
      onSuccess?.('Telefon numarası güncellendi.');
    } catch (error) {
      onError?.(error.message);
    }
  };

  if (showAddCustomer) {
    return (
      <AddCustomerModal
        onClose={() => setShowAddCustomer(false)}
        additionId={additionId}
        onCustomerAdded={loadAdditionCustomers}
        initialSearchTerm={searchInput}
        onError={onError}
        onSuccess={onSuccess}
      />
    );
  }

  if (showEditCustomer) {
    return (
      <SaleModalOverlay onClose={() => setShowEditCustomer(false)} className="max-w-lg">
        <SaleModalHeader title="Telefon güncelle" onClose={() => setShowEditCustomer(false)} />
        <SaleModalBody className="space-y-4">
          <div className="text-center">
            <p className="font-semibold text-white">{customerLabel(editingCustomer)}</p>
            <p className="text-sm text-slate-500">Mevcut: {editingCustomer?.phone_number}</p>
          </div>
          <input
            type="text"
            value={newPhoneNumber}
            onChange={(e) => setNewPhoneNumber(e.target.value)}
            maxLength={10}
            placeholder="5xxxxxxxxx"
            className={saleBtn.input}
          />
        </SaleModalBody>
        <SaleModalFooter>
          <button type="button" onClick={() => setShowEditCustomer(false)} className={saleBtn.ghost}>İptal</button>
          <button type="button" onClick={handleUpdateCustomerPhone} className={saleBtn.primary}>Güncelle</button>
        </SaleModalFooter>
      </SaleModalOverlay>
    );
  }

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-4xl">
      <SaleModalHeader title="Müşteri yönetimi" subtitle="Ara, ekle veya kaldır" onClose={onClose} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex w-1/2 flex-col border-r border-white/[0.06]">
          <div className="border-b border-white/[0.06] p-4">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Telefon numarası ile arayın…"
              className={saleBtn.input}
            />
          </div>
          <div className="metro-scroll flex-1 overflow-y-auto p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Arama sonuçları</p>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors touch-manipulation select-none active:scale-[0.99] min-h-[64px] ${
                      selectedCustomer?.id === customer.id
                        ? 'border-blue-500/30 bg-blue-500/10'
                        : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <p className="font-semibold text-white">{customerLabel(customer)}</p>
                    <p className="text-sm text-slate-500">{customer.phone_number}</p>
                  </button>
                ))}
              </div>
            ) : debouncedSearch.length > 5 ? (
              <div className="py-8 text-center">
                <p className="font-semibold text-rose-300">Sonuç bulunamadı</p>
                <p className="mb-4 mt-1 text-sm text-slate-500">Aradığınız kişi müşteri olarak eklenmemiş.</p>
                <button type="button" onClick={() => setShowAddCustomer(true)} className={saleBtn.primary}>
                  Müşteri oluştur
                </button>
              </div>
            ) : (
              <p className="py-8 text-center text-slate-600">Aramaya başlayın…</p>
            )}

            {selectedCustomer && (
              <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-300/80">Seçili müşteri</p>
                <p className="font-semibold text-white">{customerLabel(selectedCustomer)}</p>
                <p className="text-sm text-slate-400">{selectedCustomer.phone_number}</p>
                <button type="button" onClick={handleAddCustomerToAddition} className={`${saleBtn.primary} mt-3 text-xs`}>
                  Adisyona ekle
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-1/2 flex-col">
          <div className="border-b border-white/[0.06] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Adisyondaki müşteriler</p>
          </div>
          <div className="metro-scroll flex-1 overflow-y-auto p-4">
            {additionCustomers.length > 0 ? (
              <div className="space-y-2">
                {additionCustomers.map((customer) => (
                  <div key={customer.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{customer.name} {customer.surname}</p>
                        {customer.phone_number && (
                          <p className="text-sm text-slate-500">{customer.phone_number}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomer(customer);
                            setNewPhoneNumber(customer.phone_number || '');
                            setShowEditCustomer(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white"
                          title="Düzenle"
                        >
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M20.548 3.452a1.542 1.542 0 0 1 0 2.182l-7.636 7.636-3.273 1.091 1.091-3.273 7.636-7.636a1.542 1.542 0 0 1 2.182 0zM4 21h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-2 0v7H5V6h7a1 1 0 0 0 0-2H4a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1z" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomer(customer.id)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                          title="Kaldır"
                        >
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-slate-600">Bu adisyona henüz müşteri eklenmemiş.</p>
            )}
          </div>
        </div>
      </div>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>Kapat</button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
