import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { keccak256, toHex } from 'viem';
import type { Database } from './database.js';
import { accounts, plans, memberships } from './schema.js';
import { addressSchema, draftSchema, contractTerms } from '../../domain/src/terms.js';
import { ApiError } from './security.js';

export type Identity = { id: string; address: string; verifiedEmailDigests?: string[] };
export async function bindAccount(db: Database, actor: Identity) {
  const address = addressSchema.parse(actor.address);
  await db.insert(accounts).values({ id: actor.id, address }).onConflictDoNothing();
  const recorded = await db.query.accounts.findFirst({ where: eq(accounts.id, actor.id) });
  if (!recorded || recorded.address !== address) throw new ApiError(409, 'ACCOUNT_BINDING_CHANGED');
}
export async function createDraft(db: Database, actor: Identity, input: unknown, now = new Date()) {
  const draft = draftSchema.parse(input);
  if (draft.payee === actor.address.toLowerCase()) throw new ApiError(400, 'SEPARATE_PAYEE_REQUIRED');
  if (BigInt(draft.terms.fundingDeadline) <= BigInt(Math.floor(now.getTime() / 1000))) throw new ApiError(400, 'FUNDING_DEADLINE_PASSED');
  await bindAccount(db, actor);
  const salt = randomBytes(32).toString('hex');
  const id = randomUUID();
  const metadataCommitment = keccak256(toHex(salt + ':' + draft.label));
  await db.insert(plans).values({ id, ownerId: actor.id, label: draft.label, payee: draft.payee, terms: draft.terms, salt, chainId: 10143 });
  await db.insert(memberships).values({ planId: id, userId: actor.id, role: 'recipient' });
  return { id, metadataCommitment, contractTerms: JSON.parse(JSON.stringify(contractTerms(draft.terms, metadataCommitment), (_, value: unknown) => typeof value === 'bigint' ? value.toString() : value)) as Record<string, string | number> };
}
export async function privatePlan(db: Database, actor: Identity, id: string) {
  const member = await db.query.memberships.findFirst({ where: and(eq(memberships.planId, id), eq(memberships.userId, actor.id)) });
  if (!member) throw new ApiError(404, 'PLAN_NOT_FOUND');
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, id) });
  if (!plan) throw new ApiError(404, 'PLAN_NOT_FOUND');
  const metadataCommitment = keccak256(toHex(plan.salt + ':' + plan.label));
  const { salt: _, ...safePlan } = plan;
  return { ...safePlan, metadataCommitment, role: member.role };
}
export { invite, invitation, inboxPreview, acceptInbox, acceptInvitation } from './invitations.js';
