import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { cloudFetch, saveCloudPairing } from '../lib/cloudClient';

/**
 * Cihaz eşleştirme — posv2-tauri Setup ile aynı akış.
 * Cloud API adresi build ortamındaki VITE_API_URL üzerinden gelir.
 * İşletme kimliği + cihaz kimliği → cloud WebSocket pair → Splash
 */
export default function Setup() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bizRef = useRef(null);
  const devRef = useRef(null);

  async function handleSubmit() {
    if (loading) return;
    if (!businessId.trim() || !deviceId.trim()) {
      setError('Lütfen işletme kimliği ve cihaz kimliğini doldurun.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await cloudFetch('/cafeapp/device/pair', {
        method: 'POST',
        clientId: businessId.trim(),
        deviceId: deviceId.trim(),
        skipToken: true,
        body: { device_id: deviceId.trim(), system_info: { app: 'webbek-cafe' } },
      });
      if (!data?.status) {
        throw new Error(data?.message || 'Eşleştirme başarısız');
      }
      saveCloudPairing(businessId.trim(), deviceId.trim());
      navigate(ROUTES.splash, { replace: true });
    } catch (err) {
      setError(err.message || 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    if (!businessId.trim()) {
      bizRef.current?.focus();
      return;
    }
    if (!deviceId.trim()) {
      devRef.current?.focus();
      return;
    }
    handleSubmit();
  }

  return (
    <div className="cafe-setup-page fixed inset-0 flex items-center justify-center bg-slate-950 p-0">
      <div className="cafe-setup-card cafe-fade-in h-full w-full max-w-none rounded-none shadow-none">
        <div className="cafe-setup-card-bg" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 h-full w-full p-5 md:p-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-2 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_10px] shadow-emerald-400/60" />
              <h1 className="text-sm font-semibold tracking-wide text-white md:text-base">
                CİHAZ EŞLEŞTİRME
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] text-slate-300/80 sm:inline md:text-xs">
                Webbek Cafe
              </span>
            </div>
          </div>

          <div>
          <p className="mt-3 text-[11px] leading-snug text-slate-200/90 md:text-xs">
            <>
              Bu cihazın sistemde tanınmadığını tespit ettik. POSM → Ayarlar → Cihazlar ekranından
              <span className="mx-1 font-semibold text-slate-50">İşletme Kimliği</span>
              ve <span className="mx-1 font-semibold text-slate-50">Cihaz Kimliği</span> bilgilerini alıp aşağıya girin.
            </>
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4">
            <>
            <div>
              <label
                htmlFor="businessId"
                className="mb-1.5 block text-[11px] font-medium text-slate-200 md:text-xs"
              >
                İşletme Kimliği
              </label>
              <input
                ref={bizRef}
                id="businessId"
                type="text"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500/70"
                placeholder="İşletme kimliğinizi girin"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="deviceId"
                className="mb-1.5 block text-[11px] font-medium text-slate-200 md:text-xs"
              >
                Cihaz Kimliği
              </label>
              <input
                ref={devRef}
                id="deviceId"
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500/70"
                placeholder="Cihaz kimliğinizi girin"
                autoComplete="off"
              />
            </div>
            </>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            )}

            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-slate-300/80 md:text-[11px]">
                Cihaz bulut hesabınızla eşleştirilir. Katalog verileri buluttan yüklenir.
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 ring-1 ring-inset ring-blue-400/30 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-70 md:text-sm"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                    <span>Lütfen bekleyin…</span>
                  </>
                ) : (
                  <span>Kontrol Et</span>
                )}
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
