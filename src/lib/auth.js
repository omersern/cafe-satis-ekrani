const STORAGE_KEY = 'cafe-staff-session';

export function readStaffSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeStaffSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStaffSession() {
  localStorage.removeItem(STORAGE_KEY);
}
