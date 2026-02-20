---
name: Performance Test Scenario Generator
description: Generate realistic performance test scenarios with load profiles, ramp-up patterns, think times, and acceptance criteria derived from production traffic analysis
version: 1.0.0
author: Pramod
license: MIT
tags: [performance-testing, load-testing, scenario-generation, load-profile, ramp-up, think-time, sla, throughput]
testingTypes: [performance, load]
frameworks: [k6, jmeter]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Performance Test Scenario Generator

Performance testing validates that a system meets speed, scalability, and stability requirements under expected and extreme load conditions. The difference between a performance test that provides actionable insights and one that generates misleading data comes down to scenario design. Realistic scenarios mirror actual user behavior, incorporate proper think times, follow genuine navigation patterns, and simulate the mix of operations that production traffic exhibits. This skill guides AI coding agents through generating performance test scenarios that produce trustworthy, actionable results.

## Core Principles

1. **Production Traffic as the Source of Truth**: Every load profile, user journey, and scenario mix should be derived from production analytics, access logs, or APM data. Guessing at traffic patterns produces misleading test results that give false confidence.

2. **Think Time Realism**: Real users pause between actions to read content, fill forms, and make decisions. Tests without think times create artificially aggressive load patterns that stress the system in ways production traffic never would.

3. **Scenario Mixing Reflects Reality**: Production traffic is never a single endpoint being hit uniformly. A realistic test combines browsing, searching, purchasing, and administrative actions in proportions that match observed usage patterns.

4. **Incremental Load Application**: Applying full load instantly does not represent real-world traffic growth. Ramp-up patterns allow the system to warm caches, initialize connection pools, and reach steady state before measurement begins.

5. **Threshold-Based Pass/Fail Criteria**: Performance tests without defined thresholds are observational exercises, not tests. Every scenario must include specific, measurable acceptance criteria tied to business requirements.

6. **Correlation and Parameterization**: Tests using hardcoded values do not exercise the same code paths as production requests. Dynamic values extracted from responses and parameterized from data files ensure realistic request variation.

7. **Environment Parity Awareness**: Performance test results are only meaningful when the test environment closely resembles production. Document environment differences and adjust expectations accordingly.

## Project Structure

```
performance-tests/
├── src/
│   ├── scenarios/
│   │   ├── browse-catalog.ts
│   │   ├── search-and-filter.ts
│   │   ├── checkout-flow.ts
│   │   ├── api-crud-operations.ts
│   │   └── user-registration.ts
│   ├── profiles/
│   │   ├── load-test.ts
│   │   ├── stress-test.ts
│   │   ├── spike-test.ts
│   │   ├── soak-test.ts
│   │   └── breakpoint-test.ts
│   ├── helpers/
│   │   ├── auth.ts
│   │   ├── data-generators.ts
│   │   ├── correlation.ts
│   │   └── think-time.ts
│   ├── thresholds/
│   │   └── sla-definitions.ts
│   └── data/
│       ├── users.csv
│       ├── products.json
│       └── search-terms.csv
├── jmeter/
│   ├── test-plans/
│   │   ├── load-test.jmx
│   │   └── stress-test.jmx
│   ├── data/
│   │   └── users.csv
│   └── scripts/
│       └── run-test.sh
├── results/
│   └── .gitkeep
├── dashboards/
│   └── grafana-k6-dashboard.json
├── k6.config.ts
└── package.json
```

## Load Profile Design

### Constant Load Profile

A constant load profile maintains a fixed number of virtual users throughout the test duration. This is the simplest profile, useful for establishing baseline performance metrics.

```typescript
// src/profiles/constant-load.ts
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>100'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(Math.random() * 3 + 1); // 1-4 second think time
}
```

### Ramp-Up Load Profile

Ramp-up profiles gradually increase load to identify the point at which performance degrades. This is the most common pattern for standard load tests.

```typescript
// src/profiles/load-test.ts
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';
import { browseCatalog } from '../scenarios/browse-catalog';
import { searchAndFilter } from '../scenarios/search-and-filter';
import { checkoutFlow } from '../scenarios/checkout-flow';

export const options: Options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '5m', target: 50 },    // Hold at 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Hold at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Hold at 200 users (peak)
    { duration: '3m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{scenario:browse}': ['p(95)<600'],
    'http_req_duration{scenario:checkout}': ['p(95)<1200'],
  },
};

export default function () {
  const scenario = weightedScenario();
  scenario();
}

function weightedScenario(): () => void {
  const rand = Math.random() * 100;
  if (rand < 60) return browseCatalog;       // 60% browse
  if (rand < 85) return searchAndFilter;     // 25% search
  return checkoutFlow;                        // 15% checkout
}
```

### Spike Test Profile

Spike tests simulate sudden, dramatic increases in load to verify system behavior under burst conditions, such as a flash sale or breaking news event.

```typescript
// src/profiles/spike-test.ts
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '2m', target: 50 },     // Normal load
    { duration: '5m', target: 50 },     // Steady normal
    { duration: '30s', target: 500 },   // Spike to 10x
    { duration: '3m', target: 500 },    // Hold spike
    { duration: '30s', target: 50 },    // Drop back to normal
    { duration: '5m', target: 50 },     // Recovery observation
    { duration: '2m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],      // Relaxed during spike
    http_req_failed: ['rate<0.05'],          // Allow up to 5% errors during spike
    http_req_duration: ['p(50)<1000'],       // Median should remain reasonable
  },
};
```

### Stress Test Profile

Stress tests push beyond expected peak load to find the system breaking point.

```typescript
// src/profiles/stress-test.ts
import { Options } from 'k6/options';

export const options: Options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 2000,
      stages: [
        { duration: '2m', target: 10 },     // Warm up: 10 req/s
        { duration: '5m', target: 50 },     // Normal: 50 req/s
        { duration: '5m', target: 100 },    // High: 100 req/s
        { duration: '5m', target: 200 },    // Very high: 200 req/s
        { duration: '5m', target: 500 },    // Extreme: 500 req/s
        { duration: '5m', target: 1000 },   // Breaking point search
        { duration: '3m', target: 0 },      // Recovery
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<5000'],
  },
};
```

### Soak Test Profile

Soak tests run at moderate load for extended periods to detect memory leaks, connection pool exhaustion, and resource degradation.

```typescript
// src/profiles/soak-test.ts
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '5m', target: 100 },    // Ramp up
    { duration: '8h', target: 100 },    // Sustained moderate load for 8 hours
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
    // Track that performance does not degrade over time
    'http_req_duration{window:last_30m}': ['p(95)<1000'],
  },
};
```

## Virtual User Behavior Modeling

### Realistic User Scenario with Think Times

```typescript
// src/scenarios/browse-catalog.ts
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { thinkTime, shortPause, readingTime } from '../helpers/think-time';

const catalogBrowseTime = new Trend('catalog_browse_time');
const itemsViewed = new Counter('items_viewed');

export function browseCatalog(): void {
  group('Browse Catalog Flow', () => {
    // Step 1: Visit homepage
    group('01_Homepage', () => {
      const homeRes = http.get('https://store.example.com/', {
        tags: { scenario: 'browse', step: 'homepage' },
      });
      check(homeRes, {
        'homepage loaded': (r) => r.status === 200,
        'homepage size reasonable': (r) => r.body!.length > 1000,
      });
      readingTime(2, 5); // User reads homepage for 2-5 seconds
    });

    // Step 2: Browse a category
    group('02_Category', () => {
      const categories = ['electronics', 'clothing', 'home', 'books'];
      const category = categories[Math.floor(Math.random() * categories.length)];

      const catRes = http.get(`https://store.example.com/category/${category}?page=1&limit=20`, {
        tags: { scenario: 'browse', step: 'category' },
      });
      check(catRes, {
        'category loaded': (r) => r.status === 200,
      });
      readingTime(3, 8); // User browses category listing
    });

    // Step 3: View 2-4 product details
    group('03_Product_Details', () => {
      const numProducts = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numProducts; i++) {
        const productId = Math.floor(Math.random() * 1000) + 1;

        const prodRes = http.get(`https://store.example.com/api/products/${productId}`, {
          tags: { scenario: 'browse', step: 'product_detail' },
        });
        check(prodRes, {
          'product loaded': (r) => r.status === 200 || r.status === 404,
        });
        catalogBrowseTime.add(prodRes.timings.duration);
        itemsViewed.add(1);

        readingTime(5, 15); // User reads product description
      }
    });

    // Step 4: Some users add to cart (30% probability)
    if (Math.random() < 0.3) {
      group('04_Add_to_Cart', () => {
        const addRes = http.post(
          'https://store.example.com/api/cart',
          JSON.stringify({
            productId: Math.floor(Math.random() * 1000) + 1,
            quantity: 1,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            tags: { scenario: 'browse', step: 'add_to_cart' },
          }
        );
        check(addRes, {
          'item added to cart': (r) => r.status === 200 || r.status === 201,
        });
        shortPause(); // Brief pause after action
      });
    }
  });
}
```

### Think Time Helpers

```typescript
// src/helpers/think-time.ts
import { sleep } from 'k6';

/**
 * Simulate user think time with normal distribution.
 * Real users don't pause for exact durations; they follow a distribution.
 */
export function thinkTime(minSeconds: number, maxSeconds: number): void {
  const mean = (minSeconds + maxSeconds) / 2;
  const stdDev = (maxSeconds - minSeconds) / 6;
  const duration = normalRandom(mean, stdDev);
  sleep(Math.max(minSeconds, Math.min(maxSeconds, duration)));
}

/**
 * Short pause for page transitions or button clicks (0.5-2 seconds).
 */
export function shortPause(): void {
  sleep(Math.random() * 1.5 + 0.5);
}

/**
 * Reading time: simulates user reading content on a page.
 * Duration varies based on content length.
 */
export function readingTime(minSeconds: number, maxSeconds: number): void {
  thinkTime(minSeconds, maxSeconds);
}

/**
 * Form fill time: simulates user filling out a form.
 * Typically 10-30 seconds depending on form complexity.
 */
export function formFillTime(fieldCount: number): void {
  const timePerField = Math.random() * 3 + 2; // 2-5 seconds per field
  sleep(fieldCount * timePerField);
}

function normalRandom(mean: number, stdDev: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}
```

## Data Parameterization

```typescript
// src/helpers/data-generators.ts
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Load CSV data shared across all VUs (memory efficient)
const users = new SharedArray('users', function () {
  return papaparse.parse(open('../data/users.csv'), { header: true }).data;
});

const searchTerms = new SharedArray('search_terms', function () {
  return papaparse.parse(open('../data/search-terms.csv'), { header: true }).data;
});

const products = new SharedArray('products', function () {
  return JSON.parse(open('../data/products.json'));
});

export function getRandomUser(): { username: string; password: string } {
  return users[Math.floor(Math.random() * users.length)];
}

export function getRandomSearchTerm(): string {
  return searchTerms[Math.floor(Math.random() * searchTerms.length)].term;
}

export function getRandomProduct(): { id: string; name: string; price: number } {
  return products[Math.floor(Math.random() * products.length)];
}

/**
 * Returns a unique user per VU to avoid session conflicts.
 * Uses __VU (virtual user number) as the index.
 */
export function getUserForVU(): { username: string; password: string } {
  return users[(__VU - 1) % users.length];
}
```

## Correlation for Dynamic Values

```typescript
// src/helpers/correlation.ts
import http from 'k6/http';
import { check } from 'k6';

/**
 * Extract dynamic values from responses for use in subsequent requests.
 * Common in web applications that use CSRF tokens, session IDs, or
 * pagination cursors.
 */
export function extractCsrfToken(response: any): string {
  const match = response.body.match(/name="csrf_token"\s+value="([^"]+)"/);
  if (!match) {
    console.error('CSRF token not found in response');
    return '';
  }
  return match[1];
}

export function extractSessionId(response: any): string {
  const cookies = response.cookies;
  if (cookies && cookies['session_id'] && cookies['session_id'].length > 0) {
    return cookies['session_id'][0].value;
  }
  return '';
}

export function extractPaginationCursor(response: any): string | null {
  try {
    const body = JSON.parse(response.body);
    return body.pagination?.nextCursor || null;
  } catch {
    return null;
  }
}

/**
 * Complete login flow with correlation:
 * 1. GET login page to extract CSRF token
 * 2. POST credentials with extracted token
 * 3. Return session cookies for subsequent requests
 */
export function authenticatedSession(
  baseUrl: string,
  username: string,
  password: string
): { headers: Record<string, string> } {
  // Step 1: Get login page and extract CSRF token
  const loginPage = http.get(`${baseUrl}/login`);
  const csrfToken = extractCsrfToken(loginPage);

  // Step 2: Submit login with correlated token
  const loginRes = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ username, password, csrf_token: csrfToken }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  // Step 3: Extract auth token from response
  const authToken = JSON.parse(loginRes.body as string).token;

  return {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };
}
```

## Threshold and SLA Definition

```typescript
// src/thresholds/sla-definitions.ts
import { Options } from 'k6/options';

/**
 * Thresholds derived from business SLA requirements.
 * Each threshold maps to a specific business metric.
 */
export const slaThresholds: Options['thresholds'] = {
  // Global response time SLAs
  http_req_duration: [
    'p(50)<300',     // 50th percentile under 300ms
    'p(90)<800',     // 90th percentile under 800ms
    'p(95)<1500',    // 95th percentile under 1.5s
    'p(99)<3000',    // 99th percentile under 3s
    'max<10000',     // No request exceeds 10s
  ],

  // Error rate SLA
  http_req_failed: [
    'rate<0.01',     // Less than 1% error rate
  ],

  // Throughput SLA
  http_reqs: [
    'rate>50',       // Minimum 50 requests per second
  ],

  // Scenario-specific thresholds
  'http_req_duration{scenario:browse}': ['p(95)<600'],
  'http_req_duration{scenario:search}': ['p(95)<400'],
  'http_req_duration{scenario:checkout}': ['p(95)<2000'],
  'http_req_duration{scenario:api_crud}': ['p(95)<300'],

  // Custom metrics
  'catalog_browse_time': ['avg<500', 'p(95)<1000'],
  'checkout_completion_time': ['avg<3000', 'p(95)<5000'],
};
```

## Scenario Mixing

```typescript
// src/profiles/realistic-mix.ts
import { Options } from 'k6/options';
import { browseCatalog } from '../scenarios/browse-catalog';
import { searchAndFilter } from '../scenarios/search-and-filter';
import { checkoutFlow } from '../scenarios/checkout-flow';
import { apiCrudOperations } from '../scenarios/api-crud-operations';
import { userRegistration } from '../scenarios/user-registration';

/**
 * Realistic scenario mix based on production traffic analysis:
 * - 50% browse catalog (highest traffic)
 * - 25% search and filter
 * - 15% API CRUD operations (mobile app)
 * - 8% checkout flow
 * - 2% user registration
 */
export const options: Options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '10m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'browseCatalogScenario',
      tags: { scenario: 'browse' },
    },
    search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '10m', target: 25 },
        { duration: '2m', target: 0 },
      ],
      exec: 'searchScenario',
      tags: { scenario: 'search' },
    },
    api_crud: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '14m',
      preAllocatedVUs: 50,
      exec: 'apiCrudScenario',
      tags: { scenario: 'api_crud' },
    },
    checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 8 },
        { duration: '10m', target: 8 },
        { duration: '2m', target: 0 },
      ],
      exec: 'checkoutScenario',
      tags: { scenario: 'checkout' },
    },
    registration: {
      executor: 'per-vu-iterations',
      vus: 2,
      iterations: 10,
      exec: 'registrationScenario',
      tags: { scenario: 'registration' },
    },
  },
};

export function browseCatalogScenario() { browseCatalog(); }
export function searchScenario() { searchAndFilter(); }
export function apiCrudScenario() { apiCrudOperations(); }
export function checkoutScenario() { checkoutFlow(); }
export function registrationScenario() { userRegistration(); }
```

## Geographic Distribution Simulation

```typescript
// src/profiles/geo-distributed.ts
import { Options } from 'k6/options';

/**
 * Simulate traffic from multiple geographic regions.
 * In k6 Cloud, this maps to load zones. Locally, it uses
 * different scenario weights to approximate geographic patterns.
 */
export const options: Options = {
  scenarios: {
    us_east_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 40 },
        { duration: '10m', target: 40 },
        { duration: '2m', target: 0 },
      ],
      exec: 'usEastTraffic',
      env: { REGION: 'us-east-1' },
    },
    eu_west_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '10m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      exec: 'euWestTraffic',
      env: { REGION: 'eu-west-1' },
    },
    ap_southeast_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '10m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      exec: 'apSoutheastTraffic',
      env: { REGION: 'ap-southeast-1' },
    },
  },
};
```

## Resource Monitoring Integration

```typescript
// src/helpers/monitoring.ts
import http from 'k6/http';
import { Trend, Gauge } from 'k6/metrics';

const serverCpuUsage = new Gauge('server_cpu_usage');
const serverMemoryUsage = new Gauge('server_memory_usage');
const dbConnectionPool = new Gauge('db_connection_pool_active');
const cacheHitRate = new Gauge('cache_hit_rate');

/**
 * Periodically poll server metrics during the test.
 * This provides correlation between client-side response times
 * and server-side resource utilization.
 */
export function collectServerMetrics(metricsEndpoint: string): void {
  const res = http.get(metricsEndpoint, {
    tags: { purpose: 'monitoring' },
    timeout: '5s',
  });

  if (res.status === 200) {
    try {
      const metrics = JSON.parse(res.body as string);
      serverCpuUsage.add(metrics.cpu_percent || 0);
      serverMemoryUsage.add(metrics.memory_percent || 0);
      dbConnectionPool.add(metrics.db_connections_active || 0);
      cacheHitRate.add(metrics.cache_hit_rate || 0);
    } catch (e) {
      // Silently skip if metrics endpoint returns unexpected format
    }
  }
}
```

## JMeter Examples

### JMeter Test Plan via Command Line

```bash
#!/bin/bash
# jmeter/scripts/run-test.sh

JMETER_HOME=${JMETER_HOME:-/opt/jmeter}
TEST_PLAN=$1
RESULTS_DIR="results/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$RESULTS_DIR"

# Run JMeter in non-GUI mode
$JMETER_HOME/bin/jmeter \
  -n \
  -t "jmeter/test-plans/${TEST_PLAN}.jmx" \
  -l "$RESULTS_DIR/results.jtl" \
  -e \
  -o "$RESULTS_DIR/report" \
  -Jthreads=100 \
  -Jrampup=120 \
  -Jduration=600 \
  -Jbase_url=https://api.example.com \
  -j "$RESULTS_DIR/jmeter.log"

echo "Results saved to $RESULTS_DIR"
echo "HTML report: $RESULTS_DIR/report/index.html"
```

### JMeter BeanShell Correlation

```java
// JMeter BeanShell PostProcessor for dynamic value extraction
import org.json.JSONObject;

String responseBody = prev.getResponseDataAsString();
JSONObject json = new JSONObject(responseBody);

// Extract and store for next request
String authToken = json.getString("token");
vars.put("auth_token", authToken);

String userId = json.getString("userId");
vars.put("user_id", userId);

// Extract pagination cursor
if (json.has("pagination")) {
    JSONObject pagination = json.getJSONObject("pagination");
    if (pagination.has("nextCursor")) {
        vars.put("next_cursor", pagination.getString("nextCursor"));
    }
}

log.info("Extracted auth_token: " + authToken.substring(0, 10) + "...");
```

## Results Analysis Patterns

```typescript
// src/helpers/custom-summary.ts
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export function handleSummary(data: any): { [key: string]: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    // Console output
    stdout: textSummary(data, { indent: '  ', enableColors: true }),

    // JSON results for CI/CD parsing
    [`results/summary-${timestamp}.json`]: JSON.stringify(data, null, 2),

    // Custom threshold report
    [`results/threshold-report-${timestamp}.txt`]: generateThresholdReport(data),
  };
}

function generateThresholdReport(data: any): string {
  const lines: string[] = ['PERFORMANCE TEST THRESHOLD REPORT', '='.repeat(50), ''];

  for (const [metric, thresholds] of Object.entries(data.metrics)) {
    const metricData = thresholds as any;
    if (metricData.thresholds) {
      for (const [threshold, passed] of Object.entries(metricData.thresholds)) {
        const status = (passed as any).ok ? 'PASS' : 'FAIL';
        lines.push(`[${status}] ${metric}: ${threshold}`);
      }
    }
  }

  return lines.join('\n');
}
```

## Configuration

### k6 Configuration File

```typescript
// k6.config.ts
import { Options } from 'k6/options';

const config: Options = {
  // Default thresholds applied to all tests
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.02'],
  },

  // Tags applied to all requests
  tags: {
    environment: __ENV.TEST_ENV || 'staging',
    testRun: __ENV.TEST_RUN_ID || 'local',
  },

  // DNS caching to simulate browser behavior
  dns: {
    ttl: '5m',
    select: 'roundRobin',
    policy: 'preferIPv4',
  },

  // TLS configuration
  tlsAuth: [],
  insecureSkipTLSVerify: __ENV.TEST_ENV === 'local',

  // Connection reuse (simulates keep-alive)
  noConnectionReuse: false,

  // User agent
  userAgent: 'k6-performance-test/1.0',
};

export default config;
```

### Running Tests

```bash
# Basic load test
k6 run src/profiles/load-test.ts

# With environment variables
k6 run --env BASE_URL=https://staging.example.com \
       --env TEST_ENV=staging \
       src/profiles/load-test.ts

# Output to multiple destinations
k6 run --out json=results/output.json \
       --out influxdb=http://localhost:8086/k6 \
       src/profiles/load-test.ts

# Cloud execution (k6 Cloud)
k6 cloud src/profiles/load-test.ts
```

## Best Practices

1. **Derive load profiles from production data.** Analyze access logs, APM data, and analytics to determine actual peak traffic patterns, user journeys, and endpoint distribution before designing test scenarios.

2. **Always include think times between requests.** Without think times, each virtual user generates far more load than a real user. Calibrate think times from session recordings or analytics data.

3. **Use scenario-specific thresholds.** A single global response time threshold masks problems. Set separate thresholds for browsing (fast), checkout (moderate), and reporting (slower) flows.

4. **Parameterize all test data.** Hardcoded IDs, usernames, and search terms cause cache warming effects that do not represent production. Use CSV files or generators for realistic data variation.

5. **Ramp up gradually before measuring.** The first few minutes of a test are warm-up. Do not include ramp-up data in performance analysis. Use k6 stages or JMeter ramp-up periods.

6. **Run tests against a production-like environment.** Testing against a single-instance dev environment with mock databases produces meaningless results. Match production topology as closely as possible.

7. **Include background traffic simulation.** Production systems handle background jobs, cron tasks, and admin operations alongside user traffic. Include these in scenarios for realistic resource contention.

8. **Track custom business metrics.** Beyond HTTP response times, measure business-meaningful metrics: checkout completion time, search result relevance latency, time to first byte for critical pages.

9. **Correlate client metrics with server monitoring.** Response time alone does not identify bottlenecks. Combine k6 results with Grafana dashboards showing CPU, memory, database connections, and cache hit rates.

10. **Version and review test scripts like production code.** Performance test scripts are code. They should be version-controlled, code-reviewed, and maintained as the application evolves.

11. **Run soak tests regularly.** Memory leaks and connection pool exhaustion only manifest under sustained load. Run 4-8 hour soak tests at least weekly in addition to shorter load tests.

12. **Automate performance testing in CI/CD.** Run a reduced-scale load test on every PR merge to catch performance regressions early, with full-scale tests on a scheduled basis.

## Anti-Patterns to Avoid

1. **Testing without think times.** A test with 100 VUs and no think times generates traffic equivalent to thousands of real users. This produces artificially high load and misleading failure thresholds.

2. **Using a single endpoint for load testing.** Hitting one endpoint repeatedly tests that endpoint's cache and connection pool, not the system. Always mix multiple endpoints reflecting real usage patterns.

3. **Ignoring ramp-up data in results.** Including the ramp-up phase in percentile calculations skews results. Either exclude ramp-up data or use k6 scenarios with separate measurement windows.

4. **Hardcoding authentication tokens.** Tokens expire, sessions time out, and rate limiters track per-user. Use the correlation pattern to authenticate dynamically and distribute load across user accounts.

5. **Running performance tests on shared CI runners.** Shared infrastructure introduces variability. Performance test clients need dedicated, consistent compute resources to produce reliable, comparable results.

6. **Setting thresholds after seeing results.** Define acceptance criteria before running tests, based on business requirements and SLAs. Setting thresholds retroactively to match observed performance defeats the purpose.

7. **Testing only the happy path.** Real traffic includes 404s, validation errors, and retries. Include error scenarios in the mix to test error handling performance and verify error responses are not slower than success responses.

## Debugging Tips

1. **Start with a single VU to verify the script works.** Run `k6 run --vus 1 --iterations 1` to catch script errors, authentication issues, and URL problems before scaling up.

2. **Use the k6 HTTP debug flag.** Set `--http-debug="full"` to see complete request and response bodies during development. Remove this flag for actual test runs.

3. **Check for correlation failures.** If requests fail with 403 or 422 errors mid-test, a dynamic value (CSRF token, session ID) is likely not being correlated. Add logging to extraction functions.

4. **Monitor virtual user count vs actual requests.** If the VU count is high but request rate is low, think times may be too long, or requests are timing out and blocking VUs.

5. **Examine response bodies for error messages.** A 200 status does not always mean success. Some applications return 200 with error messages in the body. Add content-based checks to detect soft failures.

6. **Profile the test client machine.** If the client running k6 is CPU-saturated, it cannot generate enough load and response time measurements become unreliable. Monitor client CPU during tests.

7. **Compare results across multiple runs.** A single test run is not statistically significant. Run the same test 3-5 times and compare results to identify natural variance versus actual performance differences.

8. **Isolate slow transactions.** Use k6 groups and custom metrics to identify which specific step within a multi-step scenario is causing elevated response times, rather than only looking at aggregate metrics.
