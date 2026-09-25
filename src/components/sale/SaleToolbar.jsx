import { memo } from 'react';

function SaleToolbar({
  currentView,
  setCurrentView,
  pendingKitchenOrders = 0,
  pendingLoginRequests = 0,
  tableName,
  tableCategory,
  onLeaveTable,
  canTransfer,
  onTransferTable,
  timerActionLabel,
  onTimerAction,
}) {
  const tabs = [
    { id: 'hizli-satis', label: 'Satış' },
    { id: 'masalar', label: 'Masalar', badge: pendingLoginRequests, tone: 'red' },
    { id: 'mutfak', label: 'Mutfak', badge: pendingKitchenOrders },
  ];

  const showTableContext = Boolean(tableName && onLeaveTable);
  const showActions = (canTransfer && onTransferTable) || (timerActionLabel && onTimerAction);

  return (
    <div className="sale-view-toolbar z-30 shrink-0" aria-label="Satış görünümü">
      <div className="sale-view-toolbar-side sale-view-toolbar-start">
        {showTableContext && (
          <div className="sale-table-context">
            <button
              type="button"
              onClick={onLeaveTable}
              className="sale-table-context-back"
              title="Masadan ayrıl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Ayrıl</span>
            </button>
            <div className="sale-table-context-copy" title={`${tableCategory || 'Genel'} · ${tableName}`}>
              <span className="sale-table-context-name">{tableName}</span>
              <span className="sale-table-context-category">{tableCategory || 'Genel'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="sale-view-toolbar-center">
        <div className="sale-win11-tab-track">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setCurrentView(tab.id)} className={`sale-segment ${currentView === tab.id ? 'sale-segment-active' : 'sale-segment-inactive'}`}>
              {tab.label}
              {tab.badge > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5"><span className={`relative inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white ${tab.tone === 'red' ? 'bg-red-600' : 'bg-orange-500'}`}>{tab.badge > 9 ? '9+' : tab.badge}</span></span>}
            </button>
          ))}
        </div>
      </div>

      <div className="sale-view-toolbar-side sale-view-toolbar-end">
        {showActions && (
          <div className="sale-table-actions">
            {canTransfer && onTransferTable && (
              <button type="button" onClick={onTransferTable} className="sale-table-action">
                Masa taşı
              </button>
            )}
            {timerActionLabel && onTimerAction && (
              <button
                type="button"
                onClick={onTimerAction}
                className="sale-table-action sale-table-action-emphasis"
              >
                {timerActionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function toolbarPropsEqual(prev, next) {
  return prev.currentView === next.currentView
    && prev.pendingKitchenOrders === next.pendingKitchenOrders
    && prev.pendingLoginRequests === next.pendingLoginRequests
    && prev.tableName === next.tableName
    && prev.tableCategory === next.tableCategory
    && prev.canTransfer === next.canTransfer
    && prev.timerActionLabel === next.timerActionLabel
    && Boolean(prev.onLeaveTable) === Boolean(next.onLeaveTable)
    && Boolean(prev.onTransferTable) === Boolean(next.onTransferTable)
    && Boolean(prev.onTimerAction) === Boolean(next.onTimerAction);
}

export default memo(SaleToolbar, toolbarPropsEqual);
