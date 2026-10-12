import { eq, and } from 'drizzle-orm';
import { decodeFunctionData, encodeFunctionData, erc20Abi, getAddress, parseEventLogs, type Hex } from 'viem';
import type { contractTerms } from '../../domain/src/terms.js';
import { chainClient } from '../../chain/src/client.js';
import { FallbackFactoryAbi } from '../../chain/src/FallbackFactory.js';
import { FallbackPlanAbi } from '../../chain/src/FallbackPlan.js';
import { FallbackTestTokenAbi } from '../../chain/src/FallbackTestToken.js';
import type { Database } from './database.js';
import type { AuthenticatedIdentity } from './auth.js';
import { privyClient } from './auth.js';
import { transactionRequests, plans, notifications, memberships } from './schema.js';
import { ApiError } from './security.js';
import { findOperationReceipt, operationExecution } from './user-operation.js';

export function matchesProposedTerms(calldata: Hex, actor: string, event: { recipient: Hex; payee: Hex; expires: bigint; terms: ReturnType<typeof contractTerms> }) {
  return event.recipient.toLowerCase() === actor.toLowerCase() && encodeFunctionData({ abi: FallbackFactoryAbi, functionName: 'propose', args: [event.payee, event.terms, event.expires] }).toLowerCase() === calldata.toLowerCase();
}

export async function reconcileRequest(db: Database, actor: AuthenticatedIdentity, id: string) {
  const row = await db.query.transactionRequests.findFirst({ where: and(eq(transactionRequests.id, id), eq(transactionRequests.userId, actor.id)) });
  if (!row) throw new ApiError(404, 'REQUEST_NOT_FOUND');
  let hash = row.hash;
  let sponsored: boolean | null = null;
  let operationHash: Hex | null = null;
  if (row.providerId) {
    // A provider outage cannot erase a stored hash or prevent RPC recovery.
    // Identity mismatches remain hard failures, outside the transport catch.
    const tx = await privyClient().transactions().get(row.providerId).catch(() => null);
    if (tx) {
      if (tx.id !== row.providerId || tx.wallet_id !== (row.walletId || actor.walletId)) throw new ApiError(409, 'PROVIDER_ACCOUNT_MISMATCH');
      if (tx.caip2 !== 'eip155:10143' || (tx.reference_id && tx.reference_id !== row.id)) throw new ApiError(409, 'PROVIDER_REQUEST_MISMATCH');
      sponsored = tx.sponsored ?? null;
      if (tx.user_operation_hash) {
        if (!/^0x[0-9a-fA-F]{64}$/.test(tx.user_operation_hash)) throw new ApiError(409, 'USER_OPERATION_MISMATCH_RECONCILE');
        operationHash = tx.user_operation_hash as Hex;
      }
      // Do not silently replace a persisted receipt identity, even for a provider
      // replacement. A different hash needs explicit reconciliation.
      if (hash && tx.transaction_hash && hash.toLowerCase() !== tx.transaction_hash.toLowerCase()) throw new ApiError(409, 'PROVIDER_HASH_CHANGED_RECONCILE');
      hash = tx.transaction_hash || hash;
      if (!hash && !operationHash && tx.status === 'failed') {
        await db.update(transactionRequests).set({ status: 'failed' }).where(eq(transactionRequests.id, id));
        return { status: 'failed', hash: null };
      }
      if (hash) await db.update(transactionRequests).set({ hash }).where(eq(transactionRequests.id, id));
    }
  }
  if (!hash && !operationHash) return { status: row.status, hash: null };
  const c = chainClient();
  if (c.chain.id !== 10143 || await c.client.getChainId() !== 10143) throw new ApiError(409, 'MONAD_TESTNET_REQUIRED');
  let receipt;
  try { receipt = hash ? await c.client.getTransactionReceipt({ hash: hash as Hex }) : await findOperationReceipt(c.client, operationHash!, actor.address); }
  catch (error) {
    if (error instanceof ApiError) throw error;
    return { status: 'pending-confirmation', hash };
  }
  if (!receipt) return { status: row.status, hash: null };
  hash ||= receipt.transactionHash;
  // An orphaned receipt is not proof of execution. Check before any plan/status
  // writes or notifications, including reverted outer transactions.
  const block = await c.client.getBlock({ blockNumber: receipt.blockNumber });
  if (receipt.transactionHash.toLowerCase() !== hash.toLowerCase() || receipt.blockHash !== block.hash) {
    if (row.status === 'confirmed') await db.update(transactionRequests).set({ status: 'submitted' }).where(and(eq(transactionRequests.id, id), eq(transactionRequests.hash, hash)));
    throw new ApiError(409, 'NONCANONICAL_RECEIPT_RECONCILE');
  }
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, row.planId) });
  if (!plan) throw new ApiError(404, 'PLAN_NOT_FOUND');
  const execution = receipt.status === 'success' && operationHash ? operationExecution(receipt, operationHash, actor.address) : null;
  if (receipt.status === 'reverted' || execution?.succeeded === false) {
    await db.update(transactionRequests).set({ status: 'failed', hash }).where(eq(transactionRequests.id, id));
    return { status: 'failed', hash, blockNumber: receipt.blockNumber.toString(), sponsored, indexed: false };
  }
  // Sponsored EIP-7702/user-operation receipts may target an entry point. Verify
  // the recorded provider wallet and the exact contract event, not the outer to.
  let proved = false;
  const actionLogs = execution?.logs ?? receipt.logs;
  const factoryLogs = parseEventLogs({ abi: FallbackFactoryAbi, logs: actionLogs, strict: true }).filter(e => e.address.toLowerCase() === c.factory.toLowerCase());
  if (row.action === 'propose') {
    // The factory chooses the nonce at execution. Other legitimate proposals can
    // advance it after preflight; prove every consented term against stored calldata.
    const event = factoryLogs.find(e => e.eventName === 'TermsProposed' && matchesProposedTerms(row.calldata as Hex, actor.address, e.args));
    proved = !!event;
    if (event?.eventName === 'TermsProposed') await db.update(plans).set({ proposalHash: event.args.termsHash, proposalNonce: event.args.nonce.toString(), consentExpires: event.args.expires.toString() }).where(and(eq(plans.id, row.planId), eq(plans.ownerId, actor.id)));
  }
  if (row.action === 'accept') {
    const call = decodeFunctionData({ abi: FallbackFactoryAbi, data: row.calldata as Hex });
    proved = call.functionName === 'accept' && factoryLogs.some(e => e.eventName === 'PayeeAccepted' && e.args.termsHash === call.args[0] && e.args.payee.toLowerCase() === actor.address);
  }
  if (row.action === 'publish') {
    const call = decodeFunctionData({ abi: FallbackFactoryAbi, data: row.calldata as Hex });
    if (call.functionName !== 'publish') throw new ApiError(409, 'REQUEST_CALL_MISMATCH');
    const expected = await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'proposalHash', args: [getAddress(actor.address), ...call.args] });
    const event = factoryLogs.find(e => e.eventName === 'PlanCreated' && e.args.termsHash === expected && e.args.recipient.toLowerCase() === actor.address && e.args.payee.toLowerCase() === call.args[0].toLowerCase() && e.args.token.toLowerCase() === c.token.toLowerCase());
    proved = !!event;
    if (event?.eventName === 'PlanCreated') await db.update(plans).set({ address: getAddress(event.args.plan).toLowerCase() }).where(and(eq(plans.id, row.planId), eq(plans.ownerId, actor.id)));
  }
  if (row.action.startsWith('approve')) {
    const call = decodeFunctionData({ abi: erc20Abi, data: row.calldata as Hex });
    if (call.functionName !== 'approve') throw new ApiError(409, 'REQUEST_CALL_MISMATCH');
    proved = parseEventLogs({ abi: erc20Abi, eventName: 'Approval', logs: actionLogs, strict: true }).some(e => e.address.toLowerCase() === c.token.toLowerCase() && e.args.owner.toLowerCase() === actor.address && e.args.spender.toLowerCase() === String(call.args[0]).toLowerCase() && e.args.value === call.args[1]);
  }
  if (row.action === 'mintTestTokens') {
    const call = decodeFunctionData({ abi: FallbackTestTokenAbi, data: row.calldata as Hex });
    if (call.functionName !== 'mint') throw new ApiError(409, 'REQUEST_CALL_MISMATCH');
    proved = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: actionLogs, strict: true }).some(e => e.address.toLowerCase() === c.token.toLowerCase() && e.args.from === '0x0000000000000000000000000000000000000000' && e.args.to.toLowerCase() === actor.address && e.args.value === call.args[1]);
  }
  const events = parseEventLogs({ abi: FallbackPlanAbi, logs: actionLogs, strict: true }).filter(e => e.address.toLowerCase() === plan.address);
  for (const e of events) {
    if (['addOwn', 'withdrawOwn'].includes(row.action) && e.eventName === 'AllocationChanged') {
      const call = decodeFunctionData({ abi: FallbackPlanAbi, data: row.calldata as Hex });
      proved ||= e.args.recipient.toLowerCase() === actor.address && e.args.added === (row.action === 'addOwn') && 'args' in call && e.args.amount === call.args?.[0];
    }
    if (['contribute', 'withdrawSupport'].includes(row.action) && e.eventName === 'SupportChanged') {
      const call = decodeFunctionData({ abi: FallbackPlanAbi, data: row.calldata as Hex });
      proved ||= e.args.supporter.toLowerCase() === actor.address && e.args.added === (row.action === 'contribute') && 'args' in call && e.args.amount === call.args?.[0];
    }
    if (row.action === 'activate' && e.eventName === 'Activated') proved = true;
    if (row.action === 'cancel' && e.eventName === 'Closed' && e.args.reason === 2) proved = true;
    if (row.action === 'claimFor' && e.eventName === 'Claimed' && e.args.beneficiary.toLowerCase() === actor.address) proved = true;
  }
  if (!proved) throw new ApiError(409, 'EXPECTED_EVENT_NOT_CONFIRMED');
  const status = 'confirmed';
  await db.update(transactionRequests).set({ status, hash }).where(eq(transactionRequests.id, id));
  // Notifications are reconstructible from confirmed events. A transient delivery
  // failure must not relabel an already-proved monetary action as unconfirmed.
  if (status === 'confirmed' && plan.address) await receiptNotifications(db, plan.address, hash as Hex).catch(() => {});
  return { status, hash, blockNumber: receipt.blockNumber.toString(), sponsored, indexed: false };
}

export async function receiptNotifications(db: Database, address: string, hash: Hex) {
  const c = chainClient();
  const receipt = await c.client.getTransactionReceipt({ hash });
  // Sponsored execution may target an entry point. Registered plan event addresses
  // prove the notification source; the outer transaction destination does not.
  if (receipt.status !== 'success') return;
  const block = await c.client.getBlock({ blockNumber: receipt.blockNumber });
  if (receipt.transactionHash.toLowerCase() !== hash.toLowerCase() || receipt.blockHash !== block.hash) throw new ApiError(409, 'NONCANONICAL_RECEIPT_RECONCILE');
  const plan = await db.query.plans.findFirst({ where: and(eq(plans.address, address.toLowerCase()), eq(plans.chainId, c.chain.id)) });
  if (!plan) return;
  const people = await db.select().from(memberships).where(eq(memberships.planId, plan.id));
  for (const e of parseEventLogs({ abi: FallbackPlanAbi, logs: receipt.logs, strict: true })) {
    if (e.address.toLowerCase() !== address.toLowerCase()) continue;
    for (const member of people) await db.insert(notifications).values({ id: `${c.chain.id}:${hash}:${e.logIndex}:${member.userId}`, userId: member.userId, planId: plan.id, type: e.eventName, transactionHash: hash }).onConflictDoNothing();
  }
}
