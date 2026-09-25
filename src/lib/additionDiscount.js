import { saleApi } from './saleApi';

export function roundMoney(value) {
  return Math.round(parseFloat(value) * 100) / 100;
}

/** 100–104 → 100, 105–109 → 110. */
export function roundToTenLira(amount) {
  const value = roundMoney(amount);
  if (!(value > 0)) return 0;
  return Math.round(value / 10) * 10;
}

export function applyTimeLineRounding(products, timer, tariff) {
  if (!timer?.timeLineId || !tariff?.roundToTen || !Array.isArray(products)) return products;
  return products.map((product) => {
    if (Number(product.id) !== Number(timer.timeLineId)) return product;
    const raw = product.unrounded_price != null ? Number(product.unrounded_price) : Number(product.product_price || 0);
    const rounded = roundToTenLira(raw);
    return {
      ...product,
      unrounded_price: raw,
      product_price: rounded,
      rounding_difference: roundMoney(rounded - raw),
    };
  });
}

export function computeSubtotalFromProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return 0;
  return products.reduce(
    (sum, product) => sum + (parseFloat(product.product_price || 0) * parseFloat(product.amount || 0)),
    0,
  );
}

export function computeDiscountAmount(subtotal, addition) {
  const base = parseFloat(subtotal) || 0;
  if (base <= 0 || !addition) return 0;

  const stored = parseFloat(addition.discount_amount);
  if (Number.isFinite(stored) && stored > 0) {
    return roundMoney(Math.min(stored, base));
  }

  const type = addition.discount_type;
  const rawValue = parseFloat(addition.discount_value);
  if (!type || !Number.isFinite(rawValue) || rawValue <= 0) return 0;

  if (type === 'percent') {
    return roundMoney(base * rawValue / 100);
  }

  if (type === 'amount') {
    return roundMoney(Math.min(rawValue, base));
  }

  return 0;
}

export function computeCartTotals(cart) {
  if (!cart) {
    return { subtotal: 0, unroundedSubtotal: 0, roundingDifference: 0, discount: 0, total: 0, paid: 0, remaining: 0 };
  }

  const subtotal = roundMoney(computeSubtotalFromProducts(cart.products));
  const roundingDifference = roundMoney((cart.products || []).reduce(
    (sum, product) => sum + Number(product.rounding_difference || 0) * Number(product.amount || 0),
    0,
  ));
  const unroundedSubtotal = roundMoney(subtotal - roundingDifference);
  const discount = computeDiscountAmount(subtotal, cart.addition);
  const total = roundMoney(Math.max(0, subtotal - discount));
  const paid = roundMoney(
    (cart.payments || []).reduce((acc, payment) => acc + parseFloat(payment.amount || 0), 0),
  );
  const remaining = roundMoney(Math.max(0, total - paid));

  return { subtotal, unroundedSubtotal, roundingDifference, discount, total, paid, remaining };
}

export function validateDiscountInput(subtotal, discountType, discountValue, maxPercent) {
  const base = parseFloat(subtotal) || 0;
  const value = parseFloat(String(discountValue).replace(',', '.'));
  const max = Number.isFinite(parseInt(maxPercent, 10)) ? parseInt(maxPercent, 10) : 100;

  if (base <= 0) {
    return { ok: false, message: 'Adisyonda ürün bulunmuyor.' };
  }

  if (!discountType || !Number.isFinite(value) || value <= 0) {
    return { ok: false, message: 'Geçerli bir iskonto değeri girin.' };
  }

  if (discountType === 'percent') {
    if (value > max) {
      return { ok: false, message: `Maksimum iskonto %${max} olabilir.` };
    }
    return { ok: true, discountAmount: roundMoney(base * value / 100) };
  }

  if (discountType === 'amount') {
    if (value > base) {
      return { ok: false, message: 'İskonto tutarı ara toplamdan büyük olamaz.' };
    }
    const equivPercent = (value / base) * 100;
    if (equivPercent > max + 0.0001) {
      const maxAmount = roundMoney(base * max / 100);
      return {
        ok: false,
        message: `Maksimum iskonto %${max} (en fazla ${maxAmount.toFixed(2).replace('.', ',')} TL).`,
      };
    }
    return { ok: true, discountAmount: roundMoney(value) };
  }

  return { ok: false, message: 'Geçersiz iskonto türü.' };
}

export function computeMaxDiscountAmount(subtotal, maxPercent) {
  const base = parseFloat(subtotal) || 0;
  const max = Number.isFinite(parseInt(maxPercent, 10)) ? parseInt(maxPercent, 10) : 100;
  return roundMoney(base * max / 100);
}

function readMaxFromStoredSettings(raw) {
  if (!raw) return null;
  const settings = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const max = parseInt(settings?.max_addition_discount_percent, 10);
  return Number.isFinite(max) ? max : null;
}

async function persistSettingsPatch(patch) {
  if (!patch || !window.env?.getKey || !window.env?.addKey) return;
  try {
    const raw = await window.env.getKey('settings');
    const current = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
      : {};
    await window.env.addKey('settings', { ...current, ...patch });
  } catch {
    // store yazılamazsa sessiz geç
  }
}

export async function syncPosSettingsFromApi() {
  try {
    const response = await saleApi('/app/settings/get', { method: 'GET', skipLoading: true });
    if (response?.status && response.data) {
      await persistSettingsPatch(response.data);
      const max = parseInt(response.data.max_addition_discount_percent, 10);
      if (Number.isFinite(max)) return max;
    }
  } catch {
    // offline — cache kullan
  }
  return null;
}

export async function getMaxAdditionDiscountPercent({ fresh = true } = {}) {
  if (fresh) {
    const fromApi = await syncPosSettingsFromApi();
    if (fromApi != null) return fromApi;
  }

  try {
    const raw = await window.env.getKey('settings');
    const fromStore = readMaxFromStoredSettings(raw);
    if (fromStore != null) return fromStore;
  } catch {
    // fall through
  }

  return 100;
}

export function formatDiscountLabel(addition) {
  if (!addition?.discount_type || !addition?.discount_value) return null;
  if (addition.discount_type === 'percent') {
    return `%${parseFloat(addition.discount_value)}`;
  }
  return `${parseFloat(addition.discount_amount || addition.discount_value).toFixed(2).replace('.', ',')} TL`;
}
