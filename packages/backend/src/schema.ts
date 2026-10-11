import { pgTable, text, timestamp, integer, jsonb, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import type { DiscoveryBatch, DiscoveryResult } from '../../domain/src/scheduling.js';

export const accounts = pgTable('accounts', {
  id: text().primaryKey(), address: text().notNull().unique(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const plans = pgTable('plans', {
  id: text().primaryKey(), ownerId: text('owner_id').notNull().references(() => accounts.id),
  label: text().notNull(), payee: text().notNull(), terms: jsonb().$type<Record<string, string | number>>().notNull(),
  salt: text().notNull(), chainId: integer('chain_id').notNull(),
  address: text(), proposalHash: text('proposal_hash'), proposalNonce: text('proposal_nonce'), consentExpires: text('consent_expires'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('plans_chain_address').on(t.chainId, t.address)]);
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
  role: text({ enum: ['supporter', 'payee'] }).notNull(), intendedAddress: text('intended_address').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), consumedBy: text('consumed_by'),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});
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
