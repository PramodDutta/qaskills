import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright vs Puppeteer: Bundle Size & Performance 2026',
  description:
    'Playwright vs Puppeteer in 2026: npm install size, Chromium binary size, weekly downloads, cold start, memory, and when each tool wins. Real numbers and tables.',
  date: '2026-05-31',
  category: 'Reference',
  content: `
# Playwright vs Puppeteer: Bundle Size & Performance 2026

When you are choosing between Playwright and Puppeteer, the feature lists look similar enough that the decision often comes down to numbers that nobody publishes clearly: how big is the npm install, how much disk does the browser download eat, how fast does the first test cold-start in CI, and how much memory does a run consume. Those numbers drive real costs — CI minutes, Docker image bloat, container memory limits, and developer laptop disk space. This reference puts the **bundle size and performance** comparison front and center for 2026, with concrete measurements, the reasoning behind them, and runnable code so you can reproduce the figures on your own hardware rather than trusting a blog at face value.

A short framing first, because the two tools are not symmetric. Puppeteer is a focused Node library for driving Chromium (and, increasingly, Firefox) via the Chrome DevTools Protocol; it is lean, fast to start, and ideal for scraping, PDF generation, and single-browser automation. Playwright is a full cross-browser **testing platform** — it drives Chromium, Firefox, and WebKit through patched browser builds, ships its own \`@playwright/test\` runner, and bundles a large ecosystem (trace viewer, codegen, parallelism, fixtures). That difference in scope is the root cause of nearly every size and performance gap below: Playwright does more, so it weighs more, but it also gives you things Puppeteer simply does not have. For a feature-by-feature look beyond the numbers, pair this with the [Playwright vs Puppeteer 2026 deep dive](/blog/playwright-vs-puppeteer-2026-deep-dive) and the [Puppeteer vs Playwright testing](/blog/puppeteer-vs-playwright-testing) comparison; here we stay tightly on size, downloads, and runtime cost.

We will quantify npm package size, the browser binary footprint for each engine, weekly download trends and what they signal, cold-start latency in CI, steady-state memory, then translate all of it into a clear "when each wins" decision framework. Every section includes the commands or code to measure it yourself, plus tables you can lift directly. Numbers are representative 2026-era figures and vary by version and platform — always re-measure for your exact setup.

## How to Read These Numbers (and Reproduce Them)

Before the tables, set expectations about precision. Package sizes change with every release; browser binary sizes differ across Chromium, Firefox, and WebKit and across OS/arch (a macOS arm64 WebKit build differs from a Linux x64 one); and performance depends heavily on machine, container limits, and whether browsers are cached. So treat the figures here as **representative orders of magnitude** for 2026 and reproduce them in your environment. Two commands do most of the work:

\`\`\`bash
# Inspect the published npm package size without installing it
npm view playwright dist.unpackedSize
npm view @playwright/test dist.unpackedSize
npm view puppeteer dist.unpackedSize
npm view puppeteer-core dist.unpackedSize

# See weekly download counts from the registry API
npm view playwright
npm view puppeteer
\`\`\`

To measure the **installed on-disk** footprint including downloaded browsers, install into a clean directory and size it:

\`\`\`bash
# Playwright: install the runner, then its browsers
mkdir pw-size && cd pw-size && npm init -y
npm i -D @playwright/test
npx playwright install            # downloads Chromium, Firefox, WebKit
du -sh node_modules ~/.cache/ms-playwright   # package + browser cache (Linux/macOS path varies)

# Puppeteer: installs a Chromium build by default on first install
mkdir pup-size && cd pup-size && npm init -y
npm i puppeteer                   # downloads a matching Chromium
du -sh node_modules
\`\`\`

A key structural difference shows up immediately: Playwright stores browsers in a **shared cache** (\`~/.cache/ms-playwright\` on Linux/macOS, \`%USERPROFILE%\\AppData\\Local\\ms-playwright\` on Windows) rather than under \`node_modules\`, so the browser bytes are shared across every project on the machine and survive \`node_modules\` deletion. Puppeteer historically downloads Chromium into its own package directory (newer versions also use a shared cache), so a fresh \`npm i puppeteer\` can pull a browser per install unless you configure caching or use \`puppeteer-core\`. That single design choice strongly affects CI and Docker layering, as we will see.

## npm Package and Install Size

The published npm package (the JavaScript you download before any browser) is modest for both, but Playwright's testing platform carries more code than Puppeteer's focused library. The dramatic differences appear once browsers are downloaded, because that is where the real bytes live.

| Package | Approx. published (unpacked) JS | Browsers bundled on install? | Notes |
|---|---|---|---|
| \`puppeteer\` | ~3 MB | Yes (one Chromium build) | Convenience package; pulls a browser |
| \`puppeteer-core\` | ~3 MB | No | Bring-your-own browser; tiny footprint |
| \`playwright\` | ~7 MB | No (download separately) | Library only |
| \`@playwright/test\` | ~8 MB | No (download separately) | Adds the test runner, fixtures, reporters |

The JavaScript itself is not what dominates. The decisive figure is the **total installed size with browsers**, which is what fills your CI cache and Docker image. Here Playwright's multi-engine support is the cost: installing all three browsers downloads three independent engines. If you only test on Chromium, you can install just that one and the gap to Puppeteer narrows sharply.

| Scenario | Approx. on-disk with browsers | Why |
|---|---|---|
| \`puppeteer-core\` + your own Chrome | ~3 MB | No browser downloaded |
| \`puppeteer\` (default Chromium) | ~180–400 MB | One Chromium build |
| Playwright, Chromium only (\`--only-shell\` / \`chromium\`) | ~170–450 MB | One engine |
| Playwright, all three engines | ~1.0–1.6 GB | Chromium + Firefox + WebKit |

The takeaway: if your matrix is Chromium-only, Playwright and Puppeteer land in the same ballpark for disk. Playwright's size premium is the price of cross-browser coverage — Firefox and WebKit builds you literally cannot get from Puppeteer. Install only the engines you test to avoid paying for browsers you never launch:

\`\`\`bash
# Playwright: install just the engines you actually run
npx playwright install chromium          # only Chromium
npx playwright install chromium webkit   # Chromium + WebKit, skip Firefox

# In CI, install browsers AND their OS dependencies in one step
npx playwright install --with-deps chromium
\`\`\`

## Browser Binary Size by Engine

Because the browser binaries dwarf the JS, it is worth breaking them down per engine. These are approximate uncompressed sizes of the downloaded browser builds; compressed download sizes are smaller. The exact bytes shift between versions, so re-check with \`du -sh\` against your cache.

| Engine | Approx. uncompressed size | Available in Puppeteer? | Available in Playwright? |
|---|---|---|---|
| Chromium (full) | ~400–600 MB | Yes | Yes |
| Chromium headless shell | ~150–200 MB | Partial (newer) | Yes (\`--only-shell\`) |
| Firefox (patched) | ~250–350 MB | Experimental | Yes |
| WebKit (patched) | ~300–450 MB | No | Yes |

Two practical levers come out of this table. First, Playwright offers a **headless shell** variant of Chromium that is markedly smaller than the full browser and is sufficient when you only run headless — ideal for CI where there is no display anyway. Second, WebKit coverage (the engine behind Safari) is unique to Playwright; teams that must validate Safari behavior cannot replicate it in Puppeteer, which alone can justify Playwright's footprint regardless of byte counts. To shrink CI images, install the shell:

\`\`\`bash
# Smallest Chromium footprint for headless CI
npx playwright install --only-shell
\`\`\`

For Docker specifically, both tools publish or support base images that pre-bake browsers and system libraries, so you trade a larger image for zero per-run download. The right move in containers is almost always to bake browsers into a layer rather than download them on each job; the [Playwright CI with GitHub Actions complete guide](/blog/playwright-ci-github-actions-complete-guide-2026) walks through caching strategies that keep both size and time down.

## Weekly Downloads and Ecosystem Signal

Download counts are not a quality metric, but they signal ecosystem momentum, the depth of community answers you will find, and the longevity you can expect. Both libraries are enormously popular and downloaded tens of millions of times per week as of 2026. Puppeteer's totals are inflated by its heavy use as a transitive dependency (many scraping and PDF tools depend on \`puppeteer\` or \`puppeteer-core\` under the hood), while Playwright's growth has been driven by direct adoption as a test framework, frequently displacing older tools in new projects.

| Signal | Puppeteer | Playwright |
|---|---|---|
| Weekly npm downloads (order of magnitude) | Tens of millions | Tens of millions, rising fast |
| Primary driver of downloads | Transitive dep (scraping/PDF tools) | Direct adoption as a test runner |
| Trajectory | Stable, mature | Strong upward growth |
| Backed by | Google (Chrome team) | Microsoft |
| Cross-browser breadth | Chromium-centric | Chromium + Firefox + WebKit |

To check the live numbers yourself, the registry exposes a downloads API you can hit from a quick script:

\`\`\`typescript
// downloads.ts — fetch last-week downloads for both packages
async function lastWeek(pkg: string): Promise<number> {
  const res = await fetch(\`https://api.npmjs.org/downloads/point/last-week/\${pkg}\`);
  const json = (await res.json()) as { downloads: number };
  return json.downloads;
}

for (const pkg of ['playwright', '@playwright/test', 'puppeteer', 'puppeteer-core']) {
  console.log(pkg, (await lastWeek(pkg)).toLocaleString());
}
\`\`\`

The practical read for 2026: both are safe, well-maintained choices with deep communities. Playwright's momentum means more recent tutorials, more actively maintained integrations, and a runner that ships first-class testing features. Puppeteer's maturity means battle-tested stability for Chromium automation and a vast back-catalog of scraping solutions. Neither is going away.

## Cold Start and Execution Performance

"Performance" splits into two questions: how long until the **first** test does something useful (cold start), and how fast does a **suite** run end to end. Puppeteer typically wins raw cold start for a single Chromium script because it launches one browser over CDP with minimal framework overhead — there is no test runner to boot, no fixtures to resolve, no worker pool to spin up. Playwright's per-process startup is slightly heavier because \`@playwright/test\` initializes the runner, but it more than recovers that cost on real suites through built-in **parallelism**: it shards tests across worker processes out of the box, while Puppeteer leaves concurrency for you to build with a runner like Jest or Mocha.

| Dimension | Puppeteer | Playwright |
|---|---|---|
| Single-script cold start (one Chromium) | Faster (minimal overhead) | Slightly slower (runner boot) |
| Built-in parallelism | No (DIY via Jest/Mocha) | Yes (workers, sharding) |
| Auto-waiting | Manual waits often needed | Built-in, reduces flaky retries |
| Suite throughput (many tests) | Depends on your runner setup | High, parallel by default |
| Browser launch reuse | Manual | Per-worker contexts, fast isolation |

Here is a minimal cold-start benchmark for a single navigation in each, so you can compare on your own machine. Run each a few times and ignore the first (disk cache warm-up).

\`\`\`typescript
// puppeteer-coldstart.ts
import puppeteer from 'puppeteer';

const t0 = performance.now();
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com', { waitUntil: 'load' });
await page.title();
await browser.close();
console.log('Puppeteer cold start (ms):', Math.round(performance.now() - t0));
\`\`\`

\`\`\`typescript
// playwright-coldstart.ts — using the library directly (no test runner)
import { chromium } from 'playwright';

const t0 = performance.now();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com', { waitUntil: 'load' });
await page.title();
await browser.close();
console.log('Playwright cold start (ms):', Math.round(performance.now() - t0));
\`\`\`

Run these with \`npx tsx puppeteer-coldstart.ts\` and \`npx tsx playwright-coldstart.ts\`. You will typically see the two within a small margin for a single page, with Puppeteer marginally ahead. The picture inverts for a real suite: Playwright's worker parallelism and auto-waiting (which eliminates the manual \`waitForSelector\` calls and retry loops Puppeteer code accumulates) usually make a multi-hundred-test suite finish faster and flake less. The auto-waiting advantage compounds — fewer manual waits means fewer arbitrary sleeps, which means both faster and more reliable runs. See the [Playwright parallel and sharding execution guide](/blog/playwright-parallel-sharding-execution-guide) for how to push suite throughput further.

## Memory Footprint

Memory is dominated by the browser processes, not the Node library, so steady-state usage is broadly comparable per open browser/page between the two tools. The differences come from how each manages concurrency and isolation. Playwright's model of one \`BrowserContext\` per test (cheap, incognito-like sessions sharing a browser process) is memory-efficient for isolation, whereas naively launching a fresh browser per Puppeteer test multiplies process memory. The lever in both is to **reuse the browser** and create lightweight contexts/pages per unit of work.

\`\`\`typescript
// Efficient isolation in Playwright: one browser, many cheap contexts
import { test, expect } from '@playwright/test';

test('each test gets an isolated context, not a new browser', async ({ page }) => {
  // The runner already reuses a per-worker browser and gives each test
  // a fresh, low-cost BrowserContext — no manual browser launches needed.
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
\`\`\`

\`\`\`typescript
// Equivalent discipline in Puppeteer: reuse the browser, use incognito contexts
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
try {
  // Reuse one browser; create an isolated context per logical test
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto('https://example.com', { waitUntil: 'load' });
  // ... assertions via your runner ...
  await ctx.close(); // free the context, keep the browser
} finally {
  await browser.close();
}
\`\`\`

| Memory practice | Effect |
|---|---|
| Reuse one browser, new context per test | Lowest memory for isolated runs (both tools) |
| Fresh browser per test | High memory; avoid unless full isolation required |
| Limit worker count in constrained CI | Caps peak memory (Playwright \`workers\`) |
| Close pages/contexts promptly | Prevents leak growth over long suites |

In memory-constrained CI containers, cap Playwright's \`workers\` (for example \`--workers=2\`) so peak browser-process memory stays under the container limit; for Puppeteer, limit your runner's concurrency similarly. Both tools behave well when you reuse browsers and clean up contexts; both balloon if you launch browsers indiscriminately.

## When Each One Wins

Translate the numbers into a decision. Neither tool is universally "better" — they optimize for different jobs, and the size/performance profile follows from that.

| Choose Puppeteer when... | Choose Playwright when... |
|---|---|
| You only automate Chromium | You need Chromium, Firefox, AND WebKit/Safari |
| The job is scraping, crawling, or PDF generation | The job is end-to-end product testing |
| You want the smallest possible footprint (\`puppeteer-core\`) | You want a batteries-included test runner |
| You already have a runner you like (Jest/Mocha) | You want built-in parallelism, fixtures, trace viewer |
| Minimal single-script cold start matters most | Suite throughput and low flakiness matter most |
| You are embedding browser automation in another tool | You need codegen, UI mode, and rich HTML reports |

Concretely: a CI image that only needs Chromium for scraping is leanest with \`puppeteer-core\` pointed at a system Chrome. A cross-browser regression suite that must prove Safari behavior has no Puppeteer equivalent — Playwright's larger footprint buys WebKit coverage you cannot otherwise get. For greenfield test automation in 2026, Playwright's auto-waiting, parallelism, and tooling generally outweigh its size cost, which is why so many new projects pick it. For lightweight, single-engine automation embedded in a larger system, Puppeteer's leanness wins. If you are weighing the broader framework landscape, the [Selenium vs Cypress vs Playwright comparison](/blog/selenium-vs-cypress-vs-playwright-2026) and the [best test automation frameworks for 2026](/blog/best-test-automation-frameworks-2026) on the [QA Skills blog](/blog) widen the lens.

## Frequently Asked Questions

### Is Playwright's npm install bigger than Puppeteer's?

The JavaScript packages are close — Puppeteer is around 3 MB unpacked, \`@playwright/test\` around 8 MB. The real difference is browsers. \`puppeteer\` downloads one Chromium (~180–400 MB), while Playwright with all three engines reaches ~1–1.6 GB. If you install only Chromium for Playwright, the on-disk totals are comparable. The premium pays for Firefox and WebKit coverage Puppeteer cannot provide.

### How big is the Chromium binary each tool downloads?

A full Chromium build is roughly 400–600 MB uncompressed for both tools. Playwright additionally offers a headless **shell** variant around 150–200 MB via \`npx playwright install --only-shell\`, which is ideal for headless CI. Puppeteer downloads a full Chromium by default, though newer versions support a shared browser cache and a headless-shell option. Exact bytes vary by version and platform, so measure with \`du -sh\`.

### Which has more weekly downloads in 2026, Playwright or Puppeteer?

Both see tens of millions of weekly npm downloads. Puppeteer's count is heavily inflated by transitive usage inside scraping and PDF tools, while Playwright's growth is driven by direct adoption as a test runner and is trending strongly upward. Neither number reflects quality directly; both indicate large, healthy communities. Check live figures via the npm downloads API (\`api.npmjs.org/downloads/point/last-week/<pkg>\`).

### Does Puppeteer start faster than Playwright?

For a single Chromium script, Puppeteer usually has a marginally faster cold start because it launches one browser over CDP with no test-runner overhead, whereas \`@playwright/test\` boots a runner first. On a real suite the order flips: Playwright's built-in worker parallelism and auto-waiting typically make many-test runs finish faster and flake less than a hand-assembled Puppeteer-plus-Jest setup.

### How can I reduce Playwright's disk footprint?

Install only the engines you actually test — \`npx playwright install chromium\` instead of all three — and use the headless shell with \`--only-shell\` for CI. Browsers live in a shared cache (\`~/.cache/ms-playwright\`), so they are reused across projects and survive \`node_modules\` deletion; cache that directory in CI. In Docker, bake browsers into an image layer rather than downloading them on every job.

### Is Playwright or Puppeteer better for memory usage?

Per open browser and page, steady-state memory is similar since the browser dominates. The difference is concurrency discipline: reuse one browser and create cheap isolated contexts per test (Playwright does this automatically; Puppeteer via \`createBrowserContext()\`) to keep memory low. Launching a fresh browser per test in either tool multiplies process memory. In constrained CI, cap worker/concurrency counts to bound peak usage.

### Can Puppeteer test Safari or WebKit?

No. Puppeteer is Chromium-centric with experimental Firefox support but cannot drive WebKit, the engine behind Safari. Playwright ships a patched WebKit build, making it the practical choice when you must validate Safari-specific rendering or behavior. This capability alone often justifies Playwright's larger footprint for teams with Safari users, independent of any byte-count comparison.

### Should I use puppeteer-core or puppeteer?

Use \`puppeteer-core\` when you want the smallest footprint and will supply your own browser (a system Chrome or a managed binary), which keeps the install around 3 MB with no downloaded Chromium. Use the full \`puppeteer\` package when you want it to download a known-compatible Chromium automatically. For embedding automation in another tool or tightly controlling browser versions, \`puppeteer-core\` is the leaner, more explicit choice.

## Conclusion

The Playwright-versus-Puppeteer size and performance gap is real but entirely explainable: Playwright is a cross-browser testing platform, so it carries more JavaScript and, with all engines installed, far more browser bytes — yet that footprint buys Firefox and WebKit coverage, a batteries-included runner, built-in parallelism, and auto-waiting that Puppeteer leaves to you. Puppeteer stays lean and cold-starts a single Chromium script marginally faster, making it excellent for scraping, PDFs, and embedded single-engine automation. Install only the engines you need, use the headless shell, cache browsers in CI, and reuse browsers with cheap contexts, and both tools stay efficient. Choose by job: Puppeteer for lightweight Chromium tasks, Playwright for serious cross-browser product testing.

To have your AI coding agent scaffold either tool with size- and performance-aware defaults, install a testing skill from the [QA Skills directory](/skills). Go deeper with the [Playwright vs Puppeteer 2026 deep dive](/blog/playwright-vs-puppeteer-2026-deep-dive), the [CI with GitHub Actions guide](/blog/playwright-ci-github-actions-complete-guide-2026), and the rest of the [QA Skills blog](/blog).
`,
};
