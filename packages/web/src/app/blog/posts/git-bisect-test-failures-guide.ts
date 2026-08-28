import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Using git bisect With Your Test Suite to Find the Breaking Commit',
  description:
    'Use git bisect with your test suite to isolate the commit that broke CI. Filters, exit codes, flaky tests, and CI hints that make bisect trustworthy.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Using git bisect With Your Test Suite to Find the Breaking Commit

When a test that passed yesterday fails today, \`git bisect\` plus that same test command is how you find the first bad commit. You mark a known-good revision and a known-bad tip, then let Git check out the midpoint while your suite (or a single filtered case) returns exit 0 for pass and exit 1 for fail. Each answer halves the search space until Git prints the commit that introduced the regression. That pairing (binary search over history driven by your test runner) is what people mean by using git bisect for test failures, and it is the fastest honest way to replace "who broke main?" guesswork with a reproducible blame.

This guide treats bisect as a test workflow, not a Git trivia topic. You will run manual bisects with Vitest and Playwright filters, automate them with \`git bisect run\`, handle unbuildable midpoints with exit 125, keep flaky tests from poisoning the search, and wire CI so a red job drops a ready-made bisect recipe instead of a wall of logs.

## Why test-driven bisect beats scroll-and-guess

A failing CI job names a symptom. The commit that caused it is often not the last merge, not the file that looks related in the stack trace, and not the change your teammates remember. Bisect ignores narratives. It only asks: at this SHA, does the failing test still fail?

That discipline pays off when:

- The regression landed in a dependency bump that touched dozens of files.
- The failure is an assertion drift, not a crash, so stack traces point at fixtures instead of the real change.
- Several PRs merged between the last green main and the first red run.

| Approach | What it optimizes for | When it fails |
| --- | --- | --- |
| Read the last merge diff | Speed of a quick look | Multi-commit windows, drive-by refactors |
| Blame the stack-trace file | Familiarity | Failures caused by shared helpers or config |
| Re-run the whole suite on every suspect SHA | Thoroughness | Time cost and unrelated noise |
| Bisect with one filtered failing test | Halving the commit range | Flaky tests, unclean trees, unbuildable midpoints |

The rest of this post assumes you already have a reproducible local failure or a CI log that names the test. If you do not, stabilize the reproduction first. Bisect amplifies whatever signal you give it.

## Manual bisect with a single failing test filter

Start manual when you are still learning the failure, or when you want to inspect the tree at each step. Automated \`bisect run\` comes next; the commands below are the same ones you will later wrap in a script.

### 1. Capture good and bad

On a clean working tree:

\`\`\`bash
git status
# working tree must be clean; stash or commit local noise first

git bisect start
git bisect bad HEAD          # or the red CI SHA
git bisect good v1.42.0      # last known green tag, or a SHA from main history
\`\`\`

Git checks out a midpoint. Your job is to run only the failing test, then tell Git the answer.

### 2. Vitest: filter by name with \`-t\` / \`--testNamePattern\`

Vitest matches the test title (and nested describe names, depending on how you write the pattern) with \`-t\` or the long form \`--testNamePattern\`. Do not confuse these with Playwright's grep flags.

\`\`\`bash
# Narrow to one case. Prefer an exact-ish substring from the failure log.
pnpm vitest run src/billing/invoice.test.ts -t "applies tax for EU customers"

# Equivalent long form
pnpm vitest run src/billing/invoice.test.ts --testNamePattern "applies tax for EU customers"
\`\`\`

If the test passes at the midpoint:

\`\`\`bash
git bisect good
\`\`\`

If it fails:

\`\`\`bash
git bisect bad
\`\`\`

If the tree does not build or the test file does not exist yet at that commit, skip it (covered in depth later):

\`\`\`bash
git bisect skip
\`\`\`

Repeat until Git prints the first bad commit. Finish with:

\`\`\`bash
git bisect reset
\`\`\`

### 3. Playwright: filter with \`--grep\` / \`-g\`

Playwright uses \`--grep\` / \`-g\` for title patterns. Keep Vitest and Playwright filters straight: Vitest is \`-t\` / \`--testNamePattern\`; Playwright is \`--grep\` / \`-g\`.

\`\`\`bash
pnpm exec playwright test tests/checkout.spec.ts --grep "declined card shows inline error"
# short form
pnpm exec playwright test tests/checkout.spec.ts -g "declined card shows inline error"
\`\`\`

For a known flake-prone e2e, pin workers and retries so the midpoint answer is deterministic:

\`\`\`bash
pnpm exec playwright test tests/checkout.spec.ts \\
  -g "declined card shows inline error" \\
  --workers=1 \\
  --retries=0
\`\`\`

### 4. A practical midpoint loop

Keep a one-liner in your shell history so you do not retype filters wrong between midpoints:

\`\`\`bash
# after each checkout Git performs for you
pnpm vitest run src/billing/invoice.test.ts -t "applies tax for EU customers" \\
  && git bisect good \\
  || git bisect bad
\`\`\`

That pattern is fine when install and build are fast. When they are not, move the same logic into \`git bisect run\` so Git drives the loop without waiting on you.

| Runner | Filter flags | Typical bisect command |
| --- | --- | --- |
| Vitest | \`-t\`, \`--testNamePattern\` | \`pnpm vitest run path -t "name"\` |
| Playwright | \`--grep\`, \`-g\` | \`pnpm exec playwright test path -g "name"\` |
| Jest | \`-t\`, \`--testNamePattern\` | \`pnpm jest path -t "name"\` |
| pytest | \`-k\` | \`pytest path -k "name"\` |

## Automated \`git bisect run\` scripts (exit 0, 1, and 125)

\`git bisect run <cmd>\` executes your command at every midpoint. Git interprets the exit code:

| Exit code | Meaning to bisect | When to use it |
| --- | --- | --- |
| 0 | good (test passed) | Clean green run for the filtered case |
| 1–127 (except 125) | bad (test failed) | Assertion failure, non-zero test runner |
| 125 | skip this commit | Cannot build, missing deps, test not present yet |
| 128–255 | abort bisect | Script bugs; avoid accidental aborts |

Most test runners already exit 0 on pass and non-zero on fail. Your wrapper mainly needs to install, build, run the filtered test, and map "unusable commit" to 125.

### Script: Vitest bisect runner

Save something like \`scripts/bisect-vitest.sh\`:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# Usage: git bisect run ./scripts/bisect-vitest.sh
# Optional env:
#   BISECT_TEST_FILE=src/billing/invoice.test.ts
#   BISECT_TEST_NAME='applies tax for EU customers'

FILE="\${BISECT_TEST_FILE:?set BISECT_TEST_FILE}"
NAME="\${BISECT_TEST_NAME:?set BISECT_TEST_NAME}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm missing at \$(git rev-parse --short HEAD); skip"
  exit 125
fi

# Old commits may lack lockfile or package scripts. Treat install failure as skip.
if ! pnpm install --frozen-lockfile; then
  echo "install failed; skip"
  exit 125
fi

if [[ ! -f "\$FILE" ]]; then
  echo "test file missing on this commit; skip"
  exit 125
fi

# Build step if your tests need compiled output
if pnpm run | grep -q " build"; then
  if ! pnpm build; then
    echo "build failed; skip"
    exit 125
  fi
fi

set +e
pnpm vitest run "\$FILE" -t "\$NAME"
status=\$?
set -e

if [[ \$status -eq 0 ]]; then
  exit 0
fi

# Vitest uses 1 for failing tests; other codes may mean runner misconfig -> skip
if [[ \$status -eq 1 ]]; then
  exit 1
fi

echo "unexpected vitest exit \$status; skip"
exit 125
\`\`\`

Run it:

\`\`\`bash
chmod +x scripts/bisect-vitest.sh
export BISECT_TEST_FILE=src/billing/invoice.test.ts
export BISECT_TEST_NAME='applies tax for EU customers'

git bisect start
git bisect bad origin/main
git bisect good "$(git merge-base origin/main origin/release)"
git bisect run ./scripts/bisect-vitest.sh
git bisect reset
\`\`\`

### Script: Playwright bisect runner

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

FILE="\${BISECT_SPEC:?set BISECT_SPEC}"
GREP="\${BISECT_GREP:?set BISECT_GREP}"

pnpm install --frozen-lockfile || exit 125
pnpm exec playwright install --with-deps chromium || exit 125

[[ -f "\$FILE" ]] || exit 125

set +e
pnpm exec playwright test "\$FILE" --grep "\$GREP" --workers=1 --retries=0
status=\$?
set -e

case "\$status" in
  0) exit 0 ;;
  1) exit 1 ;;
  *) exit 125 ;;
esac
\`\`\`

### package.json scripts that keep flags honest

Put the filtered commands next to your normal test scripts so humans and bisect wrappers share one source of truth:

\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:bisect:invoice-tax": "vitest run src/billing/invoice.test.ts -t \\"applies tax for EU customers\\"",
    "test:e2e": "playwright test",
    "test:bisect:declined-card": "playwright test tests/checkout.spec.ts -g \\"declined card shows inline error\\" --workers=1 --retries=0"
  }
}
\`\`\`

Then the bisect runner can call \`pnpm run test:bisect:invoice-tax\` instead of reconstructing flags. When someone renames the test, they update one script and every future bisect stays aligned.

### Tiny wrapper for \`bisect run\`

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
pnpm install --frozen-lockfile || exit 125
pnpm run test:bisect:invoice-tax
\`\`\`

Remember: \`set -e\` will turn a failing test (exit 1) into an immediate shell exit with that same code, which is exactly what \`bisect run\` wants. Only trap install/build failures and remap those to 125.

## Flaky tests poison bisect

Bisect assumes each midpoint answer is true. A flake that fails on a good commit marks that commit bad and can drag the "first bad" pointer toward the wrong SHA. A flake that passes on a bad commit marks it good and can push the pointer past the real regression.

Symptoms that your bisect was lied to:

- Re-running the blamed commit's parent still fails the same test.
- Re-running the blamed commit sometimes passes.
- The diff at the blamed commit cannot explain the assertion.

Before you trust a bisect result, re-verify:

\`\`\`bash
BAD=$(git rev-parse bisect/bad)   # or note the SHA Git printed
git checkout "\$BAD^"
pnpm run test:bisect:invoice-tax   # expect pass
git checkout "\$BAD"
pnpm run test:bisect:invoice-tax   # expect fail
\`\`\`

If parent fails or the bad commit passes intermittently, stop blaming Git. Fix or quarantine the flake first. For a practical playbook on stabilizing timing, order, and shared state issues, use the [guide to fixing flaky tests](/blog/fix-flaky-tests-guide) before you spend another hour on binary search.

Operational rules that keep flakes out of the search:

1. Disable retries during bisect (\`--retries=0\` for Playwright; avoid vitest retry plugins).
2. Use one worker so order-dependent suites cannot shuffle mid-search.
3. Seed RNG and freeze time when the test depends on them.
4. Prefer a unit or integration case over a full e2e when both reproduce the bug.
5. If you must bisect an e2e, run it three times at the final candidate and require unanimous answers before you merge a "fix".

Flakes are the most common reason teams say "bisect does not work here." Bisect works; nondeterministic oracles do not.

## Skipping unbuildable commits (exit 125)

History is messy. Midpoints can lack a lockfile, fail TypeScript compilation, miss a native addon, or predate the test file you are filtering on. Marking those commits bad or good invents information you do not have. Exit 125 (or \`git bisect skip\` in manual mode) tells Git to try another commit.

Common skip cases:

- \`pnpm install\` fails because an old Node engine cannot read the lockfile format.
- \`pnpm build\` fails on a temporarily broken main that was fixed two commits later.
- The test file or \`describe\` block does not exist yet on that side of history.
- Generated clients or Prisma artifacts are absent and the generate step is not in the script.

Extend the runner to detect "test not found" distinctly from "test failed". Vitest and Playwright usually exit non-zero for both; inspect stderr or use a dry listing step:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

FILE="\${BISECT_TEST_FILE:?}"
NAME="\${BISECT_TEST_NAME:?}"

pnpm install --frozen-lockfile || exit 125
[[ -f "\$FILE" ]] || exit 125

# List matching tests without executing assertions when your runner supports it.
# If zero matches, skip instead of calling that "good".
matches=$(pnpm vitest list "\$FILE" -t "\$NAME" 2>/dev/null | grep -c "$NAME" || true)
if [[ "\${matches:-0}" -eq 0 ]]; then
  echo "no matching tests at \$(git rev-parse --short HEAD); skip"
  exit 125
fi

pnpm vitest run "\$FILE" -t "\$NAME"
\`\`\`

Too many skips widen the "possible first bad" set. Git will report a range instead of a single commit when skips leave ambiguity. Narrow good/bad anchors so the searchable window avoids known broken spans, or temporarily bisect on a topic branch that cherry-picks only buildable commits (rare, but useful for long-lived release lines).

Node version drift deserves an explicit note. If good commits need Node 18 and bad tip needs Node 20, pin the engine inside the bisect script with a version manager before install:

\`\`\`bash
if [[ -f .nvmrc ]]; then
  # nvm / fnm / asdf: pick one and fail into 125 if the version cannot install
  fnm use || exit 125
fi
\`\`\`

Otherwise you will skip half the range for the wrong reason, or worse, mark old commits bad because the wrong runtime crashed the runner.

## CI job that offers bisect hints

Developers should not have to reconstruct filters from a collapsed log. When a job fails, upload the exact reproduction recipe as an artifact and print a copy-paste bisect block in the job summary.

Example GitHub Actions workflow using \`actions/checkout@v4\`, \`actions/setup-node@v4\`, and \`actions/upload-artifact@v4\` only:

\`\`\`yaml
name: test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm

      - name: Install
        run: |
          corepack enable
          pnpm install --frozen-lockfile

      - name: Run unit tests
        id: vitest
        run: pnpm vitest run --reporter=default --reporter=json --outputFile=vitest-report.json

      - name: Write bisect hint
        if: failure() && steps.vitest.outcome == 'failure'
        run: |
          BAD_SHA="\${{ github.sha }}"
          GOOD_SHA="\${{ github.event.before }}"
          {
            echo "## Bisect hint"
            echo ""
            echo "Known bad: \\\`\$BAD_SHA\\\`"
            echo "Approximate good (previous push on branch): \\\`\$GOOD_SHA\\\`"
            echo ""
            echo "Local reproduction:"
            echo ""
            echo "\\\`\\\`\\\`bash"
            echo "git fetch origin"
            echo "git bisect start \$BAD_SHA \$GOOD_SHA"
            echo "git bisect run ./scripts/bisect-vitest.sh"
            echo "\\\`\\\`\\\`"
            echo ""
            echo "Set BISECT_TEST_FILE and BISECT_TEST_NAME from the failing case in vitest-report.json."
          } >> "\$GITHUB_STEP_SUMMARY"

          mkdir -p bisect-hints
          cat > bisect-hints/recipe.env <<EOF
          BAD_SHA=\$BAD_SHA
          GOOD_SHA=\$GOOD_SHA
          EOF
          cp vitest-report.json bisect-hints/ || true

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: bisect-hints-\${{ github.run_id }}
          path: bisect-hints/
\`\`\`

Notes that make this hint trustworthy:

- \`fetch-depth: 0\` so developers who download artifacts still have enough history context when they compare SHAs.
- \`github.event.before\` is a decent "good" only on push events with a linear history. On pull requests, prefer the merge base with \`main\` and document that in the summary.
- Uploading the JSON report lets someone extract the exact failing title for \`-t\` without scrolling the raw log.

For Playwright failures, emit the grep string and spec path the same way. Pair the summary with a sticky comment bot if your team lives in PR threads; the artifact remains the source of truth when comments get noisy.

Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want agents to draft bisect run scripts and flake checklists from a failing CI log; keep the executable \`bisect run\` script in your repo as the source of truth.

## Caching interaction with bisect and CI

Bisect thrash-installs dependencies across many SHAs. Locally that hurts. In CI, caches keyed only on \`lockfile\` plus \`node-version\` can hide the bug you are hunting if a poisoned cache restores \`node_modules\` that do not match the commit under test.

Guidelines:

1. Prefer \`pnpm install --frozen-lockfile\` at each midpoint; do not reuse a dirty \`node_modules\` from the previous checkout without deleting it when the lockfile changes.
2. In automated bisect scripts, wipe install outputs when \`pnpm-lock.yaml\` (or \`yarn.lock\`) differs from the previous midpoint.
3. In CI, scope caches tightly and never restore a cache built on a different commit's generated Prisma/client artifacts without regenerating.

| Cache ingredient | Safe for normal CI? | Safe across bisect midpoints? |
| --- | --- | --- |
| Lockfile hash | Yes | Yes, if you reinstall when the hash changes |
| \`node_modules\` tarball from another SHA | Risky | No; delete between checkouts when lockfile drifts |
| Playwright browser cache | Yes | Yes, browsers are versioned separately |
| Build output (\`dist/\`) | Sometimes | No; rebuild per midpoint |
| Test result cache / impact analysis | Yes for PR CI | Disable during bisect; you need the named test to run |

Test impact analysis and caching strategies speed PR feedback by skipping unaffected tests. During bisect you want the opposite: always run the known failing case. If your pipeline uses impact-based selection, bypass it in the bisect script and in any "reproduce locally" docs you emit from CI. For designing CI caches that stay correct under partial test selection, see the [CI test impact caching strategy](/blog/ci-test-impact-caching-strategy).

A simple midpoint hygiene block:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# Call at the top of every bisect run script
rm -rf dist coverage .vite
if [[ -f .bisect-lockhash ]]; then
  prev=$(cat .bisect-lockhash)
  curr=$(git hash-object pnpm-lock.yaml 2>/dev/null || echo none)
  if [[ "\$prev" != "\$curr" ]]; then
    rm -rf node_modules
  fi
fi
git hash-object pnpm-lock.yaml > .bisect-lockhash 2>/dev/null || echo none > .bisect-lockhash
\`\`\`

Add \`.bisect-lockhash\` to your local ignore rules if it shows up in \`git status\` mid-search; a dirty tree during bisect is its own failure mode.

## Failure story: when bisect blamed the wrong commit

On a payments service, CI went red on \`InvoiceService formats totals for partial refunds\`. A developer ran a fast manual bisect with Vitest \`-t\` against a range of about 40 commits. Git pointed at a commit titled "refactor: extract Money helpers". The diff only moved functions between files. Shipping a revert felt absurd, so they paused.

Three problems stacked:

1. **Unclean tree.** A local \`.env\` override and an untracked \`vitest.setup.local.ts\` stayed on disk across checkouts. Midpoints inherited a stubbed clock that was only meant for exploratory debugging. Some "good" commits failed because the stub disagreed with historical assertions.
2. **Flaky time dependency.** Even after cleaning the tree, the test called \`Date.now()\` without freezing time. Afternoon runs crossed a billing-day boundary and failed on commits that were fine in the morning.
3. **Wrong skip discipline.** Two midpoints failed to compile after the Money refactor landed halfway through a stacked PR series. Those were marked bad instead of skipped (exit 125). That pulled the first-bad pointer toward the refactor commit that merely happened to sit next to the real break.

After \`git bisect reset\`, a clean clone, \`pnpm install\` inside a \`bisect run\` script, \`--retries\` disabled, and a frozen clock in the test itself, the search landed eight commits later: a one-line change to tax-region lookup that returned \`undefined\` for a fixture country code. The Money refactor was innocent.

Takeaways we still use:

- Start bisect from a fresh worktree (\`git worktree add /tmp/bisect-invoice main\`) so untracked local tooling cannot leak.
- Treat compile failures as 125, never as 1.
- Re-run the final bad commit and its parent twice each before you write the postmortem.
- If the blamed diff cannot explain the assertion, assume your oracle is wrong, not that Git math failed.

That incident is why this guide stresses filters, exit codes, and flake control as one workflow. Bisect is only as honest as the command you run at each SHA.

## Putting the workflow together

A durable team habit looks like this:

1. CI fails and uploads a bisect hint artifact with bad SHA, approximate good SHA, and failing title.
2. You create a clean worktree and export \`BISECT_TEST_FILE\` / \`BISECT_TEST_NAME\` (or Playwright \`BISECT_SPEC\` / \`BISECT_GREP\`).
3. You run \`git bisect run ./scripts/bisect-vitest.sh\` with install/build failures mapped to 125.
4. You verify parent vs bad commit manually.
5. You open a fix PR that includes a regression test pinned to the same filter string your bisect used.

Document the filter flags in CONTRIBUTING so nobody "helps" by swapping Vitest \`-t\` for Playwright \`--grep\` on the wrong runner. Small confusion there wastes real time because the command either runs too many tests or silently matches nothing and teaches bisect the wrong lesson if you mishandle empty selection.

## Frequently Asked Questions

### How do I bisect when the failure only happens in CI?

Match CI's Node version, install flags, and environment variables locally, or run the bisect script inside the same container image the job uses. Download the bisect-hints artifact for SHAs and the failing title, then use a clean worktree with \`actions/checkout@v4\`-equivalent full history (\`fetch-depth: 0\` locally via a full fetch). If the bug is Linux-only, bisect on a remote runner or a local VM rather than forcing a macOS reproduction that never fails.

### What is the difference between Vitest \`-t\` and Playwright \`--grep\` during bisect?

Vitest selects tests with \`-t\` / \`--testNamePattern\`. Playwright selects tests with \`--grep\` / \`-g\`. They are not interchangeable. Using the wrong flag either errors, ignores the filter, or runs a broader set than you intended, which slows bisect and can change the exit code for unrelated failures. Keep dedicated \`package.json\` scripts per runner so the flags stay correct, and paste those scripts into the bisect hint artifact so nobody improvises the filter on a bad day.

### Why did \`git bisect run\` abort instead of marking a commit bad?

Exit codes 128–255 abort the whole bisect. That often comes from \`set -e\` plus an unexpected command (\`pnpm\` missing, \`cd\` into a missing directory, unbound variable with \`set -u\`) rather than from the test runner. Remap environmental failures to 125, let the test runner's exit 1 mean bad, and keep scripts boring. Run the script manually on a known bad SHA and \`echo $?\` before handing it to \`bisect run\`.

### Can I trust a bisect result when some commits were skipped?

You can trust it when you re-verify the final bad commit and its parent, and when the remaining candidate set is a single commit. Heavy skipping can leave a range of possible first-bad commits; Git will say so. Narrow the good/bad anchors, improve the build so fewer midpoints need 125, or manually test the boundary commits in the reported range. Skips that hide the real regression usually show up when parent-of-bad still fails after you think you are done.
`,
};
