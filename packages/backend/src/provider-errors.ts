import { APIError } from '@privy-io/node';

const codes = ['policy_violation', 'insufficient_funds', 'transaction_broadcast_failure', 'missing_or_empty_authorization_header', 'zero_correct_authorization_signatures', 'insufficient_correct_authorization_signatures', 'incorrect_quantity_of_authorization_signatures', 'request_expired', 'no_valid_user_session_keys', 'user_session_keys_expired'] as const;
const vocabulary = new Set('privy jwt jwts authentication authorization server client allow allowed disabled enabled configured configuration not supported unsupported invalid access identity token tokens expired audience issuer missing signing session key keys using use api app feature wallet wallets third party requires request method headers dashboard cannot code context only'.split(' '));
/** Diagnostic words come from a fixed public vocabulary, never arbitrary provider text. */
export function providerReasonWords(error: unknown): string {
  if (!(error instanceof APIError)) return '';
  let message = error.message.slice(0, 8192);
  for (const key of ['PRIVY_APP_SECRET', 'NEXT_PUBLIC_PRIVY_APP_ID', 'INVITATION_TOKEN_KEY', 'CRE_RELAY_SECRET', 'DATABASE_URL']) {
    const secret = process.env[key];
    if (secret) message = message.split(secret).join('');
  }
  message = message.replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '').replace(/\S+@\S+/g, '').replace(/https?:\/\/\S+/g, '').replace(/0x[a-fA-F0-9]+/g, '');
  return (message.toLowerCase().match(/[a-z]+/g) || []).filter(word => vocabulary.has(word)).slice(0, 40).join(' ');
}
/** Return fixed diagnostic categories only. Never return provider messages or identifiers. */
export function providerDiagnostic(error: unknown): string {
  if (!(error instanceof APIError)) return 'provider_transport_or_unknown';
  const payload = error.error as { code?: unknown; message?: unknown; error?: unknown } | undefined;
  const text = error.message.toLowerCase().slice(0, 8192);
  if (/gas (sponsorship )?credits|sponsorship credits/.test(text) && /insufficient|exhaust|balance|depleted/.test(text)) return 'sponsorship_credits_unavailable';
  const known = codes.find(code => payload?.code === code || text.includes(code));
  if (known) return known;
  if (/jwt/.test(text) && /invalid|unsupported|configur|allow|enable/.test(text)) return 'user_jwt_authentication_rejected';
  if (/sponsor/.test(text) && /not enabled|disabled|not support|unsupported/.test(text)) return 'sponsorship_not_available';
  if (/chain|network/.test(text) && /not support|unsupported|not enabled|not allowed/.test(text)) return 'network_not_available';
  if (/idempotency/.test(text) && /invalid|length|character/.test(text)) return 'request_key_invalid';
  if (/reference_id/.test(text) && /invalid|length|character/.test(text)) return 'request_reference_invalid';
  if (/chain_id|caip2|transaction\.value|params\.transaction/.test(text) && /invalid|expected|format|must/.test(text)) return 'transaction_parameters_rejected';
  return 'provider_request_rejected_unknown_reason';
}
