import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { keccak256, toHex } from 'viem';
import type { Database } from './database.js';
import { accounts, plans, memberships, invitations } from './schema.js';
import { addressSchema, draftSchema, contractTerms, termsSchema } from '../../domain/src/terms.js';
import { ApiError, digest } from './security.js';

export type Identity = { id: string; address: string };
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
export async function invite(db: Database, actor: Identity, planId: string, role: 'supporter' | 'payee', address: string, now = new Date(), derivedToken?: string) {
  const plan = await privatePlan(db, actor, planId);
  if (plan.ownerId !== actor.id) throw new ApiError(403, 'RECIPIENT_ONLY');
  const intendedAddress = addressSchema.parse(address);
  if (intendedAddress === actor.address.toLowerCase() || (role === 'payee' && intendedAddress !== plan.payee) || (role === 'supporter' && intendedAddress === plan.payee)) throw new ApiError(400, 'INVITATION_ROLE_MISMATCH');
  if (role === 'supporter' && !plan.address) throw new ApiError(409, 'PUBLISH_BEFORE_SUPPORT_INVITATION');
  const expiresAt = new Date(Math.min(now.getTime() + 24 * 3600_000, Number(BigInt(String(plan.terms.fundingDeadline))) * 1000));
  if (expiresAt <= now) throw new ApiError(410, 'INVITATION_EXPIRED');
  const token = derivedToken || randomBytes(32).toString('base64url');
  await db.insert(invitations).values({ digest: digest(token), planId, role, intendedAddress, expiresAt });
  return { token, role, expiresAt: expiresAt.toISOString() };
}
export async function invitation(db: Database, token: string, now = new Date()) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  const row = await db.query.invitations.findFirst({ where: eq(invitations.digest, digest(token)) });
  return invitationPreview(db, row, now);
}
async function invitationPreview(db: Database, row: typeof invitations.$inferSelect | undefined, now: Date) {
  if (!row) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  if (row.expiresAt <= now || row.consumedBy) throw new ApiError(410, 'INVITATION_EXPIRED_OR_USED');
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, row.planId) });
  if (!plan) throw new ApiError(404, 'INVITATION_NOT_FOUND');
  // Link access reveals consent terms, never memberships, private dashboards, salt, or signing authority.
  const creator = await db.query.accounts.findFirst({ where: eq(accounts.id, plan.ownerId) });
  return { planId: row.planId, role: row.role, label: plan.label, requestedBy: creator?.displayName || 'The plan recipient', payee: plan.payee, intendedAddress: row.intendedAddress, terms: termsSchema.parse(plan.terms), address: plan.address, expiresAt: row.expiresAt };
}
export async function inboxPreview(db: Database, actor: Identity, id: string, now = new Date()) {
  const row = await db.query.invitations.findFirst({ where: and(eq(invitations.digest, id), eq(invitations.intendedAddress, actor.address.toLowerCase())) });
  return invitationPreview(db, row, now);
}
export async function acceptInbox(db: Database, actor: Identity, id: string, now = new Date()) {
  const preview = await inboxPreview(db, actor, id, now);
  await bindAccount(db, actor);
  const consumed = await db.update(invitations).set({ consumedBy: actor.id, consumedAt: now }).where(and(eq(invitations.digest, id), eq(invitations.intendedAddress, actor.address.toLowerCase()), isNull(invitations.consumedBy), gt(invitations.expiresAt, now))).returning();
  if (consumed.length !== 1) throw new ApiError(409, 'INVITATION_ALREADY_USED');
  await db.insert(memberships).values({ planId: preview.planId, userId: actor.id, role: preview.role }).onConflictDoNothing();
  return { planId: preview.planId, role: preview.role, onchainAcceptanceRequired: preview.role === 'payee' };
}
export async function acceptInvitation(db: Database, actor: Identity, token: string, now = new Date()) {
  const preview = await invitation(db, token, now);
  if (actor.address.toLowerCase() !== preview.intendedAddress) throw new ApiError(403, 'INVITED_ACCOUNT_REQUIRED');
  await bindAccount(db, actor);
  const consumed = await db.update(invitations).set({ consumedBy: actor.id, consumedAt: now }).where(and(eq(invitations.digest, digest(token)), isNull(invitations.consumedBy), gt(invitations.expiresAt, now))).returning();
  if (consumed.length !== 1) throw new ApiError(409, 'INVITATION_ALREADY_USED');
  await db.insert(memberships).values({ planId: preview.planId, userId: actor.id, role: preview.role }).onConflictDoNothing();
  return { planId: preview.planId, role: preview.role, onchainAcceptanceRequired: preview.role === 'payee' };
}
