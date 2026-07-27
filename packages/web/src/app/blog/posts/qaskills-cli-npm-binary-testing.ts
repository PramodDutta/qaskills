import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI npm binary testing',
  description:
    'QASkills CLI npm binary testing: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills CLI npm binary testing',
  keywords: [
    'QASkills CLI npm binary testing',
    'npm bin smoke test',
    'Node CLI shebang test',
    'qaskills executable package',
    'package json bin mapping',
    'npx qaskills verification',
    'CLI dist index executable',
  ],
  relatedSlugs: [
    'ai-qa-skills-directory-2026',
    'how-to-install-skills-claude-code',
    'github-actions-testing-ci-cd-guide',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: [
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json',
    'https://nodejs.org/api/cli.html',
    'https://docs.npmjs.com/cli/v11/commands/npm-pack',
  ],
  repoEvidence: [
    'packages/cli/package.json#bin',
    'packages/cli/tsup.config.ts#banner',
    'packages/cli/src/index.ts#program',
    'packages/cli/e2e/e2e.mjs#CLI',
  ],
  content: `QASkills CLI npm binary testing proves that the packed module exposes a qaskills command, that its bin target exists inside the package, and that built JavaScript starts with a Node interpreter line. The smoke test should install the tarball in isolation, run version and help commands, and fail on missing, stale, or non-executable output.

This contract covers binary wiring after packing, not every file, publish trigger, network command, or QA feature. The verified links are \`packages/cli/package.json#bin\`, the build banner in \`packages/cli/tsup.config.ts#banner\`, the Commander program in \`packages/cli/src/index.ts#program\`, and the existing smoke harness at \`packages/cli/e2e/e2e.mjs#CLI\`.

## What does QASkills CLI npm binary testing guarantee?

QASkills CLI npm binary testing guarantees that three layers agree on one executable. Package metadata maps the public name \`qaskills\` to \`./dist/index.js\`, the build emits that path with a Node shebang, and the file starts a Commander program that can parse command-line input.

Each layer can break on its own, since a good source app cannot run when the bin path is wrong. A correct bin path still fails when the build omits \`dist/index.js\`. A present JavaScript file may execute under the wrong interpreter when its first line is missing.

The package tool contract comes from the \`bin\` field in [npm package.json documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json), and npm makes a command link for each map at install time. The smoke test should inspect and execute the packed result rather than trusting source metadata alone.

The repo builds CommonJS with \`tsup\`, makes type files, cleans old output, and adds \`#!/usr/bin/env node\` before the built script. This behavior is directly visible in the config.

Node's [command-line documentation](https://nodejs.org/api/cli.html) covers script calls, so a host-safe test can use the linked command or \`process.execPath\` with its bin target. Use both only when each answers a distinct risk.

QASkills CLI npm binary testing should check a valid version and nonempty help, not each color or space in styled output. Exact snapshots can fail while the command still works. Stable command identity and exit status are stronger release signals.

## How does npm bin smoke test work?

An npm bin smoke test begins from a fresh package tarball. Building source in the monorepo is necessary, but running \`dist/index.js\` directly does not prove what npm will ship. Packing captures file selection, package metadata, and the final command target in one artifact.

The current \`packages/cli/package.json#bin\` contract is:

\`\`\`json
{
  "name": "@qaskills/cli",
  "version": "0.4.1",
  "bin": {
    "qaskills": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist/", "README.md"]
}
\`\`\`

The same file declares build, test, and end-to-end scripts. A smoke gate should run the build first, then \`npm pack --json\` or the workspace package command. The [npm pack command reference](https://docs.npmjs.com/cli/v11/commands/npm-pack) explains that packing creates the tarball that would be published.

Create a temporary consumer directory with its own package manifest. Install the generated tarball there without workspaces, then inspect the local binary link and run \`qaskills --version\`. This catches accidental reliance on undeclared monorepo files.

Use the platform package runner rather than assuming \`node_modules/.bin/qaskills\` is a Unix symlink. npm may create command shims on Windows. Calling \`npm exec -- qaskills --version\` or resolving through the installed package keeps the check portable.

The version output should match the packed package version because \`src/index.ts\` imports \`version\` from package.json and passes it to Commander. Also run \`--help\` and assert the registered command name plus one stable subcommand. These checks prove program initialization without contacting the live catalog.

Do not use only \`npx qaskills\` against the public registry during a release candidate check. It may download the previously published version. Point npm at the local tarball or install it into an isolated consumer so the test covers the artifact under review.

The [QASkills getting started guide](/getting-started) gives the user command shape. The smoke test recreates that entry point with a local artifact and controlled inputs.

## Which cases define Node CLI shebang test?

A Node CLI shebang test needs a positive first-line check, an executable invocation check, a missing-banner negative fixture, line-ending coverage, and a rebuilt-output check. Looking only for the substring anywhere in the file can pass when a comment or bundled string contains it later.

The source in \`packages/cli/tsup.config.ts#banner\` sets the exact JavaScript banner:

\`\`\`typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  noExternal: ['@qaskills/shared'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
\`\`\`

After build, read \`dist/index.js\` as text and split on the first line ending. The first line must equal \`#!/usr/bin/env node\`. This accepts either LF or CRLF after the line while keeping the interpreter text exact.

Then execute the file in two ways. Calling \`process.execPath\` with the script proves valid JavaScript and program startup on every platform. Direct execution on a Unix runner proves the shebang and executable mode work together. Skip only the direct mode on platforms where that concept differs.

A negative test can copy the built file to a temporary path, remove its first line, make it executable, and confirm that direct invocation no longer represents the expected package contract. Do not modify the real dist file during the suite.

Rebuild coverage matters because a stale dist directory could retain a previously correct file. The configuration uses \`clean: true\`, so the gate can place a sentinel in dist, build, and assert that the expected fresh file replaced prior output. Keep sentinel manipulation outside developer workspaces when possible.

QASkills CLI npm binary testing should not demand a particular absolute Node path. The env-based shebang intentionally lets the environment locate Node. Assert the literal configured line and a successful invocation under the supported runner.

The [CI testing guide](/blog/github-actions-testing-ci-cd-guide) can help place platform jobs. A Linux job gives direct shebang coverage, while Windows gives shim and path coverage.

## qaskills executable package and the current QASkills contract

The qaskills executable package initializes one Commander program. It sets the name, description, version, help banner, and eight subcommands before calling \`program.parse()\`. A smoke test can observe name, version, help, and command registration without reaching network-dependent actions.

The current \`packages/cli/src/index.ts#program\` registers \`add\`, \`search\`, \`init\`, \`list\`, \`remove\`, \`update\`, \`info\`, and \`publish\`. The public entry has no exported program object, so tests should use process execution rather than importing the module and mutating global arguments.

Use \`--version\` as the smallest startup probe. Commander handles it and exits before a command needs prompts, files, or fetch. Use \`--help\` as a registration probe and assert a few stable tokens instead of full formatted output.

The existing \`packages/cli/e2e/e2e.mjs#CLI\` resolves \`../dist/index.js\` relative to the test file and wraps calls with \`execFileSync('node', [CLI, ...args])\`. It gives each command piped input, a 120-second timeout, and an environment with telemetry disabled.

That existing harness proves built source, but an npm package gate should add a packed consumer stage. The distinction is valuable: direct dist execution diagnoses program output, while installed tarball execution diagnoses publication shape and bin wiring.

The [AI QA skills directory guide](/blog/ai-qa-skills-directory-2026) describes the catalog that commands reach. Binary tests should stop before live catalog behavior unless a separate network gate is intentionally running.

QASkills CLI npm binary testing should also check failure status. An unknown top-level option should exit nonzero and print an error on the expected stream. This proves the process can signal invalid invocation, but it should not be confused with subcommand behavior.

## How do you test package json bin mapping?

A package json bin mapping test should compare metadata, tarball contents, installed command resolution, and actual output. Any one check alone leaves a gap between source intent and consumer behavior.

Use this numbered release procedure:

1. Build \`@qaskills/cli\` from a clean output directory.
2. Run npm pack with JSON output and capture the exact tarball path.
3. Inspect the tarball file list for package.json and \`dist/index.js\`.
4. Install the tarball in a disposable consumer and invoke its qaskills command.
5. Assert version, help, first-line shebang, exit status, and complete cleanup.

A Node smoke script can read the packed metadata before installation:

\`\`\`javascript
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cliRoot = path.resolve('packages/cli');
execFileSync('pnpm', ['build'], { cwd: cliRoot, stdio: 'inherit' });

const packed = JSON.parse(
  execFileSync('npm', ['pack', '--json'], { cwd: cliRoot, encoding: 'utf8' }),
)[0];
const tarball = path.join(cliRoot, packed.filename);
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'qaskills-bin-'));

try {
  execFileSync('npm', ['init', '-y'], { cwd: consumer, stdio: 'ignore' });
  execFileSync('npm', ['install', tarball], { cwd: consumer, stdio: 'ignore' });
  const output = execFileSync(
    'npm',
    ['exec', '--', 'qaskills', '--version'],
    { cwd: consumer, encoding: 'utf8' },
  );
  if (!/^\\d+\\.\\d+\\.\\d+/.test(output.trim())) throw new Error('invalid version');
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
  fs.rmSync(tarball, { force: true });
}
\`\`\`

This example invokes package tools directly and uses argument arrays rather than shell text. Adjust the build command to the CI package manager, but keep the tarball installation isolated. Never publish merely to test command mapping.

Inspect \`packed.files\` from npm's JSON output when available. Confirm \`dist/index.js\` is included and a source-only path is not used as the bin target. The package \`files\` allowlist currently includes dist and README, which supports this expectation.

Finally, compare installed package.json with source metadata. The bin value should remain \`./dist/index.js\`, and that exact file should exist. QASkills CLI npm binary testing should fail if a build rename changes only one side.

### Prove the packed file is the file you ran

Save the tarball path that pack returns and use it for each next step, rather than scanning for the newest file. Check the pack time only as a clue, not as the key claim. The path from JSON is the source of truth for this run.

Read installed package.json, find its bin target, join that target to the package root, and read the first line. This proves that the link and the line point to one file. A source tree check on its own cannot give that proof.

Run version and help from the same temp app, while keeping the global path out of the child process when the host permits it. If a global qaskills command can still win, print the resolved link path in the test log. This stops an old global build from making the case pass.

Make the fake app as small as it can be, with a package file, the packed CLI, and no app source. A large app can bring in scripts or tools that mask a bad command link. The small app also makes cleanup fast when the gate runs on each release.

Use the [QASkills directory overview](/blog/ai-qa-skills-directory-2026) only after the command starts, since the smoke test should not call search just to prove its link. Version and help have no live data need. This keeps a web fault from hiding a bad npm pack.

## npx qaskills verification failure and edge-case matrix

Npx qaskills verification should distinguish local tarball execution from public version lookup. For a release candidate, install or execute the explicit tarball path. A bare command may resolve cache, global state, or the last registry release.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| Bin mapping | Packed package installed locally | qaskills resolves to dist index | Command missing or wrong target | \`packages/cli/package.json#bin\` |
| Shebang | First line of built JavaScript | Exact Node env interpreter line | Missing or displaced line | \`packages/cli/tsup.config.ts#banner\` |
| Program startup | \`--version\` and \`--help\` | Zero status and stable output | Parse crash or empty output | \`packages/cli/src/index.ts#program\` |
| Missing target | Fixture package with wrong bin path | Installation or invocation fails | Misleading successful command | \`packages/cli/package.json#bin\` |
| Repeat package | Two clean packs from same commit | Both expose the same command | Stale dist changes behavior | \`packages/cli/e2e/e2e.mjs#CLI\` |

Add a negative fixture outside the source tree, point its bin field at a missing file, and assert that consumer invocation fails. This confirms that the smoke harness would catch the production defect.

Test version mismatch by changing only a fixture version or output script, since Commander output must reflect packed metadata. A stale bundle may carry an earlier imported version if the build did not run.

Keep registry requests out of this matrix because version and help are enough to start the program. Search and install behavior belongs to a live registry contract suite, which can have different retries and credentials.

The [publishing directory guide](/blog/how-to-publish-ai-agent-skill-directory) covers content release concerns. This gate owns only executable package wiring.

## How should CLI dist index executable run in CI?

The CLI dist index executable should run in CI after shared dependencies and CLI source are built, then before any npm publication step. The repository's publish workflow already runs CLI end-to-end checks before publish, so the binary package gate fits directly beside that boundary.

Use two stages. The fast stage reads the built file, checks the first line, and invokes version plus help through Node. The package stage creates a tarball, installs it in a disposable project, and invokes the npm-linked command.

Run the package stage on Linux and Windows when release confidence requires both. Linux verifies direct shebang execution and permissions. Windows verifies the package manager command shim. Both should share semantic output assertions.

Disable telemetry and avoid live commands. Set \`CI=1\`, use a fixed timeout, pipe standard streams, and capture stderr on failure. The existing E2E wrapper provides a practical pattern for process execution.

QASkills CLI npm binary testing must use the current tarball path from pack output, never a guessed filename. Scoped package tarball names include normalized scope text, and versions change. Parsing JSON output avoids brittle path construction.

Always delete the tarball and consumer directory, even on failure. If CI uploads a failed artifact for diagnosis, upload only the tarball and relevant logs, not package manager credentials or a whole home directory.

Review [available skill categories](/categories) only after the binary gate passes. Catalog checks should not obscure a command-link failure with network noise.

### Keep the release gate small and strict

Fail as soon as the mapped file is not in the pack, since no one should install a pack without its own bin target. If the file is present, move on to the first line and command link checks. This order gives one clear cause for each red job.

Keep the trimmed version match exact because the app imports it from package data and a stale value is a real build fault. Do not accept any valid version when the pack says a different one. The test should print both safe values when they do not match.

Help can change as commands grow, so check the app name and core commands instead of storing the full styled block as a snapshot. A color or line-wrap change should not block a release. An empty help page or missing add command should block it.

Use a set time limit for each child call and show its args, since version and help should end with no prompt. A hang can mean the wrong file ran or the args were lost at the command link. Kill the child and clean the temp app in all such cases.

Run the [CI and CD test guide](/blog/github-actions-testing-ci-cd-guide) checks on a host that matches the ship plan, with one Unix host using the command link. Add a Windows host when the package claims that use. Keep the claims in the report tied to the hosts that ran.

When the gate passes, record the pack name, version, Node major line, and host type as safe facts for a later fault trace. Do not print tokens, npm config, or all environment values. This gate has no need for publish rights.

The [QASkills blog](/blog) can group this check with other release tests, but CLI should own the small gate and its quick rerun. It also keeps a failed npm link from being lost in a broad web suite.

## Implementation checklist for QASkills CLI npm binary testing

Use this checklist before approving the package gate:

- Build shared and CLI packages from clean output.
- Assert \`dist/index.js\` exists and is not empty.
- Assert the first line equals the configured Node shebang.
- Confirm package.json maps qaskills to \`./dist/index.js\`.
- Pack the CLI and inspect the returned file manifest.
- Install that exact tarball in a new consumer project.
- Run version and help through the installed command link.
- Compare version output with packed package metadata.
- Add a negative fixture with a missing bin target.
- Use timeouts, captured streams, telemetry opt-out, and final cleanup.
- Record the exact local pack path and command link used by the smoke run so an old global build cannot make the release gate pass

QASkills CLI npm binary testing should produce narrow diagnostics. Report whether build output, tarball content, command resolution, shebang, or program startup failed. One generic "npx failed" message sends maintainers toward the wrong layer.

Read the [Claude Code skill install guide](/blog/how-to-install-skills-claude-code) after binary delivery is proven. It covers the next user workflow, while this suite keeps package execution as the release boundary.

## Frequently Asked Questions

### What does npm bin smoke test verify in QASkills?

It verifies that the packed package maps the qaskills command to an included built file and that a clean consumer can invoke it. The strongest smoke case checks tarball contents, installed metadata, semantic version output, help text, process status, and cleanup without contacting the live registry.

### When should a team test Node CLI shebang test?

Run it whenever build configuration, output format, entry files, package metadata, or supported Node versions change. Keep the first-line assertion on every CLI build and direct execution on a Unix release runner. Add Windows package-shim coverage before publishing cross-platform command changes.

### How can a fixture isolate qaskills executable package?

Create a temporary consumer with its own package.json, install the locally generated tarball, and invoke commands from that directory. Clear inherited command assumptions, capture streams, disable telemetry, and remove the consumer afterward. This prevents workspace links or global installations from masking missing packaged files.

### Which assertion proves package json bin mapping?

Check that packed package.json maps \`qaskills\` to \`./dist/index.js\`, confirm that file exists in the tarball, then invoke the installed qaskills link successfully. The metadata check states intent, while the tarball and process checks prove that intent survived packing and reached a clean app.

### What failure cases belong in npx qaskills verification tests?

Cover a missing bin target, stale build version, absent shebang, empty help output, nonzero version command, cached public package confusion, and repeated clean packs. Keep network commands outside this suite so each failure points to package wiring rather than catalog availability.

### How should CI run CLI dist index executable checks?

Run a fast built-file check followed by an isolated tarball installation before publication. Use exact pack JSON, fixed timeouts, captured output, and platform jobs where needed. Let every mismatch fail the workflow, then remove tarballs and temporary consumers in a final cleanup step.

## Conclusion

QASkills CLI npm binary testing proves that package metadata, generated JavaScript, interpreter wiring, and program startup agree before release. The next regression check should install the exact tarball on a clean runner and compare its version output with packed metadata, catching stale builds and wrong bin targets together.

Review [QASkills getting started](/getting-started), run the package gate, and use the live [QA skills catalog](/skills) as the next contract before publishing. Visit the [blog](/blog) for related release and testing workflows.`,
};
