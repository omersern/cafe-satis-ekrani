import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getDayOpenStatus } from '../lib/api';
import { ROUTES } from '../lib/routes';

/**
 * Gün cloud'da açık değilse satış (ve benzeri) ekranına girilmez → Gün işlemleri.
 */
export default function RequireDayOpen({ children }) {
  const [state, setState] = useState({ loading: true, open: false });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getDayOpenStatus({ force: true });
        if (!active) return;
        setState({ loading: false, open: Boolean(res?.data?.open) });
      } catch {
        if (active) setState({ loading: false, open: false });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="cafe-gradient-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!state.open) {
    return (
      <Navigate
        to={ROUTES.day}
        replace
        state={{ reason: 'day_closed', message: 'Satış için önce günü başlatın.' }}
      />
    );
  }

  return children;
}
