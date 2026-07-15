import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md vs MCP Server: When to Use Which for AI Agent Capabilities',
  description: 'Understand the SKILL.md vs MCP server difference and choose the right approach for portable QA guidance, live testing tools, or a maintainable hybrid.',
  date: '2026-07-15',
  category: 'Comparison',
  content: `
# SKILL.md vs MCP Server: When to Use Which for AI Agent Capabilities

Suppose you want an AI coding agent to triage a failed Playwright run. It needs to know your investigation method, but it may also need to query a remote test-results service. Those are two different capabilities. The investigation method is knowledge and procedure. The remote query is live execution. Confusing them leads teams to build a server for a checklist or bury network access inside prose that cannot perform it.

The essential SKILL.md vs MCP server difference is this: a skill packages instructions and supporting resources that shape how an agent reasons and works, while an MCP server exposes callable tools or resources through a protocol. A skill says how to analyze a flaky test. An MCP tool can fetch the latest failure, download an artifact, or create a defect.

QA teams often need both, but not always. This guide provides a technical decision framework grounded in test generation, CI diagnosis, test-data management, browser automation, and result publishing. It also shows how to keep the procedural layer portable while placing credentials, validation, and external side effects behind a controlled tool boundary.

## Start with the capability boundary, not the packaging format

Before choosing a format, describe the capability as inputs, decisions, outputs, and side effects. This prevents a familiar architecture mistake: selecting technology before separating policy from execution.

Consider “help the agent investigate failed tests.” That phrase may contain four distinct responsibilities:

1. Classify the failure as product defect, test defect, environment issue, or unknown.
2. Read repository conventions for evidence and severity.
3. Retrieve run metadata, logs, screenshots, and traces from a test platform.
4. Post a summarized result or create an issue after approval.

The first two are primarily procedural knowledge. The latter two cross a system boundary. A SKILL.md is a strong home for classification logic and repository-specific workflow. An MCP server is a strong home for authenticated retrieval and controlled mutation.

Ask one decisive question: can the agent complete the capability using information already available in its workspace and permitted built-in tools? If yes, begin with instructions. If it requires a stable integration with live data or an external service, evaluate MCP.

| Capability property | Favors SKILL.md | Favors MCP server |
|---|---|---|
| Primary value | Judgment, sequence, conventions, examples | Live data, computation, controlled action |
| Required state | Files already in context or repository | Remote or process-owned state |
| Credentials | None, or handled by existing approved tools | Server-managed authentication is required |
| Result shape | Human-readable plan, review, or generated artifact | Structured response from a callable operation |
| Failure mode | Misapplied guidance | Network, authorization, validation, or side-effect failure |
| Change owner | QA enablement or repository team | Integration or platform engineering team |

This boundary is more durable than product-specific terminology. The same split applies whether your agent is Claude Code, a Copilot coding agent, Cursor, Gemini CLI, or another client that supports comparable instruction and tool mechanisms.

## What a SKILL.md contributes to a QA workflow

A skill is a directory centered on a \`SKILL.md\` file. Its documented frontmatter includes \`name\` and \`description\`; the name can be up to 64 characters and the description up to 1024 characters. The body contains workflow instructions, and the directory can include references, scripts, or templates that the agent reads when relevant.

For Claude-based workflows, project skills can live under \`.claude/skills/\`, while personal skills can live under \`~/.claude/skills/\`. A project skill travels with the repository and can be reviewed like test code. A personal skill supports an individual's recurring work across repositories.

A focused QA skill might look like this:

\`\`\`markdown
---
name: playwright-failure-triage
description: Diagnose failed Playwright tests using repository evidence, traces, and assertion behavior. Use for flaky, timed-out, or unexpectedly passing browser tests.
---

# Playwright failure triage

1. Read the failing test and the nearest repository instructions.
2. Inspect the failure message and available trace or accessibility evidence.
3. Classify the failure before proposing a change.
4. Preserve the behavioral assertion. Do not replace it with a fixed wait.
5. Run the narrowest relevant verification after editing.

Load references/locator-diagnosis.md only when locator ambiguity is involved.
Load references/network-failures.md only for request or response evidence.
\`\`\`

This package contributes judgment. It tells the agent which evidence deserves priority, when to load deeper guidance, what shortcuts are prohibited, and how to verify a patch. It does not automatically create a new authenticated channel to a hosted test platform.

Skills are particularly effective for:

- reviewing generated tests against a team rubric;
- translating requirements into risk-based scenarios;
- applying page-object, fixture, or assertion conventions;
- diagnosing failures from artifacts already present in the workspace;
- generating consistent test plans or defect summaries;
- teaching a repeatable migration, review, or debugging sequence.

The skill's description is an activation surface, not merely marketing copy. It should identify both the capability and the situations that call for it. The body should remain procedural. Conditional depth belongs in referenced files so a mobile-testing case does not load a browser-testing handbook.

Because it is readable text, a skill is easy for QA reviewers to inspect. They can ask whether it preserves assertions, requires evidence, respects repository policy, and handles ambiguity. That reviewability is a major advantage when the capability is chiefly a method.

## What an MCP server adds beyond instructions

Model Context Protocol provides a standard connection between an AI application and external capabilities. An MCP server can expose tools that perform actions and resources that provide data. For a QA organization, that might mean fetching a CI run, querying a test-case catalog, generating sanctioned test data, or retrieving a browser artifact through a stable interface.

The official TypeScript SDK package is \`@modelcontextprotocol/sdk\`. A server can be created with \`McpServer\`, register a \`tool()\`, and connect through a transport such as \`StdioServerTransport\`. The following example demonstrates the documented shape without binding it to a real vendor:

\`\`\`typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'qa-run-service',
  version: '1.0.0',
});

server.tool(
  'get_test_run',
  'Fetch a test run by its approved identifier',
  { runId: z.string().min(1) },
  async ({ runId }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({ runId, status: 'example' }),
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
\`\`\`

In a production implementation, the handler would call an approved backend, validate its response, enforce authorization, redact sensitive fields, and translate failures into useful tool errors. The sample intentionally avoids inventing vendor endpoints or configuration keys.

MCP is valuable because the callable boundary is explicit. Inputs can be schema-validated. Credentials can remain in the server process rather than appearing in prompts. Read operations and write operations can be separated. Calls can be logged. A client can discover the tool's description and input shape instead of guessing a command-line incantation.

That power also creates obligations. The server is software: it needs dependency maintenance, error handling, tests, deployment or local process management, authentication, observability, and compatibility checks. A three-paragraph review checklist rarely justifies those costs. A reusable gateway to live test infrastructure often does.

For a build walkthrough, the [guide to creating an MCP server for QA testing tools](/blog/how-to-create-mcp-server-for-qa-testing-tools) covers server structure and testing in more depth.

## Compare the execution models under real test conditions

The two approaches behave differently during an agent run. A skill influences the agent after its description is matched and its instructions are loaded. The agent interprets those instructions in context. An MCP server advertises a callable interface; the agent chooses a tool, supplies validated arguments, and receives a result.

| Runtime concern | SKILL.md behavior | MCP server behavior | QA consequence |
|---|---|---|---|
| Activation | Description and task context guide selection | Tool description and schema guide selection | Both need precise naming, but only tools execute a handler |
| Inputs | Natural-language request plus files and context | Declared tool arguments | MCP can reject malformed run IDs before backend access |
| Processing | Model interprets a written procedure | Server code performs a defined operation | Skill behavior is flexible; server behavior is testable as code |
| Output | Prose, plan, edit, or agent-created artifact | Tool result returned to the client | MCP can normalize vendor responses before reasoning |
| State | Usually workspace and conversation context | Can access process or remote state | Live run status belongs behind an integration boundary |
| Errors | Agent explains missing context or failed steps | Handler returns protocol-visible failure information | MCP needs deliberate error semantics and safe redaction |
| Side effects | Performed only through tools the agent already has | Implemented by registered tools | Server can centralize approval and authorization checks |

Neither model guarantees that the agent uses the capability correctly. A clear skill can still be ignored. A well-typed MCP tool can still be called for the wrong run. Evaluation must therefore cover selection and outcome for both.

The testing approach differs. For a skill, create activation cases, repository fixtures, behavior rubrics, and regression scenarios. For an MCP server, add unit tests for handlers, schema rejection tests, transport-level integration tests, permission tests, backend contract tests, and then agent-level scenarios that verify appropriate tool selection.

When comparing reliability, distinguish semantic variance from operational variance. Skill results vary because a model can interpret guidance differently. MCP results can vary because networks, backends, permissions, and data change. A hybrid inherits both, but it also gives you better separation when diagnosing failures.

## Use a decision matrix tied to risk, reuse, and change rate

A useful choice is rarely based on one criterion. Score the proposed capability across data freshness, side effects, procedural complexity, reuse, security, and ownership. The result will usually point clearly to instructions, integration, or a hybrid.

| Decision signal | Choose SKILL.md | Choose MCP server | Choose both |
|---|---|---|---|
| Data freshness | Static or repository-local evidence | Latest status must be fetched | Live evidence must be interpreted by a defined method |
| Side effects | No new external action | A narrow operation is the main value | Writes require policy, preparation, and confirmation |
| Procedural depth | Multi-step reasoning dominates | Handler operation is straightforward | Rich workflow orchestrates several bounded calls |
| Cross-client reuse | Instruction format is supported where needed | Multiple MCP clients need one integration | Portable procedure and shared service both matter |
| Secret exposure | No new secret is needed | Credentials should remain server-side | Skill forbids disclosure; server enforces storage boundary |
| Change rate | QA practice changes through review | Vendor API or backend contract changes | Each layer evolves under separate ownership |
| Auditability | Review text and resulting transcript | Record validated calls and server results | Need rationale plus authoritative call record |

Use three practical rules.

First, do not build an MCP server only to deliver prose that could live in a reviewed file. A server that returns a flaky-test checklist adds runtime and maintenance without a meaningful execution boundary.

Second, do not put credentials or undocumented network instructions into a skill and call that an integration. If the capability depends on authenticated current state, give it a real controlled interface or use an existing approved tool.

Third, separate “what should happen” from “how a remote action is implemented.” The skill can state that defect creation requires evidence, deduplication, severity reasoning, and human confirmation. The server can validate the project, enforce permitted fields, and submit the approved payload.

If the score is close, prototype the thinner option. Start with a skill and fixture data when you are still discovering the workflow. Build the server once the repeated external operation and its contract are stable. This avoids encoding an immature process in a public tool interface.

## Choose SKILL.md for knowledge-heavy testing capabilities

Instruction packaging wins when the hard part is applying expert judgment to available evidence. QA work contains many such problems. Risk analysis, assertion review, coverage critique, and failure classification depend on context and tradeoffs more than fresh remote data.

Imagine a skill that reviews API tests. It can instruct the agent to identify contract boundaries, distinguish transport checks from business assertions, inspect negative paths, avoid coupling every assertion to an entire response snapshot, and verify pagination or idempotency where relevant. References can provide framework-specific examples. No server is necessary if the repository and API specification are already available.

\`\`\`markdown
## API test review sequence

1. Map each test to a contract behavior, not only an endpoint name.
2. Separate status, headers, schema, and domain assertions.
3. Check authorization, validation, pagination, and retry boundaries where relevant.
4. Flag assertions that can pass while the user-visible behavior is broken.
5. Propose the smallest coverage improvement and show how to verify it.
\`\`\`

Skills also suit organization-specific conventions. A team may require generated tests to use its existing fixtures, avoid raw selectors in spec files, or tag destructive scenarios. These rules belong near the repository and should change through normal review.

Choose a skill when most answers to these questions are yes:

- Can the task be completed with repository files and already approved tools?
- Is expert sequence or judgment the main differentiator?
- Will examples, rubrics, or templates improve consistency?
- Should the capability be readable and editable by QA engineers?
- Are external side effects absent or already handled elsewhere?

Do not mistake “just markdown” for “unimportant.” A skill can materially change tool choice and code edits. Test it with realistic fixtures, negative activation prompts, and regression gates. Review its references for stale commands and conflicting repository policy.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI. Treat installed guidance like a dependency: inspect its scope, evaluate it in a disposable repository, and pin your adoption process to reviewed behavior.

## Choose MCP when live systems and controlled operations dominate

MCP becomes compelling when the agent needs data or actions that do not exist in its workspace. Test infrastructure is full of such boundaries: hosted run history, device farms, test-management systems, artifact storage, synthetic data services, and internal environment controllers.

Good MCP tool candidates are narrow and outcome-oriented. \`get_test_run\` is clearer than a generic \`request\` tool. \`create_synthetic_customer\` can validate permitted attributes and guarantee that it targets a non-production environment. \`publish_test_result\` can enforce the required result shape. A generic shell or HTTP tunnel shifts too much interpretation and security risk back to the model.

\`\`\`typescript
server.tool(
  'create_synthetic_customer',
  'Create a synthetic customer in an approved test environment',
  {
    environment: z.enum(['local', 'qa', 'staging']),
    plan: z.enum(['free', 'standard', 'enterprise']),
  },
  async ({ environment, plan }) => {
    const customer = await testDataService.create({ environment, plan });
    return {
      content: [{ type: 'text', text: JSON.stringify(customer) }],
    };
  },
);
\`\`\`

The handler boundary gives integration engineers a place to implement timeouts, retries, response-size limits, redaction, and service-specific error translation. It also gives testers a normal code surface to exercise.

Choose MCP when most answers to these questions are yes:

- Must the capability fetch current state from a process or service?
- Does it need credentials that should not enter model context?
- Can inputs and outputs be described as a stable contract?
- Will multiple agent workflows reuse the same operation?
- Do authorization, audit, or rate limits need centralized enforcement?
- Is there an owner prepared to operate the server as software?

Do not expose every backend endpoint. Design tools around agent tasks and least privilege. A QA result service might allow read-only retrieval broadly while restricting “cancel run” or “publish result” to particular environments and explicit confirmation flows.

## Combine them when procedure must govern tool use

The most capable QA design is often a hybrid. The MCP server exposes small, validated operations. The skill teaches the agent when to call them, how to interpret results, what evidence is sufficient, and when human confirmation is required.

Consider flaky-test triage. The tool layer may expose:

- \`get_test_run\` for normalized run metadata;
- \`get_failure_artifact\` for an approved artifact by identifier;
- \`find_recent_failures\` for bounded history;
- \`propose_quarantine\` for a non-final recommendation record.

The skill can then encode the analytical workflow:

\`\`\`markdown
## Remote flaky-test triage

1. Fetch the named run. Do not search unrelated projects.
2. Compare the failure with a bounded recent history only when flakiness is plausible.
3. Inspect assertion evidence before infrastructure symptoms.
4. Classify confidence and list contrary evidence.
5. Propose quarantine only when the repository policy permits it.
6. Never disable or quarantine a test solely because it failed once.
\`\`\`

This split makes each layer testable. MCP unit tests can verify that a run lookup respects project scope and redacts tokens. Skill evals can verify that the agent does not label a one-time product defect as flaky. End-to-end scenarios can verify that the correct tool is called and the final recommendation cites returned evidence.

| Hybrid responsibility | Skill layer | MCP layer |
|---|---|---|
| Determine whether history is needed | Applies diagnostic policy | Provides bounded history query |
| Choose acceptable evidence | Defines trace, log, and assertion priorities | Retrieves requested artifact safely |
| Handle credentials | Says never to request or repeat secrets | Stores and uses credentials outside prompt context |
| Control write intent | Requires evidence and confirmation | Validates authorization and executes approved operation |
| Explain outcome | Produces QA-readable reasoning | Returns authoritative structured facts |

Avoid duplicating policy in both places. The server must enforce security and data-integrity invariants even if the skill forgets them. The skill should own analytical guidance that changes with QA practice. If the same rule is essential to preventing harm, enforce it server-side and explain it skill-side.

## Account for portability across agent ecosystems

Portability is not binary. Procedural content can often be translated across instruction systems, while the exact discovery mechanism and precedence rules differ. MCP offers a shared protocol for clients that support it, but client configuration, transport availability, and user approval still vary.

The broader [agent skills portability guide](/blog/agent-skills-open-standard-portability) covers the open-standard landscape. For architecture decisions, separate portable knowledge from product-specific packaging.

| Ecosystem mechanism | Documented location or format | Typical QA use |
|---|---|---|
| Claude skills | \`.claude/skills/\` or \`~/.claude/skills/\` with \`SKILL.md\` | On-demand workflow and supporting QA resources |
| GitHub Copilot repository instructions | \`.github/copilot-instructions.md\` | Repository-wide coding and testing guidance |
| GitHub Copilot path instructions | \`.github/instructions/*.instructions.md\` with \`applyTo\` frontmatter | Rules scoped to specs, page objects, or fixtures |
| AGENTS.md standard | \`AGENTS.md\`, with the nearest applicable file winning | Hierarchical build, test, and repository conventions |
| Cursor rules | \`.cursor/rules\` containing \`.mdc\` files | Rules using documented \`alwaysApply\`, \`globs\`, or \`description\` fields |
| Gemini CLI context | \`GEMINI.md\` | Project context and test commands for Gemini CLI |

Do not assume these files are interchangeable byte for byte. A procedure can be portable even when its metadata and activation model are not. Keep core QA knowledge in clean markdown modules, then adapt the wrapper and routing cues to each supported agent.

MCP portability works at a different layer. One server can serve multiple compatible clients, but you still need to verify each client's support, connection method, tool presentation, permissions, and behavior with large results. Avoid documenting unverified client configuration keys. Link teams to the official client documentation for installation details.

For maximum reuse, make tool descriptions self-contained and keep result schemas stable. Do not assume a specific skill has been loaded before the tool is visible. Conversely, make skill workflows degrade gracefully when the MCP connection is unavailable: explain what local evidence can still be analyzed and never fabricate a remote result.

## Test each option according to its failure surface

The architecture decision changes the test plan. A skill is primarily a model-facing specification. An MCP server is an executable integration. A hybrid requires layer-specific and end-to-end coverage.

For SKILL.md, test:

- activation recall on direct and indirect QA prompts;
- activation precision against adjacent coding and security work;
- instruction adherence across representative repositories;
- progressive loading of relevant references;
- generated artifact syntax and behavior;
- resistance to untrusted instructions in logs and fixture data;
- regression cases from real agent failures.

For an MCP server, test:

- schema acceptance and rejection at every tool boundary;
- successful and failing backend responses;
- authentication and authorization behavior;
- redaction of secrets and sensitive fields;
- timeouts, partial data, rate limits, and oversized results;
- read versus write separation;
- transport startup, shutdown, and malformed requests;
- audit records that avoid storing sensitive content unnecessarily.

A minimal handler test can call the underlying application function without involving a model:

\`\`\`typescript
import { describe, expect, it } from 'vitest';

describe('getTestRun', () => {
  it('rejects a run outside the permitted project', async () => {
    const result = await getTestRun({
      runId: 'run-example',
      permittedProject: 'checkout',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('RUN_NOT_PERMITTED');
  });
});
\`\`\`

Then add agent-level scenarios. Give the agent a request that needs a known run and verify it calls \`get_test_run\` with the supplied identifier. Give it a local-only log and verify it does not make an unnecessary remote call. For a write tool, confirm the agent gathers required evidence and presents the proposed action before execution when your policy requires confirmation.

Test the hybrid seam explicitly. What happens when the skill expects a field the server no longer returns? What happens when the tool is unavailable midway through the workflow? Contract tests and versioned fixtures can catch schema drift, while end-to-end evals reveal whether the agent recovers honestly.

## Design the MCP trust boundary for test infrastructure

An MCP server should reduce the model's authority to a set of understandable operations, not become a tunnel around existing controls. This matters in QA because non-production systems still contain customer-like data, shared environments, release signals, and credentials.

Start read-only. Expose the smallest data set required for the task. A “get failure summary” tool is safer and easier to reason about than arbitrary artifact-bucket access. Filter results by project and environment. Return stable identifiers rather than internal paths when clients do not need them.

For write operations, validate every field server-side. Treat model-supplied text as untrusted input. Enforce environment allowlists, record actor and request context where appropriate, and design idempotency for actions that might be retried. Human confirmation in the client is useful, but server authorization remains mandatory.

\`\`\`yaml
tool_policy:
  get_test_run:
    access: read
    environments: [qa, staging]
    returns: normalized status and approved artifact identifiers
  propose_defect:
    access: write-draft
    requires: evidence summary and target project
    effect: creates a draft only
  delete_test_data:
    access: not-exposed
\`\`\`

Be careful with logs. Tool arguments and responses may contain tokens, headers, personal data, or proprietary test payloads. Redact before returning content to the model and before writing telemetry. Set useful result-size limits and provide bounded pagination or summaries rather than dumping an entire run history.

Errors should be safe and actionable. Return that access was denied or the run was not found without exposing backend topology. Distinguish retryable service unavailability from invalid input so the agent does not loop blindly.

Threat-model the combined system. A malicious string inside a test name or log could tell the model to call a write tool. The skill should teach the agent to treat artifacts as data, while the server should make unauthorized calls harmless. Defense belongs in both reasoning guidance and enforced controls.

## Estimate maintenance cost before committing to a server

The initial implementation is a small part of MCP ownership. A server that touches test infrastructure needs an owner for dependency updates, backend API changes, credential rotation, uptime expectations, telemetry, incident response, and client compatibility.

Use a cost table during planning:

| Cost area | SKILL.md burden | MCP server burden |
|---|---|---|
| Initial build | Write instructions, references, examples, evals | Design tools, implement handlers, transport, tests, and docs |
| Ongoing change | Review guidance and refresh examples | Maintain code, SDK, backend contracts, auth, and deployment |
| Quality assurance | Agent evals and artifact verification | Unit, integration, security, contract, and agent-level tests |
| Operations | Usually repository distribution | Process or service lifecycle, logs, alerts, credentials |
| Rollback | Revert reviewed content | Roll back server plus coordinate clients and contracts |

This does not mean MCP is excessively heavy. It means its value should come from a genuine integration boundary. If five QA workflows need the same test-run retrieval, a maintained server may be cheaper and safer than five ad hoc scripts. If one workflow needs a severity rubric, a skill is dramatically simpler.

Model change ownership explicitly. QA enablement may own diagnostic policy and fixtures. Platform engineering may own access to CI history. Security may approve tool scopes. A hybrid lets each group review the layer matching its expertise.

Version behavior deliberately. Skills can be tracked by repository commit or content hash. MCP servers should preserve stable tool contracts where possible and test consumers before breaking changes. Do not promise a versioning scheme your implementation does not actually enforce.

Track usefulness after release: successful task completion, unnecessary tool calls, authorization failures, stale guidance reports, latency, and human overrides. Maintenance decisions should be based on observed workflow value, not merely server availability.

## Apply the choice to four common QA scenarios

Concrete cases make the boundary easier to see.

### Scenario 1: Review AI-generated Playwright tests

Choose SKILL.md. The agent needs a rubric for observable behavior, locator resilience, assertion strength, isolation, and repository conventions. The spec and page objects already exist locally. Add an MCP server only if the review must retrieve remote traces or publish approved findings.

### Scenario 2: Fetch the latest mobile device-farm failure

Choose MCP. The value is authenticated access to changing remote state. Expose a narrow run lookup and approved artifact retrieval. Add a skill if the agent also needs an organization-specific method to distinguish device instability from application failure.

### Scenario 3: Generate safe synthetic accounts

Choose MCP for the generator because validation, environment restrictions, and credentials must be enforced. Pair it with a skill when test designers need guidance on selecting data dimensions, avoiding production identifiers, and cleaning up without breaking parallel scenarios.

### Scenario 4: Convert a requirement into a risk-based test plan

Choose SKILL.md. The main work is reasoning: identify actors, assets, transitions, failure impacts, boundaries, and evidence. A server adds value only if it must fetch requirements from a live system or publish the plan through a controlled API.

| Scenario | Primary choice | Optional complement | Deciding fact |
|---|---|---|---|
| Generated test review | SKILL.md | MCP for remote evidence | Judgment dominates |
| Device-farm retrieval | MCP server | Skill for diagnosis | Live authenticated data dominates |
| Synthetic account creation | MCP server | Skill for data strategy | Controlled side effect dominates |
| Risk-based test planning | SKILL.md | MCP for publishing | Procedural reasoning dominates |

If a scenario seems to require both immediately, split it into phases. Prototype the reasoning against fixture data. Stabilize the needed external operations. Then expose only those operations through tools. This produces a cleaner contract and a more testable workflow.

## Migrate without coupling policy to integration code

Teams often begin with a skill that tells an agent to run an existing script. Later, multiple repositories need the same operation, credentials become awkward, or the script's output proves inconsistent. That is a reasonable point to migrate the operation behind MCP.

Use a staged migration:

1. Inventory the skill's steps and label each as reasoning, local file work, or external operation.
2. Capture fixture examples of current inputs, outputs, errors, and authorization rules.
3. Design narrow tools for stable external operations only.
4. Implement and test the server independently of the model.
5. Replace procedural command details in the skill with decision rules for tool use.
6. Run champion-challenger evals against the original workflow.
7. Retire duplicated scripts or instructions only after supported clients are verified.

Keep the skill free of server internals. It should say “fetch the named run when local evidence is insufficient,” not describe private endpoints, tokens, or deployment topology. Keep the server free of subjective QA diagnosis unless that logic must be enforced as a data-integrity invariant.

The reverse migration can also make sense. If a server tool merely returns static guidance, move that content into a skill or repository instruction and remove the operational dependency. Simplification is a valid architecture outcome.

Document fallback behavior. If the server is unavailable, the agent may still analyze local logs, explain what evidence is missing, and provide a manual next step. It must not manufacture live status. This graceful degradation is especially important for CI incidents, where integration outages may correlate with the problem under investigation.

The final architecture should make failure ownership obvious. A wrong severity recommendation points toward the skill and its evals. An unauthorized project lookup points toward server enforcement. A tool called unnecessarily points toward descriptions, workflow guidance, or agent selection tests at the seam.

## Frequently Asked Questions

### Can a SKILL.md call an MCP tool?

Yes, a skill can instruct an agent when and how to use an available MCP tool, provided the client has connected that server and exposed the tool. The skill does not create the connection by itself and should not assume unavailable capabilities. Write fallback guidance for missing tools, keep credentials out of the skill, and test both connected and disconnected scenarios. The strongest pattern is a skill that owns QA reasoning while the server owns validated access to live systems.

### Is an MCP server better than a script bundled with a skill?

It depends on the boundary. A bundled script is suitable for local, reviewable, repository-scoped processing such as validating a generated fixture or summarizing a local report. MCP is stronger when multiple clients need a discoverable interface, credentials must stay outside model context, or authorization and remote contracts need centralized enforcement. Do not convert a stable local helper merely for novelty. Convert when operational reuse, security, or consistent integration behavior justifies server ownership.

### Which option is more portable across coding agents?

MCP can provide one tool interface to multiple clients that support the protocol, but connection and permission details still vary. Procedural guidance is conceptually portable, yet each ecosystem has its own instruction locations, metadata, and precedence rules. The most portable design separates clean QA knowledge from product-specific wrappers and keeps MCP tool contracts self-contained. Verify every target client's current documentation instead of assuming that one configuration file or discovery behavior works everywhere.

### Should a QA team build the skill or the MCP server first?

Start with the skill when the workflow and decision criteria are still being discovered, using fixture data to refine the method. Start with MCP when a well-understood authenticated operation is already the primary requirement, such as retrieving a named run from a shared platform. For a hybrid, stabilize the external contract and the reasoning contract independently, then test their seam. The first implementation should be the thinnest one that proves the capability without hiding credentials or side effects in prose.
`,
};
