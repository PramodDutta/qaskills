import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WebdriverIO Service Custom Plugin: Design, Build, and Test It',
  description: 'Build a WebdriverIO service custom plugin with typed options, launcher and worker hooks, process-safe artifacts, focused tests, and reliable failure handling.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# WebdriverIO Service Custom Plugin: Design, Build, and Test It

A WebdriverIO service custom plugin is the right abstraction when reusable test-runner behavior must run at lifecycle boundaries, outside individual specs. Typical uses include starting infrastructure once, configuring each worker, collecting per-test diagnostics, adding browser commands, or publishing a run summary. The service should own integration mechanics while tests keep expressing product behavior.

The key architectural fact is process isolation. WebdriverIO distinguishes launcher-service hooks, which coordinate the overall run, from worker-service hooks, which execute in worker processes. Global variables cannot be used to share state between those sides. A robust plugin therefore defines a small option contract, assigns each process a clear responsibility, and exchanges durable data through explicit files or a purpose-built shared service.

## Start With a Service-Shaped Problem

Do not create a service merely to shorten a helper import. A helper is better when tests call a deterministic function and no runner lifecycle is involved. A service becomes valuable when behavior must happen consistently for every worker or test without relying on authors to remember it.

Consider a diagnostic bundle that records failed test names, capabilities, URLs, and screenshot paths. A helper would require every test to wrap failures correctly. A reporter could format results, but may not own browser interaction at the moment evidence is needed. A worker service can use per-test hooks and the worker's browser object, while a launcher can prepare and finalize the run-level artifact directory.

| Requirement | Helper | Reporter | Custom service |
|---|---:|---:|---:|
| Called explicitly from a spec | Strong fit | Weak fit | Usually unnecessary |
| Reacts to runner hooks | Manual wiring | Yes | Yes |
| Uses browser in each worker | Possible | Depends on reporter context | Natural worker responsibility |
| Starts one run-level dependency | Awkward | Not its main purpose | Natural launcher responsibility |
| Packages reusable configuration | Limited | Reporting-focused | Strong fit |

Write the boundary as one sentence: "This service creates a run-scoped diagnostics directory, captures evidence after a failed test in each worker, and writes a final manifest after all workers finish." That sentence keeps feature creep visible. It excludes assertion helpers, page objects, application fixtures, and unrelated reporting.

## Separate Launcher Hooks From Worker Hooks

WebdriverIO documents two service roles. A launcher service has access to \`onPrepare\`, \`onWorkerStart\`, \`onWorkerEnd\`, and \`onComplete\`. Its lifecycle surrounds the worker pool. A worker service is instantiated per worker and can use the other runner hooks, including \`before\`, test or scenario hooks, and \`after\`.

| Concern | Launcher service | Worker service |
|---|---|---|
| Number of instances | Run-level | One for each worker process |
| Browser object | Not the normal execution context | Supplied to \`before\` |
| Good responsibility | Provision shared external resource | Capture worker-local browser evidence |
| Safe in-memory state | Only within launcher process | Only within that worker |
| Cross-process communication | Files, APIs, or shared mechanism | Files, APIs, or shared mechanism |

The split prevents a subtle failure. Suppose \`onPrepare\` sets \`globalThis.runId\`, and the worker service expects to read it. The worker lives in another process, so the value is absent. It may work in a unit test that constructs both classes in one process and fail only under the real runner. Pass the run identifier as configuration, an environment value established before worker creation, or a durable manifest.

The official custom-service reference is https://webdriver.io/docs/customservices. Check it when upgrading WebdriverIO because the current documentation is the source of truth for hook signatures and packaging expectations.

## Define Options That Fail Early and Explain Themselves

Service options are a public API even when the plugin initially lives in one repository. Avoid a bag of loosely related booleans. Use a narrow type, defaults for noncritical behavior, and startup validation for values that would corrupt output or expose sensitive data.

Our diagnostics plugin needs an artifact root, a run identifier, and an optional screenshot policy. It also needs a redaction callback, but functions can be awkward if configuration must cross process or serialization boundaries. Prefer declarative redaction keys and implement their behavior inside the service.

\`\`\`ts
export type DiagnosticsServiceOptions = {
  outputDir: string;
  runId: string;
  screenshots?: 'failures' | 'never';
  redactQueryKeys?: string[];
};

export type NormalizedOptions = {
  outputDir: string;
  runId: string;
  screenshots: 'failures' | 'never';
  redactQueryKeys: string[];
};

export function normalizeOptions(
  input: DiagnosticsServiceOptions,
): NormalizedOptions {
  if (!input.outputDir.trim()) {
    throw new Error('diagnostics outputDir must not be empty');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(input.runId)) {
    throw new Error('diagnostics runId contains unsupported characters');
  }

  return {
    outputDir: input.outputDir,
    runId: input.runId,
    screenshots: input.screenshots ?? 'failures',
    redactQueryKeys: input.redactQueryKeys ?? ['token', 'code'],
  };
}
\`\`\`

The run identifier validation is operational, not cosmetic. It will become part of a filesystem path. Restricting it prevents accidental nesting and keeps artifact discovery predictable. If the service accepts URLs, commands, or credentials, validate their shape without writing secret values into errors.

Document what happens when an option is absent. A plugin that silently chooses the current working directory may scatter artifacts across packages. A plugin that silently disables capture may make a passing setup look healthy. Defaults should be safe, visible, and unsurprising.

## Implement the Launcher as a Run Coordinator

The launcher prepares the run-level directory and produces a final manifest. It must not assume that worker memory is accessible. Our workers will write one JSON Lines file each, and the launcher will inventory those files after the workers stop.

Use \`SevereServiceError\` only when continuing would make the run invalid. WebdriverIO documents that ordinary errors thrown in service hooks are logged while the runner continues, while \`SevereServiceError\` can stop the runner for critical setup or teardown failures. An unwritable required artifact directory is critical for a compliance-oriented diagnostics run, but an optional summary upload may not be.

\`\`\`ts
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SevereServiceError } from 'webdriverio';
import { normalizeOptions, type DiagnosticsServiceOptions } from './options.js';

export default class DiagnosticsLauncherService {
  private readonly options;

  constructor(serviceOptions: DiagnosticsServiceOptions) {
    this.options = normalizeOptions(serviceOptions);
  }

  async onPrepare(): Promise<void> {
    try {
      await mkdir(this.runDirectory(), { recursive: true });
    } catch (error) {
      throw new SevereServiceError(
        \`Cannot create diagnostics directory: \${String(error)}\`,
      );
    }
  }

  async onComplete(exitCode: number): Promise<void> {
    const entries = await readdir(this.runDirectory());
    const workerFiles = entries.filter(name => name.endsWith('.jsonl')).sort();
    const manifest = {
      runId: this.options.runId,
      exitCode,
      workerFiles,
      completedAt: new Date().toISOString(),
    };
    await writeFile(
      join(this.runDirectory(), 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    );
  }

  private runDirectory(): string {
    return resolve(this.options.outputDir, this.options.runId);
  }
}
\`\`\`

No cleanup occurs in \`onPrepare\`. Deleting an output directory based on user-supplied configuration would be unnecessarily destructive and could erase evidence from another job. Give every run a unique identifier and let the CI retention policy remove old artifacts.

If the launcher starts a subprocess or server, save its handle in launcher-local state and stop it in \`onComplete\`. Add a readiness check rather than sleeping a fixed number of seconds. Make startup idempotent where possible so a local rerun can detect and report a port collision cleanly.

## Implement the Worker Around Per-Worker Files

The worker service receives service options, capabilities, and runner configuration in its constructor. The browser object is passed to its \`before\` hook. Store that reference there, as WebdriverIO's custom-service documentation recommends.

Each worker needs a collision-free filename. The capabilities object is not a guaranteed unique identity, and sanitized test names can collide. The configuration exposes the worker context to the runner, but rather than depending on undocumented properties, our example generates a process-specific file using \`process.pid\` and a random UUID. File creation uses append mode so each event becomes one JSON line.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Capabilities } from '@wdio/types';
import { normalizeOptions, type DiagnosticsServiceOptions } from './options.js';

type TestLike = { title?: string; parent?: string };
type ResultLike = { passed?: boolean; error?: unknown };

export default class DiagnosticsWorkerService {
  private readonly options;
  private readonly capabilities: Capabilities.RemoteCapability;
  private readonly workerFile: string;
  private browser?: WebdriverIO.Browser;

  constructor(
    serviceOptions: DiagnosticsServiceOptions,
    capabilities: Capabilities.RemoteCapability,
  ) {
    this.options = normalizeOptions(serviceOptions);
    this.capabilities = capabilities;
    this.workerFile = \`worker-\${process.pid}-\${randomUUID()}.jsonl\`;
  }

  async before(
    _config: WebdriverIO.Config,
    _capabilities: Capabilities.RemoteCapability,
    browser: WebdriverIO.Browser,
  ): Promise<void> {
    this.browser = browser;
    await mkdir(this.runDirectory(), { recursive: true });
  }

  async afterTest(test: TestLike, _context: unknown, result: ResultLike) {
    if (result.passed !== false) return;

    const eventId = randomUUID();
    const screenshot = await this.captureScreenshot(eventId);
    const event = {
      eventId,
      title: [test.parent, test.title].filter(Boolean).join(' > '),
      browserName: this.capabilities.browserName ?? 'unknown',
      url: await this.safeUrl(),
      screenshot,
      failedAt: new Date().toISOString(),
    };

    await appendFile(
      join(this.runDirectory(), this.workerFile),
      JSON.stringify(event) + '\\n',
      'utf8',
    );
  }

  private runDirectory(): string {
    return resolve(this.options.outputDir, this.options.runId);
  }

  private async safeUrl(): Promise<string | undefined> {
    if (!this.browser) return undefined;
    try {
      const current = new URL(await this.browser.getUrl());
      for (const key of this.options.redactQueryKeys) {
        if (current.searchParams.has(key)) current.searchParams.set(key, 'REDACTED');
      }
      return current.toString();
    } catch {
      return undefined;
    }
  }

  private async captureScreenshot(eventId: string): Promise<string | undefined> {
    if (!this.browser || this.options.screenshots === 'never') return undefined;
    const filename = \`failure-\${eventId}.png\`;
    await this.browser.saveScreenshot(join(this.runDirectory(), filename));
    return filename;
  }
}
\`\`\`

This implementation catches URL retrieval failure because diagnostics should still record the test. It does not catch a screenshot write failure. Whether that is correct depends on the service contract. For mandatory evidence, let the hook fail loudly. For best-effort evidence, catch the error and add a \`captureError\` field to the JSON event. Never swallow it without a trace.

## Export the Package in the Shape WebdriverIO Expects

A published service exposes the worker service as its default export and the launcher class as a named \`launcher\` export. Keep the entry file boring. Consumers should not need to know your internal folder structure.

\`\`\`ts
import DiagnosticsLauncherService from './launcher.js';
import DiagnosticsWorkerService from './service.js';

export default DiagnosticsWorkerService;
export const launcher = DiagnosticsLauncherService;
export type { DiagnosticsServiceOptions } from './options.js';
\`\`\`

For a local imported service, WebdriverIO configuration accepts the imported service class with its options as a tuple. It can also accept an absolute service path. A published service conventionally uses a package name matching \`wdio-*-service\`, with the documented \`wdio-plugin\` and \`wdio-service\` npm keywords to improve discovery.

Package format is a separate concern from WebdriverIO hooks. Decide whether the package emits ESM, CommonJS, or both according to consumer requirements. Test the built artifact, not only TypeScript source loaded by a development runner. Broken export maps and missing declaration files often escape source-level tests.

## Register the Service With Typed Configuration

Import the service class for a repository-local plugin and pass options next to it. This makes configuration explicit and avoids name-resolution ambiguity during development.

\`\`\`ts
import DiagnosticsService from './tools/wdio-diagnostics/service.js';

export const config: WebdriverIO.Config = {
  runner: 'local',
  framework: 'mocha',
  specs: ['./test/specs/**/*.ts'],
  services: [
    [DiagnosticsService, {
      outputDir: './artifacts/wdio',
      runId: process.env.CI_RUN_ID ?? 'local-run',
      screenshots: 'failures',
      redactQueryKeys: ['token', 'code', 'session'],
    }],
  ],
  capabilities: [{ browserName: 'chrome' }],
};
\`\`\`

WebdriverIO can execute TypeScript when the documented setup is present, but its current TypeScript guidance notes that transpilation through \`tsx\` does not perform type checking. Run \`tsc\` separately in CI. That distinction matters for services because an incorrect hook parameter can compile during execution yet fail a static contract check.

If a service adds custom browser commands, also ship type augmentation and ensure consumers include the relevant declarations. Our example deliberately uses existing browser commands and needs no namespace extension.

## Make Hook Semantics Framework-Aware

Mocha and Jasmine expose per-test hooks such as \`beforeTest\` and \`afterTest\`. Cucumber uses scenario-oriented hooks such as \`beforeScenario\` and \`afterScenario\`. A service promising framework-neutral capture must either implement both shapes or clearly restrict supported frameworks.

| Desired behavior | Mocha or Jasmine boundary | Cucumber boundary |
|---|---|---|
| Reset before an example | \`beforeTest\` | \`beforeScenario\` |
| Capture failed example | \`afterTest\` | \`afterScenario\` |
| Configure browser once per worker | \`before\` | \`before\` |
| Flush worker resources | \`after\` | \`after\` |

Do not route two hook shapes into the same function until their result models are normalized. Framework adapters may represent errors, retry data, titles, and hierarchy differently. Create an internal event type, then write a small adapter for each supported framework. Test those adapters with representative objects.

Hook timing also matters. Capturing a screenshot after another hook has navigated away or cleared storage produces misleading evidence. Document service order when multiple services use the same phase, and keep destructive cleanup later than evidence capture. If order is business-critical, verify it through an integration fixture rather than assuming configuration array order covers every asynchronous interaction.

## Treat Parallel Workers as Independent Programs

WebdriverIO's local runner executes test files in isolated worker processes per capability. A custom service must therefore assume concurrent writes, duplicated initialization attempts, and out-of-order completion. A run-level singleton in a module is only a singleton inside one process.

The JSON Lines design avoids a shared read-modify-write cycle. Every worker appends only to its own file, while the launcher reads completed files after workers finish. A single shared JSON array would create lost updates: two workers could read the same content, each append, and one overwrite the other.

For infrastructure leasing, use an external atomic mechanism. A database row, queue, lock service, or WebdriverIO's documented shared-store service may be appropriate. A plain local file lock becomes unreliable when workers run on different machines or containers.

Never put browser objects, functions, or open sockets into data intended for cross-process exchange. Exchange stable identifiers and serializable records. The receiving process can resolve the identifier to its own resource if necessary.

## Test Plugin Logic Without Launching a Browser for Every Case

Most service behavior can be unit-tested with a small fake browser. Validate option normalization, redaction, filename isolation, result mapping, and error policy quickly. Then add one real WebdriverIO fixture project to prove registration, hook invocation, and artifact creation.

The unit example below uses Vitest and a temporary directory. It avoids brittle access to private methods by exercising the public lifecycle hooks.

\`\`\`ts
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import DiagnosticsWorkerService from '../src/service.js';

describe('DiagnosticsWorkerService', () => {
  it('redacts sensitive query values in a failure record', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'wdio-service-'));
    const service = new DiagnosticsWorkerService(
      { outputDir, runId: 'run-17', redactQueryKeys: ['token'] },
      { browserName: 'chrome' },
    );
    const browser = {
      getUrl: vi.fn().mockResolvedValue('https://app.test/callback?token=secret'),
      saveScreenshot: vi.fn().mockResolvedValue(undefined),
    } as unknown as WebdriverIO.Browser;

    await service.before({} as WebdriverIO.Config, {}, browser);
    await service.afterTest(
      { parent: 'login', title: 'handles callback' },
      {},
      { passed: false },
    );

    const directory = join(outputDir, 'run-17');
    const names = await import('node:fs/promises').then(fs => fs.readdir(directory));
    const recordName = names.find(name => name.endsWith('.jsonl'))!;
    const record = await readFile(join(directory, recordName), 'utf8');
    expect(record).toContain('token=REDACTED');
    expect(record).not.toContain('secret');
  });
});
\`\`\`

Integration fixtures should contain one passing and one intentionally failing test, run with two workers, and assert the manifest after completion. Keep that fixture outside the plugin unit-test discovery pattern so its intentional failure does not contaminate ordinary tests.

For wider choices about unit and browser runners, consult [the 2026 JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). If the plugin captures screenshots after element failures, encourage consumers to follow [reliable Playwright locator principles](/blog/playwright-best-practices-locators-2026) conceptually, even though WebdriverIO uses its own element APIs. Diagnostics cannot compensate for fundamentally unstable selectors.

## Diagnose the Missing-Artifact Failure Mode

A realistic production failure is an empty final manifest even though several tests failed and screenshots appeared in worker logs. The service passed unit tests, but all worker instances wrote to relative paths resolved from unexpected working directories. The launcher inspected a different directory and found nothing.

Diagnose by logging non-sensitive resolved paths at \`onPrepare\`, worker \`before\`, and \`onComplete\`. Include process IDs and the run identifier. Confirm that all processes see the same mounted filesystem if they run in containers. Check whether CI uploads artifacts before \`onComplete\` finishes. Finally, inspect whether each worker used a unique filename.

The fix is to normalize the artifact root to an absolute path from a documented base, create a unique run directory before workers launch, and use per-worker files. In a distributed runner where workers do not share a filesystem, write events to object storage or an API instead. A local path cannot bridge machines.

Another common failure occurs when screenshot capture throws in \`afterTest\`, preventing the JSON record from being written. Decide whether the record or image is primary. A resilient implementation can record the failure metadata first, attempt the screenshot, then append a second event with capture status. Test both failure branches.

## Choose Between Continuing and Stopping the Run

Service failures need an explicit policy. WebdriverIO's documented behavior logs an ordinary service-hook error while the runner continues. For critical setup or teardown, it exposes \`SevereServiceError\` to stop the runner. Use the severe path sparingly and only when continuing invalidates results.

| Failure | Suggested policy | Reason |
|---|---|---|
| Required proxy cannot start | Stop run | Tests would exercise the wrong network path |
| Optional screenshot fails | Continue and record error | Assertions can still be valid |
| Credential missing for mandatory environment | Stop before workers | Every test would fail misleadingly |
| Summary upload unavailable | Preserve locally, continue | Evidence still exists |
| Redaction cannot be applied | Do not publish unsafe artifact | Data handling outranks convenience |

Teardown deserves the same thought. If stopping a disposable local mock fails after all tests pass, the test result may remain useful, but the process should report an operational warning. If releasing an exclusive leased environment fails, subsequent runs may be blocked, so escalation is appropriate.

Do not catch \`unknown\` errors and log only "service failed." Include the lifecycle phase, run ID, worker identity where relevant, and a sanitized cause. Preserve stack traces in protected CI logs while keeping user-facing output concise.

## Package for Consumers, Not Just the Author Repository

A service package should publish compiled JavaScript, type declarations, a concise README, its supported WebdriverIO range, option documentation, and a minimal configuration example. Use the naming and npm keyword conventions described in WebdriverIO's custom-service documentation if public discovery matters.

Test installation from a packed tarball in a tiny fixture project. This catches files omitted from the package, incorrect entry points, ESM extension mistakes, and type declarations that reference unpublished source. A monorepo workspace can hide all four problems because it resolves files directly.

Security review belongs in the release checklist. Services execute inside test infrastructure and may access browser sessions, environment credentials, files, and network endpoints. Minimize dependencies, pin CI permissions, redact evidence, and avoid executing arbitrary strings as shell commands. If subprocesses are required, use argument arrays and validate inputs.

Version option contracts deliberately. Removing a default, changing an artifact schema, or turning a warning into \`SevereServiceError\` can break pipelines even when TypeScript types remain compatible. Publish migration notes that explain behavioral changes.

## What Plugin Authors Commonly Misunderstand

The first misconception is that launcher and worker classes share module state. They run in different processes. A passing in-process unit test does not alter that architecture.

The second is that every hook failure stops the suite. WebdriverIO specifically provides a severe error type for critical cases because ordinary hook errors are logged while execution continues. Choose intentionally.

The third is that a service should become a miscellaneous utilities package. Lifecycle integration and user-invoked helper logic have different responsibilities. Keep pure utilities separately importable and make the service a narrow adapter around them.

The fourth is that screenshots equal diagnostics. A screenshot without test identity, capability, URL, timestamp, and capture status is difficult to correlate in a parallel run. Metadata is the index; binary artifacts are attachments.

The fifth is testing only the TypeScript source. Consumers execute the package output. Pack, install, type-check, and run the emitted module in a fixture before publishing.

## A Maintenance Contract for the Service

Every custom service needs an owner and observable outcomes. Track capture success rate, hook overhead, artifact volume, upload failures, and plugin-caused run aborts. A diagnostics service that adds 15 seconds after every test will quietly become a suite bottleneck.

Keep hook work bounded. Avoid network calls in high-frequency hooks when events can be buffered per worker and flushed in \`after\`. Put timeouts and retry limits around external dependencies, but do not invent retry behavior for non-idempotent operations. Flush buffers on normal completion and preserve partial files after abnormal exits where possible.

Use a compatibility fixture when upgrading WebdriverIO, Node.js, TypeScript, or a supported test framework. It should prove launcher preparation, multiple worker files, framework-specific failure mapping, redaction, final manifest generation, and the selected severe-error behavior.

A successful WebdriverIO service custom plugin disappears into the testing workflow. It performs one infrastructural job consistently, leaves enough evidence when that job fails, and never asks test authors to understand process topology merely to write a product assertion.

## Frequently Asked Questions

### Does a custom WebdriverIO service run once or once per worker?

It depends on the exported role. The launcher service coordinates the overall run through launcher-only hooks such as \`onPrepare\` and \`onComplete\`. The worker service is instantiated in each worker process and uses hooks such as \`before\`, per-test or per-scenario hooks, and \`after\`. Treat their memory as isolated. If both roles need the same identifier, put it in explicit configuration or a durable external record rather than assigning a global variable in the launcher.

### Should a service add custom commands to the browser object?

Only when the command represents browser behavior that consumers should invoke explicitly and consistently. Lifecycle work belongs in hooks, while reusable pure transformations usually belong in ordinary modules. If the service adds a browser command, provide TypeScript interface augmentation and test the command against a real session. Avoid turning every helper into a global browser method, because global APIs obscure dependencies, complicate discovery, and can collide with commands added by other services.

### How can worker services safely contribute to one final report?

Give each worker an independent output channel, such as a unique JSON Lines file or an external append-only API, then let the launcher aggregate after workers finish. Do not let several workers repeatedly read and overwrite one JSON array. On one shared filesystem, unique filenames are simple and robust. Across containers or machines without a common mount, use durable remote storage. Include run and worker identifiers on every record so late or duplicated events can be detected.

### When should a plugin throw SevereServiceError?

Use it when WebdriverIO must stop because continuing would produce invalid or dangerously incomplete results. Examples include a mandatory proxy failing to start, required credentials being unavailable, or a redaction guarantee failing before sensitive artifacts are published. An optional screenshot or summary upload usually deserves a recorded warning and continued execution. Define the policy in the service contract, test both ordinary and severe failures, and include a sanitized cause so CI users know which prerequisite failed.
`,
};
