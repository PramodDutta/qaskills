import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cache Playwright Browsers in GitHub Actions',
  description:
    'Cache Playwright browsers in GitHub Actions with version-safe keys, Linux dependency installation, cache validation, and evidence that caching pays off.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Cache Playwright Browsers in GitHub Actions

On an Ubuntu runner, \`~/.cache/ms-playwright\` can contain hundreds of megabytes of Chromium, Firefox, and WebKit builds. Restoring that directory sounds like an obvious optimization, until cache download and extraction take as long as a fresh browser download. Playwright's own CI guidance does not recommend browser-binary caching by default for exactly that reason. If measurements on your repository show a benefit, the implementation still has to solve version coupling, operating system dependencies, browser selection, and stale-cache diagnosis.

This tutorial shows the defensible version of the optimization. The browser cache key includes the runner OS and the exact installed Playwright package version. A cache hit skips only the browser download, never the Linux library installation. A miss uses the supported installer. Tests stay capable of running with an empty cache, and timing data decides whether the cache remains worthwhile.

For general workflow structure and test stages, start with the [GitHub Actions testing CI/CD guide](/blog/github-actions-testing-ci-cd-guide). If your suite already uses Playwright and needs reporting, retries, and service setup around this optimization, consult the [Playwright GitHub Actions guide](/blog/playwright-github-actions-guide-2026).

## Decide whether the binary archive is worth restoring

A cache is not free storage attached to the runner. GitHub has to locate an archive, transfer it, decompress it, and later upload a new archive on a miss. Playwright browser builds are already distributed as compressed downloads. On a fast network, the cache path can merely move bytes between two services while adding archive overhead.

Measure at least twenty representative runs before and after the change. Compare the browser preparation step at the same time of day and runner class, and include both hits and misses. Do not report only the fastest hit. Dependency changes, cache eviction, and Playwright upgrades are part of the normal cost.

| Measurement | What to record | Decision value |
|---|---|---|
| Fresh install duration | \`playwright install --with-deps\` on a miss | Baseline cost |
| Exact-hit restore duration | Cache action plus \`install-deps\` | Real warm-path cost |
| Cache archive size | Entry size from Actions cache usage | Storage and transfer burden |
| Miss frequency | Misses divided by eligible runs | Upgrade and eviction penalty |
| Launch failures | Missing-library or executable errors | Correctness cost |
| End-to-end job duration | Checkout through report upload | Whether local saving matters overall |

Browser caching tends to make more sense for self-hosted runners with slow external network access, a single browser selection, or repeated workflows pinned to one Playwright version. It tends to help less when jobs use Playwright's Docker image, versions change frequently, GitHub cache bandwidth is similar to the browser CDN, or each matrix job restores the same large archive independently.

## Identify the exact browser cache and version owner

Each Playwright release expects specific browser revisions. The browsers installed for one package version should not be reused under another merely because they are both called Chromium. That is why a lockfile hash is safer than a timeless key, and the resolved \`@playwright/test\` version is even more precise.

On Linux, the default browser cache directory is \`~/.cache/ms-playwright\`. On macOS it is \`~/Library/Caches/ms-playwright\`. On Windows it is \`%USERPROFILE%\\AppData\\Local\\ms-playwright\`. A single cross-OS archive is inappropriate. The examples here deliberately target \`ubuntu-latest\`.

Determine which package owns browser installation in the repository. Projects normally depend on \`@playwright/test\`; some use the \`playwright\` library. \`pnpm exec playwright --version\` prints a human-oriented value, but extracting the resolved package version through the package manager makes a stable cache-key component. Never key on \`latest\`.

## Implement an exact-version Ubuntu workflow

The workflow below uses pnpm because it exposes the resolved dependency cleanly, but the cache principle is package-manager agnostic. It caches only Chromium because the test command runs only the Chromium project. Caching all three engines for a one-browser smoke job wastes transfer time.

\`\`\`yaml
name: Playwright browser cache experiment

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install JavaScript dependencies
        run: pnpm install --frozen-lockfile

      - name: Read installed Playwright version
        id: playwright
        shell: bash
        run: |
          VERSION=$(node -p "require('@playwright/test/package.json').version")
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Restore Chromium binary
        id: browser-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-chromium-\${{ runner.os }}-\${{ steps.playwright.outputs.version }}

      - name: Install Chromium and Linux libraries on cache miss
        if: steps.browser-cache.outputs.cache-hit != 'true'
        run: pnpm exec playwright install --with-deps chromium

      - name: Install Linux libraries on exact cache hit
        if: steps.browser-cache.outputs.cache-hit == 'true'
        run: pnpm exec playwright install-deps chromium

      - name: Run Chromium tests
        run: pnpm exec playwright test --project=chromium

      - name: Upload HTML report
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
\`\`\`

The cache step automatically saves the path after a successful job when there was no exact entry. A restored exact key produces \`cache-hit: 'true'\`. The two installer branches are intentionally asymmetric: a miss fetches the browser and system packages; a hit already has the browser but still provisions operating system packages.

Pin the pnpm version to the repository's \`packageManager\` value rather than copying the sample blindly. Similarly, use the Node version the product supports. The optimization must not become an excuse to drift from the development environment.

## Never confuse browsers with Linux dependencies

The browser executable lives under the user cache. Libraries required to launch it live in system locations managed by the Ubuntu package manager. GitHub's cache action can archive the former, but it does not turn the latter into a portable application bundle.

Running only \`playwright install\` on a fresh Linux runner may download a browser that cannot start. Running only \`install-deps\` installs libraries but not the version-matched executable. The supported combined miss path is \`playwright install --with-deps chromium\`. On a hit, \`playwright install-deps chromium\` fills the missing system half.

| Command | Browser download | OS package installation | Appropriate branch |
|---|---:|---:|---|
| \`playwright install chromium\` | Yes | No | Local machine with libraries already present |
| \`playwright install-deps chromium\` | No | Yes | GitHub cache exact hit |
| \`playwright install --with-deps chromium\` | Yes | Yes | Cache miss or no-cache workflow |
| \`playwright test --project=chromium\` | No | No | Execution after preparation |

Do not cache \`/usr/lib\` or other system directories. Their contents belong to the runner image and package manager, include unrelated files, and are coupled to the image revision. Use the installer that understands Playwright's supported library set.

## Use an exact key, not a permissive fallback

GitHub cache restore keys are valuable for package caches where partial reuse is safe. They are dangerous for Playwright browser revisions. If an exact \`1.XX.Y\` cache is unavailable, restoring “the latest Playwright cache on Linux” can provide executables that the current client will reject or fail to locate.

Omit \`restore-keys\` for browser binaries. An exact miss should install the correct revision and populate a new immutable entry. GitHub caches cannot be modified in place, which aligns well with versioned browser content.

Including \`runner.os\` prevents obvious cross-platform reuse. If you mix runner architectures or custom images, include architecture and an image-generation identifier too. An ARM64 browser directory is not interchangeable with x64. The key can also include the browser selection, as the example does, so a Chromium-only job does not restore a three-engine archive created elsewhere.

## Keep dependency caching separate

JavaScript package caching and browser caching solve different downloads. \`actions/setup-node\` with \`cache: pnpm\` caches pnpm's downloaded package data, not \`node_modules\` and not Playwright browsers. The browser cache action handles the executable directory. Both may be useful, and their hit rates should be measured separately.

Do not cache \`node_modules\` as a shortcut around \`pnpm install --frozen-lockfile\`. Installation creates the project dependency layout and validates the lockfile. The package-manager cache accelerates that work without turning an old linked tree into the source of truth.

In a monorepo, \`require('@playwright/test/package.json')\` must run where Node can resolve the package. Set \`working-directory\` on the version and test steps when Playwright belongs to a subproject. The cached browser path can remain in the runner's home directory.

## Validate the restored executable before the suite

A cache hit tells you an archive with that key was restored. It does not prove the archive contains the expected browser, was saved after a complete install, or can launch on the current image. Add a lightweight verification while introducing the optimization. The supported \`playwright install --dry-run chromium\` command reports the expected install locations without downloading, and a tiny Playwright script proves launch behavior.

\`\`\`typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<title>cache probe</title><main>ready</main>');

if ((await page.title()) !== 'cache probe') {
  throw new Error('Restored Chromium failed the launch probe');
}

console.log({ version: browser.version(), text: await page.locator('main').textContent() });
await browser.close();
\`\`\`

Run it with \`pnpm exec tsx scripts/check-browser.ts\` if \`tsx\` is already a development dependency, or compile it with the project's normal TypeScript path. A separate probe is most useful during rollout and incident diagnosis. Once the first real test launches the same browser immediately, keeping both may add little value.

If a supposedly exact cache is broken, do not add a fallback that masks it. Change a cache-schema prefix such as \`playwright-v2-...\` to force a clean miss, investigate how the incomplete entry was saved, and make cache population atomic from the workflow's perspective.

## Cache only the projects the job actually executes

Playwright can install named browsers: \`chromium\`, \`firefox\`, and \`webkit\`. Match installation to \`playwright.config.ts\` and command-line project selection. Device emulation does not imply a different executable; a mobile Chrome device profile still uses Chromium unless configured otherwise.

For a matrix with one browser per job, there are two reasonable designs. Each job can create a browser-specific cache, which minimizes transfer but creates more entries. Alternatively all jobs can restore a shared three-browser archive, which maximizes reuse of one key but downloads unused content in every job. Measure total workflow transfer, not only one job's restore.

Branded Chrome and Edge channels have different installation behavior. Do not assume the \`ms-playwright\` archive contains system-installed branded browsers. If the configuration uses \`channel: 'chrome'\`, test that path separately and follow Playwright's branded-browser installation commands.

## Protect trusted cache writers

Restored caches are inputs to code execution. A browser executable is especially sensitive because the test runner launches it. GitHub limits how low-trust fork workflows can write caches in protected scopes, but repository design still matters. Do not place credentials inside cache paths, and do not give untrusted jobs a route to populate keys later consumed by privileged workflows.

Use pull-request workflows without production secrets. Keep deployment jobs separate, and avoid \`pull_request_target\` patterns that check out untrusted code while holding elevated tokens. Pin third-party actions according to the organization's supply-chain policy. The cache should remain a disposable performance input, never the only copy of a required binary.

## Diagnose misses and slow hits with evidence

Print the resolved Playwright version and observe the cache action's exact key. Most unexpected misses come from a package upgrade, a different OS, cache eviction, or resolving the package from the wrong workspace. Most slow hits come from a large multi-browser archive, network variance, or system dependency installation dominating the step.

| Symptom | Likely cause | Correct response |
|---|---|---|
| Hit followed by “executable does not exist” | Wrong package version or incomplete archive | Force new schema key and inspect population |
| Browser launches locally but not on runner | Linux dependencies absent | Run \`install-deps\` on hits |
| Every pull request misses | Key includes changing commit SHA | Key only on OS, browser set, and resolved version |
| Restore is slower than download | Archive transfer offers no advantage | Remove browser cache |
| Archive is unexpectedly huge | All engines or stale revisions included | Install only selected browser and inspect directory |
| Matrix jobs fight eviction | Too many version/browser keys | Consolidate or stop caching low-value jobs |

The cache action logs show matched keys and restore timing. Step summaries can record hit state, preparation duration, and browser version. Review p50 and tail duration over enough runs to absorb runner variability. If the net saving is negligible, delete the optimization without regret.

## Prefer containers when environment reproducibility dominates

Playwright publishes Docker images that pair browsers with Linux dependencies. A pinned image can make preparation more predictable than assembling a runner on every job. The image version must match the project Playwright version, and pulling a large image has its own cost, but container-layer caching on self-hosted infrastructure may be effective.

The choice is operational. GitHub-hosted Ubuntu plus \`install --with-deps\` is simple and supported. A browser cache is an optional measured tweak. A pinned container is a fuller environment contract. Do not combine all three without understanding which layer supplies each executable and library.

## Account for cache amplification in a matrix

A cache that looks beneficial in one job can be expensive when a workflow fans out. Four shards restoring the same Chromium archive transfer that archive four times. If the jobs start together, they can also contend for network and decompression resources. Compare total billed runner time and bytes restored across the workflow, not only the elapsed time shown on the fastest shard.

The cache is saved only after a successful job on a miss. With several identical matrix jobs missing the same key, each may attempt to populate equivalent content. GitHub's immutable-cache behavior prevents an existing entry from being overwritten, but the duplicate installation and attempted save still consume time. A preparation job can install and save once, yet making every shard wait for it may lengthen the critical path. Another option is to let the first normal workflow populate the key and accept duplicate cold work after upgrades.

Model the alternatives with repository data. If four independent fresh downloads complete quickly because the CDN scales well, central preparation adds coordination for no gain. If external downloads are rate-limited, a shared restored archive may win. For self-hosted runners, a machine-local persistent Playwright directory can avoid remote archive transfer entirely, but then runner cleanup, version retention, and trust isolation become operator responsibilities.

After increasing the shard count, rerun the cache experiment. The conclusion from a single-runner workflow is not automatically portable to a wide matrix.

## Frequently Asked Questions

### Why does Playwright advise against caching browser binaries?

Restoring and extracting the cache can take about as long as downloading the already-compressed browsers, while Linux system dependencies still need installation. Benchmark the whole preparation step on your runners before keeping the cache.

### What belongs in a safe Playwright browser cache key?

Include at least the runner OS, exact resolved Playwright version, and installed browser set. Add architecture or custom image identity when those vary. Avoid broad restore keys that can return a different browser revision.

### Can I skip \`playwright install-deps\` after an exact cache hit?

Not on a fresh Linux runner unless the runner image already guarantees every required library. GitHub-hosted images are recreated per job, and the user-level browser archive does not contain system packages.

### Should each browser matrix job use its own cache?

Browser-specific entries reduce bytes restored per job, while one combined entry reduces key count. Compare aggregate workflow transfer and eviction behavior. There is no universal winner.

### How should I recover from a corrupted immutable cache entry?

Bump a cache-schema prefix to create a new exact key, let the supported installer repopulate it, and determine why the old job saved incomplete content. The test job must always remain able to proceed from a miss.
`,
};
