import { useCallback, useEffect, useRef, useState } from 'react';
import { listActiveSessions, listComputers, listOpenAdditions, listStationCategories } from '../../../lib/api';
import { saleApi } from '../../../lib/saleApi';
import { evaluateTransferTarget } from '../../../lib/tableTransfer';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

export default function TransferTableModal({
  additionId,
  currentTableId = null,
  currentTableName,
  currentCategoryName,
  sourceDeviceType = null,
  sourceHasActiveSession = false,
  isQuickSale = false,
  onClose,
  onTransferred,
  onError,
}) {
  const [tableCategories, setTableCategories] = useState([]);
  const allTablesRef = useRef([]);
  const [tables, setTables] = useState([]);
  const [activeTableCat, setActiveTableCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  const loadTables = useCallback((categoryId, source = allTablesRef.current) => {
    setTables(source.filter((table) => Number(table.categoryId) === Number(categoryId)));
    setActiveTableCat(categoryId);
    setSelectedTable(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [categoryRes, stationRes, sessionRes, additionRes] = await Promise.all([
          listStationCategories(),
          listComputers(),
          listActiveSessions(),
          listOpenAdditions(),
        ]);
        if (!active) return;

        const additions = additionRes?.data || [];
        const activeSessions = sessionRes?.data || [];
        const stations = (stationRes?.data || []).map((station) => ({
          ...station,
          id: station.cloudId || station.id,
          additions: additions.filter((addition) => Number(addition.table_id ?? addition.table?.id) === Number(station.cloudId || station.id)),
          has_active_session: activeSessions.some((session) => String(session.machineId) === String(station.machineId)),
        }));
        const categories = categoryRes?.data?.length ? categoryRes.data : Array.from(new Map(
          stations.filter((station) => station.categoryId != null).map((station) => [station.categoryId, {
            id: station.categoryId,
            name: station.categoryName || `Kategori ${station.categoryId}`,
          }]),
        ).values());
        allTablesRef.current = stations;
        setTableCategories(categories);
        if (categories.length) loadTables(categories[0].id, stations);
        else setTables(stations);
      } catch {
        if (active) onError?.('Masa kategorileri yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadTables, onError]);

  const handleTransfer = async () => {
    if (!selectedTable || transferring) return;
    setTransferring(true);
    try {
      const response = await saleApi('/app/addition/transfer', {
        method: 'POST',
        body: JSON.stringify({
          addition_id: additionId,
          target_table_id: selectedTable.id,
          target_type: 'cafe_station',
        }),
      });
      if (!response.status) {
        throw new Error(response.message || 'Taşıma başarısız.');
      }
      await onTransferred?.(response.data);
      onClose();
    } catch (error) {
      onError?.(error.message || 'Adisyon taşınamadı.');
    } finally {
      setTransferring(false);
    }
  };

  const sourceLabel = isQuickSale
    ? 'Hızlı Satış'
    : [currentCategoryName, currentTableName].filter(Boolean).join(' · ');

  const title = isQuickSale ? 'Masaya taşı' : 'Masa taşı';
  const subtitle = isQuickSale
    ? 'Hızlı satış ürünlerini seçtiğiniz masaya taşıyın'
    : (sourceLabel ? `${sourceLabel} masasındaki ürünleri seçtiğiniz masaya taşıyın` : 'Hedef masayı seçin');

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-2xl">
      <SaleModalHeader
        title={title}
        subtitle={subtitle}
        onClose={onClose}
      />
      <SaleModalBody>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sale-border)] border-t-[var(--app-accent)]" />
          </div>
        ) : tableCategories.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--sale-fg-subtle)]">Henüz masa yok.</p>
        ) : (
          <>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {tableCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => loadTables(cat.id)}
                  className={saleBtn.pill(activeTableCat === cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {tables.map((table) => {
                const {
                  disabled, isCurrent, unavailable, statusLabel,
                } = evaluateTransferTarget({
                  sourceTableId: currentTableId,
                  sourceDeviceType,
                  sourceHasActiveSession,
                  target: table,
                  targetHasActiveSession: Boolean(table.has_active_session),
                });
                const isSelected = selectedTable?.id === table.id;

                return (
                  <button
                    key={table.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedTable(table)}
                    className={`flex h-20 flex-col items-center justify-center rounded-lg border p-2 text-center transition-all touch-manipulation ${
                      isCurrent || unavailable
                        ? 'cursor-not-allowed border-[var(--sale-border)] bg-[var(--sale-surface)] text-[var(--sale-fg-subtle)] opacity-60'
                        : isSelected
                          ? `${saleBtn.choice(true)} h-20`
                          : `${saleBtn.choice(false)} h-20`
                    }`}
                  >
                    <span className="text-base font-bold">{table.name}</span>
                    <span className="mt-1 text-xs opacity-80">{statusLabel}</span>
                  </button>
                );
              })}
            </div>

            {tables.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--sale-fg-subtle)]">Bu kategoride masa yok.</p>
            )}
          </>
        )}
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} disabled={transferring} className={saleBtn.ghost}>
          İptal
        </button>
        <button
          type="button"
          onClick={handleTransfer}
          disabled={!selectedTable || transferring || loading}
          className={saleBtn.primary}
        >
          {transferring ? 'Taşınıyor…' : selectedTable ? `${selectedTable.name} masasına taşı` : 'Masa seçin'}
        </button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
