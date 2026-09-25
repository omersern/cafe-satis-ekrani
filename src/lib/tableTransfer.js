/**
 * Masa taşıma hedef kuralları — TransferTableModal ile aynı.
 *
 * Kaynakta aktif oturum/sayaç yoksa: herhangi bir hedef (birleştirme dahil).
 * Kaynakta aktif oturum/sayaç varsa: yalnızca aynı device_type ve oturumsuz hedef.
 * Mevcut masa her zaman kapalı.
 */

export function getTableAdditionId(table, timer) {
  return timer?.additionId || table?.additions?.[0]?.id || null;
}

export function tableHasActiveSession(table, timer) {
  return Boolean(table?.session || timer);
}

export function canTransferFromTable(table, timer) {
  return Boolean(getTableAdditionId(table, timer));
}

export function evaluateTransferTarget({
  sourceTableId,
  sourceDeviceType = null,
  sourceHasActiveSession = false,
  target,
  targetHasActiveSession = false,
}) {
  const targetDeviceType = target?.deviceType || target?.device_type || null;
  const isCurrent = sourceTableId != null && Number(target?.id) === Number(sourceTableId);
  const wrongServiceType = Boolean(
    sourceHasActiveSession
    && sourceDeviceType
    && targetDeviceType
    && targetDeviceType !== sourceDeviceType,
  );
  const unavailable = Boolean(sourceHasActiveSession && (targetHasActiveSession || wrongServiceType));
  const occupied = Boolean(target?.additions?.[0]);

  let statusLabel = 'Boş';
  if (isCurrent) statusLabel = 'Mevcut';
  else if (wrongServiceType) statusLabel = 'Uygun değil';
  else if (targetHasActiveSession) statusLabel = 'Oturum açık';
  else if (occupied) statusLabel = 'Dolu';

  return {
    disabled: isCurrent || unavailable,
    isCurrent,
    wrongServiceType,
    unavailable,
    occupied,
    statusLabel,
  };
}
