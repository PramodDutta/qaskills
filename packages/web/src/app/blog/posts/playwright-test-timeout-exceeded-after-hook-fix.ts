import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright “Test Timeout Exceeded” in afterEach Hook Fix',
  description:
    'Fix Playwright Test Timeout Exceeded errors in afterEach by separating teardown budgets, removing blocked waits, and preserving failure evidence.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright “Test Timeout Exceeded” in afterEach Hook Fix

The assertion has already passed, the browser is still open, and the reporter suddenly blames \`afterEach\`. That sequence feels contradictory until you account for Playwright Test's teardown clock. A completed test body does not mean the worker is finished. Hooks, fixtures, tracing, screenshots, API cleanup, and browser context shutdown still have work to do, and any one of them can consume the separate teardown allowance.

The useful response is not to multiply every timeout. First identify which cleanup operation is waiting, then decide whether that operation belongs in the hook at all. A teardown should release resources and capture bounded diagnostics. It should not quietly become a second end-to-end workflow.

## What the timeout message actually measures

Playwright Test normally gives a test 30 seconds unless configuration changes it. Test execution, fixture setup, and \`beforeEach\` share that test budget. Once the test function finishes, fixture teardown and \`afterEach\` receive a separate allowance whose value is the test timeout. The two periods are related by configuration but are not one continuously depleted stopwatch.

That distinction explains why a 29-second test can still have time to save a trace, and why a 200-millisecond test can fail after another 30 seconds in cleanup. It also prevents a common misdiagnosis: increasing an assertion timeout cannot rescue an \`afterEach\` hook. Assertion, action, navigation, test, hook, and fixture timeouts govern different waits.

| Clock | Typical default | Includes | Does not repair |
| --- | ---: | --- | --- |
| Test timeout | 30,000 ms | Test body, fixture setup, \`beforeEach\` | A hung worker-scoped teardown |
| Teardown allowance | Same value as test timeout | \`afterEach\` and fixture teardown after the body | A cleanup promise that never settles |
| Expect timeout | 5,000 ms | Retrying web-first assertions | Slow uploads or API deletion |
| Action timeout | No separate limit by default | Click, fill, and similar actions when configured | Arbitrary promises in hooks |
| Navigation timeout | No separate limit by default | Navigation operations when configured | Reporter or artifact I/O |

Read the error location and call log together. If the final line says it is waiting for \`locator.click\` inside the hook, investigate the locator. If there is no Playwright call log, suspect application code, a database client, an HTTP client without an abort signal, or file-system pressure. If the timeout appears only on failures, inspect conditional screenshot, video, and log-upload paths.

## Reproduce the slow teardown before changing it

Intermittent cleanup failures become tractable when the hook reports its own phases. Add temporary timing around each awaited operation and use \`testInfo.attach()\` for small diagnostic text. Keep the instrumentation local so parallel workers do not write to the same log file.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.afterEach(async ({ page }, testInfo) => {
  const timings: string[] = [];

  async function measure(name: string, action: () => Promise<void>) {
    const started = performance.now();
    try {
      await action();
    } finally {
      timings.push(\`\${name}: \${Math.round(performance.now() - started)} ms\`);
    }
  }

  await measure('dismiss test data', async () => {
    await page.request.delete(\`/api/test-runs/\${testInfo.testId}\`, {
      timeout: 5_000,
    });
  });

  await testInfo.attach('teardown-timings', {
    body: Buffer.from(timings.join('\\n')),
    contentType: 'text/plain',
  });
});

test('saves a draft', async ({ page }) => {
  await page.goto('/editor');
  await page.getByRole('textbox', { name: 'Title' }).fill('Release note');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();
});
\`\`\`

The five-second request timeout is deliberate. Cleanup is best effort only if the product can tolerate leaked test data, but it still needs a hard bound. If deletion is mandatory for test isolation, fail clearly and fix the service rather than allowing a generic 30-second hook timeout to hide the responsible endpoint.

Run the smallest reproducer with one worker and repetition. A practical command is \`npx playwright test path/to/spec.ts --workers=1 --repeat-each=20\`. One worker removes contention and establishes whether the wait is intrinsic. Then repeat at normal concurrency. A failure that appears only with eight workers points toward shared accounts, rate limits, disk saturation, or a teardown collision.

## Extend only the hook that has earned more time

Some cleanup is legitimately expensive. A regulated workflow may have to export an audit archive after each test. A browser test may intentionally verify that a remote session closes. When the work is necessary and its expected duration is understood, change that hook's timeout through the supplied \`testInfo\` rather than inflating every test in the project.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.afterEach(async ({ request }, testInfo) => {
  testInfo.setTimeout(testInfo.timeout + 20_000);

  const response = await request.post('/api/testing/archive', {
    data: { runId: testInfo.testId },
    timeout: 15_000,
  });

  expect(
    response.ok(),
    \`archive cleanup returned \${response.status()}\`,
  ).toBeTruthy();
});
\`\`\`

Calling \`testInfo.setTimeout(testInfo.timeout + 20_000)\` adds a known increment while retaining a project-level baseline. Putting the call at the top matters. It cannot retroactively save a hook that already exhausted its time. The API also makes intent visible during review: this cleanup gets extra time, and the comment or endpoint should justify why.

Avoid \`test.setTimeout()\` scattered through unrelated tests as a blanket repair. A project timeout can be appropriate for an entire slow class, such as mobile emulation against a remote browser, but it raises the ceiling for test bodies and teardown together. Slow regressions then take longer to surface.

For \`beforeAll\` and \`afterAll\`, the model differs slightly. Each hook has its own timeout, initially equal to the configured test timeout, and can call \`test.setTimeout()\` inside the hook. Do not assume an \`afterAll\` shares a finished test's teardown allowance.

## Remove UI cleanup that fights page shutdown

A fragile hook often tries to log out through the UI. It clicks the avatar, waits for a menu, clicks Sign out, and waits for a navigation. That is product behavior, not resource disposal. It can fail because the preceding test closed the page, navigated cross-origin, left a modal open, or crashed the renderer. It also adds several selector and network dependencies after every assertion has finished.

Prefer fresh browser contexts, storage state, and API-level cleanup. Playwright automatically closes test-scoped pages and contexts. If each test receives isolated server-side data, there may be nothing to log out. When state must be revoked, delete the session using an authenticated request fixture with a bounded request timeout.

| Teardown activity | Better location | Reason |
| --- | --- | --- |
| Verify logout button behavior | A dedicated product test | It is user-visible behavior with assertions |
| Close a test-scoped page | Playwright fixture lifecycle | The runner already owns the page |
| Delete an order created by the test | API fixture teardown | Faster and independent of current DOM state |
| Upload traces to object storage | Reporter or post-job step | Avoids holding the test worker |
| Reset a shared tenant | Worker fixture or disposable tenant | Prevents concurrent tests deleting each other's data |
| Stop a local child process | Fixture with bounded termination | Couples acquisition and release |

If a hook must interact with the page, guard its preconditions. Check \`page.isClosed()\` before an action. Use a short, explicit timeout. Do not wait for an element that is optional. Most importantly, do not suppress every error. A targeted catch for an already-closed page is reasonable; swallowing authentication or cleanup failures can corrupt all later tests in the worker.

## Couple fixtures with the resources they create

The cleanest Playwright teardown is usually a fixture. Acquisition and release appear in one definition, and the runner orders dependencies. A test that asks for \`invoice\` gets the created record; after \`use()\` returns, the fixture deletes exactly that record. This is more reliable than a global hook guessing what each test created.

A fixture teardown shares the same post-test allowance as \`afterEach\`. Moving code into a fixture does not create infinite time. It improves ownership and ordering. Make network deletion bounded, make identifiers unique, and decide what a 404 means. In an idempotent cleanup endpoint, 404 may indicate the test already deleted its record and can be accepted. A 500 should normally be surfaced.

Fixture dependencies also explain unexpected ordering. If fixture \`invoice\` depends on \`account\`, invoice teardown runs before account teardown. An independent \`afterEach\` can run among fixture cleanup according to Playwright's lifecycle, so avoid designs that require undocumented interleaving. Express the dependency in fixtures instead.

Worker-scoped resources deserve special care. Their teardown occurs when the worker process ends and uses worker teardown rules. A leaked Docker container or proxy process should have its own stop deadline plus an emergency kill path. Do not wait forever for graceful shutdown in CI.

## Preserve diagnostics without making failure slower

Failure-only evidence is valuable, but evidence collection frequently causes the timeout it is meant to diagnose. A full-page screenshot can wait on fonts or a huge surface. Zipping a large directory can saturate a shared runner. Sending artifacts to a remote service inherits DNS, TLS, and service latency.

Let Playwright's configured artifacts do most of the work. Trace modes such as \`retain-on-failure\` and \`on-first-retry\` are handled by the runner. Screenshots and video can likewise be configured instead of manually captured in every hook. The [Playwright trace viewer guide](/blog/playwright-trace-viewer-guide-2026) explains how to retain useful evidence without turning each hook into an observability pipeline.

When custom attachments are necessary, attach data already in memory or copy a known small file. Put remote uploading after the test command as a CI artifact step. That keeps a storage outage from transforming every otherwise useful test result into a teardown timeout.

Use \`Promise.all\` only for independent cleanup. Parallel deletion is faster, but concurrent operations against one record can race. \`Promise.allSettled\` is useful when you must attempt several releases and report all failures, yet it still needs bounded operations. It does not time out a stuck promise by itself.

## Distinguish a fix from a timeout disguise

A sound change reduces uncertainty. After making it, the hook should have a documented upper bound and a useful failure message. Compare these approaches before approving a patch.

| Proposed change | What it accomplishes | Review decision |
| --- | --- | --- |
| Add 20 seconds to one archive hook | Accommodates measured 8 to 12 second export | Accept with endpoint timeout |
| Set all tests to five minutes | Delays every deadlock report | Reject |
| Replace UI logout with context isolation | Removes selectors and navigation from cleanup | Prefer |
| Catch and ignore all teardown exceptions | Makes suite green while state leaks | Reject |
| Upload artifacts in CI after Playwright exits | Separates remote storage from worker clock | Prefer |
| Retry delete until it succeeds | May amplify an outage | Require cap, backoff, and idempotency |

Timeout values are operational contracts. Choose them from observed healthy duration plus reasonable variance, not from the longest CI failure seen so far. If healthy deletion completes under a second, a five-second client timeout provides diagnostic room. If it regularly needs 25 seconds, examine the endpoint and test architecture before granting a minute.

The [Playwright test configuration reference](/blog/playwright-test-config-options-complete-reference) is useful when deciding whether a value belongs at project, suite, test, assertion, action, or navigation level. Keeping those scopes distinct is the central discipline in timeout debugging.

## A teardown triage sequence for CI

Start with the first timeout, not the cascade. One stuck cleanup can leave state that breaks later tests. Download the trace and job log, locate the last completed teardown phase, and note whether the failing test body passed. Reproduce that test alone at one worker. Then raise concurrency without changing any timeouts.

Inspect external limits next: API rate limiting, database locks, shared-user sessions, available file descriptors, and disk space. Compare failure-only runs with passing runs because trace or screenshot configuration may be the differentiator. Verify that every HTTP client used in cleanup has a finite timeout. Native \`fetch\` needs an abort signal if you use it directly; Playwright's API request methods accept a timeout option.

Finally, classify the work. Product assertions move into a test. Resource release moves beside acquisition in a fixture. Artifact transport moves to CI. Necessary hook logic gets bounded calls and, only when evidence supports it, a local timeout extension. Rerun with repetition at production worker count and confirm both duration and data isolation.

The goal is not merely a green build. It is a suite in which cleanup failure identifies the resource that could not be released, finishes within a predictable interval, and leaves enough evidence to act.

## Account for retries and worker replacement

A teardown failure participates in Playwright's retry decision. On a retry, the failed test runs in a fresh worker process, which is valuable isolation but can conceal the resource left by the first worker. If the test creates a server-side entity from a fixed name, attempt two may fail during setup because attempt one timed out before deletion. Generate stable traceable IDs that include the retry number where separate records are required, or make creation idempotent when both attempts represent the same logical case.

Use \`testInfo.retry\` in diagnostic names and cleanup logs. Do not use it to skip cleanup on the first attempt. The first attempt is precisely where evidence and release matter. If cleanup cannot complete because the application is already unhealthy, record the resource identifier so a later janitor can remove it.

Worker replacement also terminates worker-scoped fixtures. Verify that their teardown is bounded independently from per-test hooks. A worker fixture should not assume every test-level cleanup succeeded. Its finalizer can detect remaining resources and report them, but it should not spend several minutes repairing a whole environment while the runner waits.

## Review afterEach code as production lifecycle code

Hooks rarely receive the same design scrutiny as test bodies, yet they run more often. Review every awaited call for a deadline, ownership, concurrency safety, and failure semantics. A helper named \`cleanup()\` is not enough. Its implementation should reveal whether it retries, what it deletes, and which status codes are accepted.

Keep hook dependencies explicit. Environment variables, global arrays, and mutable module state behave differently under parallel workers. Prefer values attached to fixtures or \`testInfo\`. Never key cleanup solely by a human-readable test title because parameterized cases can share titles across projects.

Measure the 95th or 99th percentile internally if your organization has enough runs, but do not publish a number without its dataset. For a smaller suite, a simple timing attachment and repeated CI run is sufficient. The engineering question is whether healthy cleanup has a stable bound and whether failures identify the blocked phase.

Before merging, run the repaired spec with the same reporters used in CI. Reporter finalization occurs outside ordinary hook code but competes for the same machine resources, and a large blob report can reveal disk pressure that was absent locally. The final evidence should show a bounded hook, a correct failure classification, and no orphaned test record after retries.

## Frequently Asked Questions

### Does afterEach use whatever time remains from the test body?

No. After the test function finishes, \`afterEach\` and fixture teardown share a separate allowance whose value is normally the configured test timeout. A slow body does not directly consume that second allowance.

### Should I call test.setTimeout or testInfo.setTimeout in afterEach?

Use the hook's \`testInfo.setTimeout()\` when adjusting that specific \`afterEach\` execution. It makes the local budget explicit. Reserve broader \`test.setTimeout()\` changes for tests or suites that genuinely need a different overall timeout.

### Why does teardown time out only when the test fails?

Failure paths often capture screenshots, retain traces, collect logs, or call compensating cleanup that passing paths skip. Instrument those conditional phases and move remote artifact uploads outside the worker.

### Can I make afterEach best effort and ignore its error?

Only when a failed cleanup cannot contaminate later tests or environments. Even then, log a structured warning and bound the operation. Shared-account or shared-database cleanup should normally fail loudly because continuing can produce misleading results.

### Will Promise.all prevent the hook timeout?

It can reduce elapsed time for independent operations, but it provides no deadline. One unresolved promise keeps the aggregate unresolved. Give every network or process operation its own finite timeout.
`,
};
