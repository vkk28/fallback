# Provider setup

Use your own provider applications and credentials for a separate deployment.
Start with [.env.example](../.env.example) and run:

~~~sh
node scripts/prepare-env.mjs
~~~

The helper preserves existing values, prepares local invitation/relay keys and
restricts .env permissions. Provider configuration is still required.
Only the public Privy app ID belongs in NEXT_PUBLIC_*; keep all server credentials
in ignored local files or the hosting provider's secret manager.

## Monad Testnet

Set CHAIN_ID to 10143 and MONAD_RPC_URL to a Monad Testnet endpoint. The hosted
application uses private Alchemy RPC. For the existing deployment, take
FACTORY_ADDRESS, TOKEN_ADDRESS and DEPLOYMENT_START_BLOCK from the
[manifest](../packages/chain/deployments/monad-testnet.json).

~~~sh
pnpm compiler:install
pnpm contracts:build
pnpm chain:verify
~~~

FBTEST is a six-decimal public-mint test token with no real value. Runtime
verification checks chain, token, factory and immutable configuration. Explorer
source publication has its own status in the manifest.

## Privy

Configure email sign-in, embedded Ethereum accounts and Monad Testnet sponsorship
in your Privy application. Fallback uses native user authorization with TEE
user-controlled server wallets; retain the same account model when configuring
a separate app. Add the exact local and hosted origins.

Set NEXT_PUBLIC_PRIVY_APP_ID and server-only PRIVY_APP_SECRET. Enable
PRIVY_SERVER_SPONSORSHIP_ENABLED only after the provider sponsorship policy is
configured. The app uses sponsored server submission with client authorization;
the existing configuration disables client transaction access.

Sign in with separate owner, payee and supporter accounts. Each person's account
authorizes its own actions. Joining an invitation does not accept payment terms,
and token approval does not deposit money.

## PostgreSQL and invitations

Set DATABASE_URL to a private PostgreSQL connection; use certificate-verified TLS
for hosted access. For the local project database:

~~~sh
pnpm services:start database
pnpm db:migrate
~~~

The local service binds loopback port 54329. Migrations are versioned under
[infra/migrations](../infra/migrations). Keep invitation keys stable across
restarts and restores so existing identities remain usable.

Optional email delivery requires RESEND_API_KEY, INVITATION_EMAIL_FROM,
INVITATION_DELIVERY_KEY and a reachable HTTPS INVITATION_APP_ORIGIN. The delivery
key is a random 32-byte key encoded as 64 lowercase hexadecimal characters.
Retain it privately with backups. Email sending is an explicit consented action;
shared links and the bound Requests inbox work without enabling email delivery.

## Envio and GraphQL

The root [config.yaml](../config.yaml) uses the shared
[schema](../indexer/schema.graphql) and [handlers](../indexer/src/handlers/events.ts)
for hosted indexing. Preserve the factory's deployment start block.

~~~sh
pnpm indexer:configure
pnpm indexer:codegen
pnpm indexer:typecheck
~~~

Set ENVIO_GRAPHQL_URL and the matching server-side ENVIO_GRAPHQL_SECRET or
ENVIO_API_TOKEN for your reader. Verify actual query results and processing
watermarks. Do not infer readiness from a configured URL alone.

For optional local Hasura development, the owned helpers are
<code>pnpm graphql:prepare</code>, <code>pnpm graphql:start</code>,
<code>pnpm graphql:status</code> and <code>pnpm graphql:verify-reader</code>.
Docker is needed for that local environment, not for using the hosted app.

## Worker and CRE

A separate installation needs a dedicated testnet WORKER_PRIVATE_KEY with faucet
gas and access to the same durable job database. Preserve that signer and journal
across restarts. Follow the [deployment guide](deployment.md) before enabling the
hosted worker.

CRE uses CRE_RELAY_SECRET and an exact configured HTTPS adapter origin.
Authenticate the CRE CLI, build the workflow and simulate only against an origin
you control and have configured:

~~~sh
pnpm cre:typecheck
pnpm cre:test
pnpm cre:build
pnpm cre:simulate --authorized-origin https://your-app.example
~~~

Replace the example with your exact adapter origin. The simulation helper forwards
only the relay credential. A simulation can enqueue eligible permissionless testnet
jobs; use it with that consequence understood.

<code>pnpm cre:execute --authorized-origin https://your-app.example</code>
additionally requires non-empty accepted work. Exit 2 denotes a valid empty/stale
scan. Accepted work still requires canonical payment-receipt reconciliation.
Simulation does not deploy the workflow on the CRE network.
