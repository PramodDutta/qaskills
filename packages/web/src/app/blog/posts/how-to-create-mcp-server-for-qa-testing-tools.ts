import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Create an MCP Server for QA Testing Tools',
  description: 'Learn how to create MCP server testing tools that let AI agents discover tests, run safe subsets, inspect failures, and return structured evidence.',
  date: '2026-07-15',
  category: 'Tutorial',
  content: `
# How to Create an MCP Server for QA Testing Tools

An AI coding agent can edit a failing test, but it cannot verify the repair if the test runner, report data, and failure artifacts are trapped behind repository-specific commands. Model Context Protocol (MCP) gives the agent a typed doorway into those capabilities. A QA-focused MCP server can expose narrow tools such as “list test projects,” “run the checkout smoke group,” and “read the latest sanitized failure summary.”

The important word is narrow. An MCP tool is not a conversational wrapper around unrestricted shell access. It is an application interface that an agent can discover and call. Its schema, description, validation, output, time limit, and permissions collectively define what the agent is allowed to do.

This tutorial shows how to create MCP server testing tools with TypeScript and the official \`@modelcontextprotocol/sdk\` package. The implementation uses \`McpServer\`, \`tool()\`, and \`StdioServerTransport\`, then grows from a read-only discovery tool into a guarded test runner and artifact reader. It also covers handler tests, protocol inspection, error design, security, CI packaging, and rollout.

The official SDK repository is https://github.com/modelcontextprotocol/typescript-sdk, and the protocol documentation is at https://modelcontextprotocol.io. The examples follow the stable v1 package style requested for this guide. Check the official repository before upgrading across a major SDK generation because package entry points and registration APIs can change.

## Start with the QA action, not the protocol

Before installing a dependency, choose one testing action that is painful for an agent but already safe and routine for a human. Good first candidates are deterministic, bounded, and easy to verify:

- List the test projects or suites that the repository supports.
- Run one allow-listed suite in a non-production environment.
- Return a compact summary from an existing machine-readable report.
- Read a redacted trace index or failure manifest.
- Validate that a test identifier maps to an existing test.

Avoid beginning with “run any command” or “query any environment.” Those tools outsource authorization to generated arguments. The agent may be well intentioned and still choose an expensive, destructive, or secret-exposing operation.

Write the intended call as an input-output contract. For example: given \`suite = checkout-smoke\`, run the repository's fixed checkout command, enforce a three-minute limit, and return exit status, duration, counts, and a bounded diagnostic excerpt. Reject every unknown suite before starting a process.

That statement gives you a testable boundary. It identifies the argument, command mapping, time budget, and evidence. It also exposes unresolved policy. Which environments are allowed? Can tests create data? How is cleanup guaranteed? Who owns the suite mapping? If these questions have no answer, an MCP server will not solve them. It will merely make the ambiguity callable.

## Decide which MCP primitive carries each testing capability

MCP supports tools, resources, and prompts. A QA server does not need to use all three. Choose according to behavior.

| Primitive | QA use | Agent interaction | Use it when |
|---|---|---|---|
| Tool | Run a suite, seed an isolated record, validate a contract | Sends validated arguments and receives a result | The operation computes, changes, or actively retrieves something |
| Resource | Test catalog, static environment policy, stored report | Reads addressable context | Data has a stable identity and read semantics |
| Prompt | Triage checklist or release-test framing | Requests a reusable message template | A consistent reasoning scaffold is useful |

This tutorial uses tools because test discovery, execution, and artifact sanitization are active operations. A future version could publish immutable reports as resources, but that is not required for a useful first server.

Separate tools by permission and latency. “List test projects” is read-only and fast. “Run integration tests” consumes compute and may create temporary data. “Reset a shared environment” is both mutating and consequential. Combining them behind one \`action\` string obscures those differences and produces a weak schema.

Tool boundaries should also match audit questions. A log entry saying \`run_test_suite\` with \`checkout-smoke\` is meaningful. A log saying \`qa_action\` with an arbitrary nested payload requires reconstruction. Specific names improve agent selection, server policy, and incident review.

## Design the tool contract around evidence

Agents choose tools from names, descriptions, and input schemas. They interpret results from the content you return. Those surfaces are part of test infrastructure, so design them with the same care as a public API.

| Contract element | Weak version | QA-ready version |
|---|---|---|
| Name | \`execute\` | \`run_qa_suite\` |
| Description | “Runs tests” | “Run one allow-listed QA suite in the local workspace and return a bounded result summary” |
| Input | Free-form command string | Enum of owned suite identifiers |
| Success output | Entire console log | Status, exit code, duration, summary, truncated diagnostics |
| Error output | Stack trace | Stable category, safe message, retry guidance, evidence reference |
| Side-effect policy | Implicit | Stated in description and enforced in handler |

Prefer domain identifiers over implementation strings. A caller should request \`api-contracts\`, not \`npm run test -- --project contracts\`. The server owns the mapping to current repository commands. When the package script changes, you update one controlled mapping without changing the agent-facing contract.

Return facts before prose. An agent needs to distinguish “tests failed” from “runner could not start,” “input was rejected,” and “execution timed out.” Those outcomes lead to different next actions. A concise JSON summary embedded as text is often easier for both agents and humans to inspect than thousands of raw log lines.

Bound every variable-size field. Test runners can produce megabytes of output, especially during retries. Preserve complete logs in an approved artifact location if policy permits, then return a size-limited excerpt and a safe identifier. Never assume that model context is a log archive.

## Scaffold a small TypeScript stdio server

Create a dedicated package or folder inside the test-infrastructure repository. The exact workspace layout is yours; the server needs a Node-compatible TypeScript setup and the official SDK plus Zod for schemas.


\`\`\`bash
mkdir qa-mcp-server
cd qa-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install --save-dev typescript @types/node
\`\`\`

Use the repository's supported TypeScript configuration and module conventions. Do not copy compiler settings blindly into a monorepo that already provides a base configuration. The critical point is that the emitted imports and Node runtime agree.

Start with a single file that registers one read-only tool and connects over stdio:


\`\`\`typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'qa-testing-tools',
  version: '1.0.0',
});

server.tool(
  'list_qa_suites',
  'List the allow-listed QA suites this server can run',
  {},
  async () => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          suites: ['unit', 'api-contracts', 'checkout-smoke'],
        }),
      },
    ],
  }),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error('QA MCP server failed', error);
  process.exitCode = 1;
});
\`\`\`

\`McpServer\` holds the capabilities and registered tools. \`StdioServerTransport\` carries MCP messages through standard input and standard output, which suits a local client launching the server as a child process. The top-level error goes to standard error. That detail is essential because ordinary text on standard output can corrupt stdio protocol communication.

Build and run the emitted JavaScript using scripts and paths appropriate to your repository. At this stage, the server should do only one thing: connect and advertise a deterministic catalog.

## Keep the suite catalog in one owned module

Hard-coding a list in the registration callback is fine for the first connection test, but execution needs a single policy source. Model each suite as server-owned data. Do not accept executable strings from the caller.


\`\`\`typescript
export type SuiteId = 'unit' | 'api-contracts' | 'checkout-smoke';

export interface SuiteDefinition {
  readonly id: SuiteId;
  readonly summary: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly timeoutMs: number;
  readonly mutatesTestData: boolean;
}

export const suites: Readonly<Record<SuiteId, SuiteDefinition>> = {
  unit: {
    id: 'unit',
    summary: 'Fast isolated tests for application and test utilities',
    command: 'npm',
    args: ['run', 'test:unit'],
    timeoutMs: 120_000,
    mutatesTestData: false,
  },
  'api-contracts': {
    id: 'api-contracts',
    summary: 'Consumer and provider compatibility checks',
    command: 'npm',
    args: ['run', 'test:contracts'],
    timeoutMs: 180_000,
    mutatesTestData: false,
  },
  'checkout-smoke': {
    id: 'checkout-smoke',
    summary: 'Small browser smoke path for checkout in the approved test environment',
    command: 'npm',
    args: ['run', 'test:checkout-smoke'],
    timeoutMs: 180_000,
    mutatesTestData: true,
  },
};
\`\`\`

The script names above are illustrative application code, not MCP configuration. Replace them with scripts that truly exist and are maintained in your repository. The agent never supplies them.

Include policy-relevant metadata. \`mutatesTestData\` can inform descriptions, approval, or audit output. A timeout belongs to the suite because browser and unit workloads have different reasonable limits. You might also track ownership or environment class if those properties are enforced by your server.

Do not place secrets in the catalog. It may be returned through discovery or printed during diagnostics. Resolve credentials through the repository's established secret mechanism at execution time, and validate only that required access is available.

The catalog also creates a review point. Adding a suite becomes a deliberate code change where a QA owner can inspect the command, arguments, expected duration, side effects, and cleanup assumptions.

## Register a discovery tool that reports policy

Upgrade \`list_qa_suites\` so it derives from the catalog and tells the caller what each choice means. Discovery should expose safe metadata, not executable internals.


\`\`\`typescript
import { suites } from './suites.js';

server.tool(
  'list_qa_suites',
  'List runnable QA suite identifiers, purposes, time limits, and test-data side effects',
  {},
  async () => {
    const catalog = Object.values(suites).map((suite) => ({
      id: suite.id,
      summary: suite.summary,
      timeoutMs: suite.timeoutMs,
      mutatesTestData: suite.mutatesTestData,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify({ suites: catalog }) }],
    };
  },
);
\`\`\`

Notice what is absent: command paths, environment variable values, and raw configuration. The agent needs to choose a suite, not reconstruct the process invocation.

A useful description states that this tool lists identifiers for another tool. It also names policy dimensions such as time limits and data mutation. That helps an agent inspect choices before executing an expensive suite.

Keep discovery synchronized automatically by reading the same catalog used by execution. Duplicated arrays drift. A retired suite may remain advertised after its command disappears, or a new suite may become callable without visible documentation.

Discovery results should be stable enough for planning but not treated as a permanent cache. The server's version and repository revision may change between sessions. If exact reproducibility matters, include a non-secret revision identifier in execution results.

## Implement a bounded process runner

The process wrapper is the server's safety core. It should avoid a shell, pass an explicit argument array, set a controlled working directory, capture bounded output, enforce the suite timeout, and distinguish startup failure from test failure.


\`\`\`typescript
import { spawn } from 'node:child_process';

export interface ProcessResult {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
}

const MAX_CAPTURE_CHARS = 20_000;

export async function runProcess(
  command: string,
  args: readonly string[],
  cwd: string,
  timeoutMs: number,
): Promise<ProcessResult> {
  const startedAt = Date.now();

  return await new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      env: process.env,
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = (stdout + chunk.toString()).slice(-MAX_CAPTURE_CHARS);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-MAX_CAPTURE_CHARS);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once('close', (exitCode) => {
      clearTimeout(timer);
      resolve({
        exitCode,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}
\`\`\`

This is a foundation, not universal process supervision. Some test runners create child process trees, and termination behavior differs by operating system. Validate shutdown in the environments you support. If the repository already has a job runner with cancellation, output retention, and resource limits, adapt that instead of replacing it.

The capture keeps the tail because the final failure summary is often there. A more mature implementation can parse a structured reporter and return counts separately. Never rely on truncation alone for secret safety. Redact sensitive patterns before returning any content, and configure the underlying tests not to print secrets in the first place.

## Add a schema-validated run_qa_suite tool

Now connect the agent-facing enum to the server-owned catalog. Zod rejects unknown identifiers before a command starts.


\`\`\`typescript
import { z } from 'zod';
import { suites, type SuiteId } from './suites.js';
import { runProcess } from './run-process.js';

const suiteIds = ['unit', 'api-contracts', 'checkout-smoke'] as const;

server.tool(
  'run_qa_suite',
  'Run one allow-listed QA suite in the local workspace and return bounded evidence',
  { suite: z.enum(suiteIds) },
  async ({ suite }) => {
    const definition = suites[suite as SuiteId];
    const result = await runProcess(
      definition.command,
      definition.args,
      process.cwd(),
      definition.timeoutMs,
    );

    const status = result.timedOut
      ? 'timed_out'
      : result.exitCode === 0
        ? 'passed'
        : 'failed';

    const payload = {
      suite,
      status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      mutatesTestData: definition.mutatesTestData,
      stdoutTail: redact(result.stdout),
      stderrTail: redact(result.stderr),
    };

    return {
      isError: status !== 'passed',
      content: [{ type: 'text', text: JSON.stringify(payload) }],
    };
  },
);
\`\`\`

The omitted \`redact\` function is intentionally repository-specific. It should encode known secret forms and sensitive payload policy, and it needs its own tests. A generic regular expression cannot guarantee that arbitrary test logs are safe.

Marking a failed or timed-out run as an error helps the caller distinguish it from a passing result, while the content still provides structured evidence. Be consistent: a test assertion failure, process startup failure, invalid input, and policy denial should not all collapse into “failed.” Catch expected operational errors and map them to stable categories; allow truly unexpected server faults to remain visible in server diagnostics without leaking stack traces to the caller.

## Return machine-readable test evidence

Raw stdout is a compatibility trap. Reporter formatting changes, colors introduce control characters, and parallel workers interleave lines. Whenever possible, configure the test runner to emit an approved machine-readable report and parse it into a framework-neutral result.

| Field | Purpose | Example interpretation |
|---|---|---|
| \`status\` | Top-level outcome | \`passed\`, \`failed\`, \`timed_out\`, or \`runner_error\` |
| \`counts\` | Discovery and result confidence | Total, passed, failed, skipped, and flaky when the runner provides them |
| \`durationMs\` | Cost and anomaly signal | Unexpected growth can indicate environment or setup problems |
| \`failures\` | Bounded actionable evidence | Test identifier, safe message, source location, artifact IDs |
| \`revision\` | Reproducibility | Repository commit or other non-secret source revision |
| \`truncated\` | Evidence completeness | Tells the agent that returned diagnostics are partial |

Do not invent data when the runner cannot supply it. If a console-only suite does not provide reliable test counts, omit them or set an explicit availability field. Reporting zero failed tests after a runner crash is dangerously misleading.

A framework-neutral layer also stabilizes the MCP contract. You can migrate from one browser reporter to another without teaching every client new console syntax. Preserve runner-specific details in a bounded nested field only when they help triage.

Test identity deserves care. A title alone may collide across projects or parameterized cases. Prefer the stable identifiers already emitted by the runner, or construct an internal key from documented report fields. Do not promise global stability if the framework does not provide it.

## Expose failure artifacts through a safe reader

Traces, screenshots, videos, and reports are extremely useful to an agent, but arbitrary file reads are not. Expose artifacts by opaque ID from a server-owned manifest, not by caller-supplied path.


\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

interface ArtifactRecord {
  readonly id: string;
  readonly kind: 'failure-summary' | 'trace-index';
  readonly absolutePath: string;
}

const artifacts = new Map<string, ArtifactRecord>();

server.tool(
  'read_qa_artifact',
  'Read a bounded, sanitized text artifact produced by a QA suite in this server session',
  { artifactId: z.string().min(1).max(120) },
  async ({ artifactId }) => {
    const record = artifacts.get(artifactId);

    if (!record) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: JSON.stringify({
            category: 'artifact_not_found',
            artifactId,
          }),
        }],
      };
    }

    const text = await readFile(record.absolutePath, 'utf8');
    const bounded = redact(text).slice(0, 30_000);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          artifactId,
          kind: record.kind,
          text: bounded,
          truncated: text.length > bounded.length,
        }),
      }],
    };
  },
);
\`\`\`

The manifest should be populated only with files the runner created in an approved artifact root. Validate resolved paths when registering them, control retention, and clear session state when appropriate. Never let \`artifactId\` become a disguised filesystem path.

Binary artifacts require a deliberate design. A text summary or trace index may be enough for the first version. If a client supports image or resource content and the use case justifies it, add that capability after defining size, format, access, and redaction policy.

The \`truncated\` calculation in production should compare pre-redaction and post-bounding stages carefully. A robust implementation records whether any limiting step occurred instead of inferring only from final lengths.

## Protect the stdio channel and diagnostics

For a stdio MCP server, standard output belongs to protocol traffic. A casual \`console.log\` in a handler or imported test utility can insert non-protocol text and break the client connection. Send operational diagnostics to standard error or to an approved logging sink.

Keep logs structured and sparse. Record a request identifier, tool name, suite identifier, duration, outcome category, and server revision. Do not record tool payloads wholesale. Even a suite name may be safe while environment variables, headers, test data, or artifact bodies are not.

Test the production build for startup noise. Some libraries print banners or update notices when imported. A test runner launched as a child is allowed to write to the child pipes you capture, but the MCP server process itself must not mix that output with transport stdout.

Also distinguish client-facing diagnostics from operator diagnostics. The client needs a safe actionable category such as \`runner_not_available\`. The operator may need a full stack trace on stderr. Returning stacks to the agent can disclose filesystem layout, dependency internals, or secret-bearing arguments.

When investigating protocol behavior, the official MCP Inspector is safer than adding print statements to stdout. Keep transport correctness as an invariant from the first tool; retrofitting it after several libraries start logging is painful.

## Model failure categories before writing catch blocks

Error handling should tell the agent what happened and whether another call is reasonable. Define a small taxonomy based on QA operations.

| Category | Meaning | Appropriate agent response |
|---|---|---|
| \`invalid_request\` | Input failed schema validation | Correct arguments using discovery output |
| \`policy_denied\` | Known suite is not permitted in this context | Stop and request the required authorization or environment |
| \`runner_not_available\` | Executable, dependency, or workspace prerequisite is missing | Report setup evidence; do not edit tests blindly |
| \`tests_failed\` | Runner completed and assertions or checks failed | Inspect structured failures and relevant artifacts |
| \`timed_out\` | Server ended or attempted to end an overlong run | Investigate hang, load, teardown, or incorrect time budget |
| \`internal_error\` | Unexpected server fault | Report request ID; avoid repeated calls without new evidence |

Keep categories stable even if internal libraries change. Pair each with a human-readable message and bounded details. Do not tell an agent to retry automatically unless the operation is idempotent, the cause is plausibly transient, and you enforce a limit.

Test failures are valid tool outcomes, not server crashes. The server successfully ran the requested suite and learned that product or test behavior is wrong. Preserve that distinction in monitoring. Otherwise, a healthy server executing a legitimately failing regression suite looks unavailable.

Policy denial should happen before side effects. Validate the suite, environment class, concurrency allowance, and any required approval before spawning. The closer denial occurs to the tool boundary, the easier it is to reason about audit logs.

## Test handler logic without involving an AI model

Most defects live below MCP registration: wrong suite mapping, unsafe path handling, broken timeout logic, misleading status mapping, and incomplete redaction. Extract those functions and test them directly.


\`\`\`typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRun } from '../src/classify-run.js';

test('classifies a nonzero completed run as tests_failed', () => {
  const result = classifyRun({
    exitCode: 1,
    timedOut: false,
    durationMs: 842,
    stdout: '2 passed, 1 failed',
    stderr: '',
  });

  assert.equal(result.category, 'tests_failed');
  assert.equal(result.retryable, false);
});

test('timeout takes precedence over a termination exit code', () => {
  const result = classifyRun({
    exitCode: null,
    timedOut: true,
    durationMs: 180_010,
    stdout: '',
    stderr: 'terminated',
  });

  assert.equal(result.category, 'timed_out');
});
\`\`\`

Inject process execution into the tool handler so tests can use a fake runner. Verify that an unknown suite never calls it. Confirm that output limits apply and that secrets in representative logs are removed. Test artifact IDs containing path separators or traversal-like text, even though the manifest lookup should prevent path interpretation.

Add process-level tests for a tiny fixture program: one passes, one exits nonzero, one writes enough output to trigger bounding, and one exceeds the timeout. These tests reveal race conditions between \`error\`, \`close\`, and timer cleanup.

Contract testing the MCP surface adds another layer. The dedicated [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide) goes deeper into tool discovery, schema compatibility, and transport-level assertions.

## Inspect the protocol with an MCP client

After unit and process tests pass, exercise the built server as a real MCP client would. The official MCP Inspector can launch a local stdio server and display its advertised tools, schemas, calls, and results.


\`\`\`bash
npm run build
npx @modelcontextprotocol/inspector node build/server.js
\`\`\`

Use the actual emitted path from your package. In the Inspector, confirm that all tools appear, descriptions distinguish discovery from execution, enum values match the catalog, and invalid inputs are rejected. Call the passing and failing fixture suites. Inspect the raw result, not just the rendered summary.

Then test lifecycle behavior. Disconnect during a run, close the client after completion, and restart the server. Confirm that no orphan process continues unexpectedly and that transient artifact state has the retention behavior you designed.

Protocol inspection is not a substitute for handler tests. It proves wiring and serialized behavior; it does not exhaust path safety, output redaction, race conditions, or suite semantics. Use layers because each catches a different class of defect.

For a broader test strategy across tools, transports, clients, and operational behavior, see the [2026 guide to testing MCP servers](/blog/mcp-server-testing-guide-2026). This tutorial remains focused on building the QA capability itself.

## Add authorization at the side-effect boundary

A local stdio server inherits some trust from the user and process that launches it, but local does not mean harmless. Test tools can consume paid services, delete shared data, expose traces, or overload an environment.

Start with least privilege. The server process should receive only the credentials needed for the allow-listed suites. A suite that reads local reports should not gain deployment credentials. If two capabilities need materially different privileges, consider separate server processes so one compromise does not unlock both.

Enforce environment policy in code. A tool description saying “staging only” is guidance, not a control. Resolve the configured target through an approved mapping and reject production or unknown endpoints. Avoid accepting a URL from the agent for a mutating test.

Require explicit user or client approval for consequential operations when the host supports it, and still enforce server-side policy. Approval and authorization solve different problems. A user may approve a call that the service account is not permitted to perform.

Audit without collecting secrets. Record who or what invoked the tool when that identity is available, the policy decision, suite, target class, start and end time, outcome, and revision. Store logs under the organization's existing retention and access rules.

Threat-model test data. Screenshots may contain customer-like information, traces may include headers, and failure messages may echo passwords. Use synthetic data where possible, sanitize at source, and keep artifact readers restricted to server-created manifests.

## Control concurrency, cancellation, and resource cost

An agent may call a tool more than once, especially after an ambiguous timeout. Without coordination, two browser suites can fight for ports, accounts, or CPU. Decide whether runs are parallel-safe before exposing them.

A simple first server can permit one active mutating suite and return \`policy_denied\` or \`busy\` for another. Read-only discovery can remain available. More advanced scheduling may allocate per-suite concurrency, but every queue needs a maximum wait and a way to discard work after the client disconnects.

Use unique run IDs and isolated output directories. Shared filenames such as \`latest-report.json\` cause races and let one call read another call's artifacts. Associate artifact manifests with the run and, where appropriate, the client session.

Cancellation is a behavior to implement and test, not merely a method call on a child process. The test runner may spawn workers or containers. Verify that cancellation releases ports, closes browsers, removes temporary data, and marks the result accurately. A terminated parent with surviving workers is not cancelled.

Control financial cost too. A suite might call metered APIs or reserve cloud devices. Put expensive operations behind explicit suite IDs, visible descriptions, budgets enforced outside the model, and clear results. Do not rely on the agent to remember a cost note from an earlier conversation.

## Package the server for repeatable client launches

The client that launches a stdio server needs a command, arguments, and any approved environment configuration. Exact client configuration formats differ and evolve, so follow the official documentation for the host you use rather than copying an unrelated JSON block.

Package the built server so the launch path is stable. Pin dependency versions according to your organization's policy, commit the lockfile, and build in CI. If the server lives in a monorepo, make its working-directory assumption explicit in the launcher or resolve the QA workspace from trusted configuration.

Do not make installation run tests or download browsers unexpectedly. Separate build-time setup from tool execution. A missing browser or test dependency should produce a clear \`runner_not_available\` result during an appropriate preflight or run, not a mysterious protocol disconnect.

Version the agent-facing contract deliberately. Adding an optional tool is usually less disruptive than renaming a tool or changing an enum meaning. When a suite is retired, remove it from discovery and execution together. If clients may cache schemas, coordinate breaking changes and bump the server version.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI to teach agents when and how to use testing workflows. An MCP server supplies the controlled capability; a skill can supply procedural guidance. Review both against the same permissions and repository conventions.

## Run the server through a QA release gate

An MCP server for testing tools is itself test infrastructure. Release it with a gate that covers code, protocol, safety, and operations.

| Gate | Evidence | Blocking failure |
|---|---|---|
| Type and unit checks | Clean build plus handler, classifier, catalog, and redaction tests | Schema or behavior is ambiguous |
| Process fixtures | Pass, assertion failure, startup failure, timeout, and large-output cases | Child lifecycle or classification is wrong |
| Protocol inspection | Tool discovery and calls through a real client or Inspector | Serialization, stdio, or schema behavior differs |
| Security review | No arbitrary command/path, least privilege, environment denial, artifact policy | Caller can escape the intended boundary |
| Operational check | Bounded logs, run IDs, metrics, cleanup, and failure alerts | Failures cannot be diagnosed safely |
| Compatibility review | Tool names, inputs, result categories, and migration notes | Existing clients would misinterpret a change |

Run at least one representative repository suite in the same runtime environment used by actual clients. Fixture-only process tests cannot reveal missing browser binaries, workspace assumptions, or report path mismatches.

Observe the first real uses. Which descriptions lead the agent to the wrong tool? Does it call execution before discovery? Are failure excerpts actionable? Do timeouts reflect real suite duration? Improve the contract from evidence, not from adding more generic explanation.

Keep the initial surface small. Three reliable tools with clear ownership are more valuable than twenty wrappers around unstable scripts. New tools should enter only when they have an owner, permission model, test plan, bounded result, and retirement path.

## Evolve from command wrapper to QA platform boundary

The first version maps a suite identifier to a repository command. That is a legitimate design, provided the mapping is controlled. Over time, move important semantics into reusable modules: report parsing, run classification, artifact registration, environment policy, and audit events.

This makes the MCP layer thin. Registration validates arguments and formats results; domain modules implement QA behavior. The same modules can support a CLI, CI job, or internal service without copying policy.

Add capabilities in the order of diagnostic value. Structured result parsing usually helps more than adding another runner. Safe artifact summaries help more than returning longer logs. Preflight checks help more than optimistic retries. Each improvement should reduce uncertainty for the next agent decision.

Measure outcomes that matter to test engineering: time from failure to useful diagnosis, percentage of runs with complete structured evidence, orphaned process rate, rejected unsafe requests, flake visibility, and contract-breaking changes caught before release. Tool-call volume alone says nothing about quality.

The mature boundary lets an agent act quickly without guessing the repository's commands or gaining ambient shell power. It makes testing capability discoverable while keeping execution policy in code, where QA engineers can review and test it.

## Frequently Asked Questions

### Should a QA MCP server expose an arbitrary shell command tool?

No. An arbitrary command field turns the server into remote or local shell access controlled by generated text. Expose domain operations such as \`run_qa_suite\` with an enum of reviewed suite identifiers. Map each identifier to a fixed executable, argument list, timeout, working directory, and permission policy inside the server. This design prevents shell injection, makes calls auditable, keeps descriptions meaningful, and lets repository commands change without breaking the agent-facing contract. If maintainers need general shell access, use existing developer controls rather than disguising it as a QA tool.

### What should the server return when tests fail?

Return a structured, bounded result that says the runner completed and tests failed. Include the suite ID, stable outcome category, exit code, duration, reliable counts, a small set of sanitized failures, artifact identifiers, and whether any evidence was truncated. Do not treat an assertion failure as a server crash, and do not flood model context with complete logs. If the runner failed to start or the run timed out, use different categories because the next diagnostic action differs. Preserve full approved artifacts outside the response when your retention policy allows it.

### Is stdio sufficient for a team testing server?

Stdio is a strong fit when an MCP client launches a local server for one user or workspace. It simplifies the first deployment and avoids running a network service, but the process still needs least privilege, clean stdout, bounded child execution, and safe artifacts. A shared or remote service introduces authentication, authorization, tenant isolation, session handling, network exposure, and operational scaling. Choose transport from deployment and trust boundaries, not from perceived modernity. Prove the tool contract locally before accepting the extra risk of remote access.

### How do we keep MCP test tools compatible as the repository changes?

Keep agent-facing suite IDs and result categories separate from package scripts, reporter formats, and filesystem paths. One owned catalog maps stable IDs to current commands, while adapters normalize runner output into a documented result. Test discovery and calls through a real MCP client, and add contract tests for names, schemas, and error behavior. Change or remove a public identifier deliberately, update discovery and execution together, bump the server version for breaking behavior, and provide migration notes. Repository refactors should usually affect internal mappings rather than every client prompt.
`,
};

