import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PLAYWRIGHT_BROWSERS_PATH: The Complete 2026 Reference',
  description:
    'Canonical reference for PLAYWRIGHT_BROWSERS_PATH: default OS install paths, the 0 and custom-path modes, related env vars, Docker, CI caching, and monorepo gotchas.',
  date: '2026-06-27',
  category: 'Reference',
  content: `
# PLAYWRIGHT_BROWSERS_PATH: The Complete 2026 Reference

\`PLAYWRIGHT_BROWSERS_PATH\` is the single most important environment variable for controlling where Playwright stores and looks for the browser binaries it drives — Chromium, Firefox, WebKit, and the bundled FFMPEG used for video capture. By default, Playwright downloads these browsers into a shared, per-user cache directory the first time you run \`npx playwright install\`. That works fine on a laptop, but the moment you move to Docker, CI runners, locked-down build agents, multi-version monorepos, or air-gapped networks, you need to take explicit control of that location. \`PLAYWRIGHT_BROWSERS_PATH\` is how you do it.

This is a reference page, not a tutorial. The goal is to give you exact values, exact paths, and copy-pasteable commands you can drop into a Dockerfile, a CI pipeline, or a shell profile without guesswork. If you are new to the framework and want a guided walkthrough instead, start with the [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026) or the broader [Playwright end-to-end testing guide](/blog/playwright-e2e-complete-guide), then come back here when you need the canonical values.

The one rule that catches almost everyone: the value of \`PLAYWRIGHT_BROWSERS_PATH\` must be identical at install time and at run time. Playwright resolves the browser location from this variable in both phases independently. If you install browsers with the variable set to one value (or unset) and then run your tests with a different value, Playwright will report that the browser executable does not exist and tell you to run \`playwright install\` again. Keep the variable consistent across both phases and most problems disappear.

## What PLAYWRIGHT_BROWSERS_PATH actually does

When Playwright needs a browser, it computes a path on disk and looks for the executable there. \`PLAYWRIGHT_BROWSERS_PATH\` overrides the base of that path. It affects four things that ship as part of the browser download:

- **Chromium** (and the Chromium-based Chrome/Edge channels' bundled headless shell)
- **Firefox** (a Playwright-patched build)
- **WebKit** (a Playwright-patched build)
- **FFMPEG** — the small binary Playwright uses to encode trace videos

The variable changes *where* these live; it does not change *which versions* are downloaded. The version is pinned by your installed \`@playwright/test\` (Node) or \`playwright\` (Python) package. Upgrading the package and re-running \`playwright install\` fetches new browser builds into whatever location the variable points at.

There are three modes:

| Value | Behaviour | Typical use |
|---|---|---|
| *(unset)* | Browsers go to the per-user OS cache (see table below) | Local development, single project |
| \`0\` | Browsers go **inside** \`node_modules\` of the package that owns Playwright | Hermetic per-project installs, reproducible CI |
| \`/custom/path\` | Browsers go to that exact absolute directory | Shared central cache across many projects, Docker layers, air-gapped mirrors |

## Default install locations per OS

When \`PLAYWRIGHT_BROWSERS_PATH\` is **not set**, Playwright uses a per-user cache directory under a folder named \`ms-playwright\`. The exact base differs per operating system:

| OS | Default browsers directory |
|---|---|
| Linux | \`~/.cache/ms-playwright\` |
| macOS | \`~/Library/Caches/ms-playwright\` |
| Windows | \`%USERPROFILE%\\\\AppData\\\\Local\\\\ms-playwright\` |

Inside that directory you will find one subfolder per browser build, named with the browser and its revision number, for example \`chromium-1187\`, \`firefox-1489\`, \`webkit-2145\`, and \`ffmpeg-1011\`. The exact revision numbers depend on your Playwright version. You generally never need to touch these folders by hand — but knowing where they are is invaluable when you are debugging a "browser not found" error or trying to figure out why a CI cache is 800 MB.

To see the resolved path on any machine without memorising the table, ask Playwright directly:

\`\`\`bash
# Prints the browsers directory Playwright will use right now
npx playwright install --dry-run
\`\`\`

The dry run prints the install location and the exact browser builds it would download, which is the authoritative answer for your current environment and configuration.

## Mode: PLAYWRIGHT_BROWSERS_PATH=0 (install into node_modules)

Setting the variable to the literal string \`0\` tells Playwright to place the browsers inside the \`node_modules\` directory of the package that depends on Playwright. This produces a *hermetic*, per-project install: the browsers travel with the project's dependencies and are isolated from every other project on the machine.

\`\`\`bash
# Install browsers into node_modules for this project only
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps

# IMPORTANT: run tests with the SAME value
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test
\`\`\`

When this mode is useful:

- You want each checkout to be fully self-contained, with no reliance on a shared user cache.
- You are caching \`node_modules\` in CI anyway and want the browsers to ride along in the same cache key.
- You are debugging an environment where the per-user cache is on a read-only or ephemeral volume.

The trade-off is disk: every project that uses this mode gets its own full copy of all three browsers (roughly several hundred megabytes), with no de-duplication between projects. On a build agent that checks out dozens of repos, that adds up fast — which is exactly the situation the custom-path mode below is designed for.

## Mode: PLAYWRIGHT_BROWSERS_PATH=/custom/path (shared central install)

Pointing the variable at an absolute directory creates a single shared browser store that any number of projects can reuse. This is the standard pattern for build farms, Docker base images, and air-gapped environments where browsers are pre-seeded onto the machine.

\`\`\`bash
# Linux / macOS — install once into a shared location
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
npx playwright install --with-deps

# Every project on this machine reuses the same store at run time
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
npx playwright test
\`\`\`

Because the store is keyed by browser build revision, multiple Playwright versions can coexist in the same directory. Project A on Playwright 1.55 and Project B on 1.58 will reference different revision subfolders without clobbering each other, and a project only ever downloads a build that is not already present.

Pick a path that is writable at install time and readable at run time by whatever user runs the tests. A common mistake is installing as \`root\` into \`/opt/ms-playwright\` and then running tests as an unprivileged CI user that cannot read the directory.

## Set it at install time AND at run time

This deserves its own section because it is the number-one source of "it works on my machine but not in CI" reports. Playwright reads \`PLAYWRIGHT_BROWSERS_PATH\` twice, in two separate processes:

1. **Install time** — \`playwright install\` writes browser builds to the resolved path.
2. **Run time** — the test runner reads the resolved path to launch a browser.

If these two values differ, the run-time lookup misses and you get an error like *"Executable doesn't exist at /some/path … Looks like Playwright Test or Playwright was just installed or updated. Please run the following command to download new browsers: npx playwright install"*.

The fix is simple: set the variable to the same value in both phases. In a Dockerfile, set it once with \`ENV\` so it persists into every later layer and into the running container. In CI, set it as a workflow-level environment variable so it applies to both the install step and the test step.

### Python: set it before importing playwright

In Python the timing is stricter. The browsers path is resolved when the \`playwright\` package is imported, so the environment variable must already be set **before** the import statement runs. Setting it later in the same process has no effect.

\`\`\`python
import os

# Must be set BEFORE importing playwright
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/ms-playwright"

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://qaskills.sh")
    print(page.title())
    browser.close()
\`\`\`

The cleaner approach is to export the variable in the shell or CI environment so it is present before the Python interpreter even starts — that sidesteps any import-ordering subtlety entirely.

## Related environment variables

\`PLAYWRIGHT_BROWSERS_PATH\` is the headline variable, but a handful of siblings control downloading, mirrors, and host validation. Keep this table handy.

| Variable | Effect | Common value |
|---|---|---|
| \`PLAYWRIGHT_BROWSERS_PATH\` | Override where browsers are stored / read | \`0\`, \`/opt/ms-playwright\` |
| \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD\` | Skip downloading browsers during \`install\` / package postinstall | \`1\` |
| \`PLAYWRIGHT_DOWNLOAD_HOST\` | Base host to download all browser builds from (mirror / proxy) | \`https://mirror.internal/playwright\` |
| \`PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST\` | Per-browser download host override (also \`_FIREFOX_\`, \`_WEBKIT_\`) | \`https://mirror.internal/chromium\` |
| \`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS\` | Skip the host OS dependency validation check | \`1\` |
| \`PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT\` | Download connection timeout in milliseconds | \`60000\` |

A few notes on these:

- **\`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\`** is what you set when you want to install the npm package but *not* fetch browsers yet — for example in a multi-stage Docker build where browsers come from an earlier base layer, or when you mount a pre-seeded store via \`PLAYWRIGHT_BROWSERS_PATH\`.
- **\`PLAYWRIGHT_DOWNLOAD_HOST\`** (and the per-browser variants) point the downloader at an internal mirror. This is the standard pattern in corporate networks that block the public CDN. Mirror the artifacts once, then point every machine at the mirror.
- **\`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1\`** bypasses the Linux dependency check. Use it sparingly — it suppresses a check that genuinely catches missing system libraries — but it is occasionally necessary on minimal or non-standard distributions where the check produces false negatives.

## Setting the variable per shell and per OS

Exact syntax for exporting the variable in each environment, plus the install commands for Node and Python.

### Linux and macOS (bash / zsh)

\`\`\`bash
# Session-only export
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

# Persist across sessions (zsh on macOS)
echo 'export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright' >> ~/.zshrc

# Install (Node) and run with the same value
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright install --with-deps
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright test
\`\`\`

### Windows PowerShell

\`\`\`powershell
# Current session only
$env:PLAYWRIGHT_BROWSERS_PATH = "C:\\ms-playwright"

# Persist for the current user across sessions
setx PLAYWRIGHT_BROWSERS_PATH "C:\\ms-playwright"

# Install and run (note: setx takes effect in NEW shells only)
npx playwright install --with-deps
npx playwright test
\`\`\`

\`setx\` writes to the user environment and only affects shells started *after* it runs, so set \`$env:\` directly in the current session if you need it immediately.

### Python install commands

\`\`\`bash
# Install the Python package, then the browsers into the shared store
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
pip install playwright
playwright install --with-deps

# Or install a single browser
playwright install chromium
\`\`\`

The \`--with-deps\` flag also installs the operating-system packages the browsers need (fonts, libraries) and requires elevated privileges on Linux. On a developer machine you usually only need \`playwright install\` without \`--with-deps\`.

## Docker patterns

Two patterns dominate in containers: bake the browsers into the image, or mount a shared store. Baking is the most reproducible because the browsers become an immutable image layer.

\`\`\`dockerfile
FROM node:20-bookworm-slim

# Pin the browser store to a known, stable location and persist it
# into every later layer AND the running container via ENV.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Install browsers into the ENV-defined path at BUILD time.
# Because ENV persists, run time resolves the same path automatically.
RUN npx playwright install --with-deps chromium firefox webkit

COPY . .
CMD ["npx", "playwright", "test"]
\`\`\`

Because the \`ENV\` instruction sets the variable for both the build-time \`RUN\` and the container's run-time process, the install-time and run-time values are guaranteed to match — exactly the consistency the framework requires.

If you prefer Microsoft's maintained base image, it already ships the browsers and sets the path for you, so you can drop the install step:

\`\`\`dockerfile
# Tag must match your installed @playwright/test version
FROM mcr.microsoft.com/playwright:v1.58.0-noble
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npx", "playwright", "test"]
\`\`\`

When you want the smallest possible application layer, set \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\` during \`npm ci\` so the postinstall hook does not re-download browsers that the base image already provides.

## CI caching with GitHub Actions

In CI you want to avoid re-downloading hundreds of megabytes of browsers on every run. The trick is to cache the browsers directory and key the cache on a stable identifier — the path itself plus the Playwright version (or the lockfile hash). For a deeper walkthrough of full CI pipelines, see the [CI/CD testing pipeline guide](/blog/ai-test-automation-tools-2026).

\`\`\`yaml
name: e2e
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      # Pin the store to a known path so the cache key is stable
      PLAYWRIGHT_BROWSERS_PATH: \${{ github.workspace }}/ms-playwright
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      # Cache the browsers directory, keyed on the resolved Playwright version
      - name: Resolve Playwright version
        id: pw
        run: echo "version=$(npm ls @playwright/test --json | npx json dependencies.@playwright/test.version)" >> "$GITHUB_OUTPUT"

      - uses: actions/cache@v4
        id: pw-cache
        with:
          path: \${{ env.PLAYWRIGHT_BROWSERS_PATH }}
          key: pw-\${{ runner.os }}-\${{ steps.pw.outputs.version }}

      # Only download if the cache missed
      - if: steps.pw-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      # On a cache hit, still install the OS deps (they are not cached)
      - if: steps.pw-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - run: npx playwright test
\`\`\`

The two key ideas: the \`env\` block sets \`PLAYWRIGHT_BROWSERS_PATH\` once for the whole job (so install and run agree), and the cache key includes the Playwright version so a version bump invalidates the cache and triggers a fresh, correct download. The OS-level dependencies installed by \`--with-deps\` are not part of the cached directory, so a cache hit still runs \`install-deps\` to provision them.

## Monorepo and pnpm hoisting gotchas

Monorepos are where the default behaviour bites hardest, especially with pnpm's strict, non-flat \`node_modules\` layout.

- **\`PLAYWRIGHT_BROWSERS_PATH=0\` resolves relative to the package that owns Playwright.** In a pnpm workspace the real package lives under \`.pnpm/\`, so the browsers can land in a deeply nested, non-obvious directory that is easy to miss in caching config. Prefer an explicit absolute path in monorepos to remove ambiguity.
- **Multiple Playwright versions across workspaces** share a single store when you use a custom absolute path, because the store is keyed by browser revision. This is usually what you want — no wasted downloads.
- **Hoisting differences** between npm, Yarn, and pnpm mean the "inside node_modules" location is not portable across package managers. If your CI uses pnpm but a contributor uses npm locally, the \`0\` mode produces different directories. An absolute \`PLAYWRIGHT_BROWSERS_PATH\` sidesteps the entire class of problem.
- **Turborepo / Nx task caching** can accidentally cache test results without the browser store. Make sure the browsers directory is either outside the cached outputs or consistently restored, otherwise a cache hit can run tests against a missing browser.

The pragmatic rule for any non-trivial repo: set \`PLAYWRIGHT_BROWSERS_PATH\` to one explicit absolute directory, set it identically everywhere (root shell, Docker \`ENV\`, CI \`env\`), and never rely on the implicit per-package resolution.

## Verifying and troubleshooting

A short checklist for when browsers are not found:

1. Run \`echo $PLAYWRIGHT_BROWSERS_PATH\` (or \`echo $env:PLAYWRIGHT_BROWSERS_PATH\` in PowerShell) in *both* the install and the test environments and confirm the values match.
2. Run \`npx playwright install --dry-run\` to print the path Playwright currently resolves and the builds it expects.
3. Confirm the test-runner user can read the directory (permissions, especially after a \`root\` install).
4. Confirm the Playwright package version matches the browser builds present (a version bump needs a fresh \`install\`).
5. In Python, confirm the variable is set *before* \`import playwright\`.

For broader Playwright environment topics such as device descriptors and viewport control, the [mobile emulation reference](/blog/playwright-mobile-emulation-reference) and the [what's new in Playwright 2026](/blog/whats-new-playwright-2026) roundup are good companions to this page.

## Frequently Asked Questions

### What does PLAYWRIGHT_BROWSERS_PATH do?

It overrides where Playwright stores and looks for its browser binaries — Chromium, Firefox, WebKit, and the bundled FFMPEG. With no value set, browsers go to a per-user OS cache. Set it to \`0\` to install inside \`node_modules\`, or to an absolute path for a shared central store reused by every project on the machine.

### Where does Playwright install browsers by default?

When the variable is unset, browsers go to a per-user \`ms-playwright\` cache: \`~/.cache/ms-playwright\` on Linux, \`~/Library/Caches/ms-playwright\` on macOS, and \`%USERPROFILE%\\AppData\\Local\\ms-playwright\` on Windows. Each browser build lives in a revision-named subfolder. Run \`npx playwright install --dry-run\` to print the exact resolved path for your machine.

### What is the difference between PLAYWRIGHT_BROWSERS_PATH=0 and a custom path?

Setting it to \`0\` installs browsers inside the project's \`node_modules\`, giving each project a hermetic, self-contained copy with no de-duplication. Setting it to an absolute path like \`/opt/ms-playwright\` creates one shared store that many projects reuse, keyed by browser revision so multiple Playwright versions coexist without wasting disk space.

### Why does Playwright say the browser executable does not exist?

Almost always because \`PLAYWRIGHT_BROWSERS_PATH\` differed between install time and run time. Playwright resolves the path independently in each phase, so the run-time lookup misses if the values do not match. Set the variable to the same value in both phases — in Docker use a single \`ENV\`, in CI use a job-level \`env\` block — then re-run \`playwright install\`.

### How do I cache Playwright browsers in CI?

Pin \`PLAYWRIGHT_BROWSERS_PATH\` to a known directory, then cache that directory with a key that includes the Playwright version. On a cache hit, skip the browser download but still run \`playwright install-deps\` because the OS-level dependencies are not part of the cached folder. Bumping the Playwright version changes the key and triggers a fresh, correct download.

### Do I need to set PLAYWRIGHT_BROWSERS_PATH before importing Playwright in Python?

Yes. In Python the browsers path is resolved when the \`playwright\` package is imported, so the variable must already be set before the \`import\` statement runs. The cleanest approach is to export it in the shell or CI environment before the interpreter starts, rather than setting \`os.environ\` partway through your script.

### How do I skip downloading browsers during install?

Set \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\`. This installs the npm or pip package without fetching browsers — useful in multi-stage Docker builds where browsers come from an earlier base layer, or when you mount a pre-seeded store via \`PLAYWRIGHT_BROWSERS_PATH\`. Pair it with a base image such as \`mcr.microsoft.com/playwright\` that already ships the browsers.

### Can I point Playwright at an internal browser mirror?

Yes. Set \`PLAYWRIGHT_DOWNLOAD_HOST\` to your mirror's base URL so all browser builds download from there, or use the per-browser variants like \`PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST\`. This is the standard pattern for corporate networks that block the public CDN: mirror the artifacts once, then point every machine and CI runner at the internal host.

## Conclusion

\`PLAYWRIGHT_BROWSERS_PATH\` is small but load-bearing: it decides whether your browsers live in a per-user cache, inside \`node_modules\`, or in a shared central store — and getting the install-time and run-time values to agree is what separates a green CI pipeline from a wall of "executable doesn't exist" errors. Pin it to one explicit path, set it identically across your shell, Dockerfile, and CI config, and cache the directory by Playwright version. Do that and browser provisioning becomes a solved problem you never think about again.

Ready to give your AI coding agent battle-tested Playwright setup, CI, and environment skills out of the box? Browse the [QASkills directory](/skills) to install ready-made QA skills your agent can use today, and keep this reference bookmarked for the next time a build agent can't find Chromium.
`,
};
