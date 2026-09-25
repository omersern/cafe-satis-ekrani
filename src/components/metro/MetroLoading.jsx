export default function MetroLoading() {
  return (
    <div className="win11-metro-loading fixed inset-0 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="win11-metro-loading-ring" />
        <div className="text-center">
          <h2 className="win11-metro-loading-title">WPOS</h2>
          <p className="win11-metro-loading-text">Yükleniyor…</p>
        </div>
      </div>
    </div>
  );
}
