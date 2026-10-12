import { pgTable, text, timestamp, integer, jsonb, primaryKey, uniqueIndex, check, index, foreignKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { DiscoveryBatch, DiscoveryResult } from '../../domain/src/scheduling.js';

export const accounts = pgTable('accounts', {
  id: text().primaryKey(), address: text().notNull().unique(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const plans = pgTable('plans', {
  id: text().primaryKey(), ownerId: text('owner_id').notNull().references(() => accounts.id),
  label: text().notNull(), payee: text(), terms: jsonb().$type<Record<string, string | number>>().notNull(),
  salt: text().notNull(), chainId: integer('chain_id').notNull(),
  address: text(), proposalHash: text('proposal_hash'), proposalNonce: text('proposal_nonce'), consentExpires: text('consent_expires'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('plans_chain_address').on(t.chainId, t.address), check('bound_payee_before_proposal', sql`${t.payee} IS NOT NULL OR (${t.address} IS NULL AND ${t.proposalHash} IS NULL)`)]);
export const memberships = pgTable('memberships', {
  planId: text('plan_id').notNull().references(() => plans.id), userId: text('user_id').notNull().references(() => accounts.id),
  role: text({ enum: ['recipient', 'supporter', 'payee'] }).notNull(),
}, t => [primaryKey({ columns: [t.planId, t.userId, t.role] })]);
// Private preliminary setup only; never an amendment to a consented plan.
export const setupDrafts = pgTable('setup_drafts', {
  userId: text('user_id').primaryKey().references(() => accounts.id),
  fields: jsonb().$type<Record<string, string>>().notNull(),
  step: integer().notNull(), version: integer().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const invitations = pgTable('invitations', {
  digest: text().primaryKey(), planId: text('plan_id').notNull().references(() => plans.id),
  role: text({ enum: ['supporter', 'payee'] }).notNull(), intendedAddress: text('intended_address'),
  intendedEmailDigest: text('intended_email_digest'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), consumedBy: text('consumed_by'),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }), declinedAt: timestamp('declined_at', { withTimezone: true }),
  replacedBy: text('replaced_by'),
}, t => [index('invitation_contact_inbox').on(t.intendedEmailDigest, t.expiresAt)]);
// Private encrypted, immutable delivery envelope. Never store a usable link in plaintext.
export const invitationDeliveries = pgTable('invitation_deliveries', {
  invitationId: text('invitation_id').primaryKey(),
  envelope: text().notNull(), status: text().notNull().default('ready'),
  attempts: integer().notNull().default(0), providerId: text('provider_id'),
  firstAttemptAt: timestamp('first_attempt_at', { withTimezone: true }),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [foreignKey({ name: 'invitation_deliveries_invitation_id_fkey', columns: [t.invitationId], foreignColumns: [invitations.digest] })]);
export const notifications = pgTable('notifications', {
  id: text().primaryKey(), userId: text('user_id').notNull().references(() => accounts.id),
  planId: text('plan_id').notNull().references(() => plans.id), type: text().notNull(), transactionHash: text('transaction_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), readAt: timestamp('read_at', { withTimezone: true }),
});
export const requestKeys = pgTable('request_keys', {
  userId: text('user_id').notNull(), key: text().notNull(), fingerprint: text().notNull(), response: jsonb().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.userId, t.key] })]);
export const transactionRequests = pgTable('transaction_requests', {
  id: text().primaryKey(), userId: text('user_id').notNull(), fingerprint: text().notNull(),
  planId: text('plan_id').notNull().references(() => plans.id), action: text().notNull(),
  walletId: text('wallet_id'),
  destination: text().notNull(), calldata: text().notNull(),
  providerId: text('provider_id'), hash: text(), status: text().notNull().default('prepared'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const limits = pgTable('request_limits', {
  key: text().primaryKey(), count: integer().notNull(), resetsAt: timestamp('resets_at', { withTimezone: true }).notNull(),
});
export const jobs = pgTable('settlement_jobs', {
  id: text().primaryKey(), chainId: integer('chain_id').notNull(), plan: text().notNull(), installment: integer().notNull(),
  action: text({ enum: ['settleNext', 'expireNext', 'closeFunding'] }).notNull(),
  status: text({ enum: ['queued', 'leased', 'submitted', 'confirmed', 'failed'] }).notNull().default('queued'),
  attempts: integer().notNull().default(0), transactionHash: text('transaction_hash'),
  // Worker-only permissionless calls. Never store a user's authorization here.
  signedTransaction: text('signed_transaction'), signer: text(), nonce: integer(),
  leaseUntil: timestamp('lease_until', { withTimezone: true }), nextAttempt: timestamp('next_attempt', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('settlement_jobs_signer_nonce').on(t.chainId, t.signer, t.nonce)]);
export const schedulerDiscovery = pgTable('scheduler_discovery', {
  id: text().primaryKey(), cursor: text(),
  batch: jsonb().$type<DiscoveryBatch>(),
  completed: jsonb().$type<{ batch: DiscoveryBatch; result: DiscoveryResult }>(),
});
// Latest owned worker cycle only; no signer/key, account or plan metadata.
export const workerHeartbeat = pgTable('worker_heartbeat', {
  mode: text({ enum: ['hosted', 'local'] }).primaryKey(), runId: text('run_id').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  status: text({ enum: ['running', 'succeeded', 'failed'] }).notNull(),
});
