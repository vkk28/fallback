import { z } from 'zod';

export const discoveryPageSize = 20;
export const schedulingCandidate = z.object({
  chainId: z.literal(10143),
  plan: z.string().regex(/^0x[0-9a-f]{40}$/).refine(value => !/^0x0{40}$/.test(value)),
  installment: z.number().int().min(0).max(11),
  action: z.enum(['settleNext', 'expireNext', 'closeFunding']),
}).strict().refine(value => value.action !== 'closeFunding' || value.installment === 0);
export const schedulingCandidates = z.array(schedulingCandidate).max(discoveryPageSize)
  .refine(values => new Set(values.map(value => value.plan)).size === values.length);
export const discoveryBatchSchema = z.object({
  batchId: z.string().uuid(), candidates: schedulingCandidates,
  scanned: z.number().int().min(0).max(discoveryPageSize),
  nextCursor: z.string().regex(/^10143:0x[0-9a-f]{40}$/).nullable(),
}).strict().refine(value => value.candidates.length <= value.scanned);
export const enqueueBatchSchema = z.object({ batchId: z.string().uuid(), candidates: schedulingCandidates }).strict();
export const discoveryResultSchema = z.object({
  batchId: z.string().uuid(), status: z.literal('accepted'), paid: z.literal(false),
  accepted: z.number().int().min(0).max(discoveryPageSize), stale: z.number().int().min(0).max(discoveryPageSize),
  scanned: z.number().int().min(0).max(discoveryPageSize), wrapped: z.boolean(),
}).strict().refine(value => value.accepted + value.stale <= value.scanned);
export type DiscoveryBatch = z.infer<typeof discoveryBatchSchema>;
export type DiscoveryResult = z.infer<typeof discoveryResultSchema>;
