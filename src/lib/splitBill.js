/** @param {number} totalAmount */
/** @param {number} personCount */
export function computeBillSplit(totalAmount, personCount) {
  const total = Math.round(totalAmount * 100) / 100;
  const n = Math.max(2, Math.min(99, Math.floor(Number(personCount) || 2)));

  const wholeTotal = Math.floor(total);
  const centsPart = Math.round((total - wholeTotal) * 100);

  const wholeFloor = Math.floor(wholeTotal / n);
  const wholeRem = wholeTotal - wholeFloor * n;

  const shares = Array.from({ length: n }, () => wholeFloor);
  for (let i = 0; i < wholeRem; i += 1) {
    shares[i] += 1;
  }

  if (centsPart > 0) {
    const baseCent = Math.floor(centsPart / n);
    const centRem = centsPart % n;
    for (let i = 0; i < n; i += 1) {
      shares[i] += (baseCent + (i < centRem ? 1 : 0)) / 100;
    }
  }

  const rounded = shares.map((s) => Math.round(s * 100) / 100);
  const sum = rounded.reduce((acc, val) => acc + val, 0);
  const drift = Math.round((total - sum) * 100);
  if (drift !== 0) {
    rounded[0] = Math.round((rounded[0] + drift / 100) * 100) / 100;
  }

  return {
    shares: rounded,
    personCount: n,
    total,
  };
}

export function formatTry(amount) {
  return Number(amount).toFixed(2).replace('.', ',');
}

/** @param {number[]} shares */
export function groupSharesByAmount(shares) {
  const map = new Map();
  for (const share of shares) {
    const key = Math.round(share * 100);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([cents, count]) => ({ count, amount: cents / 100 }));
}

/** @param {number[]} shares */
export function formatSplitPlanLines(shares) {
  return groupSharesByAmount(shares).map(
    ({ count, amount }) => `${count} kişi ${formatTry(amount)} TL ödeyecek`,
  );
}

const AMOUNT_TOLERANCE = 0.011;

function amountsMatch(a, b) {
  return Math.abs(a - b) < AMOUNT_TOLERANCE;
}

/** @param {number[]} shares */
/** @param {{ amount: string|number }[]} payments */
/** @param {number} baselinePaymentCount */
export function recomputePaidFromPayments(shares, payments, baselinePaymentCount = 0) {
  const relevant = payments.slice(baselinePaymentCount);
  const paid = Array(shares.length).fill(false);
  const used = new Set();

  for (let i = 0; i < shares.length; i += 1) {
    const pIdx = relevant.findIndex((p, idx) => (
      !used.has(idx) && amountsMatch(parseFloat(p.amount), shares[i])
    ));
    if (pIdx >= 0) {
      paid[i] = true;
      used.add(pIdx);
    }
  }

  return paid;
}

/** @deprecated use recomputePaidFromPayments — kept for tests */
export function syncSplitPaidFlags(shares, paid, payments, baselinePaymentCount = 0) {
  return recomputePaidFromPayments(shares, payments, baselinePaymentCount);
}
