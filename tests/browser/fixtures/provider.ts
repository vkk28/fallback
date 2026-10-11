// Isolated browser-test provider. Never imported by the application build.
export function usePrivy() { return { getAccessToken: async () => 'isolated-ui-fixture' }; }
export function useAuthorizationSignature() { return { generateAuthorizationSignature: async () => { window.fixtureAuthorizations++; return { signature: 'isolated-ui-fixture-signature' }; } }; }
declare global { interface Window { fixtureAuthorizations: number; fixtureCalls: string[]; } }
