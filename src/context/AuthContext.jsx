import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearStaffSession, readStaffSession, writeStaffSession } from '../lib/auth';
import { clearPermissionsCache, refreshPermissions } from '../hooks/usePermissions';
import { hasPermission as checkPerm, permissionsForRole } from '../lib/permissions';
import { AUTH_EXPIRED_EVENT } from '../lib/sessionAuth';
import { cloudFetch, getCloudStatus } from '../lib/cloudClient';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(() => readStaffSession()?.staff || null);
  const [token, setToken] = useState(() => readStaffSession()?.token || null);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [cloudStatus, setCloudStatus] = useState(null);

  const refreshStaffList = useCallback(async () => {
    try {
      const { data } = await cloudFetch('/cafeapp/users', { skipToken: true });
      setStaffList(data?.status && Array.isArray(data.data) ? data.data.map((user) => ({
        id: user.id ?? user.userId,
        name: user.name,
        roleId: user.roleId ?? user.role_id,
      })) : []);
    } catch (error) {
      console.error(error);
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const refreshCloudStatus = useCallback(async () => {
    try {
      setCloudStatus(await getCloudStatus());
    } catch {
      setCloudStatus(null);
    }
  }, []);

  useEffect(() => {
    refreshStaffList();
    refreshCloudStatus();
  }, [refreshStaffList, refreshCloudStatus]);

  useEffect(() => {
    const onPaired = () => {
      refreshCloudStatus();
      refreshStaffList();
    };
    window.addEventListener('wpos:cloud-paired', onPaired);
    return () => window.removeEventListener('wpos:cloud-paired', onPaired);
  }, [refreshCloudStatus, refreshStaffList]);

  // F5 / bfcache sonrası React state ile localStorage senkron kalsın.
  useEffect(() => {
    const syncFromStorage = () => {
      const session = readStaffSession();
      if (!session?.staff) return;
      setStaff(session.staff);
      setToken(session.token || null);
    };
    window.addEventListener('pageshow', syncFromStorage);
    return () => window.removeEventListener('pageshow', syncFromStorage);
  }, []);

  // Oturum düştüğünde (AFK ya da cloud 401) React state'i de düşür ki
  // RequireAuth PIN ekranına yönlendirsin.
  useEffect(() => {
    const onExpired = () => {
      clearPermissionsCache();
      clearStaffSession();
      setStaff(null);
      setToken(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (userId, pin) => {
    const { data: res } = await cloudFetch('/cafeapp/auth/login', {
      method: 'POST',
      skipToken: true,
      body: { user_id: userId, password: pin },
    });

    if (!res?.status) {
      throw new Error(res?.message || 'Giriş başarısız');
    }

    const next = {
      staff: {
        id: res.data.userId,
        name: res.data.name,
        role: Number(res.data.roleId) === 1 ? 'cashier' : 'admin',
        roleId: res.data.roleId,
      },
      token: res.data.token,
      clientId: res.data.clientId,
      deviceId: cloudStatus?.deviceId,
      loggedAt: Date.now(),
    };
    writeStaffSession(next);
    setStaff(next.staff);
    setToken(next.token);
    refreshPermissions().catch(() => {});
    return next.staff;
  }, [cloudStatus]);

  const logout = useCallback(async () => {
    clearPermissionsCache();
    clearStaffSession();
    setStaff(null);
    setToken(null);
  }, []);

  const can = useCallback((perm) => checkPerm(staff, perm), [staff]);

  const value = useMemo(
    () => ({
      staff,
      token,
      isLoggedIn: Boolean(staff),
      isAdmin: staff?.role === 'admin',
      permissions: staff ? permissionsForRole(staff.role) : new Set(),
      can,
      staffList,
      loadingStaff,
      cloudStatus,
      refreshStaffList,
      refreshCloudStatus,
      login,
      logout,
    }),
    [
      staff,
      token,
      can,
      staffList,
      loadingStaff,
      cloudStatus,
      refreshStaffList,
      refreshCloudStatus,
      login,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
