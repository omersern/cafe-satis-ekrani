const STORE_KEY = 'split_bill_plans';

async function readStore() {
  const raw = await window.env.getKey(STORE_KEY);
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(data) {
  await window.env.addKey(STORE_KEY, data);
}

/** @returns {Promise<{ shares: number[], personCount: number, baseTotal: number, baselinePaymentCount: number, paid: boolean[] }|null>} */
export async function loadSplitBillPlan(additionId) {
  if (additionId == null || additionId === '') return null;
  const store = await readStore();
  const plan = store[String(additionId)];
  if (!plan || !Array.isArray(plan.shares) || plan.shares.length < 2) return null;
  return {
    shares: plan.shares,
    personCount: plan.personCount ?? plan.shares.length,
    baseTotal: plan.baseTotal ?? plan.shares.reduce((a, b) => a + b, 0),
    baselinePaymentCount: plan.baselinePaymentCount ?? 0,
    paid: Array.isArray(plan.paid) ? plan.paid : Array(plan.shares.length).fill(false),
  };
}

export async function saveSplitBillPlan(additionId, plan) {
  if (additionId == null || additionId === '' || !plan) return;
  const store = await readStore();
  store[String(additionId)] = {
    shares: plan.shares,
    personCount: plan.personCount,
    baseTotal: plan.baseTotal,
    baselinePaymentCount: plan.baselinePaymentCount ?? 0,
    paid: plan.paid,
  };
  await writeStore(store);
}

export async function removeSplitBillPlan(additionId) {
  if (additionId == null || additionId === '') return;
  const store = await readStore();
  const key = String(additionId);
  if (!(key in store)) return;
  delete store[key];
  await writeStore(store);
}
