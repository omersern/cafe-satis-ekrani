let active = false;
let count = 0;
let visible = false;
let showTimer = null;
let hideTimer = null;
const listeners = new Set();

/** Hızlı isteklerde titreme olmasın; ardışık isteklerde tek overlay */
const SHOW_DELAY_MS = 320;
const HIDE_DELAY_MS = 220;

function emit() {
  listeners.forEach((fn) => fn(visible));
}

function clearShowTimer() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function scheduleShow() {
  if (visible || showTimer || !active) return;
  showTimer = setTimeout(() => {
    showTimer = null;
    if (count > 0 && active) {
      visible = true;
      emit();
    }
  }, SHOW_DELAY_MS);
}

function scheduleHide() {
  if (!visible || hideTimer) return;
  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (count === 0) {
      visible = false;
      emit();
    }
  }, HIDE_DELAY_MS);
}

function updateLoadingState() {
  if (!active) return;

  if (count > 0) {
    clearHideTimer();
    if (visible) {
      emit();
      return;
    }
    scheduleShow();
    return;
  }

  clearShowTimer();
  if (visible) {
    scheduleHide();
  } else {
    emit();
  }
}

export function setSaleLoadingActive(value) {
  active = value;
  if (!value) {
    count = 0;
    clearShowTimer();
    clearHideTimer();
    visible = false;
    emit();
  }
}

export function subscribeSaleLoading(listener) {
  listeners.add(listener);
  listener(visible);
  return () => listeners.delete(listener);
}

export async function withSaleLoading(fn) {
  if (!active) return fn();

  count += 1;
  updateLoadingState();
  try {
    return await fn();
  } finally {
    count = Math.max(0, count - 1);
    updateLoadingState();
  }
}

/** Ardışık API çağrılarını tek overlay altında toplar (içte skipLoading kullan) */
export async function runSaleTransaction(fn) {
  if (!active) return fn();
  return withSaleLoading(async () => fn());
}
