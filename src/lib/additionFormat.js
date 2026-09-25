/**
 * Adisyon görüntüleme yardımcıları (saf fonksiyonlar).
 *
 * Adisyonlar önce edge'te yaşar; kapanınca kalıcı outbox ile cloud'a gider.
 * `purgeLegacyDraftKeys` yalnızca eski sürümlerden kalan anahtarları temizler.
 */
const LEGACY_KEYS = ['local_draft_addition', 'addition_sync_queue', 'local_addition_seq'];

export function buildVariantDisplay(selectedVariants, variantGroups, variants) {
  if (!selectedVariants || !Object.keys(selectedVariants).length) return null;
  const texts = [];
  Object.entries(selectedVariants).forEach(([groupId, variantIds]) => {
    const group = variantGroups.find((g) => String(g.id) === String(groupId));
    if (!group) return;
    if (Array.isArray(variantIds)) {
      const names = variantIds
        .map((id) => variants.find((v) => String(v.id) === String(id))?.name)
        .filter(Boolean)
        .join(' ');
      if (names) texts.push(`${group.name}: ${names}`);
    } else {
      const variant = variants.find((v) => String(v.id) === String(variantIds));
      if (variant) texts.push(`${group.name}: ${variant.name}`);
    }
  });
  return texts.length ? texts.join(', ') : null;
}

function bundleGroupMeta(item) {
  const label = item.group_name || (item.is_fixed ? 'Dahil' : 'Seçim');
  const isIncluded = item.is_fixed === true || item.is_fixed === 1 || item.is_fixed === '1'
    || label === 'Dahil';

  if (isIncluded) {
    return { key: '__included__', label: 'Dahil' };
  }
  if (item.group_id != null && item.group_id !== '') {
    return { key: `g:${item.group_id}`, label };
  }
  return { key: `n:${label}`, label };
}

export function buildBundleDisplay(bundleData) {
  if (!Array.isArray(bundleData) || bundleData.length === 0) return null;

  const groups = [];
  const groupIndex = new Map();

  for (const item of bundleData) {
    const { key, label } = bundleGroupMeta(item);
    const name = item.product_name || (item.product_id ? `#${item.product_id}` : '');
    if (!name) continue;

    if (!groupIndex.has(key)) {
      groupIndex.set(key, groups.length);
      groups.push({ label, names: [] });
    }
    groups[groupIndex.get(key)].names.push(name);
  }

  return groups.map((g) => `${g.label}: ${g.names.join(', ')}`).join(', ');
}

/** Yerel adisyon id'si veya eski local taslak id'si. */
export function isLegacyLocalAdditionId(id) {
  return typeof id === 'string' && (/^L\d+$/.test(id) || id.startsWith('local-'));
}

export function formatAdditionId(id) {
  if (id == null || id === '') return '';
  const value = String(id);
  if (/^L(\d+)$/.test(value)) return value.slice(1);
  if (value.startsWith('local-')) return value.slice(6, 14);
  return value;
}

function formatProductNoteLine(line) {
  const trimmed = String(line).trim();
  const usageMatch = trimmed.match(/^Kullanım:\s*(\d+)\s*dk\.?$/i);
  if (usageMatch) return `Toplam süre: ${usageMatch[1]} dakika`;
  const plainMatch = trimmed.match(/^(\d+)\s*dk\.?$/);
  if (plainMatch) return `Toplam süre: ${plainMatch[1]} dakika`;
  return trimmed;
}

/** Süre/not satırlarını sepette alt alta göstermek için böl. */
export function splitProductNoteLines(note) {
  if (!note) return [];
  const trimmed = String(note).trim();
  if (!trimmed) return [];
  let lines;
  if (/\r?\n/.test(trimmed)) {
    lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } else if (trimmed.includes(' · ')) {
    lines = trimmed.split(' · ').map((line) => line.trim()).filter(Boolean);
  } else {
    lines = [trimmed];
  }
  return lines.map(formatProductNoteLine);
}

/** Önceki offline-first sürümden kalan taslak/kuyruk anahtarlarını sil. */
export async function purgeLegacyDraftKeys() {
  await Promise.all(LEGACY_KEYS.map((key) => window.env.removeKey(key)));
}
