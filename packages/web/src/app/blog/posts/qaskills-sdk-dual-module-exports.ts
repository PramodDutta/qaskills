import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills SDK dual module exports',
  description:
    'QASkills SDK dual module exports: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills SDK dual module exports',
  keywords: [
    'QASkills SDK dual module exports',
    'QASkills SDK CommonJS import',
    'QASkills SDK ESM import',
    'package exports map test',
    'dual module package smoke test',
    'require import compatibility',
    'tsup cjs esm output',
  ],
  relatedSlugs: [
    'typescript-testing-patterns-guide',
    'github-actions-testing-ci-cd-guide',
    'how-to-publish-ai-agent-skill-directory',
    'ai-qa-skills-directory-2026',
  ],
  sources: [
    'https://nodejs.org/api/packages.html',
    'https://nodejs.org/api/esm.html',
    'https://www.typescriptlang.org/docs/handbook/modules/reference.html',
  ],
  repoEvidence: [
    'packages/sdk/package.json#exports',
    'packages/sdk/tsup.config.ts#format',
    'packages/sdk/src/index.ts#default',
    'packages/sdk/src/index.ts#createClient',
  ],
  content: `QASkills SDK dual module exports route import users to dist/index.mjs and require users to dist/index.js. The package also points to dist/index.d.ts for types. A valid release test builds the package, loads both public entry paths in separate Node processes, and compares the named and default API surfaces without importing source files.

The contract is declared in \`packages/sdk/package.json\` and produced by \`packages/sdk/tsup.config.ts\`. It concerns runtime module loading, not CLI bundling or declaration design. Review the public [skills catalog](/skills) as SDK data, but verify module resolution against the packaged SDK itself.

## What does QASkills SDK dual module exports guarantee?

QASkills SDK dual module exports guarantee two declared runtime conditions for the package root. Node import resolution receives \`./dist/index.mjs\`, while CommonJS require resolution receives \`./dist/index.js\`. The package also points TypeScript tools at \`./dist/index.d.ts\`, but that declaration path does not prove either runtime file loads.

The source of truth is \`packages/sdk/package.json#exports\`, whose root export contains \`import\`, \`require\`, and \`types\` entries. Legacy top-level fields also name \`main\`, \`module\`, and \`types\`, but modern package users that honor \`exports\` should remain inside that map.

The build config at \`packages/sdk/tsup.config.ts#format\` lists \`cjs\` and \`esm\`, enables declarations and source maps, disables splitting, and cleans output. Given the current entry, the build produces JavaScript and MJS entry files plus declaration and map artifacts under \`dist\`.

This guarantee is conditional on a successful build and complete package contents. A correct exports map that points to absent files still fails at runtime. That is why metadata-only tests are necessary but insufficient.

The public API in \`packages/sdk/src/index.ts\` exports \`QASkillsClient\`, \`createClient\`, and a default \`QASkillsClient\`. Both module systems should expose callable construction paths that represent the same source API. They need not produce byte-identical module namespace objects.

The [Node packages documentation](https://nodejs.org/api/packages.html) defines package entry points and conditional exports. QASkills uses explicit conditions instead of asking one file to behave as both formats. Tests should invoke the package name so Node actually selects those conditions.

Do not import \`src/index.ts\` in this gate. A source import can pass while an exports path is misspelled or a dist artifact is missing. The test must cross the package boundary that real consumers use.

The [AI QA skills directory guide](/blog/ai-qa-skills-directory-2026) explains the product context. This article stays at package release integrity, where one missing output can break all consumers of one module system.

## How does QASkills SDK CommonJS import work?

QASkills SDK CommonJS import uses the \`require\` condition from the root exports map. That condition points to \`dist/index.js\`, which tsup emits from the same TypeScript entry as the ESM file. A smoke test should call \`require('@qaskills/sdk')\` from a consumer context after the build.

The package does not declare \`"type": "module"\`. The \`.js\` target can therefore serve CommonJS under normal Node package rules, while the \`.mjs\` extension identifies the ESM target explicitly. The test should let Node resolve those rules instead of loading the file path directly.

A compact CommonJS consumer can verify shape and behavior without making network requests:

\`\`\`javascript
const sdk = require('@qaskills/sdk');

if (typeof sdk.QASkillsClient !== 'function') {
  throw new Error('Missing QASkillsClient CommonJS export');
}
if (typeof sdk.createClient !== 'function') {
  throw new Error('Missing createClient CommonJS export');
}

const client = sdk.createClient({ baseUrl: 'http://127.0.0.1:9999' });
if (!(client instanceof sdk.QASkillsClient)) {
  throw new Error('CommonJS factory returned the wrong client type');
}
if (sdk.default !== sdk.QASkillsClient) {
  throw new Error('CommonJS default export does not match QASkillsClient');
}
\`\`\`

Constructing a client performs no request. Network activity begins when a resource method calls the private request path. Thus, the smoke fixture can validate factory and class identity without starting an API server.

Run the script through Node from a package or temporary consumer that can resolve the workspace dependency. Package self-reference may also work from inside the named package, but an installed or packed consumer gives stronger evidence about shipped files. Choose one approach and document the resolution path in failures.

The \`main\` field also points to \`dist/index.js\`. Do not remove the \`require\` check just because main agrees today, since an exports-map change could split while a direct file test continues to pass.

Check the resolved path with \`require.resolve('@qaskills/sdk')\` and assert that it ends in the declared CommonJS target. Normalize separators before comparison for cross-platform output. This proves the correct condition won, not just that some compatible module loaded.

The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) can cover compile-time use separately. The CommonJS smoke test must remain plain JavaScript so a transpiler cannot repair a broken package at test time.

## Which cases define QASkills SDK ESM import?

QASkills SDK ESM import uses Node's import condition and resolves the root package to \`dist/index.mjs\`. The returned namespace should contain the named class, named factory, and default class. A separate ESM process prevents prior CommonJS caching from hiding resolution problems.

Use a true \`.mjs\` fixture or \`node --input-type=module\`. Do not compile a TypeScript test to CommonJS and call that an ESM check. The [Node ECMAScript modules documentation](https://nodejs.org/api/esm.html) describes the runtime module system used by the fixture.

\`\`\`javascript
import DefaultClient, {
  QASkillsClient,
  createClient,
} from '@qaskills/sdk';

if (DefaultClient !== QASkillsClient) {
  throw new Error('ESM default and named clients differ');
}
if (typeof createClient !== 'function') {
  throw new Error('Missing ESM createClient export');
}

const client = createClient({ baseUrl: 'http://127.0.0.1:9999' });
if (!(client instanceof QASkillsClient)) {
  throw new Error('ESM factory returned the wrong client type');
}
\`\`\`

The current source at \`packages/sdk/src/index.ts#default\` explicitly exports \`QASkillsClient\` as default after declaring the named class. That supports the identity assertion. The factory at \`packages/sdk/src/index.ts#createClient\` returns a new class instance from an optional configuration.

Also verify resolution through \`import.meta.resolve('@qaskills/sdk')\` when the supported Node version provides it. The result should reference the MJS target. If the project supports a Node range where that API differs, keep file resolution as diagnostic rather than the only pass condition.

An ESM-only success does not prove require support. The two targets are separate build artifacts with separate wrappers, so run both scripts after every SDK packaging change. Keep output simple: module mode, resolved file, exported keys, and pass or failure.

Test from a clean output directory. Since tsup is configured with \`clean: true\`, a normal build should remove stale artifacts before writing new ones. A gate that skips the build may accidentally load files left by an earlier configuration.

Do not call public QASkills endpoints in this module check. Data methods and authentication belong to SDK integration suites. Module resolution should fail only for packaging and API-surface reasons.

## package exports map test and the current QASkills contract

A package exports map test should compare declared paths with actual files, then exercise condition resolution. Static checks give quick, direct errors for missing outputs. Runtime checks prove that Node interprets the map as intended and that each artifact can execute.

Read package.json as JSON and assert the exact root conditions. Resolve each relative target beneath the package directory and verify that it is a regular file with nonzero size. Keep the declaration check separate from JavaScript execution because a declaration file is not a runtime module.

The current root contract can be stated as a table:

| Consumer or tool | Declared condition or field | Expected target | Required check |
|---|---|---|---|
| ESM Node consumer | \`exports["."].import\` | \`dist/index.mjs\` | Dynamic import and named exports |
| CommonJS Node consumer | \`exports["."].require\` | \`dist/index.js\` | Require and class factory |
| TypeScript resolver | \`exports["."].types\` | \`dist/index.d.ts\` | Compile a consumer fixture |
| Legacy CommonJS tool | \`main\` | \`dist/index.js\` | Metadata consistency |
| Legacy ESM-aware tool | \`module\` | \`dist/index.mjs\` | Metadata consistency |
| Declaration fallback | \`types\` | \`dist/index.d.ts\` | Metadata consistency |

The table reflects repository metadata rather than claiming every tool uses the same field order. Conditional export selection belongs to the runtime or compiler. The gate should test supported consumers directly instead of guessing their resolution algorithm.

TypeScript module resolution has its own modes and package rules. The official [TypeScript module reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) is the approved source for those concepts. Compile a tiny consumer using the repository's supported configuration rather than inspecting only the declaration filename.

The source API currently includes resource groups for skills, categories, reviews, and leaderboard. A package smoke check does not need to call each method, but it should compare exported top-level keys between CJS and ESM. This catches a wrapper that drops the default or named factory.

Normalize expected wrapper differences. CommonJS may expose a module object whose default is a property, while ESM supports direct default import syntax. Compare semantic exports and identities, not serialized namespace objects.

Use the [publishing skills guide](/blog/how-to-publish-ai-agent-skill-directory) for application publishing. SDK package release checks are distinct because they validate JavaScript delivery rather than catalog content.

## How do you test dual module package smoke test?

Test a dual module package smoke test from a clean consumer fixture that receives the built package. Build the SDK first, create CommonJS and ESM entry scripts, run each in its own child process, and compare short JSON reports. Finish with a TypeScript compile-only consumer for the declaration route.

Use this procedure:

1. Run the filtered SDK build and fail immediately if it returns nonzero.
2. Read the package exports map and verify every declared target exists.
3. Create a temporary consumer with a resolvable link or packed SDK dependency.
4. Run a CommonJS script that requires the package and reports its exports.
5. Run an ESM script that imports the package and reports the same semantics.
6. Compile a TypeScript fixture that imports the class and factory.
7. Compare reports, remove the consumer, and preserve output only on failure.

Packing the workspace package before installation most closely represents published contents. If the package lacks a files allowlist, inspect the tarball manifest as part of release work. A workspace symlink is faster for pull requests but may expose files that a registry package would omit.

The smoke scripts should avoid fetch calls. Constructing \`QASkillsClient\` and checking the factory result is enough to execute the module and one public function. Keep API request tests in their own suite with a local server.

Run each module mode in a fresh process so module caches and loader state remain isolated. A single test file that mixes \`require\` and dynamic \`import\` is useful as extra coverage, but it is weaker evidence for native consumer startup.

Capture status, stdout, and stderr. Ask each script to print one JSON line containing mode, resolved target, export names, and identity checks. This gives CI a compact artifact that points directly to the broken condition.

The [CI/CD testing pipeline guide](/blog/github-actions-testing-ci-cd-guide) can host the release gate. Keep package smoke tests before publish so one broken format never reaches consumers.

## require import compatibility failure and edge-case matrix

Require import compatibility failures usually come from missing outputs, wrong conditions, wrapper differences, stale files, or an API exported in only one format. A matrix should inject or detect each class independently. It should not rely on one broad build-success assertion.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| QASkills SDK CommonJS import | Clean build and require consumer | Resolves index.js with class and factory | Module not found or missing key | \`packages/sdk/package.json#exports\` |
| QASkills SDK ESM import | Clean build and MJS consumer | Resolves index.mjs with default and names | Loader or export error | \`packages/sdk/tsup.config.ts#format\` |
| package exports map test | Every declared relative target | Existing nonempty files | Stale or absent artifact | package metadata |
| dual module package smoke test | Separate child processes | Both semantic reports agree | One mode passes alone | \`packages/sdk/src/index.ts#default\` |
| require import compatibility | Factory construction in both modes | Instances match each mode's class | Wrapper identity mismatch | \`packages/sdk/src/index.ts#createClient\` |
| tsup cjs esm output | Build from clean dist | Both runtime files regenerated | Old file masks missing format | tsup clean build |

Add a deliberate missing-target test only in a copied package fixture. Never delete a real worktree artifact while other tests may use it. Change the copied exports path or remove one copied file, then prove the relevant process fails with a clear module error.

A stale-artifact test can seed an extra marker file before build and confirm clean output removes it. Do not assert an exact complete dist listing unless all generated map and declaration variants are part of the supported release contract. Focus first on declared entry targets.

Compare default identity within each module system, then compare exported key sets after normalizing wrapper helpers. Do not compare constructors across separate processes because object identity cannot cross a process boundary. Compare names and behavior reports instead.

Node version belongs in the report. Conditional exports and ESM support are stable in the project's supported range, but a surprising loader failure is easier to diagnose when the runtime version is visible. The repository requires modern Node, so avoid adding compatibility claims for older releases.

## How should tsup cjs esm output run in CI?

Tsup cjs esm output should run after required workspace dependencies build and before any SDK publish step. The gate must start from clean output, run both native consumers, compile one typed consumer, and fail on any missing declared target. It should not require environment secrets or network access.

Use the package-filtered build command so workspace orchestration remains clear. Then execute the smoke fixture with the same Node major versions supported by the repository. A small version matrix is useful if published consumers span more than one supported major.

Static metadata checks can run inside Vitest, but native consumer scripts should use child processes. This makes loader errors, status codes, and stderr match consumer startup. Enforce a short timeout because module loading and object construction should finish quickly.

Keep the test consumer outside the SDK source directory when possible. Install a packed tarball or link only the package root. Direct access to \`src\` or undeclared subpaths can make an invalid public package appear healthy.

The report should list the package version, Node version, chosen target, artifact size, and semantic export checks. It should not print API keys because none are needed. If a client is constructed, use a loopback base URL and never invoke a resource method.

Run formatting and type checks before packaging, but do not treat them as module smoke results. Source type correctness can coexist with a broken exports map. Each gate answers a different release question.

After the package checks pass, teams can compare catalog behavior through the [leaderboard](/leaderboard) or [categories](/categories) in a separate SDK integration suite. QASkills SDK dual module exports should remain free from deployed service state.

## Implementation checklist for QASkills SDK dual module exports

QASkills SDK dual module exports are protected when declarations, generated files, native loaders, and semantic API surfaces agree. The release gate should be small enough to run on each change and strict enough to fail before publish. Loading source code directly does not satisfy this checklist.

Use these checks:

- Build the SDK from clean output.
- Read \`exports["."]\` and validate import, require, and types targets.
- Assert every declared target exists and contains data.
- Run plain CommonJS and native ESM consumers in separate processes.
- Verify named class, named factory, and default class semantics.
- Compile one TypeScript consumer against the package name.
- Compare normalized export reports and resolved targets.
- Remove temporary consumers and packed files after every run.

Keep evidence assignments explicit. \`packages/sdk/package.json\` owns public resolution paths. \`packages/sdk/tsup.config.ts\` owns generated formats. \`packages/sdk/src/index.ts\` owns named and default source exports plus factory behavior.

If any check fails, fix either the declaration, build, or source API at its owner. Do not add a fallback direct path in the test, since that would bypass the contract users rely on. A package that only works through \`dist/index.mjs\` imports is not equivalent to a working package root.

Review [getting started](/getting-started) for normal product use after release checks pass. Use the [skills directory](/skills) for later request integration. This sequence keeps packaging faults separate from API availability and catalog data.

Give the consumer fixture its own package file and state which module mode each script uses. The CommonJS script can keep a \`.cjs\` name, while the ESM script can keep a \`.mjs\` name with no tool step in front. Native names make the loader choice clear when a failed job prints its command.

Write one small report function in each script and emit only plain JSON when all checks pass. Include the mode, resolved file, sorted export names, default match, and factory result. A parent test can parse those lines and compare the facts without matching stack frames or loader text that may change with Node.

Keep the resolved path check at the end of the path, since temp roots and workspace roots differ across hosts. Convert backslashes to slashes before checking \`/dist/index.js\` or \`/dist/index.mjs\`. This rule proves the selected file while leaving the test free to run on more than one host.

When a script fails, let its fixed error text reach stderr and keep the nonzero status in the parent report. Do not catch every loader error and return zero with a JSON error field. A module that cannot load must look like a failed consumer process to the release gate.

Run the type fixture after both runtime scripts, and make it import the package root rather than a dist file. It can create a client, name its class type, and read one method without sending a request. This proves the declared type path supports the same top-level names that both runtime modes expose.

Seed one harmless stale file in dist before the clean build, then prove the marker is gone and all declared targets are new. Do not use a stale file with a valid entry name, since another worker might load it before the build ends. Keep this check in a job that owns the SDK build folder alone.

If the gate packs a tarball, list the package files and check that each exports target is present inside that pack. A workspace build can pass while a publish rule leaves dist out of the archive. The packed check closes that gap without calling a registry or using a real release tag.

QASkills SDK dual module exports should give the same useful API in both modes, but their raw namespace shapes can differ. Compare class names, factory behavior, and default meaning instead of full object JSON. This semantic check survives wrapper details while still catching a lost public export.

Keep the final report to one row per mode plus one row for types and one row for packed files. A reviewer can then see which part failed before opening the full log. That small report also makes it hard for one green ESM result to hide a red CommonJS result in a long build trace.

Build the temp consumer in a new root for each gate run, and keep its two script names fixed. Add the packed SDK as its sole local package, then run install with no hook that can change the pack. This setup makes the files in that root match what a user gets from the same pack.

Before either script starts, read the installed package map and save its three root targets in the report. Check that each path stays within the installed package and that each file has some data. These fast facts catch a bad map or an empty pack before a loader gives a longer and less direct error.

Run the CJS script first in one child, then run the MJS script in a new child with the same clean env. Give both the same fake base URL and make no method call that can reach a host. The two runs should differ only in loader mode, resolved file, and the way each script names its default export.

Have each script make one client through the named factory and one client through the class. Check both local types and print just the class names in the report. This test proves real code ran from each target, while it avoids a live request that could mix package faults with service faults.

Compile the type case from that same installed root, but write its source as a third small file with no run step. Import the class, factory, and config type from the package name, then let the compiler check the file. A direct path to dist would skip the type condition that this gate must prove.

QASkills SDK dual module exports pass only when all three consumer forms agree on the public names they use. Keep one parent row red if any child fails, but retain each child status in the detail. The [leaderboard](/leaderboard) can serve a later API test, while this gate stays on local load and type facts.

At the end, remove the temp root and packed file in one final cleanup block, even when a child times out or fails to parse. Start the next run from a new root rather than reusing a prior install. This rule stops an old index file from making a broken new pack look fit for release.

## Frequently Asked Questions

### What does QASkills SDK CommonJS import verify in QASkills?

It verifies that Node selects the declared require target and that its module object exposes the class, factory, and default semantics. Run plain JavaScript after a clean build. A direct require of dist/index.js is weaker because it bypasses the public package exports map.

### When should a team test QASkills SDK ESM import?

Test it whenever package metadata, tsup formats, source exports, Node support, or release packaging changes. Use a native MJS process and the package name. Keep it beside the CommonJS smoke check because one generated target can break while the other still loads correctly.

### How can a fixture isolate package exports map test?

Build or pack the SDK, install or link it into a temporary consumer, and run scripts without network calls. Read the copied package metadata and verify declared targets there. Cleanup the consumer afterward so stale workspace links or old dist files cannot influence later runs.

### Which assertion proves dual module package smoke test?

Require both child processes to exit zero and emit matching semantic reports for named class, named factory, default identity, and client construction. Also record each resolved target. A successful build alone cannot prove Node selected or executed both public module conditions.

### What failure cases belong in require import compatibility tests?

Cover missing CJS output, missing ESM output, wrong exports path, absent named factory, default wrapper mismatch, stale dist content, and declaration target failure. Inject destructive cases only in a copied package fixture. Keep service errors outside this suite because no API call is required.

### How should CI run tsup cjs esm output checks?

Build dependencies, run the filtered SDK build from clean output, execute separate CommonJS and ESM consumers, and compile one TypeScript fixture. Record Node and package versions, enforce short timeouts, and publish only after every declared target and semantic export check passes.

## Conclusion

QASkills SDK dual module exports form a three-part release contract: CommonJS resolves to index.js, ESM resolves to index.mjs, and TypeScript receives index.d.ts. Clean builds and separate native consumers prove those paths, while source imports and metadata checks alone leave important failures hidden.

Review [getting started](/getting-started), run the package gate, and use the live [skills catalog](/skills) only for a later API integration check. Keep dual-format loading deterministic so every published SDK consumer receives the same intended class and factory surface.`,
};
