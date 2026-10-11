import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Database } from './database.js';
import { limits, requestKeys } from './schema.js';

export class ApiError extends Error {
  constructor(public status: number, public code: string, public details?: { requestId: string; providerStatus?: number; providerCode?: string }) { super(code); }
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function invitationToken(secret: string | undefined, context: string) {
  if (!secret || secret.length < 32) throw new ApiError(503, 'INVITATION_KEY_REQUIRED');
  return createHmac('sha256', secret).update(context).digest('base64url');
}
export function checkOrigin(request: Request, origin: string) {
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'ORIGIN_REJECTED');
}
export async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'JSON_REQUIRED');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'INVALID_JSON');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16_384) { await reader.cancel(); throw new ApiError(413, 'REQUEST_TOO_LARGE'); }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw) as unknown; } catch { throw new ApiError(400, 'INVALID_JSON'); }
}
export async function rateLimit(db: Database, key: string, max = 30, now = new Date()) {
  const resets = new Date(now.getTime() + 60_000);
  const [row] = await db.insert(limits).values({ key, count: 1, resetsAt: resets }).onConflictDoUpdate({ target: limits.key, set: {
    count: sql`CASE WHEN ${limits.resetsAt} <= ${now.toISOString()} THEN 1 ELSE ${limits.count} + 1 END`,
    resetsAt: sql`CASE WHEN ${limits.resetsAt} <= ${now.toISOString()} THEN ${resets.toISOString()}::timestamptz ELSE ${limits.resetsAt} END`,
  } }).returning();
  if (!row || row.count > max) throw new ApiError(429, 'RATE_LIMIT');
}

/** Serialize idempotent mutations inside a database transaction, with per-user scope. */
export async function idempotent<T>(db: Database, userId: string, key: string | null, fingerprint: string, operation: (tx: Database) => Promise<T>): Promise<T> {
  if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ':' + key}, 0))`);
    const old = await tx.query.requestKeys.findFirst({ where: (r, { and, eq }) => and(eq(r.userId, userId), eq(r.key, key)) });
    if (old) {
      if (old.fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT');
      return old.response as T;
    }
    const response = await operation(tx);
    await tx.insert(requestKeys).values({ userId, key, fingerprint, response: JSON.parse(JSON.stringify(response)) });
    return response;
  });
}

/** Compare configured relay credentials without emitting either value. */
export function relayAuth(request: Request, secret: string | undefined) {
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!secret || secret.length < 32 || supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) throw new ApiError(401, 'RELAY_UNAUTHORIZED');
}
