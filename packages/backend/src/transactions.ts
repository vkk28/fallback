import { and, desc, eq, isNull, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { APIError as ProviderAPIError, formatRequestForAuthorizationSignature } from '@privy-io/node';
import { decodeFunctionData, encodeFunctionData, erc20Abi, getAddress, type Hex } from 'viem';
import { FallbackFactoryAbi } from '../../chain/src/FallbackFactory.js';
import { FallbackPlanAbi } from '../../chain/src/FallbackPlan.js';
import { FallbackTestTokenAbi } from '../../chain/src/FallbackTestToken.js';
import { chainClient, registeredPlan } from '../../chain/src/client.js';
import { privatePlan } from './plans.js';
import type { Database } from './database.js';
import { transactionRequests, plans } from './schema.js';
import { ApiError, digest } from './security.js';
import { privyClient, type AuthenticatedIdentity } from './auth.js';
import { contractTerms, termsSchema } from '../../domain/src/terms.js';
import { providerDiagnostic, providerReasonWords } from './provider-errors.js';

export const actionSchema = z.object({ planId: z.string().uuid(), action: z.enum(['propose', 'accept', 'publish', 'mintTestTokens', 'approveOwn', 'approveSupport', 'addOwn', 'withdrawOwn', 'contribute', 'withdrawSupport', 'activate', 'cancel', 'claimFor']), amount: z.string().regex(/^[1-9]\d*$/).max(39).optional() }).strict();
export async function outstandingRequest(db: Database, userId: string, planId: string) {
  return db.query.transactionRequests.findFirst({ where: and(eq(transactionRequests.userId, userId), eq(transactionRequests.planId, planId), notInArray(transactionRequests.status, ['confirmed', 'failed'])) });
}
/** Reconnect restores an exact approval only from a proved request AND current
 * allowance at the same block as the plan snapshot. Never infer it from a wallet
 * balance, a submitted request, or another plan's approval. */
export async function confirmedFundingApproval(db: Database, actor: AuthenticatedIdentity, planId: string, blockNumber: bigint) {
  const plan = await privatePlan(db, actor, planId);
  if (!plan.address || !['recipient', 'supporter'].includes(plan.role) || await outstandingRequest(db, actor.id, planId)) return null;
  const action = plan.role === 'recipient' ? 'approveOwn' : 'approveSupport';
  const row = await db.query.transactionRequests.findFirst({ where: and(eq(transactionRequests.userId, actor.id), eq(transactionRequests.planId, planId), eq(transactionRequests.action, action), eq(transactionRequests.status, 'confirmed')), orderBy: desc(transactionRequests.createdAt) });
  if (!row?.hash || row.walletId !== actor.walletId) return null;
  const c = chainClient();
  if (c.chain.id !== 10143 || row.destination.toLowerCase() !== c.token.toLowerCase()) return null;
  const call = decodeFunctionData({ abi: erc20Abi, data: row.calldata as Hex });
  if (call.functionName !== 'approve' || String(call.args[0]).toLowerCase() !== plan.address.toLowerCase() || call.args[1] <= 0n) return null;
  const allowance = await c.client.readContract({ address: c.token, abi: erc20Abi, functionName: 'allowance', args: [getAddress(actor.address), getAddress(plan.address)], blockNumber });
  return allowance === call.args[1] ? { amount: allowance.toString() } : null;
}
export async function prepareAction(db: Database, actor: AuthenticatedIdentity, raw: unknown): Promise<{ to: Hex; data: Hex }> {
  const input = actionSchema.parse(raw);
  const plan = await privatePlan(db, actor, input.planId);
  if (!plan.payee) throw new ApiError(409, 'PAYEE_CLAIM_REQUIRED');
  const c = chainClient();
  if (c.chain.id !== 10143 || await c.client.getChainId() !== 10143) throw new ApiError(409, 'MONAD_TESTNET_REQUIRED');
  const amount = input.amount ? BigInt(input.amount) : 0n;
  if (amount > ((1n << 128n) - 1n)) throw new ApiError(400, 'AMOUNT_LIMIT');
  const terms = contractTerms(termsSchema.parse(plan.terms), plan.metadataCommitment);
  if (['approveOwn', 'addOwn', 'withdrawOwn'].includes(input.action) && amount > terms.amount * BigInt(terms.count)) throw new ApiError(400, 'PLAN_PAYMENT_CAPACITY_EXCEEDED');
  const owner = plan.ownerId === actor.id;
  if (['propose', 'publish', 'approveOwn', 'addOwn', 'withdrawOwn', 'activate', 'cancel'].includes(input.action) && !owner) throw new ApiError(403, 'RECIPIENT_ONLY');
  if (['approveSupport', 'contribute', 'withdrawSupport'].includes(input.action) && plan.role !== 'supporter') throw new ApiError(403, 'SUPPORTER_ONLY');
  if (input.action === 'propose') {
    const nonce = await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'nonces', args: [getAddress(actor.address)] });
    const now = (await c.client.getBlock()).timestamp;
    const expires = terms.fundingDeadline < now + 86400n ? terms.fundingDeadline : now + 86400n;
    const hash = await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'proposalHash', args: [getAddress(actor.address), getAddress(plan.payee), terms, nonce, expires] });
    await db.update(plans).set({ proposalHash: hash, proposalNonce: nonce.toString(), consentExpires: expires.toString() }).where(eq(plans.id, plan.id));
    return { to: c.factory, data: encodeFunctionData({ abi: FallbackFactoryAbi, functionName: 'propose', args: [getAddress(plan.payee), terms, expires] }) };
  }
  if (input.action === 'accept') {
    if (actor.address !== plan.payee || !plan.proposalHash) throw new ApiError(403, 'BOUND_PAYEE_REQUIRED');
    return { to: c.factory, data: encodeFunctionData({ abi: FallbackFactoryAbi, functionName: 'accept', args: [plan.proposalHash as Hex] }) };
  }
  if (input.action === 'publish') {
    if (!plan.proposalNonce || !plan.consentExpires) throw new ApiError(409, 'PROPOSAL_REQUIRED');
    return { to: c.factory, data: encodeFunctionData({ abi: FallbackFactoryAbi, functionName: 'publish', args: [getAddress(plan.payee), terms, BigInt(plan.proposalNonce), BigInt(plan.consentExpires)] }) };
  }
  if (!plan.address) throw new ApiError(409, 'PUBLISHED_PLAN_REQUIRED');
  const registered = await registeredPlan(plan.address);
  if (input.action === 'mintTestTokens') {
    if (!['recipient', 'supporter'].includes(plan.role)) throw new ApiError(403, 'FUNDER_ONLY');
    const limit = plan.role === 'recipient' ? terms.amount * BigInt(terms.count) : terms.maximumReserve;
    if (amount < 1n || amount > limit) throw new ApiError(400, 'TEST_TOKEN_AMOUNT_LIMIT');
    // Selected immutable deployment is FBTEST on testnet; mint only to the verified caller.
    return { to: c.token, data: encodeFunctionData({ abi: FallbackTestTokenAbi, functionName: 'mint', args: [getAddress(actor.address), amount] }) };
  }
  if (input.action === 'approveOwn' || input.action === 'approveSupport') {
    if (amount < 1n) throw new ApiError(400, 'AMOUNT_REQUIRED');
    if (input.action === 'approveSupport' && amount > terms.maximumReserve) throw new ApiError(400, 'RESERVE_LIMIT');
    return { to: c.token, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [registered.plan, amount] }) };
  }
  if (['addOwn', 'withdrawOwn', 'contribute', 'withdrawSupport'].includes(input.action)) {
    if (amount < 1n) throw new ApiError(400, 'AMOUNT_REQUIRED');
    const fn = input.action as 'addOwn' | 'withdrawOwn' | 'contribute' | 'withdrawSupport';
    return { to: registered.plan, data: encodeFunctionData({ abi: FallbackPlanAbi, functionName: fn, args: [amount] }) };
  }
  if (input.action === 'claimFor') return { to: registered.plan, data: encodeFunctionData({ abi: FallbackPlanAbi, functionName: 'claimFor', args: [getAddress(actor.address)] }) };
  return { to: registered.plan, data: encodeFunctionData({ abi: FallbackPlanAbi, functionName: input.action as 'activate' | 'cancel' }) };
}

/** Durable payload is committed before provider I/O; prepare unchanged calldata for client authorization; one-hour retry ceiling. */
export async function submitSponsored(db: Database, actor: AuthenticatedIdentity, request: Request, raw: unknown) {
  if (process.env.PRIVY_SERVER_SPONSORSHIP_ENABLED !== 'true') throw new ApiError(503, 'SPONSORSHIP_NOT_CONFIGURED');
  const key = request.headers.get('idempotency-key');
  if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  const parsed = actionSchema.parse(raw);
  const id = digest(actor.id + ':' + key), fingerprint = digest(JSON.stringify(parsed));
  const row = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor.id + ':' + parsed.planId}, 0))`);
    const existing = await tx.query.transactionRequests.findFirst({ where: eq(transactionRequests.id, id) });
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT');
      return existing;
    }
    const pending = await outstandingRequest(tx, actor.id, parsed.planId);
    if (pending) throw new ApiError(409, 'PENDING_ACTION_CONFIRM_FIRST', { requestId: pending.id });
    const call = await prepareAction(tx, actor, parsed);
    try { await chainClient().client.call({ account: getAddress(actor.address), to: call.to, data: call.data }); }
    catch { throw new ApiError(409, 'PREFLIGHT_NOT_PAYABLE_NO_TRANSACTION_SENT'); }
    const [created] = await tx.insert(transactionRequests).values({ id, userId: actor.id, planId: parsed.planId, action: parsed.action, fingerprint, walletId: actor.walletId, destination: call.to, calldata: call.data }).returning();
    if (!created) throw new ApiError(503, 'REQUEST_STORAGE_FAILED');
    return created;
  });
  return authorizationChallenge(db, actor, row);
}

/** Resume the same immutable provider request after navigation or reconnect. */
export async function retrySponsored(db: Database, actor: AuthenticatedIdentity, _request: Request, id: string) {
  const row = await db.query.transactionRequests.findFirst({ where: and(eq(transactionRequests.id, id), eq(transactionRequests.userId, actor.id)) });
  if (!row) throw new ApiError(404, 'REQUEST_NOT_FOUND');
  await privatePlan(db, actor, row.planId);
  return authorizationChallenge(db, actor, row);
}
type StoredRequest = typeof transactionRequests.$inferSelect;
const retryLifetime = 60 * 60_000; // Well below Privy's documented 24-hour idempotency lifetime.
export function providerBody(row: Pick<StoredRequest, 'id' | 'destination' | 'calldata'>) {
  return { method: 'eth_sendTransaction' as const, chain_type: 'ethereum' as const, caip2: 'eip155:10143' as const, params: { transaction: { to: row.destination, data: row.calldata, value: '0x0', chain_id: 10143 } }, sponsor: true, reference_id: row.id };
}
function enforceRetryAge(row: StoredRequest) {
  if (Date.now() - row.createdAt.getTime() > retryLifetime) throw new ApiError(409, 'RECONCILE_EXPIRED_REQUEST');
}
async function bindRequestWallet(db: Database, actor: AuthenticatedIdentity, row: StoredRequest) {
  if (!row.walletId) {
    await db.update(transactionRequests).set({ walletId: actor.walletId }).where(and(eq(transactionRequests.id, row.id), eq(transactionRequests.userId, actor.id), isNull(transactionRequests.walletId)));
    row = (await db.query.transactionRequests.findFirst({ where: eq(transactionRequests.id, row.id) }))!;
  }
  if (row.walletId !== actor.walletId) throw new ApiError(409, 'PROVIDER_WALLET_CHANGED_RECONCILE', { requestId: row.id });
  return row;
}
async function authorizationChallenge(db: Database, actor: AuthenticatedIdentity, row: StoredRequest) {
  if (process.env.PRIVY_SERVER_SPONSORSHIP_ENABLED !== 'true') throw new ApiError(503, 'SPONSORSHIP_NOT_CONFIGURED');
  row = await bindRequestWallet(db, actor, row);
  if (row.hash || row.providerId || ['confirmed', 'failed'].includes(row.status)) return { requestId: row.id, hash: row.hash, status: row.status };
  enforceRetryAge(row);
  const requestExpiry = Date.now() + 120_000;
  const payload = formatRequestForAuthorizationSignature({ version: 1, method: 'POST', url: `https://api.privy.io/v1/wallets/${actor.walletId}/rpc`, headers: { 'privy-app-id': process.env.NEXT_PUBLIC_PRIVY_APP_ID!, 'privy-idempotency-key': row.id, 'privy-request-expiry': String(requestExpiry) }, body: providerBody(row) });
  return { requestId: row.id, hash: row.hash, status: 'awaiting-authorization', payloadBase64: Buffer.from(payload).toString('base64'), requestExpiry };
}

/** The signature is short-lived and request-bound; never persist it or a user's key. */
export async function executeSponsored(db: Database, actor: AuthenticatedIdentity, id: string, raw: unknown) {
  const input = z.object({ signature: z.string().min(16).max(256).regex(/^[A-Za-z0-9+/_-]+={0,2}$/), requestExpiry: z.number().int().positive() }).strict().parse(raw);
  if (input.requestExpiry <= Date.now() || input.requestExpiry > Date.now() + 130_000) throw new ApiError(409, 'AUTHORIZATION_EXPIRED_RETRY_SAME_REQUEST', { requestId: id });
  let row = await db.query.transactionRequests.findFirst({ where: and(eq(transactionRequests.id, id), eq(transactionRequests.userId, actor.id)) });
  if (!row) throw new ApiError(404, 'REQUEST_NOT_FOUND');
  await privatePlan(db, actor, row.planId);
  row = await bindRequestWallet(db, actor, row);
  enforceRetryAge(row);
  if (process.env.PRIVY_SERVER_SPONSORSHIP_ENABLED !== 'true') throw new ApiError(503, 'SPONSORSHIP_NOT_CONFIGURED');
  if (['confirmed', 'failed'].includes(row.status)) return { requestId: id, hash: row.hash, status: row.status };
  if (row.hash || row.providerId) return { requestId: id, hash: row.hash, providerId: row.providerId, status: row.status };
  try {
    const result = await privyClient().wallets().ethereum().sendTransaction(actor.walletId, {
      caip2: 'eip155:10143', params: providerBody(row).params,
      sponsor: true, idempotency_key: id, reference_id: id, request_expiry: input.requestExpiry,
      authorization_context: { signatures: [input.signature] },
    });
    await db.update(transactionRequests).set({ hash: result.hash || null, providerId: result.transaction_id || null, status: 'submitted' }).where(and(eq(transactionRequests.id, id), eq(transactionRequests.userId, actor.id)));
    return { requestId: id, hash: result.hash || null, providerId: result.transaction_id || null, status: 'submitted' };
  } catch (error) {
    const status = error instanceof ProviderAPIError ? error.status : undefined;
    console.error('Fallback provider stage/diagnostic words:', error instanceof ProviderAPIError ? error.headers?.get('x-fallback-provider-stage') || 'unknown-stage' : 'transport', providerReasonWords(error));
    throw new ApiError(502, 'SPONSORSHIP_OR_AUTHORIZATION_FAILED_RETRY_SAME_REQUEST', { requestId: id, providerCode: providerDiagnostic(error), ...(status ? { providerStatus: status } : {}) });
  }
}
