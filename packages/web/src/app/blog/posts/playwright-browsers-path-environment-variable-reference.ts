import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PLAYWRIGHT_BROWSERS_PATH: Complete Environment Variable Reference',
  description:
    'Canonical reference for PLAYWRIGHT_BROWSERS_PATH and Playwright browser env vars. Exact values, default install paths per OS, PLAYWRIGHT_BROWSERS_PATH=0 meaning, and Python notes.',
  date: '2026-06-17',
  category: 'Reference',
  content: `
# PLAYWRIGHT_BROWSERS_PATH: Complete Environment Variable Reference

\`PLAYWRIGHT_BROWSERS_PATH\` is the single most important environment variable for controlling where Playwright downloads and looks for its bundled browser binaries (Chromium, Firefox, and WebKit). Get it wrong and you see the dreaded "Executable doesn't exist" error; get it right and you can share a browser cache across CI jobs, bake browsers into a Docker layer, or pin a deterministic install directory for an offline machine.

This page is a dry, canonical reference. It documents every Playwright browser-related environment variable, the exact accepted values, the default download locations on Windows, macOS, and Linux, what \`PLAYWRIGHT_BROWSERS_PATH=0\` actually means, the Python-specific behavior, and the ordering rules that decide which value wins. Everything here is verified against the Playwright runtime behavior for both the Node.js (\`@playwright/test\`) and Python (\`playwright\`) packages.

If you are new to the framework, start with our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) and the [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026), then come back here when you need the exact env-var semantics. You can also browse ready-made automation [skills](/skills) that bundle these install recipes.

---

## What PLAYWRIGHT_BROWSERS_PATH Does

When you run \`npx playwright install\` (Node) or \`playwright install\` (Python), Playwright downloads browser builds into a cache directory. At test runtime, the same lookup logic resolves the executable path. \`PLAYWRIGHT_BROWSERS_PATH\` overrides the default cache directory for both operations.

The variable is read at two distinct moments:

1. **Install time** — decides where binaries are written.
2. **Run time** — decides where Playwright looks for the binaries.

Because both phases read the variable independently, the value MUST be identical in both environments. The most common real-world failure is installing browsers in a Dockerfile with one value and running tests with a different (or unset) value, so the runtime lookup misses the binaries.

> Critical rule: \`PLAYWRIGHT_BROWSERS_PATH\` must be set before importing or launching Playwright. Setting it after \`require('@playwright/test')\` / \`from playwright.sync_api import sync_playwright\` has no effect on an already-resolved process.

## Accepted Values Reference

\`PLAYWRIGHT_BROWSERS_PATH\` accepts three kinds of values. The table below is the canonical reference.

| Value | Meaning | Typical use case |
|---|---|---|
| (unset) | Use the per-OS default global cache (see table below) | Local dev machines |
| \`0\` | Install browsers **inside the node_modules** of the Playwright package (relative to the package) | Hermetic, project-local installs; serverless bundles |
| absolute path (e.g. \`/opt/ms-playwright\`) | Install and resolve browsers from that exact directory | Docker, CI cache, shared runners |

A relative path is not recommended — Playwright resolves it relative to the current working directory at the moment of install/run, which is fragile. Always use an absolute path or the literal \`0\`.

## PLAYWRIGHT_BROWSERS_PATH=0 Meaning

\`PLAYWRIGHT_BROWSERS_PATH=0\` is a special sentinel. It does **not** mean "disable downloads." It means: store the browsers **next to the Playwright package itself**, inside \`node_modules/playwright-core/.local-browsers\` (Node) or inside the installed Python package directory.

\`\`\`bash
# Node: browsers land inside node_modules, not the global cache
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
\`\`\`

This is the right choice when you want the browser binaries to be fully self-contained within the project tree — for example, when zipping a deployment artifact for AWS Lambda or copying a project folder to an air-gapped machine. The trade-off is that every project gets its own copy of every browser (hundreds of MB each), so it defeats cross-project cache sharing.

| Setting | Where browsers go | Shared across projects? |
|---|---|---|
| unset | Global OS cache dir | Yes |
| \`0\` | Inside the package's \`node_modules\` | No (per project) |
| \`/custom/path\` | The custom absolute directory | Yes, if all consumers point there |

## Default Install Locations per OS

When \`PLAYWRIGHT_BROWSERS_PATH\` is unset, Playwright uses an OS-specific global cache directory. The folder name is \`ms-playwright\`. These are the exact defaults:

| OS | Default browsers path |
|---|---|
| Windows | \`%USERPROFILE%\\\\AppData\\\\Local\\\\ms-playwright\` |
| macOS | \`~/Library/Caches/ms-playwright\` |
| Linux | \`~/.cache/ms-playwright\` |

Inside that directory you will find versioned folders such as \`chromium-1187\`, \`firefox-1489\`, and \`webkit-2090\`. The numbers are Playwright's internal browser revisions, not the upstream Chrome/Firefox version numbers. Each Playwright release pins specific revisions, which is why you should run \`playwright install\` after every Playwright upgrade.

\`\`\`bash
# Inspect what is actually installed (Linux/macOS)
ls -1 ~/.cache/ms-playwright
# chromium-1187
# chromium_headless_shell-1187
# ffmpeg-1011
# firefox-1489
# webkit-2090
\`\`\`

## ms-playwright Env Var: The Full Set

Beyond \`PLAYWRIGHT_BROWSERS_PATH\`, several related "ms-playwright" environment variables control download behavior. This is the complete canonical list.

| Environment variable | Purpose | Example value |
|---|---|---|
| \`PLAYWRIGHT_BROWSERS_PATH\` | Override the browsers cache directory | \`/opt/ms-playwright\` |
| \`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD\` | Skip downloading browsers on \`npm install\` | \`1\` |
| \`PLAYWRIGHT_DOWNLOAD_HOST\` | Override the CDN host for all browser downloads | \`https://mirror.internal/pw\` |
| \`PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST\` | Per-browser CDN override (Chromium) | \`https://mirror.internal/cr\` |
| \`PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST\` | Per-browser CDN override (Firefox) | \`https://mirror.internal/ff\` |
| \`PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST\` | Per-browser CDN override (WebKit) | \`https://mirror.internal/wk\` |
| \`PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT\` | Download socket timeout in ms | \`60000\` |

The per-browser host variables take precedence over the generic \`PLAYWRIGHT_DOWNLOAD_HOST\`. Use these for corporate mirrors or behind a firewall that blocks the default \`playwright.azureedge.net\` / \`cdn.playwright.dev\` hosts.

## "Must Be Set Before Importing Playwright"

A frequent error message and documentation note is that these variables "must be set before importing Playwright." This is literal. Playwright reads the environment exactly once during module initialization to resolve the browser registry. If you mutate \`process.env\` (Node) or \`os.environ\` (Python) after import, the already-constructed registry ignores it.

Wrong (Node):

\`\`\`javascript
const { chromium } = require('playwright');
process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/ms-playwright'; // too late
\`\`\`

Right (Node) — set it in the shell or before any import:

\`\`\`bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
node run-tests.js
\`\`\`

Or, if you must set it in code, do it before requiring the package:

\`\`\`javascript
process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/ms-playwright';
const { chromium } = require('playwright'); // now reads the value
\`\`\`

## PLAYWRIGHT_BROWSERS_PATH in Python

The Python package (\`pip install playwright\`) honors exactly the same variable with identical semantics. The only difference is the install command and the package location used by \`PLAYWRIGHT_BROWSERS_PATH=0\`.

\`\`\`bash
# Install the Python package, then the browsers
pip install playwright
playwright install            # uses default ~/.cache/ms-playwright on Linux

# Pin a custom directory (must match at runtime)
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
playwright install chromium
\`\`\`

In Python you set the variable via the shell or \`os.environ\` before importing:

\`\`\`python
import os
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/ms-playwright"

# Import AFTER setting the env var
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com")
    print(page.title())
    browser.close()
\`\`\`

For "playwright browsers path python" the rule is the same: the value at \`playwright install\` time and the value at \`sync_playwright()\` time must match, and it must be set before the import. If your test runner (pytest) loads plugins that import Playwright early, set the variable in the shell or in a \`conftest.py\` that runs before collection. See our broader [Selenium vs Playwright comparison](/blog/selenium-vs-playwright-2026) for how this differs from WebDriver's binary management.

## Docker and CI Patterns

The canonical Docker pattern fixes the browsers in a system directory so the install layer is cached and the runtime container finds them:

\`\`\`dockerfile
FROM node:20-bookworm

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Browsers install into /opt/ms-playwright and are cached in this layer
RUN npx playwright install --with-deps chromium

COPY . .
CMD ["npx", "playwright", "test"]
\`\`\`

For GitHub Actions, cache the directory across runs:

\`\`\`yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: pw-\${{ runner.os }}-\${{ hashFiles('package-lock.json') }}

- name: Install browsers
  run: npx playwright install --with-deps
\`\`\`

Note the cache \`path\` matches the unset default. If you set \`PLAYWRIGHT_BROWSERS_PATH\` to a custom value, the cache \`path\` and the env var must agree.

## Offline and Air-Gapped Installs

On machines with no internet access, the browsers cannot be downloaded at run time, so you must pre-stage the \`ms-playwright\` directory and point \`PLAYWRIGHT_BROWSERS_PATH\` at it. The workflow is: install on a connected machine into a known directory, copy that directory to the offline host, and export the same env var there.

\`\`\`bash
# On a connected machine
export PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-cache
npx playwright install chromium firefox webkit
tar czf pw-cache.tgz -C /tmp pw-cache

# Transfer pw-cache.tgz to the air-gapped host, then:
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
mkdir -p /opt/ms-playwright
tar xzf pw-cache.tgz -C /opt --strip-components=1
\`\`\`

Because the browser revisions are pinned to the Playwright version, the connected machine and the air-gapped host MUST run the exact same Playwright version. A version mismatch means the offline host looks for a revision folder that is not in the copied cache, producing the familiar "Executable doesn't exist" error. Pin the version in \`package.json\` (no caret) for both environments.

| Step | Connected machine | Air-gapped host |
|---|---|---|
| Playwright version | Must match | Must match |
| \`PLAYWRIGHT_BROWSERS_PATH\` | Any known dir | Final resolved dir |
| OS dependencies | n/a | Install via package manager |

Note that \`--with-deps\` installs OS-level shared libraries (fonts, codecs) that browsers need. On an air-gapped Linux host you must install those system packages separately, since the browser binaries alone will not launch without them.

## Resolution Order and Precedence

When Playwright needs a browser executable, it resolves in this order:

1. An explicit \`executablePath\` passed to \`launch()\` — highest priority, bypasses everything.
2. \`PLAYWRIGHT_BROWSERS_PATH\` env var (including the \`0\` sentinel).
3. The per-OS default global cache.

\`\`\`javascript
// executablePath wins over PLAYWRIGHT_BROWSERS_PATH entirely
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome-stable',
});
\`\`\`

This precedence is why a stray \`executablePath\` in a config can mask an otherwise-correct \`PLAYWRIGHT_BROWSERS_PATH\` setup. When debugging "wrong browser launched," check \`launch()\` options first.

## Monorepos and Multiple Playwright Versions

In a monorepo, different packages can depend on different Playwright versions, and each version pins different browser revisions. If every package shares one \`PLAYWRIGHT_BROWSERS_PATH\`, that single directory simply accumulates the union of all required revisions, which is fine — Playwright resolves the exact revision its version expects and ignores the others. Problems only arise when a CI step prunes the cache for one package and removes revisions another package still needs.

\`\`\`bash
# Shared cache is safe: each package resolves its own pinned revision
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

# Install for both packages into the shared dir
pnpm --filter @app/web exec playwright install chromium
pnpm --filter @app/admin exec playwright install chromium
\`\`\`

The safe rule for monorepos: install for every package before running any tests, and avoid \`playwright uninstall --all\` mid-pipeline because it removes revisions other packages may still reference. If you must isolate, give each package its own \`PLAYWRIGHT_BROWSERS_PATH\` directory.

| Strategy | Pro | Con |
|---|---|---|
| Shared cache dir | Smaller total disk, faster | One prune can break a sibling |
| Per-package dir | Full isolation | Duplicate downloads, more disk |
| \`PLAYWRIGHT_BROWSERS_PATH=0\` | Hermetic per package | Largest disk use of all |

## Quick Decision Guide

Use this cheat sheet to pick a value without re-reading the whole page. For a single developer laptop, leave the variable unset and rely on the per-OS default cache. For Docker images and shared CI runners, set an absolute path like \`/opt/ms-playwright\` and install during the image build so the layer is cached. For serverless bundles or air-gapped copies where the browsers must travel with the project, use \`PLAYWRIGHT_BROWSERS_PATH=0\`. In every case, set the value before importing Playwright and keep it identical between the install and run phases. These three rules cover the overwhelming majority of real configurations and prevent the most common "Executable doesn't exist" failures teams hit in production pipelines.

## Common Errors and Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| "Executable doesn't exist at ..." | Install path != runtime path | Set the same \`PLAYWRIGHT_BROWSERS_PATH\` in both phases |
| Browsers re-download every CI run | Cache path mismatch | Align cache \`path\` with the env var |
| Download blocked / timeout | Firewall blocks default CDN | Set \`PLAYWRIGHT_DOWNLOAD_HOST\` to a mirror |
| Huge node_modules | \`PLAYWRIGHT_BROWSERS_PATH=0\` | Use a shared absolute path instead |
| Env var "ignored" | Set after import | Export it before the process / import |

## Verifying the Active Browsers Path

When a setup misbehaves, the fastest diagnosis is to ask Playwright exactly where it thinks the browsers live. The CLI prints the resolved path, the installed browser revisions, and whether each one is present.

\`\`\`bash
# Node: print the resolved install location and what is installed
npx playwright install --dry-run

# Show the Playwright version (browser revisions are pinned to it)
npx playwright --version
\`\`\`

You can also read the value at runtime to confirm the process actually sees it:

\`\`\`javascript
console.log('PLAYWRIGHT_BROWSERS_PATH =', process.env.PLAYWRIGHT_BROWSERS_PATH ?? '(unset, using default)');
\`\`\`

In Python the equivalent check is a one-liner before you import Playwright:

\`\`\`python
import os
print("PLAYWRIGHT_BROWSERS_PATH =", os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "(unset)"))
\`\`\`

If the printed value at runtime differs from what you set during install, you have found the bug. The two phases must agree byte for byte — a trailing slash or a different drive letter on Windows counts as a mismatch.

## Installing Only the Browsers You Need

Downloading all three engines plus the headless shell and ffmpeg consumes well over a gigabyte. In CI you usually only need one engine. Combine selective installs with \`PLAYWRIGHT_BROWSERS_PATH\` to keep the cache small and the layer fast.

\`\`\`bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

# Install just Chromium and its OS dependencies
npx playwright install --with-deps chromium

# Or the lightweight headless shell for CI-only runs
npx playwright install chromium-headless-shell
\`\`\`

| Install target | Approx. size | Use case |
|---|---|---|
| \`chromium\` | ~170 MB | Most CI suites |
| \`chromium-headless-shell\` | ~100 MB | Headless-only CI |
| \`firefox\` | ~85 MB | Cross-browser coverage |
| \`webkit\` | ~70 MB | Safari-equivalent coverage |
| (all, default) | ~1+ GB | Full local development |

The headless shell is a smaller Chromium build with no UI surface. If your tests never run headed, installing only \`chromium-headless-shell\` shrinks both the cache directory under \`PLAYWRIGHT_BROWSERS_PATH\` and the Docker image.

## Cleaning and Re-Installing the Cache

Because each Playwright version pins specific revisions, old revisions accumulate in the \`ms-playwright\` directory after upgrades. Playwright provides a prune command, and you can always delete the directory to force a clean state.

\`\`\`bash
# Remove browser builds that the current Playwright version no longer uses
npx playwright uninstall --all

# Nuclear option: delete the whole cache, then reinstall
rm -rf "\$PLAYWRIGHT_BROWSERS_PATH"   # or ~/.cache/ms-playwright when unset
npx playwright install --with-deps chromium
\`\`\`

A growing \`ms-playwright\` folder after several upgrades is normal — prune it periodically. When debugging a corrupted download, deleting the directory and reinstalling is the most reliable reset.

## How PLAYWRIGHT_BROWSERS_PATH Interacts With Channels

Playwright can also drive branded, system-installed browsers via the \`channel\` option (\`chrome\`, \`msedge\`, \`chrome-beta\`, etc.). When you use a channel, Playwright launches the OS-installed browser rather than its bundled build, so \`PLAYWRIGHT_BROWSERS_PATH\` is irrelevant for that launch.

\`\`\`javascript
// Uses system-installed Google Chrome, NOT the bundled Chromium.
// PLAYWRIGHT_BROWSERS_PATH does not apply here.
const browser = await chromium.launch({ channel: 'chrome' });
\`\`\`

This matters when teams mix bundled and channel browsers: the env var only governs the bundled engines. If a channel browser is missing you must install it through the OS or \`npx playwright install chrome\`, which downloads the stable channel build into the cache directory.

## Common Errors and Fixes

## Frequently Asked Questions

### What does PLAYWRIGHT_BROWSERS_PATH=0 mean?

\`PLAYWRIGHT_BROWSERS_PATH=0\` tells Playwright to store browser binaries inside the package's own \`node_modules\` directory (specifically \`playwright-core/.local-browsers\`) instead of the global OS cache. It is a self-contained, project-local install used for serverless bundles and air-gapped copies. It does not disable downloads.

### Where does Playwright install browsers by default?

By default Playwright installs to \`%USERPROFILE%\\\\AppData\\\\Local\\\\ms-playwright\` on Windows, \`~/Library/Caches/ms-playwright\` on macOS, and \`~/.cache/ms-playwright\` on Linux. The directory contains versioned subfolders like \`chromium-1187\` keyed to Playwright's internal browser revisions.

### How do I set PLAYWRIGHT_BROWSERS_PATH for Python?

Set it as a shell environment variable or via \`os.environ\` before importing Playwright, then run \`playwright install\`. The Python package honors identical semantics to Node. The value at install time and at \`sync_playwright()\` runtime must match exactly, otherwise you get an "Executable doesn't exist" error.

### Why must PLAYWRIGHT_BROWSERS_PATH be set before importing Playwright?

Playwright reads the browser-registry environment variables once during module initialization. After import, the registry is fixed, so mutating \`process.env\` or \`os.environ\` later has no effect. Set the variable in your shell, your CI environment, or before the \`require\`/\`import\` statement.

### What is the ms-playwright folder?

\`ms-playwright\` is the name of Playwright's global browser cache directory. It lives under the OS cache path and holds versioned browser builds (Chromium, Firefox, WebKit), the headless shell, and the bundled ffmpeg used for video recording. You can safely delete it to force a clean re-install.

### Does PLAYWRIGHT_BROWSERS_PATH affect launch with executablePath?

No. An explicit \`executablePath\` passed to \`launch()\` has the highest precedence and bypasses \`PLAYWRIGHT_BROWSERS_PATH\` entirely. The env var only governs the bundled-browser lookup, so a hardcoded \`executablePath\` can silently override your cache configuration.

### How do I share Playwright browsers across CI jobs?

Set \`PLAYWRIGHT_BROWSERS_PATH\` to a fixed absolute directory (or rely on the unset default) and cache that directory between jobs. In GitHub Actions, use \`actions/cache\` with \`path: ~/.cache/ms-playwright\` and a key derived from your lockfile so browsers are restored instead of re-downloaded.

### Can I use a relative path for PLAYWRIGHT_BROWSERS_PATH?

It is technically possible but strongly discouraged. Relative paths resolve against the current working directory at install and run time, which is fragile across CI steps and Docker layers. Always use an absolute path or the literal \`0\` sentinel for predictable behavior.

## Conclusion

\`PLAYWRIGHT_BROWSERS_PATH\` is small but load-bearing: it determines whether your tests can find a browser at all. Memorize three facts and you will never hit the "Executable doesn't exist" error again — the per-OS default lives under \`ms-playwright\`, the value \`0\` means "inside node_modules," and the variable must be set identically at install time and run time, before Playwright is imported.

Ready to put this into practice? Explore production-ready Playwright recipes and install patterns in the [QASkills skills directory](/skills), and deepen your end-to-end testing with the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) and our [API testing complete guide](/blog/api-testing-complete-guide).
`,
};
