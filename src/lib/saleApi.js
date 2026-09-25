/**
 * Satış istemcisi — doğrudan cloud /app/* API.
 */
import { withSaleLoading } from './saleLoading';
import { cloudFetch } from './cloudClient';

async function parseSaleResponse(path, options = {}) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const { response, data } = await cloudFetch(clean, options);

  if (!response.ok) {
    throw new Error(data?.message || response.statusText || `HTTP ${response.status}`);
  }

  if (data && data.status === false) {
    throw new Error(data.message || 'İşlem başarısız');
  }

  return data ?? {};
}

export async function saleApi(path, options = {}) {
  const { skipLoading = false, ...rest } = options;
  const run = () => parseSaleResponse(path, rest);
  return skipLoading ? run() : withSaleLoading(run);
}

export async function saleApiJson(path, options = {}) {
  const { skipLoading = false, ...rest } = options;
  const run = async () => {
    const data = await parseSaleResponse(path, rest);
    return { response: { ok: true, status: 200 }, data };
  };
  return skipLoading ? run() : withSaleLoading(run);
}
