import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills Cypress project detection',
  description:
    'QASkills Cypress project detection: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills Cypress project detection',
  keywords: [
    'QASkills Cypress project detection',
    'detect cypress config',
    'cypress directory detection',
    'cypress dependency detection',
    'qaskills cypress evidence',
    'cypress.config.ts scanner',
    'test cypress auto detection',
  ],
  relatedSlugs: [
    'cypress-tutorial-beginners-2026',
    'test-automation-framework-architecture',
    'hybrid-automation-framework-guide',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://docs.cypress.io/app/references/configuration',
    'https://nodejs.org/api/fs.html',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json',
  ],
  repoEvidence: [
    'packages/cli/src/lib/framework-detector.ts#detectCypress',
    'packages/cli/src/lib/framework-detector.ts#detectFrameworks',
    'packages/cli/src/lib/framework-detector.ts#fileExists',
    'packages/cli/src/lib/framework-detector.ts#hasDep',
  ],
  content: `QASkills Cypress project detection checks three evidence levels in order: a supported Cypress configuration filename, an entry named \`cypress\`, then a truthy Cypress dependency in package.json. It returns the first matching evidence string and never opens configuration contents, validates the directory type, or asks Cypress to load the project.

The implementation lives in \`packages/cli/src/lib/framework-detector.ts\`. A useful test creates one temporary project per evidence branch, invokes the public \`detectFrameworks\` function, and asserts both the Cypress result and its exact evidence value.

## What does QASkills Cypress project detection guarantee?

QASkills Cypress project detection guarantees deterministic first-match evidence for files and package metadata visible at a chosen project root. It does not prove that Cypress can execute, that the configuration compiles, or that any test file passes.

\`detectFrameworks\` accepts an optional project directory and defaults to \`process.cwd()\`; it runs each detector in a fixed list and keeps every match. Cypress detection does not stop other framework detectors from finding their own evidence.

That public function is the right test seam because \`detectCypress\` stays private, yet each branch is clear through the returned ID and evidence text. There is no need to export a file-only helper just for a unit case.

Pass an absolute root in most tests; the default cwd path is useful for one small case but adds process state to every other row. An explicit root makes each path and failed probe easy to explain.

The private branch at \`packages/cli/src/lib/framework-detector.ts#detectCypress\` checks three config names in order, then checks an entry named \`cypress\`. Only then does it read package.json and look for a Cypress dependency.

Every successful result has \`id: 'cypress'\`, \`name: 'Cypress'\`, and an \`evidence\` string. Configuration evidence is the filename, directory evidence is \`cypress/\`, and dependency evidence is \`package.json\`.

Assert all three fields for each main row, since an ID-only check can pass when the wrong source wins. The evidence field is the plain sign that the order is still right.

The detector returns one Cypress record per call, even if all proof exists, because its first match ends the private scan. A combined fixture should count one match and name the first config file.

The [Cypress configuration reference](https://docs.cypress.io/app/references/configuration) explains supported project configuration concepts. QASkills uses a narrower list of filenames from its own source, so tests must follow repository code when the two sets differ.

This guide covers evidence precedence only. For test authoring, use the [Cypress tutorial](/blog/cypress-tutorial-beginners-2026). For tool choice, see the [Playwright and Cypress comparison](/compare/playwright-vs-cypress-skills).

## How does detect cypress config work?

Detect cypress config behavior is an existence scan over three filenames. The first successful filesystem probe returns immediately, so later evidence cannot replace the selected filename.

\`fileExists\` at \`packages/cli/src/lib/framework-detector.ts#fileExists\` calls \`fs.accessSync\` with \`F_OK\`, as the [Node file system docs](https://nodejs.org/api/fs.html) describe. The helper catches every thrown error and returns false.

The helper asks if the name can be reached, not if it can be read as code, so an empty file passes the check. A bad import, syntax error, or wrong option in that file is outside QASkills Cypress project detection.

This makes setup quick and exact: create a blank file for the path row, then use content only in a Cypress load test. Mixing those goals can give the scanner credit for work it never does.

Because the helper checks access rather than file type, an entry named \`cypress.config.ts\` can qualify even when it is a folder, and no config text is read. These are current bounds worth recording in negative tests.

When all three filenames exist, TypeScript wins because it comes first; when JavaScript and MJS exist, JavaScript wins. This order is clear through \`evidence\`, even though all cases return the same framework ID.

Write two pair tests as well as the all-file test; one pair proves the first edge, while the other proves the next edge. If order changes at one spot, the failed pair points to it at once.

Also test MJS alone, since a list-order suite can pass while the last name is misspelled in source. One solo row for each file guards both presence and rank.

Create each config fixture as an empty file unless content is the test goal, since production never reads it and full Cypress code implies a check that does not occur. The simplest file fact is the clearest test.

\`\`\`typescript
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qaskills-cypress-'));
await fs.writeFile(path.join(root, 'cypress.config.mjs'), 'export default {};\\n');
await fs.writeFile(path.join(root, 'cypress.config.ts'), 'export default {};\\n');

const cypress = detectFrameworks(root).find((item) => item.id === 'cypress');

expect(cypress).toEqual({
  id: 'cypress',
  name: 'Cypress',
  evidence: 'cypress.config.ts',
});
\`\`\`

That test reaches the private detector through \`packages/cli/src/lib/framework-detector.ts#detectFrameworks\`. It proves real path joining, existence checks, ordering, and result shape without exporting a helper only for tests.

Clean the temp root in a finally hook or shared teardown, since a file left behind still wastes disk and can confuse a local run. Track the root as soon as it is made.

The test does not import Cypress because QASkills sees only the file name in this branch. A no-dependency package test should still pass.

## Which cases define cypress directory detection?

Cypress directory detection applies only when no supported configuration name exists. The code then checks whether any filesystem entry exists at \`path.join(cwd, 'cypress')\` and reports \`cypress/\`.

Create an actual directory for the main positive case; it may be empty because the detector does not inspect child files. An empty directory is enough under the current contract.

Then add files inside and run the detector again; the evidence should stay \`cypress/\` because child names are not read. This repeat call proves that folder contents do not change the result.

Remove the directory and call once more; with no other proof, the Cypress row should leave the set. That check proves each call reads current disk state rather than a saved prior match.

Add a case with a plain file named \`cypress\`, which also qualifies because \`fileExists\` checks only access. The test can record this behavior while a product issue proposes a folder-type check.

Name that test "accepts any entry under current access check," and do not call the file a valid Cypress folder. The distinction helps a future fix change the expected result with no false claim about user setup.

Precedence deserves a combined fixture with a Cypress folder and package dependency in one root. The result must report \`cypress/\`, proving that package parsing is not needed after folder proof succeeds.

Spy on \`readFileSync\` only if the suite must prove package.json was not read, since the evidence result is often enough. A call spy can make the early return clear when bad package text caused a past bug.

Put a supported config in that same fixture and the evidence should change to the first config filename. This three-layer case catches refactors that reverse evidence order while preserving the Cypress ID.

Use invalid package JSON in that combined root once; config should still win before JSON is parsed. This shows that lower-rank bad data cannot block higher-rank proof.

Access errors look like absence because \`fileExists\` catches all faults, so avoid Unix mode bits in tests that run on many hosts. If this branch matters, mock \`fs.accessSync\` for one exact path.

QASkills Cypress project detection scans only the root passed to it, so a nested \`packages/app/cypress\` will not match from the main repo root. Call the detector with the app directory when that is the project bound.

Make that rule real with two calls: the main root should have no Cypress item, while the nested app root should report its proof. This is more useful than a vague statement about workspaces.

Do not add a deep search to the test helper, since it would find proof that production ignores. The selected root is part of the public input and should remain visible in each case.

The [test automation architecture guide](/blog/test-automation-framework-architecture) discusses larger repository layouts. Keep this detector test centered on one explicit root rather than inferring workspace traversal that code does not perform.

## cypress dependency detection and the current QASkills contract

Cypress dependency detection reads root package.json only after config and directory checks fail. It accepts a truthy \`cypress\` value from either \`dependencies\` or \`devDependencies\`.

\`readJsonSafe\` reads UTF-8 text and calls \`JSON.parse\`; missing, blocked, empty, or invalid JSON returns null. No dependency result is produced from those cases, and the detector does not throw.

Test missing and invalid files as two rows because one covers the read catch while the other covers the parse catch. Both lead to no Cypress item when config and folder proof are absent.

An empty file follows the parse-failure path too and needs its own case only if it caused a real issue. Otherwise, invalid text already proves the same return branch.

\`hasDep\` at \`packages/cli/src/lib/framework-detector.ts#hasDep\` reads both dependency maps and tests \`deps?.[name] || devDeps?.[name]\`. A normal version range is truthy and qualifies.

The [npm package.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json) define package dependency fields, but QASkills checks only the two groups named above. It does not inspect peer groups, lockfiles, or global packages.

Both production and development dependency fixtures should return the same evidence string, and two matching groups still yield one framework record. That follows because \`hasDep\` returns a boolean rather than source detail.

Use one case with dependencies, one with devDependencies, and one with both; the first two guard each map while the last guards one result. Keep version text fixed and short.

An empty version string is falsy and will not qualify, while odd numeric or object values may pass through JavaScript truth rules. Keep normal fixtures standards-aligned, and label unusual shapes as defensive characterization cases.

Null also fails the truthy check, while an object passes, but do not present that object as valid npm data. It can still show why the detector trusts package shape instead of running a schema.

The detector checks only the package name \`cypress\`, so a wrapper, preset, or plugin with that word in its name does not qualify. This exact-key rule prevents broad substring matches.

Add \`@scope/cypress-plugin\` with no exact key and expect no Cypress row. Then add the exact key and expect package evidence, which makes the key rule plain.

QASkills Cypress project detection does not read a lockfile, so an installed package absent from package.json will not be found here. That is a source fact, not a statement about whether Cypress can run.

## How do you test qaskills cypress evidence?

Test qaskills cypress evidence with a table of isolated temporary roots and one public detector call per root. Assert Cypress absence or the exact evidence string, then remove each root after the case.

Real filesystem fixtures provide more value than mocking every helper because the production feature is path evidence. Use mocks only for access failures that are hard to express consistently across systems.

When a mock is needed, match one full path and pass all other calls through, since a broad failure can hide every framework. Tight mocks keep the test close to disk behavior.

A table-driven suite can create fixture entries from small setup callbacks:

\`\`\`typescript
it.each([
  ['TypeScript config', async (root) => fs.writeFile(path.join(root, 'cypress.config.ts'), ''), 'cypress.config.ts'],
  ['JavaScript config', async (root) => fs.writeFile(path.join(root, 'cypress.config.js'), ''), 'cypress.config.js'],
  ['MJS config', async (root) => fs.writeFile(path.join(root, 'cypress.config.mjs'), ''), 'cypress.config.mjs'],
  ['directory', async (root) => fs.mkdir(path.join(root, 'cypress')), 'cypress/'],
  [
    'dependency',
    async (root) =>
      fs.writeFile(
        path.join(root, 'package.json'),
        JSON.stringify({ devDependencies: { cypress: '^14.0.0' } }),
      ),
    'package.json',
  ],
])('%s', async (_name, setup, evidence) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cypress-detect-'));
  roots.add(root);
  await setup(root);

  expect(detectFrameworks(root).find((item) => item.id === 'cypress')).toEqual({
    id: 'cypress',
    name: 'Cypress',
    evidence,
  });
});
\`\`\`

The example version is illustrative fixture data, not a claim about the latest Cypress release. Detection only checks that the value is truthy, so use any fixed non-empty range controlled by the test.

The setup callback should write no lockfile and run no package manager, which keeps the suite fast and free from web access. JSON text is all the production dependency branch reads.

Follow this numbered process:

1. Read the current configuration array and evidence strings in \`framework-detector.ts\`.
2. Create one unique empty project root for each positive, precedence, and negative case.
3. Add only the filesystem or package metadata needed for that row, then invoke \`detectFrameworks(root)\`.
4. Find the result by \`id === 'cypress'\` and compare its complete ID, name, and evidence.
5. Delete all roots in cleanup and run the CLI package suite without using an installed Cypress binary.

This QASkills Cypress project detection workflow stays independent from generated projects and user settings. Browse [testing categories](/categories) only after deterministic checks pass.

Add one case that scans the same root twice, first with package data and then with a new config file. The second result should move from package evidence to config evidence.

This repeat-run row is useful because the module has no cache. If a cache is added later, the test will force a clear rule for when file changes become visible.

## cypress.config.ts scanner failure and edge-case matrix

The cypress.config.ts scanner matrix should include every positive source, precedence, malformed metadata, wrong location, and absent evidence. It should distinguish false negatives from intentional scope.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| Detect cypress config | Empty \`cypress.config.ts\` at root | Cypress with TypeScript config evidence | Dependency evidence wins instead | \`packages/cli/src/lib/framework-detector.ts\` |
| Cypress directory detection | Empty root \`cypress\` directory | Cypress with \`cypress/\` evidence | No result or wrong evidence | \`packages/cli/src/lib/framework-detector.ts\` |
| Cypress dependency detection | Dev dependency in valid package.json | Cypress with package evidence | Package metadata ignored | \`packages/cli/src/lib/framework-detector.ts\` |
| Qaskills cypress evidence | Config, directory, and dependency together | First config filename wins | Later evidence replaces config | \`packages/cli/src/lib/framework-detector.ts\` |
| Invalid package JSON | Malformed JSON with no other evidence | No Cypress result and no throw | Detector rejects whole scan | \`packages/cli/src/lib/framework-detector.ts\` |
| Test cypress auto detection | Evidence under nested package only | No root result | Detector walks subdirectories | \`packages/cli/src/lib/framework-detector.ts\` |

Case sensitivity follows the file system and exact strings, while the detector asks for lowercase \`cypress.config.ts\` and \`cypress\`. A differently cased name may work on one volume and fail on a case-sensitive Linux runner.

Keep the release gate on exact lowercase names so it means the same thing on all hosts. Put any case-folding study in a host-specific suite. A cross-platform pass should not depend on the volume format.

Avoid encoding that platform difference as a positive guarantee. Use exact lowercase fixtures in the contract suite. An optional platform test can document current volume behavior without gating releases across systems.

A symlink may satisfy \`accessSync\` when its target exists. The detector does not call \`lstat\` or resolve provenance. If symlink behavior matters to a deployment, add a platform-specific case and describe only the observed access result.

A broken link should fail the access check on common hosts, but that detail belongs to Node and the file system. The core suite can skip it. QASkills promises a match on reachable evidence, not a full link report.

Invalid package JSON is safely ignored by \`readJsonSafe\`. However, config or directory evidence before package parsing still returns Cypress. A precedence test with invalid package text and a valid config proves that package corruption does not block earlier evidence.

Other framework results can coexist. A root with both Playwright and Cypress configs should return both records in detector-list order. The [Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers that framework's test usage, not this scanner's evidence order.

Find Cypress by ID for most checks so a new detector does not break them. Add one list-order check only where order affects command output. This keeps the batch focused on Cypress proof while still recording the public array.

## How should test cypress auto detection run in CI?

Test cypress auto detection should run with temporary roots, real package files, and no Cypress installation. The suite should complete on every supported Node platform without reading the repository's own root as the fixture.

Use \`fs.mkdtemp\` under the OS temp directory and track roots in a set. Recursive forced cleanup in \`afterEach\` handles partial setup and failed assertions. Parallel tests must never share one package.json.

If a row changes cwd, save and restore the old value in finally. Better yet, pass the root and avoid cwd in table rows. One default-path case is enough to cover the optional argument.

Test public \`detectFrameworks\`, then filter by framework ID. The function may return other results if a fixture adds their evidence later. Asserting that the whole array has length one can create unrelated failures.

For the no-evidence row, assert no item with the Cypress ID rather than an empty full array. The root may gain proof for another detector as the project grows. This assertion keeps ownership clear.

Run precedence rows in addition to single-source rows. A suite where every fixture has one evidence type cannot detect an accidental reorder. The exact \`evidence\` field is the signal that exposes priority.

Name those rows with the two sources they compare. "Config beats folder" and "folder beats package" give a fast hint when one fails. The all-source row then acts as a final guard, not the sole proof.

Add one no-evidence fixture and one invalid package fixture. Both should return no Cypress item and should not throw. This proves failure containment in file and JSON helpers.

The focused test should run before the CLI build and full post-flow gate. For a manual follow-up, use the [getting started page](/getting-started) in a disposable sample project, then browse matching entries in the [skills catalog](/skills).

No CI row should run \`npx cypress\`, open a browser, or fetch a package. Those actions test setup and use, not auto detection. Keep them in a later sample job if the team needs them.

The [FAQ](/faq) can explain why a project was not found. A failed unit row should instead print its root, expected evidence, and actual Cypress item. That data makes a source-code fix much faster.

## Implementation checklist for QASkills Cypress project detection

Use this checklist when reviewing QASkills Cypress project detection:

- Invoke \`detectFrameworks\` with an explicit absolute project root.
- Cover all three supported configuration filenames and their order.
- Cover a real Cypress directory and the current plain-file characterization.
- Test both dependencies and devDependencies with fixed non-empty values.
- Prove config outranks directory and directory outranks package metadata.
- Include missing, unreadable, and invalid package.json cases without expecting a throw.
- Assert ID, display name, and exact evidence for each positive result.
- Clean every temporary project and avoid requiring the Cypress executable.

Keep source references close to assertions. \`detectCypress\`, \`detectFrameworks\`, \`fileExists\`, and \`hasDep\` all live in the same repository file, but they own different pieces of the behavior.

Do not parse configuration content in a test that claims to mirror production. Such a test may be useful for a future validator, yet it cannot prove this detector's current branch because the detector never reads config text.

Do not infer Cypress from test filenames or lockfile entries. QASkills Cypress project detection recognizes only the evidence named in source. The [hybrid framework guide](/blog/hybrid-automation-framework-guide) can help teams reason about projects that intentionally contain several tools.

Do not use the repo's own package.json as the only positive fixture. Its dependencies can change for valid reasons and make the detector suite shift without a code bug. A tiny temp package gives the test full control.

Finally, keep the source path in the test note or case name. When the evidence list changes, reviewers can compare one small file with the fixture table. This is faster than tracing a command from its printed output.

One last test can start with a bare root, add package proof, add a Cypress folder, and then add a config file. Four calls should show no match, package proof, folder proof, and config proof in that order, with one Cypress row at each matched stage.

Remove those items in the same order and call the scan after each step. The best proof still on disk should win, which shows that each run reads current state and does not save the last match.

Use plain names and short JSON text for this state test so each disk change is easy to see in review. The goal is not to build a Cypress app, but to prove which bit of root proof QASkills picks at each point.

Keep all writes in one temp root and clear calls between each scan. This gives the test one short story while keeping old results from making a later check pass by chance.

QASkills Cypress project detection should also return the same path result when the root ends with a path mark. Pass both forms through Node path tools, then compare only the Cypress item and its evidence.

That path pair is useful on more than one host because it avoids hard-coded slash text. It checks that the chosen root, not a raw string join, drives each probe in the file scan.

If a failed case shows no Cypress row, print the names that exist in the temp root before cleanup. This small trace can show a bad setup at once, while normal passing runs stay quiet and quick.

The final gate should run with no web key and no Cypress install. Root files and package text are the full input for this branch, so any wider need points to a test that has left the code contract.

## Frequently Asked Questions

### What does detect cypress config verify in QASkills?

It verifies that one of three exact root filenames is accessible and that the first filename in production order becomes the evidence value. It does not compile TypeScript, import Cypress configuration, inspect test patterns, or confirm a runnable installation. Those checks belong to Cypress itself or a deeper project validator.

### When should a team test cypress directory detection?

Run directory detection tests when framework scanning, filesystem helpers, project-root selection, or evidence precedence changes. Add a regression when a valid Cypress folder is missed or package metadata unexpectedly wins. Include the current plain-file characterization because access checks do not verify that the named entry is truly a directory.

### How can a fixture isolate cypress dependency detection?

Create a unique temporary root containing only a controlled package.json with Cypress in dependencies or devDependencies. Pass that root directly to \`detectFrameworks\`, assert package evidence, and delete the root afterward. No package installation, lockfile, network request, cache, or user-level Cypress binary is required.

### Which assertion proves qaskills cypress evidence?

The best assertion compares the full Cypress result, especially its \`evidence\` field. Build one root containing config, directory, and dependency evidence, then expect the first supported config filename. This proves both detection and precedence, while an ID-only assertion could pass after the implementation chooses the wrong source.

### What failure cases belong in cypress.config.ts scanner tests?

Cover no evidence, inaccessible config, a differently cased filename, nested-only evidence, invalid package JSON, an empty dependency value, and a config entry with the wrong filesystem type. Label platform-sensitive cases carefully. The current detector catches access and JSON errors instead of rejecting the complete framework scan.

### How should CI run test cypress auto detection checks?

CI should use isolated temporary roots, exact lowercase filenames, fixed package JSON, and cleanup hooks. Test each source and combined precedence without installing or launching Cypress. Run the focused CLI suite, then package build and repository gates, with any real sample-project check kept as a separate nonblocking smoke workflow.

## Conclusion

QASkills Cypress project detection is a filesystem and metadata classifier with clear priority: supported config first, a root Cypress entry second, and package dependency last. Tests should assert exact evidence while avoiding claims about configuration validity or executable readiness.

[Browse testing categories](/categories) for the detected framework, then select a matching package from the [skills catalog](/skills) and run the fixture matrix. Continue with the [Cypress tutorial](/blog/cypress-tutorial-beginners-2026) when the next goal is writing and running tests.
`,
};
