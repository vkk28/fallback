import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from './database.js';
import { invitationDeliveries, invitations, plans } from './schema.js';
import { privatePlan, type Identity } from './plans.js';
import { ApiError } from './security.js';

const emailSchema = z.string().trim().toLowerCase().email().max(254);
export function contactDigest(email: string) {
  const secret = process.env.INVITATION_TOKEN_KEY;
  if (!secret || secret.length < 32) throw new ApiError(503, 'INVITATION_KEY_REQUIRED');
  return createHmac('sha256', secret).update('verified-email:' + emailSchema.parse(email)).digest('hex');
}
const envelopeSchema = z.object({ from: z.string().email(), to: z.array(emailSchema).length(1), subject: z.literal('Your Fallback invitation'), text: z.string().max(2000) }).strict();
function deliveryKey() {
  const key = process.env.INVITATION_DELIVERY_KEY;
  if (!key || !/^[a-f0-9]{64}$/.test(key)) throw new ApiError(503, 'EMAIL_DELIVERY_NOT_CONFIGURED');
  return Buffer.from(key, 'hex');
}
function deliveryOrigin() {
  let origin: URL;
  try { origin = new URL(process.env.INVITATION_APP_ORIGIN || ''); } catch { throw new ApiError(503, 'REACHABLE_INVITATION_ORIGIN_REQUIRED'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new ApiError(503, 'REACHABLE_INVITATION_ORIGIN_REQUIRED');
  return origin.origin;
}
export function deliveryConfigured() {
  try { deliveryKey(); deliveryOrigin(); return !!process.env.RESEND_API_KEY && emailSchema.safeParse(process.env.INVITATION_EMAIL_FROM).success; } catch { return false; }
}
export async function prepareDelivery(db: Database, id: string, email: string, token: string, role: string, expires: Date) {
  const origin = deliveryOrigin();
  const from = emailSchema.parse(process.env.INVITATION_EMAIL_FROM);
  const envelope = envelopeSchema.parse({ from, to: [email], subject: 'Your Fallback invitation', text: `You were invited to ${role === 'payee' ? 'review scheduled payments' : 'review family backup'} in Fallback.\n\nSign in using this email and review: ${origin}/invite#${token}\n\nExpires ${expires.toISOString()}. Joining does not move money or accept payment terms. Monad Testnet / FBTEST test tokens have no real value. Ignore this request if unexpected.` });
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', deliveryKey(), nonce);
  cipher.setAAD(Buffer.from(id));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(envelope), 'utf8'), cipher.final()]);
  await db.insert(invitationDeliveries).values({ invitationId: id, envelope: Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64') });
}
function decryptEnvelope(id: string, encrypted: string) {
  const bytes = Buffer.from(encrypted, 'base64'), decipher = createDecipheriv('aes-256-gcm', deliveryKey(), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(id)); decipher.setAuthTag(bytes.subarray(12, 28));
  return envelopeSchema.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')));
}
// Explicit owner action only. No background sender is enabled by installing this module.
export async function deliverInvitation(db: Database, actor: Identity, id: string, at?: Date, transport: typeof fetch = fetch) {
  return db.transaction(async tx => {
    const invitation = await tx.query.invitations.findFirst({ where: eq(invitations.digest, id) });
    if (!invitation) throw new ApiError(404, 'INVITATION_NOT_FOUND');
    const plan = await privatePlan(tx, actor, invitation.planId);
    if (plan.ownerId !== actor.id) throw new ApiError(403, 'RECIPIENT_ONLY');
    await tx.select().from(plans).where(eq(plans.id, plan.id)).for('update');
    const [current] = await tx.select().from(invitations).where(eq(invitations.digest, id));
    const [delivery] = await tx.select().from(invitationDeliveries).where(eq(invitationDeliveries.invitationId, id)).for('update');
    if (!delivery || !current) throw new ApiError(404, 'EMAIL_DELIVERY_NOT_REQUESTED');
    const now = at || new Date();
    if (delivery.status === 'accepted') return { status: 'accepted', delivered: false };
    if (current.consumedBy || current.revokedAt || current.declinedAt || current.expiresAt <= now) throw new ApiError(410, 'INVITATION_EXPIRED_OR_USED');
    if (delivery.status === 'failed' || delivery.attempts >= 5 || delivery.firstAttemptAt && now.getTime() >= delivery.firstAttemptAt.getTime() + 23 * 3600_000) throw new ApiError(409, 'EMAIL_REPLACEMENT_REQUIRED');
    if (delivery.nextAttemptAt > now) throw new ApiError(429, 'EMAIL_RETRY_LATER');
    if (!process.env.RESEND_API_KEY) throw new ApiError(503, 'EMAIL_DELIVERY_NOT_CONFIGURED');
    const envelope = decryptEnvelope(id, delivery.envelope);
    // The envelope and provider key remain fixed across lost-response retries.
    // The <24h cutoff avoids retrying outside Resend's idempotency retention.
    let status = 'retry', providerId: string | null = null;
    try {
      const response = await transport('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': `fallback-invite/${id}` }, body: JSON.stringify(envelope), signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (response.ok) { const result = z.object({ id: z.string().min(1).max(100) }).parse(await response.json()); status = 'accepted'; providerId = result.id; }
      else if (response.status !== 429 && response.status !== 409 && response.status < 500) status = 'failed';
    } catch { /* Ambiguous outcome stays retryable with the exact same provider key/envelope. */ }
    await tx.update(invitationDeliveries).set({ status, providerId, attempts: sql`${invitationDeliveries.attempts} + 1`, firstAttemptAt: delivery.firstAttemptAt || now, nextAttemptAt: new Date(now.getTime() + Math.min(3600_000, 30_000 * 2 ** delivery.attempts)) }).where(and(eq(invitationDeliveries.invitationId, id), eq(invitationDeliveries.attempts, delivery.attempts)));
    return { status, delivered: false }; // API acceptance never proves mailbox delivery.
  });
}
