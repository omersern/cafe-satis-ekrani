import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import RequireDayOpen from './components/RequireDayOpen';
import AppShell from './components/AppShell';
import { AuthProvider } from './context/AuthContext';
import { ROUTES } from './lib/routes';
import Metro from './pages/Metro';
import Computers from './pages/Computers';
import Sale from './pages/Sale';
import AdditionReports from './pages/AdditionReports';
import Tariffs from './pages/Tariffs';
import Day from './pages/Day';
import Settings from './pages/Settings';
import Reservations from './pages/Reservations';
import Setup from './pages/Setup';
import Splash from './pages/Splash';
import { getCloudStatus } from './lib/cloudClient';

function Protected({ children }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

/**
 * posv2 RootRedirect benzeri:
 * paired yok → Setup
 * paired var → Splash (bootstrap) → Metro
 */
function RootRedirect() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = { data: await getCloudStatus() };
        if (!active) return;
        setTarget(res?.data?.paired ? ROUTES.splash : ROUTES.setup);
      } catch {
        if (active) setTarget(ROUTES.setup);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!target) {
    return (
      <div className="cafe-gradient-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
}

function RequirePaired({ children }) {
  const [state, setState] = useState({ loading: true, paired: false });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = { data: await getCloudStatus() };
        if (!active) return;
        setState({ loading: false, paired: Boolean(res?.data?.paired) });
      } catch {
        if (active) setState({ loading: false, paired: false });
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

  if (!state.paired) {
    return <Navigate to={ROUTES.setup} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path={ROUTES.setup} element={<Setup />} />
        <Route path={ROUTES.splash} element={<Splash />} />
        <Route
          path={ROUTES.metro}
          element={
            <RequirePaired>
              <Protected>
                <Metro />
              </Protected>
            </RequirePaired>
          }
        />
        <Route
          path={ROUTES.sale}
          element={
            <RequirePaired>
              <Protected>
                <RequireDayOpen>
                  <Sale />
                </RequireDayOpen>
              </Protected>
            </RequirePaired>
          }
        />
        <Route
          path={ROUTES.computers}
          element={
            <RequirePaired>
              <Protected>
                <RequireDayOpen>
                  <Computers />
                </RequireDayOpen>
              </Protected>
            </RequirePaired>
          }
        />
        <Route
          path={ROUTES.additionReports}
          element={
            <RequirePaired>
              <Protected>
                <AdditionReports />
              </Protected>
            </RequirePaired>
          }
        />
        <Route
          path={ROUTES.tariffs}
          element={
            <RequirePaired>
              <Protected>
                <Tariffs />
              </Protected>
            </RequirePaired>
          }
        />
        <Route
          path={ROUTES.reservations}
          element={
            <RequirePaired>
              <Protected>
                <Reservations />
              </Protected>
            </RequirePaired>
          }
        />
        <Route
          path={ROUTES.day}
          element={
            <RequirePaired>
              <Protected>
                <Day />
              </Protected>
            </RequirePaired>
          }
        />
        <Route
          path={ROUTES.settings}
          element={
            <RequirePaired>
              <Protected>
                <Settings />
              </Protected>
            </RequirePaired>
          }
        />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
