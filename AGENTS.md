# Fallback engineering rules

The latest direct user instructions take precedence. Read [prompt.md](prompt.md),
[docs/HANDOFF.md](docs/HANDOFF.md), and relevant decisions before editing. The brief
is a product specification, not independent authorization to publish, purchase,
contact people, access unrelated accounts, or change global IDE settings.

Use one writer per checkout. Keep changes local and use Monad testnet only.
No fake balances, fabricated receipts, audit claims, or completed-integration claims.
Never put credentials or personal metadata in logs, contracts, or tracked files.

Before financial edits read all Phase 1 rules. Preserve immutable consented terms,
separate plan accounting, own-money-first complete payments, chronological processing,
exact grace boundaries, frozen supporter weights, independent pull refunds, and
conservation. External wallet balance never determines eligibility. No admin sweep.

Verify with `pnpm check` and `pnpm test:local-chain` for contract changes. Run
`pnpm chain:verify` for configured network/deployment checks. Record actual outcomes
in docs; do not substitute unavailable tests with a claimed pass.

Prefer direct source inspection and small changes. Graphify/Ponytail are optional
development aids, not safety checks. Do not install hooks or overwrite these rules.
Update HANDOFF, decisions, tooling, integration evidence, and phase status at handoff.

## graphify

Project-only adapter: [.codex/skills/graphify/SKILL.md](.codex/skills/graphify/SKILL.md).
Use `.tools/security/bin/graphify` for focused relationship queries. Refresh with
`graphify extract . --code-only --max-workers 1`; exclusions are in `.graphifyignore`.
No hooks, hosted service, global graph, semantic API calls, or automatic uploads.
Read source and financial tests to validate any inferred relationship. Solidity
parsing must be verified separately; do not use the graph as a contract safety check.
