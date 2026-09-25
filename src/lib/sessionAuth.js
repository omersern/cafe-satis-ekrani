import { clearStaffSession, readStaffSession } from './auth';
import { ROUTES } from './routes';

/** AuthProvider bunu dinler; React state'i düşer, Router PIN'e yönlendirir. */
export const AUTH_EXPIRED_EVENT = 'wpos:auth-expired';

function expireLocalSession() {
  clearStaffSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

/**
 * Bulut/edge yanıtı gerçekten token oturumu bitmiş mi?
 * Yetki reddi (403 permission) ve token gönderilmemiş istekler burada false kalır.
 */
export function isAuthExpiredResponse(response, data) {
  const status = response?.status;
  const message = String(data?.message || data?.error || data?.detail || '');

  if (status === 401) return true;

  if (
    /(invalid\s*(access\s*)?token|token\s*(is\s*)?invalid|geçersiz\s*(erişim\s*)?token|oturum sonlandırılmış|session.*(expired|terminated|revoked))/i.test(
      message
    )
  ) {
    return true;
  }

  // 403 yalnızca oturum/token kaynaklıysa (genel yetki reddi değil)
  if (status === 403 && /(token|oturum|authentication|unauthorized)/i.test(message)) {
    return true;
  }

  return false;
}

/** Token gönderilmiş istekte oturum düşürülmeli mi? */
export function shouldClearStaffSession(response, data, { tokenSent = false, skipToken = false } = {}) {
  if (skipToken || !tokenSent) return false;
  return isAuthExpiredResponse(response, data);
}

export function hadStaffToken(options = {}) {
  if (options.skipToken) return false;
  try {
    const session = readStaffSession();
    return Boolean(session?.token);
  } catch {
    return false;
  }
}

/** posv2 AFK / session clear — cafe PIN oturumunu düşür */
export async function clearAuthSession() {
  expireLocalSession();
}

/**
 * Oturumu düşür ve PIN ekranına dön.
 *
 * React Router geçişini AuthProvider üzerinden tetikler.
 */
export function redirectToLogin(navigate) {
  expireLocalSession();
  navigate?.(ROUTES.metro, { replace: true });
}
