import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Update Snapshots Modes',
  description:
    'playwright update snapshots modes: choose safe all, changed, missing, or none snapshot modes. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright update snapshots modes',
  keywords: [
    'playwright update snapshots modes',
    'playwright update snapshots changed',
    'playwright update missing snapshots',
    'snapshot update mode ci',
    'prevent accidental baseline update',
    'playwright update snapshots all',
    'visual baseline review command',
  ],
  relatedSlugs: [
    'playwright-visual-comparison-snapshots-guide',
    'visual-baseline-governance-guide-2026',
    'snapshot-testing-governance-guide',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/test-snapshots',
    'https://playwright.dev/docs/api/class-testconfig#test-config-update-snapshots',
  ],
  repoEvidence: [
    'seed-skills/screenshot-baseline-generator/SKILL.md',
    'seed-skills/playwright-visual-testing/SKILL.md',
  ],
  content: `Playwright update snapshots modes should be selected by intent: none for CI verification, missing for reviewed bootstrap, changed for approved failed baselines, and all for a deliberate reset. No update is automatically safe because every generated image still needs visual review. CI should fail rather than rewrite evidence.

## What Does Playwright Update Snapshots Modes Control?

Playwright update snapshots modes control which expected files a test run may create or replace. They do not decide whether a visual change is correct, approved, or ready to commit.

The four values are none, missing, changed, and all. Their names describe mutation scope, while the test selection still decides which snapshot calls the run reaches.

The official [command-line reference](https://playwright.dev/docs/test-cli) contains a detail that deserves a release check. Running without the update flag defaults to missing, while passing the flag without a value defaults to changed.

Therefore, a verification-only CI job should request none explicitly. Relying on an omitted flag can create a missing baseline and turn absent review material into a generated file.

Each update run still performs the selected tests. A narrow file or project filter limits exposure better than regenerating every visual case under one broad command.

The [visual comparison guide](/blog/playwright-visual-comparison-snapshots-guide) explains how comparisons produce expected, actual, and difference images. Update policy starts after those images are stable enough for human judgment.

Playwright update snapshots modes do not fix nondeterministic fonts, animations, dates, viewport changes, or inconsistent test data. Stabilize capture inputs before allowing any baseline mutation.

A reviewer should always see the mode, selected tests, changed paths, visual differences, and commit state. Without that record, a successful command says only that files were written.

## How Does Playwright Update Snapshots Changed Work?

Playwright update snapshots changed replaces nonmatching expected files reached by the run and also creates missing snapshots. Matching expected files remain untouched, which narrows writes compared with all.

This mode fits a reviewed design change whose affected scenarios are already known. Run a focused test and project, then inspect every changed expected file before accepting it.

Changed is not a repair switch for failed CI. If the product contains a visual regression, this mode can replace the evidence that would otherwise stop release.

The CLI's short \`-u\` form without a value means changed. Prefer the complete \`--update-snapshots=changed\` spelling in scripts so reviewers can see mutation intent immediately.

The [snapshot documentation](https://playwright.dev/docs/test-snapshots) shows the update flag as the way to replace reference screenshots. It does not convert the resulting pixels into an approval decision.

Store the pre-update failure output beside the post-update test result. That pairing shows why a baseline moved and whether the new image actually satisfies the same assertion.

The [baseline governance guide](/blog/visual-baseline-governance-guide-2026) can frame reviewer ownership and retention. Keep the actual command in the pull request so another engineer can reproduce the exact scope.

Playwright update snapshots modes remain safe only when mutation is a separate, visible phase. The ordinary verification job should never discover that changed was inherited from a hidden environment variable.

## Playwright Update Missing Snapshots: Repository Evidence

Playwright update missing snapshots creates expected files that do not exist and leaves existing matches or mismatches unchanged. It suits an intentional first baseline for a new, already reviewed snapshot assertion.

The repository file \`seed-skills/screenshot-baseline-generator/SKILL.md\` treats baselines as reviewed visual contracts. It also describes deterministic data, disabled animation, loaded fonts, masks, stable viewports, and separate browser images.

Its example configuration selects all when an update variable is true and missing otherwise. Read that as skill evidence to review, not a universal CI policy to copy without qualification.

The same file says automated baseline acceptance defeats visual regression testing. That principle means a generated missing file must enter the pull request and receive the same scrutiny as a replaced file.

The smaller \`seed-skills/playwright-visual-testing/SKILL.md\` requires focused tests, independent state, clean resources, reports, and CI gates. It does not provide a special exception for newly generated images.

Together, the files support a two-stage workflow. First produce stable visual output under a narrow command; then review the image, path, test state, and reason before commit.

Use the [snapshot governance guide](/blog/snapshot-testing-governance-guide) to define owners for new expected files. A missing baseline should not be approved only because its dimensions look plausible.

Playwright update snapshots modes need repository review because expected files are source artifacts. The test result alone cannot show whether the new snapshot captured a loading skeleton or intended state.

## When Should QA Teams Use Snapshot Update Mode CI?

A snapshot update mode CI policy should use none for normal pull-request verification. The immediate result should be a failure when an expected file is absent or differs from approved content.

Use missing in a separate, authorized bootstrap job only when its output becomes a reviewable change. Keep the job non-merging until a person inspects and commits the generated files.

Use changed for a known design modification after the existing run has shown the expected failures. Use all only when every reached baseline requires a deliberate reset, such as a qualified rendering environment change.

The [Playwright testing practices](/blog/playwright-testing-best-practices-2026) still apply around fixtures, locators, and assertions. Snapshot policy cannot compensate for shared state or an unstable page.

CI should print the chosen mode before execution and reject an empty or unknown value. It should also fail when update permission is present on an ordinary verification event.

A control run with none must follow any authorized mutation run. This second pass proves the newly reviewed files satisfy the same tests without further writes.

Playwright update snapshots modes should never be selected from branch text, commit messages, or an unchecked user parameter. Use a protected workflow input and reviewer approval with a narrow allowlist.

When storage or rendering differs across environments, fix that parity before changing expected images. Repeated local and CI baselines for the same project signal an environment defect, not approval work.

## Prevent Accidental Baseline Update: Failure Modes and Diagnostics

To prevent accidental baseline update, make an unexpected write a test failure. Record repository status before execution, run in none mode, and prove status remains unchanged afterward.

The first failure class is product-owned. A stable actual image differs because layout, color, content, clipping, or visibility changed against an approved expectation.

The second class is test-owned. Unloaded fonts, moving animations, volatile timestamps, broad masks, or wrong data produce pixels that cannot serve as a stable contract.

The third class is environment-owned. Browser versions, operating systems, font packages, viewport scale, and graphics behavior can create systematic differences outside the application change.

Do not update first and diagnose later. Preserve the original expected, actual, and difference images so each owner can compare facts before any file is replaced.

The [QASkills blog](/blog) links visual, CI, and artifact practices that support this triage. Select the smallest guide that answers the observed failure rather than widening the update command.

A strong mutation test intentionally runs missing or changed in a temporary checkout and confirms the gate detects modified files. It then discards that isolated workspace without touching approved baselines.

Playwright update snapshots modes become dangerous when a green exit status outranks repository evidence. Treat the resulting Git diff as a required output, never an incidental side effect.

## Playwright Update Snapshots All: Evidence and CI Assertions

Playwright update snapshots all writes every snapshot reached by executed tests, including matching expected files. Its scope makes it appropriate only for an explicitly approved baseline reset.

A common reason is a qualified browser or rendering image change that affects every expected file. Even then, divide the run by project or feature so review remains possible.

Capture the mode, exact test filter, project, baseline paths, actual images, difference images, reviewer decision, and commit identifier. These facts connect each binary change to its reason.

Run a clean none-mode pass after the files are accepted. Require zero snapshot writes and the same test selection, which catches partial generation or missed configuration.

The [artifact upload guide](/blog/playwright-screenshots-videos-traces-complete-guide) helps decide which actual and difference images CI retains. Expected images belong in their governed source location rather than a transient report only.

Never mix a broad all-mode run with unrelated product changes. Reviewers cannot reliably separate hundreds of rewritten images from the feature pixels they intended to assess.

If an all-mode command changes no files, keep the command log and clean status as evidence. The absence of a diff is useful only when the selected tests and environment were also recorded.

Playwright update snapshots modes should expose their blast radius before execution. A dry list of tests and baseline directories gives the approver a practical scope check.

## Visual Baseline Review Command Comparison Table

A visual baseline review command should state both write authority and expected evidence. This matrix keeps the four official values tied to distinct operational purposes.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| none | Verify approved snapshots without creating or replacing files | Failure output, actual and diff images, and clean Git status | An omitted setting falls back to missing |
| missing | Bootstrap absent files for new reviewed assertions | New paths, rendered images, selected tests, and approval | A new file is accepted without visual inspection |
| changed | Replace failed or missing baselines for a known design change | Before and after images, diffs, reason, and reviewer decision | A real regression becomes the new expectation |
| all | Reset every reached baseline under explicit authorization | Full path inventory, environment identity, review record, and commit | Broad rewrites hide unrelated or unstable pixels |

The mode does not override test filtering. Pair it with one spec, tag, project, or shard whenever possible, then document that filter beside the diff.

The [verified QA skills directory](/skills) provides visual testing workflows that can support the review. A skill can guide evidence collection, but repository owners still approve the actual baseline files.

Keep the update and verification commands separate in CI logs. A reviewer should be able to identify where writes were permitted and where immutable comparison resumed.

For release gates, none is the only generally safe value. The other three are authoring operations whose output must stop before merge until explicit review completes.

Playwright update snapshots modes have different write scopes, not different standards of proof. Every new or changed expected file needs stable inputs and human judgment.

## How Do You Implement Playwright Update Snapshots Modes?

Implement Playwright update snapshots modes as an allowlisted workflow with a clean verification phase. The procedure below separates baseline authorship from release status.

1. Read \`seed-skills/screenshot-baseline-generator/SKILL.md\` and stabilize data, fonts, animations, masks, browser project, and viewport before generating images, while recording the browser build, screen scale, test owner, data source, and expected page state beside that contract.
2. Run the affected test with none, preserve its expected, actual, and difference evidence, and confirm the failure matches an approved visual change, while saving the failed path list and command before any later write can replace the reason for review.
3. Select missing, changed, or all through a protected input, then narrow the command to the smallest spec and browser project, while printing the chosen mode, exact test list, project name, and allowed path root in the job log.
4. Inspect every changed path and visual difference, record the reviewer decision, and reject unrelated or unstable pixels, while marking each file as accepted, rejected, or waiting for more proof in a complete review list.
5. Commit only approved expected files, remove transient actual and difference output, and retain the command plus environment identity, while checking that no report, mask, threshold, fixture, or source file entered the same change without its own review.
6. Repeat the same test selection with none in CI, require clean Git status, and publish only failure evidence under retention policy, while comparing tracked files, new files, test counts, browser facts, and the final review total with the approved record.

The first code example bootstraps one missing baseline without touching existing mismatches. It prints the source diff immediately so generation cannot masquerade as final verification.

\`\`\`bash
set -euo pipefail

npx playwright test tests/visual/new-card.spec.ts \
  --project=chromium \
  --update-snapshots=missing

git status --short -- tests/visual
git diff --stat -- tests/visual
git diff --exit-code -- tests/visual || printf '%s\n' 'Snapshot review required'
\`\`\`

The final command intentionally reports a review requirement when files changed. A protected workflow should upload actual and difference images, then wait for approval rather than committing automatically.

The second example is the immutable CI gate. It fails on comparison problems and separately fails if any process writes to the governed baseline paths.

\`\`\`bash
set -euo pipefail

test "\${UPDATE_SNAPSHOTS_MODE:-none}" = "none"
npx playwright test tests/visual --project=chromium --update-snapshots=none
git diff --exit-code -- tests/visual
test -z "$(git status --porcelain --untracked-files=all -- tests/visual)"
\`\`\`

This controlled failure can be tested in a disposable checkout by switching none to missing and deleting one expected file. The final status check must reject the newly generated artifact.

The official [TestConfig reference](https://playwright.dev/docs/api/class-testconfig#test-config-update-snapshots) defines missing as the default and lists all four values. Set \`updateSnapshots: process.env.CI ? 'none' : 'missing'\` only if local authoring policy genuinely permits that default.

Avoid a boolean such as \`UPDATE_BASELINES=true\` when teams need several scopes. A typed mode plus explicit approval preserves intent and rejects misspelled values before Playwright starts.

Use the [visual baseline governance article](/blog/visual-baseline-governance-guide-2026) to define approvers and image retention. Keep those policy checks around the official Playwright command rather than writing a second snapshot engine.

The smallest local check runs one visual spec with the intended browser. The CI check repeats that exact selection with none and a clean source tree.

Playwright update snapshots modes pass release review when each changed path has a visible diff and named decision. A green regenerated suite without that mapping is incomplete evidence.

### A safe baseline change record

Begin the record with a short reason for the image change. Name the screen, state, browser, and test that a person can use to see the same view.

Write the current mode in its own field before the command runs. A blank value must stop the job, since an unseen default can create a new file.

List the tests that will run and the paths they may reach. This list sets the review size before any image has been made or replaced.

Run none first and keep its failed view. That run shows the old rule, the new pixels, and the gap that a reviewer must judge.

Check that the page is ready before reading the diff. Fonts must be loaded, motion must be still, data must be fixed, and the chosen view must match the test.

Write down who asked for the change and where its design proof lives. A short issue or approved mock is more useful than the phrase "looks right."

Use missing only when the expected file is truly new. If an old file was moved or renamed, prove that fact so the change does not hide lost test scope.

Use changed when known expected files no longer match. Keep the old files in the Git diff, since their exact before state is part of the review.

Use all only after listing the full set of reached files. A team lead should approve that scope before the run rather than after a large rewrite appears.

Open each changed image at a useful size and compare it with both old and actual views. Check text, focus, crop, scroll, color, empty state, and error state where they apply.

Do not judge only the bright diff marks. A blank page can have a simple diff yet still be the wrong state for every user.

Group review by page or part, not by file order from the shell. This helps the reviewer compare one product rule across each browser and screen size.

Mark every path as accept, reject, or needs more proof. A count of reviewed files is not enough when no one can map the count back to each image.

If one file is wrong, remove it from the change and fix the test state. Do not raise the pixel limit or rerun all files to make the bad view less clear.

After approval, remove actual and diff files that should not enter source control. Keep only governed expected files plus the small review note and command facts.

Run none with the same test list and browser. It must pass with no source change, which proves the accepted files form a stable rule.

Check both tracked and new files after that run. A clean Git diff can miss an untracked image unless the job asks Git to list those paths too.

The [snapshot governance guide](/blog/snapshot-testing-governance-guide) can define owners and review age. Put that rule next to the job so a new team member knows who may accept pixels.

Use [verified QA skills](/skills) to help freeze data or inspect a diff when needed. The skill supports the work, while the named reviewer still owns each final decision.

The record ends with commit, reviewer, none-mode result, and clean status. If any field is absent, the image set may be useful for review but is not ready for release.

Keep the old expected file in the review until the choice is final. A new image without its old pair makes small shifts much harder to spot.

Show the actual file beside the marked diff, since bright marks can hide the full page state. The reviewer needs both cause and whole view before accepting a change.

Write the browser build, screen size, and scale in plain fields. Those facts help explain broad text or line shifts that do not come from app code.

Check the page title and one key heading before each shot. This quick guard keeps a login page or error shell from becoming a fresh expected file.

Keep masks in a short list with a reason for each one. A mask that grows after a failure can hide the same change the test was meant to catch.

Review any new mask apart from the image change. The team must decide whether that part is safe to skip before it sees a green result.

Check the pixel rule for the test, but do not raise it during file review. A larger limit changes what future runs can miss and needs its own clear case.

When a file name changes, map old path to new path in the note. This prevents a lost case from looking like one delete plus one new and sound check.

When a test is removed, ask why its expected file should leave too. A stale image can be cleaned, but the lost user rule still needs an owner.

Keep the update job on a short branch with no other file work. A small Git view helps the person judge pixels without sorting through code from another task.

If the new view is rejected, keep the failed actual and diff under short safe storage. They can guide the fix while the old expected file stays in force.

After the fix, start again with none instead of reusing the prior write step. This proves the app now meets the old rule or shows the new gap with fresh facts.

For a full reset, split the review into small named sets. Stop after each set so one bad state cannot spread through all later files before anyone sees it.

Count approved, rejected, and skipped files at the end, then match the total to changed paths. A missing count is a sign that some image had no clear choice.

The merge note should state why the chosen mode was the least broad safe option. This short reason helps the next person avoid all when missing or changed would do.

## Frequently Asked Questions

### What is the safest way to use playwright update snapshots changed?

Run changed only after a none-mode failure proves which approved design change affected the baseline. Limit execution to one spec and browser project, inspect every before and after image, and record reviewer approval. Follow with the same selection in none mode and require a clean source tree.

### How do you verify playwright update missing snapshots?

Delete or isolate one expected file in a temporary checkout, run missing against its focused test, and confirm exactly one new path appears. Inspect the generated image and test state, then run none. The exercise should never modify the team's approved checkout or commit files automatically.

### When should a QA team choose snapshot update mode ci?

Choose none for ordinary CI verification. Choose missing, changed, or all only in a separate protected authoring job whose file output waits for review. Print the mode, test filter, project, environment, and changed paths so an approver can judge scope before any baseline reaches the main branch.

### What causes failures in prevent accidental baseline update?

Common causes include Playwright's missing default, a bare update flag that means changed, inherited environment settings, broad test selection, and scripts that commit generated files. Add explicit none mode, protected inputs, clean-status checks, and a disposable mutation test that proves unexpected writes stop the job.

### Which evidence should playwright update snapshots all retain?

Retain the exact command, selected tests, browser and operating environment, complete changed-path inventory, expected and actual images, visual differences, reviewer decisions, and final none-mode result. An all-mode run has the widest write scope, so summary counts alone cannot support a careful review.

### How should CI handle visual baseline review command?

Separate generation from verification. The generation job may create artifacts under approval, but it must not merge or silently commit them. The verification job uses none, fails on mismatches or source writes, and uploads bounded failure evidence. A passing rerun cannot erase the first unreviewed difference.

## Conclusion

Playwright update snapshots modes are authoring permissions, not visual approval. Use none for CI, missing for reviewed bootstrap, changed for known differences, and all only for a controlled reset with complete path and image evidence.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Browse [verified QA skills](/skills) before the next baseline change, then require a clean none-mode release gate.`,
};
