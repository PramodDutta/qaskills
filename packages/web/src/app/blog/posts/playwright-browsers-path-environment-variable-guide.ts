import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PLAYWRIGHT_BROWSERS_PATH: The Complete Reference Guide',
  description:
    'Reference for PLAYWRIGHT_BROWSERS_PATH in Playwright (Python + Node): default paths per OS, value 0, custom paths, Docker, CI caching, and troubleshooting.',
  date: '2026-06-18',
  category: 'Reference',
  content: `
# PLAYWRIGHT_BROWSERS_PATH: The Complete Reference Guide

\`PLAYWRIGHT_BROWSERS_PATH\` is the single environment variable that controls **where Playwright downloads and looks for its bundled browser binaries** (Chromium, Firefox, and WebKit). If you have ever seen the dreaded \`Executable doesn't exist at ...\` error, or you are trying to share a browser cache across CI jobs, or you want a fully self-contained Docker image, this variable is the lever you reach for.

This page is a reference. It documents every accepted value, the default install location on each operating system, how the variable behaves differently in Python versus Node.js, and the practical recipes for Docker and CI. Code examples are given in both \`bash\` and the relevant runtime language so you can copy them directly.

## What PLAYWRIGHT_BROWSERS_PATH Does

When you run \`playwright install\` (Node) or \`playwright install\` via the Python package, Playwright fetches a specific, version-pinned build of each browser. Those builds are large (hundreds of megabytes total) and are **not** the same as the Chrome or Firefox you have installed for everyday browsing — Playwright ships its own patched builds to guarantee deterministic automation.

By default Playwright stores those builds in a **global cache directory** outside your project, so that multiple projects on the same machine share one copy. \`PLAYWRIGHT_BROWSERS_PATH\` overrides that location. At **install time** it tells the installer where to put the binaries. At **runtime** it tells the library where to find them. The crucial rule: the value used when you ran \`playwright install\` must match the value present when your tests launch a browser. A mismatch is the number-one cause of "browser not found" errors.

\`\`\`bash
# Install browsers into a custom directory
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright install

# Later, the SAME variable must be set when running tests
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright test
\`\`\`

## Default Install Locations Per OS

When \`PLAYWRIGHT_BROWSERS_PATH\` is unset, Playwright uses a per-user cache directory that follows each platform's conventions. Knowing the exact path is essential for debugging and for warming caches.

| Operating System | Default browsers directory |
|---|---|
| Linux | \`~/.cache/ms-playwright\` |
| macOS | \`~/Library/Caches/ms-playwright\` |
| Windows | \`%USERPROFILE%\\AppData\\Local\\ms-playwright\` |

Inside that directory you will see version-stamped subfolders such as \`chromium-1140\`, \`firefox-1465\`, and \`webkit-2090\`. The numeric suffix is Playwright's internal browser revision, not the public browser version, and it changes with each Playwright release — which is exactly why upgrading Playwright re-downloads browsers.

\`\`\`bash
# Inspect what is currently cached on Linux
ls -la ~/.cache/ms-playwright

# On macOS
ls -la ~/Library/Caches/ms-playwright

# On Windows (PowerShell)
Get-ChildItem "$env:USERPROFILE\\AppData\\Local\\ms-playwright"
\`\`\`

## The Accepted Values

\`PLAYWRIGHT_BROWSERS_PATH\` accepts three categories of value, and each has a distinct meaning. This is the table to bookmark.

| Value | Meaning |
|---|---|
| _(unset)_ | Use the per-user global cache (see default paths table above). Recommended for local dev. |
| \`0\` | Install browsers **inside the package's own \`node_modules\`** (Node) or the Python package directory. Makes the install self-contained and relocatable with the package. |
| Absolute path, e.g. \`/opt/ms-playwright\` | Install and load browsers from that exact directory. Use for shared CI caches, Docker, and locked-down environments. |

A few important notes about these values:

- The value must be an **absolute path** when you specify a directory. Relative paths are not reliable because Playwright resolves the location at multiple points in its lifecycle.
- \`PLAYWRIGHT_BROWSERS_PATH=0\` is special-cased; it is not interpreted as a directory named "0".
- The variable affects **all three browsers** at once; you cannot point Chromium and WebKit at different roots.

## Value 0: Install Into node_modules

Setting \`PLAYWRIGHT_BROWSERS_PATH=0\` tells Playwright to keep the browser binaries next to the library code rather than in a shared cache. This is the pattern you want when you are **bundling Playwright into a deployable artifact** — a serverless function, a Docker layer that copies \`node_modules\`, or an Electron app — because the browsers travel with the package and there is no external directory to provision.

\`\`\`bash
# Node: browsers land under node_modules/playwright-core/.local-browsers
PLAYWRIGHT_BROWSERS_PATH=0 npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
\`\`\`

\`\`\`bash
# Python: browsers land inside the playwright package directory
PLAYWRIGHT_BROWSERS_PATH=0 pip install playwright
PLAYWRIGHT_BROWSERS_PATH=0 python -m playwright install chromium
\`\`\`

The trade-off: every project gets its own copy of the browsers, so disk usage multiplies if you have many projects. For a single deployable, that is exactly what you want; for a developer laptop with ten repos, the default shared cache is more economical.

## Setting a Custom Shared Path

A common enterprise pattern is to put browsers in a system-wide directory like \`/opt/ms-playwright\` so that every user and every CI runner on a build host shares one copy, and so the path is predictable for cleanup and disk-quota policies.

\`\`\`bash
# Provision once, as root or in the image build
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
npx playwright install --with-deps
chmod -R a+rx /opt/ms-playwright
\`\`\`

Then make the variable available to every shell and process that runs tests. On Linux you can put it in \`/etc/environment\` or a profile script; in CI you set it as a pipeline-level variable so both the install step and the test step inherit it.

\`\`\`typescript
// playwright.config.ts — you do NOT set the path here; it is read from env.
// But you can assert it is present to fail fast with a clear message.
import { defineConfig } from '@playwright/test';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  console.warn(
    'PLAYWRIGHT_BROWSERS_PATH is not set — using the per-user default cache.'
  );
}

export default defineConfig({
  testDir: './tests',
  use: { headless: true },
});
\`\`\`

## The Python "Set Before Import" Gotcha

In Python there is a subtle but critical ordering requirement: **\`PLAYWRIGHT_BROWSERS_PATH\` must be set before the \`playwright\` module is imported**. Playwright reads the variable when the package initializes its browser-path resolution. If you set the variable in Python code *after* importing, the value is ignored and Playwright has already locked in the default location.

\`\`\`python
# CORRECT: set the variable before importing playwright
import os
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/ms-playwright"

from playwright.sync_api import sync_playwright  # import AFTER setting env

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com")
    print(page.title())
    browser.close()
\`\`\`

\`\`\`python
# WRONG: the import happens before the env var is set, so it is ignored
from playwright.sync_api import sync_playwright
import os
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/ms-playwright"  # too late!
\`\`\`

The cleanest fix is to **set the variable in the shell or process environment** rather than in Python code at all. That sidesteps the import-ordering problem entirely and is also how CI systems naturally inject configuration. The Node.js binding does not have this ordering sensitivity to the same degree, but setting the variable in the environment is the recommended approach in both runtimes.

## Skipping the Browser Download

Sometimes you want to install the Playwright **library** without downloading browsers at all — for example in a base Docker layer where the browsers will be provided separately, or when you only need the Playwright API to drive an already-installed browser channel. The variable for that is \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD\`.

| Variable | Effect |
|---|---|
| \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\` | \`npm install\` / \`pip install\` installs the package but downloads **no** browser binaries. |
| \`PLAYWRIGHT_BROWSERS_PATH=0\` | Install browsers into the package directory (self-contained). |
| \`PLAYWRIGHT_DOWNLOAD_HOST\` | Override the CDN host browsers are fetched from (air-gapped mirrors). |

\`\`\`bash
# Install the library without browsers, then add only Chromium later
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
npx playwright install chromium
\`\`\`

This pairs naturally with \`PLAYWRIGHT_BROWSERS_PATH\`: skip the automatic download during dependency install, then run an explicit \`playwright install\` step that respects your custom path and installs only the browsers you actually use.

## Using It in Docker

Docker is where \`PLAYWRIGHT_BROWSERS_PATH\` earns its keep. The goal is a small, reproducible image where the browsers are baked into a known layer and the OS-level dependencies are present. The official \`mcr.microsoft.com/playwright\` image already does this for you, but when you build your own, set the path explicitly.

\`\`\`dockerfile
FROM node:20-bookworm-slim

# Put browsers in a stable, well-known directory
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Install browsers AND their system dependencies into the ENV path
RUN npx playwright install --with-deps chromium

COPY . .
CMD ["npx", "playwright", "test"]
\`\`\`

Because \`ENV\` makes the variable part of the image, both the build-time \`playwright install\` and the runtime \`playwright test\` see the same value — no mismatch. The \`--with-deps\` flag installs the Linux shared libraries the browsers need (fonts, audio, graphics), which is the second most common source of failures in containers.

If you are debugging mobile rendering in containers, the same headless setup powers device emulation; see our guide to [Playwright mobile emulation](/blog/playwright-mobile-emulation) for the viewport and user-agent details.

## Caching Browsers in CI

Re-downloading hundreds of megabytes of browsers on every CI run is slow and wasteful. The fix is to set \`PLAYWRIGHT_BROWSERS_PATH\` to a stable, cacheable directory and key the cache on your Playwright version. Here is a complete GitHub Actions example.

\`\`\`yaml
name: e2e
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      PLAYWRIGHT_BROWSERS_PATH: \${{ github.workspace }}/pw-browsers
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      # Read the installed Playwright version to use as a cache key
      - name: Get Playwright version
        id: pw
        run: echo "version=$(npm ls @playwright/test --json | node -e 'let d=JSON.parse(require(\"fs\").readFileSync(0));console.log(d.dependencies[\"@playwright/test\"].version)')" >> "$GITHUB_OUTPUT"

      - name: Cache browsers
        id: cache
        uses: actions/cache@v4
        with:
          path: \${{ github.workspace }}/pw-browsers
          key: playwright-\${{ runner.os }}-\${{ steps.pw.outputs.version }}

      # Only download when the cache missed; --with-deps still needed for OS libs
      - name: Install browsers
        if: steps.cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      # On a cache hit, OS deps may still be missing; install just those
      - name: Install OS dependencies
        if: steps.cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - run: npx playwright test
\`\`\`

The two non-obvious details: **key the cache on the Playwright version** (browser revisions change with each release, so a stale cache silently breaks), and **still run \`install-deps\` on a cache hit** because the cache stores browser binaries but not the apt packages they depend on. For more recent CI ergonomics and reporter changes, see [what's new in Playwright 2026](/blog/whats-new-in-playwright-2026).

## Troubleshooting Browser-Not-Found Errors

Almost every \`Executable doesn't exist at <path>\` error comes down to one of these root causes. Work through them in order.

\`\`\`text
browserType.launch: Executable doesn't exist at
/home/runner/.cache/ms-playwright/chromium-1140/chrome-linux/chrome
\`\`\`

1. **Install ran with a different path than the test.** If you exported \`PLAYWRIGHT_BROWSERS_PATH\` only in the install step, the test step falls back to the default and looks in the wrong place. Set the variable at the job/pipeline level so every step inherits it.
2. **You never ran \`playwright install\`.** Installing the npm/pip package does not always download browsers (especially with \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\`). Run \`npx playwright install\` or \`python -m playwright install\`.
3. **Playwright was upgraded but browsers were not reinstalled.** New version, new browser revision, old cache. Re-run \`playwright install\`.
4. **Python set the env var after import.** Move the assignment before the import, or set it in the shell.
5. **Permissions.** A shared \`/opt\` path installed as root but read as an unprivileged user needs \`chmod -R a+rx\`.

\`\`\`bash
# Fast diagnostic: print where Playwright thinks browsers live, then list them
node -e "console.log(require('playwright-core').chromium.executablePath())"
ls -la "\${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
\`\`\`

\`\`\`python
# Python equivalent diagnostic
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    print(p.chromium.executable_path)
\`\`\`

If the printed path and the directory listing disagree, you have found your mismatch. For broader testing setup beyond browser binaries, browse our [QA skills directory](/skills) for ready-to-use Playwright configurations and agent skills.

## Behavior Differences Between Python and Node.js

Although \`PLAYWRIGHT_BROWSERS_PATH\` works in both runtimes, the two bindings differ in subtle ways that trip people up when they move a setup from one stack to the other.

In **Node.js**, the variable is read by the \`playwright-core\` package at the moment a browser type's executable path is resolved, which happens lazily when you launch. Because Node modules are resolved at \`require\`/\`import\` time but the path lookup is deferred, you have a little more slack — setting \`process.env.PLAYWRIGHT_BROWSERS_PATH\` early in a setup file usually works. Still, the safest place is the shell environment.

In **Python**, the resolution is bound earlier to module initialization, which is the source of the "set before import" rule documented above. The Python CLI is invoked as \`python -m playwright\` rather than a standalone \`playwright\` binary, so wrapper scripts that hard-code a \`playwright\` executable on \`PATH\` may not exist in a Python-only environment.

\`\`\`bash
# Node CLI entry point
npx playwright install

# Python CLI entry point — note the module invocation
python -m playwright install
\`\`\`

A second difference: the Python package keeps a small \`driver\` (a bundled Node.js runtime plus the Playwright server) inside the package, but the **browser binaries** it manages still obey \`PLAYWRIGHT_BROWSERS_PATH\` identically. So a Python and a Node project on the same host can safely share one custom browsers directory, provided both were populated by compatible Playwright versions.

## Air-Gapped and Offline Installs

In restricted networks that cannot reach the public download CDN, you combine \`PLAYWRIGHT_BROWSERS_PATH\` with \`PLAYWRIGHT_DOWNLOAD_HOST\` (or its per-browser variants) to fetch from an internal mirror, and you pre-stage the binaries so production hosts never download at all.

\`\`\`bash
# Point at an internal mirror that serves the Playwright browser archives
export PLAYWRIGHT_DOWNLOAD_HOST=https://mirror.internal.example.com
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
npx playwright install --with-deps
\`\`\`

For fully offline runners, the usual pattern is to install browsers once on a machine that *does* have network access, then copy the entire \`PLAYWRIGHT_BROWSERS_PATH\` directory into the air-gapped image as a tarball. Because the directory is self-contained and version-stamped, restoring it on a matching OS and architecture is enough; the runner simply needs the same \`PLAYWRIGHT_BROWSERS_PATH\` value so it looks in the staged location.

\`\`\`bash
# On the connected machine
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright install chromium
tar czf pw-browsers.tgz -C /opt ms-playwright

# On the air-gapped machine
tar xzf pw-browsers.tgz -C /opt
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
npx playwright test   # finds browsers, downloads nothing
\`\`\`

Remember the binaries are platform-specific: a tarball built on Ubuntu x64 will not run on Alpine, macOS, or ARM. Build one archive per target platform.

## Verifying and Cleaning Up Your Cache

Over time, upgrading Playwright leaves stale browser revisions behind in the cache, quietly consuming gigabytes. Playwright ships commands to inspect and prune them, and they all respect \`PLAYWRIGHT_BROWSERS_PATH\`.

\`\`\`bash
# Show the resolved browser location and installed builds
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright install --dry-run

# Remove browser builds that the current Playwright version no longer needs
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright uninstall

# Remove ALL Playwright browsers under the resolved path
PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright npx playwright uninstall --all
\`\`\`

The \`--dry-run\` flag is especially handy in CI diagnostics: it prints exactly which directory Playwright will use and which builds it expects, without downloading anything, so you can confirm the path resolution before a real run. For a deeper test-hygiene workflow that includes cache management alongside fixtures and reporters, the [QA skills directory](/skills) has reusable maintenance skills.

## Quick Recipe Reference

A condensed cheat sheet for the most common scenarios.

| Scenario | Setting |
|---|---|
| Local development | Leave \`PLAYWRIGHT_BROWSERS_PATH\` unset |
| Self-contained deployable | \`PLAYWRIGHT_BROWSERS_PATH=0\` |
| Shared CI cache | \`PLAYWRIGHT_BROWSERS_PATH=<workspace>/pw-browsers\` + version-keyed cache |
| System-wide install | \`PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright\` + \`chmod a+rx\` |
| Install library only | \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\` |
| Air-gapped network | \`PLAYWRIGHT_DOWNLOAD_HOST=<mirror>\` + custom path |

If you are evaluating Playwright against other tooling for API and end-to-end coverage, our [Postman vs Playwright](/blog/postman-vs-playwright) comparison covers where each fits.

## Frequently Asked Questions

### What is PLAYWRIGHT_BROWSERS_PATH used for?

It controls where Playwright downloads and looks for its bundled browser binaries (Chromium, Firefox, WebKit). At install time it sets the destination directory; at runtime it tells the library where to load browsers from. The value used during \`playwright install\` must match the value present when tests launch, or you get a "browser not found" error.

### Where does Playwright install browsers by default?

When the variable is unset, Playwright uses a per-user cache: \`~/.cache/ms-playwright\` on Linux, \`~/Library/Caches/ms-playwright\` on macOS, and \`%USERPROFILE%\\AppData\\Local\\ms-playwright\` on Windows. Inside you will find version-stamped folders like \`chromium-1140\`. Multiple projects on one machine share this directory to avoid duplicate downloads.

### What does PLAYWRIGHT_BROWSERS_PATH=0 mean?

Setting it to \`0\` installs the browser binaries inside the package itself — under \`node_modules\` for Node.js or the package directory for Python — instead of the shared global cache. This makes the installation self-contained and relocatable, which is ideal for bundling Playwright into Docker images, serverless functions, or Electron apps where browsers must travel with the code.

### Why is PLAYWRIGHT_BROWSERS_PATH ignored in my Python script?

In Python the variable is read when the \`playwright\` module is first imported. If you set \`os.environ\` *after* the import, Playwright has already resolved the default path and ignores your value. Set the variable before importing playwright, or better, set it in the shell or process environment so the import order never matters.

### How do I cache Playwright browsers in GitHub Actions?

Point \`PLAYWRIGHT_BROWSERS_PATH\` at a workspace directory, then use \`actions/cache\` with a key based on your installed Playwright version. On a cache miss run \`playwright install --with-deps\`; on a hit still run \`playwright install-deps\` because the cache stores browser binaries but not the OS-level apt packages they require.

### What is the difference between PLAYWRIGHT_BROWSERS_PATH and PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD?

\`PLAYWRIGHT_BROWSERS_PATH\` chooses *where* browsers are stored. \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\` skips the automatic browser download during package install entirely, leaving you to run \`playwright install\` manually later. They are often combined: skip the auto-download, then run an explicit install into your chosen custom path.

### How do I fix "Executable doesn't exist" in Playwright?

Verify the install and run steps use the same \`PLAYWRIGHT_BROWSERS_PATH\`, run \`playwright install\` if you only installed the package, re-run it after upgrading Playwright (browser revisions change), set the variable before importing in Python, and fix permissions on shared directories with \`chmod -R a+rx\`. Print \`chromium.executablePath()\` to see where Playwright is actually looking.

### Can I share one browser cache across multiple machines?

Yes, by pointing \`PLAYWRIGHT_BROWSERS_PATH\` at a shared mount or a restored CI cache, as long as the OS and architecture match and the directory was populated by the same Playwright version. Browser builds are platform-specific, so a Linux cache cannot be reused on macOS or Windows, and a cache from a different Playwright version will not match the expected browser revision.

## Conclusion

\`PLAYWRIGHT_BROWSERS_PATH\` is small but load-bearing: it determines whether your tests find their browsers in local development, CI, Docker, and locked-down enterprise environments. Remember the three values (unset, \`0\`, absolute path), keep install and run consistent, set it before importing in Python, and version-key your CI caches. Master these and "Executable doesn't exist" disappears from your logs for good.

Ready to go further? Explore the [QASkills directory](/skills) for production-ready Playwright skills, fixtures, and CI configurations you can drop straight into your test suite.
`,
};
