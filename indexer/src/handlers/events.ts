import { indexer, type EvmEvent, type EvmOnEventContext, type Entity } from 'envio';
import { supporterRefund } from '../../../packages/domain/src/accounting.js';

const idOf = (event: EvmEvent) => `${event.chainId}:${event.transaction.hash}:${event.logIndex}`;
const planId = (event: EvmEvent) => `${event.chainId}:${event.srcAddress.toLowerCase()}`;
async function record(event: EvmEvent, context: EvmOnEventContext, plan: string, fields: Partial<Entity<'Timeline'>> = {}) {
  const id = idOf(event);
  if (await context.Timeline.get(id)) return false;
  context.Timeline.set({ id, planId: plan, kind: event.eventName, transactionHash: event.transaction.hash, logIndex: event.logIndex, blockNumber: BigInt(event.block.number), timestamp: BigInt(event.block.timestamp), actor: undefined, amount: undefined, own: undefined, support: undefined, installment: undefined, ...fields });
  return true;
}
indexer.contractRegister({ contract: 'FallbackFactory', event: 'PlanCreated' }, async ({ event, context }) => { context.chain.FallbackPlan.add(event.params.plan); });
indexer.onEvent({ contract: 'FallbackFactory', event: 'TermsProposed' }, async ({ event, context }) => {
  const p = event.params, id = `${event.chainId}:terms:${p.termsHash}`;
  if (!await record(event, context, id)) return;
  context.Terms.set({ id, amount: p.terms.amount, firstDue: p.terms.firstDue, interval: p.terms.interval, grace: p.terms.grace, count: Number(p.terms.count), recipient: p.recipient.toLowerCase(), payee: p.payee.toLowerCase(), accepted: false });
});
indexer.onEvent({ contract: 'FallbackFactory', event: 'PayeeAccepted' }, async ({ event, context }) => {
  const id = `${event.chainId}:terms:${event.params.termsHash}`;
  if (!await record(event, context, id)) return;
  const t = await context.Terms.getOrThrow(id); context.Terms.set({ ...t, accepted: true });
});
indexer.onEvent({ contract: 'FallbackFactory', event: 'PlanCreated' }, async ({ event, context }) => {
  const p = event.params, id = `${event.chainId}:${p.plan.toLowerCase()}`;
  if (!await record(event, context, id)) return;
  context.Plan.set({ id, address: p.plan.toLowerCase(), chainId: event.chainId, recipient: p.recipient.toLowerCase(), payee: p.payee.toLowerCase(), termsHash: p.termsHash, lifecycle: 'Open', own: 0n, reserve: 0n, used: 0n, paid: 0n, nextInstallment: 0, frozenFunding: 0n, frozenReserve: 0n, closureReason: undefined, lastBlock: BigInt(event.block.number), lastTimestamp: BigInt(event.block.timestamp) });
});
type PlanEvent = EvmEvent<'FallbackPlan'>;
async function onPlan(event: PlanEvent, context: EvmOnEventContext) {
  const id = planId(event);
  if (!await record(event, context, id)) return;
  const old = await context.Plan.getOrThrow(id);
  let p: Entity<'Plan'> = { ...old, lastBlock: BigInt(event.block.number), lastTimestamp: BigInt(event.block.timestamp) };
  const timeline = await context.Timeline.getOrThrow(idOf(event));
  switch (event.eventName) {
    case 'AllocationChanged': p = { ...p, own: event.params.balance }; context.Timeline.set({ ...timeline, amount: event.params.amount, actor: event.params.recipient.toLowerCase() }); break;
    case 'SupportChanged': {
      const e = event.params, shareId = `${id}:${e.supporter.toLowerCase()}`;
      const share = await context.Supporter.get(shareId);
      context.Supporter.set({ id: shareId, planId: id, address: e.supporter.toLowerCase(), contribution: e.contribution, frozenContribution: share?.frozenContribution || 0n, prefix: share?.prefix || 0n, claimed: share?.claimed || 0n, entitlement: 0n });
      p = { ...p, reserve: e.reserve }; context.Timeline.set({ ...timeline, amount: e.amount, actor: e.supporter.toLowerCase() }); break;
    }
    case 'ShareFrozen': {
      const e = event.params, shareId = `${id}:${e.supporter.toLowerCase()}`;
      const share = await context.Supporter.getOrThrow(shareId);
      context.Supporter.set({ ...share, frozenContribution: e.contribution, prefix: e.prefix }); break;
    }
    case 'Activated': p = { ...p, lifecycle: 'Active', frozenFunding: event.params.frozenFunding, own: event.params.recipientAllocation }; break;
    case 'PaymentSettled': {
      const e = event.params, index = Number(e.installment);
      p = { ...p, own: p.own - e.own, reserve: p.reserve - e.support, used: p.used + e.support, paid: p.paid + e.amount, nextInstallment: index + 1 };
      context.Installment.set({ id: `${id}:${index}`, planId: id, index, status: 'Paid', due: e.due, own: e.own, support: e.support, transactionHash: event.transaction.hash });
      context.Timeline.set({ ...timeline, amount: e.amount, own: e.own, support: e.support, installment: index }); break;
    }
    case 'InstallmentMissed': case 'InstallmentCancelled': {
      const index = Number(event.params.installment);
      context.Installment.set({ id: `${id}:${index}`, planId: id, index, status: event.eventName === 'InstallmentMissed' ? 'Missed' : 'Cancelled', due: 'due' in event.params ? event.params.due : undefined, own: 0n, support: 0n, transactionHash: event.transaction.hash });
      p = { ...p, nextInstallment: index + 1 }; context.Timeline.set({ ...timeline, installment: index }); break;
    }
    case 'Closed': {
      p = { ...p, lifecycle: 'Closed', frozenReserve: event.params.supportRefund, closureReason: Number(event.params.reason), own: event.params.recipientRefund, reserve: event.params.supportRefund };
      for (const share of await context.Supporter.getWhere({ planId: { _eq: id } })) context.Supporter.set({ ...share, entitlement: p.frozenFunding > 0n ? supporterRefund(p.frozenReserve, share.prefix, share.frozenContribution, p.frozenFunding) : share.contribution });
      break;
    }
    case 'Claimed': {
      const e = event.params;
      if (e.recipientClaim) p = { ...p, own: p.own - e.amount };
      else {
        const share = await context.Supporter.getOrThrow(`${id}:${e.beneficiary.toLowerCase()}`);
        context.Supporter.set({ ...share, claimed: share.claimed + e.amount }); p = { ...p, reserve: p.reserve - e.amount };
      }
      context.Timeline.set({ ...timeline, actor: e.beneficiary.toLowerCase(), amount: e.amount }); break;
    }
  }
  if (p.own < 0n || p.reserve < 0n) throw new Error('Event accounting out of order');
  context.Plan.set(p);
}
for (const event of ['AllocationChanged', 'SupportChanged', 'ShareFrozen', 'Activated', 'PaymentSettled', 'InstallmentMissed', 'InstallmentCancelled', 'Closed', 'Claimed'] as const) indexer.onEvent({ contract: 'FallbackPlan', event }, ({ event, context }) => onPlan(event, context));
