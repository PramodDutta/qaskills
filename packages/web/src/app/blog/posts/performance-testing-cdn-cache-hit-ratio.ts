import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Testing CDN Cache Hit Ratio Without Misleading Results',
  description: 'Learn performance testing CDN cache hit ratio with controlled warmups, k6 metrics, cache-key probes, and origin evidence that exposes costly misses.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# Performance Testing CDN Cache Hit Ratio Without Misleading Results

Performance testing CDN cache hit ratio requires a representative request mix, a denominator limited to cache-eligible requests, and independent evidence from both the CDN response and the origin. Warm the intended objects, drive a controlled distribution of repeat and first-seen requests, classify every eligible response, and correlate the observed hit ratio with origin request volume and latency. A fast response alone is not proof of a cache hit.

The useful result is not “our hit rate is 92 percent.” It is “for this documented mix of static, anonymous, cache-eligible GET requests, after this warmup and from these locations, 92 percent was observed, origin traffic matched the misses, and tail latency stayed within the chosen objective.” Compare load generators with the [k6 versus JMeter guide](/blog/k6-vs-jmeter-2026), and analyze the latency distribution beside the [p99 tail latency guide](/blog/performance-testing-p99-tail-latency-analysis). Cache efficiency and user-perceived speed are related, but neither substitutes for the other.

## Define the numerator, denominator, and eligibility rules first

Cache hit ratio is commonly expressed as cache hits divided by cache-eligible requests. That final phrase matters. AWS documents CloudFront’s CacheHitRate as the percentage of cacheable requests served from cache and notes that POST, PUT, and errors are not considered cacheable for that metric: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html. Your CDN, log pipeline, and test script may classify requests differently, so document the exact rule used for the experiment.

Do not include authenticated API calls, intentional bypass requests, uncached write methods, or administrative purges in the denominator unless the performance question explicitly concerns them. Otherwise a product traffic change can move the ratio even when caching behavior is identical.

| Response class | Include as eligible? | Count in numerator? | Evidence required |
|---|---:|---:|---|
| Fresh edge hit | Yes | Yes | Vendor status or trusted log says hit |
| Stale object served by policy | Usually yes | Define explicitly | Status distinguishes stale behavior |
| Revalidated cached object | Define explicitly | Often separate | Status plus origin validation evidence |
| First cacheable miss | Yes | No | Miss status and origin request |
| Expired object fetched again | Yes | No | Expiry status or age evidence |
| Intentional bypass | No | No | Bypass rule identified |
| Uncacheable authenticated response | No | No | Policy or cache-control explains exclusion |
| Error response | Vendor and policy dependent | Usually no | Status code and CDN metric definition |

Track the raw counts alongside the ratio. A ratio of 90 percent could mean 9 hits out of 10 requests or 900,000 hits out of 1,000,000. The latter has much stronger sampling volume, but it can still be unrepresentative if one popular asset dominates every request.

For a single test run, calculate at least these values:

- eligible request count
- definite hits
- definite misses
- stale or revalidated responses
- bypassed or uncacheable responses
- unclassified responses
- origin requests for the same run marker and interval
- cache-hit and cache-miss latency distributions

An unclassified response should not be silently treated as a miss. It can indicate a stripped header, unexpected CDN layer, error page, or a classifier that no longer matches the provider. Fail or flag the run if the unclassified share exceeds an intentionally small tolerance.

## Establish a safe, observable target set

Use assets you own and a non-production or approved performance environment. Coordinate with the CDN and origin operators before generating load. The target set should contain immutable objects, short-TTL objects, query-sensitive objects, and deliberately uncacheable endpoints. This lets the script prove its classification logic instead of producing one blended number.

| Target group | Example behavior | Purpose in the test | Expected result |
|---|---|---|---|
| Versioned static | Long-lived \`/assets/app.abc123.js\` | Stable hot-object baseline | Miss once per relevant cache, then hits |
| Product image | Cacheable with moderate TTL | Realistic object-size mix | Mostly hits after warmup |
| Short-TTL document | Expires during the run | Expiry and revalidation path | Periodic miss or validation behavior |
| Query-sensitive image | Selected query key varies representation | Cache-key correctness | One cache entry per meaningful variant |
| Ignored tracking query | Tracking value should not vary content | Fragmentation detection | Same cached object across markers |
| Private account page | Explicitly non-cacheable | Safety control | Never classified as public hit |

Use a run identifier in an origin-visible header when policy allows it, not automatically in the URL. Adding a unique query value to every request can create a new cache key and destroy the very hit behavior being measured. If the CDN forwards the test header to origin but does not include it in the cache key, origin logs can isolate the experiment without fragmenting objects. Confirm that assumption from the deployed cache policy.

Start with a manual probe. Request the same versioned object several times and retain headers. Replace the URL with your authorized target.

\`\`\`bash
curl --silent --show-error --dump-header first.headers --output /dev/null \
  -H 'X-QA-Run: cache-ratio-smoke' \
  'https://cdn.example.test/assets/app.abc123.js'

curl --silent --show-error --dump-header second.headers --output /dev/null \
  -H 'X-QA-Run: cache-ratio-smoke' \
  'https://cdn.example.test/assets/app.abc123.js'

sed -n '1,30p' first.headers
sed -n '1,30p' second.headers
\`\`\`

Inspect \`Cache-Control\`, \`Age\`, \`ETag\`, \`Vary\`, the provider’s cache-status header, and the HTTP status. Header names are case-insensitive. The first response is not guaranteed to be a miss if an edge already has the object, and the second is not guaranteed to be a hit if requests reach different caches or the response is uncacheable.

## Turn CDN status headers into explicit k6 metrics

k6 supports custom Rate, Counter, and Trend metrics, and those metrics can receive tags. The official custom metric documentation is at https://grafana.com/docs/k6/latest/using-k6/metrics/create-custom-metrics/. Create metrics in init context, then add observations during virtual-user iterations.

Cache status vocabulary differs by provider and configuration. Centralize classification so a header change produces one clear failure. The following function accepts a normalized status value supplied by the caller. Its categories are an example contract that you should adapt to observed, documented values from your CDN.

\`\`\`js
export function classifyCacheStatus(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();

  if (value === 'hit' || value.startsWith('hit from')) return 'hit';
  if (value === 'miss' || value.startsWith('miss from')) return 'miss';
  if (value === 'expired' || value === 'refreshhit') return 'expired';
  if (value === 'stale' || value.startsWith('stale from')) return 'stale';
  if (value === 'bypass' || value === 'dynamic') return 'bypass';
  return 'unknown';
}
\`\`\`

Do not paste a status list into production tests without checking your provider. For example, one service may expose multiple words in \`X-Cache\`, another may use \`CF-Cache-Status\`, and standardized \`Cache-Status\` can contain parameters and multiple cache entries. Treat the raw value as evidence and store samples when classification is unknown.

This k6 script targets cacheable public objects, tracks definite hits among eligible responses, records miss and hit duration separately, and fails on unknown classifications. Set \`BASE_URL\` to an authorized CDN hostname before running it.

\`\`\`js
// cache-ratio.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { classifyCacheStatus } from './cache-classifier.js';

const cacheHitRatio = new Rate('cdn_cache_hit_ratio');
const eligibleRequests = new Counter('cdn_cache_eligible_requests');
const unknownStatuses = new Counter('cdn_cache_unknown_statuses');
const hitDuration = new Trend('cdn_hit_duration', true);
const missDuration = new Trend('cdn_miss_duration', true);

const baseUrl = __ENV.BASE_URL;
if (!baseUrl) throw new Error('BASE_URL is required');

const objects = [
  '/assets/app.abc123.js',
  '/assets/styles.def456.css',
  '/images/catalog/item-42.webp',
  '/images/catalog/item-84.webp',
];

export const options = {
  scenarios: {
    cache_mix: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    cdn_cache_hit_ratio: ['rate>0.90'],
    cdn_cache_unknown_statuses: ['count==0'],
    http_req_failed: ['rate<0.01'],
  },
};

function headerValue(headers, wantedName) {
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === wantedName.toLowerCase(),
  );
  return key ? headers[key] : '';
}

export default function () {
  const path = objects[Math.floor(Math.random() * objects.length)];
  const response = http.get(baseUrl + path, {
    headers: { 'X-QA-Run': __ENV.RUN_ID || 'local-cache-ratio' },
    tags: { asset_path: path },
  });

  check(response, {
    'response is successful': (result) => result.status >= 200 && result.status < 300,
  });

  const raw = headerValue(response.headers, __ENV.CACHE_HEADER || 'X-Cache');
  const outcome = classifyCacheStatus(raw);

  if (outcome === 'hit' || outcome === 'miss' || outcome === 'expired') {
    eligibleRequests.add(1, { outcome, asset_path: path });
    const isHit = outcome === 'hit';
    cacheHitRatio.add(isHit, { asset_path: path });
    if (isHit) hitDuration.add(response.timings.duration, { asset_path: path });
    else missDuration.add(response.timings.duration, { outcome, asset_path: path });
  } else if (outcome === 'unknown') {
    unknownStatuses.add(1, { raw_status: raw || 'missing' });
  }

  sleep(0.1);
}
\`\`\`

The threshold of 90 percent and the arrival rate are illustrative. Replace them with values derived from the target’s traffic model and reliability objectives. A \`Rate\` records the fraction of nonzero values added to it. Because the script adds only definite eligible outcomes, bypass and unknown responses do not corrupt that denominator. They remain visible through separate counters.

Run a short validation first and preserve the end-of-test output:

\`\`\`bash
export BASE_URL='https://cdn.example.test'
export CACHE_HEADER='X-Cache'
export RUN_ID='cache-ratio-validation-001'

k6 run cache-ratio.js
\`\`\`

Before trusting the threshold, manually compare a sample of raw headers with the classifier. A clean zero in the unknown counter proves only that the implemented categories matched, not that the categories mean what the CDN team intends.

## Design a traffic model that can reveal fragmentation

A uniform random choice over four objects is useful for a fixture, but production traffic is rarely uniform. A few objects may be very hot, a long tail may be requested once, and personalization may split cache keys. Build the model from sanitized access logs or an approved synthetic distribution. Keep the object identities stable for repeat requests.

Test at least three mixes:

1. A hot-set mix that repeatedly requests a small set and establishes maximum practical hit behavior.
2. A representative mix with the observed popularity distribution and object sizes.
3. A churn mix that introduces new or newly versioned objects at a controlled rate.

The hot set checks whether the policy can cache at all. The representative set estimates behavior under the declared traffic shape. The churn set shows how deployment waves, catalog changes, or media uploads consume cache capacity and origin headroom.

| Workload mistake | How the metric is distorted | Better design |
|---|---|---|
| Unique query value per request | Every request can become a miss | Keep cache keys stable, mark origin through a non-key header |
| One asset requested by all VUs | Inflates ratio above real traffic | Use measured popularity and long-tail distribution |
| URLs chosen sequentially per VU | Artificial synchronized bursts | Use a seeded or recorded distribution when reproducibility matters |
| Mixed private and public routes | Denominator loses meaning | Tag eligibility and report groups separately |
| Only warm phase measured | Hides deployment and expiry cost | Report cold, warm, churn, and expiry phases |
| Only one object size | Miss penalty is unrealistic | Include representative byte-size bands |

What people get wrong is optimizing the ratio before validating the cache key. Removing every query string, cookie, or header can raise the metric while serving the wrong representation. A correct miss is better than a wrong hit. For each dimension removed from the key, test two requests that should share content and two that must not.

## Probe cache-key dimensions as paired experiments

The cache key determines which requests share an object. Create pairs where only one dimension changes, then compare response body hashes and cache outcomes. Relevant dimensions can include path normalization, selected query parameters, language, encoding, device class, cookie presence, and authorization state.

The following Node script makes sequential requests and calculates a body digest. It uses built-in \`fetch\` and crypto APIs available in supported modern Node releases. Adjust \`cacheHeader\` and target URLs to your environment.

\`\`\`js
// cache-key-probe.mjs
import { createHash } from 'node:crypto';

const baseUrl = process.env.BASE_URL;
if (!baseUrl) throw new Error('BASE_URL is required');

const cacheHeader = process.env.CACHE_HEADER || 'x-cache';
const cases = [
  { name: 'base', path: '/images/hero.webp?width=800' },
  { name: 'tracking-change', path: '/images/hero.webp?width=800&utm_source=qa' },
  { name: 'meaningful-width', path: '/images/hero.webp?width=400' },
];

for (const testCase of cases) {
  const response = await fetch(baseUrl + testCase.path, {
    headers: { 'X-QA-Run': 'cache-key-probe' },
  });
  const body = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(body).digest('hex');
  console.log(JSON.stringify({
    name: testCase.name,
    status: response.status,
    cache: response.headers.get(cacheHeader),
    age: response.headers.get('age'),
    bytes: body.length,
    sha256: digest,
  }));
}
\`\`\`

If tracking parameters are intentionally excluded from the cache key, the base and tracking-change cases should return the same representation and should converge on the same cache object. The width change should return the correct different representation if width controls transformation. Run each pair enough times to observe the post-warmup state, and account for regional cache layers.

Headers listed in \`Vary\` can also split variants. A broad \`Vary\` value or a forwarded cookie policy can reduce sharing dramatically. Inspect the deployed cache policy rather than assuming response headers alone describe every provider-specific key rule.

## Separate cold, warm, expiry, and invalidation phases

A single blended run conceals lifecycle behavior. Name the phases and report each one. Cold-cache testing is operationally sensitive because a broad purge followed by load can stress the origin. Do not purge shared production caches for a test unless the owning team explicitly authorizes it. Safer alternatives include a newly versioned object set, an isolated distribution, or a dedicated cache namespace.

In a controlled environment, use this sequence:

- Provision or select the test object set and record cache directives.
- Run cold probes against newly versioned paths and capture initial misses.
- Warm each intended location with a bounded request count.
- Begin the measured steady phase only after the documented condition is met.
- Continue across at least one short-TTL boundary for expiry behavior.
- Invalidate one test-owned object and measure recovery separately.

Do not erase warmup observations. Report them outside the steady-state ratio because they predict deployment and disaster-recovery load. If the business deploys thousands of new assets at once, cold behavior is not an edge case.

A time-to-warm metric can be more actionable than a final ratio. Define it as the duration or request count until a moving window meets the target hit ratio without unknown responses. State the window size. All such target values are product-specific.

## Account for edge location, shield layers, and collapsed requests

CDNs are distributed. Requests from one load-generator region do not prove another region is warm. DNS, anycast routing, provider topology, and cache tiers can send traffic through different points of presence. Run approved tests from the geographies in scope, label results by source, and use provider logs or diagnostic headers to identify the serving location where available.

An origin shield or parent cache can make an edge miss without causing an origin request. Conversely, concurrent misses for one object may be collapsed into a single origin fetch. This is good behavior, but a simple “edge misses equal origin requests” assertion will fail. Define the layers:

| Event | Edge status | Parent or shield | Origin effect |
|---|---|---|---|
| Fresh edge hit | Hit | Not consulted | No origin request |
| Edge miss, shield hit | Miss at edge | Hit | No origin request |
| Full miss | Miss | Miss | Origin request expected |
| Collapsed full misses | Several viewer misses | One fill in progress | Often one origin fetch |
| Revalidation | Expired or validation status | May validate upstream | Conditional origin request possible |

Correlate counts within a time interval instead of demanding one-to-one equality. If provider logs expose cache-layer fields, segment them. If they do not, use origin request IDs and object paths to understand fill behavior.

## Correlate ratio with latency, bytes, and origin capacity

Raising cache hit ratio is valuable because it can reduce origin load, network transfer, and latency. But averages can hide expensive misses. Report hit and miss latency separately, plus useful percentiles and object-size bands. A small fraction of multi-megabyte misses can dominate origin bandwidth while barely moving a request-count ratio.

Calculate byte hit ratio when logs provide response bytes:

\`\`\`text
byte hit ratio = bytes served from cache / bytes from all cache-eligible responses
request hit ratio = cache hits / cache-eligible requests
origin offload ratio = 1 - origin fetches attributable to eligible viewer requests / eligible viewer requests
\`\`\`

These metrics answer different questions. Request hit ratio describes request frequency. Byte hit ratio describes transfer efficiency. Origin offload reflects cache hierarchy, request collapsing, and revalidation. State how partial responses and errors are treated.

Grafana k6 thresholds can fail a run based on custom metrics, and Trend metrics support percentile expressions. Official threshold behavior is documented at https://grafana.com/docs/k6/latest/using-k6/thresholds/. Use thresholds only after the metric tags and traffic mix are stable. A green ratio threshold with a red p99 or saturated origin is not a successful performance result.

## Diagnose a hit-ratio collapse after a harmless release

Imagine the representative test drops from an illustrative 91 percent to 38 percent after a frontend release. Response time increases, but cache-control headers look unchanged. Do not immediately lengthen TTL. Segment misses by path, query cardinality, cookie presence, response status, and edge location.

The diagnosis often reveals that a new analytics query parameter is included in the cache key. Each page request generates a distinct value, so the CDN stores many equivalent objects. Evidence includes a sharp rise in unique cache keys, identical body hashes across query variants, stable cache-control, and higher origin requests. The fix is a reviewed cache policy change that excludes only the non-semantic parameter, followed by correctness pairs proving meaningful parameters still vary the representation.

Other failure signatures include:

| Signature | Probable cause | Confirmation |
|---|---|---|
| Misses increase only for one location | Cold or capacity-constrained edge | Location-segmented logs and repeated probes |
| Bypass rises with a new cookie | Cookie forwarding or bypass rule | Paired request with and without cookie |
| Expired responses spike periodically | TTL too short for traffic pattern | Age and expiry timeline |
| Unknown status appears suddenly | Header stripped or provider vocabulary changed | Raw response and configuration diff |
| Ratio stable, origin load rises | Shield change, revalidation, or non-test traffic | Layer logs and run marker |
| Ratio rises, wrong content appears | Cache key over-collapsed | Body hashes across required variants |

The corrective test must preserve both performance and correctness assertions. Otherwise an optimization can make the dashboard greener by merging representations that users need separated.

## Make the result reproducible in CI and scheduled environments

CI is suitable for a small cache-policy smoke test against an isolated target. Larger regional load tests belong in an approved scheduled environment with capacity safeguards. In both cases, store the script commit, deployed cache-policy revision, target manifest, run window, source locations, threshold set, and raw summary.

Use unique run IDs that are shell-safe and unambiguous. When composing CI variables, delimit them explicitly:

\`\`\`bash
run_id="\${CI_PIPELINE_ID:-local}_\${CI_NODE_INDEX:-0}"
export RUN_ID="$run_id"
export BASE_URL='https://cdn.example.test'
export CACHE_HEADER='X-Cache'

k6 run cache-ratio.js
\`\`\`

The braces prevent the shell from greedily interpreting adjacent underscores and names as one variable. Keep the run ID out of the cache key unless fragmentation is the purpose of the scenario.

Before promoting a cache configuration, require evidence that the test classified nearly all eligible responses, hit-ratio counts reconcile with the chosen CDN metric within explained differences, origin traffic stayed within capacity, correctness pairs passed, and cold behavior was reviewed. That package is far more useful than a screenshot of one percentage.

## Compare runs with counts and fixed traffic windows

A percentage difference is not automatically a performance regression. Compare runs with the same target manifest, request distribution, source locations, phase boundaries, cache policy, and duration. Preserve the hit and eligible counts so reviewers can see whether a change is based on ten requests or tens of thousands. If the workload uses random selection, seed it when the tool and script design support deterministic sampling, or replay a fixed ordered manifest for the comparison job.

Cache observations are also correlated. Repeated requests for the same object and edge are not independent coin flips, because one miss changes the state seen by later requests. A textbook confidence interval for independent proportions can therefore imply more certainty than the experiment deserves. Prefer repeated runs or time windows that include complete cache lifecycles, then report the spread and explain common events such as expiry or invalidation. For regional systems, treat each location as an important segment rather than letting a high-volume region hide a weak one.

When a candidate policy appears better, compare at least request hit ratio, byte hit ratio when available, origin fetches, hit latency, miss latency, errors, and correctness-pair results. Require the direction of change to make operational sense. If reported hits rise but origin traffic and miss latency also rise sharply, investigate classification, unrelated traffic, or cache hierarchy behavior instead of declaring success.

For a scheduled dashboard, use stable window definitions and annotate deployments, purges, and origin incidents. A rolling ratio can look healthy immediately after a previous hot period even while the latest deployment is missing heavily. Short windows react faster but are noisier; long windows are stable but can conceal a current fault. Showing both counts and lifecycle-aware segments lets QA and operations interpret the same test without overstating numerical precision.

## Frequently Asked Questions

### What is a good CDN cache hit ratio for a performance test?

There is no universal good percentage. A versioned static-asset workload should generally achieve a much higher ratio than a catalog with frequent updates, personalized variants, or a large one-request tail. Define a target from the eligible production traffic mix, origin capacity, cost goals, and freshness requirements. Publish raw hits, misses, and exclusions with the percentage. An illustrative 95 percent target can be dangerously low for a massive asset service or unrealistically high for short-lived content. Correct representation and bounded origin load matter more than maximizing one ratio.

### Should warmup requests count in the cache hit ratio?

Report warmup separately from the measured steady phase, but do not discard it. Warmup reveals deployment, purge, failover, and new-region risk. Start steady-state measurement after a documented condition, such as every manifest object receiving one request in each test location or a moving window reaching stability. Avoid a vague fixed sleep. If the real workload frequently introduces new objects, include a controlled churn share in the measured scenario too. A warm-only ratio overstates reality, while a cold-only ratio can understate routine operation.

### Can I infer cache hits from low response times or the Age header?

No. A nearby fast origin can resemble a hit, and a cached response can be slow because of congestion or a large transfer. An Age header is useful evidence but can be absent, reset, or affected by cache layers and policy. Classify using documented CDN status fields or trusted logs, retain the HTTP status and relevant headers, and correlate with origin requests. Use latency as a separate outcome. When evidence conflicts, mark the response unknown and investigate instead of forcing it into hit or miss to protect a clean ratio.

### Why does my load test show more CDN misses than origin requests?

An edge miss does not always reach the origin. A parent cache or origin shield may satisfy it, and a CDN can collapse concurrent requests for the same uncached object into one upstream fetch. Revalidation may also produce conditional requests with different counting rules. Identify each cache layer, segment provider logs when possible, and compare counts over a bounded interval rather than assuming a one-to-one mapping. If origin requests exceed explained full misses, check non-test traffic, retries, redirects, range requests, and whether the run marker reaches origin without altering the cache key.
`,
};
