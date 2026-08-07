import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Lighthouse CI Budgets Assertions Guide for Blocking Performance Regressions',
  description: 'Use this Lighthouse CI budgets assertions guide to set stable performance gates, diagnose noisy failures, and stop real web regressions before release.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# Lighthouse CI Budgets Assertions Guide for Blocking Performance Regressions

A useful Lighthouse CI gate does two jobs: it rejects changes that make a page materially worse, and it lets normal measurement variance pass. Configure collection against production-like pages, run each page several times, assert numeric metrics and resource limits separately, and assign error severity only to thresholds the team is prepared to enforce. That is the core of a reliable Lighthouse CI budgets assertions guide.

Budgets and assertions overlap, but they are not interchangeable. A performance budget constrains page weight or resource counts. An assertion evaluates a Lighthouse audit, category, numeric value, or list length. Use both concepts deliberately. A checkout page can stay under its JavaScript budget while its Largest Contentful Paint regresses because a server response slowed down. Conversely, its paint metrics can look acceptable on a fast runner while a new 400 KB dependency quietly creates future risk.

The workflow below is designed for QA and test-automation engineers who need a gate they can explain from a failed CI log. It covers configuration, threshold selection, URL-specific policies, repeatability, pull-request diagnostics, and safe ratcheting.

## Choose the signal before choosing the threshold

Start with the user-visible risk, not an attractive round number. Lighthouse produces category scores, audit scores, numeric measurements, opportunity diagnostics, and resource summaries. Each answers a different question. A performance category score is useful for broad health, but it can hide offsetting movement among metrics. A numeric assertion is easier to debug because it says which measurement crossed which limit.

| Signal | Question it answers | Good gate use | Main limitation |
|---|---|---|---|
| Category score | Is the page broadly healthy? | Warning-level overview | Weighted score can change when audits change |
| Numeric metric | Did a user-facing timing exceed a limit? | Hard gate on a stable journey | Lab conditions differ from field users |
| Audit score | Did a specific quality check pass? | Accessibility or implementation invariant | Some audits are advisory, not release blockers |
| Resource size | Did shipped payload grow too large? | JavaScript, images, fonts, total bytes | Does not reveal execution cost by itself |
| Resource count | Did dependency fan-out increase? | Third-party requests and font count | One large request can be worse than many small ones |

Do not gate every value merely because Lighthouse exposes it. Pick a small set that maps to known failure modes. For a content site, those might be Largest Contentful Paint, Cumulative Layout Shift, total JavaScript bytes, and third-party count. For an authenticated application, startup JavaScript, main-thread work, and a custom user timing may be more actionable.

Write the policy in plain language before encoding it. For example: “The product page must not ship more than 250 KB of JavaScript, and its lab LCP must remain below the team’s agreed ceiling under the CI profile.” That statement gives a reviewer enough context to challenge the number.

## Build a repeatable collection target

Thresholds are meaningless when the audited page changes between runs. The CI job should build the same artifact that would be deployed, start it with a deterministic command, wait until it is available, and audit explicit URLs. Lighthouse CI supports collection configuration under the collect section of a lighthouserc file. The following CommonJS configuration avoids ambiguity about server startup and page selection.

\`\`\`js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/pricing',
        'http://localhost:4173/docs/getting-started'
      ],
      numberOfRuns: 5
    },
    upload: {
      target: 'filesystem',
      outputDir: './artifacts/lighthouse'
    }
  }
};
\`\`\`

The ready pattern must match actual server output. If it does not, collection can time out even though the site is healthy. If the preview server provides a health endpoint but no stable log line, wrap the startup process in a small script that prints a deterministic message only after the endpoint responds. Keep that wrapper owned by the repository rather than embedding a fragile shell loop in CI.

Use a production build, not a development server. Development bundles include diagnostics, source transformations, and different caching behavior. They can make a good change look bad or conceal a production-only issue. Also keep test data stable. A home page that randomly displays a different campaign image is not a controlled performance target.

Multiple runs reduce the effect of transient noise. They do not repair a contaminated runner. Shared CPU contention, cold font downloads, remote APIs, consent dialogs, and animation can still distort results. When possible, serve local fixtures for variable upstream data and use a runner class with predictable resources.

## Encode audit assertions with explicit severity

Lighthouse CI assertions use audit IDs as keys. An assertion can be off, warn, or error. Error failures cause a nonzero exit status, while warnings remain visible without failing the job. Numeric audit values can be checked with maxNumericValue. Category and audit scores use minScore. List-like audit details can use maxLength.

\`\`\`js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: [
        'http://localhost/'
      ],
      numberOfRuns: 5
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:performance': ['warn', { minScore: 0.9 }],
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'median' }
        ],
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.1, aggregationMethod: 'pessimistic' }
        ]
      }
    }
  }
};
\`\`\`

These numbers are examples of policy, not universal defaults. Establish limits from your product’s observed baseline, user expectations, and performance objectives. Confirm current audit identifiers from generated Lighthouse results or the project documentation instead of copying a stale list.

Aggregation method changes the meaning of a gate. Median evaluates the middle observation. Optimistic chooses the result most likely to pass. Pessimistic chooses the result least likely to pass. Median-run takes values from the run considered most representative based on key performance measurements. Do not select optimistic only to make red builds disappear. Select an aggregation rule that matches the risk.

| Aggregation method | Operational meaning | Suitable use | Failure risk |
|---|---|---|---|
| median | Typical result across repeats | Stable timing metrics | A severe outlier may be ignored |
| optimistic | Best passing evidence | Early warning rollout | Can conceal intermittent regression |
| pessimistic | Worst observed evidence | Layout shift or strict invariants | Sensitive to one contaminated run |
| median-run | Coherent representative run | Audits that should come from one report | Not the mathematical median of every audit |

For an intermittent layout shift, pessimistic is often defensible because one visible shift matters. For a noisy paint measurement on shared infrastructure, median may better represent the build. Record that reasoning in a nearby comment or engineering decision, not only in someone’s memory.

## Add resource budgets without confusing bytes and kilobytes

Resource budgets catch structural growth before it becomes a visible timing failure. Lighthouse budget files describe resource sizes and counts. Lighthouse CI can also express resource-summary assertions alongside other assertions. The crucial unit trap is that file sizes in a Lighthouse budget file are expressed in kilobytes, while maxNumericValue for Lighthouse CI resource-summary size assertions is expressed in bytes.

Here is a standalone budget file for the root page. Paths can scope budgets to matching routes.

\`\`\`json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 250 },
      { "resourceType": "image", "budget": 600 },
      { "resourceType": "total", "budget": 1200 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 8 },
      { "resourceType": "font", "budget": 4 }
    ]
  }
]
\`\`\`

Connect the file to Lighthouse collection so the report includes the performance-budget audit, then assert that audit in Lighthouse CI.

\`\`\`js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      settings: {
        budgetPath: './budgets.json'
      }
    },
    assert: {
      assertions: {
        'performance-budget': 'error'
      }
    }
  }
};
\`\`\`

An alternative is to place resource-summary rules directly beside other assertions. This is convenient when a single config owns all gates.

\`\`\`js
module.exports = {
  ci: {
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2800, aggregationMethod: 'median' }
        ],
        'resource-summary:script:size': [
          'error',
          { maxNumericValue: 256000 }
        ],
        'resource-summary:third-party:count': [
          'warn',
          { maxNumericValue: 8 }
        ]
      }
    }
  }
};
\`\`\`

Choose one representation with full awareness of its semantics. The standalone budget file integrates with the Lighthouse report. Direct assertions consolidate gating policy and allow the same severity vocabulary as other checks. Do not accidentally apply 250 as a byte limit when you meant 250 KB.

| Policy need | Budget file | Direct resource-summary assertion |
|---|---|---|
| Show budget audit in report | Strong fit | Indirect |
| Mix warnings and errors | Less direct | Strong fit |
| Keep one assertion map | No | Yes |
| File-size unit | Kilobytes | Bytes |
| Route pattern policy | Supported by budget paths | Better handled with assertMatrix |

## Give page families different limits with assertMatrix

A marketing home page, documentation article, and application dashboard do not have the same performance shape. One global threshold either punishes a legitimate rich page or becomes too loose for lean pages. Lighthouse CI’s assertMatrix applies assertion sets to URLs matching regular-expression patterns.

\`\`\`js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/docs/install',
        'http://localhost:4173/app/dashboard'
      ],
      numberOfRuns: 5
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '/docs/',
          assertions: {
            'resource-summary:script:size': [
              'error',
              { maxNumericValue: 180000 }
            ]
          }
        },
        {
          matchingUrlPattern: '/app/',
          assertions: {
            'resource-summary:script:size': [
              'error',
              { maxNumericValue: 450000 }
            ],
            'largest-contentful-paint': [
              'warn',
              { maxNumericValue: 3000, aggregationMethod: 'median' }
            ]
          }
        }
      ]
    }
  }
};
\`\`\`

Test patterns against every collected URL before relying on them. A pattern that never matches creates the illusion of coverage. A pattern that is too broad can apply the dashboard allowance to documentation. Keep route families small, include one representative URL from each family in CI, and add a configuration test that checks expected matches if your matrix becomes complex.

What people get wrong here is treating page-specific budgets as exceptions. They are not waivers. They are contracts for distinct experiences. Each family still needs a reasoned ceiling and an owner.

## Establish limits from a measured baseline

Avoid inventing thresholds in a planning meeting. First collect enough clean results from the default branch to understand typical variance. Use the same artifact, runner class, browser setup, and data fixtures planned for pull requests. For every metric, record the median, a high observation, the planned ceiling, and the rationale.

| Page | Signal | Observed center | Upper observation | Initial gate rationale |
|---|---|---:|---:|---|
| Home | LCP | 1,840 ms | 2,120 ms | Allow normal noise, reject major hero regression |
| Docs | Script bytes | 132,000 | 134,500 | Small margin for intentional shared code |
| Dashboard | CLS | 0.03 | 0.05 | Layout is expected to remain visually stable |
| Pricing | Third-party count | 4 | 4 | Any new vendor requires review |

The example observations are illustrative. Your baseline must come from your pages. A practical initial ceiling sits above normal noise but close enough to catch a meaningful regression. If a metric varies from 1.5 seconds to 4 seconds without code changes, the immediate problem is measurement control, not the exact gate.

Ratchet rather than abruptly enforce an aspirational target. Start a currently failing concern as warn, create a tracked remediation item, improve the page, then switch the assertion to error at the new baseline. Never leave a warning indefinitely. Every warning needs an owner, review date, and condition for promotion or removal.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when an agent needs a reusable workflow, but the repository should still retain the thresholds and rationale that govern its own product.

## Run Lighthouse CI in a focused GitHub Actions job

Keep performance work separate from functional sharding. Browser performance collection competes for CPU and memory, so running it beside a large parallel browser suite can amplify noise. The broader [Playwright test sharding and parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide) explains how functional suites distribute; Lighthouse should usually receive a controlled job rather than share those workers.

The following workflow uses documented package scripts and stores local reports as an artifact. Pin dependency versions in the project lockfile, build once, and let the repository configuration define Lighthouse behavior.

\`\`\`yaml
name: performance-gate

on:
  pull_request:

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npx lhci autorun
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-reports
          path: artifacts/lighthouse
\`\`\`

The action major versions shown are concrete examples and should follow your organization’s dependency policy. The important behavior is that artifact upload uses an always condition, otherwise the evidence disappears precisely when an assertion fails.

Lighthouse is not a load generator. It measures one page in a controlled lab scenario. If the risk is backend behavior under concurrency, use a load-testing workflow such as the approaches compared in [k6 vs JMeter for modern performance testing](/blog/k6-vs-jmeter-2026). A fast single-user lab result cannot prove server capacity, and a load test does not prove visual stability or client-side accessibility.

## Diagnose a red budget without rerunning until green

Consider a realistic failure: the product page exceeds its script budget by 90 KB, LCP also worsens by 700 ms, but the category score moves only slightly. A developer reruns the job and the timing assertion passes while the resource assertion remains red. Calling this “Lighthouse flakiness” would miss the causal evidence.

Use a fixed sequence:

1. Confirm the failing URL and assertion. A matrix pattern may have applied an unexpected policy.
2. Compare resource summaries between the base and candidate reports. Look for a new chunk, duplicated dependency, third-party tag, image, or font.
3. Inspect the LCP element and its request chain. Determine whether the extra JavaScript delayed rendering or whether a separate server or image change is responsible.
4. Compare all repeated runs. One extreme result suggests environmental noise; a shifted cluster suggests a real regression.
5. Reproduce with the CI production artifact, not a local development build.
6. Change the threshold only when the product contract changed intentionally and the review records the tradeoff.

This sequence prevents the most damaging failure mode: normalizing every red build by raising limits. Budgets lose all value when the response to a failure is automatic threshold inflation.

| Symptom | Likely cause | Evidence to inspect | Correct response |
|---|---|---|---|
| Size fails in every run | Shipped payload growth | Resource summary and bundle output | Remove, split, or explicitly approve bytes |
| One timing run is extreme | Runner or network disturbance | Per-run reports and job utilization | Repeat on controlled infrastructure |
| All timings shift together | Build or environment change | Base comparison under same conditions | Investigate artifact and server path |
| Only one route has no results | URL or readiness problem | Collection logs and HTTP response | Fix target before touching thresholds |
| Accessibility score drops | New DOM or styling defect | Failed audit details | Repair issue, do not trade against performance |

## Separate release blockers from investigation signals

An effective gate is intentionally small. Errors should represent conditions where shipping is riskier than delaying. Warnings should expose directional changes or debts being ratcheted. Report-only signals support investigation. When everything is an error, teams learn to distrust or bypass the job.

Ownership matters. Resource limits may belong to the web-platform team, LCP to the feature team responsible for the page, and third-party count to privacy or marketing engineering. Put an owner and response expectation beside each policy in repository documentation.

Review budgets after architecture changes, not on an arbitrary weekly schedule. A rendering migration, analytics vendor change, major design redesign, or new authenticated shell can justify recalibration. Recalibration means collecting a new baseline and documenting a product decision. It does not mean editing numbers until CI is green.

Finally, remember that Lighthouse lab data and real-user monitoring answer different questions. CI is excellent at preventing deterministic changes in a known environment. Field telemetry validates whether real devices, networks, caches, and interaction patterns meet user goals. A mature program uses both and investigates disagreement instead of declaring one source correct by default.

## Preserve enough evidence to review the decision later

A performance gate is an automated decision, so its evidence needs the same care as a functional test artifact. Keep the Lighthouse HTML or JSON reports for failed jobs, record the commit and audited URL, and make the collection configuration available beside the result. A screenshot of the category dial is not sufficient because it omits audit details, numeric values, resource rows, and run-to-run spread.

Retention can be shorter for passing pull requests and longer for failures or default-branch baselines. The exact duration is an organizational choice. What matters is that an engineer investigating a regression can compare the candidate with a representative base result produced under the same setup. If reports may contain private page content, headers, or URLs, apply appropriate access and retention controls rather than uploading them to a public target.

Periodically audit the gate itself. Select recent failures and confirm that the reported assertion matched the product policy, the configured URL actually loaded the intended page, and the team’s response was consistent. Also sample passing changes with large bundle diffs to see whether the current resource categories would catch an important regression. This is test effectiveness analysis for the performance test.

Treat tool upgrades as measurement changes. Review release information, run the old and candidate dependency sets against the same built pages, and explain meaningful audit movement before updating the lockfile. The goal is not to freeze Lighthouse forever. It is to keep a visible bridge between two measuring instruments so a dependency update is not confused with a product change.

## Frequently Asked Questions

### Should Lighthouse CI fail on the performance category score?

It can, but a category score is usually better as a warning than the only hard gate. The score is weighted and can move when individual audits change in opposite directions. Numeric assertions on user-facing metrics and resource limits provide clearer failure messages. If your organization uses the category as a release contract, pin the tool through the lockfile, baseline it on controlled infrastructure, and pair the score with specific assertions that explain what actually regressed.

### How many Lighthouse runs should a CI job collect?

Use enough repetitions to characterize normal variation without making feedback unacceptably slow. Five runs per URL is a practical starting point for an important gate, but the correct number depends on runner stability and route count. Compare repeated default-branch jobs before deciding. If results remain wildly dispersed, adding more repetitions may only measure contamination more precisely. Fix variable data, shared CPU pressure, remote dependencies, and server readiness first, then choose an aggregation method that represents the risk.

### When should a budget failure be changed from error to warn?

Change severity only when the team has consciously decided the condition should not block release, and record an owner plus a deadline. A sudden failure on a pull request is not itself a reason to weaken enforcement. Warnings are useful during initial baselining, for noisy but valuable signals, or while a planned remediation is underway. They become harmful when they persist without action because developers stop reading them. Promote a warning to error once its measurement is stable and the page passes consistently.

### Can Lighthouse CI replace production performance monitoring?

No. Lighthouse CI catches regressions in a controlled lab page before deployment. It does not reproduce the full distribution of real devices, networks, locations, caches, authentication states, or user interactions. Production monitoring supplies field evidence, while CI supplies repeatable pre-release evidence. Use CI to enforce code and asset contracts, then compare those signals with real-user metrics. If lab results remain stable while field performance worsens, investigate traffic mix, backend latency, third parties, and deployment behavior rather than loosening the CI gate.
`,
};
