import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills multi framework detection order',
  description:
    'QASkills multi framework detection order: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills multi framework detection order',
  keywords: [
    'QASkills multi framework detection order',
    'multiple test framework detection',
    'framework detector precedence',
    'qaskills framework result order',
    'hybrid test project scanner',
    'framework evidence array',
    'table driven detector tests',
  ],
  relatedSlugs: [
    'test-automation-framework-architecture',
    'hybrid-automation-framework-guide',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://vitest.dev/guide/',
    'https://nodejs.org/api/fs.html',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json',
  ],
  repoEvidence: [
    'packages/cli/src/lib/framework-detector.ts#detectFrameworks',
    'packages/cli/src/lib/framework-detector.ts#DetectedFramework',
    'packages/cli/src/lib/framework-detector.ts#detectPlaywright',
    'packages/cli/src/lib/framework-detector.ts#detectVitest',
  ],
  content: `QASkills multi framework detection order follows the source check list: Playwright, Cypress, Jest, Pytest, Selenium, k6, then Vitest, and each check that finds a tool adds one row in that sequence. Test it with an isolated hybrid repo and compare IDs plus proof in their given order, rather than sorting the returned array.

## What does QASkills multi framework detection order guarantee?

QASkills multi framework detection order guarantees a fixed list when many supported marks exist in one project, and \`detectFrameworks\` calls seven checks one by one and adds each non-null result at once. The output follows code order, not package key order, file time, score, or tool name from A to Z.

The code sits in \`packages/cli/src/lib/framework-detector.ts\`, whose public function may take a project root and else uses \`process.cwd()\`. Each private check gets that same set root.

The returned row type is \`DetectedFramework\`, with \`id\`, \`name\`, and \`evidence\`, and that last field holds the file, path, or package fact that made the check pass. It has no score or time.

This article covers list order only, while mark rank inside Playwright, Cypress, Jest, or another check is a part of the code but not the main rule here. Tests can use set marks to make rows, while the main check asks where found rows sit next to their peers.

Node file checks run in sync in this module. The [Node file system docs](https://nodejs.org/api/fs.html) define \`accessSync\` and \`readFileSync\`, while repo code sets which paths are checked and in which order.

The [tool groups page](/categories) lists user-facing groups, and the [skills list](/skills) shows tagged packs, but neither page controls scan order. The source check list is the rule for rank.

One key result follows: a new check in the middle changes the peer spots around it. A stable test should state the full set ID list so that move gets a clear review.

## How does multiple test framework detection work?

Multiple test framework detection starts by getting \`cwd\` from the arg or process state. The function sets an array with \`detectPlaywright\`, \`detectCypress\`, \`detectJest\`, \`detectPytest\`, \`detectSelenium\`, \`detectK6\`, and \`detectVitest\`.

It then loops once, and each check returns one \`DetectedFramework\` row or null. A true result is pushed, so tools that are not found leave no blank row in the output.

\`\`\`typescript
const detectors = [
  detectPlaywright,
  detectCypress,
  detectJest,
  detectPytest,
  detectSelenium,
  detectK6,
  detectVitest,
];

const results: DetectedFramework[] = [];
for (const detect of detectors) {
  const result = detect(cwd);
  if (result) results.push(result);
}
\`\`\`

No async work or work at the same time occurs, so a late check cannot end first and move ahead of an early check. There is no promise race because \`detectFrameworks\` runs in sync.

Each tool appears at most once. A project with both \`playwright.config.ts\` and an \`@playwright/test\` package key still yields one Playwright row because that check returns at its first match.

Missing or unreadable files are contained by helper functions, and \`fileExists\` catches access errors and returns false. \`readFileSafe\` catches read errors, while \`readJsonSafe\` returns null for missing, unreadable, empty, or malformed package JSON.

These caught faults can drop a row but do not move the found peers. If the Jest scan fails between Cypress and Pytest, the array closes that gap and keeps all later matches in source order.

The [npm package.json guide](https://docs.npmjs.com/cli/v11/configuring-npm/package-json) gives the official file rules. QASkills looks only at set package and config fields rather than building a full npm file check.

For broad design choices, read the [test tool design article](/blog/test-automation-framework-architecture). Multiple test framework detection here is a local source scan with fixed rules, not advice on which tool should run first.

## Which cases define framework detector precedence?

Framework detector precedence needs at least four test sets: all marks, a sparse set, other proof for one tool, and bad support files. Together they prove order without tying each case to each mark.

The best good test can make \`playwright.config.ts\`, \`cypress.config.ts\`, \`jest.config.ts\`, \`pytest.ini\`, \`requirements.txt\` with Selenium, \`k6.config.js\`, and \`vitest.config.ts\`. The exact ID list must match the source check order.

A sparse test might hold only Jest, Selenium, and Vitest, and its output is \`['jest', 'selenium', 'vitest']\`. This proves missed early checks add no null rows and do not force a name sort.

Other proof should keep the same spot, so swap \`playwright.config.ts\` for an \`@playwright/test\` dev package key, then expect Playwright to stay first. The \`evidence\` field changes to \`package.json\`, while its list spot stays fixed.

Bad \`package.json\` should not throw because \`readJsonSafe\` catches JSON parse faults. Config files can still make their tool checks pass. For example, Playwright and Vitest config files can still be found when the package file is bad.

The type at \`packages/cli/src/lib/framework-detector.ts\` says proof is the file or path that made the scan pass. Assert exact \`evidence\` for each test set you make on purpose. This stops an old hidden file from making the same ID pass through some other branch.

Do not build the expected order by sorting the real result. That test would approve any input. Write the exact set list from the source check rule, then compare \`results.map(({ id }) => id)\`.

Do not treat file write order as an input. Make marks in reverse order once to prove it has no effect. The source scan checks named paths, not the order of a folder list.

QASkills multi framework detection order should also pass two calls on the same unchanged root. Both arrays should match in full, and neither call should change any file.

The [hybrid test tool guide](/blog/hybrid-automation-framework-guide) covers projects that mix tools. This test uses a mixed set only to check list order, not to prove that those tools work well as one suite.

## qaskills framework result order and the current QASkills contract

The qaskills framework result order is a direct projection of successful detector calls. With every detector successful, IDs appear as \`playwright\`, \`cypress\`, \`jest\`, \`pytest\`, \`selenium\`, \`k6\`, and \`vitest\`.

Names are fixed inside each detector: Playwright, Cypress, Jest, Pytest, Selenium, k6, and Vitest. Tests should prefer IDs for order because IDs serve as stable machine values. Names can still be checked in a smaller shape assertion.

Playwright's detector checks configuration filenames in this order: TypeScript, JavaScript, then MJS. If none exists, it reads package dependencies. That internal priority decides evidence but does not change Playwright's first position in the aggregate.

Vitest is called last even when \`vitest.config.ts\` was the first file created. Its detector checks TypeScript, JavaScript, and MTS configuration names before package dependencies. Again, evidence choice and aggregate position are different axes.

\`\`\`typescript
const result = detectFrameworks(fixtureRoot);

expect(result.map(({ id }) => id)).toEqual([
  'playwright',
  'cypress',
  'jest',
  'pytest',
  'selenium',
  'k6',
  'vitest',
]);
expect(result[0]).toEqual({
  id: 'playwright',
  name: 'Playwright',
  evidence: 'playwright.config.ts',
});
\`\`\`

The function does not deduplicate across different detectors because each emits a unique ID by construction. It also does not rank evidence quality. A package dependency does not receive less weight than a configuration file after the detector returns.

There is no exported detector precedence constant. The array inside \`detectFrameworks\` is the implementation. A test that mirrors it through another local array risks changing both in one careless edit, so keep the expected literal in the test description and review.

QASkills multi framework detection order can support UI or recommendation logic downstream, but this function returns only detected values. It does not automatically select a skill, filter the [blog library](/blog), or choose a command.

## How do you test hybrid test project scanner?

A hybrid test project scanner fixture should be an actual temporary directory populated with small marker files. Real file operations are more useful than mocking every \`accessSync\` call because path names and evidence selection are central to the contract.

Use this ordered procedure:

1. Create a unique temporary project root with no files from the developer repository.
2. Write framework markers in reverse expected order, including a controlled package manifest.
3. Call \`detectFrameworks(fixtureRoot)\` and capture ordered IDs, names, and evidence.
4. Remove selected markers, corrupt the manifest, and compare the sparse result with its literal expectation.
5. Delete the fixture recursively in a guaranteed hook and repeat the main case once.

The package manifest only needs \`devDependencies\` for selected JavaScript tools. Keep versions as fixed strings because the detector checks property presence, not semver ranges. Do not run package installation inside this test.

\`\`\`typescript
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qaskills-frameworks-'));

await fs.writeFile(
  path.join(root, 'package.json'),
  JSON.stringify({ devDependencies: { jest: '1.0.0' } }),
);
await fs.writeFile(path.join(root, 'playwright.config.ts'), 'export default {};');
await fs.writeFile(path.join(root, 'vitest.config.ts'), 'export default {};');

expect(detectFrameworks(root)).toEqual([
  { id: 'playwright', name: 'Playwright', evidence: 'playwright.config.ts' },
  { id: 'jest', name: 'Jest', evidence: 'package.json' },
  { id: 'vitest', name: 'Vitest', evidence: 'vitest.config.ts' },
]);
\`\`\`

This example uses real files while leaving framework packages uninstalled. The detector reads marker names and manifest keys; it does not import the frameworks. That makes the fixture fast and independent of lockfile state.

Add a directory marker case for Cypress or k6 because some detectors accept directories. Make the directory empty, then assert its evidence includes a trailing slash as returned by source. This catches accidental evidence normalization.

For Pytest, text sections in \`pyproject.toml\` or \`setup.cfg\` are enough. For Selenium, controlled manifest, Maven, or requirements text can trigger detection. Keep these details in fixture builders so the aggregate test remains readable.

The [Vitest guide](https://vitest.dev/guide/) explains test hooks and assertions for this package. Use \`afterEach\` cleanup and table data, but keep the core all-framework expectation visible as one ordered list.

The [Playwright complete guide](/blog/playwright-e2e-complete-guide) covers running browser tests. A hybrid test project scanner test does not launch browsers; it verifies static project evidence only.

## framework evidence array failure and edge-case matrix

The framework evidence array should make inclusion and order easy to diagnose. Each result needs the expected ID and the specific marker that won inside its detector. A mismatch can then identify either aggregate order or internal evidence priority.

| Scan row | Files present | Ordered result | Defect clue | Code location |
|---|---|---|---|---|
| multiple test framework detection | All seven controlled markers | Seven IDs follow detector source order | Alphabetic, creation, or package order appears | \`packages/cli/src/lib/framework-detector.ts\` |
| framework detector precedence | Sparse and reverse-created markers | Successful subset keeps relative source order | Null gaps or reordered subset | \`packages/cli/src/lib/framework-detector.ts\` |
| hybrid test project scanner | Config plus package evidence for one ID | One result uses the first detector branch | Duplicate ID or lower-priority evidence | \`packages/cli/src/lib/framework-detector.ts\` |
| table driven detector tests | Malformed and unreadable support files | Failures are omitted while neighbors remain ordered | Throw, stale evidence, or shared fixture state | \`packages/cli/src/lib/framework-detector.ts\` |

An empty directory should return an empty array. It should not infer a framework from the QASkills repository because the explicit project directory replaces \`process.cwd()\`. This assertion catches tests that accidentally omit the argument.

Malformed package JSON returns null from the safe parser. If a configuration file still exists, its detector may succeed before reading package data. Build malformed cases with clear expectations for each relevant marker.

Unreadable files can vary by platform and permission model. Prefer a mocked read failure for that helper boundary, while using real missing and malformed files for portable integration cases. Label platform-specific checks so they do not become flaky release gates.

One framework can have several markers, yet it should yield one result. Create two Playwright configs and a dependency, then assert exactly one Playwright object with TypeScript config evidence. This records private branch priority without changing aggregate order.

A package manifest with both dependencies and development dependencies is supported by \`hasDep\`. Test one framework in each collection, then assert their detector positions rather than manifest property order.

The table should not treat unsupported tools as errors. Their files are ignored because no detector probes them. If support is added, the expected sequence needs an explicit new entry and review.

## How should table driven detector tests run in CI?

Table driven detector tests should run in the CLI package without installing any detected framework. Each row creates a temporary directory, writes minimal evidence, calls one public function, compares values, and removes the directory.

Build fixture helpers around file writes, not around detector results. A helper such as \`writePackage(root, devDependencies)\` is clear. A helper that returns expected order from the production detector list weakens the test.

Use one comprehensive order test, then smaller tables for sparse subsets and evidence alternatives. This structure keeps the central contract easy to review while still covering input boundaries.

QASkills multi framework detection order is platform-independent for ordinary relative markers. Normalize only temporary root paths in diagnostics. Evidence strings are source-defined relative names and should be compared exactly.

Do not run tests in the actual repository root. It already contains package dependencies and files that can trigger several detectors. Isolation prevents a newly added config from changing unrelated expected results.

Parallel execution is safe when every row owns a unique temporary directory. Avoid a shared \`fixture-project\` path, and delete each root even if an assertion fails.

Run the all-framework case twice with different creation orders. This provides a direct regression signal for accidental directory enumeration. No sleep or timestamp manipulation is needed.

When a detector is added, require a new fixture marker and an explicit placement in the expected array. This turns source order into a reviewed product decision rather than an incidental insertion.

Use the [Cypress beginner guide](/blog/cypress-tutorial-beginners-2026) for tool-specific execution details. CI detection tests should not launch Cypress, Playwright, Jest, or Vitest.

## Implementation checklist for QASkills multi framework detection order

Start with the exact seven-ID sequence and a sparse three-ID sequence. Create files in reverse order and call \`detectFrameworks\` with an explicit root. Compare IDs before inspecting names and evidence.

Reference \`packages/cli/src/lib/framework-detector.ts\` for \`detectFrameworks\`, \`DetectedFramework\`, \`detectPlaywright\`, and \`detectVitest\`. These symbols provide the aggregate loop, object shape, and first and last detector behavior.

Verify one-result-per-framework with duplicate markers. Then verify an empty root, malformed package JSON, omitted middle frameworks, and repeated calls. Every case should leave the fixture unchanged.

Keep the aggregate assertion literal. Do not sort actual or expected arrays, and do not derive expected values from production source at runtime. The test should fail when order changes.

Use approved references for external mechanics only. Node explains filesystem calls, npm explains package manifests, and Vitest explains the test runner. QASkills source defines actual markers and precedence.

Inspect [framework categories](/categories) and matching [QA skills](/skills) only during a manual release check. Automated detector tests should depend exclusively on their temporary files.

Draw the seven source slots on paper or in the test note before you make any files, then mark which slots each row fills. This plain view helps reviewers see that a sparse result keeps rank among the slots even though its array indexes close each gap.

Give the full row one marker for each tool, with no extra files in the work root and no package install step. The goal is to make each yes result come from one known fact that the test wrote itself.

Write those seven markers from last slot to first slot, then run the scan and check the normal source order. This proves file time and write order do not guide the list while keeping the test easy to read.

For the sparse row, use three tools that sit near the start, middle, and end of the source list. A set such as Playwright, Pytest, and Vitest shows that gaps vanish but relative rank stays fixed.

For the no-match row, pass the empty temp root by name and expect an empty array with no thrown error. Also assert the scan made no new files, since this helper should only read from the root.

For the bad JSON row, write one short broken token to \`package.json\` and add two config files that do not need that data. Both config-led tools should still appear in their source rank, while package-only matches should stay out.

For the duplicate-marker row, add all three Playwright config names and both of its package keys. Expect one Playwright item with the first config name, which proves the detector stops after its first true check.

For a package-only row, place one tool in \`dependencies\` and a later tool in \`devDependencies\`. The scan should find both through the same small helper while their order still comes from the detector list.

Use a plain array of expected objects for the full row, even if that list takes several lines. A helper that reads source code to make the expected list would hide the exact change this gate must catch.

Show actual IDs and evidence in a failed test note, but sort nothing before printing or comparing. The raw array is the product of the scan, and a sorted report could make a true rank fault look normal.

Keep one temp root per table row and put its path in the failure note only when a file check fails. This gives enough data to inspect a local run while avoiding shared roots that let one row seed the next.

Delete roots with a force flag in a final hook, then check for open file handles only if a runner still hangs. All source reads are sync and short, so a normal row should leave no timer, stream, or child task behind.

Do not mock \`path.join\` or the public scan just to make the rows short, because path use is part of the real file rule. Small real files give more trust here than a long list of mocked access calls.

Mock one read fault only when the host cannot make a safe unreadable file in a stable way. Keep that row apart from the real-file table and state that it proves catch behavior rather than all host permission rules.

When a new detector is proposed, add its marker to the full row and choose its exact slot before code review ends. Then add one sparse row where tools on both sides prove the new slot does not move old peers by mistake.

When an old marker rule changes, update the evidence row but leave the full ID order row alone unless detector rank also changes. This split keeps a small marker edit from turning into a vague full-suite rewrite.

Run the full row on each host used by the package job, but compare source-style evidence strings rather than full temp paths. The detector returns set file names and short folder names, so host path separators need not enter the expected result.

Read the final result as a user would read a scan report: first tool, proof, next tool, proof, with no hidden score. That frame keeps QASkills multi framework detection order tied to what the function returns instead of a rank model it does not have.

Make one small helper that writes a file and one that writes the package map, while the test row still owns all names. These helpers cut noise from setup but do not know which tool should rank first or what proof should come back.

Keep the full expected list in the test file near the source order note, with one object on each line. A code review can then see a move as a real line move instead of a change inside a sort or map call.

For the sparse set, make files for the last tool first, the mid tool next, and the first tool last. The scan must still return first, mid, and last in source rank, which gives clear proof that write time has no role.

For the bad map, leave one plain config file on each side of the package-led tool in rank. If package parse fails, those two file-led tools should remain and keep their peer order with no blank row between them.

For two config names from one tool, check both the one-item count and the proof string chosen by the source. This row tells a rank fault from a rule fault, since the tool's place can stay right while its proof changes.

For the empty root, read the file list before and after the scan and match both lists as empty. The scan should not make a cache, lock, log, or config file as a side effect of its read.

For the repeat run, keep the same root and call the scan twice with no file writes in between. Deep-match both arrays, then check each is a new array if callers rely on safe list use after the call.

For a root with a space in its name, pass the full path as one function arg and expect the same short proof strings. This guards path joins while avoiding shell rules, since no shell starts in this code path.

Use the [hybrid framework guide](/blog/hybrid-automation-framework-guide) to pick a sound mixed-tool example for docs, but keep the gate much smaller. The scan test needs marker facts and rank checks, not a working suite from each tool.

When the full row fails, print the raw pairs of ID and proof in their given order, then stop before any sort. This report should let a reviewer see a lost tool, moved tool, or changed proof from one short list.

End the job by checking that every temp root was removed, even for rows that threw on read or parse. Clean roots keep the next run honest and make the gate safe when many package jobs share one host.

QASkills multi framework detection order passes when every found tool stays in source sequence and missing tools leave no blank entries. The evidence field must also name the exact marker made by that test row.

## Frequently Asked Questions

### What does multiple test framework detection verify in QASkills?

It verifies that one project can yield several framework records and that each successful detector contributes at most one object. The result should include stable IDs, display names, and triggering evidence. It does not install, import, or execute any framework found in the directory.

### When should a team test framework detector precedence?

Test precedence whenever detector order, marker rules, safe file reads, or the detected result type changes in source. A new supported framework also requires an explicit expected position. Include complete and sparse fixtures so omission never hides a relative ordering defect.

### How can a fixture isolate qaskills framework result order?

Create a unique empty temporary directory, write only named marker files and a minimal package manifest, then pass that root explicitly to \`detectFrameworks\`. Compare literal ordered IDs and exact evidence. Remove the directory afterward so repository files cannot influence detection.

### Which assertion proves hybrid test project scanner?

The clearest assertion compares the full array of expected \`id\`, \`name\`, and \`evidence\` objects for a controlled hybrid fixture. A second clean run with reversed file creation order should return the same array, proving source precedence rather than filesystem chronology.

### What failure cases belong in framework evidence array tests?

Cover an empty root, malformed package JSON, missing files, duplicate markers for one framework, unreadable support files where portable, and omitted middle detectors. Each result should either identify one expected marker or cleanly disappear without reordering the remaining successful frameworks.

### How should CI run table driven detector tests checks?

Run them in the CLI package with unique temporary directories and no framework installation. Keep one visible seven-framework order case plus smaller input tables. Use guaranteed cleanup, literal expectations, and no network. A changed detector position should require deliberate test review.

## Conclusion

QASkills multi framework detection order is deterministic because \`detectFrameworks\` calls a fixed synchronous array and immediately appends each success. It does not sort results or consider file chronology, package manifest order, or confidence.

Protect the contract with real temporary markers, literal ordered IDs, exact evidence, sparse subsets, malformed files, and repeated calls. Keep aggregate position separate from marker priority inside each framework detector.

Browse the [framework categories](/categories), then select a matching package from the [skills directory](/skills) and run the fixture matrix. Add an explicit expected position whenever a new detector joins the source array.`,
};
