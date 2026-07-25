# SEO Article Factory Final Report

Date: 2026-07-25

The factory added 25 codebase-driven QA engineering articles across the QASkills CLI,
authentication and email, data and artifacts, markdown and validation, and MCP and catalog
testing. All 25 passed the mandatory publication gate.

File paths below are relative to
`packages/web/src/app/blog/posts/`.

|   # | Slug                                                             | Primary keyword                        | Words |   Audit | File                                                                |
| --: | ---------------------------------------------------------------- | -------------------------------------- | ----: | ------: | ------------------------------------------------------------------- |
|   1 | `qaskills-cli-download-fallback-github-content-metadata`         | QASkills CLI download fallback         | 3,356 | 100/100 | `qaskills-cli-download-fallback-github-content-metadata.ts`         |
|   2 | `qaskills-cli-extract-skill-package-github`                      | extract SKILL.md packages from GitHub  | 3,414 | 100/100 | `qaskills-cli-extract-skill-package-github.ts`                      |
|   3 | `qaskills-add-custom-directory-ci`                               | qaskills add --dir                     | 3,352 | 100/100 | `qaskills-add-custom-directory-ci.ts`                               |
|   4 | `qaskills-init-non-interactive-ci`                               | qaskills init in CI                    | 3,240 | 100/100 | `qaskills-init-non-interactive-ci.ts`                               |
|   5 | `qaskills-cli-disable-telemetry-do-not-track`                    | disable QASkills CLI telemetry         | 3,341 | 100/100 | `qaskills-cli-disable-telemetry-do-not-track.ts`                    |
|   6 | `testing-clerk-user-created-webhook-idempotency`                 | Clerk webhook idempotency testing      | 3,312 | 100/100 | `testing-clerk-user-created-webhook-idempotency.ts`                 |
|   7 | `testing-missed-clerk-webhook-user-recovery`                     | missed Clerk webhook recovery          | 3,138 | 100/100 | `testing-missed-clerk-webhook-user-recovery.ts`                     |
|   8 | `testing-hmac-unsubscribe-token-tampering-expiration`            | HMAC unsubscribe token testing         | 3,202 | 100/100 | `testing-hmac-unsubscribe-token-tampering-expiration.ts`            |
|   9 | `testing-batch-email-partial-failures-promise-allsettled`        | batch email failure testing            | 3,323 | 100/100 | `testing-batch-email-partial-failures-promise-allsettled.ts`        |
|  10 | `testing-lazy-resend-initialization-nextjs-build`                | Resend Next.js build testing           | 3,314 | 100/100 | `testing-lazy-resend-initialization-nextjs-build.ts`                |
|  11 | `testing-lazy-neon-database-initialization-nextjs-build`         | Next.js DATABASE_URL build testing     | 3,275 | 100/100 | `testing-lazy-neon-database-initialization-nextjs-build.ts`         |
|  12 | `testing-typesense-multiselect-facet-filter-queries`             | Typesense facet filter testing         | 3,104 | 100/100 | `testing-typesense-multiselect-facet-filter-queries.ts`             |
|  13 | `testing-postgresql-jsonb-multiselect-filters-drizzle`           | PostgreSQL JSONB filter testing        | 3,102 | 100/100 | `testing-postgresql-jsonb-multiselect-filters-drizzle.ts`           |
|  14 | `testing-leaderboard-cache-filter-isolation-ranking-consistency` | leaderboard cache consistency testing  | 3,118 | 100/100 | `testing-leaderboard-cache-filter-isolation-ranking-consistency.ts` |
|  15 | `testing-versioned-zip-artifact-sha256-etag`                     | ZIP artifact checksum testing          | 3,220 | 100/100 | `testing-versioned-zip-artifact-sha256-etag.ts`                     |
|  16 | `testing-markdown-xss-react-markdown-rehype-sanitize`            | markdown XSS sanitization testing      | 3,147 | 100/100 | `testing-markdown-xss-react-markdown-rehype-sanitize.ts`            |
|  17 | `testing-skill-md-yaml-frontmatter-roundtrip`                    | SKILL.md YAML frontmatter testing      | 3,187 | 100/100 | `testing-skill-md-yaml-frontmatter-roundtrip.ts`                    |
|  18 | `skill-md-csv-yaml-array-normalization-tests`                    | SKILL.md array normalization testing   | 3,147 | 100/100 | `skill-md-csv-yaml-array-normalization-tests.ts`                    |
|  19 | `malformed-skill-md-frontmatter-parser-tests`                    | malformed SKILL.md frontmatter testing | 3,232 | 100/100 | `malformed-skill-md-frontmatter-parser-tests.ts`                    |
|  20 | `agent-skill-dangerous-command-static-analysis-tests`            | agent skill command safety testing     | 3,214 | 100/100 | `agent-skill-dangerous-command-static-analysis-tests.ts`            |
|  21 | `mcp-api-timeout-abortcontroller-testing`                        | MCP API timeout testing                | 3,307 | 100/100 | `mcp-api-timeout-abortcontroller-testing.ts`                        |
|  22 | `mcp-search-filter-schema-drift-contract-tests`                  | MCP search filter schema drift         | 3,331 | 100/100 | `mcp-search-filter-schema-drift-contract-tests.ts`                  |
|  23 | `mcp-search-response-normalization-contract-tests`               | MCP search response normalization      | 3,123 | 100/100 | `mcp-search-response-normalization-contract-tests.ts`               |
|  24 | `mcp-package-registry-version-drift-tests`                       | MCP package version drift testing      | 3,235 | 100/100 | `mcp-package-registry-version-drift-tests.ts`                       |
|  25 | `seed-skill-catalog-parser-regression-tests`                     | SKILL.md catalog regression testing    | 3,356 | 100/100 | `seed-skill-catalog-parser-regression-tests.ts`                     |

## Rejected Topics

The collision audit rejected or deferred 22 topics. Three candidates failed the formal scored
queue because an existing page or another candidate already owned the intent. Nineteen broader
or unsafe topics were removed during source mining. The complete reasons and owners are in
`rejected.md`.

## Inventory

| Metric                            |  Count |
| --------------------------------- | -----: |
| Existing registered blog articles |  1,466 |
| Existing static routes            |     37 |
| Existing inventory records        |  1,503 |
| New articles                      |     25 |
| Final registered blog articles    |  1,491 |
| Final inventory records           |  1,528 |
| Approved reserve topics           |     15 |
| Rejected or deferred topics       |     22 |
| New body words                    | 81,090 |

The final scratch inventory is
`/tmp/qaskills-seo-final-inventory-20260725.json`. Its SHA-256 digest is
`e3ae0e681a1995d85ed4d2d04a050d87cd9bbf7b9a44c49d7e046634232636a8`.

## Verification

| Check                            | Result                      |
| -------------------------------- | --------------------------- |
| Article publication gate         | PASS, 8 tests               |
| Web unit suite                   | PASS, 25 files and 87 tests |
| Monorepo build                   | PASS, 6 packages            |
| Playwright post-flow             | PASS, 134 tests in Chromium |
| Authoritative source URLs        | PASS, 54 of 54              |
| Blog registration                | PASS, 25 unique slugs       |
| Sitemap and live route contracts | PASS, all 25 articles       |
