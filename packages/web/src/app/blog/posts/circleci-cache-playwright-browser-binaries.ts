import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cache Playwright Browser Binaries in CircleCI',
  description:
    'Cache Playwright browser binaries in CircleCI with versioned keys, correct paths, safe fallbacks, and installation checks that prevent stale builds.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Cache Playwright Browser Binaries in CircleCI

Chromium downloads successfully on every CircleCI job, then disappears with the executor. The next commit pays for the same archive and extraction again. Caching Playwright's browser directory can remove that repeated work, but only if the cache key changes whenever the required browser revision or execution platform changes.

Playwright browser binaries are not ordinary npm packages. The \`@playwright/test\` package declares which browser revisions it expects, while \`npx playwright install\` places executables in a platform-specific cache directory. Restoring a directory built for the wrong Playwright version, operating system, or CPU architecture leads to the familiar "executable doesn't exist" failure or, worse, a browser that cannot launch.

CircleCI caches are immutable. Once a key has been written, later jobs cannot update its contents. Correct key design is therefore the central reliability decision, not a cosmetic optimization.

## Choose the browser path for the CircleCI executor

On Linux, Playwright's default browser cache is commonly \`~/.cache/ms-playwright\`. macOS and Windows defaults differ. CircleCI Docker jobs normally run Linux, but the home directory depends on the image user.

You can make the location explicit with \`PLAYWRIGHT_BROWSERS_PATH\`. An explicit workspace-relative directory is easy to save and inspect:

\`\`\`yaml
environment:
  PLAYWRIGHT_BROWSERS_PATH: /home/circleci/project/.cache/ms-playwright
\`\`\`

Use the same variable for installation and test execution. Setting it only during \`playwright install\` stores binaries in one place while the test runner searches another.

| Executor choice | Browser source | Cache recommendation |
| --- | --- | --- |
| CircleCI Node convenience image | Install with \`npx playwright install\` | Cache explicit \`PLAYWRIGHT_BROWSERS_PATH\` and install OS dependencies separately |
| Official Playwright container image | Browsers and system packages already in image | Usually skip browser cache; pin image tag to Playwright version |
| CircleCI machine executor | Host-level Linux environment | Cache browser directory but include architecture and image generation in key |
| macOS executor | Playwright macOS binaries | Use the macOS cache path and never share with Linux jobs |

If the official Playwright image fits the pipeline, it often gives more predictable startup because browsers and Linux dependencies arrive as image layers. Caching remains useful when the team needs a custom Node image, smaller base image, or separate dependency ownership.

## Derive an immutable key from the actual Playwright dependency

A lockfile checksum is a safe starting point. When \`package-lock.json\`, \`pnpm-lock.yaml\`, or \`yarn.lock\` changes, CircleCI writes a new cache. It may rotate the browser cache for unrelated dependency updates, but it will not leave a stale browser revision after a Playwright update.

Include an explicit cache schema version and \`{{ arch }}\`. The version lets an operator invalidate all caches when the directory strategy changes. Architecture prevents restoring incompatible executables across runner types.

\`\`\`yaml
version: 2.1

jobs:
  browser_tests:
    docker:
      - image: cimg/node:22.17-browsers
    working_directory: ~/project
    environment:
      PLAYWRIGHT_BROWSERS_PATH: /home/circleci/project/.cache/ms-playwright
    steps:
      - checkout
      - restore_cache:
          keys:
            - pw-browsers-v3-{{ arch }}-{{ checksum "package-lock.json" }}
      - run:
          name: Install Node dependencies
          command: npm ci
      - run:
          name: Ensure Playwright Chromium is installed
          command: npx playwright install chromium
      - save_cache:
          key: pw-browsers-v3-{{ arch }}-{{ checksum "package-lock.json" }}
          paths:
            - .cache/ms-playwright
      - run:
          name: Run browser tests
          command: npx playwright test --project=chromium

workflows:
  test:
    jobs:
      - browser_tests
\`\`\`

The install command must run on both hits and misses. On a hit, Playwright detects the expected browser already present and avoids a full download. On a partial or incorrect restore, it repairs the missing revision. The cache is an optimization, never a prerequisite for correctness.

The example installs only Chromium because the job runs only Chromium. Installing all three browsers and saving them for a Chromium-only suite wastes network, archive, and cache restore time.

## Do not use a broad fallback across Playwright revisions

CircleCI's \`restore_cache.keys\` supports prefix fallbacks, but browser binaries are version-coupled. A fallback such as \`pw-browsers-v3-\` can restore the newest cache for a different lockfile. The subsequent install will add the required revision, so correctness may survive, but the directory now contains old and new browsers and grows over time.

| Key pattern | Hit behavior | Browser-cache verdict |
| --- | --- | --- |
| Version + arch + lock checksum | Exact dependency and platform match | Safe default |
| Version + branch + lock checksum | Duplicates identical binaries across branches | Usually unnecessary |
| Version + arch only | Stays stale across Playwright upgrades | Unsafe without always repairing and pruning |
| Version + epoch or build number | Writes on every build and never reuses | Defeats caching |
| Generic prefix fallback | Can restore unrelated browser revisions | Avoid unless restore cost is proven useful and stale revisions are pruned |

CircleCI selects the first key with a match, and prefix matching can choose the most recently created matching cache. Exact dependency identity is more valuable than squeezing a partial hit from a large binary directory.

If lockfile churn makes the hit rate poor, create a small checksum input containing only the resolved Playwright version. Generate it before restore in a deterministic upstream step, or commit a browser cache version file updated with Playwright. Do not calculate it from \`node_modules\` before \`npm ci\`, because the directory does not exist yet on a clean job.

For most teams, the lockfile checksum is simple and reliable. Optimize key granularity only after job timings show browser download is still material.

## Separate npm downloads from browser downloads

The npm cache and the Playwright browser cache have different invalidation and safety properties. Store them under separate CircleCI keys. A combined cache rotates and uploads a large archive when either component changes.

\`\`\`yaml
steps:
  - checkout
  - restore_cache:
      keys:
        - npm-v2-{{ arch }}-{{ checksum "package-lock.json" }}
  - run: npm ci
  - save_cache:
      key: npm-v2-{{ arch }}-{{ checksum "package-lock.json" }}
      paths:
        - ~/.npm

  - restore_cache:
      keys:
        - pw-chromium-v3-{{ arch }}-{{ checksum "package-lock.json" }}
  - run: npx playwright install chromium
  - save_cache:
      key: pw-chromium-v3-{{ arch }}-{{ checksum "package-lock.json" }}
      paths:
        - .cache/ms-playwright
\`\`\`

Do not cache \`node_modules\` as a substitute for browser binaries. \`npm ci\` deliberately rebuilds installed dependencies, and the Playwright executable directory is outside \`node_modules\` by default. Cache \`~/.npm\` to reduce package downloads and the browser path to reduce browser downloads.

The [CircleCI test automation pipeline guide](/blog/circleci-test-automation-pipeline-guide-2026) covers job boundaries, workspaces, artifacts, and parallel execution. A CircleCI cache persists reusable immutable input across workflows; a workspace moves files between jobs in one workflow; an artifact preserves outputs for people or later systems. They are not interchangeable.

## Install Linux dependencies independently of cached executables

Restoring Chromium does not install shared libraries needed to launch it. On a generic Node image, \`npx playwright install --with-deps chromium\` installs browser binaries and supported OS dependencies, but system package installation may require privileges and adds time.

CircleCI's browser convenience images or a custom prebuilt image can supply the operating-system packages. Then the cache supplies only Playwright's revisioned browser directory. This separation is usually clearer than trying to cache apt-managed libraries.

Validate the image by running a minimal Playwright launch after installation. The real test command does this naturally, but an explicit diagnostic can make image failures clearer:

\`\`\`bash
npx playwright install chromium
npx playwright test --project=chromium
\`\`\`

Avoid undocumented executable-path checks. The supported install command and an actual browser launch are better signals than assuming an internal directory name.

If using the official Playwright Docker image, align its tag with the package version. The image documentation warns that version mismatches can prevent Playwright from locating browser executables. Pinning both through an update tool makes the relationship reviewable.

## Handle parallel jobs without cache races

CircleCI caches are shared across jobs and immutable. If five matrix jobs miss the same key and all try to save it, the first completed write wins. The other uploads add time and are discarded or ignored for that key.

There are three practical designs:

1. Let every browser job restore and install, but nominate one upstream job to save the cache.
2. Use distinct keys for genuinely different browser subsets or architectures.
3. Build a custom image containing the browsers and let the container registry handle shared layers.

An upstream preparation job cannot pass a newly written cache reliably to jobs that started before it finishes. Add a workflow dependency so consumers begin after the producer. A workspace is another option inside the same workflow, but copying a large browser directory through the workspace on every run may be slower than a cache hit.

\`\`\`yaml
workflows:
  test:
    jobs:
      - prepare_browser_cache
      - browser_tests:
          requires:
            - prepare_browser_cache
      - accessibility_tests:
          requires:
            - prepare_browser_cache
\`\`\`

Measure the added serialization. If the preparation job blocks otherwise parallel tests longer than duplicate installs would, accept the harmless first-writer race or move browsers into the image.

## Verify hits instead of assuming the cache works

CircleCI job output states whether a key was found and shows restore/save timing. Inspect at least two runs with the same lockfile. The second should restore the exact key, and \`playwright install\` should finish without downloading the full browser.

Record these durations:

| Step | What a healthy cache should show | Warning sign |
| --- | --- | --- |
| Restore browser cache | Less time than a clean download and extraction | Restore exceeds the avoided install time |
| Playwright install | Quick verification on an exact hit | Downloads a complete revision every run |
| Save browser cache | Runs only for a new immutable key | Large upload on every unchanged build |
| Browser launch | Same reliability on hit and miss | Missing libraries or wrong executable after restore |

Cache size matters. A directory with obsolete revisions may take longer to download and unpack than a clean current browser install. Exact keys and no generic fallback keep contents narrow. If an old key is bad, increment the \`v3\` prefix in both restore and save steps; CircleCI does not offer ordinary in-place mutation of the existing cache.

Do not include \`{{ .Revision }}\`, \`{{ .BuildNum }}\`, or \`{{ epoch }}\` in a reusable browser key. Those values make every build unique and guarantee a miss.

## Account for monorepos and package managers

In a monorepo, checksum the lockfile that actually resolves the Playwright package. For pnpm workspaces, that is often the root \`pnpm-lock.yaml\`, even if tests live in \`packages/e2e\`. Running CircleCI from a subdirectory changes relative checksum and cache paths, so make the working directory explicit.

Different packages may require different Playwright versions only if the lockfile resolves them separately. A single shared browser directory can hold multiple revisions, but its cache invalidation becomes broader. Standardizing one version reduces both disk use and support complexity.

Yarn Plug'n'Play and pnpm do not change the browser cache concept. Use the appropriate immutable dependency install command, set \`PLAYWRIGHT_BROWSERS_PATH\`, and checksum the correct lockfile.

If the Playwright package is installed only in a filtered workspace, ensure \`npx playwright\` resolves that local dependency rather than downloading an unexpected package. Prefer the package manager's workspace execution command when necessary.

## Decide whether caching is worth keeping

Caching has storage, transfer, and operational cost. Compare a clean install against restore plus verification on representative CircleCI executors. Browser archives compress well, but extraction and remote cache transfer still take time.

A custom Docker image is attractive when many repositories use the same Playwright version. It centralizes OS dependencies and browser revisions, but image rebuilds must follow Playwright upgrades. The official image reduces maintenance if its base meets security and runtime requirements.

Caching is attractive when versions change infrequently, jobs run often, and the executor image is deliberately generic. It is less attractive for infrequent nightly suites or high-bandwidth runners where cache restore is no faster than the CDN download.

The [Playwright browser install guide](/blog/playwright-browser-install-guide-2026) explains browser subsets, system dependencies, and installation commands. Use those choices to define what the CircleCI cache contains; do not save browsers the suite never launches.

## Recovery procedure for a poisoned browser cache

First confirm the exact restored key in CircleCI logs. Then run \`npx playwright install <browser>\`; if it downloads a missing revision and tests pass, the key did not represent package identity correctly. If launch still fails, inspect OS dependencies and architecture.

Rotate the schema prefix in both restore and save definitions, for example from \`pw-browsers-v3\` to \`pw-browsers-v4\`. A restore-only change creates misses forever because no job writes the new key. An unchanged save key cannot overwrite the corrupted entry because caches are immutable.

Avoid deleting random directories during the test step and then saving under the same key. The first saved archive remains authoritative. Fix the configuration, rotate once, and let retention remove old entries later.

Finally, add a review note explaining why the key changed. Cache version numbers are operational schema versions; without context, a future engineer may "simplify" them and reintroduce stale restores.

## Cache separate browser subsets only when jobs truly differ

A Chromium smoke job and a WebKit compatibility job can use separate cache prefixes and paths, but Playwright normally stores all installed browsers below one root. Saving the same root under two keys after different installs can be clear if each job begins from an empty directory. Restoring one into the other and then saving creates mixed archives.

The simplest design is one exact cache containing every browser required by downstream jobs. Split it only when restore time for unused binaries is materially expensive or jobs run on different architectures. Document which command populates each key, such as \`playwright install chromium\`, so a future matrix expansion updates the cache as well as the project list.

Headless shell packages and media codecs are versioned Playwright assets too. Avoid manual pruning based on guessed directory names. Let the supported installer own the contents, or validate every configured browser project after a pruning experiment.

## Treat browser caching as measured pipeline code

Add timing around clean download, cache restore, verification install, and cache save. Compare the median across several representative jobs because a single run may be dominated by registry or cache-service variance. Include billed storage and network transfer if the CircleCI plan makes them relevant.

Review the optimization after Playwright, Node image, or executor changes. A new convenience image might already contain browsers, turning the restored archive into redundant work. A larger test matrix may make a prebuilt image more economical than several cache transfers.

Cache misses should never page an operator. They are expected after dependency updates and retention expiry. Alert on correctness failures or sustained performance regression, and keep the pipeline capable of completing through a clean install.

## Secure cache use on untrusted contributions

Browser binaries are executable inputs. Understand CircleCI's cache isolation rules for forked pull requests and avoid designs where untrusted jobs can populate a key later consumed by protected release jobs. Exact lockfile and architecture keys improve correctness but do not themselves establish trust provenance.

Protected workflows can use prebuilt signed images or caches produced only on trusted branches, depending on platform controls. Always run Playwright's normal install verification and keep base images patched. Do not execute arbitrary files discovered in a broadly restored directory outside the paths Playwright resolves for its pinned revision.

This is a supply-chain consideration rather than a reason to abandon caching. Apply the same trust model used for dependency caches, container layers, and build artifacts.

## Frequently Asked Questions

### What directory should CircleCI cache for Playwright on Linux?

The default is commonly \`~/.cache/ms-playwright\`. Setting \`PLAYWRIGHT_BROWSERS_PATH\` to an explicit absolute path removes ambiguity, as long as installation and tests use the same value.

### Should the cache key contain the Playwright version or lockfile checksum?

Either can work. A lockfile checksum is simplest and safely rotates for a Playwright upgrade; a dedicated resolved-version key improves hit rate but requires a reliable way to produce that version before restore.

### Can I skip playwright install after a cache restore?

Keep the install command. It cheaply verifies an exact hit and repairs a miss or incomplete directory. The test job should remain correct even when no cache exists.

### Why does CircleCI keep restoring an old browser after I saved a fix?

Caches are immutable, so saving the same key cannot replace its content. Increment the cache version prefix in both restore and save steps.

### Is caching better than the official Playwright Docker image?

Neither is universally better. The image bundles compatible browsers and system dependencies; caching suits custom executor images. Compare pull, restore, and maintenance costs on your pipeline.
`,
};
