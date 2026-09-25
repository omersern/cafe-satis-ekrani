export const SIDEBAR_POSITIONS = Object.freeze({
  left: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
});

export const INTERACTION_MODES = Object.freeze({
  desktop: 'desktop',
  touch: 'touch',
});

const STORAGE_KEY = 'wpos:sidebar-position';
const INTERACTION_MODE_STORAGE_KEY = 'wpos:interaction-mode';
const validPositions = new Set(Object.values(SIDEBAR_POSITIONS));
const validInteractionModes = new Set(Object.values(INTERACTION_MODES));

export function getSidebarPosition() {
  if (typeof window === 'undefined') return SIDEBAR_POSITIONS.left;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return validPositions.has(stored) ? stored : SIDEBAR_POSITIONS.left;
}

export function applySidebarPosition(position) {
  const next = validPositions.has(position) ? position : SIDEBAR_POSITIONS.left;
  window.localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent('wpos:sidebar-position-change', { detail: next }));
  return next;
}

export function getInteractionMode() {
  if (typeof window === 'undefined') return INTERACTION_MODES.desktop;
  const stored = window.localStorage.getItem(INTERACTION_MODE_STORAGE_KEY);
  return validInteractionModes.has(stored) ? stored : INTERACTION_MODES.desktop;
}

export function applyInteractionMode(mode) {
  const next = validInteractionModes.has(mode) ? mode : INTERACTION_MODES.desktop;
  if (typeof window === 'undefined') return next;
  window.localStorage.setItem(INTERACTION_MODE_STORAGE_KEY, next);
  document.documentElement.dataset.wposInteraction = next;
  window.dispatchEvent(new CustomEvent('wpos:interaction-mode-change', { detail: next }));
  return next;
}
