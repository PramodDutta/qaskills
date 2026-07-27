import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Newman bail partial report testing',
  description:
    'Newman bail partial report testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Newman bail partial report testing',
  keywords: [
    'Newman bail partial report testing',
    'Newman bail partial report',
    'Newman stop on failure',
    'partial JUnit report Newman',
    'Newman bail exit status',
    'collection remaining requests report',
  ],
  relatedSlugs: [
    'postman-api-testing-guide',
    'newman-postman-ci-automation-guide-2026',
    'bruno-vs-postman-api-testing-2026',
    'hoppscotch-vs-postman-2026',
  ],
  sources: [
    'https://learning.postman.com/docs/collections/using-newman-cli/newman-options/',
    'https://learning.postman.com/docs/collections/running-collections/building-workflows/',
  ],
  repoEvidence: [
    'seed-skills/postman-api/SKILL.md',
    'seed-skills/postman-newman-automation/SKILL.md',
  ],
  content: `Newman bail partial report testing proves that a stopped run keeps evidence for work already done, returns the planned failure status, and identifies requests that never ran. The suite needs a fixed request order, one known failure, JSON and JUnit files, captured stderr, and an expected manifest for completed versus remaining work.

Bail changes the meaning of a short report. Fewer requests can mean correct early exit, a bad folder filter, a setup crash, an empty collection, or a reporter that did not flush. CI must join process status with report content before it labels the result.

The repository supports the base workflow. \`seed-skills/postman-api/SKILL.md\` shows ordered collections, \`pm.test\` checks, Newman reporters, export paths, timeouts, and artifact upload with \`if: always()\`. \`seed-skills/postman-newman-automation/SKILL.md\` adds focused tests, run independence, async care, report output, cleanup, and direct fault review.

This article adds a bail-specific oracle without claiming those skills define Newman's full stop rules. Read the [Postman API guide](/blog/postman-api-testing-guide), then browse [API testing skills](/skills) for reusable checks. Newman bail partial report testing should make an intentional short run easy to tell from lost evidence.

## What Does Newman Bail Partial Report Testing Verify?

Newman bail partial report testing verifies four linked facts: requests before the fault ran, the chosen fault was recorded, later requests did not run, and the process returned the expected nonzero status. JSON, JUnit, stdout, stderr, and an independent request manifest provide different parts of that proof.

The Postman skill shows Newman runs with several reporters and named export paths. Its CI sample uploads the report folder even after test execution, which is vital when a failed run is the case under test. It also treats \`pm.test\` as the source of real checks rather than console text.

The smaller Newman skill says each test should stay focused, avoid shared state, clean resources, and create useful reports. These points justify a tiny collection with clear request names. They do not prove which fields every Newman or JUnit version writes after bail.

Postman's [Newman option reference](https://learning.postman.com/docs/collections/using-newman-cli/newman-options/) states that \`--bail\` can stop a run when a test script fails. It also lists JSON and JUnit reporters, and it explains the default success status plus the failure status used for CI.

Treat the observed report shape as a versioned contract. Parse only fields that the pinned Newman and reporter versions emit in a checked fixture. If a reporter does not mark an unrun request, compute the remaining set by subtracting observed request IDs from the expected ordered manifest.

The key distinction is \`failed\` versus \`not run\`. A later request with no execution record is not a pass, skip, or failure. CI should label it \`notRunAfterBail\` and show the request that ended the run.

Use the broader [Newman CI guide](/blog/newman-postman-ci-automation-guide-2026) for normal runs. This page owns the partial evidence and status rules that apply after early exit.

## How Do You Build a Newman Bail Partial Report?

A Newman bail partial report fixture should contain five requests with stable IDs and names. Place one pass first, one controlled assertion failure second, two later requests in the same folder, and one request in a nested folder. Export both JSON and JUnit output to a new run directory.

Keep the API local and plain. One route can return fixed JSON for all requests, while scripts decide which named item fails. This avoids a network outage or changing service response from replacing the planned fault.

The pass request should assert a fixed status and body value. The fail request should assert one known wrong value with a unique test name. Later requests should also contain real tests, so a complete run can prove they are valid before the bail case marks them unrun.

First run the collection without the fault. All five request IDs should appear, every check should pass, both report files should parse, and the process status should be zero. This baseline proves that the collection, route, reporter paths, and parser work before bail is added.

Then enable the single fault and add \`--bail failure\` or the exact mode chosen by the team. Keep collection, environment, data, reporters, folder choice, and Newman version fixed. The only changed input should be the fault flag or fixture value.

Save an ordered manifest outside report output. It should list collection ID, folder path, request ID, request name, and expected rank. Reports can then be joined by request ID, while names remain readable in CI.

Do not use mutable environment values to decide which request comes next unless workflow routing is itself under test. Postman's [collection workflow guide](https://learning.postman.com/docs/collections/running-collections/building-workflows/) explains that scripts can choose or stop later requests. A hidden \`setNextRequest\` call would make the bail result unclear.

Reset by deleting only the owned report folder, clearing the fault value, and restarting the local stub. Review [API testing categories](/categories/api-testing) for fixture ideas, but keep this collection small enough that every unrun item is obvious.

## What Breaks Newman Stop on Failure?

Newman stop on failure breaks when CI observes only one signal. A nonzero status without a report could mean the planned check failed, Newman could not read the collection, the environment was missing, or the reporter path was not writable. Report content without status can also hide a shell error.

Shell status masking is common. Commands such as \`newman ... | tee output.log\` may expose the last pipeline command's status unless the shell is set to preserve failures. Wrappers can also catch an error and return zero after writing a warning.

The \`--suppress-exit-code\` option changes the status contract. Do not use it in the bail gate, and assert that the final argument list excludes it. A report with a failed assertion and process status zero should fail the harness even if report parsing works.

Bail modes matter. The option reference distinguishes plain bail and optional modifiers such as \`failure\` and \`folder\`. Pin the exact mode in case data, then name it in the result instead of assuming all forms stop at the same point.

Reporter flush faults can leave an empty or partial file. Wait for the child process to close before reading exports, then check that each file exists, has nonzero size, and parses. A file watcher event or stdout line is not enough proof that all reporter writes ended.

Folder filters can mimic bail. If a job selects only the first folder, later requests will be absent even during a clean run. Save the exact \`--folder\` arguments and compare the selected manifest before classifying missing items.

An API or runner fault differs from the planned check by location. If no execution reaches the fail request, report the first setup or request error. If the named assertion appears and later IDs are absent, the bail path likely worked as planned.

Run the same collection through the [Bruno versus Postman guide](/blog/bruno-vs-postman-api-testing-2026) only for tool choice, not as proof of Newman behavior. Newman stop on failure needs its own pinned CLI and reporter facts.

## Partial JUnit Report Newman Fixtures and Controls

A partial JUnit report Newman fixture should pair JUnit with JSON because each format serves a different reader. JUnit feeds common CI test views, while JSON can retain richer run facts for a custom oracle. Do not require both parsers to infer unrun work in the same way.

The positive control runs without bail and expects all request IDs or mapped test cases. The bail control enables one known assertion fault and expects completed work through that fault. The remaining manifest should contain only requests ranked after the stop point.

Add an empty-file control by pointing one reporter export to an unwritable or blocked test path in an isolated harness. The run should fail as reporter setup or output, not as a valid partial report. Do not run this fault against a shared workspace path.

Add a request-error control by making one local route refuse a connection. Keep it separate from the assertion-failure case. Its stderr, report event, and stop point can differ, so combining both faults would make the expected record set hard to defend.

Add a nested-folder control with the fail request inside that folder. The manifest must keep full folder paths, because duplicate request names can exist in separate folders. Join on stable IDs where the chosen report exposes them, and use path plus name only as a checked fallback.

Repeat each case with a fresh report directory. Reusing \`results.xml\` can leave a complete file from the prior run when the next reporter fails before writing. A run ID in the file name prevents stale success data from being read as current output.

Keep report checks structural and exact. Require parse success, at least one completed record, the known assertion failure, and the computed remaining set. Avoid a full text snapshot because timestamps, durations, and tool versions can add harmless noise.

The repo's CI example uploads reports with an always-run step. Apply the same rule, then inspect [the project FAQ](/faq) when turning this fixture into a shared skill. Artifact upload must not replace the job's true failure status.

## How Should Newman Bail Exit Status Be Asserted?

Newman bail exit status should be read from the child process close event and compared with report facts. A clean baseline expects zero. The planned failed assertion under bail expects the pinned nonzero status, a named failed check, completed records through the fault, and later requests in the remaining set.

Use exact equality for the exit code, selected bail mode, request IDs, and assertion name. Use set equality for completed and remaining requests. Use bounded timing only to end a hung child process, not to guess when reporters have flushed.

Keep spawn errors apart from process exits. A missing \`newman\` binary emits a wrapper error and may not have a normal child status. CI should label this \`launchFailed\`, omit bail classification, and retain the safe command metadata.

Signals also need their own result. A process killed by timeout or agent shutdown may have no numeric exit code. Mark it \`terminated\` with the signal and elapsed limit, then do not treat any existing report as proof of a normal bail.

Read stdout and stderr as diagnostics, not as the main oracle. Wording and color can change across versions, while the child status and parsed report are easier to compare. Keep only a short tail after redacting secrets and request data.

Assert wrapper status in a real shell job as well as a Node unit test. The unit test proves parser and spawn logic, while the shell job proves that CI steps, pipes, and upload commands do not replace Newman's result.

A strong final rule is conjunctive: correct nonzero status, correct known fault, correct completed set, correct remaining set, and valid report files. If one fact differs, fail with the first mismatch and preserve the other facts for review.

Use the [Postman API guide](/blog/postman-api-testing-guide) for normal assertion patterns. Newman bail partial report testing adds the process boundary that an in-collection check cannot see.

## Collection Remaining Requests Report in CI

A collection remaining requests report should be computed from the expected manifest rather than guessed from count totals. Load the collection before execution, flatten selected folders in planned order, and save stable request keys. Then subtract completed keys found in the parsed run.

Label each request as \`passed\`, \`failed\`, \`errored\`, or \`notRunAfterBail\`. Do not call absent requests skipped unless the runner or workflow recorded a real skip. That wording keeps a planned early stop distinct from an explicit skip action.

Publish the stop request and the first remaining request at the top. Those two IDs explain the boundary faster than a long XML view. Include total planned, started, completed, failed, errored, and not-run counts below them.

Pin Node, Newman, collection schema, and reporter package versions in the job. Save those versions with the command arguments, collection hash, environment name, and run ID. Redact environment values, request headers, response bodies, and tokens.

Use a new artifact folder for each matrix row. Upload it with an always-run step, then return the original child status after parsing and upload finish. An upload failure should be reported as a second fault without turning the Newman fault green.

Run the complete baseline before the bail rows in CI. If the baseline fails, stop classification because the planned fault is not isolated. This order also proves every request in the remaining set can pass when it is allowed to run.

Retries must start with a clean local service and new output paths. A retry that begins after the prior fail request may change collection variables and stop at a new point. Save retry number while retaining the first run artifact.

Link a failed assertion to \`seed-skills/postman-api/SKILL.md\` and CI report setup to \`seed-skills/postman-newman-automation/SKILL.md\`. Teams can browse [API skills](/skills) after the gate is stable and share the exact manifest rule.

## Newman Bail Partial Report Testing Comparison Matrix

This matrix changes one stop condition while keeping the collection and reporters fixed. Run the full collection first, since every later result depends on a proven complete baseline and a valid expected manifest.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Collection completes without bail | Fault flag off, all five requests selected, JSON and JUnit enabled against the fixed local stub in a fresh run folder. | Status is zero, every request completes, both reports parse, and the manifest difference is empty for the selected scope. | Missing request, nonzero status, stale file, parse error, or a report run ID that does not match the current process. | \`seed-skills/postman-api/SKILL.md\` for CLI, report, and artifact setup. |
| Bail on first assertion failure | Fault flag on only for the second request, \`--bail failure\` set, and every folder kept in the selected manifest. | Known assertion fails, status is nonzero, completed IDs end at that request, and all later request IDs remain unrun. | Status is zero, named fault is absent, a later request starts, or the wrapper returns an upload command's status instead. | Newman option reference for the chosen bail mode, reporters, and process code. |
| Bail on request error | Local route refuses only the second request while the first and all later routes remain healthy in the owned stub. | Request error is recorded, its stop boundary is clear, prior proof remains readable, and all later requests are absent. | Transport error is confused with the planned assertion case, no prior record survives, or a later request reaches the local stub. | Both repository skills for focused negative cases, clean state, and useful CI output. |
| Failure inside a nested folder | Same assertion fault moved to one named child folder whose request IDs remain unique in the ordered sidecar manifest. | Full folder path identifies the fault, completed records map to stable IDs, and remaining IDs follow the selected manifest order. | Duplicate name maps to the wrong folder or request, folder filtering hides peers, or a path-only key joins the wrong record. | Collection workflow guidance for order and the repository rules for test independence. |
| JSON and JUnit output after bail | Fresh export paths for both reporters, one known fault, matching run IDs, and no files copied from the complete baseline. | Both files parse only after process close, preserve completed proof, agree on the known fault, and belong to the current run. | Empty, stale, malformed, mismatched, or early-read report files leave the stop point unsupported by current output. | Repo CI example and Newman options for multi-reporter export plus always-run artifact upload. |

The final row does not require JUnit to invent entries for requests that never began. The sidecar manifest supplies that set. This makes the oracle stable even when a reporter lists only work that produced events.

Add rows for data iterations only after the single-run matrix passes. A request key then needs iteration plus request ID, and the remaining set must follow the chosen bail scope. Do not infer iteration rules from a one-pass fixture.

Newman bail partial report testing should leave one compact summary that both a person and CI can read. Compare it with the [Newman automation guide](/blog/newman-postman-ci-automation-guide-2026) before adding more reporter types.

## How Do You Implement Newman Bail Partial Report Testing?

Implement Newman bail partial report testing with a complete baseline, then one fault per run. Parse only after the process closes. Preserve the original status while report checks add clear reasons when output is missing or stale.

1. Read \`seed-skills/postman-api/SKILL.md\` and \`seed-skills/postman-newman-automation/SKILL.md\`, then record collection, reporter, CI, and cleanup duties.
2. Build a five-request collection with a pass, controlled failed assertion, later peers, a nested folder, and JSON plus JUnit reporters.
3. Run the clean baseline and capture status, report files, request IDs, assertion totals, stderr, and the empty remaining set.
4. Inject one fault at a time, including assertion failure, request error, bad export path, folder selection, stale file, and shell status masking.
5. Compare each run with the five matrix rows, then report the first status, request ID, or report field that differs.
6. Run the gate in CI, upload safe partial evidence, delete owned output, stop the local stub, and link failures to their repo path.

The first JavaScript example gives the fail request a unique check name. The surrounding collection should contain one request before it and known request IDs after it.

\`\`\`javascript
const mode = pm.environment.get('bailFixtureMode');
const body = pm.response.json();

pm.test('bail-fixture-response-status', function () {
  pm.response.to.have.status(200);
});

pm.test('bail-fixture-known-value', function () {
  const expected = mode === 'fail-second-request' ? 'planned-wrong-value' : 'ready';
  pm.expect(body.state).to.eql(expected);
});

pm.test('bail-fixture-request-id-is-stable', function () {
  pm.expect(pm.info.requestId).to.be.a('string').and.not.empty;
});
\`\`\`

The wrong expected value is enabled only for the bail row. It leaves the service response unchanged and produces a named assertion failure, so the test does not need an outside outage to stop the run.

The next example spawns Newman without a shell, captures the status, and reads reports only after close. Its parser should return stable request keys from the pinned report version.

\`\`\`javascript
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

export async function runBailCase(args, expectedKeys, parseJson, parseJUnit) {
  const child = spawn('newman', args, { shell: false });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const result = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });

  const json = parseJson(await readFile(args.jsonPath, 'utf8'));
  const junit = parseJUnit(await readFile(args.junitPath, 'utf8'));
  const completed = new Set(json.completedRequestKeys);
  const remaining = expectedKeys.filter((key) => !completed.has(key));

  return { result, json, junit, remaining, stderr: stderr.slice(-2000) };
}
\`\`\`

Add a unit case where a fake child reports status zero while the JSON contains the known failure. The oracle must reject that mismatch. Add another where a complete old report exists but the current export is empty, and require the run ID check to reject stale data.

Run the real CLI case without a shell first. Then run one CI wrapper case that uses the project's actual shell settings. This pair catches parser faults and pipeline status masking without tying every test to a shell.

Review the output in [the API category](/categories/api-testing), then package the runbook through [the skills directory](/skills). Keep collection IDs and reporter versions in the artifact so the next review can reproduce the stop point.

## Frequently Asked Questions

### What does Newman preserve in reports when bail stops on a failure, and how should CI assert partial results?

CI should expect evidence for executions completed through the stop point, the known fault, a nonzero process status, and no later request starts. Because reporter shapes vary, derive never-run requests from a checked collection manifest minus observed IDs. Parse exports only after the child process closes.

### What should a Newman bail partial report fixture record?

Record the collection hash, selected folders, ordered request IDs, bail mode, fault flag, Newman and reporter versions, command arguments, process code or signal, report paths, completed IDs, failed assertion, remaining IDs, stderr tail, and cleanup status. Never store environment secrets, authorization headers, or full sensitive response bodies.

### Which failure proves Newman stop on failure is broken?

The clearest contract failure is a later request starting after the named assertion fault under the pinned bail mode. A zero status with that fault is also wrong unless suppression was an explicit contract. Missing reports alone point first to output setup, reporter flush, stale paths, or wrapper behavior.

### How do teams isolate a partial JUnit report Newman case?

Use a local fixed API, one small collection, stable IDs, one fault flag, and a new output directory per run. Prove all requests and both reporters in a clean baseline. Then change only the fault input, wait for process close, parse each file, and delete the owned directory.

### Which assertion is strongest for Newman bail exit status?

Use a joined assertion: the exact nonzero code, no signal, the named failed check, the expected completed request set, the computed remaining set, and valid current-run reports. Any lone fact is weak. A spawn error or timeout must get its own label because neither is a normal bail exit.

### How should CI report collection remaining requests report failures?

Show the stop request, first remaining request, planned count, completed count, failed count, and not-run count before verbose details. Add bail mode, tool versions, collection hash, retry number, and cleanup state. Upload redacted JSON and JUnit files while preserving the original Newman status after artifact handling.

## Conclusion

Newman bail partial report testing joins a known stop fault with process status, completed request evidence, valid current-run exports, and an independent remaining set. A clean baseline, fresh paths, stable IDs, and preserved shell status stop short reports from being mistaken for successful runs.

Run the five-row matrix with pinned Newman and reporter versions before adding data iterations. Review the [Postman API testing guide](/blog/postman-api-testing-guide), then open [QA skills](/skills) and implement the Newman bail partial report testing matrix in the next test run.`,
};
