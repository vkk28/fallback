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
}

// Allow free PostgreSQL to suspend between batches. Contract timestamps still
// determine eligibility; this cadence does not change any consented deadline.
export const config = { schedule: '*/15 * * * *' };
