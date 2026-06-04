import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PLAYWRIGHT_BROWSERS_PATH: Complete Reference 2026',
  description:
    'Control where Playwright stores browsers with PLAYWRIGHT_BROWSERS_PATH. Set it before import in Python, cache it in CI, and bake it into Docker images.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# PLAYWRIGHT_BROWSERS_PATH: A Complete Reference for 2026

By default, Playwright stores the browser binaries it downloads in a hidden cache directory inside your home folder. That works fine on a single developer machine, but the moment you move to CI, Docker, monorepos, or shared build agents, the default location starts causing problems. CI jobs re-download hundreds of megabytes of browsers on every run because the cache is not where the cache action expects it. Docker layers bloat because browsers land in a path that is hard to copy between stages. Multiple checkouts of the same repo each maintain their own redundant browser copies. The environment variable that fixes all of this is \`PLAYWRIGHT_BROWSERS_PATH\`.

\`PLAYWRIGHT_BROWSERS_PATH\` tells Playwright exactly where to download browsers to and where to look for them at runtime. Point it at a stable, well-known directory and you can cache that directory in CI, copy it cleanly between Docker stages, share it across checkouts, or vendor it for offline installs. It is one of the most important Playwright environment variables to understand, and yet it is also one of the most commonly misused -- especially in Python, where setting it *after* importing Playwright silently has no effect.

This guide is a complete reference to \`PLAYWRIGHT_BROWSERS_PATH\` for 2026. You will learn what it does, the critical rule that it must be set *before* Playwright is imported in Python, how to cache the browser directory in GitHub Actions to skip re-downloads, how to use it cleanly in multi-stage Docker builds, the special values \`0\` and a custom path, and how to verify the browsers landed where you expect. Examples are Python and bash, the two contexts where this variable matters most.

---

## Key Takeaways

- **\`PLAYWRIGHT_BROWSERS_PATH\`** sets both the download destination and the runtime lookup path for Playwright browsers.
- **In Python, set it before \`import\`** -- via \`os.environ\` before importing Playwright, or better, as a real environment variable in your shell.
- **\`PLAYWRIGHT_BROWSERS_PATH=0\`** installs browsers next to the package in \`node_modules\` instead of a shared cache.
- **Caching the path in CI** lets you restore browsers from a previous run and skip the multi-hundred-megabyte download.
- **The path is OS- and architecture-specific** -- a cache from Linux x64 will not work on macOS arm64.

---

## What PLAYWRIGHT_BROWSERS_PATH Controls

Playwright separates the *package* (the npm or pip library) from the *browsers* (the actual Chromium, Firefox, and WebKit builds). The package is small; the browsers are large and pinned per release. \`PLAYWRIGHT_BROWSERS_PATH\` controls where those large browser builds live. It is read at two moments: during \`playwright install\`, to decide where to unpack the downloaded archives, and at test runtime, to decide where to launch browsers from. Because the same variable governs both, it must hold the same value at install time and at run time, or Playwright installs to one place and looks in another.

The default, when the variable is unset, is a per-user cache directory: \`~/.cache/ms-playwright\` on Linux, \`~/Library/Caches/ms-playwright\` on macOS, and \`%USERPROFILE%\\\\AppData\\\\Local\\\\ms-playwright\` on Windows. Setting the variable to an absolute path overrides this. Setting it to the special value \`0\` changes the strategy entirely, putting browsers inside the package directory in \`node_modules\`.

| Value | Where browsers go | Use case |
|---|---|---|
| (unset) | Per-user cache (\`~/.cache/ms-playwright\`) | Single dev machine |
| \`/abs/path\` | That exact directory | CI cache, Docker, shared agents |
| \`0\` | Inside \`node_modules/playwright\` | Bundling browsers with the package |

---

## The Critical Python Rule: Set It Before Import

This is the single most common mistake with \`PLAYWRIGHT_BROWSERS_PATH\` in Python. Playwright reads the variable when its driver module is first imported. If you set \`os.environ['PLAYWRIGHT_BROWSERS_PATH']\` *after* you have already imported \`playwright\`, the value is ignored -- the driver has already resolved the path. The fix is to set it before the import, or, far more reliably, to set it as a genuine environment variable in your shell or CI so it is present the moment Python starts.

Here is the wrong way, which silently fails:

\`\`\`python
# WRONG: Playwright is already imported, so this assignment is too late.
from playwright.sync_api import sync_playwright
import os

os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"  # ignored!

with sync_playwright() as p:
    browser = p.chromium.launch()  # looks in the DEFAULT cache, not /opt
\`\`\`

And the in-code way that works, with the assignment strictly before the import:

\`\`\`python
# CORRECT (in-code): set the env var BEFORE importing playwright.
import os
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"

# Only now import Playwright, so the driver reads the path above.
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()  # uses /opt/pw-browsers
    page = browser.new_page()
    page.goto("https://example.com")
    print(page.title())
    browser.close()
\`\`\`

The most robust approach avoids the ordering trap entirely by exporting the variable in the shell, so it is already in the environment before the Python process starts. This also guarantees that \`playwright install\` and your test run agree on the path:

\`\`\`bash
# Best practice: a real environment variable, set once for the whole session.
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers

# Install browsers into that path
python -m playwright install chromium

# Run tests -- same path is already in the environment
pytest tests/
\`\`\`

If you must set it in code, do it at the very top of your entry point or in \`conftest.py\` before any test module imports Playwright. In pytest, an even cleaner option is to set it in \`pytest.ini\`/\`tox.ini\` via an env plugin or simply in the CI step that invokes pytest.

---

## Verifying Where Browsers Landed

After installing, confirm the browsers actually went to your chosen directory. The \`--dry-run\` flag of the install command prints the resolved install location and what it would download without fetching anything, which is the quickest sanity check:

\`\`\`bash
# Show the resolved browser path and pending downloads without downloading
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python -m playwright install --dry-run
\`\`\`

You can also just inspect the directory. A correctly populated path contains versioned browser folders:

\`\`\`bash
# Confirm browsers exist where you expect
ls /opt/pw-browsers
# chromium-1148  firefox-1467  webkit-2070   (names/versions vary by release)
\`\`\`

If this directory is empty at runtime but your tests try to launch a browser, you will get an "Executable doesn't exist" error pointing at the resolved path -- which immediately tells you the install-time and run-time values of the variable did not match.

---

## Caching Browsers in GitHub Actions

The biggest payoff of \`PLAYWRIGHT_BROWSERS_PATH\` is CI caching. By forcing browsers into a known directory, you can cache that directory across runs and skip the slow download when the Playwright version has not changed. The cache key must include the Playwright version so that upgrading Playwright invalidates the cache and pulls the new browser builds.

\`\`\`yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      # Force browsers into a stable, cacheable directory.
      PLAYWRIGHT_BROWSERS_PATH: \${{ github.workspace }}/pw-browsers
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install Python deps
        run: pip install -r requirements.txt

      - name: Read Playwright version
        id: pw
        run: echo "version=$(python -m playwright --version | awk '{print $2}')" >> "$GITHUB_OUTPUT"

      - name: Cache Playwright browsers
        id: cache
        uses: actions/cache@v4
        with:
          path: \${{ github.workspace }}/pw-browsers
          key: pw-browsers-\${{ runner.os }}-\${{ steps.pw.outputs.version }}

      - name: Install browsers (only on cache miss)
        if: steps.cache.outputs.cache-hit != 'true'
        run: python -m playwright install --with-deps chromium

      - name: Install OS deps (always -- system libs are not cached)
        if: steps.cache.outputs.cache-hit == 'true'
        run: python -m playwright install-deps chromium

      - name: Run tests
        run: pytest tests/
\`\`\`

Two details matter. First, the cache key includes both the OS and the Playwright version, because browser builds are pinned per version and a Linux cache is useless on macOS. Second, even on a cache hit you still need the OS-level dependencies (\`install-deps\`) because those are system packages, not part of the cached browser directory. Caching the browsers but forgetting the system libraries produces confusing launch failures on a cache hit.

---

## Using It in Docker

In Docker, \`PLAYWRIGHT_BROWSERS_PATH\` lets you control which layer browsers live in, which matters for image size and for copying browsers between multi-stage build stages. Setting it to a fixed system path like \`/ms-playwright\` is the common convention, and it is exactly what the official Playwright images do internally.

A single-stage image that installs browsers into a known path:

\`\`\`dockerfile
# Dockerfile -- Python + Playwright with a fixed browser path
FROM python:3.12-slim-bookworm

# Put browsers in a predictable system location.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Browsers download into /ms-playwright; --with-deps adds system libs.
RUN python -m playwright install --with-deps chromium

COPY . .
CMD ["pytest", "tests/"]
\`\`\`

For multi-stage builds where you install browsers in one stage and run tests in a leaner final stage, the fixed path makes the \`COPY --from\` trivial. You copy the whole browser directory across as one line:

\`\`\`dockerfile
# Multi-stage: install browsers once, copy into the runtime image
FROM python:3.12-slim-bookworm AS browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pip install playwright && python -m playwright install chromium

FROM python:3.12-slim-bookworm AS runtime
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Bring the downloaded browsers over from the builder stage.
COPY --from=browsers /ms-playwright /ms-playwright
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Still need the system libraries the browsers depend on at runtime.
RUN python -m playwright install-deps chromium
COPY . .
CMD ["pytest", "tests/"]
\`\`\`

Because both stages declare the same \`PLAYWRIGHT_BROWSERS_PATH\`, the runtime stage finds the copied browsers immediately. As in CI, remember that \`install-deps\` handles the system libraries separately from the browser binaries themselves.

---

## The Special Value 0 and node_modules Bundling

Setting \`PLAYWRIGHT_BROWSERS_PATH=0\` switches Playwright from a shared per-user cache to bundling browsers *inside the package directory* in \`node_modules\`. This is useful when you want browsers to be fully self-contained within a project -- for instance, when packaging a Node application that ships its own browser, or in environments where the home-directory cache is unwritable or wiped between steps.

\`\`\`bash
# Install browsers into node_modules instead of a shared cache
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
# Browsers now live under node_modules/playwright-core/.local-browsers
\`\`\`

The tradeoff is that every project copy gets its own browser set, so disk usage rises if you have many checkouts. For a single self-contained deployment, \`0\` is convenient; for a developer with many repos, the default shared cache (or a single shared absolute path) is more efficient. Note that \`0\` is most relevant to the Node/JavaScript packaging story; Python projects typically prefer an explicit absolute path.

| Strategy | Disk efficiency | Self-containment | Best for |
|---|---|---|---|
| Default shared cache | High | Low | Multiple repos, one dev |
| Absolute path | High (one shared dir) | Medium | CI, Docker, agents |
| \`PLAYWRIGHT_BROWSERS_PATH=0\` | Low (per project) | High | Bundled/packaged apps |

---

## Sharing One Cache Across a Monorepo

In a monorepo or a build agent that checks out many branches, pointing every checkout at a single absolute \`PLAYWRIGHT_BROWSERS_PATH\` avoids redundant browser copies. Each branch's install detects the browsers are already present at that path and skips the download. Set it in the agent's environment or a shared shell profile so every job inherits it.

\`\`\`bash
# On a shared CI agent: one cache for all checkouts and branches
echo 'export PLAYWRIGHT_BROWSERS_PATH=/opt/shared/pw-browsers' >> /etc/profile.d/playwright.sh

# Any job's install becomes a near-instant no-op once populated
python -m playwright install chromium
\`\`\`

The one caveat is concurrency: if two jobs install *different* Playwright versions into the same path simultaneously, they can race. Versioned subfolders inside the cache reduce the risk, but if your agents run mixed Playwright versions in parallel, give each version its own path or fall back to per-job caches.

---

## Setting It in pytest and conftest

Because the "set before import" rule is so easy to violate in Python test suites, the safest place to establish \`PLAYWRIGHT_BROWSERS_PATH\` is *outside* the test code -- in the CI step or shell that launches pytest. But if you genuinely must set it from within the project, the only reliable in-code location is the very top of \`conftest.py\`, before any test module that imports Playwright is collected. Even then, exporting it in the environment is preferred because pytest may import plugins (including \`pytest-playwright\`) early.

\`\`\`python
# conftest.py -- if you must set it in code, do it at the very top,
# before pytest-playwright or any test imports playwright.
import os
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")

# Anything that imports playwright must come AFTER the line above.
\`\`\`

A cleaner alternative for pytest is to set it in the invocation itself, which guarantees it is in the environment before Python even starts and removes any ordering ambiguity:

\`\`\`bash
# Set it inline when invoking pytest -- no import-order pitfalls at all
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers pytest tests/
\`\`\`

The general principle: prefer the environment over code. Every in-code approach is one careless import away from silently breaking, whereas an exported variable is immune to import order entirely.

## GitLab CI and CircleCI Caching

The same caching strategy applies to other CI providers, with provider-specific cache syntax. In GitLab CI, declare the browser path as a job variable and cache that directory keyed on a file that changes with the Playwright version (your lockfile is ideal). The structure mirrors the GitHub Actions approach: cache the directory, install only when missing, and always install system dependencies.

\`\`\`yaml
# .gitlab-ci.yml -- cache the browser directory across pipelines
test:
  image: node:20-bookworm
  variables:
    PLAYWRIGHT_BROWSERS_PATH: "$CI_PROJECT_DIR/pw-browsers"
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - pw-browsers/
  script:
    - npm ci
    - npx playwright install --with-deps chromium
    - npx playwright test
\`\`\`

The lockfile-based cache key is convenient because it invalidates automatically whenever you bump Playwright -- a new Playwright version means a new lockfile hash, which means a fresh cache and a re-download of the matching browsers. This avoids the subtle bug where an upgraded Playwright tries to launch browser builds from an older cached version and fails with an "Executable doesn't exist" error.

| CI provider | Cache mechanism | Recommended key |
|---|---|---|
| GitHub Actions | \`actions/cache\` | OS + Playwright version |
| GitLab CI | \`cache.paths\` | Lockfile hash |
| CircleCI | \`save_cache\`/\`restore_cache\` | Checksum of lockfile |

## Diagnosing "Executable doesn't exist" Errors

The error you will see when \`PLAYWRIGHT_BROWSERS_PATH\` is misconfigured is "Executable doesn't exist at \`<path>\`." This message is actually helpful because it prints the exact path Playwright resolved at runtime. Compare that path to where you installed the browsers. If they differ, the variable held one value during install and a different value (or none) at run time -- the classic mismatch.

The three common causes are: the variable set during install but not exported to the test step; an in-code Python assignment that ran after the import; and a cache restored without the matching browser version. The fix in every case is to make the install-time and run-time values identical, ideally by exporting the variable once for the whole job. When debugging, print the variable in both steps to confirm they match.

\`\`\`bash
# Print the variable in install and test steps to confirm they agree
echo "Install sees: $PLAYWRIGHT_BROWSERS_PATH"
npx playwright install chromium
echo "Tests see: $PLAYWRIGHT_BROWSERS_PATH"
npx playwright test
\`\`\`

If the directory exists and the version matches but launch still fails on Linux, the missing piece is the OS-level shared libraries -- run \`playwright install-deps\` (or \`install --with-deps\`). The browser binary being present on disk is necessary but not sufficient; it also needs its system dependencies, which live outside the cached directory.

## Generating CI and Docker Skills with AI Agents

The Python "set before import" rule and the CI "cache plus install-deps" pattern are exactly the kind of details AI coding agents get wrong without guidance -- they will happily set \`os.environ\` after the import, or cache browsers while forgetting the system libraries on a cache hit. A QA skill that encodes these rules makes the agent produce a working setup the first time.

Browse the [Playwright CI and environment skills at qaskills.sh/skills](/skills) and install one:

\`\`\`bash
# Install a Playwright Python/CI environment skill
npx @qaskills/cli add playwright-browsers-path
\`\`\`

For related environment configuration, see our [Playwright install behind a proxy or China mirror guide](/blog/playwright-install-proxy-mirror-guide) and our [Docker testing strategies guide](/blog/docker-testing-strategies-guide).

---

## Frequently Asked Questions

### What does PLAYWRIGHT_BROWSERS_PATH do?

\`PLAYWRIGHT_BROWSERS_PATH\` sets both the destination where \`playwright install\` unpacks browser binaries and the location Playwright looks in when launching browsers at runtime. Pointing it at a stable absolute directory lets you cache that directory in CI, copy it between Docker stages, or share it across checkouts. The value must be identical at install time and run time, or Playwright installs to one place and looks in another.

### Why is PLAYWRIGHT_BROWSERS_PATH ignored in my Python script?

Almost certainly because you set it *after* importing Playwright. The driver reads the variable when first imported, so a later \`os.environ\` assignment has no effect. Set it before the \`import\` statement, or, more reliably, export it as a real shell environment variable before running Python. The shell approach also guarantees install and run use the same path.

### How do I cache Playwright browsers in GitHub Actions?

Set \`PLAYWRIGHT_BROWSERS_PATH\` to a fixed workspace directory, then use \`actions/cache\` keyed on the OS and the installed Playwright version to cache that directory. Run \`playwright install\` only on a cache miss. On a cache hit, still run \`playwright install-deps\` because the OS-level system libraries are not part of the cached browser directory and must be installed every run.

### What is the difference between PLAYWRIGHT_BROWSERS_PATH and PLAYWRIGHT_BROWSERS_PATH=0?

An absolute path stores browsers in that exact shared directory. The special value \`0\` instead bundles browsers *inside* the package directory in \`node_modules\`, making the project self-contained at the cost of a separate browser set per checkout. Use an absolute path for CI, Docker, and shared agents; use \`0\` when you need browsers packaged with a single self-contained Node deployment.

### Can I copy a browser cache between machines?

Yes, as long as both machines share the same OS and CPU architecture and the same Playwright version. Set \`PLAYWRIGHT_BROWSERS_PATH\` to a directory on the source machine, run \`playwright install\`, archive that directory, and unpack it on the target machine with the same variable set. A Linux x64 cache will not run on macOS arm64, and a version mismatch causes "Executable doesn't exist" errors.

### Do I still need install-deps if browsers are cached?

Yes. The cached \`PLAYWRIGHT_BROWSERS_PATH\` directory contains only the browser binaries, not the OS-level shared libraries they depend on. On Linux CI and in Docker, run \`playwright install-deps\` (or \`install --with-deps\`) even on a cache hit, otherwise the cached browsers fail to launch with missing-library errors despite being present on disk.

### Where are Playwright browsers stored by default?

When \`PLAYWRIGHT_BROWSERS_PATH\` is unset, browsers go to a per-user cache: \`~/.cache/ms-playwright\` on Linux, \`~/Library/Caches/ms-playwright\` on macOS, and \`%USERPROFILE%\\AppData\\Local\\ms-playwright\` on Windows. This default is fine for a single developer machine but causes redundant downloads in CI and bloated layers in Docker, which is why a fixed path is preferred in those environments.

---

## Conclusion

\`PLAYWRIGHT_BROWSERS_PATH\` is the lever that makes Playwright behave predictably outside a single developer's laptop. Point it at a stable absolute directory and you can cache browsers in CI to skip multi-hundred-megabyte downloads, copy them cleanly between Docker stages, and share one cache across a monorepo. In Python, the cardinal rule is to set it *before* importing Playwright -- ideally as a real shell environment variable so install and run agree. Use \`0\` only when you want browsers bundled inside \`node_modules\`, and always pair a cache hit with \`install-deps\` so the system libraries are present.

Master this one variable and the rest of your Playwright CI and Docker setup falls into place. To have your AI coding agent generate a correct, cached setup the first time, install a Playwright environment skill from [qaskills.sh/skills](/skills) and read our companion [proxy and China mirror install guide](/blog/playwright-install-proxy-mirror-guide).
`,
};
