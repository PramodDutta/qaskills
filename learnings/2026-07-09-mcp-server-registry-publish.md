# Shipping @qaskills/mcp to npm + the official MCP registry in one session

## Problem

Build an MCP server for qaskills.sh (search/inspect/install skills from any MCP client), with delegation to Codex and Grok, and push it live to npm and registry.modelcontextprotocol.io.

## Approach

1. **Design before delegating.** The one decisive design fact: install_skill writes SKILL.md to the user's LOCAL filesystem, which forces stdio (npx) over remote HTTP. Everything else followed from that.
2. **Freeze a spec that names the ground truth.** The Codex prompt told it WHICH repo files hold the real API param names (route.ts, telemetry.ts) instead of describing them; Codex verified against source and matched the API exactly on first pass.
3. **Delegate by strength.** Codex: 323-line implementation + self-run live smoke tests. Grok: strategy prose (one good line survived editing). Claude: design, code review, verification, publish gates.
4. **Independent re-verification.** Re-ran the stdio JSON-RPC session myself (initialize, tools/list, tools/call against prod) before committing; delegate claims are advisory.
5. **Kill interactive auth with CI OIDC.** GitHub device-code login kept expiring on the user. mcp-publisher supports `login github-oidc` inside GitHub Actions: a workflow (mcp-publish.yml) does npm publish + registry publish unattended. Device codes eliminated permanently.
6. **Probe credential restrictions systematically.** npm publish 404 on PUT = token lacks create-package permission (not a missing package). Proved it across local token, CI secret, and an unscoped-name probe before asking the user for a new token.

## Judgment calls

- Did NOT wait for the user to fix auth before building the CI path; the workflow was ready so the user's single action (new token as repo secret) completed everything.
- Did NOT retry the expired device-code flow a third time; switched to OIDC instead of nagging.
- Did NOT make the MCP package depend on @qaskills/shared: standalone means publishing never entangles monorepo internals.
- Kept npm publish step idempotent (skip if version exists) so registry-only retries do not die on duplicate versions.

## Gotchas worth remembering

- **MCP registry description max 100 chars** (422 otherwise).
- **mcpName/server.json name case must EXACTLY match the GitHub username**: OIDC grants io.github.PramodDutta/*, so io.github.pramoddutta/... is 403 Forbidden. Changing it requires an npm version bump because the registry validates mcpName inside the published tarball.
- npm 404 on publish PUT usually means token permissions, not a registry problem.
- User pasted a token into chat: use it once (repo secret), then tell them to revoke and reissue; it lives in the transcript.

## Reusable rule

For any publish pipeline with interactive auth in the way, look for the CI OIDC variant first: turning "user must type a device code" into "workflow has id-token: write" converts a human-gated flow into a one-command unattended one.
