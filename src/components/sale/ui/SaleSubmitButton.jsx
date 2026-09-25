import { SaleSpinner } from '../SaleOverlayLoader';

export default function SaleSubmitButton({
  loading,
  disabled,
  onClick,
  children,
  className,
  loadingLabel = 'Yükleniyor…',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={className}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <SaleSpinner />
          {loadingLabel}
        </span>
      ) : children}
    </button>
  );
}
