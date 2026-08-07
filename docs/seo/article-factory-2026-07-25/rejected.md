# Rejected Topics and Collision Log

Date: 2026-07-25

## Rejected From the Scored Queue

| Topic                            | Reason                                                                        | Existing owner or conflicting candidate             |
| -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| QASkills multiple agent install  | More than 60 percent self-overlap with the undetected-agent install candidate | `qaskills-add-agent-not-detected`                   |
| Redis cache fail-open testing    | Existing page owns cache fallback, failure, and TTL intent                    | `/blog/redis-cache-testing-guide`                   |
| API pagination consistency tests | Existing page owns stable offset pagination and duplicate-record intent       | `/blog/testing-offset-pagination-duplicate-records` |

## Rejected During Source Mining

| Topic                                   | Reason                                                                              | Existing owner                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Generic QASkills CLI install guide      | Existing agent-specific installation pages answer the broad need                    | `/blog/how-to-install-skills-claude-code`, `/blog/how-to-install-skills-cursor` |
| Global versus project skill directories | Existing portability and installation pages own the intent                          | `/blog/agent-skills-open-standard-portability`                                  |
| QASkills CLI publish guide              | Existing publishing pages own the intent; CLI publish still has unfinished behavior | `/how-to-publish`, `/blog/how-to-publish-ai-agent-skill-directory`              |
| Generic webhook retries and idempotency | Existing webhook pillar owns generic retry behavior                                 | `/blog/webhook-testing-complete-guide-2026`                                     |
| Generic authentication testing          | Existing authentication pillar owns the broad intent                                | `/blog/authentication-authorization-testing-guide`                              |
| Upstash outage and cache-aside fallback | Existing Redis article owns outage and fallback behavior                            | `/blog/redis-cache-testing-guide`                                               |
| One-review-per-user race                | Existing unique-constraint race article owns the need                               | `/blog/testing-database-unique-constraint-races`                                |
| Generic SKILL.md guide                  | Existing format guide owns the broad query                                          | `/blog/skill-md-format-guide`                                                   |
| Validate SKILL.md in CI                 | Existing validation pipeline guide owns the query                                   | `/blog/validate-skill-md-in-ci-pipeline`                                        |
| Generic agent skill security            | Existing security checklist owns broad review intent                                | `/blog/agent-skill-security-review-checklist`                                   |
| Generic MCP server testing              | Existing MCP testing pillar owns the query                                          | `/blog/mcp-server-testing-guide-2026`                                           |
| MCP Inspector tool calls                | Existing Inspector tutorial owns the workflow                                       | `/blog/mcp-inspector-tutorial-2026`                                             |
| Generic MCP tool schemas and errors     | Existing contract guide owns schemas, invalid input, and errors                     | `/blog/mcp-server-contract-testing-guide`                                       |
| Generic MCP stdio transport testing     | Existing server guides own transport setup                                          | `/blog/mcp-server-testing-guide-2026`                                           |
| Generic tool schema contract testing    | Existing tool contract page owns the need                                           | `/blog/tool-schema-contract-testing-guide`                                      |
| MCP install path traversal testing      | Technically valuable but would document an unresolved security weakness             | Deferred until the implementation is repaired                                   |
| Cron missing-secret authentication      | Current behavior needs a code fix before a public implementation article            | Deferred until the route fails closed                                           |
| Clerk webhook signature verification    | Current route does not verify signatures                                            | Deferred until verification is implemented                                      |
| YAML interpolation safety               | Current builder needs an escaping fix before claiming safe output                   | Folded into test design without asserting current safety                        |

## Previous Factory Exclusions

The 25 release-guardian and secure-test-data articles shipped on 2026-07-18 were excluded from
the seed pool. Their approved and rejected topics were not recycled for this run.
