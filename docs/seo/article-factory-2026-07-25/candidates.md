# Keyword Candidate Scores

Date: 2026-07-25

Scores are relevance, specificity, intent fit, and 3,000-word coverage ability, each out of 10.
The automatic gate checked exact and containing slugs, title token overlap above 60 percent,
declared primary keywords, and collisions inside the new queue. Manual review then compared
searcher intent against titles, H1s, descriptions, and broad legacy articles.

## Approved Queue

|   # | Primary keyword                        | Intent          | Scores      | Code evidence                               |
| --: | -------------------------------------- | --------------- | ----------- | ------------------------------------------- |
|   1 | QASkills CLI download fallback         | Troubleshooting | 10/10/9/10  | `packages/cli/src/lib/installer.ts`         |
|   2 | extract SKILL.md packages from GitHub  | How-to          | 10/10/9/9   | `extractSkillPackage`, `SKILL_PACKAGE_DIRS` |
|   3 | qaskills add --dir                     | How-to          | 10/10/9/8   | `packages/cli/src/commands/add.ts`          |
|   4 | qaskills init in CI                    | How-to          | 10/10/10/9  | `packages/cli/src/commands/init.ts`         |
|   5 | disable QASkills CLI telemetry         | How-to          | 10/10/10/9  | `packages/cli/src/lib/telemetry.ts`         |
|   6 | Clerk webhook idempotency testing      | How-to          | 10/9/9/10   | Clerk webhook route and users schema        |
|   7 | missed Clerk webhook recovery          | Troubleshooting | 10/10/9/9   | `getAuthUser` just-in-time provisioning     |
|   8 | HMAC unsubscribe token testing         | How-to          | 10/10/10/10 | unsubscribe token and API route             |
|   9 | batch email failure testing            | How-to          | 10/10/9/9   | `sendBatchEmails`, `Promise.allSettled`     |
|  10 | Resend Next.js build testing           | Troubleshooting | 9/10/9/8    | lazy Resend client and runtime guards       |
|  11 | Next.js DATABASE_URL build testing     | Troubleshooting | 10/10/10/9  | lazy Neon database proxy                    |
|  12 | Typesense facet filter testing         | How-to          | 10/10/9/9   | `searchSkills`, `extractFacetCounts`        |
|  13 | PostgreSQL JSONB filter testing        | How-to          | 10/10/10/10 | skills API JSONB `@>` filters               |
|  14 | leaderboard cache consistency testing  | How-to          | 10/9/9/9    | leaderboard API and `cacheGetOrSet`         |
|  15 | ZIP artifact checksum testing          | How-to          | 10/10/10/10 | artifact route, SHA-256, ETag               |
|  16 | markdown XSS sanitization testing      | Security how-to | 10/10/10/9  | `SkillDescription`, `rehype-sanitize`       |
|  17 | SKILL.md YAML frontmatter testing      | How-to          | 10/10/10/10 | `buildSkillMarkdown`, `parseSkillMd`        |
|  18 | SKILL.md array normalization testing   | How-to          | 10/10/9/10  | `toStringArray`, 413 seed packages          |
|  19 | malformed SKILL.md frontmatter testing | Troubleshooting | 10/9/10/10  | validator parse-error path                  |
|  20 | agent skill command safety testing     | Security how-to | 10/10/10/10 | `DANGEROUS_PATTERNS` validator              |
|  21 | MCP API timeout testing                | Troubleshooting | 10/9/10/10  | `fetchWithTimeout`, `AbortController`       |
|  22 | MCP search filter schema drift         | How-to          | 10/10/10/10 | MCP schema versus shared search schema      |
|  23 | MCP search response normalization      | How-to          | 9/9/9/9     | `normalizeSearchResponse` projection        |
|  24 | MCP package version drift testing      | Troubleshooting | 10/10/9/10  | package, server manifest, runtime version   |
|  25 | SKILL.md catalog regression testing    | How-to          | 10/9/10/10  | 413 seeds, parser, schema, quality score    |

## Approved Reserve

| Candidate                                 | Scores      | Reason held in reserve                               |
| ----------------------------------------- | ----------- | ---------------------------------------------------- |
| QASKILLS_API_URL custom registry          | 10/10/9/9   | Strong alternate for the CLI cluster                 |
| QASkills CLI search filters               | 10/9/10/9   | Strong alternate, broader than selected internals    |
| QASkills live registry E2E tests          | 10/10/9/10  | Strong alternate, overlaps release-gate vocabulary   |
| skill artifact SHA-256 checksum           | 9/10/9/9    | Merged into the version-pinned ZIP artifact topic    |
| test skill package extraction             | 10/10/9/9   | Merged into the GitHub extraction article            |
| safe Git clone in Node.js                 | 10/10/9/9   | Useful alternate, adjacent to the download article   |
| Clerk user.updated webhook testing        | 10/9/9/9    | Strong alternate, narrower demand than idempotency   |
| Clerk middleware route protection testing | 10/9/10/9   | Strong alternate, adjacent to auth pillar content    |
| email unsubscribe preference testing      | 10/9/9/9    | Strong alternate, token integrity chosen first       |
| weekly digest email testing               | 10/9/9/10   | Strong alternate, lower evergreen demand             |
| notification preferences API testing      | 10/10/9/9   | Strong alternate, active schema caveat needs repair  |
| telemetry payload compatibility testing   | 10/10/10/10 | Strong alternate for a later API compatibility batch |
| MCP telemetry opt-out testing             | 10/9/9/9    | Strong alternate, CLI telemetry chosen first         |
| MCP skill directory precedence tests      | 10/9/9/10   | Strong alternate, installation articles are nearby   |
| skill quality score mutation testing      | 10/10/9/10  | Strong alternate for a quality-scoring cluster       |

## Gate Totals

- Candidates scored: 43
- Automatic survivors: 42
- Manual survivors after intent review: 40
- Selected for publication: 25
- Approved reserve: 15
- Automatic self-collision: 1
- Manual collision removals from the scored queue: 3
