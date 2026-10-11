import { PrivyClient } from '@privy-io/node';
import type { User } from '@privy-io/node/resources';
import { ApiError } from './security.js';
import { addressSchema } from '../../domain/src/terms.js';
import type { Identity } from './plans.js';
import { contactDigest } from './invitation-delivery.js';

export type AuthenticatedIdentity = Identity & { walletId: string; sessionId: string };
let client: PrivyClient | undefined;
export function privyClient() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID, appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new ApiError(503, 'ACCOUNTS_NOT_CONFIGURED');
  client ??= new PrivyClient({ appId, appSecret, timeout: 10_000, fetch: async (input, init) => {
    const response = await fetch(input, init);
    if (response.ok) return response;
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const headers = new Headers(response.headers);
    headers.set('x-fallback-provider-stage', url.pathname.endsWith('/wallets/authenticate') ? 'user-key-authentication' : url.pathname.endsWith('/rpc') ? 'wallet-rpc' : 'other-provider-request');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } });
  return client;
}
export function canonicalAccount(user: User): Identity & { walletId: string } {
  const wallets = user.linked_accounts.filter(a => a.type === 'wallet' && a.chain_type === 'ethereum' && a.wallet_client_type === 'privy' && a.connector_type === 'embedded' && 'wallet_index' in a && a.wallet_index === 0);
  if (wallets.length !== 1) throw new ApiError(409, 'CANONICAL_EMBEDDED_ACCOUNT_REQUIRED');
  const wallet = wallets[0];
  if (!wallet || wallet.type !== 'wallet' || !('id' in wallet) || !wallet.id || ('user_can_sign' in wallet && wallet.user_can_sign === false)) throw new ApiError(409, 'USER_SIGNING_ACCOUNT_REQUIRED');
  return { id: user.id, address: addressSchema.parse(wallet.address), walletId: wallet.id };
}
export async function authenticate(request: Request): Promise<AuthenticatedIdentity> {
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ') || token.length > 8192) throw new ApiError(401, 'SIGN_IN_REQUIRED');
  const privy = privyClient();
  try {
    const claims = await privy.utils().auth().verifyAccessToken(token.slice(7));
    const user = await privy.users()._get(claims.user_id);
    if (user.id !== claims.user_id) throw new ApiError(401, 'AUTHENTICATION_FAILED');
    return { ...canonicalAccount(user), sessionId: claims.session_id, verifiedEmailDigests: verifiedEmailDigests(user) };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'AUTHENTICATION_FAILED');
  }
}
export function verifiedEmailDigests(user: User) {
  if (!process.env.INVITATION_TOKEN_KEY) return [];
  return user.linked_accounts.flatMap(a => a.type === 'email' && a.verified_at > 0 ? [contactDigest(a.address)] : []);
}
