# Approved Article Briefs

Date: 2026-07-25

All briefs passed the 1,503-record inventory gate. Titles below are limited so the emitted title
plus ` | QASkills.sh` stays within 60 characters. The page route renders the only H1 and supplies
Article, FAQPage, and BreadcrumbList JSON-LD.

## Shared Publication Contract

- 3,000 to 4,000 prose words after fenced code removal
- A 40 to 60 word direct answer, with the exact primary keyword inside the first 100 words
- 8 to 12 H2 sections, at least three question-form H2s, then a conclusion and final FAQ
- Five to eight FAQ answers, each 40 to 60 words
- One GFM table, one numbered procedure, and at least two repository-grounded code examples
- 3 to 5 internal links per 1,000 words, including `/skills` and the Playwright CLI skill
- Two to four inline official sources, ASCII punctuation only, no banned factory language

## 1. QASkills CLI Download Fallback

- Slug: `qaskills-cli-download-fallback-github-content-metadata`
- Primary keyword: `QASkills CLI download fallback`
- Intent: Troubleshooting
- Core answer: QASkills resolves registry skills through three ordered delivery paths: a shallow GitHub clone, the registry content endpoint, then metadata reconstruction. Tests must force each failure independently, clear temporary state between attempts, and reject an empty result.
- Meta: `QASkills CLI download fallback tests cover GitHub clone failures, content endpoint recovery, metadata reconstruction, cleanup, and empty downloads.`
- Secondary keywords: `GitHub clone fallback`; `skill content endpoint`; `SKILL.md metadata reconstruction`; `temporary download cleanup`; `empty skill download validation`; `registry skill delivery`; `CLI fallback integration tests`
- H2 outline: How Does GitHub Clone Fallback Start?; Why Is the Skill Content Endpoint Second?; When Does SKILL.md Metadata Reconstruction Run?; How Should Temporary Download Cleanup Work?; What Makes Empty Skill Download Validation Fail?; Map the Registry Skill Delivery Decision Table; Build CLI Fallback Integration Tests; Run the End-to-End Failure Matrix; Apply the QASkills CLI Download Fallback; Frequently Asked Questions
- Code plan: `resolveSkill`, `downloadSkill`, mocked fetch responses, temporary directories, and a Vitest failure matrix
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/ai-qa-skills-directory-2026`; `/blog/skill-md-format-guide`; `/blog/how-to-install-skills-claude-code`
- Sources: `https://git-scm.com/docs/git-clone`; `https://nodejs.org/api/globals.html#fetch`; `https://nodejs.org/api/fs.html`

## 2. Extract SKILL.md Packages from GitHub

- Slug: `qaskills-cli-extract-skill-package-github`
- Primary keyword: `extract SKILL.md packages from GitHub`
- Intent: How-to
- Core answer: To extract SKILL.md packages from GitHub, find skill files to a bounded depth, choose the shallowest match, stage that file with adjacent references, scripts, and assets, then replace the clone only after staging succeeds.
- Meta: `Extract SKILL.md packages from GitHub with bounded traversal, shallowest-file selection, companion directories, safe staging, and Vitest cases.`
- Secondary keywords: `find SKILL.md recursively`; `shallowest skill file`; `Agent Skills companion directories`; `temporary package staging`; `ignore node_modules and git`; `nested skill repository`; `skill extraction Vitest`
- H2 outline: How Do You Find SKILL.md Recursively?; Why Choose the Shallowest Skill File?; Which Agent Skills Companion Directories Ship?; How Does Temporary Package Staging Prevent Loss?; Why Ignore node_modules and git?; Handle a Nested Skill Repository; Write Skill Extraction Vitest Cases; Run the Extraction Procedure; Verify the Final Skill Package; Frequently Asked Questions
- Code plan: `extractSkillPackage`, bounded recursive walk, staging copy, and tests for nested files and missing companions
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/skill-md-format-guide`; `/blog/agent-skills-open-standard-portability`; `/blog/validate-skill-md-in-ci-pipeline`
- Sources: `https://agentskills.io/specification`; `https://nodejs.org/api/fs.html`; `https://git-scm.com/docs/git-clone`

## 3. qaskills add --dir for CI Installs

- Slug: `qaskills-add-custom-directory-ci`
- Primary keyword: `qaskills add --dir`
- Intent: How-to
- Core answer: `qaskills add --dir` sends an installed skill to an explicit resolved directory instead of an agent's default skills folder. In CI, use a workspace-owned path, verify the resulting SKILL.md, and delete the directory after the job.
- Meta: `Use qaskills add --dir for deterministic CI skill installs, workspace-safe paths, agent selection, artifact checks, cleanup, and failure assertions.`
- Secondary keywords: `custom skill install directory`; `CI skill installation`; `override agent skillsDir`; `workspace skill artifact`; `qaskills non-interactive install`; `skill install path assertion`; `temporary agent skill directory`
- H2 outline: What Is a Custom Skill Install Directory?; How Does CI Skill Installation Use --dir?; When Does It Override Agent skillsDir?; Verify the Workspace Skill Artifact; Combine qaskills Non-Interactive Install Flags; Add a Skill Install Path Assertion; Clean a Temporary Agent Skill Directory; Run the CI Installation Procedure; Diagnose Custom Directory Failures; Frequently Asked Questions
- Code plan: add command flags, `installToAgent`, GitHub Actions YAML, path assertions, and cleanup
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/playwright-cli-install-quickstart-2026`; `/blog/how-to-install-skills-claude-code`; `/blog/validate-skill-md-in-ci-pipeline`
- Sources: `https://nodejs.org/api/path.html`; `https://nodejs.org/api/fs.html`; `https://docs.github.com/en/actions/reference/workflows-and-actions/variables`

## 4. qaskills init in CI

- Slug: `qaskills-init-non-interactive-ci`
- Primary keyword: `qaskills init in CI`
- Intent: How-to
- Core answer: Run qaskills init in CI with `--yes` or explicit flags so no prompt waits for a TTY. Validate all vocabulary flags before writing, inspect the generated SKILL.md, and fail the job on an unknown testing type, framework, or language.
- Meta: `Run qaskills init in CI without prompts, validate template flags, assert generated SKILL.md metadata, handle non-TTY jobs, and fail on bad values.`
- Secondary keywords: `qaskills non-interactive init`; `SKILL.md scaffold flags`; `CI non-TTY command`; `QA skill template validation`; `unknown framework error`; `generated SKILL.md assertion`; `qaskills init exit code`
- H2 outline: How Does qaskills Non-Interactive Init Work?; Which SKILL.md Scaffold Flags Are Required?; Why Must a CI Non-TTY Command Avoid Prompts?; Build QA Skill Template Validation; How Should an Unknown Framework Error Fail?; Add a Generated SKILL.md Assertion; Verify the qaskills init Exit Code; Run the CI Scaffold Procedure; Choose Safe Defaults for Templates; Frequently Asked Questions
- Code plan: `initCommand`, TTY branch, flags, generated frontmatter, child-process tests, and GitHub Actions
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/skill-md-format-guide`; `/blog/validate-skill-md-in-ci-pipeline`; `/blog/how-to-write-high-quality-qa-skills`
- Sources: `https://nodejs.org/api/tty.html`; `https://github.com/tj/commander.js#readme`; `https://nodejs.org/api/fs.html`

## 5. Disable QASkills CLI Telemetry

- Slug: `qaskills-cli-disable-telemetry-do-not-track`
- Primary keyword: `disable QASkills CLI telemetry`
- Intent: How-to
- Core answer: Disable QASkills CLI telemetry by setting `DO_NOT_TRACK=1` or `QASKILLS_TELEMETRY=0`. Tests should cover both opt-out variables, default enablement, malformed values, non-blocking network failure, and the exact install payload.
- Meta: `Disable QASkills CLI telemetry with DO_NOT_TRACK or QASKILLS_TELEMETRY, then test opt-out precedence, payloads, and non-blocking network errors.`
- Secondary keywords: `DO_NOT_TRACK CLI`; `QASKILLS_TELEMETRY environment variable`; `telemetry opt-out precedence`; `non-blocking telemetry failure`; `install event payload`; `CLI privacy test`; `GitHub Actions telemetry opt-out`
- H2 outline: How Does DO_NOT_TRACK CLI Behavior Work?; What Does QASKILLS_TELEMETRY Control?; Define Telemetry Opt-Out Precedence; Why Must Non-Blocking Telemetry Failure Stay Silent?; Verify the Install Event Payload; Build a CLI Privacy Test Matrix; Set GitHub Actions Telemetry Opt-Out; Run the Verification Procedure; Document the Default Clearly; Frequently Asked Questions
- Code plan: `isTelemetryEnabled`, `sendTelemetry`, environment table tests, mocked fetch, and CI YAML
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/privacy`; `/blog/qaskills-mcp-server-guide`; `/blog/agent-skill-security-review-checklist`
- Sources: `https://nodejs.org/api/environment_variables.html`; `https://docs.github.com/en/actions/concepts/workflows-and-actions/variables`; `https://nodejs.org/api/globals.html#fetch`

## 6. Clerk Webhook Idempotency Testing

- Slug: `testing-clerk-user-created-webhook-idempotency`
- Primary keyword: `Clerk webhook idempotency testing`
- Intent: How-to
- Core answer: Clerk webhook idempotency testing replays the same `user.created` event and proves that one user row and one preference record remain. It also covers concurrent delivery, database conflicts, delayed email side effects, and retries after partial downstream failure.
- Meta: `Clerk webhook idempotency testing verifies replayed user.created events, unique rows, preference creation, concurrent delivery, and safe email effects.`
- Secondary keywords: `Clerk user.created replay`; `webhook database idempotency`; `Drizzle onConflictDoNothing`; `duplicate user preference prevention`; `concurrent webhook delivery`; `welcome email replay`; `Clerk webhook integration test`
- H2 outline: How Do You Replay Clerk user.created?; What Proves Webhook Database Idempotency?; How Does Drizzle onConflictDoNothing Help?; Prevent Duplicate User Preference Creation; Test Concurrent Webhook Delivery; Should Welcome Email Replay?; Build a Clerk Webhook Integration Test; Run the Idempotency Procedure; Interpret Partial Side Effects; Frequently Asked Questions
- Code plan: Clerk event fixture, route invocation, unique-row assertions, concurrency, and email mock
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/webhook-testing-complete-guide-2026`; `/blog/authentication-authorization-testing-guide`; `/blog/testing-database-unique-constraint-races`
- Sources: `https://clerk.com/docs/guides/development/webhooks/overview`; `https://clerk.com/docs/guides/development/webhooks/syncing`; `https://orm.drizzle.team/docs/insert`

## 7. Missed Clerk Webhook Recovery Tests

- Slug: `testing-missed-clerk-webhook-user-recovery`
- Primary keyword: `missed Clerk webhook recovery`
- Intent: Troubleshooting
- Core answer: Missed Clerk webhook recovery uses the authenticated Clerk user to provision a missing local database row during the first protected request. Tests must prove existing users stay unchanged, concurrent requests converge, missing identity data fails clearly, and preferences are handled consistently.
- Meta: `Test missed Clerk webhook recovery with just-in-time users, concurrent requests, existing rows, missing identity data, and local database assertions.`
- Secondary keywords: `Clerk just-in-time provisioning`; `missing local user row`; `currentUser recovery path`; `concurrent user creation`; `Clerk database synchronization`; `protected API auth helper`; `missed webhook integration test`
- H2 outline: What Is Clerk Just-in-Time Provisioning?; How Do You Detect a Missing Local User Row?; When Does the currentUser Recovery Path Run?; Test Concurrent User Creation; Keep Clerk Database Synchronization Predictable; Exercise the Protected API Auth Helper; Build a Missed Webhook Integration Test; Run the Recovery Procedure; Distinguish Recovery from Normal Login; Frequently Asked Questions
- Code plan: `getAuthUser`, Clerk mocks, conflict handling, existing/missing rows, and concurrent requests
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/authentication-authorization-testing-guide`; `/blog/webhook-testing-complete-guide-2026`; `/blog/testing-database-unique-constraint-races`
- Sources: `https://clerk.com/docs/guides/development/webhooks/syncing`; `https://clerk.com/docs/reference/nextjs/app-router/current-user`; `https://orm.drizzle.team/docs/insert`

## 8. HMAC Unsubscribe Token Testing

- Slug: `testing-hmac-unsubscribe-token-tampering-expiration`
- Primary keyword: `HMAC unsubscribe token testing`
- Intent: Security how-to
- Core answer: HMAC unsubscribe token testing verifies valid signatures, tampered payloads, altered signatures, malformed base64url, missing separators, future timestamps, and expiry at the exact 30-day boundary. Signature comparison must use equal-length buffers and timing-safe comparison.
- Meta: `HMAC unsubscribe token testing covers tampering, base64url parsing, timing-safe comparison, future timestamps, expiry boundaries, and secret rotation.`
- Secondary keywords: `unsubscribe token tampering`; `base64url token parsing`; `timingSafeEqual test`; `30 day token expiration`; `HMAC secret fallback`; `unsubscribe API security`; `signed link boundary test`
- H2 outline: How Do You Test Unsubscribe Token Tampering?; What Can Break Base64url Token Parsing?; How Should a timingSafeEqual Test Work?; Where Is the 30 Day Token Expiration Boundary?; Test the HMAC Secret Fallback; Exercise Unsubscribe API Security; Build a Signed Link Boundary Test; Run the Security Procedure; Record a Complete Token Matrix; Frequently Asked Questions
- Code plan: `generateUnsubscribeToken`, `verifyUnsubscribeToken`, fake timers, mutation table, and API assertions
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/privacy`; `/blog/authentication-authorization-testing-guide`; `/blog/webhook-testing-complete-guide-2026`
- Sources: `https://nodejs.org/api/crypto.html#cryptocreatehmacalgorithm-key-options`; `https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b`; `https://www.rfc-editor.org/info/rfc2104/`

## 9. Batch Email Failure Testing

- Slug: `testing-batch-email-partial-failures-promise-allsettled`
- Primary keyword: `batch email failure testing`
- Intent: How-to
- Core answer: Batch email failure testing makes selected sends succeed, reject, or return provider errors, then proves `Promise.allSettled` reports each outcome without losing successful deliveries. The caller should expose counts and enough context to retry only failed recipients.
- Meta: `Batch email failure testing uses Promise.allSettled to verify delivery results, accurate counts, provider errors, retry scope, and cron batch behavior.`
- Secondary keywords: `Promise.allSettled email tests`; `partial email delivery failure`; `Resend batch error handling`; `email retry recipient scope`; `weekly digest batch test`; `email result count assertion`; `rate limited email batch`
- H2 outline: How Do Promise.allSettled Email Tests Work?; What Is a Partial Email Delivery Failure?; Test Resend Batch Error Handling; Limit Email Retry Recipient Scope; Build a Weekly Digest Batch Test; Add an Email Result Count Assertion; Model a Rate Limited Email Batch; Run the Failure Procedure; Improve Operational Evidence; Frequently Asked Questions
- Code plan: `sendBatchEmails`, mixed promise outcomes, result reduction, digest loop, and fake timers
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/webhook-testing-complete-guide-2026`; `/blog/cicd-testing-pipeline-github-actions`; `/blog/error-handling-testing-patterns`
- Sources: `https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled`; `https://resend.com/docs/api-reference/emails/send-email`; `https://resend.com/docs/api-reference/rate-limit`

## 10. Resend Next.js Build Testing

- Slug: `testing-lazy-resend-initialization-nextjs-build`
- Primary keyword: `Resend Next.js build testing`
- Intent: Troubleshooting
- Core answer: Resend Next.js build testing imports email modules without a production API key and proves that no client is constructed until a send path runs. Runtime tests then verify the configured key, missing-key behavior, singleton reuse, and provider errors.
- Meta: `Resend Next.js build testing verifies lazy client creation, missing API keys, import safety, singleton reuse, runtime sends, and provider error handling.`
- Secondary keywords: `lazy Resend initialization`; `Next.js build environment variables`; `email client import safety`; `missing RESEND_API_KEY test`; `Resend singleton reuse`; `runtime email send test`; `Vercel build email failure`
- H2 outline: Why Use Lazy Resend Initialization?; How Do Next.js Build Environment Variables Differ?; Prove Email Client Import Safety; Write a Missing RESEND_API_KEY Test; Verify Resend Singleton Reuse; Add a Runtime Email Send Test; Diagnose Vercel Build Email Failure; Run the Build-Safety Procedure; Separate Build and Runtime Contracts; Frequently Asked Questions
- Code plan: module resets, environment isolation, `getResendClient`, send mocks, and a production build smoke check
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/cicd-testing-pipeline-github-actions`; `/blog/authentication-authorization-testing-guide`; `/blog/error-handling-testing-patterns`
- Sources: `https://nextjs.org/docs/15/app/guides/environment-variables`; `https://resend.com/docs/api-reference/introduction`; `https://resend.com/docs/api-reference/emails/send-email`

## 11. Next.js DATABASE_URL Build Testing

- Slug: `testing-lazy-neon-database-initialization-nextjs-build`
- Primary keyword: `Next.js DATABASE_URL build testing`
- Intent: Troubleshooting
- Core answer: Next.js DATABASE_URL build testing imports database-dependent modules with the variable removed and proves that connection creation waits for runtime property access. A second test accesses the proxy, expects a clear configuration error, then verifies normal singleton reuse with a valid URL.
- Meta: `Next.js DATABASE_URL build testing verifies Neon connections, import safety, proxy access, missing configuration errors, and singleton reuse at runtime.`
- Secondary keywords: `lazy Neon initialization`; `database module import safety`; `Drizzle database proxy`; `missing DATABASE_URL test`; `Next.js static build database`; `runtime database connection`; `Neon singleton test`
- H2 outline: Why Use Lazy Neon Initialization?; How Do You Prove Database Module Import Safety?; What Does a Drizzle Database Proxy Defer?; Write a Missing DATABASE_URL Test; Keep a Next.js Static Build Database-Free; Exercise the Runtime Database Connection; Add a Neon Singleton Test; Run the Build-Safety Procedure; Identify Import-Time Regressions; Frequently Asked Questions
- Code plan: `getDb`, proxy property access, module reset, environment isolation, and build smoke test
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/database-testing-automation-guide`; `/blog/cicd-testing-pipeline-github-actions`; `/blog/testing-database-unique-constraint-races`
- Sources: `https://neon.com/docs/serverless/serverless-driver`; `https://orm.drizzle.team/docs/connect-neon`; `https://nextjs.org/docs/15/app/guides/environment-variables`

## 12. Typesense Facet Filter Testing

- Slug: `testing-typesense-multiselect-facet-filter-queries`
- Primary keyword: `Typesense facet filter testing`
- Intent: How-to
- Core answer: Typesense facet filter testing asserts query construction, OR behavior inside one multi-select facet, AND behavior across different facets, escaped values, sort mapping, result projection, and facet-count extraction against a controlled collection.
- Meta: `Typesense facet filter testing covers multi-select syntax, AND and OR behavior, escaping, sort mapping, result projection, and facet count assertions.`
- Secondary keywords: `Typesense multi-select filters`; `filter_by query assertion`; `facet count extraction`; `Typesense sort_by testing`; `search result projection`; `Typesense filter escaping`; `search facet integration test`
- H2 outline: How Do Typesense Multi-Select Filters Work?; What Should a filter_by Query Assertion Prove?; Test Facet Count Extraction; Verify Typesense sort_by Testing; Check Search Result Projection; Protect Typesense Filter Escaping; Build a Search Facet Integration Test; Run the Query Matrix; Diagnose Empty Facet Results; Frequently Asked Questions
- Code plan: `searchSkills`, `extractFacetCounts`, mocked Typesense client, controlled documents, and result tables
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/ai-qa-skills-directory-2026`; `/blog/api-testing-complete-guide`; `/blog/testing-offset-pagination-duplicate-records`
- Sources: `https://typesense.org/docs/latest/api/search.html`; `https://typesense.org/docs/30.2/api/collections.html`; `https://typesense.org/docs/guide/typesense-js-client-tuning.html`

## 13. PostgreSQL JSONB Filter Testing

- Slug: `testing-postgresql-jsonb-multiselect-filters-drizzle`
- Primary keyword: `PostgreSQL JSONB filter testing`
- Intent: How-to
- Core answer: PostgreSQL JSONB filter testing seeds rows with overlapping arrays, sends single and multi-select filters, and verifies OR behavior within a category plus AND behavior across categories. It must also cover empty filters, escaped values, counts, and sort stability.
- Meta: `PostgreSQL JSONB filter testing verifies containment, multi-select OR logic, cross-filter AND logic, escaped values, counts, and Drizzle SQL behavior.`
- Secondary keywords: `PostgreSQL JSONB containment`; `Drizzle sql filter test`; `JSONB array multiselect`; `OR within facet filter`; `AND across facet filters`; `JSONB filter count assertion`; `skills API integration test`
- H2 outline: How Does PostgreSQL JSONB Containment Work?; Build a Drizzle SQL Filter Test; Seed a JSONB Array Multiselect Matrix; Why Use OR Within a Facet Filter?; Why Use AND Across Facet Filters?; Add a JSONB Filter Count Assertion; Create a Skills API Integration Test; Run the Database Procedure; Inspect Generated SQL Safely; Frequently Asked Questions
- Code plan: skill rows, Drizzle `sql` fragments using `@>`, route requests, and result/count assertions
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/database-testing-automation-guide`; `/blog/api-testing-complete-guide`; `/blog/testing-offset-pagination-duplicate-records`
- Sources: `https://www.postgresql.org/docs/current/functions-json.html`; `https://orm.drizzle.team/docs/operators`; `https://orm.drizzle.team/docs/sql`

## 14. Leaderboard Cache Consistency Testing

- Slug: `testing-leaderboard-cache-filter-isolation-ranking-consistency`
- Primary keyword: `leaderboard cache consistency testing`
- Intent: How-to
- Core answer: Leaderboard cache consistency testing compares uncached and cached results for every ranking filter, proves each filter uses an isolated key, checks stable ordering and limits, and verifies a cache failure does not change the API contract.
- Meta: `Leaderboard cache consistency testing verifies per-filter cache keys, ranking order, limits, cache hits, expiry, failure fallback, and uncached parity.`
- Secondary keywords: `leaderboard cache key isolation`; `ranking filter consistency`; `Upstash cache hit test`; `cache expiry integration test`; `leaderboard sort assertion`; `cache failure fallback`; `cached API parity`
- H2 outline: Why Does Leaderboard Cache Key Isolation Matter?; How Do You Prove Ranking Filter Consistency?; Build an Upstash Cache Hit Test; Add a Cache Expiry Integration Test; Write a Leaderboard Sort Assertion; Test Cache Failure Fallback; Measure Cached API Parity; Run the Consistency Procedure; Avoid False Positives from Shared State; Frequently Asked Questions
- Code plan: leaderboard route, cache mocks, four filters, controlled skill metrics, TTL, and fail-open behavior
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/leaderboard`; `/blog/redis-cache-testing-guide`; `/blog/testing-offset-pagination-duplicate-records`
- Sources: `https://upstash.com/docs/redis/tutorials/nextjs_with_redis`; `https://upstash.com/docs/redis/sdks/ts/commands/string/set`; `https://redis.io/docs/latest/commands/expire/`

## 15. ZIP Artifact Checksum Testing

- Slug: `testing-versioned-zip-artifact-sha256-etag`
- Primary keyword: `ZIP artifact checksum testing`
- Intent: How-to
- Core answer: ZIP artifact checksum testing downloads a version-pinned skill archive, recomputes SHA-256 over the exact response bytes, compares the digest with both `X-Artifact-Sha256` and ETag, then inspects the ZIP path and SKILL.md contents.
- Meta: `ZIP artifact checksum testing verifies version pins, SHA-256 headers, ETag identity, archive paths, SKILL.md content, caching, and error responses.`
- Secondary keywords: `version pinned skill artifact`; `SHA-256 response header`; `ETag checksum assertion`; `JSZip archive structure`; `SKILL.md ZIP content`; `artifact cache header`; `artifact route integration test`
- H2 outline: How Do You Test a Version-Pinned Skill Artifact?; Verify the SHA-256 Response Header; Add an ETag Checksum Assertion; Inspect the JSZip Archive Structure; Validate SKILL.md ZIP Content; Check the Artifact Cache Header; Build an Artifact Route Integration Test; Run the Checksum Procedure; Diagnose Byte-Level Mismatches; Frequently Asked Questions
- Code plan: route response, `createHash`, JSZip load, version mismatch, headers, and cached responses
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/skill-md-format-guide`; `/blog/agent-skill-security-review-checklist`; `/blog/validate-skill-md-in-ci-pipeline`
- Sources: `https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html`; `https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options`; `https://www.rfc-editor.org/info/rfc9110`

## 16. Markdown XSS Sanitization Testing

- Slug: `testing-markdown-xss-react-markdown-rehype-sanitize`
- Primary keyword: `markdown XSS sanitization testing`
- Intent: Security how-to
- Core answer: Markdown XSS sanitization testing renders hostile Markdown through the same `react-markdown`, `remark-gfm`, and `rehype-sanitize` pipeline used in production, then asserts scripts, event handlers, unsafe protocols, and forbidden elements cannot reach the DOM.
- Meta: `Markdown XSS sanitization testing verifies scripts, event handlers, unsafe URLs, raw HTML, GFM content, allowed elements, and production renderer parity.`
- Secondary keywords: `react-markdown security test`; `rehype-sanitize XSS test`; `unsafe Markdown URL`; `Markdown event handler removal`; `raw HTML rendering test`; `GFM sanitization test`; `skill description security`
- H2 outline: How Do You Build a react-markdown Security Test?; What Should a rehype-sanitize XSS Test Block?; Reject an Unsafe Markdown URL; Verify Markdown Event Handler Removal; Add a Raw HTML Rendering Test; Preserve Safe GFM Sanitization; Protect Skill Description Security; Run the Hostile Input Procedure; Test Production Renderer Parity; Frequently Asked Questions
- Code plan: `SkillDescription`, Testing Library render, attack corpus, DOM assertions, and safe GFM controls
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/agent-skill-security-review-checklist`; `/blog/skill-md-format-guide`; `/blog/validate-skill-md-in-ci-pipeline`
- Sources: `https://github.com/remarkjs/react-markdown`; `https://github.com/rehypejs/rehype-sanitize`; `https://github.com/remarkjs/remark-gfm`

## 17. SKILL.md YAML Frontmatter Testing

- Slug: `testing-skill-md-yaml-frontmatter-roundtrip`
- Primary keyword: `SKILL.md YAML frontmatter testing`
- Intent: How-to
- Core answer: SKILL.md YAML frontmatter testing serializes values containing colons, quotes, hashes, brackets, commas, and newlines, parses the result again, and compares semantic fields. Failures identify where manual interpolation loses or changes metadata.
- Meta: `SKILL.md YAML frontmatter testing covers quotes, colons, arrays, Unicode policy, parse-serialize round trips, malformed values, and metadata equality.`
- Secondary keywords: `YAML scalar escaping test`; `SKILL.md round trip`; `frontmatter array serialization`; `gray-matter parser test`; `special character metadata`; `YAML malformed value`; `skill metadata equality`
- H2 outline: How Do You Write a YAML Scalar Escaping Test?; What Must a SKILL.md Round Trip Preserve?; Test Frontmatter Array Serialization; Build a gray-matter Parser Test; Cover Special Character Metadata; Reject a YAML Malformed Value; Assert Skill Metadata Equality; Run the Round-Trip Procedure; Decide When to Use a YAML Library; Frequently Asked Questions
- Code plan: `buildSkillMarkdown`, `serializeSkillMd`, `parseSkillMd`, parameterized values, and semantic equality
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/skill-md-format-guide`; `/blog/cursor-skill-md-frontmatter-schema-guide`; `/blog/validate-skill-md-in-ci-pipeline`
- Sources: `https://yaml.org/spec/1.2.2/`; `https://agentskills.io/specification`; `https://github.com/jonschlinkert/gray-matter`

## 18. SKILL.md Array Normalization Testing

- Slug: `skill-md-csv-yaml-array-normalization-tests`
- Primary keyword: `SKILL.md array normalization testing`
- Intent: How-to
- Core answer: SKILL.md array normalization testing feeds YAML sequences, inline arrays, comma-separated strings, empty values, numbers, and mixed values into `parseSkillMd`, then verifies every supported metadata field becomes the expected string array.
- Meta: `SKILL.md array normalization testing compares YAML lists, inline arrays, CSV strings, empty values, mixed types, trimming, and parser consistency.`
- Secondary keywords: `YAML list normalization`; `comma separated frontmatter`; `toStringArray parser`; `empty skill metadata array`; `mixed YAML array values`; `frontmatter whitespace trimming`; `seed skill parser matrix`
- H2 outline: How Does YAML List Normalization Work?; When Is Comma Separated Frontmatter Accepted?; Test the toStringArray Parser; Handle an Empty Skill Metadata Array; Convert Mixed YAML Array Values; Verify Frontmatter Whitespace Trimming; Build a Seed Skill Parser Matrix; Run the Normalization Procedure; Define a Stable Compatibility Contract; Frequently Asked Questions
- Code plan: `toStringArray` through `parseSkillMd`, table cases across all six array fields, and seed examples
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/skill-md-format-guide`; `/blog/agent-skills-open-standard-portability`; `/blog/validate-skill-md-in-ci-pipeline`
- Sources: `https://yaml.org/spec/1.2.2/`; `https://github.com/jonschlinkert/gray-matter`; `https://zod.dev/basics`

## 19. Malformed SKILL.md Frontmatter Testing

- Slug: `malformed-skill-md-frontmatter-parser-tests`
- Primary keyword: `malformed SKILL.md frontmatter testing`
- Intent: Troubleshooting
- Core answer: Malformed SKILL.md frontmatter testing separates syntax failures from valid YAML that violates the skill schema. It asserts a stable frontmatter error for parser failures, field-specific Zod errors for shape failures, and no misleading quality score on invalid input.
- Meta: `Malformed SKILL.md frontmatter testing separates YAML parse failures from Zod schema errors, checks diagnostics, invalid scores, and recovery cases.`
- Secondary keywords: `invalid YAML diagnostic`; `SKILL.md parser failure`; `Zod frontmatter error`; `missing metadata field test`; `malformed delimiter case`; `validator error stability`; `SKILL.md recovery test`
- H2 outline: What Makes an Invalid YAML Diagnostic Useful?; How Do You Trigger a SKILL.md Parser Failure?; Preserve a Zod Frontmatter Error; Add a Missing Metadata Field Test; Cover a Malformed Delimiter Case; Assert Validator Error Stability; Build a SKILL.md Recovery Test; Run the Diagnostic Procedure; Separate Errors from Warnings; Frequently Asked Questions
- Code plan: `validateSkillContent`, parser exceptions, Zod issues, missing fields, malformed delimiters, and snapshots
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/skill-md-format-guide`; `/blog/validate-skill-md-in-ci-pipeline`; `/blog/how-to-write-high-quality-qa-skills`
- Sources: `https://github.com/jonschlinkert/gray-matter`; `https://yaml.org/spec/1.2.2/`; `https://zod.dev/error-formatting`

## 20. Agent Skill Command Safety Testing

- Slug: `agent-skill-dangerous-command-static-analysis-tests`
- Primary keyword: `agent skill command safety testing`
- Intent: Security how-to
- Core answer: Agent skill command safety testing runs each prohibited command pattern against positive, negative, spacing, quoting, multiline, and obfuscated examples. The suite must expose false positives and bypasses without treating a regex warning as proof that a skill is safe.
- Meta: `Agent skill command safety testing covers dangerous command patterns, bypasses, false positives, multiline content, mutation cases, and warning evidence.`
- Secondary keywords: `dangerous command regex test`; `skill validator false positive`; `command injection pattern bypass`; `multiline shell detection`; `validator mutation testing`; `agent skill safety warning`; `static analysis limitation`
- H2 outline: How Do You Build a Dangerous Command Regex Test?; What Is a Skill Validator False Positive?; Find a Command Injection Pattern Bypass; Test Multiline Shell Detection; Add Validator Mutation Testing; Verify an Agent Skill Safety Warning; Document Each Static Analysis Limitation; Run the Safety Procedure; Combine Static and Human Review; Frequently Asked Questions
- Code plan: `DANGEROUS_PATTERNS`, positive/negative corpus, mutation operators, warning assertions, and limitations
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/agent-skill-security-review-checklist`; `/blog/validate-skill-md-in-ci-pipeline`; `/blog/skill-md-format-guide`
- Sources: `https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html`; `https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices`; `https://nodejs.org/api/child_process.html`

## 21. MCP API Timeout Testing

- Slug: `mcp-api-timeout-abortcontroller-testing`
- Primary keyword: `MCP API timeout testing`
- Intent: Troubleshooting
- Core answer: MCP API timeout testing replaces fetch and timers, leaves a request pending past 10 seconds, and verifies AbortController cancels it with a clear timeout error. It also proves timers are cleared after success, HTTP failure, and unrelated network errors.
- Meta: `MCP API timeout testing verifies AbortController deadlines, fetch cancellation, timer cleanup, HTTP errors, network failures, and tool error results.`
- Secondary keywords: `AbortController MCP test`; `10 second API timeout`; `fetch cancellation test`; `MCP timer cleanup`; `MCP HTTP error message`; `network error propagation`; `MCP tool timeout result`
- H2 outline: How Do You Write an AbortController MCP Test?; What Happens at the 10 Second API Timeout?; Build a Fetch Cancellation Test; Verify MCP Timer Cleanup; Assert an MCP HTTP Error Message; Preserve Network Error Propagation; Return an MCP Tool Timeout Result; Run the Timeout Procedure; Avoid Flaky Real-Time Tests; Frequently Asked Questions
- Code plan: `fetchWithTimeout`, fake timers, pending fetch, abort signal, HTTP body, and tool error mapping
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/qaskills-mcp-server-guide`; `/blog/mcp-server-contract-testing-guide`; `/blog/mcp-server-testing-guide-2026`
- Sources: `https://nodejs.org/api/globals.html#class-abortcontroller`; `https://nodejs.org/api/test.html`; `https://github.com/modelcontextprotocol/typescript-sdk`

## 22. MCP Search Filter Schema Drift

- Slug: `mcp-search-filter-schema-drift-contract-tests`
- Primary keyword: `MCP search filter schema drift`
- Intent: How-to
- Core answer: MCP search filter schema drift occurs when a tool's accepted values, defaults, parameter names, or sort labels no longer match the web API contract. A contract test should derive cases from both schemas and fail on any unmatched value before release.
- Meta: `MCP search filter schema drift tests compare tool and API sort values, defaults, parameter names, limits, query encoding, and release compatibility.`
- Secondary keywords: `MCP search schema contract`; `MCP sort value mismatch`; `Zod schema parity test`; `tool API parameter drift`; `MCP default limit test`; `search query encoding`; `MCP compatibility gate`
- H2 outline: What Is an MCP Search Schema Contract?; How Do You Detect an MCP Sort Value Mismatch?; Build a Zod Schema Parity Test; Find Tool API Parameter Drift; Add an MCP Default Limit Test; Verify Search Query Encoding; Create an MCP Compatibility Gate; Run the Schema Procedure; Repair Drift Without Breaking Clients; Frequently Asked Questions
- Code plan: MCP `inputSchema`, shared `skillSearchSchema`, generated cases, URL assertions, and compatibility mapping
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/qaskills-mcp-server-guide`; `/blog/mcp-server-contract-testing-guide`; `/blog/tool-schema-contract-testing-guide`
- Sources: `https://modelcontextprotocol.io/specification/2025-11-25/schema`; `https://zod.dev/basics`; `https://json-schema.org/draft/2020-12/json-schema-core`

## 23. MCP Search Response Normalization

- Slug: `mcp-search-response-normalization-contract-tests`
- Primary keyword: `MCP search response normalization`
- Intent: How-to
- Core answer: MCP search response normalization projects unstable API objects into a small, documented tool result. Tests should cover missing skills, missing totals, extra private fields, unknown property types, order preservation, and JSON text returned to the MCP client.
- Meta: `MCP search response normalization tests cover missing arrays, default totals, field projection, private data removal, order, JSON text, and API drift.`
- Secondary keywords: `MCP response projection`; `search result contract test`; `omit fullDescription field`; `missing skills array`; `MCP JSON text result`; `API response drift`; `tool output compatibility`
- H2 outline: Why Use MCP Response Projection?; Build a Search Result Contract Test; Verify the Omit fullDescription Field Rule; Handle a Missing Skills Array; Assert the MCP JSON Text Result; Simulate API Response Drift; Protect Tool Output Compatibility; Run the Projection Procedure; Keep the Contract Intentionally Small; Frequently Asked Questions
- Code plan: `normalizeSearchResponse`, `omitFullDescription`, JSON text result, malformed shapes, and order assertions
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/qaskills-mcp-server-guide`; `/blog/mcp-server-contract-testing-guide`; `/blog/tool-schema-contract-testing-guide`
- Sources: `https://github.com/modelcontextprotocol/typescript-sdk`; `https://modelcontextprotocol.io/specification/2025-11-25/schema`; `https://json-schema.org/draft/2020-12/json-schema-core`

## 24. MCP Package Version Drift Testing

- Slug: `mcp-package-registry-version-drift-tests`
- Primary keyword: `MCP package version drift testing`
- Intent: Troubleshooting
- Core answer: MCP package version drift testing compares the npm package version, registry manifest version, runtime server identity, and user-agent header. It fails when any surface advertises a different release or an invalid semantic version.
- Meta: `MCP package version drift testing compares package.json, server.json, runtime identity, user-agent headers, semantic versions, and publish artifacts.`
- Secondary keywords: `MCP registry manifest version`; `package.json version parity`; `MCP runtime version`; `MCP user-agent version`; `semantic version validation`; `MCP publish artifact test`; `registry release consistency`
- H2 outline: What Is an MCP Registry Manifest Version?; How Do You Check package.json Version Parity?; Assert the MCP Runtime Version; Verify the MCP User-Agent Version; Add Semantic Version Validation; Inspect an MCP Publish Artifact Test; Enforce Registry Release Consistency; Run the Version Procedure; Diagnose Partial Releases; Frequently Asked Questions
- Code plan: import package and server JSON, server constructor mock, fetch headers, SemVer, and packed artifact inspection
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/qaskills-mcp-server-guide`; `/blog/mcp-registry-qa-teams-guide-2026`; `/blog/mcp-conformance-github-actions-baseline-2026`
- Sources: `https://modelcontextprotocol.io/registry/versioning`; `https://modelcontextprotocol.io/registry/quickstart`; `https://semver.org/`

## 25. SKILL.md Catalog Regression Testing

- Slug: `seed-skill-catalog-parser-regression-tests`
- Primary keyword: `SKILL.md catalog regression testing`
- Intent: How-to
- Core answer: SKILL.md catalog regression testing scans every seed directory, requires one readable SKILL.md, parses and validates frontmatter, checks slug uniqueness, records quality boundaries, and reports every failure in one run instead of stopping at the first bad package.
- Meta: `SKILL.md catalog regression testing scans every seed, validates parsing and schema, checks slugs, reports all failures, and protects quality boundaries.`
- Secondary keywords: `seed skill validation suite`; `SKILL.md parser regression`; `skill catalog schema audit`; `duplicate skill slug test`; `aggregate validation errors`; `skill quality boundary`; `413 seed regression test`
- H2 outline: How Do You Build a Seed Skill Validation Suite?; What Belongs in a SKILL.md Parser Regression?; Run a Skill Catalog Schema Audit; Add a Duplicate Skill Slug Test; Collect Aggregate Validation Errors; Monitor a Skill Quality Boundary; Scale a 413 Seed Regression Test; Run the Catalog Procedure; Publish Actionable Failure Output; Frequently Asked Questions
- Code plan: directory scan, parser/schema/validator calls, aggregate result type, slug map, score limits, and catalog tests
- Internal links: `/skills`; `/skills/Pramod/playwright-cli`; `/blog/skill-md-format-guide`; `/blog/validate-skill-md-in-ci-pipeline`; `/blog/how-to-write-high-quality-qa-skills`
- Sources: `https://agentskills.io/specification`; `https://github.com/jonschlinkert/gray-matter`; `https://zod.dev/basics`
