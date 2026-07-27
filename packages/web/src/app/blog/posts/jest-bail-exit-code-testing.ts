import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest bail exit code testing',
  description:
    'Jest bail exit code testing: use repo fixtures, focused assertions, and CI checks to expose failures and prevent regressions before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Unit Testing',
  primaryKeyword: 'Jest bail exit code testing',
  keywords: [
    'Jest bail exit code testing',
    'Jest bail option behavior',
    'Jest exit code assertion',
    'stop after first failure',
    'Jest CI bail count',
    'partial Jest run reporting',
  ],
  relatedSlugs: [
    'jest-async-await-testing-promises-guide',
    'jest-module-isolation-resetmodules-guide',
    'jest-did-not-exit-one-second-after-test-run-fix',
    'jest-open-handles-flaky-tests-guide',
  ],
  sources: ['https://jestjs.io/docs/cli', 'https://jestjs.io/docs/configuration'],
  repoEvidence: [
    'seed-skills/jest-unit/SKILL.md',
    'seed-skills/test-isolation-strategies/SKILL.md',
  ],
  content: `Jest bail exit code testing checks that Jest stops at the chosen count of failed suites and still returns a bad process code. QA runs small fixed files, saves the first failure and JSON report, and checks which files ran. Serial and worker runs use separate rules.

## What does Jest bail exit code testing verify?

- The contract has three independent parts: threshold behavior, failure visibility, and process status. A useful test proves all three because a wrapper can preserve console text while returning zero, or return failure while losing the suite and test details needed for diagnosis.

- The official [Jest CLI options](https://jestjs.io/docs/cli) define \`--bail[=<n>]\` as exiting after a configured number of failing test suites. When the flag has no number, its documented value defaults to one.

- The official [Jest configuration reference](https://jestjs.io/docs/configuration) gives the config option a default of zero. Setting \`bail: true\` is equivalent to setting one, while a number sets the failed-suite threshold.

- The unit counted by bail is a failed suite, not every failed assertion inside one file. Build fixtures with one intentional failure per file so the observed threshold stays easy to interpret.

- A serial run can give deterministic scheduling evidence. The CLI documents \`--runInBand\` as running tests serially in the current process rather than using a worker pool.

- A worker run needs a looser oracle because suites already assigned to workers may finish near the triggering failure. Assert the threshold, nonzero status, and internally consistent partial report rather than one universal completed-file count.

- Bail and force-exit behavior are different concerns. Bail decides when failure scheduling stops, while force-exit concerns process termination after tests; do not use one option to test the other.

- seed-skills/jest-unit/SKILL.md documents isolated unit tests, command-line execution, coverage reports, clear mocks, and behavior-focused assertions. It does not specify bail semantics, so official Jest documentation owns those claims.

- seed-skills/test-isolation-strategies/SKILL.md requires independent setup, cleanup, and no shared mutable state. Those rules support deterministic fixture files under serial and worker execution.

The [Jest async testing guide](/blog/jest-async-await-testing-promises-guide) covers promise and timer behavior inside tests. This page owns the parent process, failed-suite threshold, partial result artifact, and CI status.

## How do you build a Jest bail option behavior?

Create a temporary project with five test files whose names sort clearly: one pass, two intentional failures, and two late passes. Give each file a setup marker and a completion marker written to its own path. Never have several workers append to one file because write order would become another variable.

- Each test file should be independent and fast. Avoid network calls, current time, random data, shared databases, and unresolved handles. A bail harness is testing Jest scheduling and reporting, not application resources.

Run the fixture first with bail disabled and \`--runInBand\`. Both failures and all passing files should appear in the report, and the process must be nonzero. That positive control proves discovery, marker paths, reporter output, and failure capture before early stopping changes the run.

- Then run \`--bail=1 --runInBand\`. Assert one failed suite is present, the triggering failure message is visible, the process is nonzero, and some later files remain without completion markers. Do not assert an undocumented internal test sequencer order unless the fixture explicitly controls it for the pinned version.

This JavaScript harness adapts the command patterns in seed-skills/jest-unit/SKILL.md into a child-process contract. It captures standard streams and parses the JSON output file even when Jest returns failure.

\`\`\`javascript
import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

export async function runJestFixture({
  cwd,
  bail,
  runInBand,
  outputName,
}) {
  const outputFile = join(cwd, outputName);
  const args = [
    'jest',
    '--ci',
    \`--bail=\${bail}\`,
    '--json',
    \`--outputFile=\${outputFile}\`,
    ...(runInBand ? ['--runInBand'] : ['--maxWorkers=2']),
  ];

  await rm(outputFile, { force: true });

  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(cwd, 'node_modules/jest/bin/jest.js'), ...args.slice(1)], {
      cwd,
      env: { ...process.env, CI: 'true', FIXTURE_DIR: join(cwd, '.fixture-state') },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
    child.once('error', reject);
    child.once('close', async (code, signal) => {
      const report = JSON.parse(await readFile(outputFile, 'utf8'));
      resolve({ code, signal, stdout, stderr, report, outputFile });
    });
  });
}
\`\`\`

The harness passes arguments as an array, so shell quoting and pipelines cannot alter status. It removes the prior report first, which prevents a failed write from being mistaken for current evidence. A production version should also use a bounded parent timeout and terminate only its owned child.

Jest documents that \`--json\` sends the JSON result to stdout and other output to stderr, while \`--outputFile\` writes results when JSON mode is active. Capture both streams because reporters and wrappers may use them differently.

- Use the [Jest module isolation guide](/blog/jest-module-isolation-resetmodules-guide) for application module state. Keep the bail fixture limited to small files and markers so module cache behavior cannot dominate the result.

## What breaks Jest exit code assertion?

Jest exit code assertion breaks most often outside Jest. A shell pipeline can return the status of a formatter, tee process, or final command instead of the test process. Spawn the executable directly or configure the shell to preserve pipeline failure.

Another defect conflates bail with \`--forceExit\`. Adding force exit can hide open-handle cleanup problems and changes process teardown, but it does not define the failed-suite threshold. Leave it absent from this fixture and test open handles elsewhere.

- Worker scheduling creates brittle exact-count assertions. When two workers already own files, another suite can finish after the threshold is reached. Record started and completed markers, but accept outcomes allowed by the pinned worker configuration instead of assuming serial order.

Reporter truncation can hide the first failure while the process still fails. Preserve the JSON report, stderr, Jest version, command arguments, and marker manifest. The test should reject a report that has a failed-suite count but no matching failure detail.

Watch mode changes the process contract because it is designed to remain active and rerun tests. Use \`--ci\` for this harness, and reject any command assembled with \`--watch\` or \`--watchAll\`. A CI bail test must reach a terminal close event.

- Stale output files create false evidence. Remove report and marker directories before each child run, use unique paths, and assert output modification belongs to the current run ID. Cleanup should happen even when parsing or assertions fail.

- Test ordering plugins and custom sequencers can also alter which suite triggers bail. Record the effective config and either disable custom ordering or make it an explicit compatibility case. The threshold contract should not promise a particular failed filename under all sequencers.

The [Jest open-handles guide](/blog/jest-open-handles-flaky-tests-guide) covers processes that stay alive after tests finish. Keep that diagnosis separate from the nonzero status and partial report expected here.

## stop after first failure fixtures and controls

Stop after first failure needs controls that expose a missing failure, excess scheduling, masked status, and stale evidence. Each run receives a fresh fixture directory and unique JSON path. Test names should describe expected scheduling rather than depend on shared counters.

- The baseline control disables bail. It expects all five suites to reach terminal report entries, both intentional failures to remain visible, and the process to return nonzero.

- The serial control sets bail to one with run-in-band. It expects one failed suite, nonzero status, trigger details, and at least one discovered later suite without a completion marker.

- The threshold control sets bail to two. It expects both failed suites before stopping, while still accepting passing suites that execute between those failures under the controlled sequence.

- The worker control uses two workers and bail one. It checks that no completed report entry is internally partial, while allowing work already started before the trigger to finish.

- The masked-status control invokes a deliberately faulty wrapper that converts nonzero to zero. The outer contract test must reject the wrapper even if JSON still lists a failed suite.

- The cleanup control removes markers and report files before the next run. It then runs the all-pass fixture and proves no prior failure, suite record, or process status leaked.

- Markers should describe start and completion separately. A started file without completion can be evidence of interruption or abrupt teardown, while a file with no start marker likely remained unscheduled. Compare those records with JSON rather than interpreting either source alone.

- The repository's isolation skill says tests should not depend on order or mutable state. Serial ordering here is a controlled test input for one compatibility case, not a design requirement for ordinary unit tests.

Review the [Jest did-not-exit guide](/blog/jest-did-not-exit-one-second-after-test-run-fix) if cleanup markers complete but the child stays open. That is a teardown failure, not proof that bail ignored its threshold.

## How should Jest CI bail count be asserted?

Jest CI bail count should be asserted from the spawned process, JSON result, stderr, and markers together. Each source answers a different question: release status, structured outcomes, human diagnosis, and fixture execution.

- Use exact equality for the child exit code category, configured bail value, number of failed suites in deterministic serial cases, known triggering assertion text, and report run ID. Treat any zero status with a failed report as a gate failure.

Use partial-order assertions for worker cases. The completed failed-suite count must reach the configured threshold before stopping, but already started passing work may also complete. No reported suite may have impossible totals or duplicate paths.

- Use state-transition assertions for each marker: absent to started, then started to completed. Never accept completed without started. A started-only state requires matching interruption evidence or a documented process termination path.

Use bounded timing only around the child process. The fixture itself should not sleep to create order because runner load can change the race. If coordination is required, use explicit IPC or deterministic file gates owned by the harness.

- Compatibility assertions should pin Jest and Node versions, effective config, worker count, custom reporters, and sequencer. Re-run the serial and worker matrices when those inputs change because scheduling details may move while the public threshold meaning remains stable.

- The strongest oracle rejects success-only checks. A command that merely exited is insufficient, and a report that merely contains one failure is insufficient. Status, failed-suite threshold, failure detail, and partial execution accounting must agree.

- Use the [unit testing category](/categories/unit-testing) for related fixture patterns. Keep the CI bail assertion focused so unrelated application failures cannot make an invalid harness look correct.

## partial Jest run reporting in CI

Partial Jest run reporting should preserve every completed suite and clearly distinguish work that did not run. Do not relabel unscheduled files as skipped tests unless Jest's result model explicitly reports that state. Keep harness marker language separate from Jest status fields.

- Store the exact argv array, cwd identifier, Jest and Node versions, bail value, worker mode, exit code, signal, report hash, stderr artifact, discovered fixture list, and started and completed marker sets. That evidence supports replay without exposing application secrets.

- Validate JSON before trusting counts. Confirm expected top-level fields, unique test-result paths, nonnegative totals, and agreement between aggregate failures and per-suite status. A corrupt or stale report should fail as an evidence error.

- Keep reporter output even if the report parses. Developers need the first assertion message and stack to act, while machines need structured counts. Limit retention to the fixture and avoid uploading unrelated environment variables.

CI should run the direct-spawn harness, not a package script that pipes through several tools. If a wrapper is required, test its status propagation with the intentional failure fixture before using it as the release gate.

Run serial cases on every relevant change because they give exact threshold evidence. Run worker compatibility cases when Jest, Node, reporter, sequencer, or CI image changes. The worker case can stay fast with five tiny files.

seed-skills/jest-unit/SKILL.md recommends fast isolated tests, descriptive names, clear mock state, and command-line runs. seed-skills/test-isolation-strategies/SKILL.md adds cleanup and parallel resource control. These local facts support the fixture design.

- Open the [QA skills directory](/skills) to find unit and isolation patterns. Keep the generated bail report as a dedicated artifact instead of merging it into broad application coverage.

## Jest bail exit code testing comparison matrix

- The scenario matrix separates default full execution, serial thresholds, worker overlap, and wrapper status. Every row expects a failing process because each includes intentional failures. Counts beyond the failed-suite threshold depend on controlled runner mode.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Bail disabled with two failures | Five isolated files, bail zero, run in band | Both failures and all terminal suites are reported with nonzero status | A suite is missing or process returns zero | [Jest configuration](https://jestjs.io/docs/configuration) |
| Bail after first failure in band | Same files, bail one, serial execution | One failed suite triggers stop and retains its details | Later failures run or trigger details disappear | seed-skills/jest-unit/SKILL.md |
| Bail count greater than one | Same files, bail two, serial execution | Two failed suites appear before stop | Run stops at one or exceeds controlled threshold | [Jest CLI](https://jestjs.io/docs/cli) |
| Parallel workers with tests already started | Same files, bail one, two workers | Threshold, status, and completed records agree | Harness demands one universal completion count | seed-skills/test-isolation-strategies/SKILL.md |
| Wrapper masks the exit code | Failing report passed through faulty wrapper | Contract rejects zero wrapper status | CI reports success beside failed-suite evidence | seed-skills/jest-unit/SKILL.md |

- The first row proves the complete fixture. The next two make failed-suite counting visible under serial execution. The worker row tests compatibility without converting a scheduling race into an application contract.

The wrapper row is essential because many CI regressions happen after Jest returns. Keep it in the harness test suite even when production invokes Jest directly, since future script changes can reintroduce status masking.

- Compare the matrix after each runner upgrade. Public bail meaning should remain, but JSON fields, reporter formatting, scheduling, and worker overlap may change. Versioned evidence makes those differences reviewable.

The [blog index](/blog) links broader Jest and CI guidance. This table remains focused on early failure and terminal process truth.

## How do you implement Jest bail exit code testing?

Implement the harness as a parent test with a temporary project fixture. Copy or generate fixed files, clear state, spawn the local Jest binary, await close, parse current JSON, read markers, assert the matrix row, and remove owned state in a final cleanup block.

The following code checks the serial one-failure row and the masked wrapper row. It uses structured report fields plus process status, following behavior-focused assertions from seed-skills/jest-unit/SKILL.md.

\`\`\`javascript
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('bail one preserves failure and returns nonzero', async () => {
  const result = await runJestFixture({
    cwd: fixtureProject,
    bail: 1,
    runInBand: true,
    outputName: 'bail-one.json',
  });

  assert.equal(result.signal, null);
  assert.notEqual(result.code, 0);
  assert.equal(result.report.numFailedTestSuites, 1);
  assert.equal(result.report.success, false);
  assert.match(result.stderr, /intentional-bail-trigger/);

  const paths = result.report.testResults.map((row) => row.name);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.every((path) => path.startsWith(fixtureProject)));
});

test('a wrapper cannot turn a failed Jest report green', async () => {
  const direct = await runJestFixture({
    cwd: fixtureProject,
    bail: 1,
    runInBand: true,
    outputName: 'direct.json',
  });

  const wrapperCode = 0;
  assert.equal(direct.report.success, false);
  assert.notEqual(direct.code, wrapperCode);
  assert.throws(
    () => assert.equal(wrapperCode, direct.report.success ? 0 : direct.code),
    /Expected values to be strictly equal/,
  );
});
\`\`\`

- In a real wrapper test, spawn the wrapper rather than assigning a simulated status. The simplified second case makes the policy visible: structured failure and terminal status may not disagree. Keep the direct result as the comparison oracle.

Follow this procedure for the complete gate:

1. Read seed-skills/jest-unit/SKILL.md and seed-skills/test-isolation-strategies/SKILL.md, then record command, isolation, worker, reporting, status, and cleanup responsibilities.
2. Create five deterministic files with per-file start and completion markers, two intentional failed suites, fixed names, no remote dependencies, and a fresh report directory.
3. Run bail zero in band, capture exit code, signal, JSON, stderr, and markers, then prove all expected files and both failures appear before fault injection.
4. Run bail one, bail two, two-worker, reporter-truncation, watch-rejection, stale-output, and masked-wrapper cases while changing one input at a time.
5. Compare each result with the five-row matrix and report the first mismatch among threshold, failed details, started work, completed work, JSON integrity, or process status.
6. Run the harness in CI, retain safe versioned evidence, terminate only owned children, remove temporary projects and markers, and keep any failed contract nonzero.

Add a final all-pass run after cleanup. It should return zero, list every passing suite, and find no prior marker or report path. This proves the harness can observe both result categories and does not force every child to fail.

- Do not make this gate a test of every reporter. Choose the production reporter plus Jest JSON, then add compatibility rows only for reporters that can affect release evidence.

The [Jest async guide](/blog/jest-async-await-testing-promises-guide) can help keep fixture tests terminal and fast. Avoid arbitrary waits, open timers, or unresolved promises in this runner-focused project.

## Frequently Asked Questions

### How should QA verify Jest bail counts, remaining test behavior, and process exit codes without hiding the first failure?

- Spawn the local Jest binary against isolated files, capture code, signal, JSON, stderr, and per-file markers, then test bail zero, one, and higher values. Use run-in-band for exact threshold evidence and workers for compatibility. Require nonzero status, triggering details, and internally consistent partial results.

### What should a Jest bail option behavior fixture record?

- Record Jest and Node versions, argv, effective config, bail value, worker mode, discovered files, per-file start and completion markers, JSON result, stderr, exit code, signal, report hash, and cleanup status. Keep one intentional failure per suite so the documented failed-suite threshold remains clear.

### Which failure proves Jest exit code assertion is broken?

- The decisive failure is disagreement between structured outcomes and terminal status, such as a JSON report with failed suites beside process code zero. A missing report is an evidence failure, not proof of success. Also reject a wrapper status that differs from direct Jest status for the same controlled fixture.

### How do teams isolate stop after first failure?

- Use a fresh temporary project, fixed file names, independent tests, one failure per suite, unique marker files, run-in-band, and no remote services or open handles. Clear reports before execution and repeat an all-pass control afterward. This isolates bail behavior from ordering plugins, shared data, and stale artifacts.

### Which assertion is strongest for Jest CI bail count?

- Combine exact failed-suite count in a serial fixture, nonzero child status, triggering assertion text, unique result paths, and marker transitions. For workers, use a bounded relationship that allows already started suites to finish. A console line or process status alone cannot prove the configured threshold was applied.

### How should CI report partial Jest run reporting failures?

- CI should publish argv, versions, bail and worker settings, code, signal, failed-suite count, triggering path and message, discovered, started, completed, and unscheduled fixture sets, JSON hash, stderr artifact, and cleanup result. It should never call unscheduled files skipped unless the runner explicitly reports that status.

## Conclusion

Jest bail exit code testing gives CI one plain rule for an early stop. The failed-suite count, first error, partial file list, and process code must all tell the same story.
This keeps Jest bail exit code testing tied to the real child result.

Use serial files for an exact count. Use worker files to check a safe range, since a file that has already begun may still reach its end.

Keep bail apart from watch mode, open handles, and forced exit. Clear old files, run the local Jest tool, save stderr, and parse only the new JSON report.

Test the CI wrapper with a known failed suite. If that wrapper turns the bad Jest code into zero, the release gate must fail before it runs product tests.

Review the [Jest async testing guide](/blog/jest-async-await-testing-promises-guide), then open the [QA skills directory](/skills). Use the Jest bail exit code testing matrix in the next test run.`,
};
