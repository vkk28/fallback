export default async function trigger() {
  if (process.env.HOSTED_WORKER_ENABLED !== 'true') return;
  const secret = process.env.WORKER_TRIGGER_SECRET;
  if (!secret || secret.length < 32) throw new Error('WORKER_TRIGGER_SECRET_REQUIRED');
  const origin = new URL(process.env.APP_ORIGIN || '');
  const hostOrigin = new URL(process.env.URL || '');
  if (origin.protocol !== 'https:' || origin.origin !== hostOrigin.origin || !origin.hostname.endsWith('.netlify.app') || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('HOSTED_WORKER_ORIGIN_REJECTED');
  try {
    const response = await fetch(new URL('/.netlify/functions/worker-background', origin), {
      method: 'POST', headers: { authorization: `Bearer ${secret}` },
      redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (response.status !== 202) throw new Error('WORKER_TRIGGER_FAILED');
  } catch { throw new Error('WORKER_TRIGGER_FAILED'); }
  if (process.env.HEALTH_MONITOR_ENABLED === 'true') {
    const relay = process.env.CRE_RELAY_SECRET;
    if (!relay || relay.length < 32) throw new Error('HEALTH_MONITOR_SECRET_REQUIRED');
    try {
      const response = await fetch(new URL('/api/scheduler/operations', origin), { headers: { authorization: `Bearer ${relay}` }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error('HEALTH_MONITOR_FAILED');
      const result = await response.json() as { healthy?: unknown; diagnostics?: unknown };
      if (result.healthy !== true) {
        const safe = new Set(['RPC_UNAVAILABLE_OR_WRONG_CHAIN', 'INDEXER_COVERAGE_UNKNOWN', 'INDEXER_BEHIND', 'QUEUE_UNAVAILABLE', 'FAILED_JOBS_REQUIRE_REVIEW', 'BROADCASTS_REQUIRE_RECONCILIATION', 'WORKER_HEARTBEAT_STALE_OR_UNKNOWN', 'WORKER_LAST_CYCLE_FAILED']);
        const diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics.filter(value => typeof value === 'string' && safe.has(value)).slice(0, 8) : [];
        console.error('Fallback operational monitoring:', diagnostics.join(',') || 'HEALTH_UNAVAILABLE');
        throw new Error('HEALTH_MONITOR_FAILED');
      }
    } catch { throw new Error('HEALTH_MONITOR_FAILED'); }
  }
}

// Allow free PostgreSQL to suspend between batches. Contract timestamps still
// determine eligibility; this cadence does not change any consented deadline.
export const config = { schedule: '*/15 * * * *' };
