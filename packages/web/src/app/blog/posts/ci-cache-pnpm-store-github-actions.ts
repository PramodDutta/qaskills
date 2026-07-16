import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cache the pnpm Store in GitHub Actions: A Faster CI Guide',
  description: 'Learn how to cache pnpm store GitHub Actions dependencies, cut install time, preserve lockfile correctness, and diagnose cache misses in test CI.',
  date: '2026-07-16',
  category: 'Guide',
  content: `
# Cache the pnpm Store in GitHub Actions: A Faster CI Guide

A UI test job that spends four minutes downloading packages before running a six-minute Playwright suite is paying the same setup tax on every commit. Caching the pnpm store in GitHub Actions removes much of that repeated network work without caching the installed dependency tree itself. That distinction matters for QA repositories: the workflow stays reproducible from the lockfile, while repeated jobs can reuse package archives already fetched by pnpm.

This guide builds a practical cache setup, explains what the cache key protects, and shows how to prove the cache improves the test pipeline. The examples apply to API, component, and end-to-end test projects, including pnpm workspaces.

## Understand what belongs in the cache

pnpm keeps a content-addressable store of package files. A project installation links packages from that store into its dependency layout. In CI, the useful reusable layer is the store, not \`node_modules\`. Restoring the store lets \`pnpm install --frozen-lockfile\` rebuild the project-specific links while avoiding many downloads.

The lockfile remains the source of truth. A cache hit does not authorize a package that is absent from \`pnpm-lock.yaml\`, and frozen installation fails if the manifest and lockfile disagree. This gives test teams speed without turning the cache into an undeclared dependency source.

| Candidate | Cache it? | Reason for a test repository |
|---|---:|---|
| pnpm store | Yes | Reuses package content while installation still follows the lockfile |
| \`node_modules\` | Usually no | Contains project links and lifecycle results that are less portable across environments |
| \`pnpm-lock.yaml\` | No, commit it | It defines the resolved dependency graph and should be version controlled |
| Playwright browser binaries | Separate decision | They are large runtime assets with a lifecycle different from JavaScript packages |
| Test reports | No | Upload them as artifacts so results remain associated with a specific run |

The store location is not something to guess. Ask pnpm in the runner environment:

\`\`\`bash
pnpm store path
\`\`\`

That command is also useful when debugging a job. It reveals the exact directory that the cache step must save and restore.

## Start with a correct uncached test job

Before adding a cache, make the job deterministic. Pin the Node.js major version your repository supports, enable pnpm through its official setup action, install with the frozen lockfile behavior, and run the same test script developers use locally.

\`\`\`yaml
name: test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
\`\`\`

The example uses documented action inputs, but the Node and pnpm versions should match the repository's supported toolchain. If the project uses the \`packageManager\` field and Corepack instead, keep that existing policy. Do not introduce a different package-manager version only to add caching.

Run the uncached job several times and record the duration of the install step. A single run is noisy because GitHub-hosted runner network and CPU conditions vary. The comparison you care about is repeated median install time, not the fastest screenshot you can capture.

## Add setup-node caching with a lockfile-aware key

The shortest supported configuration is the cache integration in \`actions/setup-node\`. Set \`cache: 'pnpm'\`. The action uses the package manager's dependency file to create its cache key, and it does not cache \`node_modules\`.

\`\`\`yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          cache-dependency-path: pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
\`\`\`

Keep the pnpm setup step before the Node setup step so the pnpm executable is available when cache-related logic needs it. On the first run for a new lockfile, expect a miss and a normal download. After the successful job completes, later runs with the same relevant inputs can restore the cache.

The key consequence for QA work is easy to test:

| Repository change | Expected cache behavior | Test implication |
|---|---|---|
| Test spec only | Existing store can be restored | Dependency setup should be faster |
| \`pnpm-lock.yaml\` changes | Exact prior key no longer matches | New or updated packages must be fetched |
| Node version changes | Treat as a new environment | Re-measure install and native dependency behavior |
| Test command changes | Store can still be reused | Only execution behavior changes |

Changing a Playwright assertion should not invalidate several gigabytes of package content. Changing the lockfile should alter the exact key because the dependency graph has changed. This balance is the reason to use the action's supported package-manager cache rather than inventing a broad key based only on the branch name.

## Handle pnpm workspaces and multiple lockfiles deliberately

Most pnpm monorepos have one lockfile at the repository root. In that case, point \`cache-dependency-path\` to the root \`pnpm-lock.yaml\`, run installation at the root, and use filtered commands for individual QA packages.

\`\`\`yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          cache-dependency-path: pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - name: Run contract tests
        run: pnpm --filter @acme/contract-tests test
      - name: Run browser tests
        run: pnpm --filter @acme/e2e test
\`\`\`

If independent subprojects truly have separate lockfiles, provide the dependency paths supported by the action and verify every relevant lockfile contributes to invalidation. Do not point the cache at a package manifest while ignoring the resolved lockfiles. A manifest can contain a range, while the lockfile records the actual resolution used by CI.

Workspace filters also prevent a common timing mistake. Cache restoration may make installation quick, but it does not make an unnecessarily broad test command selective. Keep dependency caching, test selection, and job parallelism as separate improvements. Measure each one so a faster install is not incorrectly credited for fewer executed tests.

## Keep browser assets and reports out of the store decision

Playwright's npm package and its browser binaries are different layers. The package can benefit from the pnpm store cache. Browser downloads use their own location and compatibility rules. If you cache browser binaries, use a separately reasoned key that accounts for the Playwright version and runner platform, or install them normally with the documented Playwright command.

\`\`\`bash
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test
\`\`\`

Likewise, JUnit XML, HTML reports, screenshots, videos, and traces belong to the current run. Publish them as artifacts even when a test fails. They should never reappear from a dependency cache and be mistaken for new evidence.

If long browser jobs pile up after every force-push, caching addresses only setup time. Pair it with a concurrency policy from [canceling stale E2E runs on a new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit). If the problem is interpreting unstable results rather than runtime, use a consistent report pipeline such as [GitLab CI JUnit reporting for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests), adapted to the CI system you operate.

## Prove the cache works without weakening installation

A healthy verification sequence uses two runs from the same lockfile, then one run after a controlled dependency update. Keep \`--frozen-lockfile\` enabled throughout. Removing correctness checks to make the cached path pass defeats the purpose.

Add lightweight diagnostics temporarily:

\`\`\`yaml
      - name: Show package-manager context
        run: |
          node --version
          pnpm --version
          pnpm store path
      - run: pnpm install --frozen-lockfile
\`\`\`

Inspect the setup action's log for cache restoration information and compare install durations. Then update a development dependency through the normal repository process, commit the changed lockfile, and confirm the job performs the needed fetches. Finally, rerun that commit and check that reuse returns.

For stronger evidence, collect these values for at least five ordinary pull requests:

| Signal | Healthy result | Warning sign |
|---|---|---|
| Median install duration | Meaningfully lower after warm-up | No change across repeated identical lockfiles |
| Frozen install result | Always succeeds or reports a real mismatch | Workflow removes the flag to hide failure |
| Test count | Same before and after cache | Faster run caused by skipped suites |
| Report freshness | Artifacts belong to current run | Old reports appear after cache restoration |

Caching should change time spent acquiring package content. It should not change which tests execute, which versions resolve, or whether failures block the job.

## Diagnose misses and misleading wins

When every run misses, first compare the environment and dependency-path inputs. A changed lockfile, runner operating system, package-manager version, or cache scope can legitimately prevent an exact reuse. Confirm the lockfile exists at the path evaluated by the workflow. In a monorepo, remember that GitHub Actions starts steps at the repository root unless a working directory says otherwise.

When the log reports a restore but installation stays slow, profile the install rather than declaring the cache broken. Lifecycle scripts, native builds, post-install downloads, and creation of project links still take time. The store cache reduces fetch work, not every operation performed by \`pnpm install\`.

When a workflow becomes flaky only after cache introduction, compare the cached and uncached paths with the same committed lockfile. Do not add a vague timestamp key as a permanent fix. That merely disables reuse. Find whether a package runs an environment-sensitive install script, whether a separately cached runtime asset is stale, or whether the job previously depended on undeclared state.

A useful emergency check is to change the cache configuration in a branch and run one clean installation, without changing the test command. Once the cause is understood, restore a stable, lockfile-derived policy.

## Frequently Asked Questions

### Should I cache node_modules for pnpm in GitHub Actions?

Usually, cache the pnpm store instead. The store contains reusable package content, while \`node_modules\` contains links and installation results shaped by the project and environment. Rebuilding those links from a committed lockfile is a useful correctness step. If a team chooses to cache installed dependencies, it needs stronger invalidation for operating system, runtime, lockfile, and install behavior, plus evidence that the extra complexity produces a real gain.

### Does a pnpm cache hit mean pnpm install can be skipped?

No. Run \`pnpm install --frozen-lockfile\` on both hit and miss paths. The cache supplies reusable package content, but installation validates the lockfile and constructs the dependency layout required by the job. Skipping installation can leave the workspace without links or can reuse state that does not represent the current commit. The fast path should be the same correct command with less downloading.

### Why is the first GitHub Actions run still slow?

A new cache key has nothing to restore. The first successful run downloads packages, completes installation, and makes cache content available for later matching runs. A lockfile update can create another cold run because the dependency graph changed. Judge the setup with repeated runs of the same lockfile, then include normal lockfile changes in the longer-term measurement so expectations reflect real development activity.

### Can this cache replace Playwright browser installation?

No. The pnpm store covers package content managed by pnpm. Playwright browser executables are separate runtime assets, and Linux system dependencies are handled separately as well. Keep browser provisioning explicit. If browser download time is material, evaluate its own cache or a tested container image with compatible browsers, but do not assume the package-store cache has preserved those binaries.
`,
};
