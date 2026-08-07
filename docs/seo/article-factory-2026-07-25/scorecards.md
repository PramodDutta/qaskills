# SEO Article Factory Scorecards

Date: 2026-07-25

## Scoring Method

Every article must pass every hard rule before it receives a score. Body word counts exclude
code fences and metadata. The publication gate checks metadata, structure, keyword placement,
FAQ coverage, tables, procedures, code examples, links, banned language, ASCII output,
collisions, and cross-article shingle overlap.

The E-E-A-T column reports Experience, Expertise, Authoritativeness, and Trustworthiness in
that order. Each pillar is worth 25 points. AI citation readiness covers answer-first copy,
question headings, standalone definitions, tables, lists, attributed sources, and generated
Article, FAQPage, and BreadcrumbList schema.

|   # | Slug                                                             | Words | Keyword density | Flesch | Internal links |     E-E-A-T | AI readiness | Result |
| --: | ---------------------------------------------------------------- | ----: | --------------: | -----: | -------------: | ----------: | -----------: | ------ |
|   1 | `qaskills-cli-download-fallback-github-content-metadata`         | 3,356 |           1.28% |   59.7 |             15 | 25/25/25/25 |      100/100 | PASS   |
|   2 | `qaskills-cli-extract-skill-package-github`                      | 3,414 |           1.54% |   57.5 |             12 | 25/25/25/25 |      100/100 | PASS   |
|   3 | `qaskills-add-custom-directory-ci`                               | 3,352 |           1.13% |   59.4 |             12 | 25/25/25/25 |      100/100 | PASS   |
|   4 | `qaskills-init-non-interactive-ci`                               | 3,240 |           1.31% |   61.4 |             14 | 25/25/25/25 |      100/100 | PASS   |
|   5 | `qaskills-cli-disable-telemetry-do-not-track`                    | 3,341 |           1.05% |   61.0 |             15 | 25/25/25/25 |      100/100 | PASS   |
|   6 | `testing-clerk-user-created-webhook-idempotency`                 | 3,312 |           1.07% |   56.5 |             11 | 25/25/25/25 |      100/100 | PASS   |
|   7 | `testing-missed-clerk-webhook-user-recovery`                     | 3,138 |           1.26% |   61.1 |             12 | 25/25/25/25 |      100/100 | PASS   |
|   8 | `testing-hmac-unsubscribe-token-tampering-expiration`            | 3,202 |           1.10% |   59.5 |             10 | 25/25/25/25 |      100/100 | PASS   |
|   9 | `testing-batch-email-partial-failures-promise-allsettled`        | 3,323 |           1.07% |   63.4 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  10 | `testing-lazy-resend-initialization-nextjs-build`                | 3,314 |           1.33% |   59.7 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  11 | `testing-lazy-neon-database-initialization-nextjs-build`         | 3,275 |           2.16% |   61.4 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  12 | `testing-typesense-multiselect-facet-filter-queries`             | 3,104 |           1.52% |   57.1 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  13 | `testing-postgresql-jsonb-multiselect-filters-drizzle`           | 3,102 |           1.51% |   60.6 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  14 | `testing-leaderboard-cache-filter-isolation-ranking-consistency` | 3,118 |           1.51% |   59.8 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  15 | `testing-versioned-zip-artifact-sha256-etag`                     | 3,220 |           1.45% |   55.6 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  16 | `testing-markdown-xss-react-markdown-rehype-sanitize`            | 3,147 |           1.26% |   61.4 |             12 | 25/25/25/25 |      100/100 | PASS   |
|  17 | `testing-skill-md-yaml-frontmatter-roundtrip`                    | 3,187 |           1.08% |   60.2 |             11 | 25/25/25/25 |      100/100 | PASS   |
|  18 | `skill-md-csv-yaml-array-normalization-tests`                    | 3,147 |           1.26% |   57.7 |             12 | 25/25/25/25 |      100/100 | PASS   |
|  19 | `malformed-skill-md-frontmatter-parser-tests`                    | 3,232 |           1.38% |   57.5 |             12 | 25/25/25/25 |      100/100 | PASS   |
|  20 | `agent-skill-dangerous-command-static-analysis-tests`            | 3,214 |           1.39% |   60.2 |             11 | 25/25/25/25 |      100/100 | PASS   |
|  21 | `mcp-api-timeout-abortcontroller-testing`                        | 3,307 |           1.66% |   55.8 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  22 | `mcp-search-filter-schema-drift-contract-tests`                  | 3,331 |           1.48% |   57.7 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  23 | `mcp-search-response-normalization-contract-tests`               | 3,123 |           1.40% |   57.0 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  24 | `mcp-package-registry-version-drift-tests`                       | 3,235 |           1.64% |   56.5 |             10 | 25/25/25/25 |      100/100 | PASS   |
|  25 | `seed-skill-catalog-parser-regression-tests`                     | 3,356 |           1.16% |   56.3 |             12 | 25/25/25/25 |      100/100 | PASS   |

## Batch Results

- Body words: 81,090.
- Body word range: 3,102 to 3,414.
- Keyword density range: 1.05% to 2.16%.
- Average sentence length range: 14.5 to 15.8 words.
- Flesch Reading Ease range: 55.6 to 63.4.
- Internal links: 10 to 15 per article, or 3.00 to 4.49 links per 1,000 words.
- Structural gate: all articles have 10 or 11 H2 sections, a final FAQ, a table, a numbered
  procedure, at least two code blocks, and verified internal routes.
- Dedup gate: no slug, title, primary-keyword, intent, or cross-batch shingle collision.
- Language gate: no banned phrases, em dashes, or non-ASCII characters.
- Source gate: 54 of 54 authoritative source URLs resolved successfully.
