import { formatTry } from '../../lib/splitBill';

export default function SplitBillSticky({
  plan,
  activeShareIndex = null,
  onSelectShare,
  onDismiss,
  compact = false,
}) {
  if (!plan) return null;

  const paidCount = plan.paid.filter(Boolean).length;
  const activeShare = activeShareIndex != null && !plan.paid[activeShareIndex]
    ? plan.shares[activeShareIndex]
    : null;

  return (
    <div className={`split-bill-sticky ${compact ? 'w-full' : 'w-[248px]'}`}>
      <div className="split-bill-sticky-header flex items-start justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="split-bill-sticky-app-icon" aria-hidden>+</span>
          <div className="min-w-0">
          <p className="text-xs font-semibold text-[#332b00]">Hesap bölme</p>
          {activeShare != null ? (
            <p className="mt-0.5 text-[11px] font-semibold text-blue-800">
              Kişi
              {' '}
              {activeShareIndex + 1}
              {' '}
              seçili ·
              {' '}
              {formatTry(activeShare)}
              {' '}
              ₺
            </p>
          ) : (
            <p className="text-[11px] text-amber-900/60">
              {paidCount}
              /
              {plan.personCount}
              {' '}
              ödendi
            </p>
          )}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <span className="split-bill-sticky-menu" aria-hidden>•••</span>
          <button type="button" onClick={onDismiss} className="split-bill-sticky-close" title="Planı kapat" aria-label="Planı kapat">×</button>
        </div>
      </div>
      <ul className="split-bill-sticky-list max-h-52 space-y-1 overflow-y-auto px-2 pb-2">
        {plan.shares.map((share, index) => {
          const isPaid = plan.paid[index];
          const isSelected = activeShareIndex === index && !isPaid;
          const selectShare = () => {
            if (!isPaid) onSelectShare?.(share, index);
          };
          return (
            <li key={index}>
              <div
                className={`split-bill-sticky-row flex w-full items-stretch justify-between rounded-md text-sm transition-all ${
                  isPaid
                    ? 'split-bill-sticky-row-paid cursor-default'
                    : isSelected
                      ? 'split-bill-sticky-row-active cursor-pointer'
                      : 'split-bill-sticky-row-idle cursor-pointer'
                }`}
              >
                <button
                  type="button"
                  onClick={selectShare}
                  disabled={isPaid}
                  aria-pressed={isSelected}
                  className="split-bill-sticky-person flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left font-medium disabled:cursor-default"
                >
                  {isSelected && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-blue-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  Kişi
                  {' '}
                  {index + 1}
                  {isSelected && (
                    <span className="split-bill-sticky-selected-badge">Seçili</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={selectShare}
                  disabled={isPaid}
                  aria-label={`Kişi ${index + 1}, ${formatTry(share)} ₺`}
                  className="split-bill-sticky-amount shrink-0 cursor-pointer px-2 py-1.5 font-bold tabular-nums disabled:cursor-default"
                >
                  {formatTry(share)}
                  {' '}
                  ₺
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="split-bill-sticky-foot px-3 pb-2 text-[10px] text-amber-900/55">
        {activeShare != null
          ? 'Tahsil Et ile ödemeyi alın'
          : 'Tutarı almak için kişiye dokunun'}
      </p>
    </div>
  );
}
