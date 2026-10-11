import { describe, expect, it } from 'vitest';
import { parseAmount, previewSettlement, supporterRefund } from './accounting.js';

describe('integer accounting', () => {
  it('reproduces the brief acceptance case and assigns the final rounding unit', () => {
    let ownBalance = parseAmount('250');
    let reserve = parseAmount('300');
    const splits: bigint[][] = [];
    for (let i = 0; i < 3; i++) {
      const p = previewSettlement({ amount: parseAmount('150'), ownBalance, reserve, perPaymentCap: parseAmount('150'), coverBps: 10_000n, due: 10n, grace: 10n, now: 10n });
      expect(p.reason).toBe('payable');
      splits.push([p.own, p.gap]);
      ownBalance -= p.own;
      reserve -= p.gap;
    }
    expect(splits).toEqual([[150_000_000n, 0n], [100_000_000n, 50_000_000n], [0n, 150_000_000n]]);
    expect(supporterRefund(reserve, 0n, 200_000_000n, 300_000_000n)).toBe(66_666_666n);
    expect(supporterRefund(reserve, 200_000_000n, 100_000_000n, 300_000_000n)).toBe(33_333_334n);
  });

  it('requires a top-up within grace and never forecasts a late payment', () => {
    const base = { amount: 150n, reserve: 300n, perPaymentCap: 50n, coverBps: 10_000n, due: 100n, grace: 10n };
    expect(previewSettlement({ ...base, ownBalance: 0n, now: 100n }).reason).toBe('backup-cap');
    expect(previewSettlement({ ...base, ownBalance: 100n, now: 109n }).reason).toBe('payable');
    expect(previewSettlement({ ...base, ownBalance: 100n, now: 110n }).reason).toBe('expired');
    expect(previewSettlement({ ...base, ownBalance: 150n, reserve: 0n, now: 100n }).reason).toBe('payable');
  });

  it('conserves every unit for many ordered contribution partitions', () => {
    for (let a = 1n; a < 50n; a++) {
      for (let b = 1n; b < 50n; b++) {
        for (const remaining of [0n, 1n, (a + b) / 2n, a + b]) {
          expect(supporterRefund(remaining, 0n, a, a + b) + supporterRefund(remaining, a, b, a + b)).toBe(remaining);
        }
      }
    }
  });

  it('rejects lossy or ambiguous money input', () => {
    for (const value of ['-1', '1e6', '1,000', ' 1', '01', '0.0000001', 'Infinity']) expect(() => parseAmount(value)).toThrow();
    expect(parseAmount('9007199254740993.000001')).toBe(9007199254740993000001n);
    expect(() => supporterRefund(1n, 0n, 1n, 0n)).toThrow();
  });
});
