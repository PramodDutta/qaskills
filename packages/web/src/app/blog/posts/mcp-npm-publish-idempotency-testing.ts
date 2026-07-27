import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP npm publish idempotency testing',
  description:
    'MCP npm publish idempotency testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP npm publish idempotency testing',
  keywords: [
    'MCP npm publish idempotency testing',
    'rerun MCP publish workflow',
    'npm version already exists',
    'idempotent package release',
    'registry publish retry',
    'MCP release partial failure',
  ],
  relatedSlugs: [
    'mcp-registry-qa-teams-guide-2026',
    'mcp-package-registry-version-drift-tests',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
  ],
  sources: [
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json/',
    'https://modelcontextprotocol.io/registry/quickstart',
    'https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows',
  ],
  repoEvidence: [
    '.github/workflows/mcp-publish.yml',
    'packages/mcp/src/index.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP npm publish idempotency testing must prove a rerun skips an exact version already present on npm while still reaching the separate MCP Registry publish. Success is one npm version, an attempted registry retry, and a completed job. Duplicate npm publish, early failure, or a skipped registry step disproves the rerun contract.

## What must MCP npm publish idempotency testing prove?

MCP npm publish idempotency testing must model release state before running commands. The important retry begins after npm accepted the version but before the MCP Registry step completed.

On that retry, the workflow reads the same package version and asks npm whether the exact scoped version exists. A successful lookup selects a skip message instead of a second publish command.

The later registry installation, login, and publish steps must remain reachable. They are not nested inside the npm missing-version branch, so existing npm state should not suppress registry retry.

The first-run case needs the opposite branch. A controlled missing-version result should call npm publish once and continue to registry publish only after that command succeeds.

Separate absence from lookup failure in the test model. The current shell condition treats any nonzero \`npm view\` status as the publish branch, so network and auth failures deserve explicit diagnostics.

The pass oracle records package version, lookup outcome, npm action count, registry action count, command order, and job status. A final green label alone cannot show whether a duplicate command ran and happened to be tolerated.

The [QASkills MCP page](/mcp) represents the destination users expect after release. Both npm distribution and registry data must align before that release is fully recoverable.

MCP npm publish idempotency testing does not claim that arbitrary workflow steps can repeat without side effects. It covers the exact version guard and the independent registry path shown in the committed workflow.

## Which repository behavior defines the contract?

The release definition in \`.github/workflows/mcp-publish.yml\` runs on manual dispatch and tags matching \`mcp-v*\`. Its single publish job receives repo read access and identity-token write access.

After checkout, pnpm setup, Node 20 setup, dependency installation, and MCP build, the workflow reaches \`Publish to npm\`. That step reads the version from \`packages/mcp/package.json\`.

The shell asks \`npm view "@qaskills/mcp@$V" version\`. When the command succeeds, it prints that the version is already present and skips the publish command.

When lookup returns nonzero, the else branch runs \`pnpm --filter @qaskills/mcp publish --access public --no-git-checks\`. A successful first publish then allows later steps to continue.

The workflow next downloads and installs \`mcp-publisher\`. Its final step changes working directory to \`packages/mcp\`, logs in with GitHub OIDC, and runs registry publish.

That placement is the key retry fact: registry commands appear after the conditional npm step, not inside its else branch. An existing npm version should therefore leave registry retry reachable.

The package identity and version come from \`packages/mcp/package.json\`, while \`packages/mcp/src/index.ts\` reads that same version into server identity and request headers. Release tests should preserve this cross-file version evidence.

The [npm package.json reference](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) defines the package version field as publish identity. npm does not permit replacing an already published name and version with different content.

The [MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart) documents separate publisher login and publish commands. That registry operation follows npm distribution but remains a distinct release action.

Use the [MCP registry guide](/blog/mcp-registry-qa-teams-guide-2026) for broader release context. The exact idempotency oracle still comes from command branches and step order in the workflow.

## How should QA teams test rerun MCP publish workflow?

A rerun MCP publish workflow test should parse committed YAML, find steps by name, and inspect both structural order and embedded shell commands. Text search alone can miss indentation changes that move a command under another branch.

Create a command adapter for lookup, npm publish, publisher installation, registry login, and registry publish. The adapter records invocations and returns controlled statuses without contacting public services.

The first scenario reports the exact package version as present. Require one lookup, zero npm publish calls, one registry login, one registry publish, and successful completion.

The second scenario reports the version as missing. Require one npm publish between lookup and registry setup, then the same later registry sequence.

The third scenario makes npm publish fail. Registry actions should not run because normal GitHub shell step failure stops subsequent steps, and the job must retain the publish error.

The fourth scenario starts with npm present and makes registry publish fail. The job should fail without another npm publish, creating the real partial state that a second rerun must recover.

On the second rerun, npm remains present and registry publish succeeds. Compare the action ledger with the first retry to prove state recognition prevents duplicate package publish.

MCP npm publish idempotency testing should use a fixed test version such as \`0.1.2-fixture\` only inside mocks. Never probe or publish a plausible real version during unit or pull-request runs.

The [package registry drift tests](/blog/mcp-package-registry-version-drift-tests) can verify released state after a controlled workflow succeeds. This suite focuses on decisions before external state is changed.

Validate the harness by removing the version guard in a fixture copy. The existing-version scenario must then record a duplicate publish attempt and fail for the expected reason.

## Test matrix for npm version already exists

The npm version already exists matrix should cover first publish, ordinary rerun, partial registry failure, lookup ambiguity, and workflow trigger context. Each row requires an action ledger.

Keep the package version constant across retry rows. Changing it would create a new release, not test retry of the same release attempt.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| First publication | Exact version absent; publish succeeds | One lookup, one npm publish, then registry publish | Registry runs before npm success | \`.github/workflows/mcp-publish.yml\` |
| Existing npm version | Exact version lookup succeeds | npm publish is skipped; registry publish runs | Duplicate npm command or early stop | \`.github/workflows/mcp-publish.yml\` |
| Registry partial failure | npm present; registry command fails | Job fails after zero npm publish calls | Failure is reported as npm issue | MCP Registry quickstart |
| Registry recovery rerun | npm present; registry now succeeds | Skip npm and complete registry publication | Retry never reaches registry | \`.github/workflows/mcp-publish.yml\` |
| npm publish failure | Version absent; publish returns nonzero | Job fails and registry steps do not run | Registry advertises absent package | GitHub Actions step behavior |
| Lookup network failure | \`npm view\` returns nonzero without 404 evidence | Current branch attempts publish; test flags ambiguity | Outage is treated as proven absence | \`.github/workflows/mcp-publish.yml\` |
| Version mismatch | Tag text differs from package version | Workflow still uses manifest version and records mismatch | Test assumes tag is package identity | \`packages/mcp/package.json\` |
| Manual dispatch | Workflow runs without a tag | Same manifest-based decision path executes | Trigger path changes version logic | GitHub workflow triggers |

The lookup network row characterizes current behavior and exposes risk. The guard branches on status alone, so the test should retain stderr and classify whether nonzero meant missing, unauthorized, or unreachable.

The version mismatch row avoids an invented workflow claim. Current shell derives \`V\` from package data rather than parsing the pushed tag.

The manual row matters because retry may use workflow dispatch after a tagged run partially fails. It must reach the same version check and registry commands without requiring tag-only context.

The [GitHub Actions trigger documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) explains manual and push event behavior. The repo narrows push execution to \`mcp-v*\` tags.

MCP npm publish idempotency testing passes only if first-run and retry ledgers differ at the npm action while converging on the same registry step. A duplicated full ledger signals that the guard did not influence behavior.

## What failures expose idempotent package release?

An idempotent package release fails when repeated execution causes an invalid duplicate side effect or cannot progress from a valid partial state. Both action counts and final state are required to detect those failures.

The clearest negative fixture returns success from the exact-version lookup and configures the fake npm publish command to throw if called. A passing workflow model must never reach that trap.

Next, fail registry publish after npm presence is confirmed. The error should name the registry command, retain zero npm publish calls, and leave the action ledger available for another retry.

For first publish, make npm publish fail before any registry command. The failure proves the workflow does not advertise data for a package version that was not successfully distributed.

The first code example asserts the committed workflow structure and exact guard fragments. It also verifies registry publish appears later as an independent step.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { expect, test } from 'vitest';

test('keeps npm retry guard before independent registry publication', async () => {
  const workflow = parse(await readFile('.github/workflows/mcp-publish.yml', 'utf8'));
  const steps = workflow.jobs.publish.steps;
  const npmIndex = steps.findIndex((step: { name?: string }) => step.name === 'Publish to npm');
  const registryIndex = steps.findIndex(
    (step: { name?: string }) => step.name === 'Publish to MCP Registry',
  );
  const script = steps[npmIndex].run as string;

  expect(script).toContain("require('./packages/mcp/package.json').version");
  expect(script).toContain('npm view "@qaskills/mcp@$V" version');
  expect(script).toContain('already on npm, skipping publish');
  expect(script).toContain('pnpm --filter @qaskills/mcp publish');
  expect(registryIndex).toBeGreaterThan(npmIndex);
  expect(steps[registryIndex].run).toContain('mcp-publisher publish');
});
\`\`\`

Avoid asserting irrelevant YAML formatting. Step order, working directory, permissions, and commands are the repo-owned properties that preserve retry.

MCP npm publish idempotency testing should attach the parsed package version and workflow commit to each failure. A stale workflow fixture can otherwise report a branch that production no longer uses.

The [QASkills blog](/blog) contains adjacent package and registry checks. Keep this release model focused enough that a failure names one command decision rather than a broad publish problem.

## CI coverage for registry publish retry

A registry publish retry contract test can run without npm or registry keys because its normal role is structural and simulated. Public service calls belong in a protected release or post-release verification job.

Run YAML contract checks whenever the workflow, MCP manifest, server data, or release scripts change. A manifest-only version bump still exercises the guard at release time.

Add a test fixture that evaluates the extracted branch with stub commands. Avoid executing arbitrary workflow text directly; model the small decision while separately asserting that committed text contains the expected commands.

The second code example defines action expectations for first run, partial failure, and retry. Its fake operations make duplicate npm publish a visible call-count defect.

\`\`\`typescript
test.each([
  {
    name: 'first run',
    npmHasVersion: false,
    registryFails: false,
    expected: ['view', 'npm-publish', 'registry-publish'],
  },
  {
    name: 'registry recovery',
    npmHasVersion: true,
    registryFails: false,
    expected: ['view', 'registry-publish'],
  },
  {
    name: 'partial registry failure',
    npmHasVersion: true,
    registryFails: true,
    expected: ['view', 'registry-publish'],
  },
])('$name follows the release decision', async (fixture) => {
  const actions: string[] = [];
  const result = await runReleaseDecision(fixture, actions);

  expect(actions).toEqual(fixture.expected);
  expect(actions.filter((action) => action === 'npm-publish')).toHaveLength(
    fixture.npmHasVersion ? 0 : 1,
  );
  expect(result.ok).toBe(!fixture.registryFails);
});
\`\`\`

Preserve registry error output but never identity tokens or npm keys. The workflow's identity-token write permission is required for OIDC, so logs need deliberate redaction.

Use a concurrency policy or operational release rule to prevent two first runs for the same version from racing between lookup and publish. The current guard reduces retry risk but does not make that check-and-publish pair atomic.

After a protected workflow run, verify npm version, registry identity, and package data through read-only queries. The [MCP registry QA guide](/blog/mcp-registry-qa-teams-guide-2026) can own that broader state comparison.

MCP npm publish idempotency testing should block workflow changes that nest registry steps under the absent-version branch. Such indentation drift would remove the retry path even though first publish still works.

## How should MCP release partial failure be asserted?

An MCP release partial failure needs a state table rather than one exception assertion. Record whether npm has the version, whether registry publish completed, and which next action is safe.

When npm is absent, the safe next action is npm publish followed by registry publish. When npm exists but the registry is absent or stale, the safe action skips npm and retries the registry.

When both systems already reflect the version, rerunning should still avoid npm publish. Registry publisher behavior may confirm or update data, but that external idempotency belongs to its documented command and observed result.

Simulate registry failure after login and after publish starts as separate cases when the adapter can distinguish them. Both should leave the npm action count at zero on retry.

Assert command order explicitly. Registry publish before npm success can create data that points to an unavailable package, while npm publish after registry retry creates a forbidden duplicate attempt.

Keep the version from \`packages/mcp/package.json\` as the shared state key. Also compare the server version because the registry data and runtime package should describe the same release.

The executable reads that version in \`packages/mcp/src/index.ts\`, making stale build output another possible partial state. A release preflight should compare package JSON, built server identity, and intended registry data.

MCP npm publish idempotency testing should distinguish retry safety from rollback. npm versions cannot simply be overwritten, so a bad published artifact generally requires a new version rather than another publish of the same identity.

Use the [package drift guide](/blog/mcp-package-registry-version-drift-tests) to examine final identity consistency and the [QASkills MCP guide](/blog/qaskills-mcp-server-guide) for user verification. The action ledger remains the primary retry assertion.

A strong partial-failure report says npm version present, npm publish skipped, registry publish attempted once, registry command failed, rerun safe. That statement gives an operator an exact next step without hiding the failed release.

## Step-by-step test implementation

Implement the test from committed workflow structure toward simulated release states. This order catches accidental YAML drift before interpreting branch behavior.

1. Parse \`.github/workflows/mcp-publish.yml\`, locate named setup, build, npm, publisher-install, and registry steps, then assert their order and required permissions.
2. Read \`packages/mcp/package.json\`, capture the exact name and version, and verify the npm guard derives its query from that manifest value.
3. Build a command adapter that returns controlled lookup, npm publish, login, and registry statuses while recording every invocation in order.
4. Execute first-run, existing-version, npm-failure, registry-failure, and registry-recovery states, comparing exact actions, final status, and unchanged package identity.
5. Inject an ambiguous lookup failure and a fixture with registry commands nested under the npm else branch, requiring clear risk and structural failures.
6. Run the focused contract before protected publication, retain redacted action evidence, then perform read-only npm and registry checks after a real release.

### A safe retry drill for the release team

Start the drill with one fake name and one fake version. Write both at the top of the run sheet with the test date and job id from the current run. Do not use a name that any real npm task could own.

Give the fake npm check one of three states: found, not found, or could not check. Keep these states apart in the stub and print the chosen state before the first act in the saved action list. A plain pass or fail code hides the fact the team needs most.

In the found case, set the npm publish stub to fail if it gets one call. The run should skip that stub and move to the MCP index step with the same name and version from the start card in the saved job log. This trap proves the guard did real work.

In the not-found case, allow one npm publish call and no more. Make that call pass, then let the index step run with no reset of the action list or loss of the first check state. The log should show check, npm push, login, and index push in that order.

In the could-not-check case, stop the safe model and print the check fault with its code and short stderr tail from the same run. The live shell does not make this split yet. Keeping the test state clear shows why a net fault must not be called proof of absence.

Next, make the npm push fail on the first-run path. No index tool should be fetched or run after that fault, and its call count must stay at zero through the end of the drill. This keeps the index from naming a pack that users cannot get.

Now start with npm found and make the index login fail. The run should show no npm push and one login try after the found check, with the same start state kept in the log until the run ends. Its last line should say the same version is safe to retry after the login fault is fixed.

Run that state once more with a good login and a bad index push. Again, npm must get no push call while the login count stays at one. This time the report should name the index push as the first bad act.

On the last run, let both login and index push pass. The action list should still have no npm push. The drill now proves that the same partial state can move to a full end state.

Keep each action as a short verb in one list. Use check, npm-push, tool-get, login, and index-push. A small set makes count and order checks easy to read in any failed job.

Store command text apart from command output. Redact keys and tokens before the output reaches the test log. The action list needs no secret data to prove which branch ran.

Read the version from the package file on each drill run. Do not cache it in the test tool. This makes a real version bump flow through both the check and the fake side effects.

Check the built server version before the fake push path starts. A stale build should stop the drill with a build fact, not turn into an index retry. This keeps pack and retry faults in their own lanes.

Use the [MCP release page](/mcp) to check the end goal after the drill. Use the [start guide](/getting-started) for a local pack check. Neither page should drive the branch state in the fake run.

Try one bad workflow copy with the index step inside the npm else branch. The found case must end with no index push and a clear test fail. This shows the gate can catch a lost retry path.

Try one more bad copy with the npm check gone. The found case must hit the npm push trap at once. This shows the side-effect count can catch a risky full rerun.

End the drill with four facts: start state, actions, first fault, and safe next act. Keep the line short enough for the job view. A release lead can then choose the next run without guesswork.

Keep simulation logic independent from GitHub service uptime. Its job is to prove decisions, while protected integration checks prove keys and remote command behavior.

Do not edit workflow text inside the main tests. Load fixture copies for mutation cases so the committed release definition stays the single production input.

Test manual dispatch and tag-trigger structure without synthesizing broad GitHub event payloads. The workflow currently reads version from the package, so event details should not become invented dependencies.

The [getting started guide](/getting-started) can help maintainers verify the released command after both systems converge. Release tests should finish with exact state rather than installation anecdotes.

MCP npm publish idempotency testing is convincing when a deliberate duplicate branch and a nested registry step both fail. Those mutations prove the gate protects side-effect count and retry reachability.

## Failure triage and regression ownership

Begin with the action ledger and external state at the start of the run. If the exact npm version already existed, any npm publish invocation is a workflow branch defect.

If lookup returned nonzero, inspect status and stderr before calling the version absent. A network, auth, or registry outage can enter the same current else branch as a genuine missing version.

An npm publish failure with a missing version belongs to package build, keys, npm policy, or package data. Registry steps should remain unattempted in that run.

A registry failure after an existing-version skip belongs to publisher installation, OIDC login, server data, registry validation, or registry uptime. It should not be assigned to npm merely because npm ran earlier in the workflow.

If registry commands never appear after a successful skip, inspect step order, shell scope, conditions, and indentation. The retry contract has been structurally removed or a prior independent step failed.

When package and tag versions differ, remember that current workflow logic chooses package data. Report the mismatch before deciding whether the wrong version was queried.

If both publish steps succeed but runtime reports another version, compare dist output and the version read by \`packages/mcp/src/index.ts\`. That is a stale build problem rather than retry logic.

Use the [QASkills MCP page](/mcp) for final user-visible checks and the [registry drift article](/blog/mcp-package-registry-version-drift-tests) for cross-system comparison. Keep keys redacted in every attached command log.

MCP npm publish idempotency testing should close triage with initial state, ordered actions, first failed command, and safe next action. That format supports retry without encouraging an unsafe duplicate release.

## Frequently Asked Questions

### When should teams rerun MCP publish workflow?

Rerun after identifying the partial state and confirming the same package version is intended. If npm already holds that version but registry publish failed, the committed guard should skip npm and continue. Preserve the prior error, verify keys or data, and observe the retry action ledger.

### Why check whether the npm version already exists?

npm package identity combines name and version, and an existing version cannot be replaced with different content. The exact lookup lets a retry run avoid an invalid duplicate publish. Tests must still distinguish a confirmed match from network or auth failures that also return nonzero statuses.

### What makes an idempotent package release test credible?

It compares side effects across repeated states, not just final success. Require zero npm publish calls when the version exists, one registry attempt during retry, exact command order, stable package identity, and visible errors. Negative controls should prove a removed guard triggers the duplicate-call oracle.

### How should a registry publish retry handle npm state?

Treat npm presence as an input to the retry decision. When the exact version exists, skip package publish and proceed to registry login and publish. If npm is absent, publish it first. Never infer absence from an unclassified lookup outage, and retain the command evidence.

### What is the key MCP release partial failure record?

Record package name and version, npm presence, registry state, ordered commands, first failing status, and safe next action. For the common retry case, that means npm present, npm publish skipped, registry attempted once, registry failed, and another registry-focused rerun remains safe after fixing its cause.

## Conclusion

MCP npm publish idempotency testing protects retry after a two-system release stops midway. Parse the workflow, model exact npm state, count side effects, preserve registry reachability, classify lookup failures, and prove repeated execution never attempts to republish an existing version.
Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this release-state matrix before the next MCP release.`,
};
