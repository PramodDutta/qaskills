import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chromatic TurboSnap for Storybook: Complete Guide 2026',
  description:
    'Master Chromatic TurboSnap for Storybook in 2026: changed-files-only snapshots, config, CI setup, baselines, and how to cut visual testing costs by up to 80%.',
  date: '2026-06-02',
  category: 'Guide',
  content: `
# Chromatic TurboSnap for Storybook: Complete Guide 2026

Visual regression testing with Chromatic and Storybook is one of the most reliable ways to catch UI bugs before they ship, but it has one nagging problem: cost. Every push snapshots every story across every browser and viewport you configure. On a design system with 800 stories, that is thousands of snapshots per build, and on a busy team that runs dozens of builds a day the bill climbs fast. The snapshot count is also the slowest part of your CI pipeline, because each snapshot is a real browser render that has to be captured and diffed.

TurboSnap is Chromatic's answer to that problem. Instead of snapshotting every story on every build, it uses your bundler's dependency graph to figure out which stories were actually affected by the files you changed, and snapshots only those. A one-line CSS tweak to a single Button component might touch 6 stories instead of 800, and you pay for 6 snapshots instead of 800. The diffs you care about still get caught, and the ones that physically cannot have changed get skipped.

This guide covers TurboSnap end to end for 2026: how the dependency tracing actually works, how to turn it on, the exact configuration knobs that matter, the CI gotchas that silently disable it (full rebuilds, missing git history, untraced files), how baselines and the "TurboSnap full" fallback behave, and a realistic cost model so you can predict the savings before you flip the switch. By the end you will be able to enable TurboSnap on an existing Storybook + Chromatic setup with confidence, debug the common failure modes, and explain the cost story to your team. For more on the broader practice, see our [visual regression testing guide](/blog) and the [QA skills directory](/skills).

## What TurboSnap Actually Does

A normal Chromatic build does a "full" run: it builds your Storybook, uploads the static bundle, and then renders and snapshots every story in every configured browser and viewport combination. That is correct but wasteful. If you only edited the \`Tooltip\` component, the \`DataTable\` stories cannot possibly have changed, yet they still get rendered and diffed.

TurboSnap changes the model from "snapshot everything" to "snapshot what could have changed." It does this in three steps:

1. **Git diff.** Chromatic asks git which files changed between the current commit and the last build it has a baseline for (the "ancestor" build).
2. **Dependency tracing.** Using a stats file emitted by your bundler (Webpack or Vite), Chromatic walks the module dependency graph to find every story that transitively imports a changed file.
3. **Targeted snapshot.** Only those affected stories are rendered and diffed. Everything else inherits its previous baseline unchanged and is marked "TurboSnapped."

The key insight is that the dependency graph is the source of truth, not heuristics. If \`Button.tsx\` changes and \`Modal.stories.tsx\` imports \`Modal.tsx\` which imports \`Button.tsx\`, then the Modal stories are correctly flagged as affected. Nothing is missed as long as the import is real and traceable.

## Enabling TurboSnap

The fastest way to enable TurboSnap in 2026 is the \`onlyChanged\` flag. You no longer need to maintain explicit \`--externals\` or \`--untraced\` lists for the common case; Chromatic auto-detects your bundler stats. Add the flag to your Chromatic command:

\`\`\`bash
npx chromatic --only-changed
\`\`\`

Or, more commonly, configure it in \`chromatic.config.json\` at the repo root so every invocation picks it up:

\`\`\`json
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "projectId": "Project:64f2a1b9c0d3e40012345678",
  "onlyChanged": true,
  "externals": ["public/**", "tailwind.config.ts"],
  "untraced": ["**/*.stories.mdx"]
}
\`\`\`

For Storybook 8 and 9 with the Vite builder, the stats file Chromatic needs is produced automatically when TurboSnap is on. For the Webpack 5 builder, Chromatic enables the stats plugin for you. If you are on a custom build, you can emit the stats file yourself and point Chromatic at it:

\`\`\`bash
npx chromatic --only-changed --stats-file=./storybook-static/preview-stats.json
\`\`\`

A few rules to internalize before you turn it on:

- TurboSnap requires git history. Your CI must do a full or sufficiently deep clone, not a shallow \`--depth=1\` checkout, or Chromatic cannot compute the diff against the ancestor build.
- The first build after enabling TurboSnap is always a full build, because there is no TurboSnap-eligible ancestor yet. Savings start on the second build.
- TurboSnap only applies to non-baseline branches by default. The build on your main branch that establishes baselines is typically a full build.

## How Dependency Tracing Works

The dependency trace is the heart of TurboSnap, so it is worth understanding exactly what gets traced and what does not. Chromatic reads the bundler stats file, which is a JSON description of every module and its dependencies. It then maps changed files to modules, and modules to the stories that depend on them.

Consider this import chain:

\`\`\`typescript
// src/tokens/colors.ts  <-- you changed this file
export const colors = { primary: '#2563eb', danger: '#dc2626' };

// src/components/Button.tsx
import { colors } from '../tokens/colors';
export function Button() {
  /* uses colors.primary */
}

// src/components/Button.stories.tsx  <-- this story gets snapshotted
import { Button } from './Button';
export const Primary = { render: () => <Button>Save</Button> };
\`\`\`

Because \`Button.stories.tsx\` imports \`Button.tsx\` which imports \`colors.ts\`, editing \`colors.ts\` correctly flags the \`Primary\` story as affected. Every other story that does not transitively import \`colors.ts\` is skipped.

The problem cases are imports the bundler cannot see. These are the things that silently break tracing:

| Untraceable dependency | Why tracing misses it | Fix |
|---|---|---|
| Global CSS imported in \`preview.ts\` | Affects all stories but not via per-story imports | Add to \`externals\` so any change triggers a full build |
| Files loaded at runtime via \`fetch\` | Not in the static module graph | Mock the data or accept it is untraced |
| Dynamic \`import(\\\`./\${name}\\\`)\` with a variable | Bundler cannot resolve the path statically | Use static imports in stories |
| Tailwind config / PostCSS | Transforms output but is not imported by stories | List in \`externals\` |
| Fonts and images in \`public/\` | Referenced by URL, not imported | List in \`externals\` |

The mental model: if a change to a file could affect rendering but the file is not reachable through static \`import\` statements from your stories, you must declare it in \`externals\` so Chromatic falls back to a full build whenever it changes. Getting this list right is the single most important configuration task.

## The externals and untraced Options

\`externals\` and \`untraced\` look similar but do opposite things, and mixing them up is the most common configuration mistake.

\`externals\` is a list of glob patterns for files that are **not** part of the traced module graph but **can** affect snapshots. When any file matching an \`externals\` pattern changes, TurboSnap bails out and runs a **full build**. This is the safe default for global stylesheets, design-token JSON consumed at build time, Tailwind config, and static assets.

\`untraced\` is a list of glob patterns for files that **are** in the graph but you want TurboSnap to **ignore**. When a file matching \`untraced\` changes, it does not trigger snapshots for stories that depend on it. This is for files you are confident have no visual impact, such as test utilities, type-only files, or documentation MDX that does not render components.

\`\`\`json
{
  "onlyChanged": true,
  "externals": [
    "src/styles/global.css",
    "tailwind.config.ts",
    "postcss.config.js",
    "public/fonts/**"
  ],
  "untraced": [
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    "src/types/**"
  ]
}
\`\`\`

Rule of thumb: when in doubt, prefer \`externals\` over \`untraced\`. A wrongly externalized file costs you a full build occasionally (wasted money, never wasted coverage). A wrongly untraced file means a real visual regression slips through (missed coverage, the worst outcome). Always err toward over-snapshotting.

## CI Setup with GitHub Actions

The CI configuration is where TurboSnap most often gets accidentally disabled. The two killers are shallow clones and matrix jobs that re-run Chromatic on every shard. Here is a correct GitHub Actions workflow:

\`\`\`yaml
name: 'Chromatic'

on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          # TurboSnap needs full git history to find the ancestor build.
          # A shallow clone (the default) disables it.
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true
          exitZeroOnChanges: true
\`\`\`

The non-obvious lines:

- \`fetch-depth: 0\` is mandatory. Without it, Actions does a depth-1 clone and TurboSnap cannot compute the diff, so it silently runs full builds and you wonder why your bill never dropped.
- \`onlyChanged: true\` is the action-level equivalent of \`--only-changed\`. You can set it here or in the config file; do not set conflicting values in both.
- \`exitZeroOnChanges: true\` keeps the workflow green when visual changes are detected, so review happens in the Chromatic UI rather than blocking the pipeline. Drop it once your baselines are stable and you want changes to gate merges.

If you run Storybook builds in a separate job and pass the artifact to Chromatic, make sure the stats file is included in the uploaded artifact, or tracing will have nothing to read.

## Baselines and What "Accepted" Means

A baseline is the approved snapshot of a story that future builds are compared against. With TurboSnap, baselines behave exactly as they do in full builds, with one addition: TurboSnapped stories inherit the baseline from the ancestor build automatically.

The workflow is unchanged from a reviewer's perspective:

1. A build detects a visual change on a story.
2. A reviewer opens Chromatic and sees a side-by-side diff.
3. They click **Accept** (the new render becomes the baseline) or **Deny** (the change is rejected and the build is marked failed).
4. Once accepted, that snapshot is the new baseline for that story on that branch.

The subtlety with TurboSnap is the ancestor. Chromatic picks the most recent build on the branch (or merge-base) that has baselines, and uses its snapshots as the baseline for any story TurboSnap skips. This is why a broken git history is so damaging: if Chromatic cannot find a valid ancestor, it cannot inherit baselines and falls back to a full build. You will see this in the build log as "Found no ancestor builds" followed by a full snapshot run.

When you rebase or squash-merge, the commit SHAs change and the ancestor link can break. Chromatic handles most of this automatically in 2026 via merge-base detection, but if you see unexpected full builds after a squash merge, that is the usual cause.

## When TurboSnap Falls Back to a Full Build

TurboSnap is conservative: whenever it is not certain it can safely skip stories, it runs a full build instead. Knowing the triggers helps you predict cost and debug surprises. A full build happens when:

| Trigger | Reason | Avoidable? |
|---|---|---|
| First build on a new project | No ancestor baseline exists | No (one-time) |
| A file matching \`externals\` changed | Could affect any story | Only by not changing it |
| Storybook config files changed (\`main.ts\`, \`preview.ts\`) | Global render behavior may change | Sometimes via \`untraced\` if truly safe |
| \`package.json\` or lockfile changed | Dependency versions may alter rendering | No (this is correct) |
| Shallow clone / missing git history | Cannot compute diff | Yes — use \`fetch-depth: 0\` |
| No traceable ancestor build found | Cannot inherit baselines | Yes — fix git history / merge strategy |
| Bundler stats file missing or unreadable | Cannot trace dependencies | Yes — ensure stats emission |

Most of these are correct and desirable. A change to \`package.json\` legitimately could shift rendering (a new version of a charting library, for example), so a full build is the safe call. The ones to actively prevent are the accidental triggers: shallow clones, missing stats files, and broken ancestors. Those give you full-build cost with no corresponding benefit.

## Measuring the Cost Savings

Chromatic bills primarily on snapshots. A snapshot is one story rendered in one browser at one viewport. So your monthly snapshot count is roughly:

\`\`\`
snapshots = stories × browsers × viewports × builds_per_month
\`\`\`

Take a mid-size design system: 600 stories, 3 browsers, 2 viewports, 40 builds per month.

\`\`\`
Full builds:     600 × 3 × 2 × 40 = 144,000 snapshots / month
\`\`\`

Now assume an average PR touches files that affect 5% of stories (a realistic number for a mature component library where most PRs are scoped):

\`\`\`
With TurboSnap:  600 × 0.05 × 3 × 2 × 40 = 7,200 snapshots / month
                 + ~10% full-build days for config/dep changes
                 ≈ 7,200 + 14,400 = 21,600 snapshots / month
\`\`\`

That is roughly an 85% reduction even after accounting for occasional full builds. Here is how the numbers scale by affected-story percentage:

| Avg % of stories affected per build | Snapshots/month (TurboSnap) | Reduction vs full |
|---|---|---|
| 2% | ~14,000 | ~90% |
| 5% | ~22,000 | ~85% |
| 15% | ~36,000 | ~75% |
| 30% | ~58,000 | ~60% |
| 100% (TurboSnap off) | 144,000 | 0% |

The lever you control is the "affected" percentage, and it is driven by your import hygiene. A monorepo where one shared \`theme.ts\` is imported by every component will see high affected percentages, because any theme change touches everything. Splitting tokens into granular files (colors, spacing, typography) so a spacing change does not flag color-only stories is the highest-leverage optimization. The second lever is build frequency: TurboSnap saves the most when you build often (every push) rather than only on merge.

## Debugging TurboSnap

When TurboSnap is not behaving, the build log is your primary tool. Run Chromatic with \`--debug\` to see the tracing decisions:

\`\`\`bash
npx chromatic --only-changed --debug
\`\`\`

The log prints which files changed, which were traced, which were treated as externals, and how many stories were affected. The three diagnostic questions:

1. **Did it run full when you expected TurboSnap?** Look for "Found no ancestor builds" (git history problem) or "Found changes to externally defined files" (something in \`externals\` changed). The latter is often a noisy file like a lockfile updated by Dependabot.
2. **Did it skip a story that should have been tested?** This is the dangerous case. It almost always means an untraceable dependency: a global CSS import, a runtime fetch, or a dynamic import. Move the offending file into \`externals\`.
3. **Are too many stories being snapshotted?** A shared file high in the dependency graph is the culprit. Use the trace output to find the over-imported module and consider splitting it.

A useful CI safety net is to schedule a nightly full build (TurboSnap off) on the main branch. This catches any regression that an untraced dependency let slip through during the day, giving you the cost savings of TurboSnap on PRs and the completeness of full builds once daily.

## TurboSnap with Monorepos

Monorepos add wrinkles because a single Storybook may aggregate stories from many packages, and changes in one package should not snapshot unrelated packages. TurboSnap handles this correctly as long as the dependency graph is accurate, which means your bundler must actually resolve cross-package imports rather than treating them as externals.

Two practical tips for monorepos:

- Make sure workspace packages are built or linked so the bundler can trace into them. If \`@acme/ui\` is consumed as a pre-built \`dist\` that Chromatic treats as a black box, a change to its source will not trace to consumer stories. Either build before snapshotting or configure source resolution.
- Use path-based \`externals\` to draw boundaries. If \`packages/legacy/**\` is frozen and never visually tested, you can exclude it cleanly.

Combined with affected-package detection from tools like Turborepo or Nx, you can run Chromatic only on the packages a PR touches, then let TurboSnap further narrow to affected stories within those packages — a two-level filter that drives snapshot counts very low on large repos.

## Frequently Asked Questions

### Does TurboSnap reduce visual test coverage?

No, when configured correctly. TurboSnap only skips stories that provably cannot have changed based on the static dependency graph. The risk is untraced dependencies (global CSS, runtime fetches) causing a real change to be missed — which is why you declare those in \`externals\` to force a full build whenever they change. A nightly full build adds a safety net.

### Why is TurboSnap still running full builds on every push?

The most common cause is a shallow git clone in CI. TurboSnap needs full history (\`fetch-depth: 0\` in GitHub Actions) to find the ancestor build and compute the diff. Other causes are changes to \`externals\` files, lockfile updates, or a missing bundler stats file. Run with \`--debug\` to see the exact reason in the build log.

### How much does TurboSnap actually save?

For a mature component library where most PRs touch 5% of stories or fewer, expect 75-90% fewer snapshots, even after accounting for occasional full builds triggered by config or dependency changes. The savings depend heavily on import hygiene: granular token files and well-scoped imports keep the affected-story percentage low.

### Do I still need to review every change?

Yes. TurboSnap changes which stories get snapshotted, not the review workflow. Any story that does get snapshotted and shows a diff still requires a human to Accept or Deny in the Chromatic UI. TurboSnap simply removes the noise of reviewing stories that were never going to change.

### Does TurboSnap work with Vite and Storybook 9?

Yes. With the Storybook Vite builder on versions 8 and 9, Chromatic emits and reads the required stats file automatically when \`onlyChanged\` is enabled. The Webpack 5 builder is also fully supported via an auto-injected stats plugin. You only need to pass a manual \`--stats-file\` for custom or non-standard build setups.

### What is the difference between externals and untraced?

\`externals\` lists files outside the module graph that can affect snapshots — changing one triggers a full build (safe). \`untraced\` lists files inside the graph that you want TurboSnap to ignore — changing one does not trigger snapshots for dependent stories (risky). Prefer \`externals\` when unsure, because over-snapshotting wastes money while under-snapshotting misses bugs.

### Can I use TurboSnap on the main branch?

By default TurboSnap targets non-baseline branches, and the main branch usually runs full builds to establish reliable baselines. You can enable it on main, but many teams keep main on full builds (often nightly) as a completeness safety net and reserve TurboSnap for PR branches where the cost and speed savings matter most.

### How does TurboSnap handle a squash or rebase merge?

Squash and rebase merges rewrite commit SHAs, which can break the ancestor link TurboSnap relies on. Chromatic uses merge-base detection in 2026 to recover automatically in most cases. If you see unexpected full builds right after a squash merge, the broken ancestor is the usual cause and it self-corrects on the next build with a valid baseline.

## Conclusion

TurboSnap turns Chromatic from a thorough-but-expensive visual testing tool into a thorough-and-affordable one. By tracing your bundler's dependency graph and snapshotting only the stories a change could actually affect, it routinely cuts snapshot counts by 75-90% without sacrificing coverage — provided you handle untraceable dependencies with a correct \`externals\` list and give CI the full git history it needs. The setup is a one-line flag plus a config file; the ongoing work is import hygiene and watching the debug log when builds behave unexpectedly.

Start by enabling \`onlyChanged\`, fixing your CI clone depth, and declaring your global stylesheets and config files as \`externals\`. Add a nightly full build as a safety net, then measure your snapshot count over two weeks and tune the affected-story percentage by splitting over-imported shared files. The payoff is faster pipelines and a smaller bill with the same confidence in your UI.

Ready to level up your visual testing practice? Browse the [QA skills directory](/skills) for ready-to-use Storybook and Chromatic skills your AI coding agent can apply directly, compare visual testing tools on our [comparison pages](/compare), and read more deep-dive guides on the [QASkills blog](/blog).
`,
};
