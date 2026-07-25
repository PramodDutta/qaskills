import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI Download Fallback',
  description:
    'QASkills CLI download fallback tests cover GitHub clone failures, content endpoint recovery, metadata reconstruction, cleanup, and empty downloads.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills CLI download fallback',
  keywords: [
    'QASkills CLI download fallback',
    'GitHub clone fallback',
    'skill content endpoint',
    'SKILL.md metadata reconstruction',
    'temporary download cleanup',
    'empty skill download validation',
    'registry skill delivery',
    'CLI fallback integration tests',
  ],
  relatedSlugs: [
    'qaskills-cli-extract-skill-package-github',
    'qaskills-add-custom-directory-ci',
    'qaskills-init-non-interactive-ci',
    'qaskills-cli-disable-telemetry-do-not-track',
  ],
  sources: [
    'https://git-scm.com/docs/git-clone',
    'https://nodejs.org/api/globals.html#fetch',
    'https://nodejs.org/api/fs.html',
  ],
  content: `The QASkills CLI download fallback protects registry installs when a linked repository cannot supply a usable skill package. It tries a shallow GitHub clone, requests the registry content endpoint, and finally reconstructs SKILL.md from metadata. A useful test suite forces each branch alone and inspects the resulting directory.

This behavior lives in \`packages/cli/src/lib/installer.ts\`, where \`resolveSkill\` classifies input and \`downloadSkill\` performs delivery. It matters to every skill listed in the [QA skill catalog](/skills), including the verified [Playwright CLI skill](/skills/Pramod/playwright-cli). The goal is not to make every failure invisible. The goal is to return a complete, inspectable package or a clear error.

## How Does GitHub Clone Fallback Start?

The GitHub clone fallback applies differently to direct GitHub input and a registry skill. \`resolveSkill\` treats a relative or absolute path as local, text shaped like \`owner/repo\` as GitHub, and any other value as a registry name. Only the registry branch has the complete three-step QASkills CLI download fallback.

A direct GitHub install runs \`git clone --depth 1\` through \`execFileSync\`. If that command fails, the error reaches the add command because no registry metadata exists to provide another source. The [Git clone documentation](https://git-scm.com/docs/git-clone) explains that \`--depth\` creates a shallow history. In this CLI, shallow history reduces transfer size, but package extraction still decides whether the cloned tree contains a skill.

A registry install first fetches metadata from \`/api/skills/{slug}\`. When that JSON contains \`githubUrl\`, the CLI tries the same shallow clone into a clean temporary directory. It then calls \`extractSkillPackage\`. A clone only counts as successful registry skill delivery when extraction finds a SKILL.md file within its bounded search.

That distinction deserves separate assertions. A successful Git process is not enough for a registry install. A repository may clone correctly yet contain only a test framework, README, or source tree. The implementation treats that result as a miss, clears the directory, and proceeds to the skill content endpoint.

The first test should spy on the child process call and verify argument boundaries:

\`\`\`typescript
expect(execFileSync).toHaveBeenCalledWith(
  'git',
  ['clone', '--depth', '1', 'https://github.com/example/skill', expect.any(String)],
  { stdio: 'pipe' },
);
\`\`\`

This assertion checks that the URL is an argument rather than shell text. It also records the exact depth option used by current code. Pair it with a package assertion, because a command assertion cannot prove that SKILL.md and companion folders survived extraction.

The [agent skill portability guide](/blog/agent-skills-open-standard-portability) provides broader context for portable packages. For this branch, the test contract stays narrow: metadata resolves, the clone is attempted once, extraction returns true, and later network paths are not called.

## Why Is the Skill Content Endpoint Second?

The skill content endpoint is the curated recovery path at \`/api/skills/{slug}/content\`. It returns a complete Markdown document with YAML frontmatter and the stored long description. The CLI reaches it only when no linked GitHub package was usable, so it preserves registry content without depending on repository layout.

This order lets the registry supply clean content when a linked repo cannot supply a skill. Test three GitHub results: no \`githubUrl\`, a clone error, and a clone with no SKILL.md. Each result should make one content call after the first metadata call.

Native \`fetch\` returns a response object even for HTTP errors, so the implementation checks \`contentRes.ok\` before reading text. The [Node fetch reference](https://nodejs.org/api/globals.html#fetch) documents the browser-compatible global used here. A rejected request is converted to \`null\` with \`.catch(() => null)\`, while a non-2xx response remains a response whose \`ok\` property is false.

Test both forms. A network rejection and a 503 response should enter the metadata path. A 200 response should write its exact body to \`SKILL.md\` and should not reconstruct metadata. This makes the QASkills CLI download fallback observable without testing private branches directly.

\`\`\`typescript
const metadata = {
  name: 'Playwright CLI Browser Automation',
  githubUrl: 'https://github.com/example/missing-skill',
  fullDescription: 'Use Playwright CLI for browser checks.',
};

vi.mocked(fetch)
  .mockResolvedValueOnce(new Response(JSON.stringify(metadata), { status: 200 }))
  .mockResolvedValueOnce(
    new Response('---\\nname: Playwright CLI Browser Automation\\n---\\n\\n# Guide\\n', {
      status: 200,
    }),
  );

const dir = await downloadSkill(await resolveSkill('playwright-cli'));
expect(await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8')).toContain('# Guide');
\`\`\`

The content endpoint test should use a unique temporary skill name and remove its directory afterward. \`downloadSkill\` derives a stable path from the sanitized name, so parallel tests using one name can interfere. Isolation is part of the fixture design, not an optional cleanup detail.

The [SKILL.md format guide](/blog/skill-md-format-guide) explains the document fields returned by this endpoint. In this integration test, assert enough frontmatter and body text to prove that the response was written unchanged. Schema validation belongs in a separate validator test.

## When Does SKILL.md Metadata Reconstruction Run?

SKILL.md metadata reconstruction is the last registry path. It runs when clone extraction did not succeed and the content request either rejects or returns a response with \`ok === false\`. The helper builds frontmatter from selected metadata fields, then uses \`fullDescription\` as the body when that value is a non-empty string.

The selected fields are \`name\`, \`description\`, \`version\`, \`author\`, \`license\`, \`tags\`, \`testingTypes\`, \`frameworks\`, \`languages\`, \`domains\`, and \`agents\`. Missing, null, and empty-string values are omitted. Array values become inline YAML arrays, while scalar values are quoted.

This branch is intentionally a compatibility fallback, not the preferred source. Its hand-built YAML escaping handles double quotes and scalar backslashes, but an integration test should not claim support beyond what the serializer implements. Use metadata with known values, parse the file through the shared parser, and compare semantic fields.

When \`fullDescription\` is absent, the body falls back to a Markdown heading based on \`name\`, followed by \`description\`. That body contains a Markdown H1 because SKILL.md is an instruction artifact, not a blog page. Keep that distinction clear when comparing this article with the [guide to writing high-quality QA skills](/blog/how-to-write-high-quality-qa-skills).

A compact reconstruction matrix catches the meaningful cases:

| Input condition | Expected SKILL.md source | Critical assertion |
|---|---|---|
| Clone package found | Extracted repository file | Content endpoint is not requested |
| Clone missing SKILL.md, content 200 | Endpoint response text | Metadata body is not generated |
| Clone throws, content 404 | Metadata reconstruction | Selected frontmatter parses |
| No GitHub URL, content rejects | Metadata reconstruction | Fallback heading and description exist |
| Metadata response is not OK | No download begins | Registry not-found error is returned |

The final row matters because metadata retrieval is the entrance to registry delivery. If the initial \`fetch(skill.url)\` is not OK, \`downloadSkill\` throws immediately. The QASkills CLI download fallback cannot reconstruct a record it never received.

Use metadata from a small test fixture, not live catalog text. Fixed input keeps the output stable and keeps a catalog edit from looking like a transport bug. The [AI QA skills directory guide](/blog/ai-qa-skills-directory-2026) covers discovery, while this test starts after a slug resolves.

## How Should Temporary Download Cleanup Work?

Temporary download cleanup begins before any source-specific work. The implementation sanitizes the skill name to letters, digits, underscores, and hyphens, then removes the prior \`os.tmpdir()/qaskills/{safeName}\` tree with \`force: true\`. It recreates that path before copying, cloning, or writing.

The [Node file system API](https://nodejs.org/api/fs.html) defines each file call used by the installer. Test the results instead of mocking every read, write, and copy. A real temp folder gives clear proof that stale files are gone and the new package has the right shape.

Create a stale file under the calculated directory, call \`downloadSkill\`, and assert that stale content is gone. Do this for a local source and for a registry source. Local installation copies the supplied tree after cleanup, while registry installation may clone or write a single SKILL.md.

There is another cleanup boundary after a registry clone returns no package. Current code removes and recreates \`tmpDir\` before requesting content. Verify that files from the unusable clone do not remain beside the endpoint-generated SKILL.md. This prevents README files or source code from masquerading as part of the curated package.

A clone exception is caught so delivery can continue, but the catch block does not explicitly clear a partially created clone. Git may leave files when a clone fails after starting. A valuable regression test should simulate that state and decide the required contract. Until code adds that cleanup, the article must not claim that every failed clone is fully erased.

Extraction uses another staging directory whose name begins with \`.pkg-\`. It copies SKILL.md and adjacent companion directories there before wiping the clone. Normal completion removes staging. Tests can scan the temporary QASkills parent after extraction, but they should avoid asserting random names or timestamps.

For CI, delete test directories in \`afterEach\` even when an assertion fails. The [installing skills for Claude Code guide](/blog/how-to-install-skills-claude-code) covers user-facing destinations. Here, temporary download cleanup protects the intermediate source that later gets copied to an agent.

## What Makes Empty Skill Download Validation Fail?

Empty skill download validation runs after all source paths. The code lists the root, ignores \`.git\`, and throws when no other item exists. Thus, a blank folder and a folder with only \`.git\` fail with \`Download produced no files for skill\`.

That check answers one useful question: did delivery leave any root entry? It does not verify that SKILL.md exists, contains bytes, parses, or matches the requested skill. A zero-byte SKILL.md still counts as a meaningful directory entry. So does an unrelated README for a direct GitHub install where extraction found no SKILL.md.

Tests should preserve this distinction. One group locks current behavior so refactoring cannot silently remove the no-files guard. A second group expresses stronger desired validation, such as requiring non-empty SKILL.md for registry sources. Mark the second group as a product requirement until the implementation supports it.

For the endpoint branch, an HTTP 200 with an empty body writes an empty SKILL.md, and the current final check passes. That is a concrete boundary worth exposing. A future fix could reject blank text before \`writeFile\` or parse the final artifact before returning.

Use error text only where it is part of the CLI contract. The add command catches the error, logs its message, sets \`process.exitCode = 1\`, and prints a failure outro. Unit tests around \`downloadSkill\` can assert the exact no-files message. Command tests should focus on nonzero status and a useful diagnostic.

This layered approach avoids a false green. Directory-level empty skill download validation protects against total absence. Artifact-level validation proves the delivered instruction is usable. The [validate SKILL.md in CI guide](/blog/validate-skill-md-in-ci-pipeline) shows how to apply schema checks after transport.

## Map the Registry Skill Delivery Decision Table

Registry skill delivery becomes easier to test when each external observation maps to one expected branch. Build the table before mocks, then give every row a unique skill name. Record calls, final files, and errors for each run.

| Metadata | Clone result | Content result | Expected delivery |
|---|---|---|---|
| Has GitHub URL | Package extracted | Not called | Staged GitHub skill package |
| Has GitHub URL | No SKILL.md | 200 text | Endpoint SKILL.md |
| Has GitHub URL | Throws | 200 text | Endpoint SKILL.md |
| Has GitHub URL | Throws | 404 | Reconstructed metadata |
| No GitHub URL | Not called | Rejects | Reconstructed metadata |
| Initial response 404 | Not called | Not called | Registry not-found error |

Add columns for stale files, companion directories, and meaningful root entries when the test suite grows. A row should own one failure transition. Combining a clone exception, content timeout, malformed metadata, and cleanup failure in one test makes the first failing assertion hard to interpret.

The QASkills CLI download fallback is ordered, so call sequence matters. Assert that content is not fetched before clone extraction completes. Also assert that metadata reconstruction is not used after an endpoint 200. These negative assertions catch accidental parallelization that could overwrite a better package with weaker output.

Keep direct GitHub and local sources outside this table. They share installer helpers but not the registry recovery contract. Separate suites make it clear that direct GitHub clone failure is terminal and local copy failure is terminal.

For live checks, choose a fixed test fixture that the team controls. A production catalog test can verify one known skill, such as [Playwright CLI installation](/blog/playwright-cli-install-quickstart-2026), but unit and integration gates should not require public GitHub availability for every branch.

## Build CLI Fallback Integration Tests

CLI fallback integration tests should use real files with fake network and process edges. Mock \`fetch\` and \`execFileSync\`, but let \`fs/promises\` write in a temp folder. This mix proves package state without a need for live web services.

Reset mocks, env values, and temp folders before each case, then restore them after the check. The installer gives one skill name a fixed temp path. Add a test suffix or worker ID so two Vitest workers never share that path.

\`\`\`typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadSkill, resolveSkill } from './installer';

const touched = new Set<string>();

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    [...touched].map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
  touched.clear();
});

it('uses content after an unusable registry clone', async () => {
  const name = \`fallback-\${process.pid}-\${Date.now()}\`;
  const expected = '---\\nname: Fallback Test\\n---\\n\\nUse controlled content.\\n';

  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'Fallback Test',
            githubUrl: 'https://github.com/example/no-skill',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(expected, { status: 200 })),
  );

  const dir = await downloadSkill(await resolveSkill(name));
  touched.add(dir);
  expect(await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8')).toBe(expected);
  expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
});
\`\`\`

This example still needs a child-process mock because \`githubUrl\` starts a real clone. Mock the imported call before the module loads, or wrap that call with a small test seam. Keep final file writes real so the test still proves the package shape.

Parse the rebuilt file, and compare the endpoint file byte for byte. These checks prove two kinds of output. A rebuilt file must keep field meaning, while an endpoint file must keep all returned text.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can host this suite as a package-level job. Keep a small live registry smoke test separate from the deterministic branch matrix, because public network failure should not obscure a local logic regression.

## Run the End-to-End Failure Matrix

Run the failure matrix from the narrowest helper test to one command-level check. This order shortens diagnosis and prevents terminal rendering from becoming the only evidence.

1. Create a unique skill fixture and calculate its temporary path.
2. Seed stale content so the pre-download cleanup has something to remove.
3. Configure metadata, clone, and content outcomes for one decision-table row.
4. Call \`resolveSkill\` and \`downloadSkill\`, then inspect every root entry.
5. Parse or compare SKILL.md according to the expected source.
6. Assert call order, unused branches, and the exact terminal error when applicable.
7. Remove temporary files and restore all mocks in a guaranteed cleanup hook.
8. Run one built CLI command to confirm the helper error produces a nonzero process status.

Do not use retry loops to make this matrix pass. Each dependency is controlled, so a retry can hide call-order bugs. If the test needs time, wait for the specific promise or process exit rather than sleeping.

The command-level case should execute the built CLI in an isolated working directory. Point it at a controlled local server when testing metadata and content responses. Capture stdout, stderr, and exit status, but avoid snapshots of colors or spinner frames.

Record the resulting package as a test artifact only when diagnosis benefits from it. SKILL.md may contain instructions supplied by a third party, so do not execute scripts from a downloaded fixture. Transport tests read and parse files; they do not grant the package trust.

After local tests pass, a timed smoke check may fetch one known catalog skill. The [Playwright CLI skill page](/skills/Pramod/playwright-cli) gives that check a fixed site route. Report web access apart from code results so a short outage does not look like a branch bug.

Use one run ID in each fixture name, server log, and saved path so related facts stay easy to trace. This small rule helps when five workers fail at once and each prints a similar download error.

Save the response status and chosen path with each failed case, but do not save a full private payload. The report should show which branch ran, which file appeared, and why the test gave its result.

Keep a clear oracle for each source because file presence alone can hide the wrong branch. A GitHub package should keep its allowed side folders, while an endpoint file should match the returned text.

Metadata output needs a third oracle based on parsed fields and body text from the fixture. These three checks let one test name the source without peeking at a private local flag.

The QASkills CLI download fallback should also face a slow content response in a command test. Use a local server that waits until the test ends the request, then check the process error and cleanup.

Do not make that slow case wait ten real seconds when a local test hook can set a short clock. Fake time fits a unit test, while a small real limit fits one built command check.

Test names should state the first failed source and the source that wins next. A name such as "uses content after clone has no skill" gives more help than "fallback works."

When a case fails, print the final root list in sorted order for quick review. Sort only the report and assertion value, since the install code does not promise file system order.

Run the same core rows on a path with spaces to catch bad path joins or shell use. The code passes clone args as a list, so the URL and target should stay whole.

One case should use a skill name with punctuation and check the safe temporary name. Keep the requested registry slug in the network call while the local path uses underscores for unsafe marks.

The QASkills CLI download fallback must not reuse a file from the last case. Seed a clear marker, run the next row, and prove the marker is gone before checking the new file.

For a CI artifact, copy the final package through the [custom install directory flow](/blog/qaskills-add-custom-directory-ci) after delivery succeeds. That last step proves the downloaded folder can serve as the source for normal install code.

Keep this copy check small because destination rules belong to their own suite. It should read one known file at the new path and leave branch choice to the delivery tests.

Review failure logs for tokens, private URLs, or raw skill text before storing them. A branch name, status code, and safe path are often enough to fix the test.

The QASkills CLI download fallback earns trust when each row can fail for just one clear cause. Simple fixtures and plain reports help a new team member find that cause without reading all installer code.

## Apply the QASkills CLI Download Fallback

The QASkills CLI download fallback is reliable when branch order, package shape, and cleanup are all visible in tests. GitHub is the first optional source for registry records, the content endpoint is the curated recovery path, and reconstruction is the final compatibility path. None of those steps replaces final artifact validation.

Start with the table, use real temp files, and force one path change in each test. Keep the current split between a blank folder and a blank SKILL.md clear. Ask for stronger clone cleanup or file checks as new work, rather than saying those checks exist now.

To apply the workflow, select a real package from the [QASkills directory](/skills), compare its delivered artifact with the [SKILL.md format contract](/blog/skill-md-format-guide), and add the branch matrix to the CLI package gate. The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) gives the team a concrete package for the separate live smoke lane.

## Frequently Asked Questions

### Does every GitHub clone failure use the fallback?

No. The complete recovery chain applies to a registry skill whose metadata points to GitHub. A direct \`owner/repo\` input has no registry record or content endpoint, so its clone error is terminal. Tests should keep direct GitHub behavior separate from the registry QASkills CLI download fallback.

### Why is a successful clone not enough?

A repository can clone successfully without containing SKILL.md. For registry delivery, \`extractSkillPackage\` must find and stage a skill package before the clone counts. If it returns false, the installer removes the unusable clone and asks the registry content endpoint for curated Markdown.

### Does the final check reject a blank SKILL.md?

No. Current empty skill download validation checks for root directory entries other than \`.git\`. A zero-byte SKILL.md is still an entry, so it passes that check. Add a separate content or parser assertion when the required contract says registry skills must contain valid instructions.

### Should tests call GitHub and qaskills.sh directly?

Deterministic branch tests should control process and HTTP outcomes locally. A separate scheduled smoke test can call public services to detect availability or contract drift. Keeping those lanes apart prevents a temporary network issue from looking like a regression in fallback ordering or file cleanup.

### What should metadata reconstruction tests compare?

Parse the generated SKILL.md and compare selected semantic frontmatter fields, then inspect the chosen body. Exact full-file snapshots can be brittle because quoting may change without altering meaning. Endpoint delivery is different: there, byte-for-byte text equality is a useful contract assertion.

### Where should the fallback suite run?

Run helper and integration cases in the CLI package test job on every relevant change. Run one built-command case after compilation, and place public registry smoke checks in a scheduled or post-deployment lane. This gives fast local evidence while still watching the complete delivery path.`,
};
