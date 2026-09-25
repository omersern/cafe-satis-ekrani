/** Otomatik tema — yerel saat 07:00–18:00 açık, geri kalan koyu (posv2 birebir) */

export const AUTO_LIGHT_START_HOUR = 7;
export const AUTO_LIGHT_END_HOUR = 18;

export function isAutoLightHours(now = new Date()) {
  const hour = now.getHours();
  return hour >= AUTO_LIGHT_START_HOUR && hour < AUTO_LIGHT_END_HOUR;
}

export function getNextAutoTransition(now = new Date()) {
  const next = new Date(now);
  next.setSeconds(0, 0);

  if (isAutoLightHours(now)) {
    next.setHours(AUTO_LIGHT_END_HOUR, 0, 0, 0);
    return { at: next, mode: 'dark' };
  }

  if (now.getHours() < AUTO_LIGHT_START_HOUR) {
    next.setHours(AUTO_LIGHT_START_HOUR, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(AUTO_LIGHT_START_HOUR, 0, 0, 0);
  }
  return { at: next, mode: 'light' };
}

export function formatTimeTr(date) {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function getAutoScheduleInfo(now = new Date()) {
  const isDaytime = isAutoLightHours(now);
  const next = getNextAutoTransition(now);

  const lightStart = new Date(now);
  lightStart.setHours(AUTO_LIGHT_START_HOUR, 0, 0, 0);
  const lightEnd = new Date(now);
  lightEnd.setHours(AUTO_LIGHT_END_HOUR, 0, 0, 0);

  return {
    isDaytime,
    lightStart,
    lightEnd,
    nextTransition: next.at,
    nextMode: next.mode,
    lightStartLabel: formatTimeTr(lightStart),
    lightEndLabel: formatTimeTr(lightEnd),
    nextLabel: formatTimeTr(next.at),
  };
}
