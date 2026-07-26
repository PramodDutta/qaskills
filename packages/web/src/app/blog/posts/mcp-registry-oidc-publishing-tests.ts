import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP registry OIDC publishing tests',
  description:
    'MCP registry OIDC publishing tests guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP registry OIDC publishing tests',
  keywords: [
    'MCP registry OIDC publishing tests',
    'mcp-publisher GitHub OIDC',
    'registry id-token permission',
    'keyless MCP publishing',
    'OIDC login failure test',
    'MCP supply chain release',
  ],
  relatedSlugs: [
    'mcp-registry-qa-teams-guide-2026',
    'qaskills-mcp-server-guide',
    'mcp-package-registry-version-drift-tests',
    'mcp-server-contract-testing-guide',
  ],
  sources: [
    'https://docs.github.com/en/actions/concepts/security/openid-connect',
    'https://modelcontextprotocol.io/registry/quickstart',
    'https://github.com/modelcontextprotocol/registry',
  ],
  repoEvidence: [
    '.github/workflows/mcp-publish.yml',
    'packages/mcp/src/index.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP registry OIDC publishing tests should prove that the release job grants contents read and id-token write, then runs mcp-publisher login github-oidc before registry publish. The pass signal is a tagged or approved manual run that submits the expected record without any long-lived MCP Registry token; a missing token grant, hidden login failure, or skipped publish must fail.

MCP registry OIDC publishing tests limit this claim to Registry auth, because the same job still uses an npm token for npm publish. Teams can share the test flow through the [QA skills directory](/skills), but they should never blur those two trust paths.

## What must MCP registry OIDC publishing tests prove?

MCP registry OIDC publishing tests must prove that one allowed GitHub job can ask for a short-lived identity, use it with the Registry publisher, and stop on any auth or submit error. The evidence needs trigger, job rights, login mode, step order, work folder, exit state, and a read-only check of the new record.

The source of truth is .github/workflows/mcp-publish.yml. Its publish job grants contents: read and id-token: write, which is the small rights set shown in the committed workflow.

That job can start through workflow_dispatch or an mcp-v* tag. The trigger is part of the trust claim, because an OIDC token carries facts about the job that asked for it.

The Registry path starts after npm publish. The job downloads mcp-publisher, changes to packages/mcp for the final step, runs login github-oidc, and then runs publish.

No Registry token secret appears in that final step. The npm step does use secrets.NPM_TOKEN as NODE_AUTH_TOKEN, so a test must report keyless Registry auth without claiming the whole job has no long-lived key.

The [GitHub OIDC guide](https://docs.github.com/en/actions/concepts/security/openid-connect) explains that a job can present its GitHub identity and receive a short-lived token. It also explains why this avoids copying a long-lived service key into GitHub secrets.

The [official Registry source](https://github.com/modelcontextprotocol/registry) lists GitHub OIDC as a publish auth mode for GitHub Actions. It says Registry publish checks namespace ownership against the GitHub repo context.

Success needs a live run because static YAML cannot prove GitHub issued a token or the Registry accepted it. Static tests still catch bad rights, wrong command, secret use, and bad step order before a release starts.

The [QASkills MCP page](/mcp) shows the package that users find after release. This guide stays on the trust link between a GitHub job and the Registry record that points to that package.

The negative signal must be hard to hide. A failed login, absent token grant, bad namespace, or failed publish must leave the job red and must not be turned into a warning or empty pass.

## Which repository behavior defines the contract?

The workflow has one publish job on ubuntu-latest. It first checks out source, sets up pnpm and Node 20, installs deps, and builds the MCP package.

The npm step reads the version from packages/mcp/package.json. It skips npm publish when that exact version already exists, otherwise it uses the npm token to publish @qaskills/mcp.

The next step installs mcp-publisher from the Registry project's latest release archive. The workflow then moves the binary into PATH, making that downloaded program part of the release trust path.

Current source does not pin a publisher version or archive hash. Tests must not claim binary source proof that the workflow does not yet provide, though they can flag that fact for a later policy change.

The final step has working-directory packages/mcp. That matters because mcp-publisher publish reads server.json from the server package folder rather than the monorepo root.

Its run block calls mcp-publisher login github-oidc first and mcp-publisher publish second. Normal shell fail rules make a nonzero login stop the block before the submit command.

The job-level id-token write right allows the step to ask GitHub for an OIDC token. Contents read lets checkout read source, and the workflow does not grant a broad write right to repository contents.

The [Registry publish quickstart](https://modelcontextprotocol.io/registry/quickstart) places package publish before server metadata publish. It also says the Registry holds metadata rather than the npm artifact itself.

That order matches the QASkills job. packages/mcp/package.json identifies the npm package and version, while the Registry step submits the server record after npm has the artifact.

packages/mcp/src/index.ts is not an auth file, but it supplies the code behind the package being released. Keep its build result tied to the same tag so a valid OIDC run cannot bless stale dist output.

The [MCP registry QA guide](/blog/mcp-registry-qa-teams-guide-2026) covers wider policy. The [server guide](/blog/qaskills-mcp-server-guide) and [version drift test](/blog/mcp-package-registry-version-drift-tests) cover runtime behavior and release number flow.

The contract therefore has static and live halves. YAML checks prove the job asks the right way, while a protected run proves GitHub and the Registry accepted that request for the named release.

## How should QA teams test mcp-publisher GitHub OIDC?

An mcp-publisher GitHub OIDC test should parse the workflow and inspect the publish job as data. It must assert job rights, accepted triggers, exact login mode, final work folder, command order, and absence of a Registry secret.

Use a YAML 1.2 parser in the test package, then access jobs.publish directly. Text search alone can match a comment or disabled example that never runs.

Require permissions.contents to equal read and permissions.id-token to equal write. Reject missing values and broader contents write, because a release job should not gain unrelated rights by accident.

Read each step name and run field in order. The build command must come before npm publish, publisher install must come before Registry login, and Registry login must come before Registry publish.

Check that the final step uses packages/mcp as its work folder. A correct login from the wrong folder can still submit no record or the wrong server.json.

Limit the no-secret rule to Registry auth steps. The npm publish step has an npm secret today, and treating all secrets as a defect would misstate the committed design.

This example parses .github/workflows/mcp-publish.yml and checks the positive contract. It uses step names plus run text so a duplicate command cannot satisfy the wrong phase.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

describe('MCP Registry OIDC workflow', () => {
  it('grants the token right and logs in before publish', () => {
    const source = readFileSync(
      resolve(process.cwd(), '.github/workflows/mcp-publish.yml'),
      'utf8',
    );
    const workflow = parse(source);
    const job = workflow.jobs.publish;
    const registryStep = job.steps.find(
      (step: any) => step.name === 'Publish to MCP Registry',
    );

    expect(job.permissions).toEqual({
      contents: 'read',
      'id-token': 'write',
    });
    expect(registryStep['working-directory']).toBe('packages/mcp');
    expect(registryStep.run).toContain(
      'mcp-publisher login github-oidc',
    );
    expect(registryStep.run.indexOf('login github-oidc')).toBeLessThan(
      registryStep.run.indexOf('mcp-publisher publish'),
    );
    expect(JSON.stringify(registryStep)).not.toContain('secrets.');
  });
});
\`\`\`

The test package must add yaml as an owned dev tool and pin its major line. A parser update should run this fixture before it changes how workflow keys are read.

Static mcp-publisher GitHub OIDC checks should run on each workflow change. The live auth probe should run only in GitHub Actions, since a local shell has no matching job identity to present.

Use workflow_dispatch for a controlled proof only when release owners approve the target version. The [getting started page](/getting-started) is useful after publish, but it should not be part of the auth test.

Save run ID, event, ref, commit, package version, publisher version if known, login status, publish status, and returned server name. Do not save the raw OIDC token or its full claims.

MCP registry OIDC publishing tests should fail when the live run skips either auth step. A green job with conditions that bypass Registry publish is not proof of a release.

## Test matrix for registry id-token permission

A registry id-token permission matrix should cover the allowed job and one fault per trust edge. Each row needs a source fact, expected job state, and safe failure note.

The table treats a skipped command as a failure when the run is meant to publish. This blocks a weak check that sees no error only because the Registry step never ran.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Normal tag | mcp-v* ref | Publish job reaches Registry steps | Job or step is skipped | Workflow trigger |
| Manual run | Approved workflow_dispatch | Same auth and publish order runs | Manual path uses other rights | Workflow trigger |
| Minimum source right | contents read | Checkout works with no contents write | Broad write right appears | .github/workflows/mcp-publish.yml |
| Token grant | id-token write | Publisher can ask for job identity | Login cannot obtain identity | GitHub OIDC guide |
| Missing token grant | Permission removed in a copy | Static check fails before release | id-token path is absent | Test fixture |
| Exact login mode | github-oidc command | Registry auth uses job identity | Device login or token mode appears | Registry source |
| No Registry secret | Final step has no secrets value | Keyless Registry path remains clear | Registry token env is added | Workflow contract |
| Login error | Local command double exits nonzero | Publish command is not reached | Later submit still runs | Shell step order |
| Work folder | packages/mcp | Publisher reads package server.json | Root or another folder is used | Workflow source |
| Submit result | Protected live run | Expected name and version are accepted | Missing or wrong public record | Registry response |

Create static fault cases with in-memory copies of the parsed job. Never push a workflow with id-token removed merely to see a production release fail.

Use a command double for login and publish order. It should write only step names to a temp log, exit with chosen codes, and prove a failed login prevents the submit call.

The live run should use the real publisher against an owned namespace. Do not send fake ownership data or probe another project's name as a negative test.

The [blog hub](/blog) can group this matrix with package and version checks. Keep OIDC evidence brief, because full auth logs can hold repo, actor, and ref data that needs care.

## What failures expose keyless MCP publishing?

Keyless MCP publishing fails when the job cannot get identity, presents the wrong trust facts, uses the wrong login mode, or hides a rejected submit. The test should keep these cases apart because they need different fixes.

A missing id-token write right is a workflow setup fault. Detect it in parsed YAML before a runner starts, then show the exact path jobs.publish.permissions.id-token.

A token request error during a live run can come from GitHub job context, runner setup, or a disabled trust path. Save the safe provider error and run ID, but never print token data to make triage easier.

A Registry auth rejection often means the namespace does not match the repo owner or job. Compare the canonical server name with the owned GitHub context and the committed package metadata.

An unexpected login command is also a defect. Device login, saved local auth, or a secret token can work on a developer machine while bypassing the keyless CI claim.

Search the Registry step env and run text for secret refs and token flags. Keep this as a deny check beside the exact github-oidc allow check, since either one alone can miss a mixed auth path.

Do not ban the npm secret in the prior step under this rule. Report it as a separate package publish control, because the current job has keyless Registry auth but token-based npm auth.

The current publisher download uses a latest URL and no digest in source. That is a supply chain gap outside the OIDC token proof, and the test report should state it rather than imply full binary proof.

A failed mcp-publisher publish must keep the job red. Reject continue-on-error, shell patterns that swallow status, or follow-up steps that mark the release complete without a public record.

An empty Registry query after a reported success is not a pass. Poll with a small cap for read delay, then fail with expected name, version, and run ID if the row never appears.

The [QASkills MCP page](/mcp) should not be used as the sole publish check. A web page can stay live while the new Registry version is absent or points to an old npm artifact.

Keyless MCP publishing proof ends with accepted server metadata tied to the owned job and package. It does not prove runtime tools, npm token safety, or all release inputs unless those checks also run.

## CI coverage for OIDC login failure test

An OIDC login failure test should have one static lane, one local command lane, and one protected live lane. Each gives proof that the other lanes cannot produce safely on their own.

The static lane parses YAML and runs on every pull request that touches the workflow. It checks rights, triggers, step names, work folder, commands, secret refs, and order without asking GitHub for a token.

The local command lane runs a small shell or process helper with fake publisher commands. It makes login return a chosen nonzero code and requires that publish never appears in the call log.

Do not run the real mcp-publisher login from normal pull requests. Fork jobs and untrusted changes should never receive release identity or reach a write command.

The protected lane should run for approved tags or manual releases in the main repo. Use GitHub environment rules if the team has them, and bind the public record check to the same commit and package version.

Set a hard job timeout and shorter step bounds. A token request or Registry call that waits forever must fail and must not leave an unclear in-progress release.

Keep normal logs at a low level. Save command names, status, publisher release, server name, version, event, ref, and run ID, but redact headers and auth output.

The second code sample validates failure rules on a copied job. It proves that a missing token right and a Registry secret both get clear local errors.

\`\`\`typescript
import { expect, it } from 'vitest';

function assertKeylessRegistryJob(job: any): void {
  if (job.permissions?.['id-token'] !== 'write') {
    throw new Error('jobs.publish.permissions.id-token must equal write');
  }
  const step = job.steps.find(
    (item: any) => item.name === 'Publish to MCP Registry',
  );
  if (!step?.run?.includes('mcp-publisher login github-oidc')) {
    throw new Error('Registry step must use login github-oidc');
  }
  if (JSON.stringify(step).includes('secrets.')) {
    throw new Error('Registry step must not use a long-lived secret');
  }
}

it('rejects missing OIDC rights and secret fallback', () => {
  const base = {
    permissions: { contents: 'read', 'id-token': 'write' },
    steps: [{
      name: 'Publish to MCP Registry',
      run: 'mcp-publisher login github-oidc\\nmcp-publisher publish',
    }],
  };
  const noToken = structuredClone(base);
  delete noToken.permissions['id-token'];
  expect(() => assertKeylessRegistryJob(noToken)).toThrow(
    'jobs.publish.permissions.id-token must equal write',
  );

  const secretFallback = structuredClone(base);
  secretFallback.steps[0].env = { REGISTRY_TOKEN: '\${{ secrets.MCP_TOKEN }}' };
  expect(() => assertKeylessRegistryJob(secretFallback)).toThrow(
    'Registry step must not use a long-lived secret',
  );
});
\`\`\`

This fixture contains only a GitHub expression string, not a real secret. Keep it in memory and confirm the production workflow stays unchanged after all negative cases.

On a live OIDC login failure, stop the lane before Registry submit and public lookup. The [registry QA guide](/blog/mcp-registry-qa-teams-guide-2026) can guide wider triage after this exact auth gate reports its phase.

Retry only safe reads and clear network faults. Do not retry a namespace or permission rejection until source or trust setup changes, because repeats add noise without a new cause.

MCP registry OIDC publishing tests should retain failure evidence under normal CI access rules. Auth logs deserve a shorter life and smaller audience than public package metadata.

## How should an MCP supply chain release be asserted?

An MCP supply chain release needs a chain of checks, not one green publish icon. Source, build, npm artifact, publisher binary, GitHub identity, Registry metadata, and runtime package must all point to one tag.

Start by requiring a tag or approved manual ref at the expected commit. Record packages/mcp/package.json name and version before build, then lock that pair for the rest of the job.

Build packages/mcp/src/index.ts into dist through the committed package command. A later test should pack and start that dist before either public write, so OIDC never blesses an untested build.

The npm step must publish or prove that the exact version already exists. If it skips, compare the existing package hash with the approved artifact rather than assume a matching version means matching bytes.

The publisher install step is another input. Record its real version and verify it against an approved pin or digest once the workflow adds that policy.

Current source uses a latest archive URL, so today's test can record and flag the resolved release but cannot prove an absent pin. Be exact about that limit in the release report.

GitHub identity should be short lived and bound to the job. The static permission check plus accepted github-oidc login gives evidence for that trust edge without storing the token.

Registry metadata must name the expected server, npm package, and version. A read-only query after publish should return one matching record, not merely any QASkills row.

Finally, launch the pinned npm package and check initialize plus tools/list. That runtime smoke shows the Registry record points users toward a package that can start and expose the expected server.

Use the [version drift test](/blog/mcp-package-registry-version-drift-tests) for exact value flow. This section joins its result with auth and artifact proof rather than repeating all version fixtures.

Treat each missing link as a failed release. A valid OIDC login cannot offset an old package, and a good npm archive cannot offset a rejected Registry submit.

## Step-by-step test implementation

Implement the release checks in six stages that stop before each write when prior proof is missing. The job should carry one release ID from source read through public lookup.

1. Read .github/workflows/mcp-publish.yml, packages/mcp/package.json, and packages/mcp/src/index.ts. Record triggers, job rights, package name, version, build command, login mode, final work folder, and Registry command.
2. Parse the workflow with a YAML 1.2 tool and build copied faults for mcp-publisher GitHub OIDC and registry id-token permission. Remove one right, change one command, add one fake secret ref, and move one step in separate cases.
3. Run static and command-order tests on pull requests without OIDC access. Require the build before npm publish, publisher install before login, login before submit, exact packages/mcp cwd, and no Registry secret fallback.
4. Build, pack, scan, and start the MCP artifact on the approved commit. Lock package name, version, archive hash, and runtime result before any public release step can run.
5. Run the protected tag or manual job with id-token write. Require github-oidc login success, Registry publish success, no swallowed status, and a read-only public row matching the locked server and package data.
6. Save safe chain facts, remove temp files, and route any fault to workflow, package, Registry, or trust ownership. Redact auth data, enforce log life rules, and block completion when any phase lacks evidence.

Keep fault fixtures local and free of write calls. There is no need to break a live tag to prove that missing rights or bad order makes the gate fail.

Add one review owner for workflow rights and one for package identity. Two focused reviews are safer than an unclear group approval where each side assumes the other checked the trust link.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) can hold the runtime smoke details. This OIDC suite should consume its result as one release fact and stay focused on the publish trust path.

Run MCP registry OIDC publishing tests again when triggers, permissions, publisher install, login mode, package path, or Registry commands change. Runtime-only edits still need artifact tests, but they need not rewrite auth fixtures.

## Failure triage and regression ownership

Triage starts with static source. If rights, commands, work folder, or order are wrong in parsed YAML, assign release workflow ownership before a live job runs.

If GitHub cannot issue identity despite correct source, inspect event, repo, environment, runner context, and platform status. Share the run ID and safe error, not the token endpoint response body.

If login rejects identity, compare Registry namespace with the GitHub owner and repo bound to the job. This belongs to trust or Registry metadata ownership, not MCP runtime code.

If login passes and publish fails validation, inspect server.json, npm package state, version parity, and publisher output. The Registry guide can help map a named validation error to the field that needs work.

If publish reports success but the public row is absent, check the exact API version, expected name, read delay, and response status. Keep bounded reads apart from the original write result.

If the row exists but points to wrong package data, stop user launch promotion. Assign metadata and release ownership with the submitted record, returned record, package hash, and tag.

If OIDC passes but the npm package is old or broken, the package lane failed. Do not remove auth checks or republish Registry data until the artifact owner supplies a clean build.

If a secret ref appears only in the npm step, route it to npm auth policy. If it appears in the Registry step, treat it as a direct keyless contract regression.

Use the [QA skills directory](/skills) to share safe triage steps with release agents. Keep tokens, full claims, and unredacted command traces out of skill text and normal issue bodies.

Close the fault with the narrow test that first caught it plus one protected success run. A static fix without accepted live identity is not full OIDC release proof.

## Frequently Asked Questions

### What should an mcp-publisher GitHub OIDC test verify?

An mcp-publisher GitHub OIDC test should verify the allowed trigger, id-token write, contents read, exact github-oidc login, packages/mcp work folder, and login-before-publish order. A protected live run must then show that GitHub identity was accepted without exposing or saving the short-lived token.

### Why is registry id-token permission set to write?

Registry id-token permission uses write so the GitHub job can request an OIDC identity token from the platform provider. It does not grant write access to repository contents; the workflow keeps contents at read, and the test should reject any broader right added without clear need.

### Does keyless MCP publishing mean the whole job has no secret?

No, keyless MCP publishing describes the MCP Registry login path in this workflow. The npm publish step still receives secrets.NPM_TOKEN as NODE_AUTH_TOKEN, while the later Registry step uses github-oidc and contains no long-lived Registry token; tests and release notes must keep that scope clear.

### What should an OIDC login failure test retain?

An OIDC login failure test should retain run ID, event, ref, commit, publisher version, phase, status, and a redacted provider message. It should not keep token values, full claims, auth headers, or broad environment dumps, and it must prove the Registry publish command never ran.

### Which checks complete an MCP supply chain release?

An MCP supply chain release needs source and permission checks, a tested package build, archive identity, known publisher input, accepted job identity, matching Registry metadata, and a pinned runtime smoke. Each fact should carry the same tag and commit, with any missing link blocking completion.

## Conclusion

MCP registry OIDC publishing tests make the Registry trust path clear and testable. Parsed workflow rules, local failure fixtures, protected live auth, public record checks, and safe evidence prove keyless Registry publish without hiding the separate npm token.

Review the [QASkills MCP integration](/mcp), then browse release checks in the [QA skills directory](/skills). Apply this OIDC matrix before the next MCP release and keep its redacted chain record with the approved tag.`,
};
