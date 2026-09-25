import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cart from '../components/sale/Cart';
import SaleOverlayLoader from '../components/sale/SaleOverlayLoader';
import KitchenView from '../components/sale/KitchenView';
import NetworkAlert from '../components/sale/NetworkAlert';
import PaymentModal from '../components/sale/PaymentModal';
import ProductGrid from '../components/sale/ProductGrid';
import SaleToolbar from '../components/sale/SaleToolbar';
import TablesView from '../components/sale/TablesView';
import TransferTableModal from '../components/sale/modals/TransferTableModal';
import OperationHistoryModal from '../components/sale/modals/OperationHistoryModal';
import VariantModal from '../components/sale/VariantModal';
import BundleModal from '../components/sale/BundleModal';
import AdditionSettingsModal from '../components/sale/modals/AdditionSettingsModal';
import CreateNewAdditionModal from '../components/sale/modals/CreateNewAdditionModal';
import CustomerModal from '../components/sale/modals/CustomerModal';
import EditAdditionModal from '../components/sale/modals/EditAdditionModal';
import OpenAdditionsModal from '../components/sale/modals/OpenAdditionsModal';
import PriceChangeModal from '../components/sale/modals/PriceChangeModal';
import AmountChangeModal from '../components/sale/modals/AmountChangeModal';
import DiscountModal from '../components/sale/modals/DiscountModal';
import StartTableModal from '../components/sale/modals/StartTableModal';
import TimerTableModal from '../components/sale/modals/TimerTableModal';
import ConfirmDialog from '../components/sale/ui/ConfirmDialog';
import SaleToast from '../components/sale/ui/SaleToast';
import { useLoginRequests } from '../components/sale/LoginRequestsNotifier';
import SessionActionsModal from '../components/SessionActionsModal';
import useNetworkStatus from '../hooks/useNetworkStatus';
import useSaleLoading from '../hooks/useSaleLoading';
import { purgeLegacyDraftKeys } from '../lib/additionFormat';
import { runSaleTransaction } from '../lib/saleLoading';
import { removeSplitBillPlan } from '../lib/splitBillStore';
import { applyTimeLineRounding, computeCartTotals } from '../lib/additionDiscount';
import { ADDITION_PERMISSIONS } from '../lib/permissions';
import { usePermissions } from '../hooks/usePermissions';
import {
  endSession,
  filterTariffsByServiceType,
  getPaymentPermission,
  getTablesState,
  listActiveSessions,
  listComputers,
  listTableTimers,
  listTariffs,
  startTableTimer,
  stopTableTimer,
} from '../lib/api';
import { saleApi, saleApiJson } from '../lib/saleApi';
import { loadSaleCatalog, refreshSaleCatalog, readSaleCatalogCache } from '../lib/saleCatalog';
import {
  getChildCategories,
  getProductsForCategory,
  getRootCategories,
  resolveInitialSelection,
} from '../lib/categoryTree';
import { useAuth } from '../context/AuthContext';

/**
 * Süre sayaçlı masa mı? PC/PlayStation/VR/bilardo/masa tenisi "Masayı Aç" ile bulut
 * adisyonundan açılır (PC ayrıca client seansı başlatır). Düz restoran masası
 * (masa/table/genel) süreyle ücretlendirilmez.
 */
function isTimerTable(station) {
  if (!station) return false;
  const t = String(station.deviceType || station.device_type || '').toLowerCase().replace(/[\s_-]/g, '');
  if (!t) return false;
  return !['masa', 'table', 'genel'].includes(t);
}

/** Toolbar oturum/sayaç göstergesi — süre tiklerini sayma, sadece var/yok durumu. */
function stationToolbarFingerprint(station) {
  if (!station) return '';
  const deviceType = String(station.deviceType || station.device_type || '').toLowerCase();
  const session = station.session;
  const sessionKey = session
    ? String(session.id ?? session.sessionId ?? session.machineId ?? '1')
    : '';
  const timer = station.timer;
  const timerKey = timer
    ? `${timer.additionId ?? ''}:${timer.startedAt ?? ''}:${timer.pausedAt ?? '0'}`
    : '';
  return `${deviceType}|${sessionKey}|${timerKey}|${station.machineId ?? ''}`;
}

function mergeSelectedStationSnapshot(current, { computer, session, timer }) {
  if (!current) return current;
  const next = {
    ...current,
    ...(computer || {}),
    session: session ?? null,
    timer: timer ?? null,
  };
  if (stationToolbarFingerprint(current) === stationToolbarFingerprint(next)) {
    return current;
  }
  return next;
}

export default function Sale() {
  const { staff } = useAuth();
  const bootCatalog = readSaleCatalogCache();
  const bootSelection = bootCatalog?.categories?.length
    ? resolveInitialSelection(bootCatalog.categories)
    : { parentId: null, categoryId: null };
  const [userName, setUserName] = useState('');
  const [currentView, setCurrentView] = useState('hizli-satis');
  const [pendingKitchenOrders, setPendingKitchenOrders] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tableInfo, setTableInfo] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  const [categories, setCategories] = useState(bootCatalog?.categories || []);
  const [allProducts, setAllProducts] = useState(bootCatalog?.products || []);
  const [products, setProducts] = useState(
    bootCatalog
      ? getProductsForCategory(bootCatalog.products, bootCatalog.categories, bootSelection.categoryId, bootSelection.parentId)
      : [],
  );
  const [activeCategoryId, setActiveCategoryId] = useState(bootSelection.categoryId);
  const [activeParentId, setActiveParentId] = useState(bootSelection.parentId);
  const [variantGroups, setVariantGroups] = useState(bootCatalog?.variantGroups || []);
  const [variants, setVariants] = useState(bootCatalog?.variants || []);
  const [bundleGroups, setBundleGroups] = useState(bootCatalog?.bundleGroups || []);
  const [bundleOptions, setBundleOptions] = useState(bootCatalog?.bundleOptions || []);
  const [bundleFixedItems, setBundleFixedItems] = useState(bootCatalog?.bundleFixedItems || []);
  const [paymentMethods, setPaymentMethods] = useState(bootCatalog?.paymentMethods || []);

  const [cart, setCart] = useState(null);
  const cartRef = useRef(null);
  const getAdditionDetailsRef = useRef(null);
  const additionDetailsInFlightRef = useRef(null);
  const lastAdditionDetailsRef = useRef(null);
  const additionDetailsVersionRef = useRef(0);
  const tariffListRef = useRef({ at: 0, list: [] });
  cartRef.current = cart;
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});

  useEffect(() => {
    // Ödeme ekranı ilk kez açıldığında izin isteği beklemesin.
    getPaymentPermission().catch(() => {});
  }, []);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [managedSession, setManagedSession] = useState(null);
  const [managedTimer, setManagedTimer] = useState(null);
  const [tablesRevision, setTablesRevision] = useState(0);
  const refreshStationSeqRef = useRef(0);
  const toolbarActionsRef = useRef({});

  const { hasPermission, refreshPermissions } = usePermissions();
  const canApplyDiscount = hasPermission(ADDITION_PERMISSIONS.DISCOUNT);

  useEffect(() => {
    refreshPermissions();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshPermissions();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshPermissions]);

  useEffect(() => {
    listTariffs().then((response) => {
      tariffListRef.current = { at: Date.now(), list: response?.data || [] };
    }).catch(() => {});
  }, []);
  const networkStatus = useNetworkStatus();
  const isApiLoading = useSaleLoading();

  const clearToast = useCallback(() => setToast(null), []);
  const showError = useCallback((text) => {
    setToast({ text: String(text), tone: 'error' });
  }, []);
  const loginRequests = useLoginRequests({
    onError: showError,
    onApproved: (text) => setToast({ text, tone: 'success' }),
  });
  const openConfirm = useCallback((config) => setConfirm(config), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const managedMachineId = managedSession?.computer?.machineId;
  const refreshManagedSession = useCallback(async () => {
    if (!managedMachineId) return;
    const response = await listActiveSessions();
    const session = (response?.data || []).find(
      (item) => String(item.machineId) === String(managedMachineId)
    );
    if (session) setManagedSession((current) => current ? { ...current, session } : null);
    else setManagedSession(null);
  }, [managedMachineId]);

  useEffect(() => {
    if (!managedMachineId) return undefined;
    window.addEventListener('wpos:tables-refresh', refreshManagedSession);
    return () => window.removeEventListener('wpos:tables-refresh', refreshManagedSession);
  }, [managedMachineId, refreshManagedSession]);

  const selectedMachineId = selectedStation?.machineId;
  const selectedTableId = selectedStation?.cloudId || selectedStation?.id;

  const refreshSelectedStation = useCallback(async () => {
    if (!tableInfo || !selectedTableId) return;
    const seq = ++refreshStationSeqRef.current;
    try {
      const state = await getTablesState();
      if (!state?.status) return;
      if (seq !== refreshStationSeqRef.current) return;
      const computer = (state.data?.stations || []).find((item) =>
        String(item.cloudId || item.id) === String(selectedTableId));
      const session = selectedMachineId
        ? (state.data?.sessions || []).find((item) => String(item.machineId) === String(selectedMachineId))
        : null;
      const timers = state.data?.timers || {};
      const timer = timers[selectedTableId] || timers[String(selectedTableId)] || null;
      setSelectedStation((current) => mergeSelectedStationSnapshot(current, {
        computer,
        session,
        timer,
      }));
    } catch { /* Toolbar oturum/sayaç göstergesi — sessiz yenileme */ }
  }, [tableInfo, selectedTableId, selectedMachineId]);

  useEffect(() => {
    if (!tableInfo || !selectedTableId) return undefined;
    let refreshTimer = null;
    const onRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshSelectedStation();
        const additionId = cartRef.current?.addition?.id;
        if (additionId) getAdditionDetailsRef.current?.(additionId, { silent: true });
      }, 250);
    };
    window.addEventListener('wpos:tables-refresh', onRefresh);
    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('wpos:tables-refresh', onRefresh);
    };
  }, [tableInfo, selectedTableId, refreshSelectedStation]);

  useEffect(() => {
    if (tablesRevision > 0) refreshSelectedStation();
  }, [tablesRevision, refreshSelectedStation]);

  const syncTableInfoFromStore = useCallback(async () => {
    const [tableId, tableName, tableCategoryName] = await Promise.all([
      window.env.getKey('table_id'),
      window.env.getKey('table_id_name'),
      window.env.getKey('table_category_name'),
    ]);
    if (tableId && tableName) {
      setTableInfo({ name: tableName, category: tableCategoryName || 'Genel' });
    } else {
      setTableInfo(null);
    }
  }, []);

  const getAdditionDetails = useCallback(async (additionId, { silent = false, force = false } = {}) => {
    if (!additionId) {
      setCart(null);
      await window.env.removeKey('addition_id');
      await syncTableInfoFromStore();
      return;
    }

    const requestKey = String(additionId);
    const requestVersion = force
      ? ++additionDetailsVersionRef.current
      : additionDetailsVersionRef.current;
    const lastLoaded = lastAdditionDetailsRef.current;
    if (!force && silent && lastLoaded?.key === requestKey && Date.now() - lastLoaded.at < 1000) return;
    const inFlight = additionDetailsInFlightRef.current;
    if (!force && inFlight?.key === requestKey) return inFlight.promise;

    let finishRequest;
    const request = new Promise((resolve) => { finishRequest = resolve; });
    additionDetailsInFlightRef.current = { key: requestKey, promise: request };

    try {
      const { data: response } = await saleApiJson('/app/addition/detail', {
        method: 'POST',
        body: JSON.stringify({ addition_id: additionId }),
        skipLoading: silent,
      });

      if (requestVersion !== additionDetailsVersionRef.current) return;
      if (!response?.status || !response.data?.addition) {
        if (response?.errors?.title === 'cannot-find-this-addition-id') {
          await getAdditionDetails(null);
        }
        return;
      }

      const timer = response.data.timer || null;

      let products = response.data.products || [];
      if (timer?.tariffId && timer?.timeLineId) {
        if (Date.now() - tariffListRef.current.at > 60000) {
          const tariffRes = await listTariffs();
          tariffListRef.current = { at: Date.now(), list: tariffRes?.data || [] };
        }
        const tariff = tariffListRef.current.list.find((item) => Number(item.id) === Number(timer.tariffId));
        products = applyTimeLineRounding(products, timer, tariff);
      }

      // Kapatma sonrası gelen yeni yanıt, kapatma öncesinde başlatılan eski isteği geçersiz kılar.
      if (requestVersion !== additionDetailsVersionRef.current) return;

      setCart({ ...response.data, products, timer });
      lastAdditionDetailsRef.current = { key: requestKey, at: Date.now() };
      setSelectedStation((current) => (current ? { ...current, timer } : current));
      await window.env.addKey('addition_id', additionId);

      if (response.data.table?.name) {
        const name = response.data.table.name;
        const category = response.data.table.category_name;
        setTableInfo((prev) => (
          prev?.name === name && prev?.category === category
            ? prev
            : { name, category }
        ));
        await window.env.addKey('table_id', response.data.table.id);
        await window.env.addKey('table_id_name', name);
        await window.env.addKey('table_category_name', category);
      } else {
        const keptName = await window.env.getKey('table_id_name');
        if (keptName) {
          await syncTableInfoFromStore();
        } else {
          await window.env.removeKey('table_id');
          await window.env.removeKey('table_id_name');
          await window.env.removeKey('table_category_name');
          setTableInfo(null);
        }
      }
    } catch (error) {
      if (requestVersion !== additionDetailsVersionRef.current) return;
      showError(`Adisyon detayları alınamadı: ${error.message}`);
      await getAdditionDetails(null);
    } finally {
      finishRequest();
      if (additionDetailsInFlightRef.current?.promise === request) {
        additionDetailsInFlightRef.current = null;
      }
    }
  }, [showError, syncTableInfoFromStore]);
  getAdditionDetailsRef.current = getAdditionDetails;

  const loadPendingKitchenOrders = useCallback(async () => {
    try {
      const response = await saleApi('/app/kitchen/pending-count', { method: 'GET', skipLoading: true });
      setPendingKitchenOrders(response.count || 0);
    } catch {
      // sessiz
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const catalog = readSaleCatalogCache() || await loadSaleCatalog();
        if (!active) return;

        const [username, userNameLegacy, editMode, storedAdditionId] = await Promise.all([
          window.env.getKey('auth_username'),
          window.env.getKey('auth_user_name'),
          window.env.getKey('is_edit_mode'),
          window.env.getKey('addition_id'),
        ]);
        const name = username || userNameLegacy;

        let additionId = storedAdditionId;
        await purgeLegacyDraftKeys();

        setUserName(
          name
            ? String(name).toUpperCase()
            : staff?.name
              ? String(staff.name).toUpperCase()
              : ''
        );
        setIsEditMode(editMode === true);
        setCategories(catalog.categories);
        setAllProducts(catalog.products);
        setVariantGroups(catalog.variantGroups);
        setVariants(catalog.variants);
        setBundleGroups(catalog.bundleGroups);
        setBundleOptions(catalog.bundleOptions);
        setBundleFixedItems(catalog.bundleFixedItems);
        setPaymentMethods(catalog.paymentMethods);

        if (catalog.categories.length > 0) {
          const { parentId, categoryId } = resolveInitialSelection(catalog.categories);
          setActiveParentId(parentId);
          setActiveCategoryId(categoryId);
          setProducts(getProductsForCategory(catalog.products, catalog.categories, categoryId, parentId));
        }

        await syncTableInfoFromStore();

        if (additionId) {
          await getAdditionDetails(additionId, { silent: true });
        } else {
          setCart(null);
        }
      } catch (error) {
        if (active) showError(error.message || 'Veriler yüklenirken hata oluştu.');
      }
    }
    initialize();
    return () => { active = false; };
  }, [getAdditionDetails, showError, syncTableInfoFromStore]);

  const refreshCatalog = useCallback(async () => {
    try {
      const catalog = await refreshSaleCatalog();
      setCategories(catalog.categories);
      setAllProducts(catalog.products);
      setVariantGroups(catalog.variantGroups);
      setVariants(catalog.variants);
      setBundleGroups(catalog.bundleGroups);
      setBundleOptions(catalog.bundleOptions);
      setBundleFixedItems(catalog.bundleFixedItems);
      setPaymentMethods(catalog.paymentMethods);

      let categoryId = activeCategoryId;
      let parentId = activeParentId;
      const stillExists = catalog.categories.some((c) => String(c.id) === String(categoryId));
      if (!stillExists && catalog.categories.length > 0) {
        const resolved = resolveInitialSelection(catalog.categories);
        parentId = resolved.parentId;
        categoryId = resolved.categoryId;
        setActiveParentId(resolved.parentId);
        setActiveCategoryId(resolved.categoryId);
      }
      if (categoryId) {
        setProducts(getProductsForCategory(catalog.products, catalog.categories, categoryId, parentId));
      }
    } catch {
      // sessiz
    }
  }, [activeCategoryId, activeParentId]);

  const catalogRefreshOnce = useRef(false);
  useEffect(() => {
    if (catalogRefreshOnce.current || !readSaleCatalogCache()) return undefined;
    catalogRefreshOnce.current = true;
    refreshCatalog();
    return undefined;
  }, [refreshCatalog]);

  useEffect(() => {
    const handler = () => { refreshCatalog(); };
    window.addEventListener('wpos:catalog-refresh', handler);
    return () => window.removeEventListener('wpos:catalog-refresh', handler);
  }, [refreshCatalog]);

  useEffect(() => {
    loadPendingKitchenOrders();
    window.addEventListener('wpos:kitchen-refresh', loadPendingKitchenOrders);
    return () => window.removeEventListener('wpos:kitchen-refresh', loadPendingKitchenOrders);
  }, [loadPendingKitchenOrders]);

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);
  const subCategories = useMemo(
    () => (activeParentId ? getChildCategories(categories, activeParentId) : []),
    [categories, activeParentId],
  );

  const selectCategory = useCallback((categoryId, parentId = null) => {
    setActiveCategoryId(categoryId);
    setActiveParentId(parentId);
    setProducts(getProductsForCategory(allProducts, categories, categoryId, parentId));
  }, [allProducts, categories]);

  const handleParentClick = useCallback((parentId) => {
    const children = getChildCategories(categories, parentId);
    if (children.length > 0) {
      selectCategory(parentId, parentId);
      return;
    }
    selectCategory(parentId, null);
  }, [categories, selectCategory]);

  const handleSubCategoryClick = useCallback((categoryId) => {
    selectCategory(categoryId, activeParentId);
  }, [activeParentId, selectCategory]);

  const openModal = async (name, data = {}) => {
    if (name === 'payment') {
      try {
        const permission = await getPaymentPermission();
        if (!permission?.status || !permission.data?.enabled) {
          showError('Bu cihazda ödeme alma kapalı. İzin buluttaki Cafe cihaz ayarlarından açılabilir.');
          return;
        }
      } catch {
        showError('Ödeme izni kontrol edilemedi. Tekrar deneyin.');
        return;
      }
    }
    setModalData(data);
    setActiveModal(name);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData({});
  };

  useEffect(() => {
    const payViews = new Set(['hizli-satis', 'masalar']);
    const handleSpaceToPay = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName));
      if (
        event.code !== 'Space'
        || event.repeat
        || event.defaultPrevented
        || event.ctrlKey
        || event.metaKey
        || event.altKey
        || isTyping
        || !payViews.has(currentView)
        || !cart?.addition?.id
        || activeModal
        || confirm
        || managedSession
        || managedTimer
        || isPaymentLoading
      ) return;
      event.preventDefault();
      openModal('payment');
    };
    window.addEventListener('keydown', handleSpaceToPay);
    return () => window.removeEventListener('keydown', handleSpaceToPay);
  }, [activeModal, cart?.addition?.id, confirm, currentView, isPaymentLoading, managedSession, managedTimer]);

  const handleProductClick = useCallback(async (prod) => {
    const isBundle = prod.is_bundle === 1 || prod.is_bundle === '1' || prod.is_bundle === true;
    let modalBundleGroups = bundleGroups;
    let modalBundleOptions = bundleOptions;
    let modalBundleFixedItems = bundleFixedItems;

    if (isBundle) {
      const productId = Number(prod.id);
      const hasConfig = modalBundleGroups.some((g) => Number(g.product_id) === productId)
        || modalBundleFixedItems.some((f) => Number(f.product_id) === productId);
      if (!hasConfig) {
        try {
          const catalog = await refreshSaleCatalog();
          modalBundleGroups = catalog.bundleGroups || [];
          modalBundleOptions = catalog.bundleOptions || [];
          modalBundleFixedItems = catalog.bundleFixedItems || [];
          setBundleGroups(modalBundleGroups);
          setBundleOptions(modalBundleOptions);
          setBundleFixedItems(modalBundleFixedItems);
        } catch {
          showError('Menü içeriği yüklenemedi. Katalog senkronunu deneyin.');
        }
      }
    }

    openModal(isBundle ? 'bundle' : 'quantity', {
      product: prod,
      bundleGroups: isBundle ? modalBundleGroups : undefined,
      bundleOptions: isBundle ? modalBundleOptions : undefined,
      bundleFixedItems: isBundle ? modalBundleFixedItems : undefined,
    });
  }, [bundleGroups, bundleOptions, bundleFixedItems, showError]);

  const handleSelectProduct = useCallback(async (productId, amount, selectedVariants = {}, finalPrice, note = '', bundleData = null) => {
    try {
      const tableId = (await window.env.getKey('table_id')) || 0;
      const payloadExtras = bundleData?.length ? { bundle_data: bundleData } : {};
      // Çevrimdışı adisyon ürün adını sunucudan çekemez; katalogdan taşıyoruz.
      const productName = allProducts.find((p) => p.id == productId)?.name || null;

      await runSaleTransaction(async () => {
        const additionId = await window.env.getKey('addition_id');
        let newAdditionId = additionId;

        if (additionId) {
          await saleApi('/app/addition/product/add', {
            method: 'POST',
            skipLoading: true,
            body: JSON.stringify({
              product_id: productId,
              product_name: productName,
              amount,
              addition_id: additionId,
              variants: selectedVariants,
              final_price: finalPrice,
              note: note || null,
              ...payloadExtras,
            }),
          });
        } else {
          const response = await saleApi('/app/addition/create', {
            method: 'POST',
            skipLoading: true,
            body: JSON.stringify({
              type: 1,
              product_id: productId,
              product_name: productName,
              amount,
              table_id: tableId,
              variants: selectedVariants,
              final_price: finalPrice,
              note: note || null,
              ...payloadExtras,
            }),
          });
          newAdditionId = response.data.addition_id;
          await window.env.addKey('addition_id', newAdditionId);
        }
        await getAdditionDetails(newAdditionId, { silent: true });
      });
      closeModal();
    } catch (error) {
      showError(error.message);
      throw error;
    }
  }, [getAdditionDetails, showError, closeModal, allProducts]);

  const handleCartItemAmountChange = useCallback(async (lineProductId, newAmount) => {
    try {
      const additionId = await window.env.getKey('addition_id');
      if (!additionId) return;

      await runSaleTransaction(async () => {
        if (newAmount <= 0) {
          await saleApi('/app/addition/product/remove', {
            method: 'POST',
            skipLoading: true,
            body: JSON.stringify({ product_id: lineProductId, addition_id: additionId }),
          });
        } else {
          await saleApi('/app/addition/product/change', {
            method: 'POST',
            skipLoading: true,
            body: JSON.stringify({ type: 'amount', product_id: lineProductId, amount: newAmount, addition_id: additionId }),
          });
        }
        await getAdditionDetails(additionId, { silent: true });
      });
    } catch (error) {
      showError(error.message);
    }
  }, [getAdditionDetails, showError]);

  const handleRemoveItem = useCallback((lineProductId) => {
    openConfirm({
      title: 'Ürünü sil',
      message: 'Bu ürünü adisyondan kalıcı olarak silmek istediğinize emin misiniz?',
      onConfirm: async () => {
        closeConfirm();
        try {
          const additionId = await window.env.getKey('addition_id');
          await runSaleTransaction(async () => {
            await saleApi('/app/addition/product/remove', {
              method: 'POST',
              skipLoading: true,
              body: JSON.stringify({ product_id: lineProductId, addition_id: additionId }),
            });
            await getAdditionDetails(additionId, { silent: true });
          });
        } catch (error) {
          showError(error.message);
        }
      },
    });
  }, [getAdditionDetails, showError, openConfirm, closeConfirm]);

  const clearAdditionState = useCallback(async () => {
    setCart(null);
    setIsEditMode(false);
    const additionId = await window.env.getKey('addition_id');
    if (additionId) await removeSplitBillPlan(additionId);
    await window.env.removeKey('is_edit_mode');
    await getAdditionDetails(null);
  }, [getAdditionDetails]);

  const handleLeaveTable = useCallback(async () => {
    setCart(null);
    setIsEditMode(false);
    await window.env.removeKey('table_id');
    await window.env.removeKey('table_id_name');
    await window.env.removeKey('table_category_name');
    await window.env.removeKey('addition_id');
    await window.env.removeKey('station_meta');
    await window.env.removeKey('is_edit_mode');
    setTableInfo(null);
    setSelectedStation(null);
  }, []);

  const handleCancelAddition = useCallback(() => {
    if (!cart?.addition?.id) return;
    if (cart?.timer || selectedStation?.timer || selectedStation?.session) {
      showError('Açık oturumu olan adisyon silinemez. Önce oturumu kapatın.');
      return;
    }

    const finishRemoval = async () => {
      setIsEditMode(false);
      await window.env.removeKey('is_edit_mode');
      setTablesRevision((value) => value + 1);
      if (tableInfo) await handleLeaveTable();
      else await clearAdditionState();
    };

    if (isEditMode) {
      openConfirm({
        title: 'Adisyonu iptal et',
        message: 'Bu düzenlenen adisyon iptal edilecek ve ürünler/ödemeler kaldırılacak.',
        onConfirm: async () => {
          closeConfirm();
          try {
            await saleApi('/app/addition/cancel', {
              method: 'POST',
              body: JSON.stringify({ addition_id: cart.addition.id, reason: 'Düzenleme modunda iptal edildi' }),
            });
            await finishRemoval();
          } catch (error) {
            showError(error.message);
          }
        },
      });
      return;
    }

    openConfirm({
      title: 'Adisyonu sil',
      message: 'Bu adisyon (ödemeler dahil) kalıcı olarak silinecek. Emin misiniz?',
      onConfirm: async () => {
        closeConfirm();
        try {
          await saleApi('/app/addition/remove', {
            method: 'POST',
            body: JSON.stringify({ addition_id: cart.addition.id }),
          });
          await finishRemoval();
        } catch (error) {
          showError(error.message);
        }
      },
    });
  }, [cart, selectedStation, tableInfo, isEditMode, clearAdditionState, handleLeaveTable, showError, openConfirm, closeConfirm]);

  const handleExitEditMode = useCallback(() => {
    openConfirm({
      title: 'Düzenlemeyi bırak',
      message: 'Adisyon eski haline geri yüklenecek. Emin misiniz?',
      tone: 'primary',
      confirmLabel: 'Evet, geri yükle',
      onConfirm: async () => {
        closeConfirm();
        try {
          const additionId = await window.env.getKey('addition_id');
          await saleApi('/app/addition/restore', {
            method: 'POST',
            body: JSON.stringify({ addition_id: additionId }),
          });
          await clearAdditionState();
        } catch (error) {
          showError(error.message);
        }
      },
    });
  }, [clearAdditionState, showError, openConfirm, closeConfirm]);

  // Masa seçildiğinde station_meta → seçili istasyon (masa tipi "Masayı Aç" için).
  useEffect(() => {
    let active = true;
    (async () => {
      const meta = await window.env.getKey('station_meta');
      if (!active) return;
      setSelectedStation(meta || null);
    })();
    return () => {
      active = false;
    };
  }, [tableInfo]);

  const activateTableFromGrid = useCallback(async (table, timer = null, { loadAddition = true } = {}) => {
    const categoryName = table.categoryName || 'Genel';
    const station = {
      id: table.localId || table.id,
      cloudId: table.cloudId,
      machineId: table.machineId,
      deviceType: table.deviceType,
      name: table.name,
      ipAddress: table.ipAddress,
      macAddress: table.macAddress,
      categoryName,
      session: table.session || null,
      timer: timer || null,
    };
    // Arayüzü ve cloud isteğini localStorage yazımını bekletmeden güncelle.
    void Promise.all([
      window.env.addKey('table_id', table.id),
      window.env.addKey('table_id_name', table.name),
      window.env.addKey('table_category_name', categoryName),
      window.env.addKey('station_meta', station),
    ]).catch(() => {});
    setSelectedStation({
      ...table,
      session: table.session || null,
      timer: timer || null,
    });
    setTableInfo({ name: table.name, category: categoryName });
    const additionId = timer?.additionId || table.additions?.[0]?.id || null;
    if (loadAddition && additionId) {
      await getAdditionDetails(additionId, { silent: true });
    } else if (loadAddition) {
      await getAdditionDetails(null);
    }
    return additionId;
  }, [getAdditionDetails]);

  const handleTableDoubleClick = useCallback(async (table, timer = null) => {
    try {
      const machineId = table.machineId || table.session?.machineId;
      const hasOpenSession = Boolean(
        table.session
        && machineId
        && table.session.status !== 'ended',
      );
      const runningTimer = Boolean(timer);

      if (isTimerTable(table) && !hasOpenSession && !runningTimer) {
        const deviceType = String(table.deviceType || table.device_type || '').toLowerCase() || null;
        if (Date.now() - tariffListRef.current.at > 60000) {
          const tariffsRes = await listTariffs();
          tariffListRef.current = { at: Date.now(), list: tariffsRes?.data || [] };
        }
        const list = filterTariffsByServiceType(tariffListRef.current.list, deviceType);
        const defaultTariff = list.find((item) => item.isDefault) || list[0];
        if (!defaultTariff?.id) {
          throw new Error('Bu servis tipi için tarife bulunamadı.');
        }
        const response = await startTableTimer(table.cloudId || table.id, {
          tariffId: Number(defaultTariff.id),
          startedAt: new Date().toISOString(),
          plannedMinutes: null,
        });
        if (!response?.status) {
          throw new Error(response?.message || 'Masa açılamadı');
        }
        setToast({ text: `${table.name} açıldı`, tone: 'success' });
        return;
      }

      const closeTimerForPayment = isTimerTable(table) && (runningTimer || hasOpenSession);
      let additionId = await activateTableFromGrid(table, timer, { loadAddition: !closeTimerForPayment && !hasOpenSession });
      if (closeTimerForPayment) {
        // Ödeme iznini kapanış isteği ile aynı anda hazırla; modal açılışında ikinci kez beklenmez.
        const paymentPermission = getPaymentPermission();
        lastAdditionDetailsRef.current = null;
        // Süre/adisyon: table-timers/stop — sessions/end degil. PC oturumu end_session ile kapanir.
        const response = await stopTableTimer(table.id, { endCommand: 'end_session' });
        if (!response?.status) {
          throw new Error(response?.message || 'Masa kapatılamadı.');
        }
        additionId = response?.data?.additionId || additionId;
        if (additionId) {
          await getAdditionDetails(additionId, { silent: true, force: true });
        }
        await paymentPermission.catch(() => {});
        setSelectedStation((current) => (current ? { ...current, timer: null, session: null } : null));
      } else if (hasOpenSession) {
        const paymentPermission = getPaymentPermission();
        lastAdditionDetailsRef.current = null;
        // Kenar sayacı olmayan (yalnızca client) oturum — DB'de kapat, istemciye komut yok.
        const response = await endSession(machineId, { lockAfter: false });
        if (!response?.status) {
          throw new Error(response?.message || 'Hesap kapatılamadı.');
        }
        additionId = response?.data?.receipt?.additionId
          || response?.data?.additionId
          || additionId;
        if (additionId) {
          await getAdditionDetails(additionId, { silent: true, force: true });
        }
        await paymentPermission.catch(() => {});
        setSelectedStation((current) => (current ? { ...current, session: null, timer: null } : null));
      }

      if (!additionId) {
        showError('Bu masada ödeme alınacak açık adisyon yok.');
        return;
      }
      await openModal('payment', { additionId });
    } catch (error) {
      showError(error.message || 'İşlem başarısız.');
    }
  }, [activateTableFromGrid, getAdditionDetails, openModal, showError]);

  const handleTableTransferred = useCallback(async (data) => {
    const table = data?.table;
    if (!table) return;
    await window.env.addKey('table_id', table.id);
    await window.env.addKey('table_id_name', table.name);
    const categoryName = table.category_name || 'Genel';
    await window.env.addKey('table_category_name', categoryName);
    setTableInfo({ name: table.name, category: categoryName });
    let targetStation = {
      id: table.id,
      cloudId: table.id,
      name: table.name,
      categoryId: table.category_id,
      categoryName,
      deviceType: 'table',
      session: null,
      timer: null,
    };
    try {
      const [computerRes, sessionRes, timerRes] = await Promise.all([
        listComputers(),
        listActiveSessions(),
        listTableTimers(),
      ]);
      const computer = (computerRes?.data || []).find(
        (item) => Number(item.cloudId || item.id) === Number(table.id)
      );
      const session = computer?.machineId
        ? (sessionRes?.data || []).find((item) => String(item.machineId) === String(computer.machineId))
        : null;
      const timers = timerRes?.data || {};
      const timer = timers[table.id] || timers[String(table.id)] || null;
      if (computer) targetStation = { ...computer, session: session || null, timer };
    } catch {
      // Taşıma tamamlandı; periyodik masa yenilemesi hedef cihaz bilgisini tamamlar.
    }
    await window.env.addKey('station_meta', targetStation);
    setSelectedStation(targetStation);
    if (data?.addition_id) await window.env.addKey('addition_id', data.addition_id);
    const additionId = data?.addition_id || await window.env.getKey('addition_id');
    if (additionId) {
      await getAdditionDetails(additionId, { silent: true });
    }
    setToast({ text: `${categoryName} / ${table.name} masasına taşındı`, tone: 'success' });
    setTablesRevision((value) => value + 1);
  }, [getAdditionDetails]);

  const handlePaymentSuccess = useCallback(async (isClosed) => {
    if (isClosed) {
      const additionId = await window.env.getKey('addition_id');
      if (additionId) await removeSplitBillPlan(additionId);
      closeModal();
      setIsEditMode(false);
      await window.env.removeKey('is_edit_mode');
      await handleLeaveTable();
      await getAdditionDetails(null);
      setTablesRevision((value) => value + 1);
      return;
    }
    const additionId = await window.env.getKey('addition_id');
    if (additionId) {
      await getAdditionDetails(additionId, { silent: true });
    }
  }, [handleLeaveTable, getAdditionDetails, closeModal]);

  const handleKitchenSend = useCallback(async () => {
    if (!cart?.addition?.id) return;
    try {
      await runSaleTransaction(async () => {
        const response = await saleApi('/app/kitchen/send', {
          method: 'POST',
          skipLoading: true,
          body: JSON.stringify({ addition_id: cart.addition.id }),
        });
        if (response.status && response.sent_count > 0) {
          if (response.should_print) {
            await saleApi('/app/kitchen/print', {
              method: 'POST',
              skipLoading: true,
              body: JSON.stringify({ addition_id: cart.addition.id }),
            });
          }
          loadPendingKitchenOrders();
        } else {
          showError('Mutfağa gönderilecek yeni ürün yok.');
        }
      });
    } catch (error) {
      showError(error.message);
    }
  }, [cart, showError, loadPendingKitchenOrders]);

  const handleSelectAddition = useCallback(async (additionId, editMode = false) => {
    if (editMode) setIsEditMode(true);
    else {
      setIsEditMode(false);
      await window.env.removeKey('is_edit_mode');
    }
    await getAdditionDetails(additionId, { silent: true });
    setCurrentView('hizli-satis');
  }, [getAdditionDetails]);

  const canTransferTable = Boolean(
    cart?.addition?.id
    && tableInfo,
  );
  const canTransferToTable = Boolean(
    cart?.addition?.id && !tableInfo && cart.products?.length > 0,
  );
  const hasActiveTableSession = useMemo(
    () => Boolean(cart?.timer || selectedStation?.timer || selectedStation?.session),
    [
      Boolean(cart?.timer),
      Boolean(selectedStation?.timer),
      Boolean(selectedStation?.session),
    ],
  );
  const timerActionLabel = useMemo(() => {
    if (!tableInfo || !isTimerTable(selectedStation)) return null;
    return hasActiveTableSession ? 'Oturumu yönet' : 'Masayı aç';
  }, [
    tableInfo,
    hasActiveTableSession,
    selectedStation?.deviceType,
    selectedStation?.device_type,
  ]);

  toolbarActionsRef.current = {
    cart,
    selectedStation,
    openModal,
    setManagedSession,
    setManagedTimer,
  };

  const handleToolbarTransfer = useCallback(() => {
    toolbarActionsRef.current.openModal('transferTable');
  }, []);

  const handleToolbarTimer = useCallback(() => {
    const {
      cart: liveCart,
      selectedStation: liveStation,
      openModal: open,
      setManagedSession: setSession,
      setManagedTimer: setTimer,
    } = toolbarActionsRef.current;
    const timer = liveCart?.timer || liveStation?.timer;
    if (timer) {
      if (liveStation?.session) {
        setSession({ computer: liveStation, session: liveStation.session });
      } else {
        setTimer({
          ...liveStation,
          id: liveStation.cloudId || liveStation.id,
          timer,
        });
      }
    } else {
      open('startTable');
    }
  }, []);

  const cartTotals = useMemo(() => computeCartTotals(cart), [cart]);

  return (
    <div className="sale-shell sale-win11-shell flex h-full min-h-0 flex-col overflow-hidden">
      <SaleToolbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingKitchenOrders={pendingKitchenOrders}
        pendingLoginRequests={loginRequests.requests.length}
        tableName={tableInfo?.name ?? null}
        tableCategory={tableInfo?.category ?? null}
        onLeaveTable={tableInfo ? handleLeaveTable : null}
        canTransfer={canTransferTable}
        onTransferTable={handleToolbarTransfer}
        timerActionLabel={timerActionLabel}
        onTimerAction={tableInfo ? handleToolbarTimer : null}
      />

      <NetworkAlert networkStatus={networkStatus} />

      <div className="pointer-events-none fixed inset-x-0 top-14 z-[56] flex justify-center px-4">
        <SaleToast
          message={toast?.text}
          tone={toast?.tone}
          onDismiss={clearToast}
          className="pointer-events-auto w-full max-w-md"
        />
      </div>

      <SaleOverlayLoader open={isApiLoading} />

      <div className="sale-win11-layout relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <main className="sale-win11-main min-h-0 flex-1 overflow-y-auto">
          {currentView === 'hizli-satis' && (
            <ProductGrid
              rootCategories={rootCategories}
              subCategories={subCategories}
              products={products}
              activeParentId={activeParentId}
              activeCategoryId={activeCategoryId}
              onParentClick={handleParentClick}
              onSubCategoryClick={handleSubCategoryClick}
              onProductClick={handleProductClick}
              onOpenAdditions={() => openModal('openAdditions')}
              onCreateNewAddition={() => openModal('createNewAddition')}
              onEditAddition={() => openModal('editAddition')}
              variantGroups={variantGroups}
              bundleGroups={bundleGroups}
              tableInfo={tableInfo}
            />
          )}
          {currentView === 'masalar' && (
            <TablesView
              getAdditionDetails={getAdditionDetails}
              setCurrentView={setCurrentView}
              onError={showError}
              onTransferred={handleTableTransferred}
              focusTableId={tableInfo ? (selectedStation?.cloudId || selectedStation?.id || cart?.table?.id) : null}
              focusCategoryName={tableInfo?.category ?? null}
              loginRequests={loginRequests.requests}
              loginRequestBusyId={loginRequests.busyId}
              onApproveLoginRequest={async (request) => {
                await loginRequests.approve(request);
                setTablesRevision((value) => value + 1);
              }}
              onRejectLoginRequest={async (request) => {
                await loginRequests.reject(request);
                setTablesRevision((value) => value + 1);
              }}
              refreshKey={tablesRevision}
              loginRequestDurationLabel={loginRequests.durationLabel}
              onManageSession={(computer, session) => setManagedSession({ computer, session })}
              onTableDoubleClick={handleTableDoubleClick}
              onStartTable={(table) => {
                setSelectedStation(table);
                openModal('startTable', { returnToTables: true });
              }}
            />
          )}
          {currentView === 'mutfak' && (
            <KitchenView
              onStatusChange={loadPendingKitchenOrders}
              onError={showError}
              onConfirm={openConfirm}
            />
          )}
        </main>

        {currentView !== 'mutfak' && (
          <Cart
            cart={cart}
            tableInfo={tableInfo}
            cartTotals={cartTotals}
            variantGroups={variantGroups}
            variants={variants}
            isEditMode={isEditMode}
            onItemAmountChange={handleCartItemAmountChange}
            onRemoveItem={handleRemoveItem}
            onCancelAddition={handleCancelAddition}
            deletionBlocked={Boolean(cart?.timer || selectedStation?.timer || selectedStation?.session)}
            onExitEditMode={handleExitEditMode}
            onPriceChangeClick={(prod) => openModal('priceChange', { product: prod })}
            onAmountClick={(prod) => openModal('amountChange', { product: prod })}
            onCustomerClick={() => openModal('customer')}
            onSettingsClick={() => openModal('settings')}
            onDiscountClick={canApplyDiscount ? () => openModal('discount') : undefined}
            onPaymentClick={() => openModal('payment')}
            onKitchenSend={handleKitchenSend}
            isPaymentLoading={isPaymentLoading}
            canTransferToTable={canTransferToTable}
            onTransferToTable={() => openModal('transferTable')}
            onOperationHistoryClick={() => openModal('operationHistory')}
            onPrintSuccess={(text) => setToast({ text, tone: 'success' })}
            onPrintError={showError}
          />
        )}
      </div>

      {activeModal === 'quantity' && modalData.product && (
        <VariantModal
          product={modalData.product}
          onClose={closeModal}
          onSubmit={handleSelectProduct}
          variantGroups={variantGroups}
          variants={variants}
        />
      )}

      {activeModal === 'bundle' && modalData.product && (
        <BundleModal
          product={modalData.product}
          onClose={closeModal}
          onSubmit={handleSelectProduct}
          bundleGroups={modalData.bundleGroups ?? bundleGroups}
          bundleOptions={modalData.bundleOptions ?? bundleOptions}
          bundleFixedItems={modalData.bundleFixedItems ?? bundleFixedItems}
          allProducts={allProducts}
        />
      )}

      {activeModal === 'payment' && (cart?.addition?.id || modalData?.additionId) && (
        <PaymentModal
          additionId={cart?.addition?.id || modalData.additionId}
          cartTotals={cartTotals}
          onClose={closeModal}
          paymentMethods={paymentMethods}
          onPaymentSuccess={handlePaymentSuccess}
          onError={showError}
          onConfirm={openConfirm}
          onBusyChange={setIsPaymentLoading}
        />
      )}

      {activeModal === 'amountChange' && modalData.product && cart?.addition?.id && (
        <AmountChangeModal
          product={modalData.product}
          additionId={cart.addition.id}
          onClose={closeModal}
          onUpdated={(id) => getAdditionDetails(id, { silent: true })}
          onError={showError}
        />
      )}

      {activeModal === 'discount' && cart?.addition?.id && (
        <DiscountModal
          addition={cart.addition}
          products={cart.products}
          onClose={closeModal}
          onUpdated={(id) => getAdditionDetails(id, { silent: true })}
          onError={showError}
        />
      )}

      {activeModal === 'priceChange' && modalData.product && cart?.addition?.id && (
        <PriceChangeModal
          product={modalData.product}
          additionId={cart.addition.id}
          onClose={closeModal}
          onUpdated={(id) => getAdditionDetails(id, { silent: true })}
          onError={showError}
        />
      )}

      {activeModal === 'customer' && cart?.addition?.id && (
        <CustomerModal
          additionId={cart.addition.id}
          onClose={closeModal}
          onError={showError}
          onConfirm={openConfirm}
        />
      )}

      {activeModal === 'transferTable' && cart?.addition?.id && (canTransferTable || canTransferToTable) && (
        <TransferTableModal
          additionId={cart.addition.id}
          currentTableId={tableInfo ? cart.table?.id : null}
          currentTableName={tableInfo?.name}
          currentCategoryName={tableInfo?.category}
          sourceDeviceType={selectedStation?.deviceType || selectedStation?.device_type || null}
          sourceHasActiveSession={Boolean(selectedStation?.session || cart?.timer || selectedStation?.timer)}
          isQuickSale={canTransferToTable}
          onClose={closeModal}
          onTransferred={handleTableTransferred}
          onError={showError}
        />
      )}

      {activeModal === 'operationHistory' && cart?.addition?.id && (
        <OperationHistoryModal
          history={cart.operation_history || []}
          variantGroups={variantGroups}
          variants={variants}
          onClose={closeModal}
        />
      )}

      {activeModal === 'settings' && cart?.addition && (
        <AdditionSettingsModal
          addition={cart.addition}
          onClose={closeModal}
          onUpdated={(id) => getAdditionDetails(id, { silent: true })}
          onError={showError}
        />
      )}

      {activeModal === 'openAdditions' && (
        <OpenAdditionsModal
          onClose={closeModal}
          onSelectAddition={(id) => handleSelectAddition(id, false)}
        />
      )}

      {activeModal === 'startTable' && selectedStation && (
        <StartTableModal
          tableId={selectedStation.cloudId || selectedStation.id}
          tableName={tableInfo?.name || selectedStation.name}
          deviceType={String(selectedStation.deviceType || selectedStation.device_type || '').toLowerCase() || null}
          isPc={String(selectedStation.deviceType || selectedStation.device_type || '').toLowerCase() === 'pc'}
          onClose={closeModal}
          onError={showError}
          onStarted={async (additionId) => {
            closeModal();
            // Masalar ekranından açıldığında da adisyon aynı anda güncel kalmalı.
            // Önceki kod bu akışta detayı tamamen atlıyordu.
            if (additionId) await getAdditionDetails(additionId, { force: true });
            setTablesRevision((value) => value + 1);
            setToast({ text: 'Masa açıldı', tone: 'success' });
          }}
        />
      )}

      {managedTimer && (
        <TimerTableModal
          table={managedTimer}
          onClose={() => setManagedTimer(null)}
          onChanged={async () => {
            const timerRes = await listTableTimers();
            const timer = timerRes?.data?.[managedTimer.id] || timerRes?.data?.[String(managedTimer.id)];
            if (timer) setManagedTimer((current) => current ? { ...current, timer } : null);
            else setManagedTimer(null);
            if (cart?.addition?.id) await getAdditionDetails(cart.addition.id, { silent: true });
            setTablesRevision((value) => value + 1);
          }}
          onError={showError}
        />
      )}

      {activeModal === 'createNewAddition' && (
        <CreateNewAdditionModal
          onClose={closeModal}
          onAdditionCreated={(id) => handleSelectAddition(id, false)}
          onError={showError}
        />
      )}

      {activeModal === 'editAddition' && (
        <EditAdditionModal
          onClose={closeModal}
          onSelectAddition={handleSelectAddition}
          onError={showError}
          onConfirm={openConfirm}
        />
      )}

      {managedSession && (
        <SessionActionsModal
          computer={managedSession.computer}
          session={managedSession.session}
          onClose={() => setManagedSession(null)}
          onChanged={async () => {
            await refreshManagedSession();
            const additionId = cartRef.current?.addition?.id;
            if (additionId) await getAdditionDetails(additionId, { silent: true });
            setTablesRevision((value) => value + 1);
          }}
          onClosedWithReceipt={async (receipt) => {
            setManagedSession(null);
            setToast({ text: `${receipt.computerName || 'Masa'} hesabı kapatıldı · ${receipt.totalAmount || 0} ₺`, tone: 'success' });
            // Süre satırı kapanışta adisyona eklendi; açık adisyon görünüyorsa tazele.
            const refreshId = receipt.additionId || cart?.addition?.id;
            if (refreshId) await getAdditionDetails(refreshId, { silent: true });
            setTablesRevision((value) => value + 1);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        onConfirm={() => { confirm?.onConfirm?.(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
