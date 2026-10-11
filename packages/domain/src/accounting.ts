export type SettlementReason = 'payable' | 'not-due' | 'expired' | 'backup-cap' | 'insufficient-reserve';

/** Forecast only. Contract execution timestamp and receipt determine the outcome. */
export function previewSettlement(input: {
  amount: bigint; ownBalance: bigint; reserve: bigint; perPaymentCap: bigint;
  coverBps: bigint; due: bigint; grace: bigint; now: bigint;
}) {
  const { amount, ownBalance, reserve, perPaymentCap, coverBps, due, grace, now } = input;
  if (amount <= 0n || ownBalance < 0n || reserve < 0n || perPaymentCap <= 0n || coverBps <= 0n || coverBps > 10_000n || grace <= 0n || due < 0n || now < 0n) {
    throw new RangeError('Invalid settlement inputs');
  }
  const own = min(ownBalance, amount);
  const gap = amount - own;
  const cap = min(perPaymentCap, amount * coverBps / 10_000n);
  const allowedBackup = min(cap, reserve);
  let reason: SettlementReason = 'payable';
  if (now < due) reason = 'not-due';
  else if (now >= due + grace) reason = 'expired';
  else if (gap > cap) reason = 'backup-cap';
  else if (gap > reserve) reason = 'insufficient-reserve';
  return { own, gap, allowedBackup, reason };
}

export function supporterRefund(reserve: bigint, prefix: bigint, contribution: bigint, funding: bigint): bigint {
  if (reserve < 0n || prefix < 0n || contribution < 0n || funding <= 0n || reserve > funding || prefix + contribution > funding) {
    throw new RangeError('Invalid frozen share');
  }
  return reserve * (prefix + contribution) / funding - reserve * prefix / funding;
}

export function parseAmount(value: string, decimals = 6): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new RangeError('Invalid decimals');
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) throw new RangeError('Enter a non-negative amount');
  const [whole = '0', fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new RangeError('Too many decimal places');
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
}

const min = (a: bigint, b: bigint) => a < b ? a : b;
