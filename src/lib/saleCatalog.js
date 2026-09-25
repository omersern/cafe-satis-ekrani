/**
 * Satış katalogu — doğrudan cloud /app/import.
 */
import { cloudFetch } from './cloudClient';

const CACHE_KEY = 'cafe-sale-catalog-v1';

const EMPTY = {
  categories: [],
  products: [],
  variantGroups: [],
  variants: [],
  bundleGroups: [],
  bundleOptions: [],
  bundleFixedItems: [],
  paymentMethods: [],
};

const CATALOG_KEYS = [
  'settings',
  'products',
  'categories',
  'paymentMethods',
  'variants',
  'variantGroups',
  'bundleGroups',
  'bundleOptions',
  'bundleFixedItems',
  'complimentaryTypes',
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function syncStoreKeys(catalog) {
  try {
    await window.env.addKey('complimentaryTypes', asArray(catalog.complimentaryTypes));
    if (catalog.settings) {
      await window.env.addKey('settings', catalog.settings);
    }
  } catch {
    // store yoksa yoksay
  }
}

function toCatalog(data) {
  if (!data) return { ...EMPTY };
  return {
    categories: asArray(data.categories),
    products: asArray(data.products),
    variantGroups: asArray(data.variantGroups),
    variants: asArray(data.variants),
    bundleGroups: asArray(data.bundleGroups),
    bundleOptions: asArray(data.bundleOptions),
    bundleFixedItems: asArray(data.bundleFixedItems),
    paymentMethods: asArray(data.paymentMethods),
  };
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(catalog) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(catalog));
  } catch {
    // quota / private mode
  }
}

async function importFromCloud() {
  const { data } = await cloudFetch('/app/import', { skipToken: true });
  if (!data?.status) {
    throw new Error(data?.message || 'Katalog alınamadı');
  }

  const payload = Array.isArray(data.data) ? data.data[0] : data.data;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Katalog yanıtı beklenen biçimde değil');
  }

  const catalog = CATALOG_KEYS.reduce((acc, key) => {
    if (key === 'settings') acc[key] = payload[key] ?? null;
    else acc[key] = Array.isArray(payload[key]) ? payload[key] : [];
    return acc;
  }, {});
  catalog.importedAt = new Date().toISOString();

  writeCache(catalog);
  await syncStoreKeys(catalog);
  return toCatalog(catalog);
}

export function readSaleCatalogCache() {
  const cached = readCache();
  if (!cached?.importedAt) return null;
  return toCatalog(cached);
}

export async function loadSaleCatalog() {
  const cached = readSaleCatalogCache();
  if (cached) return cached;
  try {
    return await importFromCloud();
  } catch (error) {
    console.warn('[saleCatalog]', error);
    return { ...EMPTY };
  }
}

export async function refreshSaleCatalog() {
  return importFromCloud();
}
