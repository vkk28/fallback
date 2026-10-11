import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { getAddress, parseEventLogs, type Hex } from 'viem';
import { chainClient } from '../packages/chain/src/client.js';
import { FallbackFactoryAbi } from '../packages/chain/src/FallbackFactory.js';
import { FallbackPlanAbi } from '../packages/chain/src/FallbackPlan.js';
import { history, indexerQuery } from '../packages/backend/src/indexer.js';
import { indexerCoverage } from '../packages/domain/src/indexer.js';

// Read-only verification of the existing private index and public testnet receipts.
// Never export actors, account IDs, transaction hashes, labels or credentials.
let stage = 'configuration';
try {
  assert.equal(process.env.CHAIN_ID, '10143');
  assert.equal(process.env.ENVIO_GRAPHQL_URL, 'http://127.0.0.1:8080/v1/graphql');
  const c = chainClient();
  assert.equal(await c.client.getChainId(), 10143);
  const head = await c.client.getBlock();
  const count = await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'planCount', blockNumber: head.number });
  // Bounded diagnostic; refuse to present a partial registry as complete proof.
  assert.ok(count <= 20n, 'REGISTRY_EXCEEDS_VERIFICATION_BOUND');
  const reports = [];
  for (let i = 0n; i < count; i++) {
    stage = 'history_query';
    const address = await c.client.readContract({ address: c.factory, abi: FallbackFactoryAbi, functionName: 'planAt', args: [i], blockNumber: head.number });
    let h = await history(10143, address, 0);
    // Compare completeness with the fixed head captured at entry. Allow the
    // configured two-block lag to catch that checkpoint during bounded reads.
    for (let attempt = 0; attempt < 10 && h.sync && BigInt(h.sync.processedBlock) < head.number; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      h = await history(10143, address, 0);
    }
    const coverage = indexerCoverage(h.sync, head.number.toString());
    if (!h.Plan_by_pk || !h.sync) {
      reports.push({ indexed: !!h.Plan_by_pk, coverage, reconciliation: 'pending: plan or measured watermark unavailable' });
      continue;
    }
    const blockNumber = BigInt(h.sync.processedBlock);
    // Compare at the committed index height, not with later mutable contract state.
    // A caught-up index can advance while this multi-plan diagnostic is reading.
    // Verify a later watermark against a fresh RPC head rather than reject valid
    // progress merely because the initial head was captured a few seconds ago.
    if (blockNumber > head.number) assert.ok(blockNumber <= (await c.client.getBlock()).number, 'INDEX_WATERMARK_AHEAD_OF_RPC');
    const read = <N extends 'lifecycle' | 'recipientAllocated' | 'reserveRemaining' | 'supportUsed' | 'totalPaid'>(functionName: N) =>
      c.client.readContract({ address, abi: FallbackPlanAbi, functionName, blockNumber });
    stage = 'historical_accounting';
    const [lifecycle, own, reserve, used, paid] = await Promise.all([read('lifecycle'), read('recipientAllocated'), read('reserveRemaining'), read('supportUsed'), read('totalPaid')]);
    assert.equal(h.Plan_by_pk.lifecycle, ['Open', 'Active', 'Closed'][lifecycle]);
    for (const [field, value] of Object.entries({ own, reserve, used, paid })) assert.equal(h.Plan_by_pk[field as 'own' | 'reserve' | 'used' | 'paid'], value.toString());
    stage = 'supporter_accounting';
    const supporters = await c.client.readContract({ address, abi: FallbackPlanAbi, functionName: 'supporters', blockNumber });
    assert.equal(h.Supporter.length, supporters.length);
    for (const s of h.Supporter) {
      const beneficiary = getAddress(s.address);
      assert.ok(supporters.some(a => a.toLowerCase() === beneficiary.toLowerCase()));
      const share = await c.client.readContract({ address, abi: FallbackPlanAbi, functionName: 'shares', args: [beneficiary], blockNumber });
      assert.deepEqual([s.contribution, s.frozenContribution, s.prefix], share.slice(0, 3).map(String));
      const claimable = await c.client.readContract({ address, abi: FallbackPlanAbi, functionName: 'claimable', args: [beneficiary], blockNumber });
      if (lifecycle === 2) {
        assert.equal(BigInt(s.entitlement) - BigInt(s.claimed), claimable);
        assert.equal(share[4], BigInt(s.claimed) > 0n);
      } else {
        assert.equal(s.claimed, '0'); assert.equal(s.entitlement, '0');
        assert.equal(share[4], false); assert.equal(claimable, 0n);
      }
    }
    stage = 'receipt_identity';
    let offset = 0, page = h.Timeline, events = 0;
    let previousBlock = -1n, previousLog = -1;
    const seen = new Set<string>();
    for (;;) {
      for (const e of page) {
        assert.ok(!seen.has(e.id)); seen.add(e.id);
        const height = BigInt(e.blockNumber);
        assert.ok(height > previousBlock || (height === previousBlock && e.logIndex > previousLog));
        previousBlock = height; previousLog = e.logIndex;
        assert.equal(e.id, `10143:${e.transactionHash}:${e.logIndex}`);
        const receipt = await c.client.getTransactionReceipt({ hash: e.transactionHash as Hex });
        assert.equal(receipt.status, 'success'); assert.equal(receipt.blockNumber, height);
        const block = await c.client.getBlock({ blockNumber: height });
        assert.equal(receipt.blockHash, block.hash); assert.equal(e.timestamp, block.timestamp.toString());
        const factoryEvent = e.kind === 'PlanCreated';
        const logs = receipt.logs.filter(log => log.logIndex === e.logIndex && log.address.toLowerCase() === (factoryEvent ? c.factory : address).toLowerCase());
        const parsed = factoryEvent ? parseEventLogs({ abi: FallbackFactoryAbi, logs }) : parseEventLogs({ abi: FallbackPlanAbi, logs });
        assert.equal(parsed.length, 1); assert.equal(parsed[0]!.eventName, e.kind);
        const args = parsed[0]!.args as Record<string, unknown>;
        for (const key of ['amount', 'own', 'support', 'installment'] as const) {
          if (e[key] !== null) assert.equal(String(e[key]), String(args[key]));
        }
        if (factoryEvent) assert.equal(String(args.plan).toLowerCase(), address.toLowerCase());
        events++;
      }
      if (page.length < 50) break;
      offset += 50; assert.ok(offset <= 500, 'HISTORY_EXCEEDS_VERIFICATION_BOUND');
      // Freeze pagination to this first watermark rather than mix changing histories.
      const next = await history(10143, address, offset);
      assert.equal(next.sync?.processedBlock, h.sync.processedBlock, 'INDEX_CHANGED_DURING_PAGINATION_RETRY');
      page = next.Timeline;
    }
    reports.push({ indexed: true, coverage, processedBlock: blockNumber.toString(), accountingMatchesAtProcessedHeight: true, supporterSlotsChecked: h.Supporter.length, receiptEventsChecked: events, canonicalReceiptsAtObservation: true, own: own.toString(), reserve: reserve.toString(), used: used.toString(), paid: paid.toString(), lifecycle: h.Plan_by_pk.lifecycle });
  }
  stage = 'runtime_watermark';
  const runtime = await indexerQuery('query Runtime { FallbackSync(where: {chainId: {_eq: 10143}}, limit: 1) { chainId processedBlock sourceBlock eventsProcessed } }', {});
  const evidence = { observedAt: new Date().toISOString(), scope: 'Actual private Hasura and historical Monad Testnet RPC; existing registry, no signing/submission', rpcHead: head.number.toString(), registeredPlans: count.toString(), runtimeWatermark: runtime.FallbackSync, plans: reports, reorgRollbackTested: false, controlledLagTested: false };
  await writeFile('docs/evidence/indexer-live-reconciliation.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} catch {
  console.error(`INDEXER_LIVE_VERIFICATION_FAILED ${stage}; no raw provider/GraphQL errors or account identifiers logged.`);
  process.exitCode = 1;
}
