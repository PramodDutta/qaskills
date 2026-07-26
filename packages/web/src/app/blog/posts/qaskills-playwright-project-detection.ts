import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills Playwright project detection',
  description:
    'QASkills Playwright project detection: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills Playwright project detection',
  keywords: [
    'QASkills Playwright project detection',
    'detect playwright config',
    'playwright package dependency detection',
    'qaskills framework detector',
    'playwright.config.mjs detection',
    'playwright project evidence',
    'test playwright auto detection',
  ],
  relatedSlugs: [
    'playwright-e2e-complete-guide',
    'playwright-cli-install-quickstart-2026',
    'test-automation-framework-architecture',
    'hybrid-automation-framework-guide',
  ],
  sources: [
    'https://playwright.dev/docs/test-configuration',
    'https://nodejs.org/api/fs.html',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json',
  ],
  repoEvidence: [
    'packages/cli/src/lib/framework-detector.ts#detectPlaywright',
    'packages/cli/src/lib/framework-detector.ts#detectFrameworks',
    'packages/cli/src/lib/framework-detector.ts#hasDep',
    'packages/cli/src/lib/framework-detector.ts#readJsonSafe',
  ],
  content: `QASkills Playwright project detection checks three config names first, in TypeScript, JavaScript, then MJS order. If none exists, it reads package.json and looks for @playwright/test or playwright in dependencies and devDependencies. The first config match becomes the clue, while package data is only the fallback.

The detector is in \`packages/cli/src/lib/framework-detector.ts\` and uses sync file checks because this is a short local scan. It finds the project type; it does not author Playwright tests or install a skill. Browse the [E2E testing category](/categories/e2e-testing) after detection, but keep catalog selection outside the detector test.

## What does QASkills Playwright project detection guarantee?

QASkills Playwright project detection guarantees a \`DetectedFramework\` result when one known config path exists or one known package key has a set value. The result always uses id \`playwright\`, name \`Playwright\`, and one clue string. It returns null when none of those checks succeeds.

The exact branch is \`packages/cli/src/lib/framework-detector.ts#detectPlaywright\`. Its config array is \`playwright.config.ts\`, \`playwright.config.js\`, and \`playwright.config.mjs\`, and a loop joins each name to the supplied project root before it returns after the first path it can reach.

This early return defines precedence. If all three names exist, TypeScript wins because it appears first. If only JavaScript and MJS exist, JavaScript wins. Tests should assert that order because the evidence string may guide a later message or recommendation.

When no config is found, the detector reads \`package.json\` safely and searches \`dependencies\` and \`devDependencies\` for \`@playwright/test\` or \`playwright\`. Any matching package returns the generic clue \`package.json\`, so the result does not reveal which package or section matched.

The official [Playwright config guide](https://playwright.dev/docs/test-configuration) describes the test-runner config model, while QASkills knows only the three root file names listed in its source. It does not walk child folders, load a config, or check that the file exports valid Playwright settings.

That last rule keeps the claim narrow, since detection uses a file clue and does not check the config text. A blank file at a known path counts because the helper checks access, not content.

The public \`detectFrameworks\` call may return Playwright with other frameworks. It runs seven independent detectors and appends each non-null result. A mixed repository can therefore report Playwright and Cypress rather than selecting one global winner.

## How does detect playwright config work?

Detect playwright config behavior depends on path existence and fixed priority. The helper calls \`fs.accessSync(path, fs.constants.F_OK)\` inside a catch-safe wrapper. Any accessible entry at that path is considered present, and an access error is treated as absence without reaching the caller.

The current production logic is compact:

\`\`\`typescript
function detectPlaywright(cwd: string): DetectedFramework | null {
  const configs = [
    'playwright.config.ts',
    'playwright.config.js',
    'playwright.config.mjs',
  ];
  for (const config of configs) {
    if (fileExists(path.join(cwd, config))) {
      return { id: 'playwright', name: 'Playwright', evidence: config };
    }
  }
  const pkg = readJsonSafe(path.join(cwd, 'package.json'));
  if (pkg && (hasDep(pkg, '@playwright/test') || hasDep(pkg, 'playwright'))) {
    return { id: 'playwright', name: 'Playwright', evidence: 'package.json' };
  }
  return null;
}
\`\`\`

Use real temporary directories for these tests instead of mocking every file call. The detector's value comes from joining names, reading JSON, and handling missing paths together. Real files keep that behavior visible while still avoiding a user's working tree.

Create one fixture per precedence question. A TypeScript-only folder proves the basic positive path. A folder containing all three configs proves ordering. A package-only folder proves fallback, while an empty folder proves the null path.

The [Node file system reference](https://nodejs.org/api/fs.html) documents \`accessSync\`, file reads, and constants used here. Repository tests should assert QASkills results, not reproduce Node's own access tests. One inaccessible-path case may be useful on a suitable platform, but permissions can behave differently in containers.

The helper does not call \`statSync\`. A directory named \`playwright.config.ts\` can satisfy the access check even though it is not a config file. Record that as a current edge case if product requirements need stronger evidence, rather than saying the detector rejects it.

Path location also matters. Only names directly under the provided project root qualify. A config inside \`tests/\` or a package workspace child is not found unless that child directory is passed as the project root.

The [Playwright E2E guide](/blog/playwright-e2e-complete-guide) explains test creation after a project is known. This article keeps the contract at the classification boundary so authoring behavior cannot hide a detection failure.

## Which cases define playwright package dependency detection?

Playwright package dependency detection begins only after every recognized root config check fails. It parses package.json and checks two sections for two names. The first successful package test returns Playwright with \`package.json\` evidence, but package ordering is not observable in the result.

The helper at \`packages/cli/src/lib/framework-detector.ts#hasDep\` casts \`dependencies\` and \`devDependencies\` to string maps. It returns the truthiness of either value for the requested name. A normal version range, workspace reference, file reference, or tag is truthy and counts.

An empty string does not count because the helper uses a boolean conversion. A numeric or unusual runtime value could also affect truthiness even though valid npm metadata normally uses strings. Tests should use valid package JSON for supported cases and label malformed shapes as characterization.

The [npm package.json documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json) is the approved reference for dependency fields. QASkills does not ask npm to resolve or install those declarations. It reads local JSON and checks keys only, so an unavailable package version can still count as evidence.

Cover both recognized names in both sections. Four small parameterized rows prove \`@playwright/test\` and \`playwright\` work under dependencies and devDependencies. Add unrelated packages to ensure the detector is not matching the word Playwright elsewhere in the document.

Also add package scripts and arbitrary metadata containing \`playwright\`. Those strings should not trigger detection because \`hasDep\` only reads the two dependency maps. This negative case protects against a future broad text search that raises false positives.

Configuration evidence wins over package evidence. Put a recognized config beside a valid dependency and assert the config filename, not \`package.json\`. This test proves priority in one result without needing access to private call counts.

For monorepos, invoke \`detectFrameworks\` once per package root when that is the desired scan model. The current helper does not ascend to a parent package or recurse into workspaces. A root dependency does not automatically classify a child when the child path is scanned.

## qaskills framework detector and the current QASkills contract

The qaskills framework detector returns an array of independent findings from \`packages/cli/src/lib/framework-detector.ts#detectFrameworks\`. It uses the supplied project directory or defaults to \`process.cwd()\`. Then it runs Playwright, Cypress, Jest, Pytest, Selenium, k6, and Vitest detectors in that fixed order.

Each result has three fields: a stable id, display name, and evidence string. There is no confidence score, deduplication pass, or exclusive framework selection. Since each detector runs once, at most one Playwright result appears during one call.

This aggregate behavior deserves a mixed fixture. Place \`playwright.config.ts\` and \`vitest.config.ts\` in one folder, call the public function, and assert both ids with their evidence. Do not assert array length one merely because this article focuses on Playwright.

Default-directory behavior should be tested carefully because changing \`process.cwd()\` affects the whole process. Prefer passing the temporary directory directly. If one test must cover the default, save the old working directory, restore it in \`finally\`, and prevent parallel execution around that global mutation.

The JSON reader at \`packages/cli/src/lib/framework-detector.ts#readJsonSafe\` returns null for missing, unreadable, empty, or invalid JSON files. It does not throw those errors to the caller. Thus, malformed package metadata produces no package-based Playwright result unless a recognized config already returned earlier.

A package whose JSON root is an array still parses and is cast to a record. The dependency checks then find no normal maps, so detection returns null. This is another parser boundary that a characterization test can record without presenting arrays as valid package files.

Keep framework discovery apart from skill installation. After a Playwright finding, users can browse the [skills directory](/skills) or review the [Playwright CLI setup guide](/blog/playwright-cli-install-quickstart-2026). The detector itself never downloads, installs, or ranks those choices.

## How do you test playwright.config.mjs detection?

Test playwright.config.mjs detection with a real empty file in a fresh temporary project and no earlier config names. Call \`detectFrameworks(tempDir)\`, locate the Playwright result, and compare its full three-field object. Then add higher-priority files one at a time to prove the evidence changes as defined.

Use this procedure:

1. Create a unique temporary directory with no package.json.
2. Write \`playwright.config.mjs\` and call the public detector.
3. Assert id, display name, and MJS evidence for the Playwright result.
4. Add \`playwright.config.js\` and prove JavaScript evidence now wins.
5. Add \`playwright.config.ts\` and prove TypeScript evidence wins.
6. Remove every config, add package dependencies, and prove package fallback.
7. Corrupt package.json, assert no result, then remove the directory in cleanup.

An executable Vitest fixture can keep file operations direct:

\`\`\`typescript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { detectFrameworks } from './framework-detector';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

it('uses the first recognized Playwright config as evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qaskills-pw-detect-'));
  dirs.push(dir);
  fs.writeFileSync(path.join(dir, 'playwright.config.mjs'), 'export default {};');
  fs.writeFileSync(path.join(dir, 'playwright.config.js'), 'module.exports = {};');

  expect(detectFrameworks(dir)).toContainEqual({
    id: 'playwright',
    name: 'Playwright',
    evidence: 'playwright.config.js',
  });
});
\`\`\`

The expected evidence is JavaScript because it appears before MJS in the source list. The content of both files is irrelevant to current detection, but valid-looking text makes the fixture easier for reviewers to understand.

Do not import Playwright itself in this test. The detector never loads the package or config, so doing so would add setup cost without proving another branch. A package JSON key test is enough for dependency evidence.

Use the [test automation architecture guide](/blog/test-automation-framework-architecture) when deciding where framework discovery belongs in a larger initialization flow. This test remains a small file-system contract with guaranteed cleanup.

## playwright project evidence failure and edge-case matrix

Playwright project evidence should tell a user which recognized local clue caused classification. A failure matrix must therefore compare evidence, not just the boolean presence of a Playwright result. It should also include false-positive boundaries that current code accepts or ignores.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| detect playwright config | TypeScript config at project root | Playwright with TypeScript evidence | Null or package evidence | \`packages/cli/src/lib/framework-detector.ts#detectPlaywright\` |
| Config precedence | All three recognized names | TypeScript evidence | JavaScript or MJS wins | config loop order |
| playwright package dependency detection | @playwright/test in devDependencies | Playwright with package evidence | Dependency ignored | \`packages/cli/src/lib/framework-detector.ts#hasDep\` |
| playwright.config.mjs detection | MJS is the only config | Playwright with MJS evidence | Null result | config name list |
| Malformed package | Invalid JSON and no config | No Playwright result | Parser error escapes | \`packages/cli/src/lib/framework-detector.ts#readJsonSafe\` |
| Mixed frameworks | Playwright and Vitest configs | Both findings remain | One finding suppresses another | \`packages/cli/src/lib/framework-detector.ts#detectFrameworks\` |

A recognized path that is a directory currently passes the access check. Add a characterization row if this risk matters, and mark the stronger file-type requirement as pending until source uses a stat check. Tests should not claim a guard that does not exist.

An unreadable package case is difficult to make portable because privileged CI users may still read restricted files. Missing and malformed files provide stable coverage of the catch behavior. Keep platform-specific permission tests outside the required cross-platform gate.

Symlinks can also satisfy access. The detector reports the configured filename rather than the link target. Only add symlink rows if supported environments need that behavior, and clean links with the same temporary root.

Do not compare config contents or exported Playwright settings in this matrix. Those checks belong to Playwright's own configuration load path. QASkills Playwright project detection asks whether recognized evidence exists, not whether tests can run.

## How should test playwright auto detection run in CI?

Test playwright auto detection in the CLI package unit job with temporary directories and no browser install. The suite should pass on any supported Node platform, restore global state, and avoid the developer's current directory. Every fixture should have one named evidence question.

Use deterministic file names and package objects. The required rows are three config names, both package names, both dependency sections, malformed JSON, empty directory, precedence, and mixed-framework output. That set covers every Playwright branch plus aggregate behavior.

Run path-sensitive tests with explicit project roots. A single default-\`cwd\` check is enough if the default itself is a supported contract. Mark it non-concurrent and restore the original directory even when an assertion throws.

No network, browser binary, or QASkills API is needed. This makes the suite appropriate for pull requests that touch \`framework-detector.ts\`. A later command integration check can verify that initialization uses the returned list, but it should not replace helper coverage.

The CI report should show fixture files and actual evidence on failure. A message such as \`expected playwright.config.js, received package.json\` explains precedence immediately. Avoid dumping full package metadata when a key list is enough.

Format package.json with \`JSON.stringify\` rather than hand-writing invalid text in positive rows. Keep one deliberate invalid file for safe-reader coverage. This separation prevents accidental fixture syntax from turning a dependency test into a parser test.

Once detection passes, teams can consult the [hybrid framework guide](/blog/hybrid-automation-framework-guide) for multi-framework design. The gate itself should not install Playwright or run browser tests because those actions prove different product behavior.

## Implementation checklist for QASkills Playwright project detection

QASkills Playwright project detection is protected when tests lock config names, priority, package keys, dependency sections, safe JSON failure, aggregate output, and cleanup. Each assertion should compare the evidence string as well as the id. That extra field catches ordering regressions that a simple boolean misses.

Use this checklist before release:

- Pass a temporary project root instead of scanning the real repository.
- Test TypeScript, JavaScript, and MJS configs separately.
- Test all config names together to lock precedence.
- Test both Playwright package names in both dependency sections.
- Prove scripts and unrelated metadata do not trigger detection.
- Prove malformed package JSON returns no package finding.
- Include Playwright beside another framework in one aggregate fixture.
- Remove every temporary directory and restore any working-directory change.

Repository evidence should point to \`packages/cli/src/lib/framework-detector.ts\` for all these branches. The named symbols clarify responsibility: \`detectPlaywright\` owns priority, \`hasDep\` owns package keys, \`readJsonSafe\` owns parser containment, and \`detectFrameworks\` owns combined results.

Keep the test language accurate. The result means QASkills found a clue, not that the Playwright configuration compiles or that a browser can launch. That distinction keeps QASkills Playwright project detection useful without turning a fast local scan into a full test execution.

After a finding, browse the [categories directory](/categories) and choose a relevant package. Detection should inform that workflow, while the fixture matrix remains independent from current catalog counts and ranking.

Build a small fixture map before you write the first test, and give each row one root path plus one expected result. The map should state which files exist, which package keys exist, and which evidence must win when the call ends. This plan keeps a later row from reusing a file that should have been removed after the prior check.

Start the map with a blank root, since that row proves the base case with no hint at all. The call should return no Playwright item, but it may still find a different tool if the row adds other files. Check the Playwright item by id instead of assuming the whole result list must be empty for each future mixed case.

For each config row, write just one root file and omit package.json, so the source of the match stays clear. Use the exact lower-case names from the source and do not add a test suffix that the code does not scan. The expected evidence must match the file name byte for byte, since that text is what the detector returns.

The priority row should add files in an order that differs from the source list, which proves disk write order has no effect. Write MJS first, then JavaScript, then TypeScript, and still expect the TypeScript name in the result. This row guards the loop order much better than three single-file rows can do on their own.

Make package rows from plain objects and write them with \`JSON.stringify\`, so valid input stays easy to read and hard to break. Put one package key in one map per row, then add a fifth row with both package names in both maps. All such rows should yield the same \`package.json\` evidence because source does not expose the key that won.

Add a script whose text names Playwright but whose dependency maps stay empty, then expect no match from that package file. Add a custom field with the same text and expect the same result. These rows prove that QASkills Playwright project detection reads known package keys instead of any loose word found in JSON.

Keep the bad JSON row short, with one clear syntax fault and no config file that could hide the parse path. The call should return no Playwright item and should not throw back to the test. If it throws, the safe reader no longer contains a local file fault as the current source says it should.

Use a second bad row with an empty package file, since the reader treats no text as a null result before it tries JSON. That path is not the same branch as a parse fault, though both lead to no package match. Separate names make a failed test show whether file reading or JSON parsing changed.

Place one valid config beside bad package JSON and expect the config result, since the function returns before it reads that package file. This case proves the first branch can still classify a project when package data is not fit to parse. It also keeps test claims close to the order a real call follows.

Add one nested config under a child folder and pass only the parent root, then expect no Playwright item from that clue. Call the same function with the child root and expect the file to match. This pair explains the scan depth with real paths and avoids a vague claim that the detector searches a whole work tree.

Do not make case rules from a file system that may ignore case, since local and CI hosts can treat names in different ways. Use the exact names for the required gate and reserve case variants for a host-specific test if the team needs one. The core suite should fail for source changes, not for a disk rule that differs by host.

For the mixed row, add one Playwright config and one Vitest config, then compare both ids and both evidence fields. Check the order only if the public list order is a rule used by another command. The key fact here is that one true detector does not stop the rest of the list from running.

When a fixture fails, print its root file names in sorted form and print the framework results as id plus evidence. Do not print file bodies unless the package row itself is wrong and that text helps the team. This small report makes a bad priority or stale file plain without filling the build log with noise.

Use one fresh root per case instead of wiping and reusing a shared root, since a missed file can change the next result. Track each root in a list and remove all roots in one cleanup hook, even after an early failed check. The [site FAQ](/faq) can help users, while this test cleanup exists to keep worker state safe and repeatable.

Review a detector change with a four-part diff check: names, order, evidence text, and package keys. A new file name needs its own row and a clear place in the priority list. A new package key needs rows for each supported map, while a new evidence string may affect output used by another command.

Run the full map twice with a new set of roots when a change touches shared file helpers, since those helpers serve more than Playwright. The second pass should yield the same facts and leave no root from the first pass. Record this rule in the [blog testing hub](/blog) only after the package gate proves it in code.

Keep one manual check for a small sample project, but do not make that project the required test source. The manual run can show the result in the same work flow a user sees, while the temp map proves each branch. Follow [getting started](/getting-started) for that check and keep its result out of the fixed unit oracle.

If the product later reads config text, add new rows for valid and bad exports instead of changing the meaning of old access rows. The old rows should still prove file name and order, while new rows prove the added parse step. This split lets reviewers see which rule changed and which prior rule still holds.

QASkills Playwright project detection should stay quick because each row touches a few small files and runs no browser or host call. A slow gate is a sign that some other task has entered this suite. Move test launch, package install, and web checks to the lanes that own those facts.

Make one last gate that reads the result as a user would, with the id, name, and source clue shown side by side. Feed it a root with one clear config file and one package key, then check that the config clue wins as planned. This small end check joins the file rule and the public result without a web call or a test run.

Keep the pass note short: name the root, the files, and the clue that won, then stop. On a fail, add the full list of clues and the set of root names so the team can spot stale test data. Plain facts help far more than a large file dump when one item in a short scan has changed.

QASkills Playwright project detection must give the same fact on each fresh run with the same small tree. Run that end case once more after cleanup with a new root name and compare the three result fields. This last repeat check guards against shared path state while adding no browser, package install, or live host risk.

## Frequently Asked Questions

### What does detect playwright config verify in QASkills?

It verifies that an accessible recognized filename at the supplied project root returns a Playwright result with that filename as evidence. It does not parse or execute the config. Include all supported names and one priority fixture so tests prove both recognition and the first-match rule.

### When should a team test playwright package dependency detection?

Run it whenever dependency names, package parsing, or framework discovery changes. Cover @playwright/test and playwright in dependencies and devDependencies. Also prove unrelated scripts do not trigger a result, since QASkills checks exact keys in two maps rather than searching every package.json string.

### How can a fixture isolate qaskills framework detector?

Create a unique temporary directory, write only the evidence required by one row, and pass that path directly to \`detectFrameworks\`. Remove the directory afterward. This avoids user files, process working-directory changes, network access, and installed package state while exercising real file operations.

### Which assertion proves playwright.config.mjs detection?

Assert that the returned array contains id \`playwright\`, name \`Playwright\`, and evidence \`playwright.config.mjs\` when MJS is the only recognized config. Then add JavaScript and prove its evidence wins. Presence alone cannot prove filename coverage or priority across the full ordered config list.

### What failure cases belong in playwright project evidence tests?

Include an empty folder, malformed package JSON, unrelated dependencies, nested configs, empty dependency values, and multiple recognized configs. Add directory or symlink characterization only when needed. Keep invalid Playwright export content outside this suite because current detection checks path access, not configuration validity.

### How should CI run test playwright auto detection checks?

Run fast unit tests with real temporary files in the filtered CLI job. Pass explicit roots, keep fixtures deterministic, and avoid browser downloads. Add one non-concurrent default-directory test only if needed, then restore global state in cleanup so parallel workers cannot influence detection.

## Conclusion

QASkills Playwright project detection follows a fixed, testable hierarchy. Root config names win in TypeScript, JavaScript, then MJS order, while recognized package dependencies provide fallback evidence. Safe parsing contains malformed metadata, and aggregate discovery can report several frameworks together.

Browse the [E2E category](/categories/e2e-testing), select a matching package from [QASkills](/skills), and run the fixture matrix before changing detector rules. Clear evidence assertions keep project classification accurate without confusing it with Playwright test execution or skill installation.`,
};
