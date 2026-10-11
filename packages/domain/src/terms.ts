import { z } from 'zod';
import { getAddress, isAddress } from 'viem';

export const addressSchema = z.string().refine(isAddress, 'Enter a valid destination account').transform(v => getAddress(v).toLowerCase());
const integer = z.string().regex(/^(0|[1-9]\d*)$/).max(39);
export const termsSchema = z.object({
  amount: integer, minimumReserve: integer, maximumReserve: integer, perPaymentCap: integer,
  firstDue: integer, interval: integer, grace: integer, fundingDeadline: integer,
  coverBps: z.number().int().min(1).max(10_000), count: z.number().int().min(1).max(12),
}).strict().superRefine((t, ctx) => {
  const u128 = (1n << 128n) - 1n, u64 = (1n << 64n) - 1n;
  for (const key of ['amount', 'minimumReserve', 'maximumReserve', 'perPaymentCap'] as const) {
    if (BigInt(t[key]) < 1n || BigInt(t[key]) > u128) ctx.addIssue({ code: 'custom', path: [key], message: 'Outside supported amount bounds' });
  }
  for (const key of ['firstDue', 'interval', 'grace', 'fundingDeadline'] as const) {
    if (BigInt(t[key]) < 1n || BigInt(t[key]) > u64) ctx.addIssue({ code: 'custom', path: [key], message: 'Outside timestamp bounds' });
  }
  if (BigInt(t.minimumReserve) > BigInt(t.maximumReserve) || BigInt(t.grace) >= BigInt(t.interval) || BigInt(t.fundingDeadline) >= BigInt(t.firstDue) || BigInt(t.firstDue) + BigInt(t.count - 1) * BigInt(t.interval) + BigInt(t.grace) > u64) {
    ctx.addIssue({ code: 'custom', message: 'Schedule or reserve limits are inconsistent' });
  }
});
export const draftSchema = z.object({ label: z.string().trim().min(1).max(80), payee: addressSchema, terms: termsSchema }).strict();
export type TermsInput = z.infer<typeof termsSchema>;

export function contractTerms(t: TermsInput, metadataCommitment: `0x${string}`) {
  return { amount: BigInt(t.amount), minimumReserve: BigInt(t.minimumReserve), maximumReserve: BigInt(t.maximumReserve), perPaymentCap: BigInt(t.perPaymentCap), firstDue: BigInt(t.firstDue), interval: BigInt(t.interval), grace: BigInt(t.grace), fundingDeadline: BigInt(t.fundingDeadline), coverBps: t.coverBps, count: t.count, metadataCommitment };
}
