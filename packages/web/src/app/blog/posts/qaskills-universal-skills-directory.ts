import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills universal skills directory',
  description:
    'QASkills universal skills directory: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills universal skills directory',
  keywords: [
    'QASkills universal skills directory',
    'agents skills universal directory',
    'dot agents skills folder',
    'cross vendor agent skills',
    'universal skill install target',
    'qaskills universal agent',
    'agent skills open standard',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'how-to-install-skills-claude-code',
    'how-to-install-skills-cursor',
    'ai-qa-skills-directory-2026',
  ],
  sources: [
    'https://agentskills.io/specification',
    'https://nodejs.org/api/os.html',
    'https://nodejs.org/api/path.html',
  ],
  repoEvidence: [
    'packages/cli/src/lib/agent-detector.ts#detectAgents',
    'packages/shared/src/constants/agents.ts#UNIVERSAL_AGENT',
    'packages/shared/src/constants/agents.ts#AGENTS',
    'packages/shared/src/types/agent.ts#AgentDefinition',
  ],
  content: `The QASkills universal skills directory is the global \`~/.agents/skills\` target that detection always returns, even when no vendor configuration exists. QASkills expands the home path, marks the target global, reports whether the folder exists, and appends it after detected vendor agents so users always retain a cross-vendor installation choice.

This behavior concerns one shared destination, not every vendor's discovery rules or installation tutorial. The source contract is \`packages/cli/src/lib/agent-detector.ts\`, and the [supported agents page](/agents) provides the user-facing list around that detector.

## What does QASkills universal skills directory guarantee?

- The QASkills universal skills directory guarantees that \`detectAgents\` returns one universal target on every call. Its presence does not depend on \`~/.agents\`, \`~/.agents/skills\`, a project config file, or any vendor-specific folder already existing.

The universal definition lives in \`packages/shared/src/constants/agents.ts\`. It has ID and slug \`universal\`, a display name for \`.agents/skills\`, global config and skills paths, copy installation, and an Agent Skills website.

- The detector loops through \`AGENTS\` first. Each vendor entry is included only when its configured directory or qualifying project config file exists. After that conditional loop, the detector unconditionally pushes \`UNIVERSAL_AGENT\`.

That order creates a useful observable contract. Detected vendor agents retain their constant order, and the universal result is last. Tests can assert one final universal entry without taking a snapshot of every supported vendor.

The \`exists\` property reports current folder state rather than target availability. A missing universal folder still produces a detected result with \`exists: false\`; installation code can create the destination later.

The QASkills universal skills directory also has \`scope: 'global'\` because its path begins under the user's home directory. It is not the same as a project-local \`.agents/skills\` folder, even though both use the same general convention.

The [Agent Skills specification](https://agentskills.io/specification) is the authoritative source for the portable skill format. QASkills source remains the authority for which target this CLI returns and how its path is represented.

## How does agents skills universal directory work?

- The agents skills universal directory behavior is explicit at the end of \`detectAgents\`. The detector expands the configured home-relative path, probes folder existence, builds a \`DetectedAgent\`, and returns it with every vendor result.

\`\`\`typescript
const universalSkillsDir = expandHome(UNIVERSAL_AGENT.skillsDir);
detected.push({
  definition: UNIVERSAL_AGENT,
  skillsDir: universalSkillsDir,
  exists: probeExists(universalSkillsDir),
  scope: 'global',
});

return detected;
\`\`\`

- This excerpt mirrors \`packages/cli/src/lib/agent-detector.ts\`. There is no conditional around the push, which is the core fact the test must protect. Only the boolean existence probe varies with filesystem state.

The local helper expands a path beginning with \`~/\` by joining \`os.homedir()\` with the text after the tilde. Node documents the home-directory lookup in its [operating system API](https://nodejs.org/api/os.html).

Path joining is platform aware. The [Node path API](https://nodejs.org/api/path.html) defines those operations, so a test should compare against \`path.join(mockHome, '.agents/skills')\` instead of hard-coding slash behavior for every operating system.

The detector's optional \`projectDir\` affects project-scoped vendor definitions, but it does not change the universal global path. Include two calls with different project roots and require the same universal \`skillsDir\`.

Testing only a machine with an existing folder misses half the contract. Mock or isolate the existence probe so the suite covers true and false while always receiving the result.

Do not call the result "installed" merely because it appears. The detector reports a candidate target plus current folder state. Installation success requires later file operations and belongs to another test.

## Which cases define dot agents skills folder?

- The dot agents skills folder needs cases for an absent home target, an existing target, vendor entries, project roots, repeat calls, and duplicate prevention. Together they prove unconditional availability without making host-specific assumptions.

For the absent case, make the configured home path resolve inside an empty temporary directory. Require one universal result, \`exists: false\`, global scope, and the fully resolved skills path.

For the existing case, create \`.agents/skills\` before detection and require the same definition and path with \`exists: true\`. Folder contents should not affect detection, so one empty directory and one containing a fixture should yield the same result.

For vendor coexistence, create one project configuration recognized by an entry in \`AGENTS\` and require that vendor result first and universal last. Avoid asserting the total list when the repository can add new agent definitions.

For project isolation, call \`detectAgents(tempA)\` and \`detectAgents(tempB)\` with different local configs. Their project agents may differ, but both arrays should end with the same global universal path.

For repeat calls, switch the universal folder from absent to present between invocations. The second result should update \`exists\`; no module restart should be required because \`probeExists\` runs during each call.

The shared \`AgentDefinition\` in \`packages/shared/src/types/agent.ts\` requires identity, paths, install method, and website fields. Validate only the stable universal values, not all description punctuation, unless product copy itself is under test.

The [skill format guide](/blog/skill-md-format-guide) explains what belongs inside each installed directory. This detector test stops at destination discovery and should not parse a skill file.

One negative case should scan returned IDs and require exactly one \`universal\`. This catches an accidental addition to \`AGENTS\` or a second push without tying the test to the entire array.

Keep the home and project roots far apart in the fixture, and use names that show which one owns global files and which one owns local files. This makes a wrong join easy to see in a failed path.

The test does not need a real agent app, since a small folder that matches one known project rule is enough to make one vendor row appear. The rest of the user machine must stay out of the scan.

Run the absent case before making the folder, since this first view proves that the result is offered due to code, not due to an item on disk. The next view then proves that the state flag can change.

Read the result by ID rather than by array index for most checks, and use the final index only for the one order rule as new vendor rows may raise the array size. This keeps the main checks stable as support grows.

Store the first result and compare its path with the second result, where the path and scope should match while the exists flag changes from false to true. A small pair of facts tells the whole state story.

Do not place a skill file in the absent case because detection checks the folder path, not SKILL.md, and a file would add a claim the code does not make. File checks belong to the install and format suites.

Use the [QASkills getting started page](/getting-started) for a manual run after local tests pass. The test itself should call source code and read only its own temp folders.

## cross vendor agent skills and the current QASkills contract

Cross vendor agent skills use a separate constant rather than an entry inside \`AGENTS\`. The source comment explains that separation prevents the universal target from appearing in web compatibility filters while allowing the CLI to offer it consistently.

\`\`\`typescript
export const UNIVERSAL_AGENT: AgentDefinition = {
  id: 'universal',
  name: 'Universal (.agents/skills)',
  slug: 'universal',
  description: 'Cross-vendor skills directory',
  configDir: '~/.agents',
  skillsDir: '~/.agents/skills',
  configFile: '',
  installMethod: 'copy',
  website: 'https://agentskills.io',
};
\`\`\`

The repository's actual description is longer, but the remaining values above mirror \`packages/shared/src/constants/agents.ts\`. A code example can shorten display text when the article clearly says it is not a byte-for-byte source quote.

- Keeping \`UNIVERSAL_AGENT\` outside \`AGENTS\` affects \`getAllAgents\`, which returns a copy of \`AGENTS\` only. Therefore, tests should not assume every detector result also appears in \`getAllAgents\`.

- That asymmetry is intentional in current code. \`detectAgents\` always offers universal, while manual agent listings based on \`getAllAgents\` may focus on named vendor definitions. If product behavior changes, both tests and UI expectations need review.

The \`installMethod: 'copy'\` value says how later installation should place files. It does not mean detection writes anything. Assert that calling detection leaves an absent home target absent.

The config file is an empty string, so the universal target does not rely on one project file. Tests should avoid passing an invented universal config path and then claiming that file caused detection.

Each field answers a small question. The ID is used by code, the name is shown to a user, the path says where files go, and the scope says which home owns them. Test the fields that guide behavior, then leave prose copy to a page test.

The empty config file is also a useful guard because no project file should turn this global row on or off. Create many project roots if needed, and the same global row should still appear.

The copy method is a plan for a later step, so a detector test can require the value but must also prove that no copy took place. Reading and writing are different duties, and one test should not blur them.

The website field points to the source standard and is useful for docs and review, but detection does not fetch it. A network mock in this suite would add work without proving any source branch.

Keep the constant object free from test edits because a mutated value can make the next call see a false path or ID and make order matter. Treat shared constants as read-only input.

When a shared type gains a new field, type checking will fail near the constant, so add a runtime assertion only when the field changes user behavior. This split keeps the suite short and clear.

The [skills-for directory](/skills-for) can organize catalog content by supported clients. The detector contract stays independent of those marketing routes and their labels.

- QASkills universal skills directory tests should use the definition object from the shared package rather than duplicating every field in fixtures. Importing the constant makes identity changes visible while focused assertions explain behavior.

## How do you test universal skill install target?

A universal skill install target test needs controlled home resolution and filesystem state. Because \`os.homedir\` and synchronous probes are module dependencies, set mocks before loading the detector or isolate the process environment in a child.

1. Create an empty temporary directory to represent the test user's home.
2. Mock \`os.homedir\` to return that path before importing the agent detector.
3. Call \`detectAgents\` with a separate empty project directory.
4. Find results whose definition ID equals \`universal\` and require exactly one.
5. Compare \`skillsDir\` with \`path.join(testHome, '.agents/skills')\`, global scope, and \`exists: false\`.
6. Create the expected folder, call detection again, and require \`exists: true\`.
7. Assert that detection did not create, remove, or alter any files in either run.
8. Restore module and filesystem state, then remove both temporary directories.

This procedure tests the QASkills universal skills directory without reading the developer's real home. It also proves that a missing folder is a valid offered target, not a detector error.

When module mocking is difficult, spawn a child process with a temporary home environment and import the built package there. Confirm that Node's \`os.homedir\` follows that environment on the CI platform before relying on the technique.

Prefer direct path assertions over string suffix checks. A suffix can pass even when a path is relative, uses the wrong home, or contains an unresolved tilde.

Add one test where a vendor-specific config exists under the project root. The universal path must still use the test home, while the vendor path may resolve from the project.

The [installation guide for Claude Code](/blog/how-to-install-skills-claude-code) covers a named client. Keep its target rules out of this test so cross-vendor behavior remains clear.

## qaskills universal agent failure and edge-case matrix

- The qaskills universal agent has few failure branches because detection catches existence probe errors and reports false. The main regressions are omission, duplication, unresolved paths, incorrect scope, and accidental filesystem mutation.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| agents skills universal directory | Empty test home | One universal result with \`exists: false\` | Result omitted | \`packages/cli/src/lib/agent-detector.ts\` |
| dot agents skills folder | Existing global folder | Same result with \`exists: true\` | Existing folder ignored | \`packages/shared/src/constants/agents.ts\` |
| cross vendor agent skills | Vendor config also detected | Universal remains final and unique | Duplicate or reordered target | \`packages/shared/src/constants/agents.ts\` |
| universal skill install target | Two project roots | Same resolved global path | Path follows project root | \`packages/shared/src/types/agent.ts\` |
| agent skills open standard | Probe throws or lacks access | Universal remains with false state | Detector throws | \`packages/cli/src/lib/agent-detector.ts\` |

An access error is treated like nonexistence because \`probeExists\` catches every exception. A test can simulate that branch, but the article should not claim it distinguishes permission denial from a missing folder.

- An unresolved tilde is another clear failure. Require an absolute path and reject any returned \`skillsDir\` beginning with \`~\`. This protects later file operations from receiving shell notation that Node does not expand automatically.

A duplicate ID can appear if a future contributor inserts the universal definition into \`AGENTS\` while retaining the final push. The uniqueness assertion catches that design conflict early.

The detector always appends universal after vendor scans. Avoid sorting results in the test before checking position, because sorting would hide a changed user-facing order.

Use one fail message for each key fact, such as "missing universal row," "path still has tilde," "scope is not global," or "row is not last." Such plain output gives the author a direct place to look.

Do not fail because an extra vendor is found on a test host, as that would show the fixture touched real state but would not change the universal rule. Fix the test home and project root, then assert only the controlled vendor and universal facts.

When access to the target fails, the row still appears with a false flag, so record that exact fact and do not call it a missing folder. The helper cannot tell why the probe failed, so the test must not add a reason.

If the path still begins with a tilde, later Node file calls will not treat it as a home path by magic. The absolute path check catches that fault before an install tries to use the bad string.

When two universal rows appear, print their source IDs and paths but do not sort them away, since the likely cause is a constant placed in both the vendor list and the final push. A clear pair makes that bug quick to spot.

Check that the temp home stays empty after the absent run, then make only \`.agents/skills\` and check again after detection. These before and after lists are simple proof that the scan did not write.

The [QASkills FAQ](/faq) can explain why a universal target is shown to users. The unit report should stick to path, scope, state, and order.

Folder creation belongs to installation code, so a test should snapshot directory entries before and after detection. This is a behavioral filesystem assertion, not a broad side-effect claim about later commands.

Use the [QASkills directory overview](/blog/ai-qa-skills-directory-2026) for product context. The matrix itself should stay tied to the exact source paths listed above.

## How should agent skills open standard run in CI?

Agent skills open standard checks should run as deterministic CLI unit tests on every supported operating system. Path separators and home resolution are platform-sensitive, while the expected logical target remains \`.agents/skills\`.

Use temporary homes for each worker and avoid touching a runner account's actual \`.agents\` directory. A hosted runner may contain preinstalled tools, which could turn an absent fixture into an unexpected existing target.

The QASkills universal skills directory suite should cover at least one empty home and one created destination. Run vendor coexistence with a temporary project config, then remove all fixture state in guaranteed cleanup.

Do not require internet access to verify the source URL or download a skill. The standard source was reviewed during content preparation, but behavior tests need only local constants, paths, and probes.

Run type checking with the tests. A changed \`AgentDefinition\` interface should force updates to \`UNIVERSAL_AGENT\`, while runtime cases prove the detector still returns the right values.

Keep one built-package smoke test that imports the detector through the same compiled boundary used by the CLI. Unit mocks offer branch precision, while built output catches packaging or module-format mistakes.

On Windows, compare normalized path values through Node path functions instead of writing expected forward slashes. On Unix-like runners, retain the same logical assertion rather than a separate feature test.

Give each worker its own root with a name that includes the worker ID. One shared home can change from absent to present while another case is still reading it. Separate roots remove that race with very little setup.

Do not use sleep calls after making a folder. The probe is a direct file check, so the next call can read the new state at once. A delay would make the suite slow and could hide a wrong async guess.

Run the same small pair of cases on each system. There is no need for a wide matrix of slash text, since Node path joins own that part. The QASkills rule is one global target with one logical tail.

Keep the built smoke case read-only. It should import the detector, call it with a temp project, print the universal row as JSON, and exit. The unit suite remains the place for mocks and branch detail.

If a build smoke case cannot mock the home, start it with a new home environment and verify what Node reports before the main assertion. This one guard prevents a runner rule from making the path claim false.

The QASkills universal skills directory check needs no API key or service URL. Strip those values from the child environment so a future import cannot make an unrelated call. Local path proof should stay local.

Keep the pass log to the result ID, scope, exists flag, and a redacted temp tail. Full home paths add no value and may expose runner names. Failed logs can show the full temp path because the test made it.

The [blog directory](/blog) can link readers to install guides for each client. CI should not open those pages, since web text and file detection have separate owners.

Store no home-directory listings as CI artifacts. Failure output should include only the temporary root, expected path, returned definition ID, scope, and existence state.

The [getting started page](/getting-started) can guide a manual confirmation after CI passes. Automated tests should never install into a developer or runner's persistent global target.

## Implementation checklist for QASkills universal skills directory

The implementation checklist focuses on target discovery and avoids drifting into vendor installation behavior. Every item maps to current source and can be reviewed without a real account.

- Import \`UNIVERSAL_AGENT\` from \`packages/shared/src/constants/agents.ts\`.
- Call the public \`detectAgents\` function from \`packages/cli/src/lib/agent-detector.ts\`.
- Replace the real home with one isolated temporary directory.
- Require exactly one result whose definition ID is \`universal\`.
- Require the result to appear last after any detected vendor entries.
- Compare its absolute path with the joined test home and \`.agents/skills\`.
- Cover both absent and existing destination states without changing inclusion.
- Require global scope, copy installation, and a false state when probing fails.
- Prove detection creates no directories and writes no files.
- Run calls against two project roots and require one unchanged global destination.

- These assertions protect the current QASkills universal skills directory contract without freezing every vendor constant. They also preserve the distinction between being offered, already existing, and successfully receiving an installed skill.

Review the checklist with one empty-home trace in view. The first result should show a full path, false state, and global scope before any folder is made. That one trace gives a strong base for the rest of the cases.

Then read the existing-home trace beside it. Only the state flag should change, so a changed path or scope is a separate fault. Side-by-side facts are easier to trust than a large object snapshot.

Keep one count assertion for the universal ID and one order assertion for the final row. Do not count all vendor entries, since the list can grow as new tools gain support. Focused counts avoid work each time the catalog grows.

The QASkills universal skills directory test should prove no writes by reading the temp home before and after each call. A detector that makes a folder has crossed into install work and should fail this gate.

Use simple fixture names such as home, project, and skills. Long random prefixes can stay in the temp root, while short child names keep expected paths easy to scan. Clear paths make cross-system faults less hard to read.

When the suite passes, it should leave no temp root. A cleanup hook must run after both success and thrown assertions. This rule protects local work and keeps hosted runners from building up test homes.

Use the [skills catalog](/skills) when choosing content for a separate installation test. Use the [blog](/blog) and [FAQ](/faq) for user guidance, but keep catalog and page availability out of detector unit tests.

Review the checklist whenever shared agent constants, path expansion, ordering, or \`getAllAgents\` behavior changes. A deliberate contract change should update code, tests, and public documentation together.

## Frequently Asked Questions

### What does agents skills universal directory verify in QASkills?

It verifies that \`detectAgents\` always returns one universal global target resolved to the user's \`.agents/skills\` folder. The result must exist even when that folder does not. Tests should separately assert its path, scope, position, uniqueness, and current existence flag on each call.

### When should a team test dot agents skills folder?

Run these cases when agent constants, home expansion, filesystem probes, detector ordering, installation targets, or shared agent types change. Keep them in normal CLI CI because a new vendor entry or path refactor can accidentally omit, duplicate, or relocate the universal result.

### How can a fixture isolate cross vendor agent skills?

Mock the home directory before importing the detector, and use a separate temporary project root. Create only the vendor config needed by the case. This prevents personal tools and global folders from affecting results while proving vendor and universal targets can coexist.

### Which assertion proves universal skill install target?

Require exactly one result with ID \`universal\`, global scope, and an absolute path equal to \`path.join(testHome, '.agents/skills')\`. Run that assertion before and after creating the folder. Inclusion must remain constant while only the existence flag changes between those two calls.

### What failure cases belong in qaskills universal agent tests?

Cover an absent folder, an existing folder, a failed access probe, two project roots, one detected vendor, unresolved tilde prevention, duplicate universal IDs, and accidental writes. Keep actual copy failures in installer tests because detection does not create or populate the destination.

### How should CI run agent skills open standard checks?

Use isolated temporary homes on each supported operating system, run type checking plus detector tests, and add one built-package smoke case. Avoid network requests and persistent global folders. Cleanup should remove every fixture even when an assertion fails or a child process exits early.

## Conclusion

The QASkills universal skills directory is an unconditional detector result with a resolved global path and a current existence flag. Tests should prove inclusion, uniqueness, ordering, path expansion, and zero detection writes without mixing in vendor-specific installation behavior.

Review the [supported agent targets](/agents), choose a QA package from the [skills directory](/skills), and test the documented detection case before adding an installation check. This keeps portable target discovery independently verifiable.`,
};
