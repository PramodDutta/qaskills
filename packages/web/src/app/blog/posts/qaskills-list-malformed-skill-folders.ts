import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills list malformed skill folders',
  description:
    'QASkills list malformed skill folders: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills list malformed skill folders',
  keywords: [
    'QASkills list malformed skill folders',
    'qaskills list malformed SKILL.md',
    'skill folder parse failure',
    'missing SKILL.md list output',
    'continue after invalid skill',
    'agent skills scan errors',
    'CLI malformed package marker',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'malformed-skill-md-frontmatter-parser-tests',
    'error-handling-testing-patterns',
    'qaskills-add-custom-directory-ci',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://yaml.org/spec/1.2.2/',
    'https://github.com/jonschlinkert/gray-matter',
  ],
  repoEvidence: [
    'packages/cli/src/commands/list.ts#listCommand',
    'packages/shared/src/parsers/skill-parser.ts#parseSkillMd',
    'packages/shared/src/schemas/skill-schema.ts#skillFrontmatterSchema',
    'packages/cli/src/lib/agent-detector.ts#detectAgents',
  ],
  content: `QASkills list malformed skill folders scans every child directory independently. When reading or parsing one child's SKILL.md throws, the command prints a hollow marker with the folder name and "(no SKILL.md)", then continues. A valid read increments the total, even when parsed metadata would fail the separate publication schema.

That distinction comes directly from \`packages/cli/src/commands/list.ts\` and the shared parser. Tests should create mixed child folders, capture prompt output, and prove scan continuation without treating all malformed metadata as a parser exception.

## What does QASkills list malformed skill folders guarantee?

QASkills list malformed skill folders guarantees per-child failure containment inside an existing detected skills directory. One missing, unreadable, or parser-rejected SKILL.md does not stop later child folders from being scanned.

\`listCommand\` first calls \`detectAgents\` at \`packages/cli/src/lib/agent-detector.ts#detectAgents\`; for each result, it reads the skill root and checks each child folder. A nested try-catch surrounds only that child's read and parse.

On success, the command logs a filled marker, parsed name, version, description, and test types, then increments \`totalSkills\`. On any child exception, it logs a hollow marker with the directory name and the literal text \`(no SKILL.md)\`.

The catch does not inspect the error, so missing files, access faults, bad YAML, and other read failures share the same display. Tests should assert that broad current behavior, then keep more detailed messages as a separate product proposal.

The outer directory catch is different. If reading the skills directory fails, the command prints \`Skills directory not found\`. This guide does not merge that parent case into QASkills list malformed skill folders because it exercises another catch boundary.

That split should appear in test names: one group can say "child package errors," while another says "agent skill root errors." If both use the same name, a failed output check gives the team less help.

The child catch also wraps the lines that build success text, so a rare value that throws during display takes the same marker path. Tests should not state that the catch covers file work alone.

The [SKILL.md format guide](/blog/skill-md-format-guide) describes valid package metadata. The listing contract is less strict because \`parseSkillMd\` normalizes values but does not call the Zod publication schema.

## How does qaskills list malformed SKILL.md work?

Qaskills list malformed SKILL.md handling wraps \`readFile\`, \`parseSkillMd\`, and success formatting in one child-level try block. Any thrown error selects the same marker and lets the surrounding loop move forward.

The public command at \`packages/cli/src/commands/list.ts#listCommand\` uses \`readdir\` with entry types, so plain root files are ignored. Only entries whose \`isDirectory()\` returns true become package candidates.

The [Node file system API](https://nodejs.org/api/fs.html) defines the promise read and directory entry objects used here; QASkills asks for types in the same call. It then filters the array in memory.

This means a root text file is skipped before the inner try starts and does not cause a child error line. A test that expects a marker for that file would describe a scan that the command does not perform.

For each candidate, the path is exactly \`path.join(skillsDir, dir.name, 'SKILL.md')\`; the scan does not search deeper or accept a lowercase name. A child containing \`docs/SKILL.md\` but no root SKILL.md receives the missing marker.

The parser at \`packages/shared/src/parsers/skill-parser.ts#parseSkillMd\` sends frontmatter work to gray-matter, whose [project page](https://github.com/jonschlinkert/gray-matter) documents it. QASkills then builds its own object and trims body text.

Missing scalar fields receive defaults: name, description, and author become blank, while version becomes \`1.0.0\` and license becomes \`MIT\`. Array fields accept lists or comma text and become an empty list for other values.

The body is trimmed but never shown by list, so a long body or blank body can follow the same branch. Body quality belongs to a validator or publish check, not this output test.

The parser also keeps the raw input in its return value. List does not read that field. Do not add raw-text expectations to a command suite that only uses parsed frontmatter.

Therefore, a syntactically valid document with missing required fields can still count as listed. That is not a claim that the skill is publishable. The [malformed frontmatter parser test guide](/blog/malformed-skill-md-frontmatter-parser-tests) covers parser boundaries in more detail.

## Which cases define skill folder parse failure?

A skill folder parse failure suite needs a valid package, a missing file, an unreadable file or mocked read rejection, malformed YAML that throws, and syntactically valid but incomplete metadata. Put them in one detected skills directory so continuation is observable.

Name the folders with a stable lexical prefix if order matters, but do not assume \`readdir\` ordering as a portable product contract. Instead, capture all log calls and search them by unique folder or skill name. The key assertion is presence, not relative display order.

The valid fixture should include every field used by display formatting. Give it a name, semantic version, description, and at least one testing type. This avoids an accidental formatting exception that would turn the control fixture into a hollow marker.

Use short ASCII names in core fixtures so terminal encoding is not part of the branch. A separate display test can cover other scripts and marks. The QASkills list malformed skill folders suite should first prove read, parse, continue, and count.

The missing fixture is simply a child directory without SKILL.md. The unreadable case is hard to express portably with permission bits because privileged runners may still read it. Mock \`fs.readFile\` for one exact path, or use a deterministic platform-specific test only where permissions are controlled.

When the read mock sees any other path, call the real function or return the saved fixture text. A broad rejection would make both valid controls fail. Exact path matching is what lets the loop prove it can move on.

Malformed YAML should be selected because gray-matter actually rejects it, not because it merely violates QASkills rules. The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) is the authority for YAML syntax. Verify the fixture against the current parser before relying on its failure.

An incomplete but parseable fixture is essential. It proves that parsing and schema validation are different operations. If a future refactor calls \`skillFrontmatterSchema.parse\` inside list, this characterization case will fail and expose the new contract.

Name that case "lists parser defaults without schema validation." The name prevents a later reader from treating blank fields as a desired content rule. It is a record of present command flow and a cue to review any planned change.

\`\`\`typescript
const valid = \`---
name: API Contract Checks
description: Validate service contracts before release.
version: 1.0.0
author: QA Team
license: MIT
testingTypes: [api]
languages: [typescript]
---

Use contract fixtures.
\`;

const incomplete = \`---
testingTypes: api
---

Missing required publication fields.
\`;

await fs.mkdir(path.join(skillsDir, '01-valid'), { recursive: true });
await fs.mkdir(path.join(skillsDir, '02-missing'), { recursive: true });
await fs.mkdir(path.join(skillsDir, '03-incomplete'), { recursive: true });
await fs.writeFile(path.join(skillsDir, '01-valid', 'SKILL.md'), valid);
await fs.writeFile(path.join(skillsDir, '03-incomplete', 'SKILL.md'), incomplete);
\`\`\`

This setup uses real files for read and parse behavior. Mock only agent detection and prompt logging around it. The [custom directory CI guide](/blog/qaskills-add-custom-directory-ci) offers related ideas for isolated CLI paths.

Add the second valid folder after all writes are done. The disk order may still vary, so search captured lines by text. What matters is that its name is present after one child failed, not that it has the last array index.

A four-child root gives a useful count: two valid, one missing, and one parser error. The final total should be two. That single number backs up the four line checks without replacing them.

## missing SKILL.md list output and the current QASkills contract

Missing SKILL.md list output contains the folder name and \`(no SKILL.md)\` beside a hollow marker. It does not explain whether the file was absent, unreadable, malformed, or rejected during display formatting.

The command styles text with picocolors before passing it to \`p.log.info\`. Color behavior can differ when terminal color support changes, so test semantic text after stripping ANSI sequences or configure colors off. Do not assert raw escape codes unless color itself is under test.

The displayed marker is a hollow circle in production source, but this article and its metadata remain ASCII. A test can avoid encoding dependence by asserting the folder name and suffix. The source still establishes which branch ran.

If the test disables color, check the plain suffix exactly. If it strips color, assert that the stripped line ends with the same suffix. Both styles keep the CLI malformed package marker stable without locking a terminal escape code.

When \`--agents\` is present, the command never scans child folders. It prints each detected agent and returns after its outro. Malformed child tests must invoke the default action without that option, or they will falsely report no marker.

When an existing skills directory has no child directories, the command prints \`No skills installed\`. A root file named SKILL.md does not count as a child package. This boundary should have its own case because it differs from one malformed child.

The empty message is written once for that agent. It does not change the total and does not stop the next detected agent. A multi-agent case can prove that the outer loop also moves on.

QASkills list malformed skill folders also affects the final total. Only successful child parses increment \`totalSkills\`. The outro includes that total across all detected agents, so one malformed package should not count while later valid packages should.

Test one valid package under each of two fake agents if aggregate count has changed before. The total should be two even when one root also has a bad child. Keep this wider case after the simpler one-root suite.

Use the public [skills catalog](/skills) only as a source of fixture ideas. Listing installed files is local behavior, and a deterministic test should not fetch catalog data.

## How do you test continue after invalid skill?

Test continue after invalid skill by placing valid packages on both sides of a failing child, invoking the command once, and asserting both valid names plus the failing folder marker and final total. Do not stop after proving that the error was caught.

Mock \`detectAgents\` to return one controlled agent result whose \`skillsDir\` points at the temporary root. That keeps personal agent folders out of the scan and avoids the universal record adding an unrelated directory.

Mock the prompt library's spinner and log methods. The action calls \`p.intro\`, starts and stops a spinner, writes several info lines, and ends with \`p.outro\`. Capturing those calls gives a stable command-level boundary without rendering a real terminal.

The command object wraps its action, so existing CLI tests may invoke \`parseAsync\` with a minimal argv. If importing the shared singleton introduces command state between tests, create a helper that retrieves the action or resets command options according to the project's established test style.

Pass argv in the same shape that Commander expects for the selected parse mode. A wrong argv can lead to help output instead of the action. Assert that the spinner started once so the test proves it entered the scan.

\`\`\`typescript
vi.mock('../lib/agent-detector', () => ({
  detectAgents: () => [
    {
      definition: { id: 'fixture', name: 'Fixture Agent' },
      skillsDir,
      exists: true,
      scope: 'project',
    },
  ],
}));

await listCommand.parseAsync(['node', 'qaskills', 'list']);

const output = vi
  .mocked(p.log.info)
  .mock.calls.map(([message]) => stripAnsi(String(message)))
  .join('\\n');

expect(output).toContain('API Contract Checks');
expect(output).toContain('02-missing');
expect(output).toContain('(no SKILL.md)');
expect(output).toContain('UI Smoke Checks');
expect(p.outro).toHaveBeenCalledWith('2 skill(s) installed across 1 agent(s)');
\`\`\`

The mock definition above is intentionally abbreviated for readability. A compiled repository test should provide a complete \`AgentDefinition\` fixture or use \`satisfies\` so type drift becomes visible.

Capture the final outro apart from info lines. It has the count and number of detected agents, while info holds each package result. This split gives cleaner failures than one large joined snapshot.

Follow this numbered procedure:

1. Create a unique temporary skills directory and three or more child folders.
2. Write complete SKILL.md files for two controls and one deterministic failing fixture between them.
3. Return only that directory from mocked \`detectAgents\`, then capture prompt log and outro calls.
4. Invoke the default list action and assert both successes, the hollow failure marker text, and the exact successful total.
5. Restore mocks and remove the entire temporary tree in \`afterEach\`, even after failed assertions.

This is the core QASkills list malformed skill folders regression. It proves continuation, presentation, and counting together while keeping parser-specific cases available for narrower shared-package tests.

After the command case, call \`parseSkillMd\` directly for the incomplete input and run \`skillFrontmatterSchema.safeParse\` on its frontmatter. The first should return data and the second should fail. Two direct assertions explain why the current list branch counts it.

Keep that schema pair in the shared package if package boundaries make the CLI test hard to read. The [FAQ](/faq) can answer user questions, but source-level tests should own this exact distinction.

## agent skills scan errors failure and edge-case matrix

Agent skills scan errors need a matrix because several failures intentionally share one message. The expected result should identify the observable branch without inventing a more specific diagnosis.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| Qaskills list malformed SKILL.md | Complete valid document | Filled success entry and total increment | Valid package receives hollow marker | \`packages/cli/src/commands/list.ts\` |
| Skill folder parse failure | YAML that makes gray-matter throw | Folder gets \`(no SKILL.md)\` and scan continues | Command rejects or later package is absent | \`packages/shared/src/parsers/skill-parser.ts\` |
| Missing SKILL.md list output | Child directory with no file | Folder-level failure marker | Parent-level missing message | \`packages/cli/src/commands/list.ts\` |
| Continue after invalid skill | Invalid child between two valid children | Both valid names and total two | Loop ends after invalid child | \`packages/cli/src/commands/list.ts\` |
| Parseable incomplete metadata | Valid YAML missing required fields | Current parser returns defaults and list counts it | Test incorrectly expects schema failure | \`packages/shared/src/parsers/skill-parser.ts\` |
| CLI malformed package marker | Read rejects for one child | Generic marker without thrown command error | Raw filesystem error escapes | \`packages/cli/src/commands/list.ts\` |

The incomplete metadata row is easy to misunderstand. \`skillFrontmatterSchema\` at \`packages/shared/src/schemas/skill-schema.ts#skillFrontmatterSchema\` requires name, description, author, at least one testing type, and at least one language. The list command never invokes that schema.

One edge case sets \`testingTypes\` to an object. \`toStringArray\` returns an empty array, and joining it yields an empty display line. No exception is guaranteed. Use parser facts rather than labeling every unusual field as malformed.

Another edge case sets testingTypes to a comma-separated string. The parser splits and trims it, so list prints the values with a comma and space. This positive row guards a real normalization branch without making the command test parse YAML itself.

Another edge case puts a file where a child directory should be. The initial filter ignores it, so no package marker appears. This is different from a child directory whose SKILL.md is missing.

A read error after one valid skill should not reduce the already counted total. A later valid child should still increase it. The final outro is the easiest aggregate assertion for this behavior.

The command has no rollback because listing does not write package state. An error line changes output only. Assert that fixture files remain in place if a future refactor adds cleanup work by mistake.

## How should CLI malformed package marker run in CI?

A CLI malformed package marker test should run with real temporary files, mocked agent detection, and captured prompt output. It should not depend on user home paths, installed agents, terminal color support, or live catalog state.

Use portable failures where possible. A missing file works on every runner. For an unreadable-file branch, mock one \`readFile\` call instead of changing permissions that Windows or privileged containers may interpret differently.

Give every fixture a unique root and remove it recursively. Shared directories can cause counts to change when tests run in parallel. Prefix folder names for human clarity, but assert entries by content rather than OS directory order.

Use a set of temp roots in cleanup so a failed setup is still removed. Add the root to that set right after creation, before the first write. This small order prevents half-built test trees from staying on a CI host.

Run a parser unit suite before the command suite if malformed YAML selection changes. That quick check confirms which input throws. Then run the CLI command case to prove its catch and continuation behavior.

The full repository gate should also verify the command still builds with shared parser types. A refactor that begins schema validation could be intentional, but it must update expected output, totals, and documentation together.

Review the [testing category index](/categories) after a manual run only if a package needs a better fixture type. The CI case should keep its local metadata fixed and make no web call.

For a manual check, install one disposable local package and use [getting started](/getting-started) instructions in a temporary agent destination. Never corrupt a real user package merely to prove an error marker.

## Implementation checklist for QASkills list malformed skill folders

Use this checklist when reviewing QASkills list malformed skill folders:

- Return one isolated detected agent rather than scanning the developer home directory.
- Create child directories because root files are deliberately ignored.
- Include valid controls before and after a deterministic child failure.
- Distinguish parser exceptions from valid metadata that fails the publication schema.
- Capture semantic log text without binding the test to ANSI color sequences.
- Assert the invalid folder marker, both valid package names, and final successful count.
- Keep the missing parent directory case in a separate test.
- Remove temp files and restore prompt, parser, and detector mocks after every run.

The scanner's error label says \`no SKILL.md\` even for a malformed or unreadable file. A test should preserve that current wording without describing it as a complete diagnosis. Product changes can later add reason-specific output.

The parser source and schema source should both remain cited in review notes. Their separation explains why some incomplete documents count as listed today.

Use the [FAQ page](/faq) for public command questions, not as a test oracle. Repository code and captured output remain the authoritative sources for this regression suite.

One final dry run can use a root with four short folder names: good-one, no-file, bad-yaml, and good-two. The log must show both good names, both bad folder names, and a total of two skills for that one fake agent.

Keep each valid description short, but make its text unique so the log can prove which child was read. If both good files use the same name, a duplicate log line cannot prove that the scan reached the last folder.

Next, run the same command with the bad-yaml folder removed and leave the missing file in place. The count should stay at two, while just one bad marker remains, which proves each failed child owns its own line.

Then add a valid SKILL.md to the no-file folder and run once more. The count should rise to three and that folder should move from its marker text to its parsed skill name without any new process state.

These small changes form a clear state test for QASkills list malformed skill folders. They show that the command reads the disk on each run, does not save old parse results, and does not let one past error mark a fixed child as bad.

The test can store each run in a new array of log calls and clear the mock between runs. This keeps old text from making the next check pass, while the same temp tree makes each disk change plain to the reader.

If the team wants a shell smoke check, use a temp home and a throwaway agent path rather than a real user folder. The automated gate should still mock detection because the smoke path can vary by host and cannot give the same set on every runner.

QASkills list malformed skill folders is best judged by what it prints and counts, not by a hidden helper call. A source spy may aid one hard branch, but the final check should always read the user-facing log and outro.

## Frequently Asked Questions

### What does qaskills list malformed SKILL.md verify in QASkills?

It verifies that a read or parser exception inside one child folder produces the generic package marker and does not reject the whole command. The strongest test also proves that a later valid package appears and that only successful parses contribute to the final installed-skill total.

### When should a team test skill folder parse failure?

Run this test when list scanning, parser behavior, prompt formatting, directory traversal, or error handling changes. Add a focused regression after any report that one broken local package hides other installed skills. Parser dependency upgrades also justify rerunning malformed YAML fixtures before accepting their expected branch.

### How can a fixture isolate missing SKILL.md list output?

Create one empty child directory under a unique temporary skills root, then mock agent detection to return only that root. Capture prompt logs with colors disabled or stripped. This isolates the missing-file marker from developer agents, universal locations, root-directory errors, live services, and test-order residue.

### Which assertion proves continue after invalid skill?

Assert that output includes a valid skill associated with a separate child after the failing folder, not merely one before it. Also assert the failure marker and final successful count. Those checks prove the loop resumed, display continued, and the invalid child did not inflate the aggregate.

### What failure cases belong in agent skills scan errors tests?

Cover a missing SKILL.md, parser-rejected YAML, mocked read rejection, ignored root file, empty skills directory, and syntactically valid incomplete metadata. Keep the parent-directory read failure separate. This set records which cases share the generic child marker and which cases follow other command branches.

### How should CI run CLI malformed package marker checks?

CI should use unique temporary directories, real files for ordinary cases, targeted mocks for nonportable permission failures, and captured prompt calls. Restore every mock and delete fixtures in cleanup hooks. Run shared parser tests first, then CLI tests, build checks, and the repository post-flow without personal agent configuration.

## Conclusion

QASkills list malformed skill folders contains failures at the child boundary: it marks the folder, skips its count, and keeps scanning. Reliable tests must also preserve the current parser-schema distinction, because incomplete but parseable metadata can still enter the success branch.

[Use the getting started guide](/getting-started) to run the command in a disposable location, then compare valid packages with the [skills catalog](/skills). Consult the [SKILL.md format guide](/blog/skill-md-format-guide) before turning a listing fixture into a publishable package.
`,
};
