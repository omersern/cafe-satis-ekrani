import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSettings, getTablesState,
  queueCommand, wakeComputer,
} from '../../lib/api';
import { saleApi } from '../../lib/saleApi';
import {
  canTransferFromTable,
  evaluateTransferTarget,
  getTableAdditionId,
  tableHasActiveSession,
} from '../../lib/tableTransfer';
import { saleBtn } from './ui/SaleModal';
import TimerTableModal from './modals/TimerTableModal';
import ScreenViewerModal from '../ScreenViewerModal';

const DRAG_THRESHOLD_PX = 8;
const CATEGORY_SWITCH_MS = 350;

function findTableTileAt(sourceId, clientX, clientY) {
  const tiles = document.querySelectorAll('[data-table-id]');
  let match = null;
  tiles.forEach((tile) => {
    const id = tile.getAttribute('data-table-id');
    if (id == null || String(id) === String(sourceId)) return;
    const rect = tile.getBoundingClientRect();
    if (
      clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
    ) {
      match = tile;
    }
  });
  return match;
}

function findCategoryAt(clientX, clientY) {
  const pills = document.querySelectorAll('[data-table-category-id]');
  let match = null;
  pills.forEach((pill) => {
    const rect = pill.getBoundingClientRect();
    if (
      clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
    ) {
      match = pill.getAttribute('data-table-category-id');
    }
  });
  return match;
}

function copyRenderedStyles(sourceNode, targetNode) {
  const computed = window.getComputedStyle(sourceNode);
  targetNode.style.backgroundColor = computed.backgroundColor;
  targetNode.style.backgroundImage = computed.backgroundImage;
  targetNode.style.color = computed.color;
  targetNode.style.borderRadius = computed.borderRadius;
  targetNode.style.boxShadow = computed.boxShadow;
  targetNode.style.outline = computed.outline;
  targetNode.style.outlineOffset = computed.outlineOffset;
  targetNode.style.opacity = computed.opacity;
  if (computed.borderWidth !== '0px') {
    targetNode.style.border = `${computed.borderWidth} ${computed.borderStyle} ${computed.borderColor}`;
  }
}

function copyRenderedTileStyles(sourceEl, clone) {
  copyRenderedStyles(sourceEl, clone);
  const selectors = '.sale-table-tile-name, .sale-table-tile-status, button, span';
  const sourceNodes = sourceEl.querySelectorAll(selectors);
  const cloneNodes = clone.querySelectorAll(selectors);
  sourceNodes.forEach((sourceNode, index) => {
    if (cloneNodes[index]) copyRenderedStyles(sourceNode, cloneNodes[index]);
  });
}

function createTableDragClone(sourceEl, clientX, clientY) {
  const rect = sourceEl.getBoundingClientRect();
  const clone = sourceEl.cloneNode(true);
  clone.classList.add('sale-table-drag-clone');
  clone.removeAttribute('data-table-id');
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('button').forEach((btn) => {
    btn.setAttribute('tabindex', '-1');
    btn.setAttribute('aria-hidden', 'true');
  });

  copyRenderedTileStyles(sourceEl, clone);

  clone.style.position = 'fixed';
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '95';
  clone.style.transition = 'none';
  clone.style.willChange = 'transform';
  clone.style.boxSizing = 'border-box';

  document.body.appendChild(clone);

  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  moveTableDragClone(clone, rect, clientX, clientY, offsetX, offsetY);
  return { clone, rect, offsetX, offsetY };
}

function moveTableDragClone(clone, rect, clientX, clientY, offsetX, offsetY) {
  clone.style.transform = `translate3d(${clientX - offsetX - rect.left}px, ${clientY - offsetY - rect.top}px, 0)`;
}

function indexTimers(raw) {
  const map = {};
  const source = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
  source.forEach((timer) => {
    if (!timer) return;
    const key = timer.tableId ?? timer.stationId ?? timer.table_id ?? timer.station_id;
    if (key == null) return;
    map[key] = timer;
    map[String(key)] = timer;
  });
  if (!Array.isArray(raw) && raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([key, timer]) => {
      if (!timer || typeof timer !== 'object') return;
      map[key] = timer;
    });
  }
  return map;
}

function elapsedLabel(timer) {
  if (!timer?.startedAt) return '00:00';
  const pauseNow = timer.pausedAt ? Math.max(0, (Date.now() - new Date(timer.pausedAt).getTime()) / 1000) : 0;
  const secs = Math.max(0, Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000 - Number(timer.pausedSeconds || 0) - pauseNow));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** POS'tan uzatma sonrasi gecikmis session kaydina karsi: sayac akiyorsa hesap beklemiyor. */
function isAwaitingPayment(session, timer) {
  if (session?.status !== 'awaiting_payment') return false;
  if (timer && !timer.pausedAt) return false;
  return true;
}

// İstemci ~5 sn'de bir register eder. Masa listesi anlık yenilenmediği için
// lastSeen anlık yaşlanır; eşik bir kaç kaçırılmış nabzı tolere eder.
const OFFLINE_AFTER_MS = 45000;
function isClientOnline(table) {
  if (!table.machineId || !table.lastSeenAt) return false;
  return Date.now() - new Date(table.lastSeenAt).getTime() < OFFLINE_AFTER_MS;
}

function canRunBulkAction(table, action) {
  return action === 'wake'
    ? Boolean(table.macAddress) && !isClientOnline(table)
    : Boolean(table.machineId) && isClientOnline(table);
}

function isTimerTable(table) {
  const type = String(table?.deviceType || '').toLowerCase().replace(/[\s_-]/g, '');
  return Boolean(type) && !['masa', 'table', 'genel'].includes(type);
}

/**
 * posv2 TablesView UI + cafe POSM istasyonları.
 * Seçim → window.env table_* + getAdditionDetails (Sale posv2).
 * PC/PS: deviceType taşınır (oturum ikonu).
 * Süre sayaçlı masada açık adisyon varsa seçince onu yükler.
 */
export default function TablesView({
  getAdditionDetails,
  setCurrentView,
  onError,
  onTransferred,
  loginRequests = [],
  loginRequestBusyId,
  onApproveLoginRequest,
  onRejectLoginRequest,
  refreshKey = 0,
  loginRequestDurationLabel = (minutes) => `${minutes} dk`,
  onManageSession,
  onStartTable,
  onTableDoubleClick,
  focusTableId = null,
  focusCategoryName = null,
}) {
  const [tableCategories, setTableCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeTableCat, setActiveTableCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allStations, setAllStations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [timers, setTimers] = useState({});
  const [openAdditions, setOpenAdditions] = useState([]);
  const [, setTick] = useState(0);
  const [manageTimer, setManageTimer] = useState(null);
  const [wolMenu, setWolMenu] = useState(null);
  const [screenViewerComputer, setScreenViewerComputer] = useState(null);
  const [pcActionBusy, setPcActionBusy] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(() => new Set());
  const [bulkActionBusy, setBulkActionBusy] = useState(null);
  const [bulkResult, setBulkResult] = useState('');
  const [autoOpenSale, setAutoOpenSale] = useState(true);
  const longPressRef = useRef(null);
  const suppressClickRef = useRef(false);
  const pendingSelectRef = useRef(null);
  const dragRef = useRef(null);
  const overTileRef = useRef(null);
  const categorySwitchTimerRef = useRef(null);
  const transferringRef = useRef(false);
  const refreshRef = useRef(null);
  const loadTablesRef = useRef(null);
  const gridRef = useRef(null);
  const timersRef = useRef(timers);
  const tablesRef = useRef(tables);
  const activeTableCatRef = useRef(activeTableCat);
  const allStationsRef = useRef(allStations);
  const sessionsRef = useRef(sessions);
  const openAdditionsRef = useRef(openAdditions);
  const focusAppliedRef = useRef(false);
  const lastFocusTableIdRef = useRef(null);
  timersRef.current = timers;
  tablesRef.current = tables;
  activeTableCatRef.current = activeTableCat;
  allStationsRef.current = allStations;
  sessionsRef.current = sessions;
  openAdditionsRef.current = openAdditions;

  useEffect(() => {
    getSettings()
      .then((response) => setAutoOpenSale(String(response?.data?.auto_open_sale_on_table_select) !== 'false'))
      .catch(() => {});
  }, []);

  const pcTables = useMemo(() => tables.filter((table) => table.deviceType === 'pc'), [tables]);
  const selectedPcTables = useMemo(
    () => pcTables.filter((table) => bulkSelected.has(table.id)),
    [pcTables, bulkSelected]
  );
  const bulkEligibleCounts = useMemo(() => ({
    wake: selectedPcTables.filter((table) => canRunBulkAction(table, 'wake')).length,
    shutdown: selectedPcTables.filter((table) => canRunBulkAction(table, 'shutdown')).length,
    restart: selectedPcTables.filter((table) => canRunBulkAction(table, 'restart')).length,
  }), [selectedPcTables]);

  const openBulkActions = () => {
    setBulkSelected(new Set());
    setBulkResult('');
    setBulkActionsOpen(true);
  };

  const closeBulkActions = () => {
    if (bulkActionBusy) return;
    setBulkActionsOpen(false);
  };

  const toggleBulkTable = (id) => {
    setBulkResult('');
    setBulkSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllBulkTables = () => {
    setBulkResult('');
    setBulkSelected(
      bulkSelected.size === pcTables.length ? new Set() : new Set(pcTables.map((table) => table.id))
    );
  };

  const runBulkAction = async (action) => {
    if (bulkActionBusy || selectedPcTables.length === 0) return;
    const eligible = selectedPcTables.filter((table) => canRunBulkAction(table, action));
    if (eligible.length === 0) {
      setBulkResult(action === 'wake'
        ? 'Seçilen istemciler arasında uyandırılabilecek çevrimdışı bilgisayar yok.'
        : 'Seçilen istemciler arasında çevrimiçi bilgisayar yok.');
      return;
    }

    const label = action === 'wake' ? 'uyandırmak' : action === 'shutdown' ? 'kapatmak' : 'yeniden başlatmak';
    if (!window.confirm(`${eligible.length} bilgisayarı ${label} istediğinize emin misiniz?`)) return;

    setBulkActionBusy(action);
    setBulkResult('');
    const results = await Promise.allSettled(eligible.map(async (table) => {
      const response = action === 'wake'
        ? await wakeComputer(table)
        : await queueCommand({ machineId: table.machineId, commandType: action });
      if (!response?.status) throw new Error(response?.message || 'İşlem gönderilemedi');
    }));
    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    const skipped = selectedPcTables.length - eligible.length;
    setBulkResult(
      `${succeeded} bilgisayara komut gönderildi${skipped ? `, uygun olmayan ${skipped} bilgisayar atlandı` : ''}${failed ? `, ${failed} işlem başarısız oldu` : ''}.`
    );
    setBulkActionBusy(null);
  };

  useEffect(() => {
    if (!bulkActionsOpen) return undefined;
    const keydown = (event) => { if (event.key === 'Escape') closeBulkActions(); };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [bulkActionsOpen, bulkActionBusy]);

  const closeWolMenu = useCallback(() => setWolMenu(null), []);
  useEffect(() => {
    if (!wolMenu) return undefined;
    const close = () => closeWolMenu();
    const keydown = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', keydown);
    };
  }, [wolMenu, closeWolMenu]);

  const openWolMenu = (table, x, y) => {
    if (table.deviceType !== 'pc') return;
    setWolMenu({
      table,
      x: Math.max(8, Math.min(x, window.innerWidth - 256)),
      y: Math.max(8, Math.min(y, window.innerHeight - 210)),
    });
  };

  const startLongPress = (event, table) => {
    if (table.deviceType !== 'pc' || event.pointerType === 'mouse') return;
    if (dragRef.current?.started) return;
    clearTimeout(longPressRef.current);
    const { clientX, clientY } = event;
    longPressRef.current = setTimeout(() => {
      if (dragRef.current?.started) return;
      suppressClickRef.current = table.id;
      openWolMenu(table, clientX, clientY);
    }, 600);
  };
  const cancelLongPress = () => clearTimeout(longPressRef.current);

  const getTimerFor = useCallback((table) => {
    if (!table) return null;
    const map = timersRef.current || {};
    return map[table.id] || map[String(table.id)] || null;
  }, []);

  const evaluateDropTarget = useCallback((source, target) => {
    if (!source || !target) return { disabled: true };
    return evaluateTransferTarget({
      sourceTableId: source.id,
      sourceDeviceType: source.deviceType,
      sourceHasActiveSession: tableHasActiveSession(source, getTimerFor(source)),
      target,
      targetHasActiveSession: tableHasActiveSession(target, getTimerFor(target)),
    });
  }, [getTimerFor]);

  const clearDropHighlights = useCallback(() => {
    document.querySelectorAll('[data-table-id]').forEach((el) => {
      el.classList.remove('sale-table-drop-ok', 'sale-table-drop-blocked', 'sale-table-drop-dim');
      delete el.dataset.dropHover;
    });
    overTileRef.current = null;
  }, []);

  const prepareDropTargets = useCallback((source) => {
    document.querySelectorAll('[data-table-id]').forEach((el) => {
      const id = el.getAttribute('data-table-id');
      if (id == null || String(id) === String(source.id)) return;
      const target = tablesRef.current.find((item) => String(item.id) === String(id));
      if (!target) return;
      if (evaluateDropTarget(source, target).disabled) {
        el.classList.add('sale-table-drop-dim');
      }
    });
  }, [evaluateDropTarget]);

  const clearCategorySwitchTimer = useCallback(() => {
    clearTimeout(categorySwitchTimerRef.current);
    categorySwitchTimerRef.current = null;
  }, []);

  const setOverCategory = useCallback((categoryId) => {
    document.querySelectorAll('[data-table-category-id]').forEach((el) => {
      const id = el.getAttribute('data-table-category-id');
      el.classList.toggle('sale-category-drop-hover', categoryId != null && String(id) === String(categoryId));
    });
  }, []);

  const switchCategoryForDrag = useCallback((categoryId, source) => {
    if (Number(categoryId) === Number(activeTableCatRef.current)) return;
    loadTablesRef.current?.(
      categoryId,
      allStationsRef.current,
      sessionsRef.current,
      openAdditionsRef.current,
    );
    activeTableCatRef.current = categoryId;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (dragRef.current?.started) prepareDropTargets(source);
      });
    });
  }, [prepareDropTargets]);

  const setOverTile = useCallback((tile, dropOk) => {
    const prev = overTileRef.current;
    const prevOk = prev?.dataset?.dropHover;
    const nextOk = tile ? (dropOk ? 'ok' : 'blocked') : null;
    if (prev === tile && prevOk === nextOk) return;

    if (prev) {
      prev.classList.remove('sale-table-drop-ok', 'sale-table-drop-blocked');
      delete prev.dataset.dropHover;
    }
    overTileRef.current = tile;
    if (!tile) return;
    tile.classList.remove('sale-table-drop-dim');
    tile.dataset.dropHover = nextOk;
    tile.classList.add(dropOk ? 'sale-table-drop-ok' : 'sale-table-drop-blocked');
  }, []);

  const cleanupDrag = useCallback((current) => {
    current?.clone?.remove();
    gridRef.current?.classList.remove('sale-tables-dragging');
    document.body.classList.remove('sale-tables-dragging');
    clearCategorySwitchTimer();
    setOverCategory(null);
    clearDropHighlights();
  }, [clearCategorySwitchTimer, clearDropHighlights, setOverCategory]);

  const finishTransfer = useCallback(async (source, target, additionId) => {
    if (transferringRef.current) return;
    transferringRef.current = true;
    try {
      const response = await saleApi('/app/addition/transfer', {
        method: 'POST',
        body: JSON.stringify({
          addition_id: additionId,
          target_table_id: target.id,
        }),
      });
      if (!response.status) {
        throw new Error(response.message || 'Taşıma başarısız.');
      }
      await onTransferred?.(response.data);
      refreshRef.current?.();
    } catch (error) {
      onError?.(error.message || 'Adisyon taşınamadı.');
    } finally {
      transferringRef.current = false;
    }
  }, [onError, onTransferred]);

  const beginDragAttempt = (event, table) => {
    if (event.button != null && event.button !== 0) return;
    if (transferringRef.current || bulkActionsOpen || wolMenu || dragRef.current) return;
    if (event.target?.closest?.('[data-table-action]')) return;

    const timer = getTimerFor(table);
    if (!canTransferFromTable(table, timer)) return;
    const additionId = getTableAdditionId(table, timer);
    if (!additionId) return;

    const sourceEl = event.currentTarget;
    const pointerId = event.pointerId;
    const originX = event.clientX;
    const originY = event.clientY;

    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const current = dragRef.current;
      if (!current) return;

      const dx = moveEvent.clientX - originX;
      const dy = moveEvent.clientY - originY;
      if (!current.started) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        moveEvent.preventDefault();
        clearTimeout(longPressRef.current);
        suppressClickRef.current = table.id;
        closeWolMenu();

        const dragVisual = createTableDragClone(sourceEl, moveEvent.clientX, moveEvent.clientY);
        gridRef.current?.classList.add('sale-tables-dragging');
        document.body.classList.add('sale-tables-dragging');
        prepareDropTargets(table);

        current.started = true;
        current.clone = dragVisual.clone;
        current.rect = dragVisual.rect;
        current.offsetX = dragVisual.offsetX;
        current.offsetY = dragVisual.offsetY;
        dragRef.current = current;
      } else {
        moveEvent.preventDefault();
        moveTableDragClone(
          current.clone,
          current.rect,
          moveEvent.clientX,
          moveEvent.clientY,
          current.offsetX,
          current.offsetY,
        );
      }

      current.lastX = moveEvent.clientX;
      current.lastY = moveEvent.clientY;

      const overTile = findTableTileAt(table.id, moveEvent.clientX, moveEvent.clientY);
      if (overTile) {
        current.pendingCategoryId = null;
        clearCategorySwitchTimer();
        setOverCategory(null);
        const overId = overTile.getAttribute('data-table-id');
        const overTarget = tablesRef.current.find((item) => String(item.id) === String(overId)) || null;
        const dropOk = overTarget && !evaluateDropTarget(table, overTarget).disabled;
        setOverTile(overTile, dropOk);
        current.overTarget = overTarget;
        return;
      }

      const categoryId = findCategoryAt(moveEvent.clientX, moveEvent.clientY);
      if (categoryId) {
        setOverTile(null);
        current.overTarget = null;
        setOverCategory(categoryId);
        if (Number(categoryId) !== Number(activeTableCatRef.current)) {
          if (current.pendingCategoryId !== categoryId) {
            current.pendingCategoryId = categoryId;
            clearCategorySwitchTimer();
            const targetCategoryId = categoryId;
            categorySwitchTimerRef.current = setTimeout(() => {
              categorySwitchTimerRef.current = null;
              const live = dragRef.current;
              if (!live?.started) return;
              const stillOver = findCategoryAt(live.lastX, live.lastY);
              if (stillOver && String(stillOver) === String(targetCategoryId)) {
                switchCategoryForDrag(targetCategoryId, table);
              }
            }, CATEGORY_SWITCH_MS);
          }
        } else {
          current.pendingCategoryId = null;
          clearCategorySwitchTimer();
        }
        return;
      }

      current.pendingCategoryId = null;
      clearCategorySwitchTimer();
      setOverCategory(null);
      setOverTile(null);
      current.overTarget = null;
    };

    const onEnd = async (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onEnd);

      const current = dragRef.current;
      dragRef.current = null;
      cleanupDrag(current);

      if (!current?.started) return;
      const target = current.overTarget;
      if (!target) return;
      if (evaluateDropTarget(current.source, target).disabled) {
        onError?.('Bu masaya taşıma yapılamaz.');
        return;
      }
      await finishTransfer(current.source, target, current.additionId);
    };

    dragRef.current = {
      source: table,
      additionId,
      started: false,
      sourceEl,
      overTarget: null,
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointercancel', onEnd);
  };

  const sendWake = async () => {
    if (!wolMenu?.table || pcActionBusy) return;
    setPcActionBusy(true);
    try {
      const response = await wakeComputer(wolMenu.table);
      if (!response?.status) throw new Error(response?.message || 'WOL paketi gönderilemedi');
      closeWolMenu();
    } catch (error) {
      onError?.(error.message || 'WOL paketi gönderilemedi');
    } finally {
      setPcActionBusy(false);
    }
  };

  const sendPowerCommand = async (commandType) => {
    if (!wolMenu?.table || pcActionBusy) return;
    setPcActionBusy(true);
    try {
      const response = await queueCommand({ machineId: wolMenu.table.machineId, commandType });
      if (!response?.status) throw new Error(response?.message || 'Bilgisayar komutu gönderilemedi');
      closeWolMenu();
    } catch (error) {
      onError?.(error.message || 'Bilgisayar komutu gönderilemedi');
    } finally {
      setPcActionBusy(false);
    }
  };

  // Saniyelik tick: süre sayaçları + istemci online/offline durumu canlı güncellensin.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mapToTableTiles = useCallback((computers, activeSessions, additions, categoryId) => {
    const sessionsByMachine = new Map();
    (activeSessions || []).forEach((session) => {
      if (session.machineId) sessionsByMachine.set(String(session.machineId), session);
    });

    let list = computers || [];
    if (categoryId != null) {
      list = list.filter((c) => Number(c.categoryId) === Number(categoryId));
    }

    return list.map((c) => {
      const stationId = String(c.cloudId || c.id);
      const sessionsOnStation = (activeSessions || []).filter(
        (item) => String(item.stationId) === stationId
      );
      // Normal kayıtta hem masa hem fiziksel PC eşleşir. Eski hatalı taşıma
      // kayıtlarında station_id başka masaya geçmiş olsa bile fiziksel PC'de
      // açık oturum varsa masa boş gösterilmemeli.
      const session = sessionsOnStation.find(
        (item) => c.machineId && String(item.machineId) === String(c.machineId)
      ) || sessionsOnStation[0]
        || (c.machineId ? sessionsByMachine.get(String(c.machineId)) : null);
      return {
        id: c.cloudId || c.id,
        localId: c.id,
        name: c.name,
        machineId: c.machineId,
        deviceType: c.deviceType || 'table',
        ipAddress: c.ipAddress,
        macAddress: c.macAddress,
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        cloudId: c.cloudId,
        sort: c.sort,
        lastSeenAt: c.lastSeenAt,
        status: c.status,
        additions: (additions || []).filter((addition) => {
          const tableId = addition.table_id ?? addition.table?.id;
          return Number(tableId) === Number(c.cloudId || c.id);
        }),
        session,
      };
    });
  }, []);

  const loadTables = useCallback(
    async (categoryId, computers, activeSessions, additions) => {
      setTables(mapToTableTiles(computers || allStations, activeSessions || sessions, additions || openAdditions, categoryId));
      setActiveTableCat(categoryId);
    },
    [allStations, sessions, openAdditions, mapToTableTiles]
  );
  loadTablesRef.current = loadTables;

  const resolveFocusCategoryId = useCallback((computers, categories) => {
    if (!focusTableId && !focusCategoryName) return null;

    if (focusTableId) {
      const station = (computers || []).find((c) =>
        String(c.cloudId || c.id) === String(focusTableId));
      if (station?.categoryId != null) return station.categoryId;
    }

    if (focusCategoryName) {
      const normalized = String(focusCategoryName).trim().toLocaleLowerCase('tr-TR');
      const match = (categories || []).find(
        (cat) => String(cat.name || '').trim().toLocaleLowerCase('tr-TR') === normalized
      );
      if (match?.id != null) return match.id;
    }

    return null;
  }, [focusCategoryName, focusTableId]);

  const refresh = useCallback(async () => {
    try {
      const state = await getTablesState();
      if (!state?.status) throw new Error(state?.message || 'Masa durumu alınamadı.');
      const cats = state.data?.categories || [];
      const computers = (state.data?.stations || []).map((station) => ({
        ...station,
        cloudId: station.id,
        machineId: station.edgeMachineId,
      }));
      const activeSessions = state.data?.sessions || [];
      setAllStations(computers);
      setSessions(activeSessions);
      setTimers(indexTimers(state.data?.timers || {}));
      const additions = state.data?.additions || [];
      setOpenAdditions(additions);

      let categories = cats;
      if (!categories.length) {
        const map = new Map();
        computers.forEach((c) => {
          if (c.categoryId != null) {
            map.set(Number(c.categoryId), {
              id: c.categoryId,
              name: c.categoryName || `Kategori ${c.categoryId}`,
            });
          }
        });
        categories = Array.from(map.values());
      }
      setTableCategories(categories);

      if (computers.length === 0) {
        setTables([]);
        setActiveTableCat(categories[0]?.id ?? null);
      } else if (categories.length > 0) {
        let catId = activeTableCatRef.current;
        if (!focusAppliedRef.current) {
          const focusCatId = resolveFocusCategoryId(computers, categories);
          if (focusCatId != null) {
            catId = focusCatId;
            focusAppliedRef.current = true;
          }
        }
        if (catId == null) catId = categories[0].id;
        await loadTables(catId, computers, activeSessions, additions);
      } else {
        setTables(mapToTableTiles(computers, activeSessions, additions, null));
        setActiveTableCat(null);
      }
    } catch (err) {
      console.error(err);
      onError?.('Masalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [loadTables, mapToTableTiles, onError, resolveFocusCategoryId]);

  refreshRef.current = refresh;
  useEffect(() => {
    refreshRef.current?.();
    let timer = null;
    const presenceTimer = setInterval(() => refreshRef.current?.(), 15000);
    const onRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refreshRef.current?.(), 250);
    };
    window.addEventListener('wpos:tables-refresh', onRefresh);
    return () => {
      clearTimeout(timer);
      clearInterval(presenceTimer);
      window.removeEventListener('wpos:tables-refresh', onRefresh);
    };
  }, []);

  useEffect(() => {
    if (refreshKey > 0) refreshRef.current?.();
  }, [refreshKey]);

  useEffect(() => {
    if (focusTableId === lastFocusTableIdRef.current) return;
    lastFocusTableIdRef.current = focusTableId;
    focusAppliedRef.current = false;
    if (focusTableId || focusCategoryName) refreshRef.current?.();
  }, [focusTableId, focusCategoryName]);

  const handleTableSelect = async (table) => {
    const selectedCategory = tableCategories.find(
      (cat) => Number(cat.id) === Number(table.categoryId || activeTableCat)
    );
    const catName = table.categoryName || selectedCategory?.name || 'Genel';
    const timer = timers[table.id] || timers[String(table.id)];

    await window.env.addKey('table_id', table.id);
    await window.env.addKey('table_id_name', table.name);
    await window.env.addKey('table_category_name', catName);
    await window.env.addKey('station_meta', {
      id: table.localId || table.id,
      cloudId: table.cloudId,
      machineId: table.machineId,
      deviceType: table.deviceType,
      name: table.name,
      ipAddress: table.ipAddress,
      macAddress: table.macAddress,
      categoryName: catName,
      session: table.session || null,
      timer: timer || null,
    });

    // Süre sayaçlı masanın bulut adisyonunu yükle; yoksa boş sepet ("Masayı Aç").
    await window.env.removeKey('addition_id');
    if (getAdditionDetails) {
      await getAdditionDetails(timer?.additionId || table.additions[0]?.id || null);
    }
    if (autoOpenSale) setCurrentView?.('hizli-satis');
  };

  const cancelPendingTableSelect = useCallback(() => {
    if (pendingSelectRef.current) {
      clearTimeout(pendingSelectRef.current);
      pendingSelectRef.current = null;
    }
  }, []);

  const scheduleTableSelect = useCallback((table) => {
    cancelPendingTableSelect();
    pendingSelectRef.current = setTimeout(() => {
      pendingSelectRef.current = null;
      handleTableSelect(table);
    }, 350);
  }, [autoOpenSale, getAdditionDetails, tableCategories, activeTableCat, timers]);

  useEffect(() => () => cancelPendingTableSelect(), [cancelPendingTableSelect]);

  if (loading) {
    return (
      <div className="tables-loading-state absolute inset-0 z-20 flex items-center justify-center border-0 bg-[var(--sale-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="sale-tables-view min-w-0 px-4 py-6 sm:px-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--sale-fg)]">Masalar</h2>
        </div>
        {pcTables.length > 0 && (
          <button
            type="button"
            onClick={openBulkActions}
            className="sale-btn-primary inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Toplu işlemler
          </button>
        )}
      </div>

      {tableCategories.length === 0 && tables.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--sale-border)] px-6 py-12 text-center">
          <p className="text-lg font-medium text-[var(--sale-fg)]">Henüz masa yok</p>
          <p className="mt-2 max-w-sm text-sm text-[var(--sale-fg-subtle)]">
            Lütfen yönetim arayüzünden bir masa ekleyin.
          </p>
        </div>
      ) : (
        <>
          {tableCategories.length > 0 && (
            <div className="sale-table-category-rail mb-6 flex gap-2 overflow-x-auto pb-1">
              {tableCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  data-table-category-id={cat.id}
                  onClick={() => loadTables(cat.id, allStations, sessions, openAdditions)}
                  className={saleBtn.pill(Number(activeTableCat) === Number(cat.id))}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {tables.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--sale-border)] px-6 py-10 text-center">
              <p className="text-base font-medium text-[var(--sale-fg)]">
                Bu kategoride henüz masa yok
              </p>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] items-stretch gap-3"
            >
              {tables.map((table) => {
                const timer = timers[table.id] || timers[String(table.id)];
                const running = Boolean(timer);
                const activeCounter = timer || table.session || null;
                const occupied = running || Boolean(table.additions[0]) || Boolean(table.session);
                const transferable = canTransferFromTable(table, timer);
                const requests = loginRequests.filter(
                  (request) => String(request.machineId) === String(table.machineId)
                );
                const request = requests[0];
                const typeLabel =
                  table.deviceType === 'pc'
                    ? 'PC'
                    : table.deviceType === 'playstation'
                      ? 'PS'
                      : table.deviceType === 'vr'
                        ? 'VR'
                        : table.deviceType === 'bilardo'
                          ? 'Bilardo'
                          : table.deviceType === 'masatenisi'
                            ? 'Masa Tenisi'
                            : 'Masa';
                // Online/offline yalnızca istemci programı çalışan PC'ler için anlamlı.
                const isClient = table.deviceType === 'pc' && Boolean(table.machineId);
                const online = isClient && isClientOnline(table);
                const locked = table.status === 'locked';
                // Kritik durum: masa dolu ama istemci programı kapalı (offline).
                const offlineWhileOccupied = isClient && occupied && !online;
                return (
                  <div
                    key={table.id}
                    data-table-id={table.id}
                    onContextMenu={(event) => {
                      if (dragRef.current?.started) return;
                      if (table.deviceType !== 'pc') return;
                      event.preventDefault();
                      openWolMenu(table, event.clientX, event.clientY);
                    }}
                    onPointerDown={(event) => {
                      if (event.target?.closest?.('[data-table-action]')) return;
                      startLongPress(event, table);
                      beginDragAttempt(event, table);
                    }}
                    onPointerUp={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    className={`relative flex min-h-36 min-w-0 w-full flex-col rounded-xl p-3 shadow-sm ring-1 ring-black/5 transition-all duration-150 hover:shadow-md ${
                      occupied ? 'sale-table-occupied' : 'sale-table-empty'
                    } ${offlineWhileOccupied ? 'ring-2 ring-amber-400' : ''} ${
                      transferable ? 'sale-table-transferable' : ''
                    }`}
                  >
                    {requests.length > 0 && (
                      <span className="absolute -right-2 -top-2 z-10 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white shadow-md"
                            aria-label={`${requests.length} bekleyen giriş talebi`}>
                        {requests.length > 9 ? '9+' : requests.length}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (suppressClickRef.current === table.id) {
                          suppressClickRef.current = null;
                          return;
                        }
                        if (dragRef.current?.started) return;
                        scheduleTableSelect(table);
                      }}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        if (suppressClickRef.current === table.id) return;
                        if (dragRef.current?.started) return;
                        cancelPendingTableSelect();
                        onTableDoubleClick?.(table, getTimerFor(table));
                      }}
                      className="flex min-w-0 flex-1 flex-col items-start rounded text-left touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <span className="sale-table-tile-name block text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{table.name}</span>
                        {isClient && (
                          <span
                            title={online ? 'Çevrimiçi' : 'Çevrimdışı'}
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                              online ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]' : 'bg-zinc-400'
                            }`}
                          />
                        )}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{typeLabel}</div>
                      <div className="sale-table-tile-status mt-1 text-sm opacity-90">
                        {locked && (
                          <span className="mr-2 text-xs font-semibold">Kilitli</span>
                        )}
                        {activeCounter ? (
                          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-mono font-semibold tabular-nums">
                              {elapsedLabel(activeCounter)}
                            </span>
                            {isAwaitingPayment(table.session, timer) && (
                              <span className="text-xs font-semibold">Hesap bekliyor</span>
                            )}
                            {offlineWhileOccupied && (
                              <span className="text-xs font-semibold text-amber-200">Program kapalı</span>
                            )}
                          </span>
                        ) : occupied ? 'Dolu' : 'Boş'}
                      </div>
                    </button>
                    {table.session && onManageSession && (
                      <button
                        type="button"
                        data-table-action="manage-session"
                        onClick={(event) => { event.stopPropagation(); onManageSession(table, table.session); }}
                        className="mt-3 min-h-10 rounded border border-current/30 px-3 py-2 text-sm font-semibold text-inherit hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        Oturumu yönet
                      </button>
                    )}
                    {!table.session && running && (
                      <button
                        type="button"
                        data-table-action="manage-timer"
                        onClick={(event) => { event.stopPropagation(); setManageTimer({ ...table, timer }); }}
                        className="mt-3 min-h-10 rounded border border-current/30 px-3 py-2 text-sm font-semibold text-inherit hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        Oturumu yönet
                      </button>
                    )}
                    {!table.session && !running && isTimerTable(table) && (
                      <button
                        type="button"
                        data-table-action="start-table"
                        onClick={(event) => { event.stopPropagation(); onStartTable?.(table); }}
                        className="mt-3 min-h-10 rounded border border-current/30 px-3 py-2 text-sm font-semibold text-inherit hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        Masayı aç
                      </button>
                    )}
                    {request && (
                      <div className="mt-3 border-t border-current/20 pt-3" data-table-action="login-request">
                        <p className="mb-2 text-xs font-medium">
                          Giriş talebi · {loginRequestDurationLabel(request.durationMinutes)}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" disabled={loginRequestBusyId === request.id}
                            data-table-action="approve-login"
                            onClick={() => onApproveLoginRequest?.(request)}
                            className="min-h-10 rounded bg-emerald-600 px-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                            Onayla
                          </button>
                          <button type="button" disabled={loginRequestBusyId === request.id}
                            data-table-action="reject-login"
                            onClick={() => onRejectLoginRequest?.(request)}
                            className="min-h-10 rounded bg-red-700 px-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50">
                            Reddet
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {manageTimer && (
        <TimerTableModal
          table={manageTimer}
          onClose={() => setManageTimer(null)}
          onChanged={() => refreshRef.current?.()}
          onError={onError}
        />
      )}
      {bulkActionsOpen && (
        <div
          className="cafe-modal-backdrop z-[90]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-actions-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeBulkActions(); }}
        >
          <div
            className="bulk-actions-modal cafe-modal flex max-h-[min(860px,calc(100vh-2rem))] flex-col !p-0 overflow-hidden"
            style={{ width: 'min(1120px, calc(100vw - 2rem))', maxWidth: 'none' }}
          >
            <div className="flex items-center justify-between gap-5 border-b border-[var(--sale-border)] px-7 py-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="min-w-0">
                  <h3 id="bulk-actions-title" className="text-xl font-bold tracking-tight text-[var(--sale-fg)]">Toplu bilgisayar işlemleri</h3>
                  <p className="mt-1 text-sm text-[var(--sale-fg-subtle)]">Bilgisayarları seçin ve uygulanacak komutu belirleyin.</p>
                </div>
              </div>
              <button type="button" onClick={closeBulkActions} disabled={Boolean(bulkActionBusy)} aria-label="Kapat"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg text-[var(--sale-fg-subtle)] transition-colors hover:bg-[var(--sale-surface-hover)] hover:text-[var(--sale-fg)] disabled:opacity-50">
                ✕
              </button>
            </div>

            <div className="grid min-h-0 flex-1 bg-[var(--sale-bg)] lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="flex min-h-0 flex-col border-b border-[var(--sale-border)] lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--sale-border)] px-7 py-4">
                  <div>
                    <h4 className="font-semibold text-[var(--sale-fg)]">Bilgisayarlar</h4>
                    <p className="mt-0.5 text-xs text-[var(--sale-fg-subtle)]">{bulkSelected.size} / {pcTables.length} bilgisayar seçildi</p>
                  </div>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--sale-border)] bg-[var(--sale-surface)] px-3.5 transition-colors hover:bg-[var(--sale-surface-hover)]">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--app-accent)]"
                      checked={bulkSelected.size === pcTables.length}
                      onChange={toggleAllBulkTables}
                      disabled={Boolean(bulkActionBusy)} />
                    <span className="text-sm font-semibold text-[var(--sale-fg)]">Tümünü seç</span>
                  </label>
                </div>

                <div className="min-h-[280px] flex-1 overflow-y-auto p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pcTables.map((table) => {
                      const online = isClientOnline(table);
                      const selected = bulkSelected.has(table.id);
                      return (
                        <label key={table.id} className={`flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-all ${selected ? 'border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_8%,var(--sale-surface))] shadow-sm' : 'border-[var(--sale-border)] bg-[var(--sale-surface)] hover:border-[var(--sale-border-strong)] hover:bg-[var(--sale-surface-hover)]'}`}>
                          <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--app-accent)]"
                            checked={selected}
                            onChange={() => toggleBulkTable(table.id)}
                            disabled={Boolean(bulkActionBusy)} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="block truncate font-semibold text-[var(--sale-fg)]">{table.name}</span>
                              <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-emerald-500' : 'bg-zinc-400'}`} aria-hidden="true" />
                            </span>
                            <span className="mt-1 block truncate text-xs text-[var(--sale-fg-subtle)]">
                              {online ? 'Çevrimiçi' : 'Çevrimdışı'}{table.ipAddress ? ` · ${table.ipAddress}` : ''}
                            </span>
                            {!table.macAddress && <span className="mt-0.5 block text-[11px] text-amber-500">MAC adresi kayıtlı değil</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </section>

              <aside className="flex flex-col bg-[var(--sale-surface)] p-6">
                <div>
                  <h4 className="font-semibold text-[var(--sale-fg)]">Uygulanacak işlem</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--sale-fg-subtle)]">Her işlem yalnızca uygun durumdaki seçili bilgisayarlara gönderilir.</p>
                </div>

                <div className="mt-5 space-y-3">
                  <button type="button" disabled={Boolean(bulkActionBusy) || selectedPcTables.length === 0}
                    onClick={() => runBulkAction('wake')} className="cafe-btn cafe-btn-primary flex min-h-[58px] w-full justify-between !px-4">
                    <span>{bulkActionBusy === 'wake' ? 'Gönderiliyor…' : 'WOL ile uyandır'}</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{bulkEligibleCounts.wake}</span>
                  </button>
                  <button type="button" disabled={Boolean(bulkActionBusy) || selectedPcTables.length === 0}
                    onClick={() => runBulkAction('restart')} className="cafe-btn cafe-btn-ghost flex min-h-[58px] w-full justify-between !px-4">
                    <span>{bulkActionBusy === 'restart' ? 'Gönderiliyor…' : 'Yeniden başlat'}</span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{bulkEligibleCounts.restart}</span>
                  </button>
                  <button type="button" disabled={Boolean(bulkActionBusy) || selectedPcTables.length === 0}
                    onClick={() => runBulkAction('shutdown')} className="cafe-btn cafe-btn-danger flex min-h-[58px] w-full justify-between !px-4">
                    <span>{bulkActionBusy === 'shutdown' ? 'Gönderiliyor…' : 'Bilgisayarları kapat'}</span>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{bulkEligibleCounts.shutdown}</span>
                  </button>
                </div>

                <div className="mt-auto pt-5">
                  {bulkResult && <p className="rounded-xl border border-[var(--sale-border)] bg-[var(--sale-bg)] px-3.5 py-3 text-sm leading-relaxed text-[var(--sale-fg)]" role="status">{bulkResult}</p>}
                  <p className="mt-4 text-xs leading-relaxed text-[var(--sale-fg-subtle)]">Parantez içindeki sayı, seçilenler arasından işleme uygun bilgisayar sayısını gösterir.</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
      {wolMenu && (
        <div
          role="menu"
          aria-label={`${wolMenu.table.name} bilgisayar işlemleri`}
          className="fixed z-[80] w-60 overflow-hidden rounded-xl border border-[var(--sale-border)] bg-[var(--sale-surface)] text-[var(--sale-fg)] shadow-2xl"
          style={{ left: wolMenu.x, top: wolMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-[var(--sale-border)] bg-black/5 px-3.5 py-3 dark:bg-white/5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  isClientOnline(wolMenu.table)
                    ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.18)]'
                    : 'bg-zinc-400'
                }`}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{wolMenu.table.name}</p>
                <p className="truncate text-xs text-[var(--sale-fg-subtle)]">
                  {isClientOnline(wolMenu.table) ? 'Çevrimiçi' : 'Çevrimdışı'}
                  {wolMenu.table.ipAddress ? ` · ${wolMenu.table.ipAddress}` : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="p-1.5">
            {wolMenu.table.session && onManageSession && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const { table } = wolMenu;
                  closeWolMenu();
                  onManageSession(table, table.session);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold hover:bg-[var(--sale-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
              >
                <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">◷</span>
                <span className="leading-5">Oturumu yönet</span>
              </button>
            )}
            {isClientOnline(wolMenu.table) ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const { table } = wolMenu;
                    closeWolMenu();
                    setScreenViewerComputer(table);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold hover:bg-[var(--sale-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                >
                  <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">▣</span>
                  <span className="leading-5">Ekranı görüntüle</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={pcActionBusy}
                  onClick={() => sendPowerCommand('shutdown')}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold hover:bg-[var(--sale-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:opacity-50"
                >
                  <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">⏻</span>
                  <span className="leading-5">Bilgisayarı kapat</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={pcActionBusy}
                  onClick={() => sendPowerCommand('restart')}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold hover:bg-[var(--sale-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:opacity-50"
                >
                  <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none">↻</span>
                  <span className="leading-5">Bilgisayarı yeniden başlat</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                disabled={pcActionBusy || !wolMenu.table.macAddress}
                onClick={sendWake}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold hover:bg-[var(--sale-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-50"
                title={wolMenu.table.macAddress ? 'Bilgisayarı ağ üzerinden uyandır' : 'MAC adresi bulunamadı'}
              >
                <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">⏻</span>
                <span className="leading-5">
                  <span className="block leading-5">{pcActionBusy ? 'Gönderiliyor…' : 'WOL ile uyandır'}</span>
                  {!wolMenu.table.macAddress && <span className="block text-xs font-normal leading-4">MAC adresi bulunamadı</span>}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
      {screenViewerComputer && (
        <ScreenViewerModal
          computer={screenViewerComputer}
          onClose={() => setScreenViewerComputer(null)}
        />
      )}
    </div>
  );
}
