import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { database } from '../../../../../packages/backend/src/database.js';
import { authenticate } from '../../../../../packages/backend/src/auth.js';
import { ApiError, body, checkOrigin, digest, idempotent, rateLimit, relayAuth, invitationToken } from '../../../../../packages/backend/src/security.js';
import { createDraft, privatePlan, invitation, acceptInvitation, bindAccount, inboxPreview, acceptInbox } from '../../../../../packages/backend/src/plans.js';
import { createInvitation, invitationInput, ownerInvitations, respondInvitation, revokeInvitation } from '../../../../../packages/backend/src/invitations.js';
import { deliverInvitation, deliveryConfigured } from '../../../../../packages/backend/src/invitation-delivery.js';
import { accounts, memberships, notifications, plans, setupDrafts } from '../../../../../packages/backend/src/schema.js';
import { activityFeed, connectedPeople, planSummaries, requestInbox, saveSetup } from '../../../../../packages/backend/src/experience.js';
import { submitSponsored, retrySponsored, executeSponsored, outstandingRequest, confirmedFundingApproval } from '../../../../../packages/backend/src/transactions.js';
import { reconcileRequest } from '../../../../../packages/backend/src/receipts.js';
import { chainClient, planSnapshot } from '../../../../../packages/chain/src/client.js';
import { FallbackFactoryAbi } from '../../../../../packages/chain/src/FallbackFactory.js';
import { decodeFunctionData, type Hex } from 'viem';
import { FallbackPlanAbi } from '../../../../../packages/chain/src/FallbackPlan.js';
import { FallbackTestTokenAbi } from '../../../../../packages/chain/src/FallbackTestToken.js';
import { addressSchema } from '../../../../../packages/domain/src/terms.js';
import { history } from '../../../../../packages/backend/src/indexer.js';
import { discoverIndexed, inspectCandidate } from '../../../../worker/src/gateway.js';
import { enqueue, queueHealth } from '../../../../worker/src/jobs.js';
import { discoveryBatch, enqueueDiscoveryBatch } from '../../../../worker/src/discovery.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value, (_, v: unknown) => typeof v === 'bigint' ? v.toString() : v), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store, private' } });
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params, route = path.join('/');
    if (request.method === 'POST') checkOrigin(request, process.env.APP_ORIGIN || 'http://localhost:3000');
    if (route === 'health') {
      let databaseReady = false, rpcReady = false;
      try { await database().execute(sql`SELECT 1`); databaseReady = true; } catch { /* expose flags only */ }
      try { const c = chainClient(); rpcReady = await c.client.getChainId() === c.chain.id; } catch { /* config or RPC unavailable */ }
      return json({ accountsConfigured: !!(process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.PRIVY_APP_SECRET), databaseConfigured: !!process.env.DATABASE_URL, databaseReady, rpcReady, indexerConfigured: !!process.env.ENVIO_GRAPHQL_URL, deploymentConfigured: !!(process.env.FACTORY_ADDRESS && process.env.TOKEN_ADDRESS), sponsorshipEnabled: process.env.PRIVY_SERVER_SPONSORSHIP_ENABLED === 'true', verification: 'Actual sponsor receipt and recovery checks required' });
    }
    if (route.startsWith('scheduler/')) {
      relayAuth(request, process.env.CRE_RELAY_SECRET);
      const db = database();
      await rateLimit(db, 'scheduler', 120);
      if (route === 'scheduler/candidates' && request.method === 'GET') {
        const c = chainClient();
        return json(await discoveryBatch(db, `${c.chain.id}:${c.factory.toLowerCase()}`, discoverIndexed));
      }
      if (route === 'scheduler/enqueue-batch' && request.method === 'POST') {
        const c = chainClient();
        return json(await enqueueDiscoveryBatch(db, `${c.chain.id}:${c.factory.toLowerCase()}`, await body(request), inspectCandidate));
      }
      if (route === 'scheduler/enqueue' && request.method === 'POST') {
        const candidate = z.object({ chainId: z.literal(10143), plan: addressSchema, installment: z.number().int().min(0).max(12), action: z.enum(['settleNext', 'expireNext', 'closeFunding']) }).strict().parse(await body(request));
        const state = await inspectCandidate(candidate);
        if (!state.allowed) throw new ApiError(409, 'STALE_SCHEDULING_CANDIDATE');
        await enqueue(db, candidate);
        return json({ status: 'queued', paid: false });
      }
      if (route === 'scheduler/health') return json(await queueHealth(db));
      throw new ApiError(404, 'NOT_FOUND');
    }
    if (route === 'invitations/preview' && request.method === 'POST') {
      const db = database(); await rateLimit(db, 'invitation-preview-global', 200);
      const input = z.object({ token: z.string().length(43) }).strict().parse(await body(request));
      return json(await invitation(db, input.token));
    }
    const actor = await authenticate(request);
    if (route === 'session' && request.method === 'GET') return json({ id: actor.id, address: actor.address, walletId: actor.walletId, sessionId: actor.sessionId });
    const db = database();
    await rateLimit(db, `${actor.id}:${request.method === 'GET' ? 'read' : 'write'}`, request.method === 'GET' ? 90 : 20);
    await bindAccount(db, actor);
    if (route === 'invitation-delivery-status' && request.method === 'GET') return json({ configured: deliveryConfigured() });
    if (route === 'invitations/deliver' && request.method === 'POST') {
      const i = z.object({ id: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(await body(request));
      return json(await deliverInvitation(db, actor, i.id));
    }
    if (path[0] === 'plans' && path.length === 3 && path[2] === 'invitations' && request.method === 'GET') return json(await ownerInvitations(db, actor, z.string().uuid().parse(path[1])));
    if (route === 'people' && request.method === 'GET') return json(await connectedPeople(db, actor));
    if (route === 'requests' && request.method === 'GET') return json(await requestInbox(db, actor));
    if (path[0] === 'requests' && path.length === 2 && request.method === 'GET') return json(await inboxPreview(db, actor, z.string().regex(/^[a-f0-9]{64}$/).parse(path[1])));
    if (route === 'activity' && request.method === 'GET') return json(await activityFeed(db, actor, new URL(request.url).searchParams.get('cursor')));
    if (route === 'plan-summaries' && request.method === 'GET') return json(await planSummaries(db, actor, z.coerce.number().int().min(0).max(10000).parse(new URL(request.url).searchParams.get('offset') || '0')));
    if (route === 'setup-draft' && request.method === 'GET') {
      const row = await db.query.setupDrafts.findFirst({ where: eq(setupDrafts.userId, actor.id) });
      return json(row ? { fields: row.fields, step: row.step, version: row.version, updatedAt: row.updatedAt } : null);
    }
    if (route === 'profile' && request.method === 'GET') {
      const profile = await db.query.accounts.findFirst({ where: eq(accounts.id, actor.id) });
      return json({ displayName: profile?.displayName || null });
    }
    if (route === 'transactions' && request.method === 'POST') return json(await submitSponsored(db, actor, request, await body(request)), 202);
    if (path[0] === 'transactions' && path.length === 2 && request.method === 'GET') return json(await reconcileRequest(db, actor, z.string().regex(/^[a-f0-9]{64}$/).parse(path[1])));
    if (path[0] === 'transactions' && path.length === 3 && path[2] === 'retry' && request.method === 'POST') return json(await retrySponsored(db, actor, request, z.string().regex(/^[a-f0-9]{64}$/).parse(path[1])), 202);
    if (path[0] === 'transactions' && path.length === 3 && path[2] === 'submit' && request.method === 'POST') return json(await executeSponsored(db, actor, z.string().regex(/^[a-f0-9]{64}$/).parse(path[1]), await body(request)), 202);
    if (route === 'notifications' && request.method === 'GET') return json(await db.select().from(notifications).where(eq(notifications.userId, actor.id)).orderBy(notifications.createdAt).limit(50));
    if (route === 'plans' && request.method === 'GET') return json(await db.select({ id: plans.id, label: plans.label, address: plans.address, role: memberships.role }).from(memberships).innerJoin(plans, eq(memberships.planId, plans.id)).where(eq(memberships.userId, actor.id)).limit(50));
    if (path[0] === 'plans' && path.length === 2 && request.method === 'GET') {
      const plan = await privatePlan(db, actor, z.string().uuid().parse(path[1]));
      let current = null, chainError = null, consent = null, fundingApproval = null;
      try {
        if (plan.address) {
          current = await planSnapshot(plan.address, actor.address);
          fundingApproval = await confirmedFundingApproval(db, actor, plan.id, current.block);
        }
        else if (plan.proposalHash) {
          const c = chainClient();
          consent = await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'proposals', args: [plan.proposalHash as Hex] });
        }
      } catch { chainError = 'Current payment information is unavailable. Refresh before authorizing any action.'; }
      let indexedHistory = null;
      if (plan.address) { try { indexedHistory = await history(plan.chainId, plan.address, 0); } catch { /* explicit lag/unavailable state; critical reads remain authoritative */ } }
      const pending = await outstandingRequest(db, actor.id, plan.id);
      let pendingAmount: string | null = null;
      if (pending) try {
        const call = decodeFunctionData({ abi: [...FallbackPlanAbi, ...FallbackTestTokenAbi], data: pending.calldata as Hex });
        if (['approve', 'mint', 'addOwn', 'contribute', 'withdrawOwn', 'withdrawSupport'].includes(call.functionName)) {
          const amount = call.args?.at(-1); if (typeof amount === 'bigint') pendingAmount = amount.toString();
        }
      } catch { /* Legacy references may not expose a decodable amount; never invent one. */ }
      return json({ plan, current, consent, fundingApproval, chainError, history: indexedHistory, outstanding: pending ? { id: pending.id, action: pending.action, hash: pending.hash, amount: pendingAmount } : null, status: plan.address ? 'published' : 'draft', indexerStatus: indexedHistory ? 'available' : 'unavailable' });
    }
    if (path[0] === 'plans' && path[2] === 'history' && path.length === 3 && request.method === 'GET') {
      const plan = await privatePlan(db, actor, z.string().uuid().parse(path[1]));
      const offset = z.coerce.number().int().min(0).max(1_000_000).parse(new URL(request.url).searchParams.get('offset') || '0');
      if (!plan.address) return json({ Timeline: [], Supporter: [], Plan_by_pk: null });
      return json(await history(plan.chainId, plan.address, offset));
    }
    if (request.method !== 'POST') throw new ApiError(404, 'NOT_FOUND');
    const input = await body(request);
    const fingerprint = digest(route + ':' + JSON.stringify(input));
    const linkToken = route === 'invitations' ? invitationToken(process.env.INVITATION_TOKEN_KEY, actor.id + ':' + request.headers.get('idempotency-key') + ':' + fingerprint) : undefined;
    const result = await idempotent(db, actor.id, request.headers.get('idempotency-key'), fingerprint, async tx => {
      if (route === 'setup-draft') return saveSetup(tx, actor, input);
      if (route === 'setup-finish') {
        const setup = z.object({ draft: z.unknown(), version: z.number().int().min(1) }).strict().parse(input);
        const removed = await tx.delete(setupDrafts).where(and(eq(setupDrafts.userId, actor.id), eq(setupDrafts.version, setup.version))).returning();
        if (removed.length !== 1) throw new ApiError(409, 'SETUP_CHANGED_IN_ANOTHER_TAB');
        return createDraft(tx, actor, setup.draft);
      }
      if (route === 'requests/accept') return acceptInbox(tx, actor, z.object({ id: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(input).id);
      if (route === 'invitations/decline' || route === 'requests/decline') {
        const i = z.union([z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/) }).strict(), z.object({ id: z.string().regex(/^[a-f0-9]{64}$/) }).strict()]).parse(input);
        return respondInvitation(tx, actor, i, true);
      }
      if (route === 'invitations/revoke') return revokeInvitation(tx, actor, z.object({ id: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(input).id);
      if (route === 'plans') return createDraft(tx, actor, input);
      if (route === 'profile') {
        const profile = z.object({ displayName: z.string().trim().min(1).max(50) }).strict().parse(input);
        await tx.update(accounts).set(profile).where(eq(accounts.id, actor.id));
        return { saved: true }; // Keep names out of idempotency response history.
      }
      if (route === 'invitations/accept') return acceptInvitation(tx, actor, z.object({ token: z.string().length(43) }).strict().parse(input).token);
      if (route === 'invitations') {
        return createInvitation(tx, actor, invitationInput.parse(input), linkToken!); // No usable token in idempotency storage.
      }
      if (route === 'notifications/read') {
        const i = z.object({ id: z.string().max(300) }).strict().parse(input);
        await tx.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, i.id), eq(notifications.userId, actor.id)));
        return { read: true };
      }
      throw new ApiError(404, 'NOT_FOUND');
    });
    return json(linkToken ? { ...result, token: linkToken } : result);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Fallback API rejected request:', error.code, error.details?.providerCode || ''); // Fixed codes only; no identity, payload or usable credential.
      return json({ error: error.code, ...error.details }, error.status);
    }
    if (error instanceof z.ZodError) {
      const fields = error.issues.map(i => i.path.join('.'));
      console.error('Fallback API invalid field paths:', fields.join(', '));
      return json({ error: 'INVALID_INPUT', fields }, 400);
    }
    console.error('Fallback API service unavailable.'); // Never print raw upstream errors or SQL parameters.
    return json({ error: 'SERVICE_UNAVAILABLE_RETRY' }, 503); // Never log usable tokens, credentials or provider URLs.
  }
}
export const GET = handle;
export const POST = handle;
