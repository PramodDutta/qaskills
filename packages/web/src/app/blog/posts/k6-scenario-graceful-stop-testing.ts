import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 scenario graceful stop testing',
  description:
    'k6 scenario graceful stop testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Performance Testing',
  primaryKeyword: 'k6 scenario graceful stop testing',
  keywords: [
    'k6 scenario graceful stop testing',
    'k6 gracefulStop behavior',
    'gracefulRampDown test',
    'in-flight iteration completion',
    'k6 scenario shutdown timing',
    'load test interrupted iterations',
  ],
  relatedSlugs: [
    'k6-load-testing-guide-2026',
    'k6-load-testing-p95-p99-guide',
    'k6-thresholds-checks-complete-guide',
    'k6-browser-module-testing-guide',
  ],
  sources: [
    'https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/',
    'https://grafana.com/docs/k6/latest/using-k6/thresholds/',
    'https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/',
    'https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/graceful-stop/',
  ],
  repoEvidence: [
    'seed-skills/k6-performance/SKILL.md',
    'seed-skills/performance-test-scenario-generator/SKILL.md',
  ],
  content: `k6 scenario graceful stop testing checks whether work that is still in flight can end within a set grace time. It counts each start and finish, keeps slow and dropped work in view, and saves the final report. A separate case records what happens when the test process gets a stop signal.

## What does k6 scenario graceful stop testing verify?

The contract is not simply that a command ran longer than its scenario duration. It must show which iterations started, which completed, which were interrupted, whether scheduled work was dropped, how long shutdown took, and whether performance thresholds still passed.

- The official [k6 graceful stop documentation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/graceful-stop/) defines \`gracefulStop\` as time after a scenario ends when k6 lets in-progress iterations finish before forceful interruption.

- That page says the option is available for all executors and documents a default of 30 seconds. A test should still set the value explicitly so a reader can understand the expected boundary.

- The related \`gracefulRampDown\` option belongs to the ramping-vus executor. It gives virtual users time to finish when a lower stage target requires some active VUs to stop.

- An iteration that finishes inside the relevant window should increment completion evidence. An iteration that exceeds it should remain visible as started but incomplete, with k6 output reporting interrupted work.

- Dropped work is different from interrupted work. The [dropped iterations documentation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/) defines \`dropped_iterations\` as scheduled iterations that could not start.

- Grace time must not turn an overloaded system into a passing result. Duration metrics, failed checks, dropped iterations, and explicit thresholds still decide whether service behavior met its acceptance policy.

- seed-skills/k6-performance/SKILL.md supplies staged and scenario configurations, a ramping-vus example with \`gracefulRampDown\`, checks, thresholds, result files, and lifecycle cleanup guidance.

- seed-skills/performance-test-scenario-generator/SKILL.md adds realistic scenario design, controlled load profiles, scenario thresholds, custom summaries, and single-VU debugging. This article narrows those patterns to shutdown semantics.

The [k6 load testing guide](/blog/k6-load-testing-guide-2026) covers broader script design. This page owns completion around grace boundaries, interrupted evidence, and the release decision when shutdown changes measured work.

## How do you build a k6 gracefulStop behavior?

Build a local endpoint with a controlled delay and no external variability. Start with one virtual user, one scenario, one request per iteration, and a fixed iteration tail. Use three values: clearly shorter than the grace window, near its boundary, and clearly longer.

Set scenario duration and grace explicitly. Keep the base duration long enough for at least one full iteration to start, but short enough for the test to remain fast. Do not use random delays in this contract fixture.

Record custom counters at the first and last line of each iteration. A difference between started and completed counts indicates work that entered the function but did not reach its terminal marker. Keep built-in iteration and output evidence beside those custom counters.

- The positive case uses an iteration that finishes before the scenario duration or inside its grace window. It must show one or more completed iterations, no unexplained started-only records, the expected total wall-time band, a written summary, and passing thresholds.

- This script adapts scenario, threshold, metric, and result patterns from seed-skills/k6-performance/SKILL.md. Environment values are controlled fixture inputs, not production tuning defaults.

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const started = new Counter('fixture_iterations_started');
const completed = new Counter('fixture_iterations_completed');

const iterationSeconds = Number(__ENV.ITERATION_SECONDS || '2');
const scenarioDuration = __ENV.SCENARIO_DURATION || '3s';
const gracefulStop = __ENV.GRACEFUL_STOP || '2s';

export const options = {
  discardResponseBodies: true,
  scenarios: {
    graceful_fixture: {
      executor: 'constant-vus',
      vus: 1,
      duration: scenarioDuration,
      gracefulStop,
      exec: 'gracefulFixture',
    },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    dropped_iterations: ['count==0'],
  },
};

export function gracefulFixture() {
  started.add(1);
  const response = http.get(\`\${__ENV.BASE_URL}/controlled-delay\`);
  check(response, { 'fixture response is 200': (result) => result.status === 200 });
  sleep(iterationSeconds);
  completed.add(1);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify({
      iterations: data.metrics.iterations?.values?.count ?? 0,
      started: data.metrics.fixture_iterations_started?.values?.count ?? 0,
      completed: data.metrics.fixture_iterations_completed?.values?.count ?? 0,
      dropped: data.metrics.dropped_iterations?.values?.count ?? 0,
    }),
    [__ENV.SUMMARY_PATH || 'graceful-summary.json']: JSON.stringify(data),
  };
}
\`\`\`

The completion counter increments only after the controlled tail. An interruption can prevent that line from running. The end summary then links built-in metrics with the custom started and completed counts for diagnosis.

- The official [custom summary reference](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/) says k6 calls \`handleSummary()\` at the end of the lifecycle and allows output to stdout, stderr, or files. Treat a missing file as a failed evidence path, especially in termination cases.

- Use the [k6 percentile guide](/blog/k6-load-testing-p95-p99-guide) for latency analysis. The grace fixture should keep its service delay controlled so shutdown behavior remains the variable under test.

## What breaks gracefulRampDown test?

A gracefulRampDown test breaks when a long grace window hides slow service behavior. More time can let iterations finish, but those late responses still belong in duration metrics and threshold decisions. Completion is not the same as acceptable performance.

- External process termination is a separate boundary. Scenario grace settings describe scenario shutdown, while a CI runner, container stop, or forceful signal can end the process under different rules. Record signal, command status, summary presence, and partial output instead of assuming every signal honors the full window.

- Mixed executors can confuse ownership. \`gracefulStop\` applies across executors, while \`gracefulRampDown\` specifically affects ramping virtual users. Tag each scenario and assert metrics per scenario when several executors share one process.

- Sleep-based timing assumptions can become flaky on busy runners. Use iteration durations with generous separation from the boundary, then reserve a narrow exact-boundary case for compatibility observation rather than the main release gate.

- Missing end summaries erase the easiest comparison between started, completed, dropped, interrupted, and thresholds. The harness should predeclare a unique summary path, remove any stale file, and fail if the current process does not create valid JSON.

- Threshold omission is another defect. A script may report interrupted work yet exit successfully because no acceptance rule rejects it. Define explicit thresholds for checks, request failures, dropped work, and any project-owned completion metric that should block release.

- Do not infer interrupted work from dropped iterations. Dropped iterations never started; interrupted iterations started but did not finish. A capacity problem can produce either or both depending on executor and timing.

- The repository's k6 skill says every test needs upfront pass criteria and saved results. The scenario generator says thresholds without realistic scenarios can mislead. Both support preserving overload evidence through shutdown.

Review the [k6 thresholds guide](/blog/k6-thresholds-checks-complete-guide) for a broader gate design. Keep this regression focused on shutdown windows and work accounting.

## in-flight iteration completion fixtures and controls

In-flight iteration completion needs cases on both sides of each grace boundary. Use the same endpoint, one virtual user, fixed response, fixed scenario, pinned k6 version, and unique summary path. Change only iteration tail or grace duration.

- The early-completion control ends an iteration well before \`gracefulStop\`. Started and completed counts must agree, and no interruption text should appear.

- The inside-window control crosses scenario duration but finishes comfortably before grace expires. Total process time may extend, and the completed counter must still include that iteration.

- The over-window control runs beyond duration plus grace. Started count must exceed completed count, output must expose interruption, and CI policy must classify the case as expected fault evidence.

- The ramp-down control uses ramping-vus with a lower stage target. One variant completes inside \`gracefulRampDown\`, while another deliberately exceeds it.

- The dropped-work control uses an arrival-rate executor with insufficient free VUs. It proves \`dropped_iterations\` is reported separately from started-only work.

- The threshold control keeps grace large enough for completion while making the service response exceed a duration limit. The run must still fail its performance acceptance policy.

- The repeated-run control executes each row in a fresh process and result directory. Counts and classifications should remain stable within documented timing bands.

- The cleanup control stops the local delay server, removes unique temporary files, and proves no k6 child remains. Retain only the current failed summary and safe output when evidence policy requires it.

Choose wide margins for the main matrix. For a two-second grace, an iteration tail near one second is clearly inside and one near four seconds is clearly outside. A value at exactly two seconds is sensitive to scheduler and request overhead.

Use the [k6 browser guide](/blog/k6-browser-module-testing-guide) for browser-specific lifecycle work. Do not add browser startup to this timing fixture because it introduces a large uncontrolled setup cost.

## How should k6 scenario shutdown timing be asserted?

- k6 scenario shutdown timing should use exact counts, ordering relationships, bounded wall time, and state transitions together. The harness starts its timer immediately before spawning k6 and stops after the child closes, while the summary supplies scenario metrics.

- Exact equality works for configured duration text, grace text, fixture version, expected scenario count, zero dropped work in closed-model cases, and current summary run ID. It also works for completed count in a fully controlled short iteration case.

A partial-order assertion fits wall time. The child should not close before the base duration when the scenario ran, and an inside-grace case should close before a generous duration-plus-grace upper bound. Allow startup and teardown margins explicitly.

- A state-transition assertion tracks no process, running process, scenario ending, summary written, and child closed. External termination adds signal sent and signal observed. A stale summary must never satisfy the current transition.

- Interrupted evidence needs agreement between started and completed counters, built-in iteration count, console summary, and child status. If these disagree, report an evidence defect rather than guessing which count is correct.

- Threshold results remain independent. The official [k6 threshold documentation](https://grafana.com/docs/k6/latest/using-k6/thresholds/) says a passed threshold run exits zero, while any failed threshold produces a nonzero exit code. Preserve that status through wrappers.

- Compatibility assertions should pin k6, operating system, runner, executor, scenario options, and signal behavior. Recheck them when the runtime image changes, because scheduling and process-signal delivery are environment-sensitive.

Reject exact millisecond assertions. Network setup, process startup, summary writing, and scheduler delay are not part of the configured grace value. Use broad bands and counts to decide the contract.

- The [performance testing category](/categories/performance-testing) provides related load patterns. Keep shutdown evidence tagged by scenario so a passing fast flow cannot hide an interrupted slow flow.

## load test interrupted iterations in CI

- Load test interrupted iterations should be visible in the job summary, structured artifact, and release result. Record command arguments, k6 version, fixture commit, scenario and grace values, iteration delay, start and end timestamps, code, signal, counters, dropped work, thresholds, summary hash, and cleanup.

- Remove the target summary before spawning k6 and use a run-specific path. If the process closes without a new parseable summary, fail the evidence check even when console output exists. This catches abrupt termination and file permission faults.

- Run local-script cases without cloud dependencies on each relevant pull request. A scheduled environment job can repeat critical rows against production-like infrastructure, but it should not replace deterministic boundary fixtures.

- Separate expected negative cases from the release gate. A test that deliberately exceeds grace passes only when the harness observes the expected interrupted classification. The production scenario should fail if interrupted work exceeds its approved policy.

Preserve threshold exit status. Do not pipe k6 through a reporting command that returns zero or use a wrapper that ignores the child code. Test that wrapper with one intentional failed threshold before accepting it.

- If CI sends a termination signal because the outer job timeout is too short, classify it as harness or infrastructure failure. Keep outer timeout longer than scenario duration, grace, summary writing, and cleanup, with a clear reserve.

- seed-skills/performance-test-scenario-generator/SKILL.md demonstrates custom summary output and threshold reporting. seed-skills/k6-performance/SKILL.md recommends saved files, explicit thresholds, smoke tests first, and lifecycle cleanup. These repository facts support this job design.

- Open the [QA skills directory](/skills) for k6 and performance patterns. Keep evidence free of credentials and response bodies because this fixture needs only timing and count metadata.

## k6 scenario graceful stop testing comparison matrix

- The matrix separates normal scenario completion, forced interruption, ramp-down behavior, and external termination. Each row controls iteration length around one window and keeps overload evidence visible. Exact signal outcomes remain runner-specific and must be recorded.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Iteration finishes before gracefulStop | One VU and tail clearly inside grace | Started and completed counts agree with summary | Work finishes but completion evidence is absent | seed-skills/k6-performance/SKILL.md |
| Iteration exceeds gracefulStop | Same scenario with tail beyond grace | Started-only work and interruption appear | Run reports all started work complete | [k6 graceful stop](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/graceful-stop/) |
| Ramping VUs complete inside gracefulRampDown | Ramping-vus and short active iteration | Retiring VUs finish before forced interruption | Completion is lost inside the window | seed-skills/performance-test-scenario-generator/SKILL.md |
| Ramping VUs exceed gracefulRampDown | Same stages with a long active iteration | Interrupted work stays visible beside metrics | Long grace hides overload or missing work | [Dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/) |
| Process receives an external termination signal | Harness sends a documented signal mid-iteration | Signal, code, partial output, and summary presence are classified | Job assumes scenario grace without evidence | [Custom summary](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/) |

The first two rows establish the all-executor grace behavior. The next two isolate the special ramp-down option. The final row does not promise one portable signal result; it requires the harness to record and gate what its supported runner actually does.

- Add threshold status to every row, including expected negative cases. A completed slow iteration can fail duration policy, while a deliberately interrupted fixture can satisfy its harness assertion yet remain unsuitable as a production load result.

- Track dropped work in every scenario, but interpret it by executor. Arrival-rate saturation can create dropped iterations before shutdown, while a closed-model fixture may keep that metric at zero and still interrupt active work.

- Use the [blog index](/blog) for broader result analysis. This table remains a small compatibility suite for scenario termination.

## How do you implement k6 scenario graceful stop testing?

- Implement a Node harness that owns the delay server, k6 child, summary path, outer timeout, signal, and cleanup. Parameterize one row at a time, remove stale evidence, spawn arguments directly, capture streams, await close, parse summary, and evaluate counts before deleting temporary state.

- The following JavaScript example checks an inside-grace row and preserves threshold status. It adapts the command and result guidance in seed-skills/performance-test-scenario-generator/SKILL.md.

\`\`\`javascript
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

async function runGraceCase({ script, summaryPath, iterationSeconds, grace }) {
  await rm(summaryPath, { force: true });
  const startedAt = performance.now();
  const child = spawn(
    'k6',
    ['run', '-e', 'SCENARIO_DURATION=3s', '-e', \`GRACEFUL_STOP=\${grace}\`,
      '-e', \`ITERATION_SECONDS=\${iterationSeconds}\`, '-e',
      \`SUMMARY_PATH=\${summaryPath}\`, script],
    { env: { ...process.env, BASE_URL: process.env.FIXTURE_BASE_URL } },
  );

  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
  const result = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({ code, signal, elapsedMs: performance.now() - startedAt });
    });
  });

  const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
  return { ...result, stderr, summary };
}

const result = await runGraceCase({
  script: 'graceful-fixture.js',
  summaryPath: '.results/inside-grace.json',
  iterationSeconds: 1,
  grace: '2s',
});

assert.equal(result.signal, null);
assert.equal(result.code, 0);
assert.equal(result.summary.metrics.dropped_iterations.values.count, 0);
assert.equal(
  result.summary.metrics.fixture_iterations_started.values.count,
  result.summary.metrics.fixture_iterations_completed.values.count,
);
\`\`\`

A production harness also needs an outer timer that first sends the supported gentle signal, records it, then escalates only after a cleanup reserve. Terminate only the child it owns and always stop the local fixture server.

Follow this procedure for the complete matrix:

1. Read seed-skills/k6-performance/SKILL.md and seed-skills/performance-test-scenario-generator/SKILL.md, then define scenario, threshold, summary, timing, process, and cleanup responsibilities.
2. Create a local controlled-delay endpoint and one-VU scripts with iteration tails clearly shorter than, inside, equal to, and longer than each grace window.
3. Run the positive short case, capture started and completed counters, built-in iterations, dropped work, thresholds, wall time, child status, and a current summary file.
4. Inject over-window work, ramp-down boundaries, failed thresholds, insufficient arrival VUs, missing summaries, wrapper status masking, and external termination one at a time.
5. Compare each result with the five-row matrix and report the first mismatch among counts, interruption, drops, timing band, threshold state, signal, or summary transition.
6. Run deterministic rows in CI, retain safe versioned evidence, preserve child status, stop the local server and owned processes, remove stale files, and fail unexpected interruption.

Repeat the short positive row after every negative set. Its counts should agree and its summary must be new. This catches a delayed server left in the wrong mode, a child still running, or a path that reused stale output.

- Keep exact-boundary results informational until the supported runner shows stable behavior. Release gates should use cases with enough separation to identify real option regressions rather than scheduler noise.

- The [k6 thresholds guide](/blog/k6-thresholds-checks-complete-guide) can extend the production policy. Preserve this shutdown matrix as a prerequisite when executor or grace settings change.

## Frequently Asked Questions

### How should k6 gracefulStop and gracefulRampDown be tested so in-flight iterations finish without hiding overload?

- Use fixed iteration lengths clearly inside and outside each configured window, then compare started and completed counters, built-in iterations, interruption output, dropped work, wall time, summaries, thresholds, and process status. Keep duration limits active so a late completion cannot convert slow service behavior into an acceptable result.

### What should a k6 gracefulStop behavior fixture record?

- Record k6 version, script hash, executor, scenario duration, grace values, iteration delay, VUs, started and completed counts, built-in iterations, dropped iterations, checks, thresholds, wall-time band, child code, signal, summary hash, fixture server state, and cleanup. Avoid response bodies and credentials.

### Which failure proves gracefulRampDown test is broken?

- A controlled ramping-vus iteration that should finish well inside the window but remains started-only is strong failure evidence. The reverse also matters: an iteration clearly beyond the window must not appear fully completed. Preserve stage, VU, timing, interruption, and threshold evidence before assigning runner or application ownership.

### How do teams isolate in-flight iteration completion?

- Start with one VU, a local delay endpoint, fixed response, fixed iteration tail, pinned k6, unique summary path, and no cloud output. Change only duration or grace. Count entry and terminal markers, repeat in fresh processes, then add ramping VUs after the all-executor baseline behaves consistently.

### Which assertion is strongest for k6 scenario shutdown timing?

- Combine counter relationships, built-in metrics, interruption text, a generous duration-plus-grace wall-time band, current summary creation, threshold state, and child status. Exact milliseconds are too brittle. A completion count alone misses dropped work, while wall time alone cannot tell whether an eligible iteration actually finished.

### How should CI report load test interrupted iterations failures?

- CI should report scenario, executor, duration, grace, controlled delay, started, completed, built-in and dropped counts, threshold outcomes, elapsed band, child code, signal, summary status, k6 version, and cleanup. It should distinguish expected fault rows from production interruption and preserve nonzero threshold or evidence failures.

## Conclusion

k6 scenario graceful stop testing gives the team a clear view of work near the end of a run. Started, done, cut short, and never-started work must stay in separate counts.
This keeps k6 scenario graceful stop testing tied to visible work.

Begin with one VU and a local delay site. Use one task that ends well within grace and one that runs well past it, so small clock shifts cannot change the case.

Next, test a VU ramp down with the same two task lengths. Keep its counts apart from the all-executor stop case, since the two options act at different points.

Add a rate case that cannot start all due work. The dropped count must not be used as the count for work that began and was later cut short.

Keep time limits and checks on each row. A task that gets more time to end can still be too slow, return an error, or break the agreed load goal.

Run one case with a known bad limit and check the process code. This proves the CI shell will not turn a failed k6 gate into a pass.

Then send the supported stop signal from the test harness. Save the signal, code, last output, and report state, since a hard stop may not leave the same files as a normal end.

Run the short good case once more after cleanup. It must write a new report, show equal start and finish counts, and leave no child process behind.

Review the [k6 load testing guide](/blog/k6-load-testing-guide-2026), then open the [QA skills directory](/skills). Use the k6 scenario graceful stop testing matrix in the next test run.`,
};
