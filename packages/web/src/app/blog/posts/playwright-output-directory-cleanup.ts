import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Output Directory Cleanup',
  description:
    'playwright output directory cleanup: clean runner output without losing failure evidence. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright output directory cleanup',
  keywords: [
    'playwright output directory cleanup',
    'playwright outputdir config',
    'playwright preserveoutput setting',
    'clean test results directory',
    'parallel artifact filename collision',
    'testinfo outputpath playwright',
    'retain failed test artifacts',
  ],
  relatedSlugs: [
    'playwright-test-config-options-complete-reference',
    'playwright-screenshots-videos-traces-complete-guide',
    'ci-upload-artifacts-only-on-test-failure',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-testconfig#test-config-output-dir',
    'https://playwright.dev/docs/api/class-testproject#test-project-preserve-output',
    'https://playwright.dev/docs/test-configuration',
  ],
  repoEvidence: [
    'packages/web/playwright.config.ts',
    'seed-skills/playwright-advance-e2e/SKILL.md',
  ],
  content: `Playwright output directory cleanup works safely when outputDir is unique per runner invocation, preserveOutput matches retention policy, and every custom file comes from testInfo.outputPath. Playwright isolates parallel tests inside one run, but separate runs must not share a directory. Upload failure evidence before any later cleanup begins.

## What Does Playwright Output Directory Cleanup Control?

Playwright output directory cleanup controls where run files live, which test outputs survive, and when old run data disappears. It does not decide CI upload order or organization-wide retention by itself.

The outputDir setting names the root for files created during a test run. Playwright cleans that root at startup and creates a unique child directory for each test result.

The preserveOutput setting chooses whether test output remains for all tests, no tests, or failures only. It applies after result status is known, so policy should match reporter and upload needs.

The testInfo.outputPath method creates a path inside the current test's isolated output directory. Custom screenshots, network records, logs, and generated fixtures should use that method instead of a shared filename.

Within one runner process, unique test result directories prevent workers from colliding. Separate jobs or commands still need different root output directories because either startup may clean the shared root.

The [test configuration reference](/blog/playwright-test-config-options-complete-reference) covers related runner settings. Keep file location, retention, reporter output, and CI upload steps documented as one lifecycle.

Playwright output directory cleanup does not replace storage quotas, secure deletion, data classification, or file expiration. Those controls live in CI and hosting systems around the runner.

A reviewable result records the resolved output root, test result path, worker or shard identity, preserve mode, upload outcome, and cleanup event. That sequence proves evidence survived long enough to be used.

## How Does Playwright Outputdir Config Work?

Playwright outputdir config resolves relative paths from the configuration context and uses \`test-results\` beneath the package directory by default. An explicit setting makes ownership easier to inspect.

The official [TestConfig outputDir API](https://playwright.dev/docs/api/class-testconfig#test-config-output-dir) says the directory is cleaned at the start. It also documents per-test unique subdirectories for parallel safety.

That guarantee applies to tests in the same run. Two independent runner invocations sharing one root can race when either starts and cleans files produced by the other.

Give each CI job a root containing run, project, and shard identity. Keep names bounded and sanitized so an external branch string cannot create unsafe paths.

Reporters may write outside outputDir when configured with their own path. Inventory HTML, JSON, blob, JUnit, screenshots, videos, traces, and custom attachments before claiming one cleanup policy covers all evidence.

The official [configuration guide](https://playwright.dev/docs/test-configuration) describes outputDir as the folder for screenshots, videos, traces, and similar files. Reporter-specific destinations still need explicit review.

Use the [screenshots, videos, and traces guide](/blog/playwright-screenshots-videos-traces-complete-guide) to match each file with a diagnostic purpose. Saving every format for every passing test wastes time and increases data exposure.

Playwright output directory cleanup should make startup removal predictable. Never point outputDir at a source, fixture, shared download, or hand-maintained evidence directory.

## Playwright Preserveoutput Setting: Repository Evidence

The Playwright preserveoutput setting is not explicit in this repository's active web configuration. The file \`packages/web/playwright.config.ts\` instead sets trace retention to failure, enables full parallelism, and limits CI to one worker.

That absence matters because installed Playwright defaults determine output retention. The current TestConfig documentation lists preserveOutput as always, so implicit behavior may retain more custom output than a failure-only policy expects.

The approved [preserveOutput API route](https://playwright.dev/docs/api/class-testproject#test-project-preserve-output) may resolve differently as documentation moves between TestProject and TestConfig. Verify the installed package types and rendered API before changing configuration.

The repository configuration also has no explicit outputDir. Its current files therefore use Playwright's default root unless a command or imported configuration changes that behavior.

The evidence file does provide a real CI clue: trace is retained on failure. If preserveOutput becomes never, test whether required trace packaging still survives under the installed version and reporter flow.

The [configuration article](/blog/playwright-test-config-options-complete-reference) helps compare explicit and inherited options. Record the installed Playwright version whenever default retention affects release evidence.

Playwright output directory cleanup should not claim this repository already uses failures-only. The proposed implementation below is a hardening pattern, not a description of committed settings.

Run a focused failed test before adopting the change. Confirm trace, custom output, reporter links, and CI upload all point to files that still exist after result finalization.

## When Should QA Teams Use Clean Test Results Directory?

A clean test results directory is appropriate at the start of an isolated runner invocation. The immediate requirement is that no previous run can satisfy, overwrite, or confuse the current result.

Use a unique root for every CI job, shard, browser project, and retry group that may overlap. This avoids one process cleaning another process's active files.

Local sequential runs can use a stable root when startup cleanup is expected. Developers should not store manually collected bug evidence there because the next command may remove it.

Choose failures-only when passing custom output has no review value and failed evidence must survive. Choose always for short diagnostic runs with an explicit quota, and choose never only when another system owns every required file.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) supports isolated tests and clear failure evidence. Directory policy should reinforce isolation rather than create shared mutable state.

Do not call a shell deletion after tests and before upload. Put upload in a guaranteed post-test step, verify success, and let ephemeral job teardown remove the workspace later.

Playwright output directory cleanup is complete only after the upload result is known. A removed local file with a failed upload is evidence loss, not successful cleanup.

For sensitive output, a successful upload may still violate policy. Apply access, redaction, encryption, expiry, and deletion rules before considering retention safe.

## Parallel Artifact Filename Collision: Failure Modes and Diagnostics

A parallel artifact filename collision occurs when two producers write the same shared path. The last writer wins, partial bytes mix, or one cleanup removes the other file.

Within Playwright Test, use testInfo.outputPath for a custom logical name such as \`network.json\`. Each test result receives its own parent, so identical leaf names remain isolated.

The repository skill \`seed-skills/playwright-advance-e2e/SKILL.md\` illustrates the risk. Its page helper writes screenshots directly under \`test-results/\${name}.png\`, while the framework also enables parallel workers.

That code can be safe only when every name is globally unique and no other process shares the directory. A test-owned outputPath removes that hidden naming requirement.

The skill's CI example uploads shard-specific artifact names, and its container example mounts separate result roots for each shard. Those patterns correctly separate independent producers at the job boundary.

Product failures do not usually create filename collisions. This is a harness or environment fault, so preserve worker, test, retry, project, shard, and resolved path data for triage.

The [CI artifact upload guide](/blog/ci-upload-artifacts-only-on-test-failure) helps sequence upload conditions. Keep a manifest of expected files so a successful upload step cannot hide a missing producer.

Playwright output directory cleanup needs a controlled collision test. Run parallel cases with the same logical leaf name and prove their resolved parents differ and both contents remain correct.

## Testinfo Outputpath Playwright: Evidence and CI Assertions

Testinfo outputpath Playwright usage should begin inside the test or fixture that owns the file. Pass a safe relative leaf name, write the content, and attach it when reporter visibility matters.

Record testInfo.outputDir beside each custom path during a diagnostic run. The resolved file must stay beneath that directory and should not traverse to a shared parent.

Use one deterministic leaf name per evidence purpose. Unique parent directories already carry test, project, retry, and result identity, so random suffixes often make manifests harder to inspect.

Close file handles before attachment, hashing, upload, or cleanup. Buffered writes can make a path exist while its bytes remain incomplete.

For retries, treat each result as separate evidence. Do not overwrite the first failure with a later pass, because their directories and trace facts explain different executions.

The [artifact upload guide](/blog/ci-upload-artifacts-only-on-test-failure) can define failure conditions and upload steps. Include the first failed retry when policy allows, even if the final retry changes job status.

In CI, assert path containment, file existence, expected media type, bounded size, manifest ownership, upload status, and later cleanup. Those facts form a complete artifact lifecycle.

Playwright output directory cleanup should also detect orphan files. Any uploaded item without a test result, reporter, or declared run-level owner needs review before retention.

## Retain Failed Test Artifacts Comparison Table

Retain failed test artifacts according to diagnostic value and data risk, not storage convenience. The table compares runner retention settings with the path helper that prevents collisions.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| preserveOutput always | Every test output has short-lived review value and storage is bounded | Resolved paths, result status, manifest, upload, and expiry | Passing artifacts increase cost and data exposure |
| preserveOutput failures-only | Failed tests need custom output while passing output can be removed | Failed result, retained files, upload status, and cleanup log | Required evidence disappears before upload |
| preserveOutput never | Reporters or external systems independently retain all required facts | Reporter paths, external upload proof, and empty local output | A hidden dependency expected local files |
| testInfo.outputPath | Parallel tests create custom files with repeated logical names | Unique result parent, safe leaf name, owner, and content check | A helper bypasses the isolated path |

Preserve mode and outputPath solve different problems. The first decides retention after status; the second gives each test a collision-safe location during execution.

Use the [verified QA skills directory](/skills) to find trace, screenshot, and CI workflows. Keep directory ownership explicit even when a skill generates the artifact.

The table does not include manual deletion as a retention mode. Playwright result finalization and CI job teardown provide clearer boundaries than scattered cleanup commands.

For a failed upload, keep the local job alive long enough to retry within policy. If the ephemeral worker must stop, mark evidence unavailable rather than reporting successful retention.

Playwright output directory cleanup passes the table when every selected mode has a tested upload and deletion path. Defaults should never be inferred from a developer's local directory contents.

## How Do You Implement Playwright Output Directory Cleanup?

Implement Playwright output directory cleanup by assigning unique run roots, choosing retention explicitly, and routing custom files through testInfo.outputPath. Verify both parallel isolation and post-failure upload.

1. Read \`packages/web/playwright.config.ts\`, inventory current traces and reporters, and record the installed defaults for outputDir plus preserveOutput, including the package version, local root, CI root, active projects, and reporter paths in one review note.
2. Configure a dedicated root that includes trusted CI run and shard identity, then choose always, failures-only, or never from the evidence policy, while rejecting blank, reused, unsafe, or source-owned roots before the browser can start.
3. Replace direct shared file paths with \`testInfo.outputPath\`, close writers before attachment, and create a manifest linking files to test results, retries, projects, shards, sizes, hashes, safe types, and end dates.
4. Run parallel tests with duplicate logical filenames, then prove resolved parent paths and file contents remain distinct, while checking that each manifest row maps to the right test, worker, project, and retry.
5. Force one test failure, verify required traces and custom files survive, upload them, and record upload status before teardown, while a passing control proves that its unneeded custom output leaves under the chosen rule.
6. Repeat under CI settings, test a failed upload, enforce expiry and redaction, and document any reporter directories outside outputDir, while a later delete check proves saved files leave only after their review time ends.

The first example makes the default root and retention choice explicit. A trusted CI variable gives separate runner invocations different roots without changing local behavior.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

const runId = process.env.CI_RUN_ID?.replace(/[^a-zA-Z0-9_-]/g, '_') ?? 'local';
const shard = process.env.CI_SHARD?.replace(/[^a-zA-Z0-9_-]/g, '_') ?? 'single';

export default defineConfig({
  outputDir: \`test-results/\${runId}-\${shard}\`,
  preserveOutput: 'failures-only',
  fullyParallel: true,
  use: {
    trace: 'retain-on-failure',
  },
});
\`\`\`

The sanitizing rule keeps path identity predictable. In a real CI system, prefer its numeric run and matrix identifiers over user-controlled branch names.

The second example writes the same logical filename safely from every parallel test. It checks path ownership before attaching the completed JSON file.

\`\`\`typescript
import { writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { expect, test } from '@playwright/test';

test('retains request evidence in the test result directory', async ({ page }, testInfo) => {
  const events: Array<{ method: string; path: string }> = [];
  page.on('request', (request) => {
    events.push({ method: request.method(), path: new URL(request.url()).pathname });
  });

  await page.goto('/skills');
  const evidencePath = testInfo.outputPath('network.json');
  await writeFile(evidencePath, JSON.stringify(events, null, 2), 'utf8');

  expect(relative(testInfo.outputDir, evidencePath)).not.toMatch(/^\\.\\./);
  await testInfo.attach('network-events', {
    path: evidencePath,
    contentType: 'application/json',
  });
});
\`\`\`

Run two copies in parallel and inspect their attachment paths. Both leaves may be \`network.json\`, but their test result parent directories and content must differ.

Use the [screenshots and traces guide](/blog/playwright-screenshots-videos-traces-complete-guide) to add only artifacts that answer likely failures. A bounded JSON request list may be enough when a full trace would expose more data.

The smallest local verification uses two parallel tests and one deliberate failure. CI repeats with two shards, distinct root variables, uploads failure evidence, and checks both manifests.

Playwright output directory cleanup should fail when roots match across active jobs, a path escapes its test directory, a required file vanishes, or upload returns an error. Each fault needs its own clear message.

Open the [Playwright CLI skill](/skills/Pramod/playwright-cli) for command-line browser artifacts when that surface fits the task. Keep CLI output in a separate run root so it cannot be removed by the test runner.

### An artifact handoff drill

Start the drill with one run ID and one root path that no other live job uses. Print both facts before tests start so later logs share the same name.

List every writer that can make a file. Include the test runner, each reporter, trace and video hooks, custom fixtures, browser downloads, and CI log steps.

Mark which writers use outputDir and which use another path. A cleanup rule cannot cover a reporter folder that no one placed under its root.

Run a preflight check that the root sits inside an approved artifact area. Stop if it points at source, test data, a home folder, or another job.

Start two jobs with distinct roots and the same test names. Each job should finish without deleting, replacing, or listing files from the other job.

Inside one job, run two tests in parallel with the same leaf name. Their parent paths must differ, and each file must contain only its own case data.

Add one pass and one fail that both make a small file. Under failures-only, the pass file should leave while the failed file stays for the upload step.

Repeat the check on a retry. Keep the first failed result separate from the later result, since each run may have a different trace and page state.

Build a short manifest after all writers close. Give each file an owner, test result, purpose, size, hash, safe type, and planned end date.

Compare the manifest with the root on disk. Fail on a missing file, an extra file, a path outside the root, or two rows that claim the same path.

Upload the manifest first or with the files it names. The transfer result should list the remote item, byte count, and job that can fetch it.

Force the upload step to fail once. The job must report evidence not saved and keep local files until the retry or job time limit ends.

Do not call failed upload a test failure unless policy says so. Give it an evidence status of its own so product and storage faults reach the right team.

After a good upload, run cleanup and save a small deletion log. The log should show root, time, file count, and policy, but it must not copy private file names.

Check that cleanup does not follow a link outside the root. A test-created link must not turn an artifact rule into broad file removal.

Set a size cap and test it with a safe large fixture. The job should stop new capture, keep the key failure facts, and report which optional file was left out.

Review one artifact for user data before upload. Page text, URLs, request bodies, images, and saved state can all hold more than the test meant to keep.

For local use, make the run ID easy to find but still separate from CI. A developer may remove local roots by age after confirming no bug note points there.

Use the [Playwright testing practices](/blog/playwright-testing-best-practices-2026) to keep tests independent before adding file checks. Shared app state and shared output paths can create similar noise but need different fixes.

Run the drill with the same shell and worker count used in CI. A single local worker cannot prove that shard roots and test child paths stay apart.

End with four plain states: tests done, files closed, upload checked, and local cleanup done. If one state is unknown, the artifact handoff is not complete.

Playwright output directory cleanup passes this drill when both evidence and removal are proved. An empty folder alone cannot show whether useful files were first saved in the right place.

Keep the run root short enough for all tools on each host. Very long test names can grow child paths, so check one deep case on every supported system.

Use forward-safe path tools rather than joining names with hand-made slashes. The same code should keep files inside the root on local and CI hosts.

Give each shard a fixed part number and total count in its root. This makes two uploads easy to match and shows when one shard never sent its files.

Give each browser project its own path part when projects can run at once. Chrome and WebKit files should never rely on a leaf name to stay apart.

Record retry number in the manifest even when the folder already holds it. A person should not need to parse a long path to find the first failed try.

Check how attachments are copied or linked by the active reporter. The source file may leave after the reporter has made a safe copy, but this must be proved.

Keep run-level files apart from test-level files. A job log or merged report needs a named owner, since no one test can claim its full content.

Close the browser before the last file scan when video is on. Video files may finish late, and an early scan can report the wrong size or miss them.

Stop tracing before the same scan for the same reason. A path can exist while the trace still writes, so existence alone is not a sound handoff check.

If the job is canceled, run the smallest safe upload hook that policy allows. Mark files as partial when their writers did not reach a clean close.

Do not merge partial and complete files under one name. Keep the canceled run ID so a later pass cannot make its old evidence seem whole.

Set the local free-space check before browser launch. A clear early stop is safer than a disk-full error that leaves reports and traces in mixed states.

When the size cap is near, keep the core log and failed page fact first. Drop repeat video or broad traces only through a rule the team reviewed in advance.

Check file type from known producers, not a user-given suffix alone. A file named as JSON may still hold bad bytes or private text that needs another rule.

For each upload, record the remote name without a public link when access is private. Review tools can fetch it through job rights without making the file open.

Run the delete job against a test root with three known files. It must remove those files, keep a nearby safe file, and write the right count.

Run a second delete test when the root is already gone. The task should report no work and pass, rather than fail and hide a prior clean end.

Keep the cleanup log far smaller than the files it tracks. A root, rule, count, time, and result are enough for most reviews and reduce data risk.

The final job view should show which files were saved, which were skipped, and why. A green upload step with no file list cannot prove the failed test has useful proof.

The handoff is ready when a new team member can find one failed file and its end date. If that takes shell guesswork, path and manifest names need one more pass.

Run the first proof with two jobs that start at the same time and use the same test names; give each job its own root, then make both tests write a file named \`state.json\` with a different short word inside. Both words must reach the right saved set, and neither job may list or remove the file owned by its peer.

Run the next proof with one test that fails first and then passes on its retry; keep the first trace, page shot, and small log in the first result path while the pass uses a new result path. The saved list must show which try made each file, so a later green state cannot replace the facts from the red state.

Run a third proof where the save step returns an error after the tests end. Keep the root in place, mark the handoff as failed, and let one bounded retry use the same closed files. If that retry also fails, end the job with a clear file status and never claim that local cleanup was safe to run.

Test the delete rule in a root with known files and place one safe file just outside that root. The task must remove only the known set, keep the nearby file, and write a count that matches the list made before deletion.

Ask a reviewer to find the first failed trace, its test, its retry, its saved name, and its end date without shell search. The review passes only when each answer comes from the run list and path scheme, since a bare green upload box does not prove that useful proof was kept, with the same job name, file count, and clock time shown on one plain card that the whole team can read.

## Frequently Asked Questions

### What is the safest way to use playwright outputdir config?

Set an explicit artifact-only root and make it unique for each overlapping CI run, project, and shard. Never point it at source or shared evidence. Record the resolved path, remember Playwright cleans it at startup, and inventory reporter outputs that may use their own configured directories.

### How do you verify playwright preserveoutput setting?

Run one passing and one failing test that each write a custom file, then inspect retained paths after result finalization. Repeat for always, failures-only, and never under the installed Playwright version. Confirm traces, attachments, reporter links, uploads, and cleanup all match the documented policy before changing CI.

### When should a QA team choose clean test results directory?

Use a clean directory at the start of an isolated runner invocation when stale files could misstate current results. Give concurrent invocations separate roots. Do not clean manually collected evidence or run deletion before CI upload, and mark the run incomplete whenever required artifact transfer fails.

### What causes failures in parallel artifact filename collision?

Direct writes to shared paths, reused screenshot names, overlapping runner roots, shard mounts, retries, and startup cleaning can collide. Use testInfo.outputPath inside one run and unique outputDir roots across runs. Retain resolved path, worker, project, shard, retry, and content digest when diagnosing a collision.

### Which evidence should testinfo outputpath playwright retain?

Retain the resolved test output directory, relative artifact path, logical purpose, test and retry identity, size, digest, attachment status, upload result, and cleanup event. Avoid secret-bearing bodies and unbounded logs. Every retained file should map to one test result or a declared run-level owner.

### How should CI handle retain failed test artifacts?

Use failure-aware runner settings, place upload in a guaranteed post-test step, and verify the transfer before job teardown. Preserve the first failed retry when policy permits, even if a later retry passes. Apply access limits and expiry, then report missing evidence as a failure rather than successful cleanup.

## Conclusion

Playwright output directory cleanup is reliable when each runner owns a unique root, each test owns custom paths, retention is explicit, and upload precedes deletion. Require collision tests, failed-run evidence, resolved paths, upload status, and cleanup logs before adopting the policy.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then browse [verified QA skills](/skills) and test the full artifact lifecycle under real CI concurrency.`,
};
