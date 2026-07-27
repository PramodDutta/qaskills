import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI bundled shared dependency',
  description:
    'QASkills CLI bundled shared dependency: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills CLI bundled shared dependency',
  keywords: [
    'QASkills CLI bundled shared dependency',
    'tsup noExternal workspace package',
    'bundle qaskills shared',
    'CLI missing module smoke test',
    'pnpm workspace dependency bundling',
    'CommonJS bundle inspection',
    'npm package workspace resolution',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'typescript-testing-patterns-guide',
    'github-actions-testing-ci-cd-guide',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: [
    'https://tsup.egoist.dev/',
    'https://pnpm.io/workspaces',
    'https://nodejs.org/api/modules.html',
  ],
  repoEvidence: [
    'packages/cli/tsup.config.ts#noExternal',
    'packages/cli/package.json#dependencies',
    'packages/shared/src/index.ts',
    'packages/cli/src/lib/telemetry.ts#CLI_VERSION',
  ],
  content: `QASkills CLI bundled shared dependency keeps the private \`@qaskills/shared\` workspace package inside the published CommonJS artifact, so npm users do not need that private package at runtime. A release test should pack the CLI, install it in an empty project, execute it, and fail when Node reports a missing shared module.

This contract belongs to the CLI package boundary, not the SDK module formats or declaration output. The repository records that boundary in \`packages/cli/tsup.config.ts\`, while the [getting started guide](/getting-started) shows the command that users ultimately expect to run.

## What does QASkills CLI bundled shared dependency guarantee?

The QASkills CLI bundled shared dependency guarantees that runtime values imported from the private shared workspace package are present in the built command. A consumer should install the packed CLI into an unrelated directory and execute it without adding \`@qaskills/shared\` there.

- The source of truth is \`packages/cli/tsup.config.ts\`. Its \`noExternal: ['@qaskills/shared']\` setting tells tsup not to leave that import as an external runtime requirement. The [tsup documentation](https://tsup.egoist.dev/) describes the build tool, but the exact package choice comes from this repository.

The setting matters because \`packages/shared/src/index.ts\` exports values and types used throughout the command package. Types disappear during TypeScript compilation, yet runtime values such as \`CLI_VERSION\` still need executable JavaScript. The telemetry module imports that value in \`packages/cli/src/lib/telemetry.ts\`, which gives a release test a concrete path to exercise.

The guarantee is narrower than saying the CLI contains every workspace package. Only \`@qaskills/shared\` appears in \`noExternal\`, and other dependencies follow tsup and package configuration. Tests should name the exact dependency and inspect observable execution rather than making a broad monorepo claim.

A useful acceptance rule is simple: the packed CLI must start in a clean consumer project whose dependency tree has no separate shared workspace package. That rule connects build configuration to user behavior and avoids a test that passes only inside the monorepo.

## How does tsup noExternal workspace package work?

A tsup noExternal workspace package setting changes how the bundler treats a dependency during output generation. In this repository, the CLI config selects a CommonJS format, creates declarations, cleans prior output, and keeps \`@qaskills/shared\` inside the JavaScript bundle.

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

This excerpt mirrors \`packages/cli/tsup.config.ts\`. The entry produces the command artifact, the CommonJS format matches the package release, and the banner makes the generated file directly executable on Unix-like systems. None of those facts alone proves shared code was included.

The significant line is \`noExternal\`. Without it, a bundler may preserve a package import and expect Node to resolve that package after installation. With it, tsup processes the dependency while creating the CLI output, subject to the dependency's own import graph and bundler rules.

The [pnpm workspace documentation](https://pnpm.io/workspaces) explains how workspace packages are linked during development. That local linking is exactly why a monorepo-only smoke test can miss release trouble: Node can find a sibling package in the workspace even when the packed consumer would not receive it.

Run two forms of proof. First, inspect the built output for an unresolved \`@qaskills/shared\` require. Second, install the tarball into a fresh directory and invoke a code path that uses a shared runtime value. The first check gives fast diagnosis, while the second proves package behavior.

Do not assert minified implementation text or generated variable names. Those details can change with tsup versions without changing the contract. Search only for a remaining package specifier, then trust execution for the stronger result.

## Which cases define bundle qaskills shared?

The phrase bundle qaskills shared should map to positive, negative, boundary, and repeat-run fixtures. Each fixture needs a clean package installation because the main risk is accidental workspace resolution, not TypeScript compilation alone.

The positive fixture builds the current configuration, creates an npm tarball, and installs it under a temporary consumer. It runs the CLI help command and one path that reads \`CLI_VERSION\`. Success means process status is zero and stderr has no module resolution error.

The negative fixture copies the tsup configuration into an isolated test package but removes \`noExternal\`. It should never edit the repository file during a test. The resulting artifact provides a controlled comparison and should fail when the private dependency is unavailable.

A boundary fixture distinguishes type-only imports from runtime imports. A declaration can mention \`Skill\` without requiring JavaScript, while \`CLI_VERSION\` requires a runtime value. Test the latter so a passing declaration build cannot hide an executable failure.

A good pack test has one job: prove that a new user can run the command from the files in the pack. It does not need a web key, a live skill, or a link back to the main repo. This small scope keeps the cause clear when the run fails.

Start with a fresh folder and a blank package file, then add the local tarball as the sole item under test. The new folder must not sit below the repo, since Node can walk up the tree as it looks for modules. A true outside path makes the result easy to trust.

The pass case should show the command name and exit with code zero. The fail case should show which module could not load and should exit with a nonzero code. Save both facts, since text alone can be printed even when a child task fails.

Keep the old pack out of each new run. If a test uses a fixed file name, remove it before the next build or ask the pack command for the path it just made. This step stops a stale good pack from hiding a bad new build.

A repeat-run fixture clears \`dist\`, rebuilds twice, and compares package contents at the level that matters. Require the same entry files, the same executable command, and no unresolved shared specifier. Avoid byte-for-byte bundle snapshots because tool metadata or source maps can change harmlessly.

The current dependency declaration in \`packages/cli/package.json\` uses the workspace package during repository development. That declaration supports local builds, but it does not replace consumer isolation. The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) explains why runtime and compile-time assertions need separate cases.

- Include one fixture that installs only production dependencies. Development dependencies can accidentally provide workspace tooling or test helpers that make the package appear healthy. A release consumer should receive exactly what npm installation promises.

Finally, run the test with an empty npm cache when investigating a failure. Cache state should not be part of the normal assertion, but a clean cache helps prove that an old local tarball is not masking missing code.

## CLI missing module smoke test and the current QASkills contract

A CLI missing module smoke test should execute the built entry through Node and capture status, stdout, and stderr. The strongest failure signal is Node reporting that it cannot find \`@qaskills/shared\` before the command can display normal help or version output.

- The shared barrel file at \`packages/shared/src/index.ts\` exports types, constants, schemas, parsers, and utilities. A package inspection cannot infer which exports survive as runtime code, so the smoke test should call a CLI branch known to import one.

\`\`\`typescript
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const consumer = mkdtempSync(path.join(os.tmpdir(), 'qaskills-cli-pack-'));

execFileSync('pnpm', ['add', '/absolute/path/qaskills-cli.tgz'], {
  cwd: consumer,
  stdio: 'pipe',
});

const output = execFileSync(
  process.execPath,
  [path.join(consumer, 'node_modules/@qaskills/cli/dist/index.js'), '--help'],
  { cwd: consumer, encoding: 'utf8' },
);

expect(output).toContain('qaskills');
\`\`\`

This test uses argument arrays instead of shell interpolation, which keeps paths with spaces intact. It also sets the consumer working directory so Node cannot walk upward into the monorepo and find linked dependencies.

Add a direct filesystem assertion that the consumer has no \`node_modules/@qaskills/shared\` folder. The command succeeding without that folder demonstrates inclusion in the CLI artifact. If the package later becomes public and separately shipped, the product contract may change, and this assertion should be reviewed.

Do not run only \`node dist/index.js\` from the repository root. That process inherits monorepo resolution paths and proves little about the tarball. The [skill format guide](/blog/skill-md-format-guide) covers artifact content for skills, while this smoke test concerns the executable package itself.

Capture the exact tarball path returned by \`pnpm pack\` rather than guessing its generated name. That keeps versions and package naming out of the fixture and supports release version changes.

## How do you test pnpm workspace dependency bundling?

- Pnpm workspace dependency bundling needs a repeatable package test that separates repository build state from consumer state. The following procedure uses temporary directories, explicit commands, and guaranteed cleanup so CI cannot inherit a developer installation.

1. Read \`packages/cli/tsup.config.ts\` and assert that \`noExternal\` contains exactly the private runtime dependency under test.
2. Build shared first, then build CLI, because the repository dependency graph expects shared output before dependent package output.
3. Run \`pnpm pack\` inside the CLI package and capture the emitted tarball path without publishing anything.
4. Create a temporary consumer outside the repository, initialize its package, and install only that tarball.
5. Assert that no separate \`@qaskills/shared\` directory exists, then execute CLI help and a version-bearing path.
6. Scan the generated CommonJS entry for unresolved \`require('@qaskills/shared')\` or equivalent package text.
7. Repeat the build after cleaning output, then rerun the same assertions with a new consumer directory.
8. Remove both consumers and the generated tarball in a cleanup hook that runs after success or failure.

- The build order matches the monorepo rule documented for QASkills. Turbo normally handles that graph, but an isolated package script should either invoke the root build or explicitly build shared before CLI.

Use \`execFileSync\` or a spawned process with argument arrays for every package command. A shell string adds quoting behavior that is unrelated to workspace bundling and can make a path bug look like a package bug.

The QASkills CLI bundled shared dependency test should also record the resolved package manifest. This identifies whether a failure came from the tarball under test or from a registry version left in a cache.

For a compact user-facing check, compare the installed command with the [live skills catalog](/skills) only after the package smoke gate passes. Catalog access tests registry behavior, while the package gate proves that the command can start.

## CommonJS bundle inspection failure and edge-case matrix

CommonJS bundle inspection is a diagnostic layer, not the full release test. It can quickly find an external package specifier, but execution remains necessary because generated code can refer to modules through helper calls or altered strings.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| tsup noExternal workspace package | Current build configuration | CLI starts without a separate shared install | Missing module error | \`packages/cli/tsup.config.ts\` |
| bundle qaskills shared | Packed tarball in clean consumer | Shared runtime value is available | Consumer resolves workspace path | \`packages/cli/package.json\` |
| pnpm workspace dependency bundling | Production-only install | Help and version paths exit zero | Development dependency required | \`packages/shared/src/index.ts\` |
| CommonJS bundle inspection | Built entry text | No external shared require remains | Package specifier survives | \`packages/cli/dist/index.js\` |
| npm package workspace resolution | Second clean installation | Same command result repeats | Cache or parent path changes result | \`packages/cli/src/lib/telemetry.ts\` |

One edge case is source maps. A map may contain original package strings even when executable code is bundled, so scan the JavaScript entry rather than every generated file. Treat a source-map match as diagnostic context, not an automatic release failure.

Another edge case is a command path that never loads the shared runtime import. A lazy branch could let help pass while an install or telemetry branch fails later. Choose at least one path that imports \`CLI_VERSION\` from \`packages/cli/src/lib/telemetry.ts\`.

Node explains how CommonJS finds modules in its [module documentation](https://nodejs.org/api/modules.html). That search can move through parent folders, which is why the test home must sit outside the workspace. The pack is sound only when the child can load it with no help from a parent tree.

Read static scan failures with care. A raw text hit may sit in a comment, map, or source name and may never run. Open the built entry near the hit, then use the child run as the final check.

The reverse case also matters. A text scan may find no plain package name because a tool rewrote the call, yet the child can still fail at load time. Static and live checks answer different parts of the same release question.

Make the report state which check failed first. Use short labels such as build, pack, install, scan, and run, then print only the key path and error. A clear stage name saves time when a release job stops far from the code change.

Package manager hoisting creates another false positive. A consumer nested inside the repository may resolve the workspace package from an ancestor \`node_modules\`. Create the fixture under the operating system temp directory and inspect its parent chain when debugging.

Malformed tarballs, missing output, and stale \`dist\` should fail before command execution. Assert that the packed archive includes its declared CLI entry and that the entry is nonempty. The [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide) provides a wider CI structure for such package checks.

- Keep errors specific. Report whether configuration, archive content, static inspection, installation, or process execution failed. A single "package test failed" message slows diagnosis and encourages reruns instead of fixes.

## How should npm package workspace resolution run in CI?

Npm package workspace resolution should run in a job that begins from a clean checkout and does not publish. Build, pack, install, execute, and delete artifacts within one job so no later task relies on an unverified tarball.

Use the repository's supported Node and pnpm versions. Enable the package manager through Corepack or the workflow's chosen setup, then install with the lockfile frozen. Workspace behavior can differ across package manager versions, so record both versions in failure logs.

The QASkills CLI bundled shared dependency gate should run after unit tests and before any npm publish step. A source test can prove \`noExternal\` exists, while the packed consumer test proves that the emitted artifact honors it.

Avoid registry credentials in this job. \`pnpm pack\` creates the same local package boundary needed for the test, and installing a local tarball needs no account. This reduces secret exposure and makes pull-request execution safe.

Run the consumer command with a scrubbed environment. Remove variables that redirect QASkills network traffic, disable calls unrelated to startup, and avoid using a real API response as evidence. The package contract should pass without depending on service availability.

Store the tarball listing and process stderr as failed-job artifacts. Do not upload the entire temporary \`node_modules\` tree, which is large and may contain irrelevant package files. A concise archive listing usually explains missing entry points.

Keep the job steps in the same order on local runs and CI. A developer can then paste the failed step into a shell and see the same file state. This makes the gate useful before a branch is pushed, not just after a remote job fails.

Use one pack per commit under test. Do not make the smoke job fetch the last public CLI as a base, because that checks an old release rather than the new code. The local tarball is the artifact that must earn the pass.

The child project should have no test tools of its own. It needs a package file, the packed CLI, and the Node runtime, which keeps the module tree small. A short tree also makes an extra shared package easy to spot.

If the child command needs a home folder, point it at another temp path. This guards against files from an old local QASkills run and keeps the test safe on shared build hosts. Delete that home with the child project after the run.

When a test fails, run the archive list before another build. A second build can change the very pack that caused the fault, which makes the first error hard to prove. Treat the failed tarball as read-only evidence until the cause is known.

The [QASkills FAQ](/faq) can explain the public install flow, while the release log should stay terse and factual. Readers need a clear fix path, and build logs need a clear fault stage.

The [publishing guide](/how-to-publish) can remain the manual release reference, while this CI gate decides whether the package reaches that step. The test should fail fast when a workspace import survives the bundle.

Rerun the same smoke test against the release candidate produced by the publish workflow when practical. That second check should consume the exact artifact, not rebuild from source, because rebuilds can hide packaging differences.

## Implementation checklist for QASkills CLI bundled shared dependency

- The implementation checklist ties configuration, archive, runtime, and cleanup into one reviewable contract. Each line should identify an observable result rather than merely saying that the build completed.

- Confirm \`packages/cli/tsup.config.ts\` lists \`@qaskills/shared\` under \`noExternal\`.
- Confirm \`packages/cli/package.json\` points its executable at a file included by the packed archive.
- Build \`packages/shared/src/index.ts\` outputs before building the dependent CLI package.
- Install the tarball in an operating system temporary directory outside every workspace ancestor.
- Prove the consumer has no separate \`node_modules/@qaskills/shared\` directory.
- Execute a branch that imports the shared \`CLI_VERSION\` runtime value.
- Scan only executable CommonJS output for an unresolved shared package specifier.
- Capture package manager versions, archive contents, status, stdout, and stderr on failure.
- Delete tarballs and temporary consumers even when an assertion throws.
- Keep SDK export-format tests outside this package-boundary suite.

These checks cover the current QASkills CLI bundled shared dependency without asserting incidental generated text. They also distinguish a source configuration regression from a packing or resolution regression.

Review each line as a yes or no claim. If a line needs a guess, add a check that can read a file, run a child, or test a status code. Release gates work best when two people can reach the same answer from the same pack.

Keep the fixture names plain and stable. Random roots prevent clashes, but labels inside the test can still say consumer, tarball, and entry. Those names make a failed path easy to read without adding private machine data.

The QASkills CLI bundled shared dependency check should finish with one short pass record. Include the CLI pack name, Node version, pnpm version, and child status, but omit the full module tree on success. Small logs help the real fault stand out later.

Pair the package check with one source review. The reviewer should see \`noExternal\`, the runtime import that needs it, and the clean child proof in the same change. This link from code to test makes accidental removal less likely.

Review the [QA skills blog](/blog) when related package guidance changes, and use the [categories directory](/categories) to select a stable skill only for an optional end-to-end command. The package gate itself should remain independent of catalog state.

## Frequently Asked Questions

### What does tsup noExternal workspace package verify in QASkills?

It verifies that tsup processes \`@qaskills/shared\` as part of CLI output instead of leaving a consumer-time package import. Pair a source assertion on \`noExternal\` with a packed installation test, because configuration alone cannot prove the emitted CommonJS file starts outside the workspace.

### When should a team test bundle qaskills shared?

Run the test whenever CLI imports, shared runtime exports, tsup settings, package manifests, or release workflows change. It should also block npm publishing. Unit tests inside the workspace remain useful, but they cannot replace an isolated tarball consumer whose parent directories contain no linked QASkills packages.

### How can a fixture isolate CLI missing module smoke test?

Create the consumer under the operating system temporary directory, install only the local CLI tarball, and execute Node with that directory as \`cwd\`. Assert that \`node_modules/@qaskills/shared\` is absent. Cleanup must remove the consumer and tarball after every result, with no shared test files left behind.

### Which assertion proves pnpm workspace dependency bundling?

The strongest assertion is successful CLI execution in a fresh production-only consumer with no separate shared package installed. A text scan for an unresolved package specifier adds useful diagnosis, but process success on a shared-runtime path proves the package can actually load and run.

### What failure cases belong in CommonJS bundle inspection tests?

Cover an unresolved shared require, a missing or empty entry file, a stale output directory, and a source-map-only package string. Also cover a help path that avoids lazy imports. Each case should say whether static inspection or executable smoke testing owns the final release decision.

### How should CI run npm package workspace resolution checks?

CI should build in dependency order, pack locally, install into a temporary external consumer, execute the command, and remove every artifact. Keep registry credentials and live API calls out of the job. Preserve tarball listings, tool versions, and stderr only when the gate fails.

## Conclusion

The QASkills CLI bundled shared dependency contract is proven at the package boundary, not by a successful monorepo build alone. Keep \`@qaskills/shared\` in tsup \`noExternal\`, inspect the CommonJS entry, and execute the packed command in a clean consumer before release.

Review the [QASkills getting started workflow](/getting-started), run the package gate, and use the [skills catalog](/skills) as the live catalog contract before publishing. Those steps keep package resolution evidence separate from service availability and give each failure a clear owner.`,
};
