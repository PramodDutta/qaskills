import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'qaskills init in CI',
  description:
    'Run qaskills init in CI without prompts, validate template flags, assert generated SKILL.md metadata, handle non-TTY jobs, and fail on bad values.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'qaskills init in CI',
  keywords: [
    'qaskills init in CI',
    'qaskills non-interactive init',
    'SKILL.md scaffold flags',
    'CI non-TTY command',
    'QA skill template validation',
    'unknown framework error',
    'generated SKILL.md assertion',
    'qaskills init exit code',
  ],
  relatedSlugs: [
    'qaskills-cli-download-fallback-github-content-metadata',
    'qaskills-cli-extract-skill-package-github',
    'qaskills-add-custom-directory-ci',
    'qaskills-cli-disable-telemetry-do-not-track',
  ],
  sources: [
    'https://nodejs.org/api/tty.html',
    'https://github.com/tj/commander.js#readme',
    'https://nodejs.org/api/fs.html',
  ],
  content: `Run qaskills init in CI with \`--yes\` or explicit metadata flags so the process never waits for input, and the command also detects a non-TTY environment. A reliable job checks accepted terms, reads the new SKILL.md, checks process status, and uses an isolated work folder.

The code in \`packages/cli/src/commands/init.ts\` writes one file at \`process.cwd()/SKILL.md\` for entries in the [QA skill catalog](/skills). CI tests should prove this flow with no prompt, using the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) as a mature package example.

## How Does qaskills Non-Interactive Init Work?

Three signals select qaskills non-interactive init: \`--yes\`, any truthy metadata flag, or input and output without usable TTY streams. Thus, a piped shell and a hosted CI job avoid prompts even when \`--yes\` is absent.

The command gets \`interactive\` from \`process.stdin.isTTY && process.stdout.isTTY\`, as covered by Node's [TTY guide](https://nodejs.org/api/tty.html). A CI test should use stream state, not just one vendor's environment flag.

In non-interactive mode, blank fields use defaults such as \`my-{template}-skill\`, \`your-github-username\`, and \`typescript\`. The default type is \`e2e\` for Playwright, Cypress, and generic, while API uses \`api\`.

Framework defaults are narrower: Playwright and Cypress use their own IDs, while API, generic, and unknown templates use \`none\`. That value becomes an empty \`frameworks\` array, and all templates set the \`web\` domain plus five agent IDs.

One explicit flag makes the whole command non-interactive, while all other fields still use defaults. For example, \`--name checkout-api\` asks for neither a description nor an author, so tests should lock this mixed mode.

\`\`\`bash
npx qaskills@<pinned-version> init playwright \
  --yes \
  --name playwright-browser-policy \
  --description "Playwright browser policy checks for AI coding agents." \
  --author qa-platform \
  --testing-type e2e \
  --framework playwright \
  --language typescript
\`\`\`

The command writes in the active work folder and can replace an old SKILL.md, so each test needs a fresh temp folder. The [guide to writing high-quality QA skills](/blog/how-to-write-high-quality-qa-skills) helps teams review this new starting point before they publish it.

## Which SKILL.md Scaffold Flags Are Required?

SKILL.md scaffold flags are optional at the Commander layer, but production CI should supply identity fields explicitly. The accepted options are \`--name\`, \`--description\`, \`--author\`, \`--testing-type\`, \`--framework\`, and \`--language\`, plus \`--yes\` to state intent.

The [Commander guide](https://github.com/tj/commander.js#readme) covers CLI option parsing, where each value option gets a string. The command, not Commander, checks those strings against shared \`TESTING_TYPES\`, \`FRAMEWORKS\`, and \`LANGUAGES\`.

| Flag | Missing-value behavior | Recommended CI policy |
|---|---|---|
| \`--name\` | \`my-{template}-skill\` | Supply a stable package name |
| \`--description\` | Template-based sentence | Supply a precise purpose |
| \`--author\` | \`your-github-username\` | Supply an accountable owner |
| \`--testing-type\` | Template map or \`e2e\` | Supply a shared vocabulary ID |
| \`--framework\` | Template framework or \`none\` | Supply ID or explicit \`none\` |
| \`--language\` | \`typescript\` | Supply the implementation language |

The template argument controls body text and defaults, with known values \`playwright\`, \`cypress\`, \`api\`, and \`generic\`. An unknown name does not fail; it gets generic body text, an \`e2e\` type, no framework, and identity text based on that name.

QA skill template validation should cover both flag terms and template names because the command checks only the flag terms. A job can allow known template strings in a wrapper or check the body after the file is made.

The generated frontmatter always includes version \`1.0.0\`, license \`MIT\`, one tag matching the testing type, one testing type, language, web domain, and five agent IDs. Framework is omitted from the array only when the selected value is \`none\`.

The [SKILL.md format guide](/blog/skill-md-format-guide) shows the resulting metadata shape, but optional flags do not make clear identity optional for a published skill. Defaults start the file, while team review makes it exact.

## Why Must a CI Non-TTY Command Avoid Prompts?

A CI non-TTY command has no person to answer text or select a choice, so a prompt can wait until timeout and waste a runner. The command must pick non-interactive mode before it calls any prompt helper.

The current command picks its mode before \`p.intro\` or any input call, then writes SKILL.md and one path line in a non-TTY child. Tests can pipe stdin and read stdout to prove it exits without prompt text.

Do not test this only by setting \`CI=true\`. The code does not read that variable. Spawn the built CLI with \`stdio: ['pipe', 'pipe', 'pipe']\`, close stdin, and enforce a short test timeout. A successful process should exit zero before the timeout and leave a file.

\`\`\`typescript
import { spawn } from 'node:child_process';
import path from 'node:path';

const child = spawn(
  process.execPath,
  [path.resolve('dist/index.js'), 'init', 'playwright', '--name', 'ci-skill'],
  {
    cwd: workspace,
    stdio: ['pipe', 'pipe', 'pipe'],
  },
);

child.stdin.end();
const status = await new Promise<number | null>((resolve, reject) => {
  const timer = setTimeout(() => {
    child.kill();
    reject(new Error('qaskills init did not exit in a non-TTY process'));
  }, 5_000);
  child.once('exit', (code) => {
    clearTimeout(timer);
    resolve(code);
  });
});

expect(status).toBe(0);
\`\`\`

Capture stderr and include it when a timeout or nonzero status fails. Avoid snapshots of colors. Assert that prompt labels such as \`Skill name:\` are absent and that the expected created message is present.

A second test can pass \`--yes\` inside a simulated TTY adapter if the command is refactored for injection. Child-process tests on ordinary CI cannot easily create a true pseudoterminal, so unit tests should own that branch. The merge gate mainly needs proof that the real non-TTY path completes.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) explains command jobs and artifacts. Keep the scaffold process timeout shorter than the overall job so a regression produces a focused error.

## Build QA Skill Template Validation

QA skill template validation should compare the command inputs with the serialized frontmatter and body. It should also prove that known invalid values fail before \`fs.writeFile\`. This makes the generator contract visible at its public output.

The validation code uses shared arrays and \`.some((item) => item.id === value)\`. Matching is exact and case-sensitive. \`playwright\` can be valid while \`Playwright\` fails. Tests should use IDs from shared constants rather than display labels.

Start with one table-driven success case per template. Parse the generated document through \`parseSkillMd\` and assert name, testing type, framework, language, domain, and agents. Inspect a small template-specific phrase in the body, such as Playwright web-first assertions.

Then add invalid testing type, framework, and language cases. Each bad value prints a line beginning with \`Unknown ...\` and calls \`process.exit(1)\`. A child process is the safest way to test this because it observes the real qaskills init exit code without mocking global process termination.

\`\`\`typescript
const cases = [
  ['testing type', ['--testing-type', 'browser-everything'], 'Unknown testing type'],
  ['framework', ['--framework', 'playwrite'], 'Unknown framework'],
  ['language', ['--language', 'type-script'], 'Unknown language'],
] as const;

for (const [label, args, message] of cases) {
  it(\`rejects an unknown \${label}\`, async () => {
    const result = await runCli([
      'init',
      'playwright',
      '--yes',
      '--name',
      'invalid-fixture',
      ...args,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(message);
    await expect(fs.access(path.join(result.cwd, 'SKILL.md'))).rejects.toThrow();
  });
}
\`\`\`

The no-file assertion is critical. A useful validation error must happen before a partial artifact appears. Run every case in a fresh directory so a file from an earlier success cannot create a false failure.

Current code validates three vocabulary fields only. It does not enforce name length, description length, author quality, or known template names at this stage. Apply the full shared schema after generation with the [SKILL.md CI validation guide](/blog/validate-skill-md-in-ci-pipeline).

## How Should an Unknown Framework Error Fail?

An unknown framework error should print the rejected value, list valid IDs, terminate with status one, and leave no generated SKILL.md. The current command does exactly that by setting \`badFramework\`, writing through \`console.error\`, and calling \`process.exit(1)\`.

The value \`none\` is a deliberate exception. It is accepted even though it is not an item in \`FRAMEWORKS\`, and it results in an empty frameworks list. Test \`none\` as a valid control before testing misspellings.

Do not assert the complete list of valid frameworks in one frozen string. The shared catalog can add IDs, which should not break the error behavior test. Assert the rejected value, \`Valid:\`, and a few stable IDs relevant to the chosen template.

Use a near miss such as \`playwrite\`, not a value that might become a real framework later. Capture status and stderr:

\`\`\`bash
set +e
output="$(
  npx qaskills@<pinned-version> init playwright \
    --yes \
    --name invalid-framework \
    --framework playwrite 2>&1
)"
status=$?
set -e

test "$status" -eq 1
printf '%s' "$output" | grep -q 'Unknown framework "playwrite"'
test ! -e SKILL.md
\`\`\`

This shell is appropriate for a smoke test, while the repository suite should use a child-process helper that reports stdout, stderr, status, and timeout cleanly. Never append \`|| true\` to the generator in a validation job.

The command can report more than one invalid field because it calculates all three booleans before exiting. Add one combined case and assert all relevant diagnostics appear. Keep individual cases too, since they locate a regression faster.

## Add a Generated SKILL.md Assertion

A generated SKILL.md assertion should parse frontmatter and inspect template body content. File existence alone cannot prove that flags were honored, and a full text snapshot can fail on harmless formatting changes.

Use the shared parser as a consumer would. Compare arrays semantically and check exact values supplied by CI. Verify that framework \`none\` produces an empty array, not the string \`none\`. Check that version and license defaults remain present.

The [Node file system API](https://nodejs.org/api/fs.html) documents the \`writeFile\` and \`readFile\` operations used by generation and testing. Read as UTF-8, then pass the string to the parser. A non-empty file check remains useful before parsing because it gives a clearer transport error.

\`\`\`typescript
const raw = await fs.readFile(path.join(workspace, 'SKILL.md'), 'utf8');
expect(raw.length).toBeGreaterThan(0);

const parsed = parseSkillMd(raw);
expect(parsed.frontmatter).toMatchObject({
  name: 'playwright-browser-policy',
  author: 'qa-platform',
  version: '1.0.0',
  license: 'MIT',
  testingTypes: ['e2e'],
  frameworks: ['playwright'],
  languages: ['typescript'],
  domains: ['web'],
});
expect(parsed.content).toContain('Use web-first assertions');
\`\`\`

Also assert the output path. Since qaskills init in CI always writes \`SKILL.md\` to the current directory, an unexpected nested file indicates the command ran from the wrong workspace. Use a job-specific directory to avoid overwriting repository documentation.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) is much richer than a scaffold. Treat generated content as a reviewed starting point, then add focused references and operating rules before publication.

## Verify the qaskills init Exit Code

The qaskills init exit code is zero after successful generation and one for an invalid testing type, framework, or language. Unhandled write errors also produce a nonzero process status through Node, although their exact code and message can vary.

Test status at the executable boundary after building the CLI. Import-level unit tests can verify serialization, but only a child process proves that \`process.exit(1)\`, Commander parsing, and file writing combine into the expected shell result.

Capture four outputs for every run: exit status, stdout, stderr, and files created. A status without file evidence can be false confidence. A file without status can hide a process error printed after writing.

Use an isolated directory that is writable for success and intentionally unwritable only in a platform-specific error suite. Permission behavior differs for privileged containers, so do not make a brittle chmod test the only write-failure check.

Success output includes the created absolute path. Assert a stable substring rather than color bytes. Invalid vocabulary goes to stderr through \`console.error\`, while the successful line goes to stdout.

The [SKILL.md format reference](/blog/skill-md-format-guide) provides semantic checks after status zero. Put status, path, and parser assertions in one high-value integration case, then use smaller table cases for each invalid flag.

## Run the CI Scaffold Procedure

Run qaskills init in CI through a fixed sequence that protects the repository and makes every assumption visible. Keep each step small so its failure points to one clear part of the scaffold flow.

1. Build or install a pinned QASkills CLI under Node 20 or the supported project runtime.
2. Create a unique empty working directory owned by the job.
3. Run \`init\` with a known template, \`--yes\`, and explicit identity and vocabulary flags.
4. Capture stdout, stderr, status, and elapsed time with a bounded process timeout.
5. Require status zero and exactly one root SKILL.md in the fixture directory.
6. Parse frontmatter and compare every supplied value plus stable defaults.
7. Inspect one template-specific body rule and run the full skill validator.
8. Execute invalid vocabulary cases and require status one with no output file.
9. Upload the scaffold only when a later job needs it, then remove the fixture.

Use a matrix when the project publishes several template kinds. Keep names unique per matrix entry because each process writes the same filename within its own working directory.

The [QA skill catalog](/skills) can provide examples for editorial review, but CI should not copy catalog text into the assertion. Generated output is determined by the installed CLI version and explicit flags.

Build one child-process helper that accepts args, working directory, environment, and a short limit. Return status, stdout, stderr, elapsed time, and the final root file list.

That helper should end stdin at once because qaskills init in CI must not wait for input. A closed stream makes the non-TTY rule part of each real command test.

Keep one success case with \`--yes\` and one success case with only explicit flags. Both should create the same semantic fields when given the same values.

Add a third case with no flags and piped streams to check safe defaults. It should finish with generic content because the process has no usable terminal.

The qaskills init in CI suite should also run each known template once. Compare one body phrase and the default type or framework, not the whole Markdown file.

For Playwright, check \`e2e\`, \`playwright\`, and the web-first assertion rule. For Cypress, check \`e2e\`, \`cypress\`, and the network stub rule.

For API, check the \`api\` testing type and an empty framework list. For generic, check \`e2e\`, no framework, and the independent test rule.

Use plain fixture names without spaces for the base matrix, then add one focused name with spaces. The parser should keep that name because it is a frontmatter value, not a file path.

Descriptions with a colon or quote need their own serializer test in the shared package. This command test should still parse one normal sentence and compare it with the supplied text.

Record the current template name in the test label so a failed matrix row is clear. Do not infer the template from body text after the process has already failed.

When qaskills init in CI exits one, list the fixture root before cleanup. An empty list proves no artifact was written, while a stale SKILL.md points to bad test setup.

Seed a SKILL.md before one success run to show that current code overwrites it. The test should assert the new identity and treat overwrite as a known reason for using a clean folder.

Do not place that overwrite case in a real source root. Use a disposable directory and a clear old marker that can never look like valid new output.

The qaskills init exit code test should not share a folder with the success matrix. A file from status zero could make a later invalid case seem to write partial output.

Use a fresh child environment with only the needed inherited values. Remove flags that change color or package behavior when they are not part of the command contract.

Print the CLI version in test logs because template text can change with a release. Pinning and reporting the version make an expected body change easy to review.

Run the built file with the active Node binary instead of a global command. This checks the exact bundle produced by the branch and avoids a stale global package.

The qaskills init in CI process should write one success line after the file is saved. Read the file as the main fact and use the line only to help a person find its path.

If the child prints prompt labels, fail even when a file appears later. A prompt in a non-TTY job signals a mode bug that may hang on another runner.

Add a test timeout that is long enough for Node startup but far shorter than the job limit. Kill the child and include captured streams when that local limit expires.

Do not retry a timed-out scaffold in the same test. A retry can hide a prompt race and leave two child processes writing the same file.

After parse checks pass, run the skill validator as a separate command or function. Its error should name schema quality, while the init test should name scaffold flow.

The [custom qaskills install directory guide](/blog/qaskills-add-custom-directory-ci) can consume the fresh file as a local skill fixture. Copy it to a new base and compare the parsed identity after install.

Keep that copy in one end-to-end case rather than every template row. The generator matrix should stay fast and focus on mode, defaults, validation, and write behavior.

For a branch that changes shared vocabulary, run invalid near-miss cases and one new valid ID. This proves qaskills init in CI reads the same constants as the rest of the workspace.

Do not hard-code the full list in the test fixture because new valid items will change it. Import shared IDs for valid cases and use fixed bad text for failure cases.

An unknown template is different from an unknown framework in current code. The first falls back to generic body text, while the second ends the process before any write.

Name those tests so no reviewer mistakes the fallback for template validation. If product policy later rejects unknown templates, change both the implementation and this stated contract.

Check file encoding by reading UTF-8 and finding plain ASCII fixture text. The command writes UTF-8 through the Node file API, so no byte order mark should be needed.

For cross-platform jobs, compare parsed values rather than line endings. The serializer may use one line style, while source checkout settings should not change semantic output.

The qaskills init in CI lane should save the failed SKILL.md only when a success case produces bad content. Invalid input cases should have no file to upload.

Use one summary table in CI that shows template, status, parse result, and validator result. Keep full child logs attached to the failed row instead of mixing all output.

The qaskills init in CI contract is small enough to test on each CLI pull request. Fast child cases catch prompt, flag, exit, and path bugs before a user starts a new skill.

End the suite by removing each fixture root and checking no child still runs. Clean process and file state keeps the next test from inheriting a false signal.

## Choose Safe Defaults for Templates

Running qaskills init in CI is predictable when non-interactive selection, vocabulary validation, output location, and process status all have tests. Explicit flags produce clearer ownership than placeholder defaults, even though the command can scaffold with no supplied metadata.

Keep generation in an empty directory because the command overwrites \`SKILL.md\`. Treat unknown template names as a current validation gap, while continuing to require known testing type, framework, and language IDs. Parse output instead of accepting file presence alone.

Start with the [guide to high-quality QA skills](/blog/how-to-write-high-quality-qa-skills), validate the result through the [SKILL.md CI pipeline](/blog/validate-skill-md-in-ci-pipeline), and compare mature examples in [QASkills](/skills). The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) shows how a basic scaffold can grow into a complete package.

## Frequently Asked Questions

### Is --yes required in a hosted CI runner?

Usually not, because redirected input or output makes the command non-interactive automatically, but \`--yes\` states intent and protects scripts if stream setup changes. Explicit metadata flags also select qaskills non-interactive init without relying on TTY detection in practice for each job.

### Where does qaskills init write the file?

It writes \`SKILL.md\` directly under \`process.cwd()\`. There is no output-directory flag in the current command. Create an empty fixture directory, set it as the child process working directory, and move or upload the generated file only after validation succeeds for later review.

### What happens when only one metadata flag is passed?

Any truthy metadata flag switches the complete command to non-interactive mode. The supplied value is used, and every missing field receives its template default. Tests should verify this mixed mode so a future prompt change cannot make partial scripted input wait for a person.

### Is none a valid framework?

Yes. The literal value \`none\` bypasses framework-list validation and serializes to an empty \`frameworks\` array. Other values must exactly match a shared framework ID. Use lowercase IDs in scripts and assert semantic arrays after parsing the generated document in every test.

### Does the command reject an unknown template?

No. Current code falls back to generic body content for an unknown template and derives several defaults from the supplied text. A CI wrapper should allow known templates, or the post-generation assertion should inspect expected body content. Do not claim template-name validation already exists.

### What should a failed generation test assert?

Require a nonzero status, a useful field-specific diagnostic, and no SKILL.md in the fresh working directory. Also enforce a timeout so an accidental prompt fails quickly. These checks distinguish validation failure from a hung command or a stale file left by another case.`,
};
