import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Codecov vs Coveralls 2026: Coverage Gates Compared",
  description: "Codecov vs Coveralls in 2026 — feature comparison, PR coverage gate setup in CI, pricing, monorepo support, and a clear verdict on which to pick.",
  date: "2026-06-15",
  category: "Comparison",
  content: `# Codecov vs Coveralls 2026: Coverage Gates Compared

Codecov and Coveralls are the two dominant hosted code-coverage services. Both ingest a coverage report (usually \`lcov\`, Cobertura, or JaCoCo XML) from your CI run, store it, post a coverage summary on every pull request, and can **fail the PR check** when coverage drops. The practical difference: **Codecov** has the richer UI, deeper monorepo/component support, sophisticated status checks, and a generous free tier for public repos — but its pricing and the 2021 token-handling incident make some teams cautious. **Coveralls** is simpler, cheaper for small private teams, and easier to reason about, with fewer bells and whistles. For most new projects in 2026, Codecov is the default; Coveralls wins on simplicity and price for small private repos. This guide compares them and shows the PR coverage-gate setup for each.

## What a coverage service does

Your test runner already produces a coverage file — JaCoCo's \`jacoco.xml\`, nyc's \`lcov.info\`, \`coverage.py\`'s XML, Go's \`coverage.out\`. A coverage *service* adds three things a raw report can't:

1. **Trend tracking** — coverage over time, per branch, per commit, so you can see regressions.
2. **PR status checks** — a green/red check on the pull request comparing the PR's coverage against the base branch.
3. **Annotations and comments** — a comment (and often inline line annotations) showing exactly which new lines are uncovered.

The PR status check is the part that matters most: it's what stops an untested change from merging. Both tools do this; they differ in how configurable and how clear the check is.

## Feature comparison

| Feature | Codecov | Coveralls |
|---|---|---|
| Free tier (public repos) | Yes, unlimited public repos | Yes, free for open source |
| Free tier (private repos) | Limited free tier; paid per seat above it | Free for a single private repo, then paid |
| PR comment | Yes, detailed with diff coverage | Yes, simpler summary |
| Inline PR annotations | Yes | Limited |
| Status checks | Highly configurable (\`project\`, \`patch\`, \`changes\`) | Configurable (repo + PR thresholds) |
| Monorepo / components | Strong (flags + components) | Basic (parallel builds) |
| Report formats | lcov, Cobertura, JaCoCo, clover, many more | lcov, Cobertura, and common formats |
| Carryforward flags | Yes (reuse coverage for unchanged components) | No direct equivalent |
| Self-hosted option | Yes (Codecov Self-Hosted) | Enterprise option |
| Config file | \`codecov.yml\` | \`.coveralls.yml\` + CI flags |
| UI depth | Rich dashboards, sunburst, file tree | Functional, lighter |
| Setup complexity | Moderate (token + uploader + yml) | Low |

The two columns that drive most decisions are **monorepo support** (Codecov's flags/components are genuinely better) and **private-repo pricing** (Coveralls is friendlier for a single small private repo).

## Diff coverage vs project coverage — the key concept

Both tools distinguish two coverage numbers, and understanding them is essential to a sane gate:

- **Project coverage** — total coverage of the whole codebase. A gate here ("must stay above 80%") punishes a PR for the sins of legacy code it didn't touch.
- **Patch / diff coverage** — coverage of *only the lines this PR changed or added*. A gate here ("new code must be 80% covered") is far more useful: it asks contributors to test what they write without forcing them to backfill old debt.

The best practice in 2026 is a **strict patch gate plus a lenient project gate**: require new lines to be well-covered, but only block the project number from dropping (rather than demanding a high absolute floor). Codecov calls these \`patch\` and \`project\` status checks; Coveralls expresses them as PR vs repo thresholds. For the underlying metric definitions, see our [code coverage types explainer](/blog).

## Codecov: PR coverage gate setup

First, generate a coverage report in CI (here with nyc producing \`lcov\`), then upload with Codecov's GitHub Action:

\`\`\`yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx nyc --reporter=lcov npm test
      - name: Upload to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          token: \${{ secrets.CODECOV_TOKEN }}
\`\`\`

Always set the \`token\` for both public and private repos in 2026 — tokenless uploads from forks are unreliable and the token authenticates the upload. Then configure the gate in \`codecov.yml\` at the repo root:

\`\`\`yaml
coverage:
  status:
    project:
      default:
        target: auto        # don't drop below the base branch
        threshold: 1%        # allow a 1% wobble
    patch:
      default:
        target: 80%          # new/changed lines must hit 80%
comment:
  layout: "reach, diff, files"
  require_changes: true
\`\`\`

With \`project.target: auto\`, the project check fails only if coverage drops more than 1% versus the base. The \`patch.target: 80%\` check fails if the PR's changed lines are under 80% covered. Mark both as required status checks in your branch protection rules and an under-tested PR cannot merge.

## Coveralls: PR coverage gate setup

Coveralls uses its own action (or the universal coverage reporter). Upload the same \`lcov\`:

\`\`\`yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx nyc --reporter=lcov npm test
      - name: Upload to Coveralls
        uses: coverallsapp/github-action@v2
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          path-to-lcov: ./coverage/lcov.info
\`\`\`

Configure the thresholds in \`.coveralls.yml\` (or the repo settings UI):

\`\`\`yaml
coverage_threshold: 80          # repo-wide floor
pull_request_threshold: -0.5    # fail if PR drops coverage > 0.5%
\`\`\`

Coveralls posts a PR status reflecting these. As with Codecov, add the Coveralls check to branch protection so it's required. Coveralls' configuration surface is smaller, which is exactly its appeal — fewer knobs, less to misconfigure.

## Monorepo handling

This is where the tools diverge most. In a monorepo you run multiple test suites (per package/service) and want either a combined number or per-component gates.

- **Codecov** uses **flags** to tag uploads (\`flags: backend\`, \`flags: frontend\`) and **components** to define logical groupings with their own status checks. Its **carryforward** feature reuses a component's last known coverage when that component wasn't touched in a PR — so you don't have to re-run every suite on every change. This is a real advantage for large monorepos.
- **Coveralls** supports **parallel builds**: each job uploads with a shared build number and a \`parallel: true\` flag, then a final job sends \`parallel-finished: true\` to merge them. It works, but there's no per-component gating or carryforward equivalent.

If you run a serious monorepo with independent components, Codecov's model saves CI time and gives granular gates. If your monorepo is small or you just want one merged number, Coveralls' parallel builds are simpler.

For language-specific coverage tooling that feeds these services, see the [JaCoCo guide](/blog) for Java and the [Istanbul/nyc guide](/blog) for JavaScript.

## Pricing model

Both are free for open source. The difference is private repos:

- **Codecov** — free tier for private repos with limits, then per-active-developer pricing. Self-hosted is available for teams that can't send coverage off-site.
- **Coveralls** — free for a single private repo, then tiered plans that tend to be cheaper for small teams.

Pricing changes, so confirm current numbers on each vendor's site before committing. The structural point holds: Coveralls is usually the cheaper choice for one or two small private repos; Codecov's value grows with team size and monorepo complexity.

## When to pick Codecov

- You run a **monorepo** with multiple components and want per-component gates plus carryforward.
- You want **rich dashboards**, sunburst graphs, and detailed inline PR annotations.
- You need **fine-grained status checks** (separate project vs patch targets, custom flags).
- You may need a **self-hosted** deployment for compliance.
- You have a growing team where the richer UI pays for itself.

## When to pick Coveralls

- You have **one or a few small private repos** and want the cheapest sane option.
- You value **simplicity** — fewer config knobs, a clear PR summary, minimal setup.
- Your project is a **single package**, not a sprawling monorepo.
- You don't need carryforward or per-component gating.

## Verdict

For most teams starting fresh in 2026, **Codecov is the default pick** — its patch/project status checks, monorepo flags and components, carryforward, and PR annotations make it the more capable gate, and the public-repo free tier removes cost from the equation for open source. Choose **Coveralls** when you have a small private repo or two and want the simplest, cheapest setup with a clean PR summary and no monorepo ceremony. Both will reliably stop under-tested code from merging once you wire the status check into branch protection — that step, not the vendor choice, is what actually enforces quality. If you're automating coverage workflows with AI coding agents, browse the [CI/CD and testing skills](/skills) directory.

## Frequently Asked Questions

### What is the difference between Codecov and Coveralls?

Both are hosted code-coverage services that ingest a coverage report from CI, track trends, and post a pass/fail status on pull requests. Codecov is more feature-rich — better monorepo support via flags and components, carryforward, configurable patch/project checks, and richer dashboards. Coveralls is simpler and cheaper for small private repos, with fewer configuration options and a lighter UI.

### Should I gate on project coverage or patch coverage?

Gate primarily on **patch (diff) coverage** — the coverage of lines the PR changed — because it asks contributors to test new code without forcing them to backfill legacy debt. Keep a lenient project-coverage check (e.g. "don't drop more than 1%") to catch overall regressions. A strict project floor on a legacy codebase mostly produces frustration and gaming.

### Which coverage report format do Codecov and Coveralls accept?

Both accept the common formats: \`lcov\` (JavaScript/most languages), Cobertura XML, and JaCoCo XML for Java. Codecov supports a longer list including clover and many language-specific formats. The simplest path is to have your test runner emit \`lcov\` or Cobertura and upload that file with each tool's official GitHub Action.

### How do I make a PR fail when coverage drops?

Upload your coverage report in CI, configure a status-check threshold (Codecov's \`patch\`/\`project\` targets in \`codecov.yml\`, or Coveralls' PR threshold in \`.coveralls.yml\`), then mark that status check as **required** in your branch protection rules. The required check is what actually blocks the merge — without branch protection, the service only comments and the PR can still merge.

### Is Codecov or Coveralls better for a monorepo?

Codecov is better for serious monorepos. Its flags tag uploads per package, components define groupings with their own gates, and carryforward reuses coverage for components a PR didn't touch — saving CI time. Coveralls supports parallel builds that merge into one number but has no per-component gating or carryforward, making it better suited to single-package projects.

### Are Codecov and Coveralls free for open source?

Yes, both offer free tiers for public/open-source repositories. The cost difference appears with private repos: Coveralls is typically cheaper for one or two small private repos, while Codecov's per-developer pricing scales with team size and offers a limited private free tier. Always confirm current pricing on each vendor's website, as plans change.
`,
};
