# Per-Article SEO Audit Scorecards

Date: 2026-07-18

These scorecards are valid only with the passing publication test, Playwright post-flow,
literal `wc -w` body export, and external source check recorded in `final-report.md`.
The scores measure compliance with this batch contract. They do not predict search rank.

## Rubric

- Experience, 25 points: repository skill links, source file workflows, real code examples,
  and an executable step-by-step procedure.
- Expertise, 25 points: technically scoped explanation, 3,000 to 4,000 words, mapped
  secondary keywords, table, code, and official technical citations.
- Authoritativeness, 25 points: two to four inline authoritative sources, canonical topic
  links, the relevant QASkills skill, and the site's configured author identity.
- Trustworthiness, 25 points: valid metadata and dates, resolved links, reachable sources,
  no banned claims, no invented statistics, and no hard-rule violations.
- AI citation readiness, 100 points: answer-first opening, at least three question H2s with
  immediate answers, comparison table, ordered procedure, FAQ, and route-emitted Article,
  FAQPage, and BreadcrumbList schema.

## Scorecards

|   # | Slug                                                           | Words | Flesch | Links/1k | Experience | Expertise | Authority | Trust | AI readiness | Result |
| --: | -------------------------------------------------------------- | ----: | -----: | -------: | ---------: | --------: | --------: | ----: | -----------: | ------ |
|   1 | `empty-related-test-set-release-blocker`                       | 3,311 |   58.5 |     3.62 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   2 | `changed-line-coverage-diff-hunks-gate`                        | 3,395 |   55.7 |     3.53 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   3 | `uncovered-changed-lines-blocker-waiver-debt`                  | 3,618 |   56.7 |     3.32 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   4 | `git-diff-behavior-risk-blast-radius-map`                      | 3,609 |   56.0 |     3.60 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   5 | `deleted-tests-weakened-assertions-release-risk`               | 3,647 |   56.1 |     3.29 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   6 | `database-migration-rolling-deploy-compatibility-gate`         | 3,535 |   55.3 |     4.24 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   7 | `dependency-upgrade-changelog-api-usage-release-review`        | 3,528 |   55.2 |     3.12 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   8 | `release-gates-yaml-team-policy-schema`                        | 3,455 |   55.3 |     3.47 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|   9 | `machine-verifiable-no-go-release-report-json`                 | 3,446 |   55.7 |     3.48 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  10 | `release-waiver-ownership-acceptance-contract`                 | 3,440 |   57.0 |     3.49 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  11 | `bind-release-evidence-to-head-sha`                            | 3,386 |   71.0 |     3.25 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  12 | `max-diff-lines-release-analysis-gate`                         | 3,500 |   72.0 |     3.14 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  13 | `ai-release-guardian-human-control-boundary`                   | 3,421 |   73.8 |     3.51 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  14 | `schema-authority-ddl-orm-openapi-types-test-data`             | 3,562 |   69.9 |     3.37 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  15 | `constraint-field-map-before-test-data-generation`             | 3,568 |   55.5 |     3.08 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  16 | `partial-unique-index-negative-tests-soft-delete`              | 3,521 |   56.7 |     4.26 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  17 | `test-database-defaults-generated-columns-triggers`            | 3,783 |   55.1 |     3.44 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  18 | `composite-unique-constraint-test-data-matrix`                 | 3,641 |   55.3 |     4.12 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  19 | `openapi-oneof-discriminator-negative-test-data`               | 3,971 |   55.2 |     3.78 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  20 | `schema-derived-date-time-boundary-test-data`                  | 3,568 |   56.0 |     4.20 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  21 | `foreign-key-graph-relational-test-data-builder`               | 3,415 |   55.6 |     4.10 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  22 | `negative-api-tests-no-partial-write-row-count`                | 3,394 |   56.7 |     3.83 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  23 | `test-data-cleanup-residue-assertion-run-tag`                  | 3,413 |   56.6 |     3.81 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  24 | `reserved-namespaces-pii-safe-synthetic-test-data`             | 3,385 |   57.2 |     4.14 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |
|  25 | `aggregate-driven-synthetic-test-data-without-production-rows` | 3,379 |   60.6 |     3.85 |      25/25 |     25/25 |     25/25 | 25/25 |      100/100 | PASS   |

All 25 articles require 90/100 or higher plus zero hard-rule violations. Every article
scored 100/100 across the four E-E-A-T pillars and 100/100 for AI citation readiness after
the mandatory automated and manual evidence checks passed.
