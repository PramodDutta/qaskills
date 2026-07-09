# QASkills MCP Server: Plan and Execution Log

**Date:** 2026-07-09
**Status:** BUILDING (this doc is the plan; execution log at the bottom updates as steps land)
**Delegation:** Codex implements the package from a frozen spec; Grok drafted strategy sections; Claude owns design, verification, publish gates.

## What we are shipping

`@qaskills/mcp`: a TypeScript stdio MCP server on npm, registered in the official MCP registry (registry.modelcontextprotocol.io) as `io.github.pramoddutta/qaskills`. Any MCP client (Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI) gets six tools wrapping the qaskills.sh public API:

| Tool | Does | Backing endpoint |
|---|---|---|
| search_skills | Find skills by query/type/framework/language | GET /api/skills |
| get_skill | Full metadata for one skill | GET /api/skills/{slug} |
| get_skill_content | The complete SKILL.md markdown | GET /api/skills/{slug}/content |
| install_skill | Write SKILL.md into the user's project (.claude/skills or .agents/skills) | content + local FS write |
| list_categories | Browse the category tree | GET /api/categories |
| get_leaderboard | Top skills by installs | GET /api/leaderboard |

**Why stdio and not remote HTTP:** `install_skill` is the killer tool and it writes to the user's local filesystem, which a remote server cannot do. The public API needs no auth, so `npx -y @qaskills/mcp` works with zero config. The official registry natively distributes npm stdio packages. A remote HTTP variant (search-only, hosted on qaskills.sh) is a sensible phase 2, not needed now.

**Key design choices:**
- Standalone package: no @qaskills/shared dependency, so publishing never entangles monorepo internals
- One tool per action (6 tools, small surface): schemas land in the model's context once, no discovery round-trips
- Read tools annotated readOnlyHint; install_skill idempotent, non-destructive
- Telemetry parity with the CLI: fire-and-forget install event, DO_NOT_TRACK/QASKILLS_TELEMETRY respected, so MCP installs feed the same leaderboard
- stdio discipline: no console.log (protocol channel), diagnostics to stderr

## Why an MCP server (strategy)

MCP is now the cross-agent standard: one server works in Claude Code, Cursor, Windsurf, and every MCP host, so we build once and appear everywhere QA engineers already work. In-conversation discovery beats leaving the editor: an agent that hits a testing problem can search the registry, read the skill, and have it installed without the human alt-tabbing to a website. `install_skill` closes the loop from discovery to an installed SKILL.md in the project: the moment of need becomes the moment of adoption. That is the product, not just a read-only API wrapper. And shipping a real MCP server unlocks distribution we could not touch before: the official MCP registry and awesome-mcp-servers (90k+ stars) explicitly list servers, not websites.

## Distribution surfaces this unlocks

- Official MCP registry (registry.modelcontextprotocol.io): searchable by every registry-aware client
- `npx -y @qaskills/mcp`: zero-install one-liner in any mcpServers config
- Claude Code: `claude mcp add qaskills -- npx -y @qaskills/mcp`
- Cursor / Windsurf / Gemini CLI / Codex CLI MCP configs (same JSON block, documented in README)
- awesome-mcp-servers PR (was blocked on "we have no MCP server"; now unblocked, see OSS-PROMOTION-PR-PLAN)
- A /mcp landing page on qaskills.sh + blog post targeting "qa mcp server" queries (SEO follow-up)

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| MCP registry is in preview; breaking changes or data resets possible | Registry holds only metadata; npm package is the artifact. Re-publish is one command |
| Low initial discoverability among thousands of servers | Pair launch with awesome-mcp-servers PR, blog post, and README cross-links from CLI and site |
| Coupling to qaskills.sh API shapes | Server pins to stable public GET endpoints only; 10s timeouts and typed errors degrade gracefully |
| Another package to maintain | Standalone, tiny surface (6 tools), same repo and CI conventions as the CLI; version bumps ride the existing release rhythm |

## Publish pipeline (facts verified against registry quickstart 2026-07-09)

1. package.json carries `"mcpName": "io.github.pramoddutta/qaskills"` (GitHub-auth namespace rule)
2. `npm publish --access public` from packages/mcp (npm account: thetestingacademy, already authed on this machine)
3. `server.json` in packages/mcp (drafted; name must equal mcpName; schema 2025-12-11)
4. `mcp-publisher login github` (device flow: USER opens github.com/login/device, enters printed code; publisher binary 1.7.9 already installed via brew)
5. `mcp-publisher publish`
6. Verify: `GET https://registry.modelcontextprotocol.io/v0/servers?search=qaskills`

## Acceptance bar

- [ ] pnpm build + tsc --noEmit clean for @qaskills/mcp
- [ ] Live stdio smoke test: initialize -> tools/list shows 6 tools -> search_skills returns real skills -> install_skill writes a real SKILL.md to a temp dir
- [ ] Zero em dashes in package files; no console.log on stdout path
- [ ] npm package public and installable via npx
- [ ] Registry entry live and searchable
- [ ] OSS plan updated: awesome-mcp-servers row flipped from deferred to actionable

## Execution log

- 2026-07-09: Plan written. Codex dispatched with frozen spec (packages/mcp implementation). Grok drafted strategy sections (edited into this doc). server.json drafted. Registry flow verified against modelcontextprotocol/registry quickstart. npm auth confirmed (thetestingacademy), mcp-publisher 1.7.9 installed.
- 2026-07-09 (later): SHIPPED. Codex implementation verified (live stdio smoke tests). Local + CI npm tokens were create-restricted; user minted a new granular token, set as NPM_TOKEN secret. mcp-publish.yml workflow publishes npm + registry via GitHub OIDC (no interactive auth). Two registry rejections fixed: description over 100 chars; mcpName case must match GitHub username exactly (io.github.PramodDutta, not pramoddutta). LIVE: npm @qaskills/mcp@0.1.1, registry io.github.PramodDutta/qaskills (status active). Cold npx verification passed. All acceptance boxes below satisfied.
