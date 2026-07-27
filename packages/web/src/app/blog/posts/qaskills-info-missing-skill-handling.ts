import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills info missing skill handling',
  description:
    'QASkills info missing skill handling: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills info missing skill handling',
  keywords: [
    'QASkills info missing skill handling',
    'qaskills info not found',
    'missing skill CLI error',
    'skill detail request failure',
    'qaskills info exit code',
    'CLI catch block testing',
    'search suggestion error output',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'skill-md-format-guide',
    'qaskills-add-custom-directory-ci',
    'typescript-testing-patterns-guide',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://github.com/bombshell-dev/clack',
    'https://github.com/tj/commander.js',
  ],
  repoEvidence: [
    'packages/cli/src/commands/info.ts#infoCommand',
    'packages/cli/src/lib/api-client.ts#getSkill',
    'packages/cli/src/lib/api-client.ts#request',
    'packages/cli/e2e/e2e.mjs#run',
  ],
  content: `QASkills info missing skill handling currently prints a failed-spinner message, a not-found error with a search suggestion, and an empty outro. The command catches every detail-request error but does not set a failing process status. Tests must verify both visible output and the current zero exit result, then document any desired status change separately.

This behavior lives in \`packages/cli/src/commands/info.ts\` and depends on the HTTP helper in \`packages/cli/src/lib/api-client.ts\`. The distinction matters because a useful message can still produce the wrong automation signal. Start with the current [QASkills catalog](/skills), but test missing records against a controlled endpoint instead of production data.

## What does QASkills info missing skill handling guarantee?

QASkills info missing skill handling guarantees one user-facing recovery message after any thrown detail request. It stops the spinner with failure text, says the requested skill was not found, suggests the search command, and ends the prompt flow. Current code does not distinguish HTTP status, timeout, malformed JSON, or network rejection.

The command at \`packages/cli/src/commands/info.ts#infoCommand\` starts an intro and a spinner before entering its \`try\` block. A successful \`getSkill\` call stops the spinner, renders fields, and prints a web URL. The catch branch ignores the caught value entirely, so no lower-level status or response body reaches the terminal.

That broad catch is a precise current fact, not a recommendation. A 404 and a 500 both become \`Skill "{name}" not found. Try \\\`qaskills search {name}\\\`\`. An aborted request or JSON parsing error produces the same line because every thrown value follows one branch.

The lower-level request helper checks \`res.ok\`. When the response is not successful, it reads text when possible and throws \`API error {status}: {body or statusText}\`. The [HTTP Semantics specification](https://www.rfc-editor.org/info/rfc9110) defines the status-code model, while QASkills decides how much of that result appears in its command output.

The command does not assign \`process.exitCode\` in its catch. It also does not rethrow or call \`process.exit(1)\`. Under the current Commander action flow, the async action resolves after printing the error, so a built-process test should expect status zero unless some outer code changes it.

That status is the key boundary for this guide. The article documents failure UX and process behavior, not successful field formatting or path encoding. If the product decides a missing skill must fail automation, change the implementation and its tests together rather than writing a test that assumes a status not present today.

Use the [error-handling testing guide](/blog/error-handling-testing-patterns) for broader failure design. Here, the contract is narrow enough to capture with one local HTTP fixture and one built CLI process.

## How does qaskills info not found work?

The qaskills info not found path begins after \`getSkill(skillName)\` rejects. The catch first calls \`spinner.stop('Failed to fetch skill details')\`, then logs one error line and calls \`p.outro('')\`. There is no retry, fallback lookup, interactive choice, or second API request.

The output includes the exact input text supplied to the command. If a user enters \`missing-skill\`, the error and suggested search both include \`missing-skill\`. This behavior is easy to assert without depending on color codes by mocking the prompt functions or stripping ANSI output from a built-process capture.

The command uses components from the Clack prompt family. The [Clack repository](https://github.com/bombshell-dev/clack) is the approved reference for the prompt primitives, while repository code remains the source for exact QASkills messages. A visual snapshot of spinner frames is less useful than calls to \`stop\`, \`log.error\`, and \`outro\`.

One unit-level test can mock \`getSkill\` and the prompt module:

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';

const stop = vi.fn();
const error = vi.fn();
const outro = vi.fn();

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop }),
  log: { info: vi.fn(), error },
  outro,
}));

vi.mock('../lib/api-client', () => ({
  getSkill: vi.fn().mockRejectedValue(new Error('API error 404: missing')),
}));

it('prints the missing skill recovery message', async () => {
  process.exitCode = undefined;
  await infoCommand.parseAsync(['node', 'qaskills', 'missing-skill']);
  expect(stop).toHaveBeenCalledWith('Failed to fetch skill details');
  expect(error).toHaveBeenCalledWith(
    'Skill "missing-skill" not found. Try \`qaskills search missing-skill\`',
  );
  expect(outro).toHaveBeenCalledWith('');
  expect(process.exitCode).toBeUndefined();
});
\`\`\`

The exact module-mocking setup may vary with Vitest hoisting and the CLI test harness. Preserve the assertions even if the fixture uses dependency injection instead. The important facts are one rejected detail call, one failed stop, one recovery line, and no failing status mutation.

A unit test does not fully prove operating-system exit behavior. Add one built-process case that points \`QASKILLS_API_URL\` at a local server returning 404. Capture the process status and output after the command exits, then close the server in a guaranteed cleanup block.

## Which cases define missing skill CLI error?

A missing skill CLI error matrix should include 404, 500, rejected fetch, timeout, invalid JSON, and a normal success control. The current command collapses all thrown failures into one not-found line. Tests should expose that collapse rather than claiming that every failure truly means the record is absent.

The API path comes from \`packages/cli/src/lib/api-client.ts#getSkill\`. It applies \`encodeURIComponent\` to the supplied ID or slug, builds \`/api/skills/{encoded value}\`, then calls the generic request helper. This article does not audit encoding, but the controlled server should log the received path for diagnosis.

The request helper starts an \`AbortController\` and schedules a ten-second abort. It sends JSON content and user-agent headers, checks \`ok\`, parses JSON on success, and clears the timer in \`finally\`. A timeout fixture must therefore wait for the signal or use fake time at the helper level.

Do not make a required command test sleep for ten real seconds. At unit level, fake timers can advance the timeout while fetch remains pending and observes the abort signal. At process level, use a test seam for the duration or reserve the full timeout for a slower post-flow job.

Invalid JSON is different from a failed status. A 200 response with invalid JSON passes the \`ok\` check and then rejects during \`res.json()\`. The info catch still reports not found. That case proves why tests should describe the triggering condition even when terminal text is shared.

The positive control should return a minimal valid skill object and assert that the not-found line is absent. It also confirms the spinner follows the successful stop branch. Keep detailed formatting assertions in another suite because this topic owns only failure behavior.

The [FAQ page](/faq) may explain general product use, but it is not an error oracle. A test fixture should derive its expected text from the command source and its expected transport result from a local response. This keeps documentation changes from altering a CLI status test.

## skill detail request failure and the current QASkills contract

A skill detail request failure begins whenever \`request\` throws before returning parsed JSON. Non-success HTTP responses, fetch rejection, abort, and JSON decoding errors all qualify. The info command catches them at one boundary, which keeps the prompt flow alive but removes cause-specific detail.

The current error path can be summarized without spinner concerns:

\`\`\`typescript
try {
  const skill = await getSkill(skillName);
  // Render the successful detail view.
} catch {
  spinner.stop('Failed to fetch skill details');
  p.log.error(
    \`Skill "\${skillName}" not found. Try \\\`qaskills search \${skillName}\\\`\`,
  );
  p.outro('');
}
\`\`\`

The omitted catch binding is significant. A test should not expect the HTTP status, response body, abort name, or underlying message in terminal output. If future code adds cause-specific messages, update the matrix so 404 remains not found while server and network failures receive accurate labels.

There is also a privacy benefit to not printing arbitrary response bodies, since a server may return operational detail. However, the current message can misclassify an outage as missing content. A change proposal should balance useful categories with safe output rather than echoing every body.

The request helper always clears its timer in \`finally\`. Test that no pending timer remains after both success and failure, especially when fake timers are active. An open handle can make a command suite hang even when visible assertions pass.

The helper adds a fixed user agent and content-type header. Those are useful server observations, but they are not the main oracle for QASkills info missing skill handling. Keep them in transport tests so a prompt wording change does not obscure a header regression.

Use [TypeScript testing patterns](/blog/typescript-testing-patterns-guide) to type controlled fixtures without casting broad objects through the suite. A small skill factory can supply only the fields read by successful output, while failure rows need no skill payload at all.

## How do you test qaskills info exit code?

Test qaskills info exit code at two levels. First, call the command action with mocked dependencies and prove the catch leaves \`process.exitCode\` unset. Second, spawn the built CLI against a local 404 server and prove the child process currently exits with status zero after printing the recovery message.

Follow this procedure:

1. Build the CLI so the process test executes the shipped entry file.
2. Start a local HTTP server on an ephemeral port and return 404 for the detail path.
3. Set \`QASKILLS_API_URL\` only in the child process environment.
4. Run \`node dist/index.js info missing-skill\` and capture both output streams.
5. Assert the failed detail text, search suggestion, request count, and status zero.
6. Close the server, restore \`process.exitCode\`, and remove every temporary artifact.
7. Add a separate expected-failure test when implementation changes status to nonzero.

The process helper in \`packages/cli/e2e/e2e.mjs#run\` uses \`execFileSync\` with Node, the built CLI path, a controlled environment, piped output, and a timeout. Its current fast-command list tests only an existing info slug, so a missing-detail row would add coverage rather than duplicate it.

For a zero exit, \`execFileSync\` returns normally. If the implementation later sets status one, it throws an error object that contains child status and captured streams. Write the test so the expected state is explicit, not inferred from whether a helper happened to throw.

Reset \`process.exitCode\` after unit tests because it is global process state. A previous command test may leave it set and make the info test fail for the wrong reason. Child-process checks avoid that shared state but cost more time, so keep one strong process row and several fast unit rows.

The [getting started page](/getting-started) shows normal command use. For the regression fixture, a controlled server is safer than choosing a random missing production slug because a new catalog entry could turn that slug into a success later.

## CLI catch block testing failure and edge-case matrix

CLI catch block testing should name both the injected cause and the current terminal result. It should also record whether a failure status is set. This matrix makes a future UX change reviewable because one row shows exactly which message or process signal changed.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills info not found | Local 404 response | Failed spinner and search suggestion | Success detail view appears | \`packages/cli/src/commands/info.ts#infoCommand\` |
| Missing skill CLI error | Rejected fetch | Same current recovery line | Raw network error leaks | \`packages/cli/src/lib/api-client.ts#getSkill\` |
| Skill detail request failure | Local 500 with safe body | Same current recovery line | Server body shown as skill data | \`packages/cli/src/lib/api-client.ts#request\` |
| Invalid JSON | 200 with malformed body | Catch branch runs | Unhandled rejection | request JSON parsing |
| qaskills info exit code | Built process with 404 | Current status is zero | Assumed nonzero without code change | Commander action |
| Search suggestion error output | Name with ordinary punctuation | Exact input appears in suggestion | Missing or altered name | info catch branch |

A name containing terminal control characters requires a separate security review. Do not add such text to shared logs merely to increase edge-case count. Start with ordinary spaces and punctuation, then define sanitization requirements before asserting them.

The prompt calls \`outro\` with an empty string after failure. Lock that behavior only if layout is part of the supported command experience. The more durable assertions are the error message, suggestion, and process status.

Status-code semantics belong to HTTP, but user-facing categories belong to the application. A 404-specific improvement could retain not-found wording while other conditions say details could not be fetched. Until that change exists, tests should report the shared behavior honestly.

Do not reuse the success-response fixture for 404 rows. Native \`Response\` objects expose \`ok\` from status, so each row can use a real response shape. This gives better confidence than a loose object with an incorrectly configured \`ok\` field.

## How should search suggestion error output run in CI?

Search suggestion error output should run in a quick unit lane and one compiled process lane. The unit lane verifies prompt calls for every failure class. The process lane verifies terminal text and the actual status without requiring Clerk, a database, or the public QASkills service.

Commander owns command parsing and async action execution. The [Commander repository](https://github.com/tj/commander.js) documents the library, but the repository entry point determines whether it uses \`parseAsync\` and how errors leave the process. Exercise that actual entry in the compiled check.

Keep the local server minimal. It should bind to loopback on an ephemeral port, record one request, return a fixed status, and close even after assertion failure. Add a test timeout below the package gate timeout so a hung request gives a clear local failure.

Capture stdout and stderr because prompt libraries may choose either stream. Normalize ANSI sequences before matching text, but retain the raw output only when a failure needs diagnosis. Do not snapshot spinner animation frames or terminal-width padding.

Run the package build before this test because source-level execution can differ from the published bundle. The existing E2E helper already points to \`dist/index.js\`, which is a useful pattern. A missing build should fail early with a direct path message.

The CI report should state cause, visible message, and status. It should not state that the skill is absent when the fixture was a 500 or timeout. Clear test labels preserve the gap between current output and actual injected condition.

After local gates pass, an optional smoke test can query a controlled non-production record. Browse [categories](/categories) only for manual discovery, not as a dependency for the missing-skill check. QASkills info missing skill handling must remain deterministic.

## Implementation checklist for QASkills info missing skill handling

QASkills info missing skill handling is adequately covered when tests observe prompt calls, suggestion text, timer cleanup, request classes, and process status. The key finding is simple: the command presents a failure but currently does not mark the process as failed. Keep that fact visible in test names and release notes.

Use this compact checklist:

- Mock \`getSkill\` for direct prompt-branch tests.
- Cover 404, 500, rejection, abort, and invalid JSON causes.
- Assert one failed spinner stop and one search suggestion.
- Prove successful details do not enter the catch branch.
- Reset global exit status, fetch, timers, and prompt mocks.
- Spawn the compiled CLI once against a loopback server.
- Record current status zero and treat any desired change as product work.
- Avoid production catalog data in the required failure gate.

The evidence paths should remain linked to their responsibilities. \`packages/cli/src/commands/info.ts\` owns visible recovery, \`packages/cli/src/lib/api-client.ts\` owns status and parsing errors, and \`packages/cli/e2e/e2e.mjs\` owns the compiled-process pattern. This split gives each failed assertion a clear maintainer.

Review the output against the [SKILL.md format guide](/blog/skill-md-format-guide) only when a successful record renders bad metadata. That problem falls outside this failure-focused article. Keeping boundaries firm prevents one command suite from becoming a brittle full-product snapshot.

A good final report includes the requested slug, injected response class, normalized error line, request count, and exit status. It omits raw private response bodies. These details are enough to diagnose QASkills info missing skill handling without obscuring the actual branch.

Keep the child test short, since its main task is to prove status and text. Start one server, run one command, and close the server as soon as the child ends, since a long script with many routes makes it hard to tell which reply caused the result. Save the one request path so a failed run still shows that the detail call reached the fixture.

Use a plain skill name that cannot match a real row by chance, even though the server is local, since this makes the test name clear and keeps the same text in the path, error, and search hint. Do not use a secret, email, or user id as the missing name. Build logs should be safe to share with any project member.

When output spans both terminal streams, join normalized copies only for the final text check. Keep each raw stream in the failure report so the team can see where the prompt tool wrote it. This approach avoids a weak assertion that checks just one stream and misses a valid line. It also avoids a strict stream rule that the product never promised.

Set a clear test name such as \`prints a search hint but exits zero for a missing skill\`. That name records the current gap and prevents a future reader from assuming status one. If the product changes the status, the test name, expected value, and release note must change together. The [blog index](/blog) can explain the new rule after source and tests agree.

Review the catch each time a new error type enters the request path. If all causes still share one message, add the cause to the matrix and keep the result honest. If the command gains distinct text, split the row and assert each safe phrase. This small habit keeps QASkills info missing skill handling tied to code rather than old docs.

## Frequently Asked Questions

### What does qaskills info not found verify in QASkills?

It verifies the catch branch after \`getSkill\` rejects. Assert the failed spinner text, the message naming the requested skill, the suggested search command, and the empty outro. Keep a separate assertion for process status because visible failure text alone does not prove automation receives failure.

### When should a team test missing skill CLI error?

Run the test whenever info command wording, API request behavior, Commander setup, or prompt integration changes. Keep it in the normal CLI gate because a status regression can affect scripts. Use a controlled 404 response so a new production catalog entry cannot invalidate the fixture.

### How can a fixture isolate skill detail request failure?

Stub \`getSkill\` for command-only checks, then use a loopback HTTP server for one compiled process check. Return fixed statuses and bodies, capture the request, and close the server in cleanup. This isolates failure classification without database access, credentials, or public network timing.

### Which assertion proves qaskills info exit code?

A spawned built process is the strongest proof. Inspect its numeric status after a controlled missing-detail response. Current source catches the error without setting \`process.exitCode\`, so the expected status is zero. A unit assertion that global exit state stays unset supports, but does not replace, that check.

### What failure cases belong in CLI catch block testing tests?

Include HTTP 404, HTTP 500, fetch rejection, abort, invalid success JSON, and one valid response. The first five currently share terminal wording, while the last proves the catch is not unconditional. Name each injected cause so reports do not confuse an outage with an absent skill.

### How should CI run search suggestion error output checks?

Run prompt-call tests with mocks on each relevant change, then run one compiled child process against a local server. Strip terminal color only for comparison, preserve raw output on failure, and enforce cleanup. Do not use a random production slug or snapshot spinner animation frames.

## Conclusion

QASkills info missing skill handling has a clear message contract and a surprising status boundary. Every thrown detail error becomes the same not-found suggestion, while the current catch resolves without marking process failure. Tests should preserve that truth and make any future classification or status change explicit.

Use the [getting started instructions](/getting-started) to run the command, then compare successful records with the live [skills catalog](/skills). Add the local 404 process case before changing this command so users and scripts receive behavior that matches the documented decision.`,
};
