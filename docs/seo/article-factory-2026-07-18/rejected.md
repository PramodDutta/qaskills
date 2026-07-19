# Rejected SEO Topics

These candidates failed the collision gate before drafting. A new title was not used to disguise an existing search intent.

| Rejected topic                          | Reason                                                   | Existing canonical coverage                               |
| --------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Playwright CLI basics                   | Same setup and command intent                            | `/blog/playwright-cli-complete-guide-2026`                |
| Playwright CLI snapshots and references | Same user question and workflow                          | `/blog/playwright-cli-accessibility-snapshots-guide-2026` |
| Run tests affected by changed files     | Existing page already answers selection by changed files | `/blog/ci-detect-tests-affected-by-changed-files`         |
| Test impact analysis in CI              | Existing implementation guide owns the intent            | `/blog/test-impact-analysis-ci-guide-2026`                |
| Fail CI on generic coverage regression  | Existing new-code coverage gate                          | `/blog/ci-fail-build-on-new-coverage-regression`          |
| Generic risk-based testing              | Existing strategy page owns prioritization intent        | `/blog/risk-based-testing-strategy-guide-2026`            |
| Generic AI release scorecard            | Existing page owns broad readiness scoring               | `/blog/ai-release-readiness-scorecard-2026`               |
| Generic database migration testing      | Existing migration guide owns broad test strategy        | `/blog/postgres-migration-testing-guide`                  |
| Deterministic Faker in parallel tests   | Existing article owns seeding and worker determinism     | `/blog/faker-deterministic-seed-parallel-tests`           |
| Orphaned test-data cleanup              | Existing article owns cleanup after CI failures          | `/blog/cleanup-orphaned-test-data-after-ci-failure`       |
| Transaction rollback test isolation     | Existing PostgreSQL isolation article owns the intent    | `/blog/transaction-rollback-test-isolation-postgres`      |
| Generic synthetic test-data generation  | Existing article owns the umbrella intent                | `/blog/synthetic-test-data-generation-guide`              |
| Production-data masking                 | Existing privacy and masking pages own that workflow     | `/blog/pii-masked-production-data-for-testing`            |
| Generic OpenAPI test generation         | Existing article owns spec-to-suite generation           | `/blog/openapi-spec-to-test-suite-generation`             |
| Generic LLM quality gates               | Existing CI/CD guide owns broad LLM evaluation gates     | `/blog/llm-evaluation-ci-cd-quality-gates`                |
| Generic RAG regression thresholds       | Existing RAG regression guide owns baseline gating       | `/blog/rag-regression-testing-guide`                      |
| Generic MCP server contract testing     | Existing page owns schemas, invalid inputs, and errors   | `/blog/mcp-server-contract-testing-guide`                 |
| Generic MCP transport testing           | Existing MCP server testing guide owns transport setup   | `/blog/mcp-server-testing-guide-2026`                     |

## Approved-topic rule

An adjacent page is acceptable only when the new query has a different operational question and a different stopping point. For example, broad changed-code coverage was rejected, while intersecting diff hunks with coverage JSON and classifying each uncovered changed line has a narrower implementation contract grounded in the AI Release Guardian skill.
