import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Lighthouse Treemap Bundle Analysis: Find and Fix JavaScript Bloat',
  description: 'Use lighthouse treemap bundle analysis to trace JavaScript bloat to source files, prove fixes, and protect real users with repeatable QA checks.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# Lighthouse Treemap Bundle Analysis: Find and Fix JavaScript Bloat

Lighthouse treemap bundle analysis turns a vague performance complaint such as “the app ships too much JavaScript” into a file-level investigation. Run Lighthouse with trace and source-map data, open the Treemap, identify large or duplicated modules, connect those bytes to a user journey, make one controlled change, and rerun the same measurement. The payoff is not merely a smaller bundle. It is a defensible explanation of which code delayed the page, whether users needed it, and whether the proposed fix actually removed transfer and execution work.

For QA engineers, the Treemap is most useful as evidence within a repeatable test protocol. It complements, rather than replaces, runtime timing, network inspection, coverage, and field data. A 300 kB module may be justified on an editor route and wasteful on a sign-in route. The correct question is therefore: which shipped bytes are unnecessary for this tested state, and what user-visible cost do they impose?

This guide builds that protocol from collection through CI. It also shows how to diagnose the common failure where a bundle becomes smaller but the page becomes no faster, a result that usually exposes a mistaken bottleneck hypothesis.

## What the Lighthouse Treemap Actually Measures

The Treemap visualizes JavaScript resources recorded by Lighthouse. Rectangles represent resources and, when source maps are available, their constituent source files. Area communicates byte size. Color and labels help navigation, but area is the core signal. The view can also expose unused bytes estimated from runtime coverage during the Lighthouse navigation.

Three concepts must remain separate:

| Signal | What it tells you | What it does not prove |
|---|---|---|
| Resource bytes | How much JavaScript was transferred or represented in the artifact | That every byte delayed the tested interaction |
| Mapped module size | Which original packages or source modules contributed bytes | That a package can be removed safely |
| Unused bytes | Code not executed during the recorded navigation | That the code is unused across every route and interaction |

The last distinction prevents the most common analytical mistake. Lighthouse observes one navigation under one configured environment. If the run loads a dashboard but never opens its chart settings, code for that settings panel may appear unused. That is evidence for lazy loading, not evidence for deletion.

Source maps determine the resolution of the investigation. Without them, the Treemap can still rank emitted chunks such as \`app.7c20.js\`, but it cannot reliably attribute their contents to \`date-fns\`, a chart package, or an internal feature folder. Production-like source maps should therefore be available to the analysis environment. They do not have to be publicly exposed in production. A staging build can publish them only to an access-controlled artifact store or test server.

## Build a Reproducible Capture Before Reading Rectangles

A credible comparison starts with controlled inputs. Use the same URL, build mode, authentication state, viewport, Lighthouse categories, and server data. Warm caches and cold caches answer different questions, so record which one you use. Lighthouse navigation audits normally represent a fresh page load, which is appropriate for entry-route JavaScript.

Install Lighthouse in the project or invoke a pinned dependency through your package manager. The following script starts from a built application that is already available at \`http://127.0.0.1:4173\`:

\`\`\`bash
mkdir -p artifacts/lighthouse
npx lighthouse http://127.0.0.1:4173/dashboard \\
  --output=json \\
  --output=html \\
  --output-path=artifacts/lighthouse/dashboard \\
  --only-categories=performance \\
  --chrome-flags="--headless"
\`\`\`

Lighthouse creates output names derived from the supplied path when multiple output formats are requested. Confirm the generated filenames in your installed Lighthouse release instead of hard-coding a consumer before inspecting the directory.

Capture metadata alongside the report. A tiny shell record makes later comparisons much less ambiguous:

\`\`\`bash
node --version > artifacts/lighthouse/environment.txt
npx lighthouse --version >> artifacts/lighthouse/environment.txt
git rev-parse HEAD >> artifacts/lighthouse/environment.txt
git status --short >> artifacts/lighthouse/environment.txt
\`\`\`

Run at least three samples for local investigation. Lighthouse scores and timings vary because scheduling, background processes, and server response time vary. Bundle byte totals should be steadier than timing metrics, but a flaky build pipeline or nondeterministic chunk naming can still confuse comparison. Use the median timing run for discussion and preserve all raw reports.

| Control | Keep constant because | Practical check |
|---|---|---|
| Build mode | Development bundles contain debugging and hot-reload code | Assert the production build command completed |
| Test account | Feature flags and permissions change loaded modules | Store a named fixture account and flag set |
| Route state | Redirects and onboarding can load different entry points | Record final URL and a screenshot |
| Browser environment | Extensions and concurrent tabs add noise | Use Lighthouse-managed headless Chrome |
| Backend fixture | Empty and populated dashboards request different features | Seed the same dataset before each run |

If the page requires authentication, do not paste credentials into a command history. Use a controlled test deployment that supports a safe fixture session, or automate login and preserve the browser profile through a documented Lighthouse workflow. The exact mechanism is environment-specific. The essential requirement is that baseline and candidate arrive at the same rendered state.

## Open the Treemap and Establish a Byte Budget

In the HTML report, find the diagnostic related to JavaScript payloads or unused JavaScript and open the Treemap from the report interface. Depending on the Lighthouse version and report UI, the navigation label can differ, so treat the report itself as authoritative. Chrome DevTools also exposes Lighthouse tooling, but saved JSON and HTML artifacts are easier to review and compare.

Begin at the resource level. Write down the largest first-party chunks, third-party scripts, and the total JavaScript bytes for the route. Then drill into mapped sources. Classify each large area before suggesting a fix:

| Classification | Typical evidence | Candidate response |
|---|---|---|
| Route-critical | Executes before the primary content or interaction is ready | Optimize carefully, avoid arbitrary deferral |
| Feature-conditional | Used only after a panel, modal, or editor opens | Dynamic import at the feature boundary |
| Duplicate capability | Two date, utility, or formatting libraries overlap | Standardize dependency and import path |
| Broad import | A small use pulls a large package surface | Use documented granular imports or a leaner API |
| Third-party | Analytics, chat, experimentation, or advertising code | Delay by consent or interaction where valid |
| Polyfill or compatibility | Supports browsers outside the tested modern target | Revisit supported browsers and build targets |

Do not choose a budget by copying a universal number. A content landing page, an authenticated IDE, and a 3D configurator have different requirements. Start from your current route, business constraints, and user network. A useful first budget is a regression budget: the tested entry route must not add JavaScript without an explicit review. After the largest waste is removed, tighten the absolute ceiling.

An illustrative budget file can keep route expectations visible:

\`\`\`json
{
  "routes": {
    "/": { "maxScriptTransferBytes": 180000 },
    "/dashboard": { "maxScriptTransferBytes": 320000 },
    "/editor": { "maxScriptTransferBytes": 520000 }
  },
  "note": "Illustrative limits. Calibrate with your own builds and users."
}
\`\`\`

Transfer size and uncompressed resource size are different. Parse the exact Lighthouse audit field you intend to govern, document it, and keep that definition stable. Otherwise one engineer may report compressed network bytes while another reports decoded script bytes.

## Trace a Large Rectangle Back to an Import Decision

Suppose the dashboard Treemap shows a large charting package inside the initial application chunk. The dashboard renders only summary cards until the user opens an “Explore trends” panel. The hypothesis is precise: chart code is loaded before it is needed, and moving that feature behind a dynamic import will reduce entry-route transfer and main-thread work without changing the panel behavior.

First, find the import boundary with repository search and the bundler output. Do not assume the package is imported in only one place:

\`\`\`bash
rg "from ['\\\"]charting-library['\\\"]|import\\(['\\\"]charting-library['\\\"]\\)" src
npm ls charting-library
\`\`\`

The package name above is deliberately a placeholder. Substitute the dependency that the source map actually identifies. The second command can reveal multiple installed versions, but dependency-tree output alone does not prove both versions reached the browser. Confirm that in the Treemap or bundler metafile.

Next, establish the behavioral contract. The deferred panel must still open, display a loading state, render correct data, recover from a failed chunk request, and remain keyboard accessible. A Playwright test can make those expectations executable:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('loads trend visualization only after the user opens it', async ({ page }) => {
  const chartResponses: string[] = [];
  page.on('response', response => {
    if (response.url().includes('chart')) chartResponses.push(response.url());
  });

  await page.goto('http://127.0.0.1:4173/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(chartResponses).toHaveLength(0);

  await page.getByRole('button', { name: 'Explore trends' }).click();
  await expect(page.getByRole('region', { name: 'Trend chart' })).toBeVisible();
  expect(chartResponses.length).toBeGreaterThan(0);
});
\`\`\`

Filename matching is brittle because optimized chunks are hashed and may not contain “chart.” A stronger application-specific test can tag the dynamic chunk through bundler configuration, or match a stable request path observed in the built app. Keep the example’s principle: assert absence before the trigger and successful loading after it.

Implementation depends on the framework. In browser JavaScript, a native dynamic import creates a promise-based boundary that bundlers can split:

\`\`\`ts
// trend-chart.ts
export function renderTrendChart(container: HTMLElement): void {
  const chart = document.createElement('section');
  chart.setAttribute('role', 'region');
  chart.setAttribute('aria-label', 'Trend chart');
  chart.textContent = 'Trend data loaded';
  container.replaceChildren(chart);
}
\`\`\`

\`\`\`ts
type ChartModule = typeof import('./trend-chart');

let chartModule: Promise<ChartModule> | undefined;

export function loadTrendChart(): Promise<ChartModule> {
  chartModule ??= import('./trend-chart');
  return chartModule;
}

export async function openTrendChart(container: HTMLElement): Promise<void> {
  const { renderTrendChart } = await loadTrendChart();
  renderTrendChart(container);
}
\`\`\`

The imported module must export \`renderTrendChart\`, and the calling UI must handle pending and rejected promises. Splitting without an error state converts a performance improvement into a reliability defect on intermittent networks.

## Compare Baseline and Candidate Without Cherry-Picking

After the change, build from a clean, known commit and repeat the same captures. Compare four layers:

1. Byte evidence: did the entry chunk or total route JavaScript shrink?
2. Loading evidence: did the feature chunk move after the intended trigger?
3. execution evidence: did scripting or long-task pressure improve?
4. behavior evidence: do entry and deferred paths still work?

The Lighthouse JSON is machine-readable. The following Node script compares total byte weight for script resources recorded in the DevTools log audit. It accepts two report paths and fails clearly when the expected audit data is unavailable:

\`\`\`js
import fs from 'node:fs';

function scriptBytes(path) {
  const report = JSON.parse(fs.readFileSync(path, 'utf8'));
  const items = report.audits?.['network-requests']?.details?.items;
  if (!Array.isArray(items)) {
    throw new Error(\`No network request items in \${path}\`);
  }
  return items
    .filter(item => item.resourceType === 'Script')
    .reduce((sum, item) => sum + (item.transferSize ?? 0), 0);
}

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  throw new Error('Usage: node compare-scripts.mjs baseline.json candidate.json');
}

const baseline = scriptBytes(baselinePath);
const candidate = scriptBytes(candidatePath);
console.table({ baseline, candidate, delta: candidate - baseline });
\`\`\`

Run it with the actual JSON report filenames:

\`\`\`bash
node scripts/compare-scripts.mjs \\
  artifacts/lighthouse/baseline.report.json \\
  artifacts/lighthouse/candidate.report.json
\`\`\`

Audit schemas can change between Lighthouse releases. Pin the tool used in CI and fail loudly if a field disappears. Returning zero when an audit is missing would create a dangerous false success.

Use a review table to prevent an attractive score from hiding a regression:

| Check | Baseline | Candidate | Decision rule |
|---|---:|---:|---|
| Entry-route script transfer | Measured value | Measured value | Candidate must remain within route budget |
| Largest mapped initial module | Named source | Named source | Expected module leaves or shrinks |
| Deferred feature behavior | Pass or fail | Pass or fail | Must pass |
| Median LCP across controlled runs | Measured value | Measured value | Investigate meaningful regression |
| Script error count | Count | Count | No new errors |

Lighthouse’s performance score is a weighted summary, not a bundle acceptance criterion. A score can remain unchanged after a real byte reduction, or improve because of run variance. Preserve the underlying artifacts and the hypothesis-specific measures.

## Diagnose the Smaller Bundle, Same Speed Failure

A realistic failure mode looks like this: the Treemap confirms 140 kB fewer script transfer bytes on the dashboard, but median Largest Contentful Paint and interaction readiness do not improve. The team concludes that code splitting “does not work.” That conclusion is too broad.

Diagnose in order:

1. Confirm the removed bytes were on the critical path. If they downloaded at low priority after primary content, transfer savings may not affect LCP.
2. Inspect the LCP element. A slow hero image, server-rendered data request, or web font may dominate the metric.
3. Look at script evaluation, not only transfer. Compression can make a large decoded script relatively cheap on the wire but still expensive to parse and execute.
4. Check whether a new request waterfall was introduced. A poorly placed dynamic import can wait for another module, creating a late chain.
5. Compare consistent runs and trace details. One baseline and one candidate are inadequate for a timing conclusion.

This is where a broader tail-latency mindset helps. Median local runs can hide slow devices and unfavorable networks, so pair bundle work with [performance testing p99 tail latency analysis](/blog/performance-testing-p99-tail-latency-analysis) when the application has measurable production journeys. The Treemap identifies byte ownership; percentile analysis tells you who experiences the expensive edge.

The corrected conclusion may be: “The change removed unnecessary entry bytes and protects the route budget, but LCP is limited by the report API response.” That is still a valuable improvement. It also redirects the next experiment toward the actual bottleneck.

## What Teams Get Wrong About Unused JavaScript

The misleading shortcut is “unused in Lighthouse means dead code.” Runtime coverage is scoped to what the page executed during the capture. It cannot know that a module will run after a user changes locale, opens help, receives an experiment variant, or exercises an error path.

Treat unused bytes as a queue for classification:

- Truly unreachable code belongs in deletion work, supported by repository and behavioral checks.
- Route-inappropriate code belongs behind a loading boundary.
- Interaction-specific code may be prefetched after critical content or loaded on demand.
- Rare recovery code may be worth shipping because reliability outweighs its cost.
- Third-party code needs an owner, purpose, consent classification, and loading policy.

Tree shaking is another source of overconfidence. It works best with analyzable module graphs and side-effect metadata, but package structure, CommonJS boundaries, barrel files, or side-effectful imports can retain code. Do not say “the bundler should tree-shake it” as a substitute for checking emitted output.

Also avoid replacing a mature package solely because its rectangle looks large. Replacement risk includes accessibility behavior, locale correctness, security maintenance, and developer effort. Measure the specific imported capability and compare alternatives against the product contract.

## Separate Browser Bundles From Load-Generation Concerns

Lighthouse tests one browser navigation under controlled lab conditions. It does not generate representative backend concurrency, sustained arrival rates, or soak traffic. Conversely, protocol load tools do not explain which JavaScript modules a browser downloaded and executed.

Use each layer for its strength:

| Question | Appropriate evidence |
|---|---|
| Which module enlarged the entry route? | Lighthouse Treemap plus source maps |
| Did the split feature still work? | Browser automation and accessibility assertions |
| Did API latency degrade under concurrency? | A load test with controlled workload |
| Did real users improve? | Field telemetry segmented by route and device |

If you are choosing a load generator for the service layer, [k6 vs JMeter in 2026](/blog/k6-vs-jmeter-2026) provides a decision framework. That choice is adjacent to bundle analysis, not a substitute for it.

## Turn the Investigation Into a CI Guardrail

Treemap review is exploratory, while CI needs a stable scalar rule. Good guardrails include total script transfer for a named entry route, a maximum initial chunk size from the bundler, and a prohibition on known heavy modules in entry chunks. Keep the human-readable Lighthouse report as a build artifact for diagnosis.

A minimal comparison gate can allow a small tolerance while enforcing an absolute route budget:

\`\`\`js
import fs from 'node:fs';

const reportPath = process.argv[2];
const budget = Number(process.env.SCRIPT_BUDGET_BYTES);
if (!reportPath || !Number.isFinite(budget)) {
  throw new Error('Provide a report path and SCRIPT_BUDGET_BYTES');
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const requests = report.audits?.['network-requests']?.details?.items;
if (!Array.isArray(requests)) throw new Error('network-requests audit is missing');

const total = requests
  .filter(request => request.resourceType === 'Script')
  .reduce((sum, request) => sum + (request.transferSize ?? 0), 0);

console.log(\`Script transfer: \${total} bytes, budget: \${budget} bytes\`);
if (total > budget) process.exitCode = 1;
\`\`\`

In CI, interpolate variables unambiguously and retain the reports:

\`\`\`bash
CI_PIPELINE_ID="\${CI_PIPELINE_ID:-local}"
CI_NODE_INDEX="\${CI_NODE_INDEX:-0}"
TEST_BASE_URL="\${TEST_BASE_URL:-http://127.0.0.1:4173}"
REPORT_DIR="artifacts/lighthouse/\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"
mkdir -p "\${REPORT_DIR}"
npx lighthouse "\${TEST_BASE_URL}/dashboard" \\
  --output=json \\
  --output-path="\${REPORT_DIR}/dashboard.json" \\
  --only-categories=performance \\
  --chrome-flags="--headless"
SCRIPT_BUDGET_BYTES=320000 node scripts/check-script-budget.mjs \\
  "\${REPORT_DIR}/dashboard.json"
\`\`\`

Use CI variable names that your provider actually defines. The example shows safe shell composition, not a promise that every provider exposes those exact variables.

Avoid gating on the aggregate Lighthouse score alone. Timing variability makes it noisy, and unrelated improvements can mask a JavaScript regression. A byte rule is deterministic enough to block obvious growth, while scheduled Lighthouse runs can track timing trends without turning every pull request into a flaky contest.

## A Review Checklist for Agent-Generated Bundle Changes

AI coding agents are good at locating imports and proposing dynamic boundaries, but they need constraints. Give the agent the route, the before report, the suspect mapped module, supported browser targets, and behavioral acceptance criteria. Ask for one hypothesis per change. Broad “optimize the bundle” prompts encourage dependency swaps and configuration edits that are hard to attribute.

Review generated changes with this checklist:

- The analysis names the route and tested state.
- Source maps connect the rectangle to an actual import.
- The proposed boundary matches a user-visible feature boundary.
- Loading and failure UI are covered.
- Server rendering and hydration behavior remain valid where applicable.
- Baseline and candidate use equivalent builds.
- The initial byte total moves in the predicted direction.
- The deferred feature loads once, at the expected trigger.
- No accessibility name, focus, or keyboard behavior regresses.
- The CI rule tests a stable field and fails when data is missing.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want an agent to follow a repeatable performance investigation. The skill should encode your budgets and evidence requirements, not make the final risk decision by itself.

## Audit Source-Map Confidence Before Assigning Ownership

A detailed Treemap can look authoritative even when its source map is incomplete or belongs to another build. Before asking a team to remove a dependency, verify the mapping chain. The JavaScript response should reference the expected map or the analysis tool should receive it through the supported build path. The map’s generated file must match the bytes Lighthouse loaded. A map from yesterday’s deployment can attach familiar module names to positions that no longer correspond to the current chunk.

Use a simple perturbation test when attribution matters. Add a harmless, recognizable string to the suspected source in a local branch, rebuild, and confirm that the mapped region changes as expected. Revert the probe before evaluating performance. This is especially useful when a CDN rewrites assets, an error-monitoring upload pipeline strips maps from the served build, or a microfrontend shell loads independently deployed remotes.

Ownership also needs nuance in shared chunks. A package may appear large because multiple routes use it, yet the entry route receives the shared chunk only because of the bundler’s split strategy. Moving one import may change chunk composition without reducing total bytes for returning users. Record whether the test represents a first visit, a route transition with cached shared code, or a fresh deployment where content hashes invalidate caches.

Third-party scripts require another evidence path. Source maps may be absent, minified function names may be meaningless, and the script can inject further resources after load. Attribute the initiating request, owning business feature, consent state, and observed execution. Ask the vendor owner which product capability requires the script on the tested route. Removal decisions should include analytics continuity, regulatory obligations, and failure behavior, not only bytes.

When maps expose internal filenames, treat reports as potentially sensitive artifacts. A CI artifact containing source paths or embedded source content may not belong in a publicly accessible build log. Apply the organization’s artifact retention and access controls while keeping enough evidence for authorized reviewers.

## Prioritize Findings With Cost and Reach

Treemap area is only one axis of priority. Rank candidates by bytes on the critical route, execution cost, number of affected sessions, implementation risk, and the availability of a clean loading boundary. A large administration-only package may have less user impact than a smaller parser loaded on every public page.

Create a short decision record for each accepted change. State the measured baseline, the mapped owner, why the code is unnecessary at that moment, the chosen boundary, behavioral tests, and the candidate results. If the change merely rearranges chunks, say so. If it reduces the first visit but makes a frequent later interaction slower, measure both states and decide against the journey contract.

Preloading can complicate this conclusion. A dynamically imported chunk might still be fetched early because the application or framework emits a preload hint. The module has left the entry chunk, yet network contention remains. Inspect the Network panel and Lighthouse request chain to verify when the bytes travel, not just which rectangle contains them. Likewise, a service worker can serve cached assets so quickly that a local repeat test understates first-install cost.

Recheck after dependency upgrades. Package releases can add locales, adapters, or changed module formats, and a lockfile update can alter deduplication. A scheduled route inventory helps catch slow growth that never crosses a pull-request delta large enough to draw attention. The useful historical unit is a stable route and state, not the changing name of a hashed bundle.

## Frequently Asked Questions

### Does Lighthouse Treemap require source maps?

No. It can show emitted JavaScript resources without source maps, which is enough to rank large chunks. Source maps make the analysis far more actionable because they connect optimized output to original modules and dependencies. Use production-like maps in a controlled test environment, verify they match the exact build, and avoid assuming an old or mismatched map is accurate. If maps are unavailable, combine chunk names, network initiators, build output, and controlled import changes to identify ownership.

### Is unused JavaScript in the Treemap safe to delete?

Not by itself. “Unused” means the code did not execute during the recorded navigation and interactions. It may support another route, a permission, an error path, a locale, or a feature the run never opened. Classify the code, search its call sites, exercise relevant behavior, and decide whether deletion, lazy loading, or retention is appropriate. A narrow Lighthouse capture is excellent evidence for changing when code loads, but weak evidence that a product never needs the code.

### Should CI fail when the Lighthouse performance score drops?

Usually not on a single pull-request run. The score combines several timing metrics that vary with the runner and can let one improvement offset another regression. Gate deterministic properties such as route script bytes or bundler chunk limits, and preserve Lighthouse artifacts for diagnosis. Track timing metrics across repeated or scheduled runs with controlled infrastructure. If you must gate a timing metric, use multiple samples, a documented aggregation rule, and enough tolerance to prevent routine runner noise from blocking work.

### How do I know whether a smaller bundle helped users?

Confirm the causal chain. The initial route should transfer or execute fewer unnecessary bytes, the target interaction must remain correct, and controlled traces should show reduced work where expected. Then inspect field telemetry by route, device class, geography, and network when available. A smaller entry bundle is valuable risk reduction even when another bottleneck dominates a lab metric, but user benefit should appear in appropriate loading or responsiveness distributions before claiming that the experience became faster.
`,
};
