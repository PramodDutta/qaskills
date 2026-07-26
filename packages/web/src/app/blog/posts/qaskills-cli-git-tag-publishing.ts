import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI git tag publishing',
  description:
    'QASkills CLI git tag publishing: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills CLI git tag publishing',
  keywords: [
    'QASkills CLI git tag publishing',
    'qaskills cli-v tag',
    'npm publish GitHub Actions',
    'tag triggered package release',
    'CLI publish E2E gate',
    'NPM_TOKEN workflow test',
    'manual CLI publish dispatch',
  ],
  relatedSlugs: [
    'github-actions-testing-ci-cd-guide',
    'how-to-publish-ai-agent-skill-directory',
    'typescript-testing-patterns-guide',
    'ai-qa-skills-directory-2026',
  ],
  repoEvidence: [
    '.github/workflows/cli-publish.yml#on',
    '.github/workflows/cli-publish.yml#jobs.publish',
    'packages/cli/e2e/e2e.mjs',
    'packages/cli/package.json#publishConfig',
  ],
  sources: [
    'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax',
    'https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages',
    'https://docs.npmjs.com/cli/v11/commands/npm-publish',
  ],
  content: `QASkills CLI git tag publishing starts when GitHub receives a tag matching \`cli-v*\` or someone runs the workflow manually. The publish job installs dependencies, builds shared code and the CLI, runs unit and live end-to-end gates, then publishes only if every earlier step succeeds.

This guide examines the release contract in \`.github/workflows/cli-publish.yml\`, the package settings in \`packages/cli/package.json\`, and the executable gate in \`packages/cli/e2e/e2e.mjs\`. It covers release triggers and prepublish checks, not ordinary pull-request CI or the files that npm eventually places inside the package.

## What does QASkills CLI git tag publishing guarantee?

QASkills CLI git tag publishing guarantees an ordered workflow, not a successful release for every tag. A matching push or manual dispatch creates the job, while each command must return successfully before the publish step can run. GitHub stops the default sequence when a prior step fails.

The current workflow names one job, \`publish\`, and runs it on \`ubuntu-latest\`. Its permissions grant read access to repository contents and write access for an identity token. The job still passes \`NODE_AUTH_TOKEN\` from the \`NPM_TOKEN\` secret to the final npm command, so tests should verify both the declared permissions and the named secret boundary.

The order is part of the observable contract. Checkout comes first, followed by pnpm setup, Node 20 setup, dependency installation, the shared build, the CLI build, CLI unit tests, the CLI end-to-end suite, and publication. Moving publication above either test command would weaken the gate even if the YAML remained valid.

That sequence supports teams following the [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide). It also connects package delivery to the [QASkills getting started path](/getting-started), because users install the artifact produced after these checks. A workflow review should therefore assert trigger scope, step order, command text, and secret placement as separate facts.

The [GitHub workflow syntax reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) defines tag filters and manual dispatch events. Repository evidence narrows that platform behavior to \`.github/workflows/cli-publish.yml#on\` and \`.github/workflows/cli-publish.yml#jobs.publish\`. Both citations are needed because a valid trigger does not prove a safe job.

## How does qaskills cli-v tag work?

A qaskills cli-v tag works through the \`push.tags\` filter, which contains the single pattern \`cli-v*\`. A tag such as \`cli-v0.4.2\` matches, while \`v0.4.2\`, \`cli/0.4.2\`, and an ordinary branch push do not match that declared filter. The workflow also exposes \`workflow_dispatch\`, so a maintainer can start the same job without creating a tag.

The filter controls workflow creation, but it does not compare the tag text with \`packages/cli/package.json\`. The package currently declares version \`0.4.1\`, and the YAML has no step that parses the ref or checks that version. A release review should call this distinction out instead of claiming that GitHub enforces version equality.

The exact trigger can be preserved in a repository test without sending a real tag. This check stays local and cannot start a release:

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const source = readFileSync('.github/workflows/cli-publish.yml', 'utf8');
const workflow = parse(source);
const trigger = workflow.on ?? workflow.true;

expect(trigger.push.tags).toEqual(['cli-v*']);
expect(trigger.workflow_dispatch).toBeDefined();
expect(workflow.jobs.publish['runs-on']).toBe('ubuntu-latest');
\`\`\`

Some YAML parsers interpret the key \`on\` as a boolean under older YAML rules. The fallback to \`workflow.true\` in this fixture makes that parser behavior visible, but choosing a YAML 1.2 parser is cleaner. The test should fail clearly if the parsed trigger cannot be found.

A local parser test is safer than creating throwaway release refs. It proves the repository declaration while leaving GitHub's matcher to the platform specification. The [GitHub package publication tutorial](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages) supplies the platform context, while the local assertion protects this repository's chosen prefix.

Use the [AI skill publishing guide](/blog/how-to-publish-ai-agent-skill-directory) for catalog publication concepts. QASkills CLI git tag publishing is narrower: it moves the CLI package to npm after its gates pass. Skill records and CLI releases follow different routes and should have separate test ownership.

## Which cases define npm publish GitHub Actions?

The npm publish GitHub Actions contract has four useful case groups: accepted triggers, rejected triggers, ordered gates, and credential boundaries. A parser fixture covers the first three without network access. A workflow integration check can cover the fourth with a disposable registry, but it must never print or use a production token.

Positive cases include \`cli-v0.4.1\` and a manual dispatch. Negative cases include a branch push, an unrelated tag, and a pull request because the workflow declares none of those events. Boundary cases should include \`cli-v\`, which technically matches the glob even though it is not a semantic version tag.

That last case exposes a policy gap rather than a YAML defect. If the team requires \`cli-vMAJOR.MINOR.PATCH\`, add a validation step before build or narrow the release process around protected tags. Do not write a test that expects semantic validation while the workflow only declares a glob.

The job itself uses \`pnpm install --no-frozen-lockfile\`. That command permits lockfile changes during resolution, unlike the stricter installation commonly used in CI. A regression test should assert the current command exactly, then document any planned migration separately so the test describes current behavior.

The package command is \`pnpm --filter @qaskills/cli publish --access public --no-git-checks\`. The package also declares \`publishConfig.access\` as \`public\` in \`packages/cli/package.json#publishConfig\`. This duplication makes public access explicit at both package and command levels, and a release test should preserve at least one deliberate declaration.

The [npm publish command reference](https://docs.npmjs.com/cli/v11/commands/npm-publish) explains publication behavior and package contents. It does not promise that this repository built the right files, so the build and E2E assertions remain local responsibilities. Review the current [QA skills catalog](/skills) only as the live service used by the gate, not as proof that npm publication occurred.

## tag triggered package release and the current QASkills contract

A tag triggered package release runs the built CLI against the live registry before npm receives a package. The comment and commands in \`packages/cli/e2e/e2e.mjs\` state that the gate uses \`dist/index.js\`, sets \`CI=1\`, disables telemetry, and defaults the API base to \`https://qaskills.sh\`.

The suite first checks fast commands: version, help, search, info, and agent listing. It then creates temporary directories for non-TTY \`init\` cases, checks generated \`SKILL.md\` files, and verifies that an invalid framework exits unsuccessfully without writing the file. Those checks prove executable behavior rather than TypeScript source shape.

The registry phase requests up to one hundred skills, chooses seven random slugs within the coded five-to-ten bounds, and installs each into a fresh temporary path. Every installed package must contain frontmatter and a body longer than one hundred characters. The suite removes each directory in a \`finally\` block.

Two sampled skills then exercise the content and artifact endpoints. The content response must be successful and begin with YAML frontmatter. The artifact response must provide an \`x-artifact-sha256\` header equal to a SHA-256 digest computed from the downloaded bytes.

This coverage is meaningful, but it is not fully deterministic because the sample is random and the service is live. A release failure may reflect registry availability or one sampled skill rather than a CLI code change. That is an accepted current dependency, not a reason to hide the failure.

QASkills CLI git tag publishing also disables telemetry through \`QASKILLS_TELEMETRY=0\`. The gate therefore avoids increasing install counts while exercising real installs. The [directory overview](/blog/ai-qa-skills-directory-2026) explains the catalog's user role, while this release contract treats that catalog as an external dependency.

## How do you test CLI publish E2E gate?

Test the CLI publish E2E gate in two layers. The first layer parses workflow and package files, which is fast and deterministic. The second builds the CLI and runs its executable suite, which validates package behavior against the live registry.

1. Read \`.github/workflows/cli-publish.yml\` and assert the \`cli-v*\` tag filter plus manual dispatch.
2. Assert that shared build, CLI build, unit tests, and E2E run before the publish command.
3. Read \`packages/cli/package.json\` and compare its version, package name, scripts, files, and public access setting.
4. Build shared and CLI packages, then run the unit command with a clean working tree.
5. Run \`pnpm --filter @qaskills/cli e2e\` with telemetry disabled and record its final summary.
6. Exercise a negative workflow fixture with a missing secret in a disposable registry, never against npm.

The repository-backed order assertion can stay small:

\`\`\`typescript
const steps = workflow.jobs.publish.steps;
const commands = steps.flatMap((step: { run?: string }) => (step.run ? [step.run] : []));

expect(commands).toEqual([
  'pnpm install --no-frozen-lockfile',
  'pnpm --filter @qaskills/shared build',
  'pnpm --filter @qaskills/cli build',
  'pnpm --filter @qaskills/cli test',
  'pnpm --filter @qaskills/cli e2e',
  'pnpm --filter @qaskills/cli publish --access public --no-git-checks',
]);
expect(steps.at(-1).env.NODE_AUTH_TOKEN).toBeDefined();
\`\`\`

The executable layer should preserve stdout and stderr when a command fails. \`packages/cli/e2e/e2e.mjs\` already truncates some caught error messages to two hundred characters, then prints a named failure summary. CI logs should retain that summary as the primary diagnostic.

Do not replace the live gate with mocks and claim equal coverage. Mocks are suitable for tag parsing, step order, and secret wiring. The real suite verifies the public [skill browsing route](/skills), content delivery, package installation, and artifact checksums together.

## NPM_TOKEN workflow test failure and edge-case matrix

An NPM_TOKEN workflow test should prove that credentials are available only to the final publication step. The workflow currently maps the repository secret to \`NODE_AUTH_TOKEN\` inside that step's environment, while earlier build and test steps do not declare it. Static assertions can protect this containment without reading any secret value.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills cli-v tag | Parsed \`cli-v0.4.2\` ref | Workflow is eligible through the tag filter | No run or wrong workflow | \`.github/workflows/cli-publish.yml#on\` |
| npm publish GitHub Actions | Ordered \`publish\` steps | Tests precede package publication | Publish command appears too early | \`.github/workflows/cli-publish.yml#jobs.publish\` |
| CLI publish E2E gate | Built CLI plus live registry | Final summary reports zero failures | Nonzero exit or named failure | \`packages/cli/e2e/e2e.mjs\` |
| NPM_TOKEN workflow test | Missing disposable token | Registry publication is rejected | Unexpected successful upload | \`packages/cli/package.json#publishConfig\` |
| manual CLI publish dispatch | Manual event fixture | Same publish job and gates run | Alternate untested path | \`.github/workflows/cli-publish.yml#on\` |

A missing token should fail at the registry boundary, but running that case against public npm creates needless risk. Use a local or disposable compatible registry and a package name that cannot collide with a real release. Assert a nonzero result and redact all authorization headers.

A malformed package version is another useful negative fixture. Npm should reject invalid package metadata before a package becomes public, but the local test should run \`npm pack --dry-run\` or a disposable publish path. Keep platform behavior tied to the npm source, and keep repository expectations tied to the package file.

Repeat-run behavior also matters. Public npm versions are immutable, so publishing the same name and version again should not be the main regression mechanism. Static workflow checks and package packing can repeat freely, while registry tests need unique disposable versions.

The [QASkills FAQ](/faq) can direct users after a released CLI fails, but it cannot diagnose a secret setup fault. Release logs should distinguish build failure, E2E failure, authentication rejection, and duplicate-version rejection. Each result has a different owner and recovery step.

## How should manual CLI publish dispatch run in CI?

Manual CLI publish dispatch should execute the same \`publish\` job as a matching tag, because the workflow defines both events at the top level and no event-specific job condition. A manual run is therefore a real publication path, not a dry run. Operators must verify the package version and release intent before clicking it.

That fact deserves an explicit checklist in the workflow description or repository release notes. The dispatch form has no declared inputs, so it cannot select dry-run mode, registry target, or package version. All values come from the checked-out repository, environment, and secrets.

For routine pull requests, reproduce every safe gate without invoking the manual event. Build shared, build the CLI, run unit tests, execute local parser checks, and use an approved E2E environment. Reserve manual dispatch for an intended release after those checks pass.

If a team adds a dry-run input later, test both values and retain one default. The job should branch before any token-bearing command, and logs should state whether it packed or published. Until that code exists, this guide does not treat manual dispatch as a rehearsal.

QASkills CLI git tag publishing can be monitored with GitHub's run status and npm's package result. It should not be inferred from the [blog index](/blog) or a catalog page. Those site routes help readers understand the product but do not expose workflow completion.

The current workflow has no concurrency group. Two release events could create two jobs, although npm's immutable version rule limits duplicate publication of one exact version. If release serialization becomes a requirement, add a concurrency policy and an assertion for its group and cancellation behavior.

## Implementation checklist for QASkills CLI git tag publishing

Use this checklist during review and before creating a release tag:

- Confirm the intended package version in \`packages/cli/package.json\`.
- Confirm the tag begins with \`cli-v\` and follows the team's version convention.
- Verify \`workflow_dispatch\` remains intentional because it can publish.
- Keep shared build before CLI build because the CLI depends on shared types and code.
- Keep unit and E2E commands before the npm publish command.
- Confirm \`NPM_TOKEN\` is scoped to the final step and never printed.
- Preserve \`QASKILLS_TELEMETRY=0\` inside the executable gate.
- Inspect every E2E failure name before retrying a release.
- Use a disposable registry for credential and repeat-publish negative tests.
- Compare the final npm version with the intended repository version.

The checklist separates declarations from runtime proof. YAML parsing proves event and step structure, package inspection proves release metadata, and the executable suite proves the built command can use registry contracts. No single assertion covers all three.

The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) helps with parser and fixture design. The [categories page](/categories) and catalog are useful live inputs for product checks, but deterministic tests should still own fixed local fixtures. Random live samples add breadth after stable unit cases.

QASkills CLI git tag publishing should fail closed. Any shared build, CLI build, unit, E2E, or publication error must leave the new version unavailable. A green workflow then means all declared commands returned successfully, not that every possible client environment was tested.

## How can a release rehearsal stay safe?

A safe release rehearsal proves each local gate without sending a package to npm. Start from a clean branch, read the package version, and record the exact tag you plan to use. QASkills CLI git tag publishing should remain the last step, not the first test of the release.

Create a short release note before you run any command. The note should name the package, version, tag, commit, and expected public registry. This small record helps a second reviewer spot a wrong ref before a token reaches npm.

Run the shared build because the CLI bundles code from that package. Then build the CLI and run its unit suite with the same Node version used by the workflow. A local pass cannot prove GitHub will run, but it can catch a broken package graph early.

Next, run the executable suite with telemetry disabled. Keep the full result, including each named case and the final count. If the live catalog fails, test it again once before deciding whether code or service health caused the fault.

Pack the CLI into a local tarball after the tests pass. Inspect the file list, package name, version, entry point, and executable mode. The [npm publish reference](https://docs.npmjs.com/cli/v11/commands/npm-publish) explains the registry step, while the tarball shows what this repo will send.

Install that tarball into a blank temp project. Run the version and help commands from the installed binary, not the source tree. This check finds missing files and bad package paths that a direct source run can miss.

The rehearsal should also parse \`.github/workflows/cli-publish.yml\` again. Assert that tests still come before QASkills CLI git tag publishing and that only the last step receives \`NODE_AUTH_TOKEN\`. No rehearsal log should print the token or an authorization header.

Do not create a matching remote tag for a dry run. A \`cli-v*\` push is a real trigger under the current file, and manual dispatch can reach the same publish command. Use a local tag name outside that pattern if another tool requires a ref.

A reviewer can compare the planned tag with \`packages/cli/package.json#publishConfig\` and the package version. The current workflow does not make that comparison for you. The release owner must stop when the two values describe different versions.

Use a disposable registry only when the test must observe upload behavior. Give the package a private test name and a fresh version, then delete its temporary config. Public npm is not a safe place to test missing tokens or repeat uploads.

The disposable test should cover one accepted token and one rejected token. It should also prove that build steps have no credential in their environment. That boundary is more useful than a snapshot containing a redacted secret-shaped value.

After the rehearsal, check the worktree for generated files. A package manager may write a tarball, test output, or lock change that should not enter the release commit. Remove only known rehearsal artifacts and keep any intentional source changes for review.

Ask a second person to read the workflow run plan before the tag push. They should verify the commit, version, tag prefix, package access, and final command. This review is quick because each item has one clear source in the repo.

When the real job starts, watch the ordered steps rather than waiting only for its final badge. A failed shared build and a failed live E2E check need different responses. Retrying without reading the named step can hide a service fault or repeat a bad release.

After npm accepts the version, install it in another blank directory. Run \`qaskills --version\`, one help command, and one read-only catalog command. This post-publish smoke test checks the public artifact without changing install counts when telemetry remains off.

Finally, link the npm result and workflow run from the release note. QASkills CLI git tag publishing is complete only when the intended version is public and the installed binary reports it. The note gives support teams a direct trail from tag to package.

The release lead should keep one plain text log for the whole run. Each line can hold a step name, start time, end time, and result. This log makes a slow or failed gate easy to find.

Use the same shell and package tool shown in the workflow when that choice can change output. A test run with another tool may pass while the real job reads a different lock file. Matching the job cuts that risk.

Check disk space before the build and pack steps on a shared runner. A full disk can look like a code fault and may leave half-made files. The next run should begin from a clean work path.

Keep the tag push small and direct. Do not mix source edits, version edits, and the remote tag in one hard-to-read command. A short sequence gives the reviewer a clear stop point before QASkills CLI git tag publishing.

If a job fails, save the first error and the named step. Do not hide it with many blind retries. One clean retry is enough to rule out a brief host fault in most release checks.

Read the test count before and after any retry. A lower count can mean a suite did not load, even when the shell returned zero. Named test output helps show that each planned gate ran.

The final smoke test should use a new temp folder with no old global CLI. Resolve the bin path from that local install and print it once. This proves the command came from the new package.

Check the public package page only after the local install reports the right version. A web page can lag or use cached data. The installed bin is the key proof for users of the command.

Close the release by marking each planned fact as checked. Keep open faults in a new issue rather than a note no one owns. This gives the next QASkills CLI git tag publishing run a clean start.

- final release record with package name version commit tag workflow run npm result local install path smoke command owner and any open follow up issue
- clean close note with checked facts saved links named owner safe token scope and next planned release date

## Frequently Asked Questions

### What does qaskills cli-v tag verify in QASkills?

The tag verifies that a pushed ref matches the workflow's \`cli-v*\` filter and starts the publish job. It does not verify semantic version shape or equality with package metadata. Add separate assertions for \`packages/cli/package.json\`, step order, and the final npm result.

### When should a team test npm publish GitHub Actions?

Test workflow structure on every change to the release YAML, package scripts, permissions, or package metadata. Run the full executable gate before an intended release. Credential failures and duplicate-version behavior belong in a disposable registry, not repeated experiments against the public npm service.

### How can a fixture isolate tag triggered package release?

Parse a copied workflow file and evaluate representative tag names without pushing repository refs. Assert the configured glob, manual trigger, job commands, and credential scope. This isolates repository policy while the official GitHub syntax documentation remains the authority for event matching behavior.

### Which assertion proves CLI publish E2E gate?

The strongest current assertion is a zero exit status from \`pnpm --filter @qaskills/cli e2e\` after both required builds. Preserve its named summary and verify telemetry is disabled. A YAML assertion that the command exists cannot prove the built CLI or live registry contract passed.

### What failure cases belong in NPM_TOKEN workflow test tests?

Cover a missing token, a rejected token, an authorization header leak, a duplicate disposable version, and a registry transport failure. Keep secrets redacted and scoped to publication. These cases test credential handling without changing the shared build, unit suite, or executable registry gate.

### How should CI run manual CLI publish dispatch checks?

CI should parse and validate the manual trigger, then run all safe build and test commands without dispatching a publication. A human should invoke the current manual workflow only for an intended release. The present workflow has no dry-run input, so manual dispatch can reach npm.

## Conclusion

QASkills CLI git tag publishing has a clear release chain: accepted event, ordered builds, unit checks, a live executable gate, and public npm publication. Protect each boundary with its own assertion, and treat random registry coverage as a useful addition to deterministic fixtures.

Before tagging, review the [getting started guide](/getting-started), run the package gate, and compare its catalog requests with [the live skills directory](/skills). That sequence checks the release from repository declaration through the public service without weakening the token boundary.`,
};
