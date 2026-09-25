import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { prefetchCloudStartup } from '../lib/api';
import { ROUTES } from '../lib/routes';
import { clearCloudPairing, getCloudStatus } from '../lib/cloudClient';

function isDeviceInactiveError(text) {
  if (!text) return false;
  const n = String(text).toLowerCase();
  return (
    n.includes('device not found') ||
    n.includes('inactive') ||
    n.includes('eşleşmemiş') ||
    n.includes('not paired') ||
    n.includes('cihaz')
  );
}

/**
 * Açılış splash — paired değilse Setup; paired ise buluttan bootstrap → Metro
 */
export default function Splash() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Başlatılıyor...');
  const [percent, setPercent] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [fatal, setFatal] = useState(false);
  const [deviceInactive, setDeviceInactive] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setFatal(false);
      setDeviceInactive(false);
      setShowActions(false);
      setPercent(12);
      setMessage('Başlatılıyor...');

      try {
        setMessage('Cihaz durumu kontrol ediliyor...');
        setPercent(25);
        const statusRes = { data: await getCloudStatus() };
        if (cancelled) return;

        if (!statusRes.data?.paired) {
          navigate(ROUTES.setup, { replace: true });
          return;
        }

        if (!statusRes.data.online) {
          setMessage('İnternet yok. Bağlantı gelince tekrar deneyin.');
          setFatal(true);
          setShowActions(true);
          setPercent(null);
          return;
        }

        setMessage('Buluttan veriler indiriliyor…');
        setPercent(55);
        const boot = await prefetchCloudStartup();
        if (cancelled) return;

        setMessage(
          `Hazır · tarife ${boot.bootstrap.tariffCount} · ürün ${boot.catalog.productCount} · masa ${boot.bootstrap.stationCount}`
        );
        setPercent(100);
        if (cancelled) return;
        navigate(ROUTES.metro, { replace: true });
      } catch (err) {
        if (cancelled) return;
        console.error('[splash]', err);
        const failMessage = err?.message || 'Bağlantı hatası. Tekrar deneyin.';
        setMessage(failMessage);
        setDeviceInactive(isDeviceInactiveError(failMessage));
        setFatal(true);
        setShowActions(true);
        setPercent(null);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, retryToken]);

  async function handleNewDevice() {
    try {
      clearCloudPairing();
    } catch {
      // ignore
    }
    navigate(ROUTES.setup, { replace: true });
  }

  return (
    <div className="m-0 h-screen w-screen overflow-hidden">
      <div className="cafe-gradient-bg relative flex h-full w-full items-center justify-center">
        <div className="cafe-fade-in px-6 text-center text-white">
          <p className="text-xs font-medium tracking-widest text-white/70 md:text-sm">Webbek WPOS</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">İşletmeniz için</h2>
          <div className="text-3xl font-black text-zinc-300 md:text-4xl">en yenisi, en iyisi.</div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 space-y-3 px-6">
          <div className="mx-auto max-w-md space-y-2">
            <p className="text-center text-sm text-white/90">{message}</p>
            {!fatal && (
              <div className="cafe-progress-bar">
                <div
                  className="cafe-progress-fill"
                  style={{ width: percent != null ? `${percent}%` : '30%' }}
                />
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              {deviceInactive ? (
                <button
                  type="button"
                  onClick={handleNewDevice}
                  className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white shadow-md transition-all hover:bg-slate-600"
                >
                  Yeni cihaz kimliği ile giriş yap
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRetryToken((v) => v + 1)}
                  className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white shadow-md transition-all hover:bg-slate-600"
                >
                  Tekrar dene
                </button>
              )}
              <button
                type="button"
                onClick={handleNewDevice}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white shadow-md transition-all hover:bg-slate-700"
              >
                Eşleştirmeyi sıfırla
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
