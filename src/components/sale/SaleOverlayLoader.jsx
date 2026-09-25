export function SaleSpinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin text-current ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function SaleOverlayLoader({ open, label = 'Lütfen bekleyin…' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-app-overlay backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <SaleSpinner className="h-12 w-12 text-blue-400" />
        <p className="text-lg font-semibold text-white">{label}</p>
      </div>
    </div>
  );
}
