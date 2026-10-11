export function approvedCreOrigin(configured: string, authorized: string) {
  const check = (value: string) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /(?:^|\.)(example|invalid|localhost)$/.test(url.hostname) || url.hostname === '127.0.0.1') throw new Error('TRUSTED_HTTPS_ADAPTER_REQUIRED');
    return url.origin;
  };
  const configuredOrigin = check(configured), authorizedOrigin = check(authorized);
  if (configuredOrigin !== authorizedOrigin) throw new Error('CRE_ORIGIN_AUTHORIZATION_MISMATCH');
  return configuredOrigin;
}
export function creProcessEnvironment(environment: Record<string, string | undefined>) {
  return Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'XDG_CONFIG_HOME'].flatMap(key => environment[key] ? [[key, environment[key]!]] : []));
}
export function relayOnlyEnvironment(secret: string | undefined) {
  if (!secret || secret.length < 32 || /[\r\n\0]/.test(secret)) throw new Error('CRE_RELAY_SECRET_REQUIRED');
  const quote = secret.includes("'") ? '"' : "'";
  if (secret.includes(quote)) throw new Error('CRE_RELAY_SECRET_REQUIRED');
  // Node dotenv does not unescape JSON quotes. Select a delimiter absent from the value.
  return `CRE_RELAY_SECRET=${quote}${secret}${quote}\n`;
}
