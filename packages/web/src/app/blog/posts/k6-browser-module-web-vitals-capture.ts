import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Browser Module Web Vitals Capture: A Practical Testing Workflow',
  description: 'Implement k6 browser module Web Vitals capture with runnable journeys, thresholds, tags, CI artifacts, and diagnostics that expose frontend regressions.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# k6 Browser Module Web Vitals Capture: A Practical Testing Workflow

k6 browser module Web Vitals capture happens automatically when a test uses the \`k6/browser\` module and drives a Chromium page. k6 emits browser metrics for Largest Contentful Paint (LCP), Interaction to Next Paint (INP), Cumulative Layout Shift (CLS), First Contentful Paint (FCP), and Time to First Byte (TTFB). Your real engineering work is to design a representative journey, create enough observations, tag pages correctly, and convert those measurements into defensible thresholds and useful diagnostics.

The most reliable pattern is a small browser scenario for user-experience metrics beside a larger protocol-level scenario for backend load. Browser virtual users are resource intensive, so they should not be treated as a drop-in replacement for HTTP virtual users. Capture vitals under a controlled Chromium environment, preserve the result artifact, and compare percentiles by page or journey rather than relying on a single overall average.

This guide builds a runnable k6 script, adds interactions so INP has something to measure, separates routes with URL tags, explains local and CI execution, and diagnoses the cases where a green summary can still hide a real regression.

## Understand exactly what k6 captures

Web Vitals describe different parts of the user experience. They are not interchangeable timers. LCP reports when the largest visible content element was painted. CLS accumulates unexpected layout shifts. INP represents interaction responsiveness. FCP reports the first content paint, and TTFB covers the wait until the first response byte.

The k6 browser module exposes these built-in metric names:

| User experience signal | k6 metric | Unit | Needs explicit interaction? |
|---|---|---|---|
| Largest Contentful Paint | \`browser_web_vital_lcp\` | time | No |
| Interaction to Next Paint | \`browser_web_vital_inp\` | time | Yes, for a useful sample |
| Cumulative Layout Shift | \`browser_web_vital_cls\` | score | No |
| First Contentful Paint | \`browser_web_vital_fcp\` | time | No |
| Time to First Byte | \`browser_web_vital_ttfb\` | time | No |

The metrics are aggregated as k6 Trend metrics except CLS, whose values are still evaluated through the metric's reported statistics. The summary can show averages and percentiles, and thresholds decide whether the process exits successfully. Official browser metric documentation is available at https://grafana.com/docs/k6/latest/using-k6-browser/metrics/.

Do not inject a third-party Web Vitals library unless you need a browser-side detail the built-in metrics do not provide. Duplicate instrumentation can use different attribution or lifecycle behavior, making the numbers harder to reconcile. Begin with k6's built-in metrics and add custom browser evaluation only for a documented question.

## Build the smallest representative browser journey

The script below opens the page, checks that the heading is visible, fills the two form fields, and clicks submit. That click is the part that matters: a navigation-only script produces LCP and CLS but leaves INP empty, because INP needs a real user interaction to measure. The \`finally\` block closes the page even when a locator or assertion fails.

\`\`\`js
import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    product_journey: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '2m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

export default async function () {
  const page = await browser.newPage();
  try {
    await page.goto('https://test.k6.io/my_messages.php');
    const heading = page.locator('h2');
    check(await heading.textContent(), {
      'page has a heading': (text) => typeof text === 'string' && text.length > 0,
    });

    await page.locator('input[name="login"]').type('admin');
    await page.locator('input[name="password"]').type('123');
    await Promise.all([
      page.waitForNavigation(),
      page.locator('input[type="submit"]').click(),
    ]);

    check(await page.locator('h2').textContent(), {
      'submit produced a new view': (text) => typeof text === 'string' && text.length > 0,
    });
  } finally {
    await page.close();
  }
}
\`\`\`

Save it as \`web-vitals.js\` and run it with the documented k6 command:

\`\`\`bash
k6 run web-vitals.js
\`\`\`

Use your own non-production environment for sustained tests. The public test site is suitable for learning, not for load generation. A five-iteration run is only an illustrative smoke test. It confirms that metrics are produced, but it is far too small for a stable percentile baseline.

The browser journey should represent a real performance contract. If users land on a listing, filter, open a detail page, and add an item, decide whether you need metrics for each navigation or only the landing route. Do not add arbitrary clicks to make the script look complete. Each interaction consumes time, changes application state, and can affect later vitals.

## Capture INP with deliberate interactions

INP cannot describe responsiveness without an interaction. A script that only calls \`page.goto()\` may report no meaningful INP sample. Add the exact actions whose delay matters: expanding a menu, applying a filter, typing into an autocomplete, or submitting a form.

This complete example uses a local demo page contract. It waits through locator actions rather than inserting fixed sleeps. Replace the base URL through an environment variable so the same script runs against a preview deployment and a stable test environment.

\`\`\`js
import { browser } from 'k6/browser';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';

export const options = {
  scenarios: {
    search: {
      executor: 'per-vu-iterations',
      vus: 2,
      iterations: 3,
      maxDuration: '3m',
      options: { browser: { type: 'chromium' } },
    },
  },
};

export default async function () {
  const page = await browser.newPage();
  try {
    await page.goto(\`\${baseUrl}/products\`);
    await page.locator('[name="q"]').fill('keyboard');
    await page.locator('button[type="submit"]').click();
    const results = page.locator('[data-testid="search-results"]');
    await results.waitFor({ state: 'visible' });
    check(await results.textContent(), {
      'search results are populated': (text) => Boolean(text && text.trim()),
    });
  } finally {
    await page.close();
  }
}
\`\`\`

Use a stable selector that represents the result users see. A click that merely queues work is not the journey end. Waiting for the visible result allows the browser to observe the paint caused by the interaction. It also makes failures easier to distinguish from performance delays.

Capture the interaction after the page is ready for input. If hydration replaces the form node immediately after initial paint, an early click can target a temporary element and produce a functional failure rather than an INP observation. Prefer a visible, enabled control and a deterministic fixture. Keep the submitted query constant so result size does not become an uncontrolled performance variable. When the application intentionally debounces typing, decide whether the measured task includes the debounce interval. Document that choice, since a responsive paint after a long product-configured delay can still feel slow to a user.

| Interaction pattern | Useful endpoint | Likely false conclusion |
|---|---|---|
| Search submit | Results container visible | Measuring only click dispatch |
| Accordion open | Panel content visible | Treating animation start as completion |
| Add to cart | Cart count updated | Ignoring delayed state reconciliation |
| Route transition | Destination heading visible | Stopping at URL change |

Keep interactions deterministic. Random searches, rotating inventory, and uncontrolled experiments widen the metric distribution. That variability may be representative later, but it obstructs early diagnosis. Establish a controlled baseline first, then introduce a clearly recorded data mix.

## Set thresholds that match the journey

A threshold turns a measurement into a test result. k6 accepts threshold expressions under the \`thresholds\` option. The following values are illustrative engineering budgets. They are not claimed as universal user-experience guarantees.

\`\`\`js
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    browse: {
      executor: 'shared-iterations',
      vus: 2,
      iterations: 10,
      maxDuration: '5m',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(75)<2500'],
    browser_web_vital_inp: ['p(75)<200'],
    browser_web_vital_cls: ['p(75)<0.1'],
    browser_web_vital_ttfb: ['p(90)<800'],
  },
};

export default async function () {
  const page = await browser.newPage();
  try {
    await page.goto('https://test.k6.io/');
    await page.locator('a[href="/my_messages.php"]').click();
  } finally {
    await page.close();
  }
}
\`\`\`

Percentiles matter because averages dilute slow experiences. However, percentile stability requires enough observations. With ten samples, the 75th percentile is only a smoke-level signal. Use repeated runs and inspect raw distributions before turning a tentative target into a blocking release gate.

Avoid setting a single LCP threshold across unrelated routes. A marketing home page, a dense analytics dashboard, and a checkout confirmation render different elements under different cache and data conditions. k6 browser metrics include URL tags, so thresholds can select a route.

\`\`\`js
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    catalog_routes: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 5,
      maxDuration: '3m',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    'browser_web_vital_lcp{url:https://app.example.test/catalog}': ['p(75)<2200'],
    'browser_web_vital_lcp{url:https://app.example.test/product/sku-42}': ['p(75)<2500'],
    'browser_web_vital_cls{url:https://app.example.test/catalog}': ['p(75)<0.1'],
  },
};

export default async function () {
  const page = await browser.newPage();
  try {
    await page.goto('https://app.example.test/catalog');
    await page.goto('https://app.example.test/product/sku-42');
  } finally {
    await page.close();
  }
}
\`\`\`

Use exact URLs only when test data and navigation make them stable. Dynamic IDs or query strings can create many time series and prevent a threshold selector from matching the intended page. In that situation, stabilize the test URL, run separate scenarios, or post-process a controlled output. Do not assume that a k6 group automatically becomes the grouping dimension for every browser vital.

## Separate browser load from protocol load

Chromium consumes far more CPU and memory than an HTTP virtual user. A browser test with hundreds of concurrent VUs can exhaust the load generator before the application becomes the bottleneck. This creates a classic false diagnosis: LCP rises, the team blames the site, but the test machine is saturated.

Use a hybrid design. Protocol-level k6 traffic establishes backend concurrency. A much smaller browser scenario measures the rendered user path while that load is active. The two scenarios can live in one script when their lifecycle and environment are compatible.

\`\`\`js
import http from 'k6/http';
import { browser } from 'k6/browser';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';

export const options = {
  scenarios: {
    api_load: {
      executor: 'constant-vus',
      exec: 'apiLoad',
      vus: 20,
      duration: '2m',
    },
    browser_probe: {
      executor: 'constant-vus',
      exec: 'browserProbe',
      vus: 2,
      duration: '2m',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    browser_web_vital_lcp: ['p(75)<2500'],
  },
};

export function apiLoad() {
  http.get(\`\${baseUrl}/api/products\`);
}

export async function browserProbe() {
  const page = await browser.newPage();
  try {
    await page.goto(\`\${baseUrl}/products\`);
  } finally {
    await page.close();
  }
}
\`\`\`

The browser probe is not a statistical sample of all users merely because it ran during load. It is a controlled synthetic observation from the load generator's location and hardware. Field monitoring and lab tests answer complementary questions.

If choosing the right traffic engine is still open, compare resource model, scripting, reporting, and team familiarity in [k6 vs JMeter](/blog/k6-vs-jmeter-2026). The Web Vitals plan should follow from the user journey and measurement requirement, not tool loyalty.

## Preserve results as CI artifacts

Terminal summaries are convenient but ephemeral. k6 supports a JSON results output through \`--out json=filename\`. Preserve that file with the job log and record the k6 version, Chromium version, runner image, commit, base URL, and scenario options.

\`\`\`bash
set -eu

: "\${BASE_URL:?BASE_URL must be set}"
RESULT_FILE="k6-browser-\${CI_PIPELINE_ID:-local}-\${CI_NODE_INDEX:-0}.json"

k6 run \\
  --out "json=\${RESULT_FILE}" \\
  -e "BASE_URL=\${BASE_URL}" \\
  web-vitals.js

test -s "\${RESULT_FILE}"
\`\`\`

Notice that each shell variable is braced. A name such as \`\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}\` is unambiguous, while unbraced variables adjacent to underscores can be parsed as a longer variable name.

Do not commit raw artifacts if they contain tested URLs, query parameters, or tags with sensitive information. Upload them to the CI artifact store with appropriate retention and access controls. Use a sanitized stable label for dashboards.

A simple CI policy has two layers:

| Layer | Purpose | Failure behavior |
|---|---|---|
| Smoke | Prove journey and metric emission work | Block on script, check, or missing-metric failure |
| Baseline comparison | Detect material distribution movement | Alert or block after repeat confirmation |
| Absolute budget | Enforce product performance contract | Block when a mature threshold fails |

The first layer should fail if a route never loaded, a selector changed, or the expected metric has no samples. Do not let an empty metric series appear green merely because no threshold selected it. Inspect the summary during initial setup and add an explicit CI check appropriate to your output sink.

## Control the lab before interpreting a regression

Web Vitals respond to application code, content, network, CPU, cache, browser build, and viewport. If these change together, the result is not attributable. Pin the CI runner image and record Chromium. Keep viewport and browser options stable. Use deterministic test data. Decide whether the run represents a cold or warm cache and apply that policy consistently.

| Variable | Stabilization tactic | Symptom when uncontrolled |
|---|---|---|
| Runner CPU contention | Dedicated or consistently sized worker | Broad inflation across paint and interaction metrics |
| Image payload | Fixed product fixture | LCP element and timing jump between runs |
| Consent banner | Preconfigure test environment | Click blocked or unexpected CLS |
| Feature flag | Record and pin cohort | Bimodal results |
| Third-party script | Stub in component test or monitor separately | Intermittent long tasks and network delay |
| Browser version | Pin runner image and log version | Baseline shift without app commit |

Warm cache and cold cache answer different questions. A first-time visitor often has no HTTP cache, while a repeat user does. Instead of an accidental mixture, create two named scenarios or separate jobs. Avoid clearing state halfway through a journey unless that matches a user behavior.

Use the same viewport when comparing commits because responsive breakpoints can change the LCP candidate entirely. If mobile experience matters, run a separately labeled mobile profile. Do not average desktop and mobile into one threshold.

Treat authentication state as another controlled variable. A login redirect, token refresh, or personalized banner can change navigation timing and the largest element. Create the account before the timed scenario when authentication setup is not part of the journey. If login performance is the subject, isolate it in its own scenario and use disposable credentials. Record whether the account has prior notifications, saved preferences, or experiments, since those affect rendered content.

Third-party dependencies need an explicit policy. Allowing analytics, consent, advertisements, and customer-chat scripts produces a realistic end-to-end measurement, but an outage outside your control can make the release gate noisy. Stubbing all of them produces a stable application-only signal but hides integration cost. Many teams run a blocking controlled test plus a non-blocking full-dependency monitor. Name the profiles clearly so nobody compares their percentiles as if they were the same population.

Finally, keep load-generator time synchronized. Result correlation across browser metrics, API metrics, and server telemetry becomes unreliable when hosts disagree about time. Use the execution platform's normal time synchronization, record run start and end, and carry a safe test-run identifier into server requests if the application supports a documented header or query convention. Never invent an unrecognized header and assume it reaches logs.

## Diagnose a realistic Web Vitals failure

Suppose CI reports that LCP p(75) moved from an illustrative 1.9 seconds to 3.1 seconds after a product-card change. TTFB is flat, FCP is nearly flat, and CLS remains low. The first suspicion should be the LCP resource or main-thread rendering, not the server response.

Follow this sequence:

1. Re-run on the same runner to distinguish a transient environment event.
2. Confirm the sample count and URL tag.
3. Check whether the LCP candidate changed, for example from heading text to a larger image.
4. Compare browser network activity and image dimensions.
5. Inspect whether JavaScript delays inserting or revealing the candidate.
6. Reproduce locally with the same build and browser settings.

Now consider a different pattern: LCP, FCP, INP, and TTFB all worsen while generator CPU is pinned. That points toward test infrastructure pressure. Reduce browser VUs or move probes to a larger isolated runner before filing an application regression.

For backend-linked problems, pair vitals with a [p99 tail latency analysis](/blog/performance-testing-p99-tail-latency-analysis). A slow API can delay rendering even when its median is healthy, and route-specific correlation is more useful than comparing global averages.

## What people get wrong about Web Vitals capture

The first mistake is treating one browser iteration as a benchmark. It is a connectivity check. Percentiles from tiny samples move dramatically and cannot support fine-grained release decisions.

The second is assuming navigation alone measures INP. INP requires user interaction, so the journey must exercise the control whose responsiveness matters. A page-load-only script can be valid for LCP and CLS while being incomplete for INP.

The third is applying public guideline cutoffs as if they were automatically valid CI thresholds. Field guidance, lab distributions, business budgets, and synthetic environments are related but distinct. Establish a baseline, understand measurement variance, and choose a threshold that catches meaningful regressions without turning routine noise into release failure.

The fourth is scaling browser VUs like HTTP VUs. Generator saturation contaminates the measurement. Watch runner CPU and memory, then use protocol traffic for volume.

The fifth is reading only the aggregate metric. URL, scenario, environment, and journey tags determine whether a result is actionable. A healthy landing page can conceal a broken detail page when both feed one global number.

## A release-ready capture checklist

Before making browser vitals blocking, confirm all of the following:

- The script uses \`k6/browser\` and a Chromium browser scenario.
- Every measured route has a clear user-performance contract.
- At least one representative interaction produces INP observations when INP is required.
- Locators wait for user-visible outcomes instead of arbitrary delays.
- Thresholds select the intended URL or isolated scenario.
- Sample volume is sufficient for the percentile being interpreted.
- Browser VUs do not saturate the generator.
- Protocol load and browser measurement have separate roles.
- Runner image, Chromium version, viewport, and test data are recorded.
- Result output is retained as a CI artifact.
- Missing metrics fail setup validation.
- Regression triage distinguishes application, test, and environment causes.

With those controls, k6 browser module Web Vitals capture becomes a repeatable QA signal instead of a screenshot of one fast or slow run. The value comes from the full measurement system: journey, controlled lab, tagged distribution, threshold, artifact, and diagnosis.

## Frequently Asked Questions

### Does the k6 browser module capture Web Vitals automatically?

Yes. When a scenario uses the \`k6/browser\` module with Chromium and navigates pages, k6 emits built-in browser Web Vital metrics such as LCP, CLS, FCP, and TTFB. INP needs a meaningful user interaction, so a navigation-only script is insufficient for that signal. Confirm metric names and samples in the end-of-test summary before adding thresholds. A successful functional check does not prove every desired performance metric received observations.

### How many browser iterations are needed for a percentile?

There is no universal count because variance, run cost, and the decision being made differ. A handful of iterations is useful for smoke validation but not for a stable tail estimate. Collect repeated observations under a controlled environment, inspect run-to-run variation, and choose a sample plan that reliably distinguishes the regression size you care about. Report sample count with the percentile. For a release gate, validate the plan against historical good and known-slow builds.

### Can k6 browser virtual users generate the full application load?

They can generate browser activity, but using them for all traffic is often inefficient because every browser virtual user consumes substantial CPU and memory. A hybrid test is usually clearer: protocol-level k6 scenarios create backend volume, while a small browser scenario observes rendered experience during that load. Monitor the generator itself. If it saturates, Web Vitals can worsen even when the system under test has not changed.

### Why is my INP metric missing or unhelpful?

The most common reason is that the journey did not perform a qualifying interaction. Add a representative click, key action, or form interaction, then wait for the user-visible result. Also verify that the interaction is not blocked by a consent dialog, stale selector, or immediate navigation failure. Very small samples make INP unstable, and scripted actions may not cover every real-user behavior. Treat the synthetic value as a controlled probe, not a replacement for field data.
`,
};
