import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { cloudFetch } from '../lib/cloudClient';
import { readStaffSession } from '../lib/auth';
import { hasPermission as checkLocalPerm, permissionsForRole } from '../lib/permissions';

const emptySnapshot = Object.freeze({
  permissions: null,
  loading: false,
});

let snapshot = { ...emptySnapshot };
let inflight = null;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return snapshot;
}

function setSnapshot(next) {
  snapshot = next;
  emit();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearPermissionsCache() {
  inflight = null;
  setSnapshot({ permissions: null, loading: false });
}

export async function refreshPermissions() {
  const session = readStaffSession();
  if (!session?.token) {
    clearPermissionsCache();
    return null;
  }

  if (inflight) return inflight;

  setSnapshot({ permissions: snapshot.permissions, loading: true });

  inflight = (async () => {
    try {
      const { response, data } = await cloudFetch('/management/user/my-permissions', {
        method: 'GET',
      });
      const permissions =
        response.ok && data?.status && Array.isArray(data.data?.permissions)
          ? data.data.permissions
          : [];
      setSnapshot({ permissions, loading: false });
      return permissions;
    } catch (error) {
      console.error('[permissions] load failed:', error);
      setSnapshot({ permissions: [], loading: false });
      return [];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** posv2 usePermissions — cloud my-permissions + offline rol fallback */
export function usePermissions() {
  const session = readStaffSession();

  useEffect(() => {
    if (session?.token) {
      refreshPermissions();
    } else {
      clearPermissionsCache();
    }
  }, [session?.token, session?.staff?.id]);

  const { permissions, loading } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => emptySnapshot,
  );

  const hasPermission = useCallback(
    (perm) => {
      if (Array.isArray(permissions)) {
        return permissions.includes(perm);
      }
      return checkLocalPerm(session?.staff, perm);
    },
    [permissions, session?.staff],
  );

  const hasAnyPermission = useCallback(
    (names) => {
      if (Array.isArray(permissions)) {
        return names.some((name) => permissions.includes(name));
      }
      const local = permissionsForRole(session?.staff?.role);
      return names.some((name) => local.has(name));
    },
    [permissions, session?.staff?.role],
  );

  return useMemo(
    () => ({
      permissions: permissions || [],
      ready: Array.isArray(permissions),
      loading,
      hasPermission,
      hasAnyPermission,
      refreshPermissions,
    }),
    [permissions, loading, hasPermission, hasAnyPermission],
  );
}

export default usePermissions;
