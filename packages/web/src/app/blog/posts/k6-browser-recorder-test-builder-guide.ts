import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Browser Recorder and Test Builder Complete Guide 2026',
  description:
    'Master the k6 browser recorder, test builder, and Chrome extension. Capture HAR files, generate scripts, parameterize requests, and ship reliable load tests fast.',
  date: '2026-05-03',
  category: 'Performance',
  content: `
# k6 Browser Recorder and Test Builder Complete Guide 2026

Writing the first version of a k6 script by hand is tedious. You need every URL, every header, every form field. For complex user journeys with twenty requests across login, search, add-to-cart, and checkout, this can take an hour of finicky tab-flipping between dev tools and your editor. The k6 browser recorder and the related Test Builder solve this. The recorder is a Chrome extension that captures your actions in a real browser and produces a working k6 script. The Test Builder is a graphical interface in Grafana Cloud k6 that lets you drag-and-drop a test together from existing HAR files.

This guide covers both tools end-to-end in 2026. We walk through installation, the recording workflow, post-recording cleanup that turns a brittle recording into a maintainable script, parameterization, the Test Builder UI, importing HAR files from any browser, and the patterns we use to keep recordings DRY across multiple journeys. Performance work is faster with the right authoring tools; this is the meta-skill. For deeper script-level coverage see [k6 Cloud guide](/blog/k6-cloud-grafana-cloud-complete-guide) and the [skills directory](/skills).

## Why Use a Recorder

Three reasons. First, exhaustive request capture: a recorder will capture every XHR, every analytics beacon, every preflight CORS request, every prefetch. You then decide which ones matter for load. Without a recorder you miss requests, and missed requests mean unrealistic load. Second, headers and cookies: real browsers send dozens of headers and cookies the user doesn't know about. Hand-writing them is error prone; a recorder gets them right. Third, dynamic values: a recording reveals which request fields are correlated (e.g., a session token from login appears in subsequent requests). The recorder makes this visible so you can parameterize.

The trade-off is fidelity. A recording captures one specific traversal. It is a baseline, not a finished script. You will spend an hour after the recording doing cleanup: parameterizing, adding think time, removing analytics noise, adding checks. Skipping cleanup is the most common reason recordings fail in production: the test passes locally but fails at scale because every VU is hitting the same product ID with the same cart.

| Recording Source | Pros | Cons |
|---|---|---|
| k6 Chrome extension | Native k6 output, smart filtering | Chrome only |
| HAR file from any browser | Works in Firefox, Safari, Edge | Manual conversion |
| Playwright codegen | Real browser interactions | Outputs Playwright, not k6 |
| Charles Proxy | Captures non-browser HTTP too | Heavier setup |
| mitmproxy | Programmatic capture | CLI-heavy |

## Installing the k6 Chrome Extension

The extension is on the Chrome Web Store. Search for "k6 Browser Recorder" or install it from the Grafana Cloud k6 dashboard via the "Record" button. After installation, pin the extension to your toolbar so you can see its status indicator while you record.

Once installed, click the icon. The popup gives you three controls: start recording, stop recording, and download. The status indicator turns red while recording is active. The recorder runs entirely client-side: no traffic leaves your machine until you choose to download or upload.

\`\`\`bash
# After downloading the script via the extension, you typically save as:
mkdir -p tests/load/recorded
mv ~/Downloads/recorded-script.js tests/load/recorded/checkout-baseline.js

# Then validate locally
k6 run --vus 1 --iterations 1 tests/load/recorded/checkout-baseline.js
\`\`\`

The single-VU single-iteration run is critical. A recording often includes requests that don't replay deterministically: missing tokens, expired cookies, time-bound URLs. Catching them at 1 VU is two orders of magnitude faster than catching them at 1,000.

## The Recording Workflow

A clean recording follows the same pattern every time:

1. Open a fresh incognito window. Existing cookies pollute the recording.
2. Log into the test environment manually. Bookmark the post-login dashboard.
3. Click the k6 extension icon, then Start Recording.
4. Click through your journey at a normal user pace. Don't rush; pauses are easier to detect later.
5. Stop recording before navigating away or closing the tab.
6. Download the generated script.

The pace matters because the recorder captures wall-clock time between actions. If you click through the entire journey in three seconds your generated script has \`sleep(0.5)\` calls. If your real users take 30 seconds, your test will hammer the backend ten times harder than reality. We have seen multiple teams fail load tests for this reason before figuring out the cause.

\`\`\`javascript
// Generated script (simplified)
import { sleep, group } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  group('Login', () => {
    const res1 = http.get('https://app.example.com/login');
    const res2 = http.post('https://api.example.com/auth/login',
      'email=test@example.com&password=Demo123!',
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  });
  sleep(2.4);

  group('Browse', () => {
    const res3 = http.get('https://app.example.com/products');
    const res4 = http.get('https://api.example.com/products?q=laptop&page=1');
  });
  sleep(3.1);

  group('Checkout', () => {
    const res5 = http.post('https://api.example.com/cart/add',
      JSON.stringify({ sku: 'LAPTOP-789', qty: 1 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  });
  sleep(1.7);
}
\`\`\`

This is your starting point, not your finished script. The next sections cover what we change.

## Filtering Noise

A typical recording captures dozens of requests that are not load-test-relevant: analytics beacons (Google Analytics, Segment, Mixpanel), tag manager scripts, third-party widgets like Intercom, ad pixels, font CDNs, and CSS files. Including these in your load test inflates RPS without measuring your service.

The recorder offers a domain allowlist in the extension settings. Add your own domains (api.example.com, app.example.com) and exclude everything else. The resulting script only contains requests to your service.

\`\`\`javascript
// Configuration: only record these domains
const ALLOWED_DOMAINS = [
  'api.example.com',
  'app.example.com',
  'cdn.example.com', // include if testing your CDN
];
\`\`\`

For requests you can't pre-filter (e.g., one origin serves both your API and a third-party widget), you remove them by hand in post-processing. Look for requests to domains you don't own and delete them from the generated script.

| Request Type | Keep or Drop |
|---|---|
| Your API calls | Keep |
| Your CDN if testing it | Keep |
| Static assets (CSS, JS, fonts) | Drop unless testing CDN |
| Analytics beacons | Drop |
| Third-party widgets | Drop |
| Ad pixels | Drop |
| Preflight OPTIONS | Keep (matters for CORS scale) |
| Health checks | Drop |

## Parameterization

The biggest task in post-processing is parameterization. The recording has hard-coded values: email, password, product ID, cart ID, session token. At scale every VU using the same values causes one of two problems: duplicate-key errors in the database, or unrealistic cache hits making the test look faster than reality.

Three parameterization patterns:

\`\`\`javascript
// Pattern 1: Per-VU credentials from a SharedArray
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', () =>
  JSON.parse(open('./users.json'))
);

export default function () {
  const user = users[__VU % users.length];
  http.post('https://api.example.com/auth/login', user);
}

// Pattern 2: Random selection
const products = ['SKU-001', 'SKU-002', 'SKU-003', 'SKU-004'];
const product = products[Math.floor(Math.random() * products.length)];

// Pattern 3: Captured from response (correlation)
const loginRes = http.post('/auth/login', body);
const sessionToken = loginRes.json('token');

const cartRes = http.post('/cart', body, {
  headers: { Authorization: \`Bearer \${sessionToken}\` },
});
\`\`\`

The correlation pattern is the one that turns a recording into a real test. The recorder cannot know that the \`token\` field in the login response becomes the Authorization header on subsequent requests. You add this manually. Without it, every subsequent request fails with 401.

## Realistic Think Time

The recorder captures the actual wall-clock delays between your actions and inserts them as \`sleep()\` calls. These represent your behavior, not the population average. Real users vary: some are slow, some are fast, the distribution has a long tail. Use a random sleep instead:

\`\`\`javascript
import { sleep } from 'k6';

function thinkTime(min = 1, max = 5) {
  sleep(min + Math.random() * (max - min));
}

export default function () {
  group('Login', () => { /* ... */ });
  thinkTime(2, 6);

  group('Browse', () => { /* ... */ });
  thinkTime(5, 15); // browsing is slower than form filling

  group('Checkout', () => { /* ... */ });
  thinkTime(3, 8);
}
\`\`\`

The min and max should mirror real user behavior. If you have analytics on your production site you can pull median dwell times per page. Lacking that, the rough heuristic is 2 to 6 seconds for form pages, 5 to 15 for browsing, and 1 to 3 for confirmation pages.

## Adding Checks

The recorded script has no assertions. It will count any HTTP response as a success even if it's a 500. Add checks to make failures visible:

\`\`\`javascript
import { check } from 'k6';

const loginRes = http.post('/auth/login', user);
check(loginRes, {
  'login 200': (r) => r.status === 200,
  'login returns token': (r) => r.json('token') !== undefined,
  'login p95 < 500ms': (r) => r.timings.duration < 500,
});

const cartRes = http.post('/cart', body, { headers });
check(cartRes, {
  'cart 200 or 201': (r) => [200, 201].includes(r.status),
  'cart returned id': (r) => r.json('id') !== undefined,
});
\`\`\`

Checks fail silently by default (they don't abort the iteration). Pair them with a threshold on \`checks\` so a high failure rate breaks the test.

## The Test Builder

The Test Builder is a web interface in Grafana Cloud k6 for building tests without writing code. It is most useful for non-engineering team members (e.g., product managers running smoke tests) or for first-time users who don't know JavaScript yet. The output of the Test Builder is a script that you can later edit by hand, so it's a useful learning aid as well.

The workflow: open the Test Builder, click "Add request", paste a URL, add headers and body, then drag-and-drop requests into groups. The UI handles correlation via a "Capture variable" feature: select a JSON path from a response and assign it to a variable that subsequent requests can reference.

Behind the scenes the Test Builder generates the same k6 script you would have written by hand. You can switch to the script view at any time and copy the output into your repo. Most production teams use Test Builder for prototyping and then move to git-tracked scripts for ongoing work.

## Importing HAR Files

If your team uses Firefox, Safari, or Edge, the Chrome extension is unavailable. The fallback is HAR files. Every modern browser can export a HAR (HTTP Archive) of network activity from its dev tools. The k6 CLI has a built-in converter:

\`\`\`bash
# Export HAR from Firefox: Dev Tools > Network > right-click > Save All As HAR
# Convert to k6 script
k6 convert checkout.har -O tests/load/checkout-from-har.js

# Inspect
k6 inspect tests/load/checkout-from-har.js
\`\`\`

The converter takes most of the same options the Chrome extension does: only-included-hostname, return-on-failed-check, batch-threshold. The output is the same shape of script and you do the same post-processing.

| Browser | HAR Export | Notes |
|---|---|---|
| Chrome | Dev Tools > Network > Right-click > Save All As HAR | Default |
| Firefox | Network > Save All As HAR | Same UI |
| Safari | Develop > Show Web Inspector > Network > Export | Enable Develop menu first |
| Edge | Dev Tools > Network > Export HAR | Same as Chrome |

## Keeping Recordings DRY

Many teams record similar flows multiple times: a Premium user journey, a Free user journey, a Mobile journey. Naively each is a separate script and they duplicate the login and browse code. The pattern that keeps them maintainable is to extract shared code into modules:

\`\`\`javascript
// modules/login.js
import http from 'k6/http';
import { check } from 'k6';

export function login(user) {
  const res = http.post('https://api.example.com/auth/login', JSON.stringify(user));
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.json('token');
}

// modules/browse.js
import http from 'k6/http';

export function browseProducts(token, query) {
  return http.get(\`https://api.example.com/products?q=\${query}\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  });
}

// tests/premium-journey.js
import { login } from './modules/login.js';
import { browseProducts } from './modules/browse.js';

export default function () {
  const token = login({ email: 'premium@x.com', password: 'p' });
  browseProducts(token, 'laptop');
  // ... rest of premium flow
}
\`\`\`

After your first three recordings, take the time to refactor into modules. Future recordings cherry-pick from them rather than starting over.

## CI Integration

A common pattern: PRs that change frontend code or API contracts trigger a smoke test of the recorded flow. If the smoke test starts failing, somebody changed an endpoint signature or removed a field, and the recording needs to be re-done. Detecting this in CI is cheap insurance:

\`\`\`yaml
name: Recorded Flow Smoke Test
on:
  pull_request:
    paths:
      - 'apps/web/**'
      - 'apps/api/**'

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run --vus 1 --iterations 5 tests/load/recorded/checkout.js
\`\`\`

For larger orgs, schedule a nightly job that runs all recorded flows at 1 VU and notifies the test owner if anything starts failing.

## Conclusion

The k6 browser recorder and Test Builder shortcut the slowest part of authoring load tests: capturing the user journey exactly as a real browser sees it. The recording is never the final product. You will spend most of your time on post-processing: filtering noise, parameterizing, adding think time, adding checks. But that hour of post-processing produces a maintainable test in a quarter of the time it takes to write from scratch.

If you are setting up performance testing for your team, start by recording one critical user journey, cleaning it up by following this guide, and committing it to your test repo. From there expand to your top five journeys and wire them into CI. Browse the [skills directory](/skills) for AI agent skills that generate k6 scripts, and read [k6 Cloud guide](/blog/k6-cloud-grafana-cloud-complete-guide) for distributed execution.
`,
};
