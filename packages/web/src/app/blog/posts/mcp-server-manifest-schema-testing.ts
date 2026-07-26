import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP server manifest schema testing',
  description:
    'MCP server manifest schema testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP server manifest schema testing',
  keywords: [
    'MCP server manifest schema testing',
    'server.json validation CI',
    'MCP registry schema error',
    'official server schema test',
    'MCP manifest required fields',
    'mcp-publisher validation failure',
  ],
  relatedSlugs: [
    'mcp-registry-qa-teams-guide-2026',
    'mcp-package-registry-version-drift-tests',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/registry/quickstart',
    'https://registry.modelcontextprotocol.io/docs',
    'https://github.com/modelcontextprotocol/registry',
  ],
  repoEvidence: [
    'packages/mcp/server.json',
    '.github/workflows/mcp-publish.yml',
    'packages/mcp/src/index.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP server manifest schema testing should validate the committed server.json against its declared official schema and compare identity, version, package, transport, and env data with repo truth. Success produces no schema or cross-file drift before release. A missing field, wrong type, mismatched package value, invalid transport, or vague pathless error disproves the contract.

## What must MCP server manifest schema testing prove?

MCP server manifest schema testing must prove two layers before registry release. The JSON document must satisfy its declared schema, and values shared with package or runtime files must remain consistent.

The manifest in \`packages/mcp/server.json\` declares the dated 2025-12-11 official server schema. It names the server, package, version, stdio transport, repo, and one optional API base URL variable.

The package source in \`packages/mcp/package.json\` contains \`name\`, \`version\`, and \`mcpName\`. These values should match the manifest package id, both manifest versions, and manifest server name.

Runtime evidence in \`packages/mcp/src/index.ts\` creates \`StdioServerTransport\` and reads \`QASKILLS_API_URL\`. The manifest should describe that transport and setup rather than an unrelated launch model.

Release evidence sits in \`.github/workflows/mcp-publish.yml\`. The workflow builds and publishes the npm package, installs \`mcp-publisher\`, changes its working directory to \`packages/mcp\`, logs in with GitHub OIDC, and runs \`mcp-publisher publish\`.

The current workflow relies on the publisher step to consume the manifest. It does not show a separate explicit schema-check step before npm release, which is a test gap rather than an existing guarantee.

The [official registry quickstart](https://modelcontextprotocol.io/registry/quickstart) shows the dated schema declaration, package data, stdio transport, identity matching, and publisher flow. It also states that registry data release follows package release.

The [registry reference](https://registry.modelcontextprotocol.io/docs) is the approved API documentation endpoint. Use it to verify registry-facing behavior without inventing fields absent from the committed schema.

The [official registry repo](https://github.com/modelcontextprotocol/registry) provides publisher, model, check, and integration-test evidence. Pin the schema artifact used by CI so a remote update cannot change one commit's expected result.

Schema validity alone cannot detect a manifest version that lags behind package data. Cross-file equality checks must run in the same gate and report both paths.

A bad env row can still pass a cross-file name check. The schema tool must show its path, failed rule, and wrong value type.

Use the [MCP registry QA guide](/blog/mcp-registry-qa-teams-guide-2026) for broader release coverage. This article owns manifest structure, repo parity, logs, and workflow ordering.

MCP server manifest schema testing passes when one commit has a valid file and the same name in each source. A past registry release cannot prove that a new unchecked file can ship.

## Which repository behavior defines the contract?

\`packages/mcp/server.json\` uses \`io.github.PramodDutta/qaskills\` as its server name. The same string appears as \`mcpName\` in \`packages/mcp/package.json\`. That exact match is the first cross-file rule and gives a clear pass or fail result.

The manifest top-level version and its npm package version are both \`0.1.2\` in the inspected revision. The package JSON version is also \`0.1.2\`, creating a three-way equality contract.

The package entry declares \`registryType: npm\` and id \`@qaskills/mcp\`. That id matches the package name used by the workspace and release workflow.

The transport object contains only type \`stdio\`. This agrees with the \`StdioServerTransport\` construction in \`packages/mcp/src/index.ts\`.

The env list describes \`QASKILLS_API_URL\` as an optional, nonsecret string. The runtime reads that exact name and falls back to the public QASkills origin.

The repo object identifies a GitHub source and the QASkills repo URL. Tests should compare stable identity fields while allowing descriptive copy to have its own reviewed contract.

\`.github/workflows/mcp-publish.yml\` runs on manual dispatch and tags matching \`mcp-v*\`. Its job has read access to contents and write access to the OIDC token.

The job installs Node 20 and pnpm dependencies, then builds \`@qaskills/mcp\`. It checks whether the package version already exists before publishing to npm.

After npm handling, the job downloads the latest publisher binary and places it on the path. The registry step runs from \`packages/mcp\`, where the publisher can locate \`server.json\`.

The registry commands are \`mcp-publisher login github-oidc\` and \`mcp-publisher publish\`. A workflow contract test should assert their order and working directory without claiming the publisher binary version is pinned.

That unpinned download is another observable risk. It does not invalidate the manifest, but it means failed release evidence should include the publisher release or checksum when available.

The [package registry drift guide](/blog/mcp-package-registry-version-drift-tests) checks version links across released files. Here, equal values in the current commit form the least the preflight must prove.

Use the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) for runtime use, but derive manifest assertions directly from files. User documentation can lag or summarize values.

MCP server manifest schema testing should tag each check as schema, match, runtime, or workflow proof. Those tags make one fault clear without mixing owners.

## How should QA teams test server.json validation CI?

Server.json check CI should parse the committed JSON, resolve a pinned copy of its declared schema, and fail before any publish command runs. Network retrieval during the gate should be avoided or hash-checked.

Start by parsing raw JSON with an error reporter that includes line and column. A syntax failure occurs before schema evaluation and needs a different log.

Check the full object against the official schema with a tool that follows its rules. Ask it to collect all useful errors so one run can show each changed field.

Then perform repo parity assertions. Compare manifest name with \`mcpName\`, package id with package name, and all three version values.

Compare manifest transport type with the runtime transport constructor. Compare each documented env variable name with a real runtime read in the source.

The first example demonstrates committed data checks after schema check. It reads repo files instead of copying current version strings into the test.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('keeps server identity, package, version, and transport aligned', async () => {
  const manifest = JSON.parse(
    await readFile('packages/mcp/server.json', 'utf8'),
  ) as {
    $schema: string;
    name: string;
    version: string;
    packages: Array<{
      identifier: string;
      version: string;
      registryType: string;
      transport: { type: string };
      environmentVariables?: Array<{ name: string }>;
    }>;
  };
  const packageJson = JSON.parse(
    await readFile('packages/mcp/package.json', 'utf8'),
  ) as { name: string; version: string; mcpName: string };

  expect(await validateOfficialServerSchema(manifest)).toEqual([]);
  expect(manifest.name).toBe(packageJson.mcpName);
  expect(manifest.version).toBe(packageJson.version);
  expect(manifest.packages).toHaveLength(1);
  expect(manifest.packages[0]).toMatchObject({
    identifier: packageJson.name,
    version: packageJson.version,
    registryType: 'npm',
    transport: { type: 'stdio' },
  });
  expect(manifest.packages[0].environmentVariables?.map(({ name }) => name)).toContain(
    'QASKILLS_API_URL',
  );
});
\`\`\`

\`validateOfficialServerSchema\` names a planned test helper, not a current repo export. That helper should read the manifest schema date and use a pinned test file with a known hash.

Do not silently remove unknown fields before check. A cleanup transform can make an invalid committed file appear valid while the publisher still receives the original document.

Report JSON Pointer instance paths such as \`/packages/0/version\`. Pair each path with the failed keyword, expected type or constraint, and compact actual value.

Run the test from repo root so paths match CI and local commands. Also execute a package-directory check because the publisher runs with \`packages/mcp\` as its working directory.

MCP server manifest schema testing should be a required job before npm and registry release. A check failure must prevent both side effects rather than merely annotate a completed release.

## Test matrix for MCP registry schema error

The MCP registry schema error matrix should mutate one copied field at a time while leaving the committed manifest untouched. Each case needs a precise path and no release side effect.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| server.json validation CI | Unchanged committed manifest | Zero schema errors and parity matches | Any schema or cross-file error | \`packages/mcp/server.json\` |
| MCP registry schema error | Remove top-level \`name\` | Required-field error at document root | Generic failure without missing field | Official server schema |
| Wrong package type | Set \`packages\` to an object | Type error at \`/packages\` | Validator coerces object to array | Official server schema |
| official server schema test | Change transport type to unsupported text | Constraint error at package transport | Invalid value reaches publish | Schema and runtime evidence |
| MCP manifest required fields | Remove package identifier or version | Required-field path names exact member | Publisher is first detector | Official server schema |
| Identity drift | Change manifest name only | Parity failure against \`mcpName\` | Schema-only suite passes drift | Quickstart and package JSON |
| Version drift | Change one of three version values | Equality report names both files | Registry gets stale package metadata | Manifest and package JSON |
| Environment mismatch | Rename \`QASKILLS_API_URL\` | Runtime-parity failure | Documented variable is never read | Manifest and source |
| mcp-publisher validation failure | Invalid copied manifest reaches preflight | CI fails before npm or registry command | Publish side effect begins | Workflow gate |
| Workflow order | Registry publish appears before build or npm handling | Workflow contract fails with step indexes | Metadata publishes too early | \`mcp-publish.yml\` |

Mutations should operate on deep copies stored under a temporary directory. Never edit \`packages/mcp/server.json\` during a parallel test run.

Keep one syntax mutation, such as a trailing comma, as a raw text fixture. Object-level mutation cannot represent invalid JSON because serialization repairs syntax.

Include a valid optional-field removal when the schema allows it. That control proves the mutation harness does not reject every difference.

The registry quickstart says the server name must match package \`mcpName\`. Treat that as a parity rule even if the shape schema accepts each string independently.

Use the [registry QA guide](/blog/mcp-registry-qa-teams-guide-2026) for login and namespace scenarios. This table keeps ownership on document shape and committed-file alignment.

## What failures expose official server schema test?

An official server schema test is exposed as weak when deleting a required field still passes, an invalid type gets coerced, or errors lack precise instance paths. Mutation cases prove the validator is active and correctly configured.

Pin the schema by content hash or committed fixture, while retaining the declared schema URL for traceability. A floating network response can change CI results without a repo diff.

Check that the pinned schema id matches the manifest declaration. Otherwise, a valid result could come from an older or unrelated schema.

Run at least one mutation for every critical group: identity, package data, transport, and env setup. One missing-name case cannot prove nested package rules are loaded.

Do not expect schema check to catch version equality across files unless the schema expresses that relationship. Keep parity checks explicit and report them beside schema errors.

A valid transport string may still clash with live code after a change. The test should inspect the real \`StdioServerTransport\` call in source.

The second example verifies workflow commands and order from parsed YAML. It tests the committed workflow without executing publish side effects.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { expect, it } from 'vitest';

it('builds and publishes the package before registry release', async () => {
  const source = await readFile('.github/workflows/mcp-publish.yml', 'utf8');
  const workflow = parse(source) as {
    jobs: { publish: { permissions: Record<string, string>; steps: Array<Record<string, unknown>> } };
  };
  const job = workflow.jobs.publish;
  const steps = job.steps.map((step) => ({
    name: String(step.name ?? ''),
    run: String(step.run ?? ''),
    workingDirectory: String(step['working-directory'] ?? ''),
  }));
  const buildIndex = steps.findIndex(({ run }) => run.includes('@qaskills/mcp build'));
  const npmIndex = steps.findIndex(({ name }) => name === 'Publish to npm');
  const registryIndex = steps.findIndex(({ name }) => name === 'Publish to MCP Registry');

  expect(job.permissions).toMatchObject({ contents: 'read', 'id-token': 'write' });
  expect(buildIndex).toBeGreaterThan(-1);
  expect(npmIndex).toBeGreaterThan(buildIndex);
  expect(registryIndex).toBeGreaterThan(npmIndex);
  expect(steps[registryIndex]).toMatchObject({
    workingDirectory: 'packages/mcp',
  });
  expect(steps[registryIndex].run).toContain('mcp-publisher login github-oidc');
  expect(steps[registryIndex].run).toContain('mcp-publisher publish');
});
\`\`\`

This workflow test records current behavior and exposes the missing dedicated preflight position. Once added, assert that check appears before the npm step rather than updating the test vaguely.

Avoid snapshots of the whole YAML object. Focused step names, commands, permissions, directories, and indexes produce clearer failures when actions update.

An mcp-publisher rejection remains a useful end-to-end signal, but it occurs too late to be the only schema test. Local check should fail before credentials or release artifacts are involved.

MCP server manifest schema testing should retain the mutated path and validator output for every negative case. A passing mutation is itself a release-blocking failure of the test harness.

## CI coverage for MCP manifest required fields

CI coverage for MCP manifest required fields should have a fast read-only preflight and a separate authenticated release job. The preflight must run for pull requests without registry credentials.

Parse JSON, validate the official schema fixture, compare cross-file identity, inspect runtime transport and env names, and parse workflow order. None of those checks needs network release.

Cache or commit the official schema with its source URL and hash value. Establish a reviewed update process when the manifest intentionally changes its declared schema date.

Run mutation tests against temporary copies. They prove required-field and log behavior without risking a dirty worktree or race with another job.

Set the preflight as a dependency of release. If the workflow system allows a job to be called directly, retain the same check command inside the publish job before side effects.

Record validator package version, schema hash, manifest hash, package version, and workflow commit on failure. These details make remote schema and tool changes distinguishable.

Block release for syntax errors, schema errors, identity drift, version drift, package mismatch, transport mismatch, unknown required setup, or absent log paths. Warnings about descriptive text can follow a separate policy.

The current workflow downloads the latest publisher release. Capture its reported version during release so an external binary change can be compared with passing preflight evidence.

Use [getting started](/getting-started) for local server setup, but give contributors one direct preflight command in package scripts. The command should be identical in CI and local execution.

MCP server manifest schema testing should finish before npm ready state checks. Even an already published package version does not justify sending invalid data to the registry.

## How should mcp-publisher validation failure be asserted?

An mcp-publisher check failure should be asserted by category, field path, and absence of release side effects. Exact full prose is less stable than a structured local validator report.

For local preflight, require a nonzero exit status and machine-readable error collection. Each item should include the instance path, failed schema keyword, and concise message.

For publisher integration, capture exit status, standard output, and standard error while using a nonproduction test path where supported. Never exercise malformed release against the live QASkills namespace merely to verify an error.

If safe publisher dry-run behavior is unavailable, stop at schema and workflow contract tests. Do not invent a command that the official CLI does not document.

The quickstart lists \`init\`, \`login\`, \`logout\`, and \`publish\` commands. It does not present a separate publisher \`validate\` command, so CI should use an explicit JSON Schema validator for early checks.

After a real publish rejection, map the message back to the local preflight result. If local checks passed, retain schema hash, publisher version, package ready state, and namespace evidence for registry owners.

Login or namespace failures are not schema failures. Keep expired tokens, OIDC permissions, and ownership checks in their own result category.

Package check can also fail when published npm data does not prove the declared MCP name. Compare package \`mcpName\` before release and retain the released package version in end-to-end evidence.

Use the [package drift guide](/blog/mcp-package-registry-version-drift-tests) for release artifact checks. This section stays focused on manifest check and error precision.

MCP server manifest schema testing should never accept a generic nonzero exit as sufficient. A network outage and a missing required field demand different owners and release actions.

## Step-by-step test implementation

Implement MCP server manifest schema testing in six steps, preserving both shape and repo contracts. Every mutation should remain outside committed source files.

1. Read \`packages/mcp/server.json\`, \`packages/mcp/package.json\`, \`packages/mcp/src/index.ts\`, and \`.github/workflows/mcp-publish.yml\` to record schema, identity, version, transport, configuration, and publish order.
2. Pin the declared official schema with provenance and integrity, then configure a JSON Schema validator to report all errors with exact instance paths.
3. Validate the committed manifest and compare its server name, package identifier, versions, stdio transport, and environment names with package and runtime evidence.
4. Mutate one copied field at a time for required, type, identity, version, transport, package, and environment cases, then assert precise failures and zero publish side effects.
5. Parse the workflow and verify permissions, build order, npm handling, package working directory, GitHub OIDC login, publisher command, and future preflight placement.
6. Run the read-only gate before publication, retain hashes and diagnostics, and assign failures to manifest, package, runtime, workflow, publisher, or registry ownership.

Keep schema check and parity checks in one command but separate result groups. Contributors should see whether a fix belongs in one JSON file or across several files.

Fail when the manifest schema date changes with no reviewed test file update. This keeps runs repeatable while still letting the team adopt a new schema on purpose.

Use generated temporary files for malformed JSON and copied objects for semantic mutations. Clean them after assertions and verify the repo remains unchanged.

Test workflow order by command meaning, not only displayed step names. Names can change while a dangerous publish command moves earlier.

Browse [verified QA agent skills](/skills) after release check, not as manifest evidence. Directory content cannot prove that a new server revision satisfies its schema.

## Failure triage and regression ownership

Start with parsing. If JSON syntax fails, report line and column and stop schema evaluation for that document.

If schema check fails, report the shortest instance path and failed keyword. The manifest owner should fix structure before cross-file comparisons continue.

If schema passes but identity differs, compare manifest name, package \`mcpName\`, package id, and repo namespace. Registry ownership depends on those values agreeing.

If versions differ, identify all three committed locations and the release tag. Do not choose one source silently, because package and registry release need a reviewed version decision.

If transport or env data differs from runtime, inspect \`packages/mcp/src/index.ts\`. Decide whether code or manifest is intended truth before changing either side.

If workflow order fails, inspect command indexes and working directory. A correct manifest can still be published from the wrong directory or before its package exists.

If local check passes but publisher rejects, compare schema hash, publisher version, package ready state, identity proof, and registry response. That evidence belongs to release or registry ownership.

If only CI fails, compare working directory, file encoding, validator version, and schema fixture hash. Do not fetch a new schema silently to make the job pass.

Use one decision path: parse JSON, validate schema, compare identity, compare versions, compare runtime, inspect workflow, then inspect publisher output. The first disagreement determines the next owner.

MCP server manifest schema testing defects should include a path and evidence class. "Registry failed" does not distinguish JSON shape, package drift, login, or external service errors.

A clear run log starts with the file hash, package tag, schema hash, and source commit on one line. These four facts show which set of bits and source lines the job checked before any release step.

The next line should show pass or fail for parse, shape, name, version, package, transport, env, and workflow order. A short row makes the first bad gate and its likely owner easy to spot in a long CI run.

When parse fails, show the line, column, file hash, and a small safe span near the bad mark. Do not run later checks on a file that is not valid JSON or claim that its schema passed.

When a field is missing, show its full path, parent key set, and the rule that needs it. The owner should not have to scan a long dump or remote tool log to find one absent key.

When a type is wrong, show the seen type, expected type, path, and test case that changed it. Keep the value short so shared logs stay safe, clear, and easy to read during review.

When a name drifts, place the two file paths, two names, and source commit side by side. This view turns a broad release fault into one clear choice for the package or manifest owner.

When a version drifts, show all three values in the order top file, package row, and package JSON source. The team can then pick the right source before a tag is made or an npm check begins.

When the transport drifts, show the manifest type, source class, and exact source path read by the check. A plain two-value diff with that path is enough to guide the fix and name its owner.

When an env name drifts, show the declared name, field rules, and each source read found by the test. This catches stale docs and wrong secret flags without a live server, account, or real secret.

Use the [registry QA guide](/blog/mcp-registry-qa-teams-guide-2026) when the file checks pass but the remote service still says no. Keep the local pass log, schema hash, and tool version with that case so registry staff can rule out basic file shape.

Use the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) when runtime and file claims do not match in a test. It gives user context and expected use, while source and test logs still decide the exact contract for release.

Use [getting started](/getting-started) only to check that a planned env name has a real user-facing use. Do not treat a help page, old screen, or sample command as proof that package code reads the key.

For the workflow, print the step names, zero-based order, and work folder used by the parsed test. A moved build, package, or publish step then yields a small and clear diff with no live job.

Also print the work folder for the registry step, its login mode, and the two publisher commands in order. This proves the job will read the file from the path under test after package work is done.

The dry gate must not hold npm or registry keys, since it has no need to send or change remote data. This keeps pull request checks safe and lets forks run the same rules with the same local proof.

If the remote tool later fails, save its version, exit code, work path, and time with the local pass report. A tool or service change can then be split from a file change without rerunning bad data.

Do not fetch a new schema in the failed job and rerun with no review or saved hash. Keep the old hash, open a clear code change, and test all field mutations again before release.

For each bad copy, print the one field, old value, and new value that changed from the good file. This proves the case failed for its planned fault, not stale test data or a second hidden edit.

Keep one good optional-field change beside the bad cases and run it through the same schema tool. That pass case shows the rig does not reject all edits just because a copy or new file path is used.

At review time, ask whether each error points to one path, one rule, and one likely owner. If not, make the log more clear before adding more release rules or new nested fields.

The final CI note should say file, package, source, workflow, tool, or registry as its first owner and name the source commit used. One short owner label plus the failed path gives the next person the right first place to look.

## Frequently Asked Questions

### How can CI validate server.json and report precise failures?

Parse the committed file, validate it against a hash-pinned copy of its declared official schema, and collect all instance paths plus failed keywords. Then compare identity, versions, package name, transport, and env entries with repo files. Run this read-only gate before npm or registry release.

### What belongs in server.json validation CI beyond schema checks?

Add cross-file assertions for manifest name versus package \`mcpName\`, package id versus package name, and all version values. Compare stdio transport and \`QASKILLS_API_URL\` with runtime source. Finally, verify workflow permissions, working directory, login command, publish command, and safe step order.

### How should an MCP registry schema error be diagnosed?

Report the exact JSON Pointer instance path, failed schema keyword, expected rule, compact actual value, schema hash, and validator version. Keep syntax, schema, parity, login, and network failures in separate categories. A generic publisher exit cannot identify whether the manifest itself is structurally invalid.

### What does an official server schema test need to mutate?

Mutate copied identity, package, transport, env, required-field, and type values one at a time. Every invalid case should fail at a precise path, while a permitted optional-field change should pass. A mutation that unexpectedly passes indicates a missing schema, wrong schema revision, or misconfigured validator.

### How should an mcp-publisher validation failure affect release?

It should stop registry release and preserve publisher version, output, package data, identity proof, and local preflight results. The official quickstart does not document a separate validate command, so use JSON Schema check before side effects. Never test malformed data against the live production namespace merely to force rejection.

## Conclusion

MCP server manifest schema testing makes registry data reviewable before release side effects begin. A valid official schema result, exact repo parity, precise mutations, and workflow-order checks prevent vague publisher failures from becoming the first signal.

Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this manifest gate before the next MCP release. Keep the [package drift guide](/blog/mcp-package-registry-version-drift-tests) beside the report when names or versions do not match.`,
};
