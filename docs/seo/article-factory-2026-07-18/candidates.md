# SEO Article Factory Candidate Scores

Date: 2026-07-18

## Scoring method

Every candidate came from the two repository-backed skill areas documented in `discovery.md`.
Scores use the Phase 2 scale from 0 to 10 for relevance, specificity, intent fit, and
coverage ability. A candidate needed at least 7 on every axis and at least 30 out of 40
overall to enter the collision audit.

This produced 43 dedup candidates, which is more than the required 38 for a 25-article
batch. The collision audit approved 25 and rejected 18. A high content score did not
override a collision: any slug, title, keyword, or intent conflict still caused rejection.

## Candidate queue

|   # | Candidate                                | Intent          | Relevance | Specificity | Intent fit | Coverage | Total | Dedup result                        |
| --: | ---------------------------------------- | --------------- | --------: | ----------: | ---------: | -------: | ----: | ----------------------------------- |
|   1 | empty related test set                   | Troubleshooting |        10 |           9 |         10 |        9 |    38 | Approved                            |
|   2 | changed line coverage diff hunks         | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|   3 | classify uncovered changed lines         | How-to          |        10 |           9 |         10 |       10 |    39 | Approved                            |
|   4 | git diff behavior risk map               | How-to          |        10 |           9 |          9 |       10 |    38 | Approved                            |
|   5 | deleted tests weakened assertions        | Troubleshooting |        10 |          10 |         10 |        9 |    39 | Approved                            |
|   6 | rolling deploy migration compatibility   | How-to          |         9 |           9 |         10 |       10 |    38 | Approved                            |
|   7 | dependency upgrade API usage review      | How-to          |         9 |          10 |         10 |        9 |    38 | Approved                            |
|   8 | release gates yaml policy                | How-to          |        10 |           9 |         10 |       10 |    39 | Approved                            |
|   9 | machine verifiable no go report          | How-to          |        10 |          10 |         10 |        9 |    39 | Approved                            |
|  10 | release waiver ownership                 | Informational   |        10 |           9 |         10 |       10 |    39 | Approved                            |
|  11 | bind release evidence head sha           | How-to          |        10 |          10 |         10 |        9 |    39 | Approved                            |
|  12 | maximum diff size release analysis       | Troubleshooting |        10 |           9 |          9 |        9 |    37 | Approved                            |
|  13 | AI release guardian human control        | Informational   |        10 |           9 |         10 |       10 |    39 | Approved                            |
|  14 | schema authority test data               | Informational   |        10 |           9 |         10 |       10 |    39 | Approved                            |
|  15 | test data constraint field map           | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  16 | partial unique index negative tests      | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  17 | test database defaults generated columns | How-to          |        10 |           9 |         10 |       10 |    39 | Approved                            |
|  18 | composite unique constraint test data    | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  19 | OpenAPI oneOf negative test data         | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  20 | schema derived date time test data       | How-to          |        10 |           9 |         10 |       10 |    39 | Approved                            |
|  21 | foreign key graph test data              | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  22 | negative API test no partial write       | Troubleshooting |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  23 | test data cleanup residue assertion      | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  24 | PII safe test data reserved namespaces   | How-to          |        10 |          10 |         10 |       10 |    40 | Approved                            |
|  25 | aggregate driven synthetic test data     | How-to          |        10 |           9 |         10 |       10 |    39 | Approved                            |
|  26 | Playwright CLI basics                    | Informational   |         9 |           7 |         10 |        9 |    35 | Rejected: intent collision          |
|  27 | Playwright CLI snapshots and references  | How-to          |         9 |           8 |         10 |        9 |    36 | Rejected: intent collision          |
|  28 | run tests affected by changed files      | How-to          |        10 |           8 |         10 |       10 |    38 | Rejected: intent collision          |
|  29 | test impact analysis in CI               | Informational   |        10 |           8 |         10 |       10 |    38 | Rejected: intent collision          |
|  30 | fail CI on generic coverage regression   | How-to          |        10 |           8 |         10 |       10 |    38 | Rejected: intent collision          |
|  31 | generic risk based testing               | Informational   |         9 |           7 |         10 |       10 |    36 | Rejected: primary intent collision  |
|  32 | generic AI release scorecard             | Informational   |        10 |           7 |         10 |       10 |    37 | Rejected: primary intent collision  |
|  33 | generic database migration testing       | Informational   |         9 |           7 |         10 |       10 |    36 | Rejected: primary intent collision  |
|  34 | deterministic Faker in parallel tests    | How-to          |        10 |           9 |         10 |       10 |    39 | Rejected: intent collision          |
|  35 | orphaned test data cleanup               | Troubleshooting |        10 |           8 |         10 |       10 |    38 | Rejected: intent collision          |
|  36 | transaction rollback test isolation      | How-to          |        10 |           9 |         10 |       10 |    39 | Rejected: intent collision          |
|  37 | generic synthetic test data generation   | Informational   |        10 |           7 |         10 |       10 |    37 | Rejected: primary keyword collision |
|  38 | production data masking                  | How-to          |        10 |           8 |         10 |       10 |    38 | Rejected: intent collision          |
|  39 | generic OpenAPI test generation          | Informational   |         9 |           7 |         10 |       10 |    36 | Rejected: intent collision          |
|  40 | generic LLM quality gates                | Informational   |         9 |           7 |         10 |       10 |    36 | Rejected: intent collision          |
|  41 | generic RAG regression thresholds        | Informational   |         9 |           8 |         10 |        9 |    36 | Rejected: intent collision          |
|  42 | generic MCP server contract testing      | Informational   |         9 |           7 |         10 |       10 |    36 | Rejected: intent collision          |
|  43 | generic MCP transport testing            | Informational   |         9 |           7 |         10 |       10 |    36 | Rejected: intent collision          |

## Decision trace

The approved queue covers narrow operational decisions that the AI Release Guardian and
Secure Test Data Engineer source files can support with real policy, schema, workflow,
and code examples. `rejected.md` records the canonical page and full reason for every
failed collision. Approved candidates were also compared with one another before drafting;
none shared the same primary keyword or searcher stopping point.
