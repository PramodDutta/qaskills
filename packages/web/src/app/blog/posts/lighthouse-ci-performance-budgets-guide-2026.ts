import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Lighthouse CI Performance Budgets Guide (2026)",
  description: "Automate performance budgets in CI with Lighthouse CI — install, configure assertions and budgets, fail the build on regressions, and track Core Web Vitals over time.",
  date: "2026-06-15",
  category: "Performance",
  content: `# Lighthouse CI Performance Budgets Guide (2026)

Lighthouse CI (\`@lhci/cli\`) is the official tool for running Google Lighthouse automatically in your pipeline so a performance regression fails the build instead of reaching users. **A performance budget is a threshold** — a maximum LCP, a minimum performance score, a cap on JavaScript bytes — and Lighthouse CI's job is to run Lighthouse on every commit, compare the results against those budgets, and exit non-zero when one is breached. You define budgets either as **assertions** in \`lighthouserc.js\` (audit-level, e.g. "performance score must be ≥ 0.9") or as a **budget.json** resource budget (e.g. "total scripts ≤ 300 KB"). This guide covers install, configuration, both assertion styles, CI wiring, result storage, and the errors people actually hit.

Lighthouse and Lighthouse CI evolve their audits and defaults across versions, so always confirm the current audit IDs and option names against the version you install before copying any config verbatim.

## What Lighthouse CI actually does

The \`lhci autorun\` command runs three phases in sequence:

1. **collect** — starts Lighthouse against your URLs (optionally booting a static server first), runs it N times, and saves the raw reports.
2. **assert** — checks the collected results against your budgets/assertions and sets the exit code (non-zero if any fails).
3. **upload** — sends reports somewhere (temporary public storage, your own LHCI server, or filesystem) so you can view and diff them.

That \`assert\` step is the gate. Everything else exists to feed it reliable numbers and to preserve the results for humans to inspect.

## Install and first run

Lighthouse CI runs on Node and needs a Chrome/Chromium available (CI images like GitHub's \`ubuntu-latest\` ship one; otherwise install it).

\`\`\`bash
# install as a dev dependency
npm install --save-dev @lhci/cli

# one-off run against a URL (uses sensible defaults)
npx lhci autorun --collect.url=https://example.com
\`\`\`

For a real project you put configuration in a \`lighthouserc.js\` (or \`.json\`) file at the repo root so \`lhci autorun\` picks it up automatically.

## Configuring collection

The \`collect\` block tells Lighthouse CI *what* to test and *how many times*. Running multiple times and taking the median is important — a single Lighthouse run is noisy, and lab metrics vary run to run.

\`\`\`javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      // either point at running URLs...
      url: ['http://localhost:3000/', 'http://localhost:3000/pricing'],
      // ...or have LHCI boot a static server for you:
      // staticDistDir: './dist',
      numberOfRuns: 3, // median of 3 reduces noise
      settings: {
        preset: 'desktop', // or omit for the default mobile emulation
      },
    },
    assert: {
      /* budgets go here — see below */
    },
    upload: {
      target: 'temporary-public-storage', // free, shareable report URLs
    },
  },
};
\`\`\`

\`numberOfRuns: 3\` (or 5) is the single most effective thing you can do to make the gate stable. Lighthouse CI automatically uses the **median** run for assertions, which damps the run-to-run variance that otherwise causes false failures.

## Style 1: assertions (audit-level budgets)

Assertions are the most flexible way to set budgets. You assert on **audit IDs** — the same audits Lighthouse reports — and choose a comparison. The shortcut presets \`lighthouse:recommended\` and \`lighthouse:no-pwa\` give you a strict baseline you then override.

\`\`\`javascript
// inside ci.assert
assert: {
  preset: 'lighthouse:recommended', // strict baseline
  assertions: {
    // category scores (0–1)
    'categories:performance': ['error', { minScore: 0.9 }],
    'categories:accessibility': ['error', { minScore: 0.9 }],
    // Core Web Vitals lab metrics (milliseconds / unitless)
    'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
    'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
    'total-blocking-time': ['error', { maxNumericValue: 200 }],
    // downgrade noisy audits to warnings instead of failing the build
    'unused-javascript': 'warn',
    'uses-responsive-images': 'off',
  },
},
\`\`\`

Three things to know:

- The **level** is \`'error'\` (fails the build), \`'warn'\` (prints but passes), or \`'off'\` (ignored).
- \`minScore\` is for the 0–1 category scores; \`maxNumericValue\` is for raw metric values (LCP in ms, CLS unitless, TBT in ms).
- Starting from \`preset: 'lighthouse:recommended'\` and selectively downgrading the audits you cannot yet pass is the realistic path — the recommended preset is intentionally strict.

Note that the lab CLS and TBT here are *proxies* for field metrics. Lighthouse measures **TBT** in the lab as a stand-in for **INP** (the Core Web Vital that replaced FID), because true INP requires real user interaction. Treat a green lab run as necessary but not sufficient — confirm field data separately. For broader context on interpreting these numbers, see our [performance result-reading guides](/blog).

## Style 2: budget.json (resource budgets)

The other style is a **resource budget** — limits on the *quantity* of resources (bytes and counts) per type. This is the classic "performance budget" and is great for catching bundle bloat directly.

\`\`\`json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "image", "budget": 200 },
      { "resourceType": "stylesheet", "budget": 60 },
      { "resourceType": "total", "budget": 700 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 }
    ]
  }
]
\`\`\`

Sizes are in **KB**. You wire it in via the assert config so a breach fails the build:

\`\`\`javascript
// inside ci.collect (apply the budget during collection)
collect: {
  url: ['http://localhost:3000/'],
  settings: { budgetsPath: './budget.json' },
},
\`\`\`

Resource budgets answer a different question from assertions: assertions guard *outcomes* (LCP, score), budgets guard *inputs* (how many KB of JS you shipped). Mature setups use both — budgets to stop bundles growing, assertions to guard the user-facing metrics.

## Wiring it into CI

The whole point is automation. Here is a complete GitHub Actions job that builds the app, runs Lighthouse CI, and fails the PR on a budget breach.

\`\`\`yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: \${{ secrets.LHCI_GITHUB_APP_TOKEN }}
\`\`\`

\`lhci autorun\` reads \`lighthouserc.js\`, runs collect → assert → upload, and the non-zero exit from a failed assertion fails the job automatically — no extra scripting needed. The optional \`LHCI_GITHUB_APP_TOKEN\` (from the Lighthouse CI GitHub App) posts status checks back to the PR; without it the gate still works, you just lose the inline PR annotation.

The same pattern works in GitLab CI, CircleCI, or Jenkins — build, ensure Chrome is present, run \`npx lhci autorun\`. See how this compares to other performance gates in our [CI tooling comparisons](/compare).

## Storing and viewing results over time

For one-off checks, \`temporary-public-storage\` gives you a shareable report URL per run. To track trends and diff commits, run the **LHCI Server**, which stores historical results in a database and renders dashboards.

\`\`\`javascript
// upload to your own LHCI server instead of temporary storage
upload: {
  target: 'lhci',
  serverBaseUrl: 'https://lhci.your-domain.com',
  token: process.env.LHCI_TOKEN, // build token from the server
},
\`\`\`

The server lets you see whether p-level metrics are drifting up release over release, which is the difference between a one-time gate and an actual performance practice. Tools and workflows for this live in our [skills directory](/skills).

## Common errors and how to fix them

- **\`Chrome could not be found\` / \`ChromeLauncher\` errors.** Your CI image has no browser. Use an image that ships Chrome (GitHub \`ubuntu-latest\` does) or install Chromium in a prior step. Some environments also need \`--no-sandbox\`; pass it via \`collect.settings.chromeFlags: ['--no-sandbox']\`.
- **Flaky pass/fail across runs.** Lab metrics are noisy. Raise \`numberOfRuns\` to 3 or 5 (LHCI uses the median), and prefer asserting on the more stable category score over a single jittery metric.
- **\`No URL provided\` or LHCI runs against nothing.** You forgot \`collect.url\` or \`staticDistDir\`. One must be set; if you use \`staticDistDir\`, LHCI boots its own server, so do not also start one.
- **Assertions never fail even when the site is slow.** The audit is set to \`'warn'\` or \`'off'\`, or you are not on a strict preset. Set the audit to \`'error'\`, and start from \`preset: 'lighthouse:recommended'\`.
- **Wrong budget units.** \`resourceSizes.budget\` is in KB, not bytes. A value of \`300000\` means 300 MB, not 300 KB — a budget so large it never trips.
- **\`largest-contentful-paint\` assertion always passes locally but fails in CI.** Local machines are faster than CI runners; calibrate thresholds against the CI environment, not your laptop, or use a \`preset: 'desktop'\` consistently in both.

## Recommended starting budget

If you want a sane default to copy and then tighten, start here and ratchet the thresholds down over time as you fix issues:

\`\`\`javascript
assertions: {
  'categories:performance': ['error', { minScore: 0.85 }],
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
  'total-blocking-time': ['warn', { maxNumericValue: 300 }],
  'speed-index': ['warn', { maxNumericValue: 3400 }],
},
\`\`\`

Begin with realistic thresholds you can actually pass (a gate that is always red gets disabled), then lower them each sprint. A budget that ratchets is a budget that improves the product.

## Frequently Asked Questions

### What is Lighthouse CI?

Lighthouse CI (\`@lhci/cli\`) is the official command-line tool that runs Google Lighthouse automatically in a pipeline, compares the results against budgets you define, and fails the build when a performance budget is breached. It runs three phases — collect (run Lighthouse), assert (check budgets and set the exit code), and upload (store reports) — via a single \`lhci autorun\` command. It turns Lighthouse from a manual one-off audit into an automated regression gate.

### How do I set a performance budget in Lighthouse CI?

You have two options. Use **assertions** in \`lighthouserc.js\` to guard outcomes — for example \`'categories:performance': ['error', { minScore: 0.9 }]\` or \`'largest-contentful-paint': ['error', { maxNumericValue: 2500 }]\`. Or use a **budget.json** resource budget to cap the bytes and counts of resources, such as scripts ≤ 300 KB. Mature setups use both: budgets to stop bundles growing and assertions to protect user-facing metrics.

### How do I fail a CI build on a Lighthouse regression?

Set the relevant assertions to the \`'error'\` level (not \`'warn'\` or \`'off'\`) and run \`npx lhci autorun\` in your CI job. When an \`'error'\`-level assertion is breached, Lighthouse CI exits with a non-zero code, which automatically fails the CI step — no extra scripting required. Starting from \`preset: 'lighthouse:recommended'\` gives you a strict baseline you can selectively relax.

### Why are my Lighthouse CI results flaky?

Lighthouse lab metrics are inherently noisy and vary run to run, especially on shared CI runners. The fix is to set \`numberOfRuns\` to 3 or 5 so Lighthouse CI uses the **median** run for assertions, which damps the variance. It also helps to assert on the more stable category score rather than a single jittery metric, and to calibrate thresholds against your actual CI environment rather than your faster local machine.

### Does Lighthouse CI measure Core Web Vitals?

It measures the **lab** versions of Core Web Vitals — LCP, CLS, and Total Blocking Time, where TBT acts as the lab proxy for INP (the Core Web Vital that replaced FID, which needs real user interaction to measure directly). These lab numbers are excellent for catching regressions in CI but are not the same as field data from real users. Treat a green Lighthouse CI run as necessary but confirm true Core Web Vitals from field measurements separately.

### Do I need an LHCI server to use Lighthouse CI?

No. For one-off gating you can set the upload target to \`temporary-public-storage\`, which gives a shareable report URL per run at no cost, and the assert step still fails the build correctly. You only need the self-hosted LHCI Server if you want to store historical results, view dashboards, and diff metrics across commits over time — that is what turns a single gate into an ongoing performance-tracking practice.
`,
};
