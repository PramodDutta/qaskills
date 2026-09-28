import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 and Python: How Python Teams Run k6 Load Tests',
  description: 'A practical k6 Python guide for QA teams: write k6 in TypeScript, drive runs from Python, parse thresholds, or choose Locust when it fits best.',
  date: '2026-09-28',
  category: 'Performance',
  content: `
# k6 and Python: How Python Teams Run k6 Load Tests

The short answer for \`k6 python\` is this: ordinary k6 tests are written in JavaScript or TypeScript, not Python. Python teams still use k6 successfully, but they usually do it by keeping the load script in k6 JavaScript or TypeScript, then using Python for orchestration, data setup, result parsing, report generation, and CI policy. That gives QA engineers k6's fast execution model and thresholds without pretending that k6 is a Python framework.

The current Grafana k6 documentation says k6 tests are written using JavaScript or TypeScript, and the compatibility documentation says k6 transpiles \`.ts\` files with esbuild. It also says TypeScript support is partial because type information is stripped and k6 does not provide type checking. I also verified the \`grafana/xk6-python\` repository: it exists, but the README describes it as not an official k6 extension, a proof of concept for Python language support, and compatible with k6 v0.52.0. That matters because the latest k6 releases shown by the official GitHub releases page are well beyond that compatibility note.

So the practical decision is not "How do I write all k6 tests in Python?" It is "Where should Python sit around k6?" This guide covers four working patterns: write k6 scripts in TypeScript, launch k6 from Python and treat thresholds as the pass or fail contract, generate small k6 scripts from Python-owned fixtures, or choose Locust when the test behavior truly belongs inside Python. For a broader k6 baseline, read [k6 Load Testing Guide 2026](/blog/k6-load-testing-guide-2026). For the tool choice question, pair this with [k6 vs Locust 2026](/blog/k6-vs-locust-2026).

## Current State Of k6 Python Support

k6 is active and maintained by Grafana Labs. I verified the official Grafana documentation, the \`grafana/k6\` GitHub releases page, the install docs, the options reference, the results output docs, and the cloud command docs. The latest release page I checked lists current k6 releases in the v2 series, including v2.3.0 as the latest shown by GitHub. The exact installed version in your environment still matters because k6 has changed substantially since older v0.x articles and examples.

Python support needs a more careful sentence. There is no official Python scripting mode in the mainstream k6 documentation. The community and Grafana Hackathon project \`xk6-python\` is real, but its own README labels it as a proof of concept, says it is not an official k6 extension, and states that it is compatible with k6 v0.52.0. That makes it interesting for experimentation, but not the default recommendation for a QA organization that wants stable CI gates.

| Question | Confirmed answer | Decision for QA teams |
| --- | --- | --- |
| Are k6 scripts Python files by default? | No. Official k6 examples use JavaScript or TypeScript. | Keep production k6 scripts in JS or TS. |
| Does k6 run \`.ts\` files? | Yes. The docs say k6 uses esbuild to transpile TypeScript files. | Use TypeScript for editor help and safer scenario config. |
| Does k6 type-check TypeScript? | No. The docs say TypeScript support strips type information. | Run \`tsc --noEmit\` separately if you need type safety. |
| Is \`xk6-python\` official? | Its README says it is not official and is proof of concept. | Avoid it for required pipelines unless you explicitly accept the risk. |
| Is Locust Python-native? | Yes. Locust docs and examples are Python-based. | Choose Locust when user behavior needs Python libraries at runtime. |

What people get wrong is assuming that Python ownership of a service requires Python ownership of the load runner script. In most teams, the load script is a small executable specification of traffic, while Python owns the application, seed data, contracts, and release automation. k6 fits that split well. The runtime script can stay lean, deterministic, and portable, while Python wraps the workflow around it.

## Option One: Write k6 In TypeScript

For most Python teams, the best k6 path is to accept k6's native script model and write the test in TypeScript. You do not need to become a frontend engineer to do this. A useful k6 script is often simpler than a pytest suite because it has one job: generate traffic, attach tags, validate responses with checks, and fail the run with thresholds.

This script is intentionally small but production-shaped. It names the scenario, uses thresholds for the CI contract, discards response bodies to reduce memory pressure, and checks a concrete side effect in the response instead of only checking that the status was 200.

\`\`\`ts
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    steady_api_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      gracefulStop: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<450', 'p(99)<900'],
    checks: ['rate>0.99'],
  },
  discardResponseBodies: false,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const res = http.get('https://quickpizza.grafana.com/api/json?name=pizza', {
    tags: { endpoint: 'echo_json' },
  });

  check(res, {
    'response is successful': (r) => r.status === 200,
    'echo returns the requested name': (r) => r.json('name') === 'pizza',
  });

  sleep(1);
}
\`\`\`

Run it directly with k6:

\`\`\`bash
k6 run smoke-load.ts
\`\`\`

If your team has a Python repository, put load scripts under a clear directory such as \`tests/load/k6\`. Do not bury them in application unit tests. They have different dependencies, execution time, network assumptions, and failure semantics. A structure like this keeps ownership visible:

\`\`\`text
repo/
  pyproject.toml
  src/
  tests/
    unit/
    integration/
    load/
      k6/
        smoke-load.ts
        checkout-load.ts
      python/
        run_k6.py
        parse_summary.py
\`\`\`

The TypeScript route also helps AI coding agents. Claude Code, Cursor, and Copilot are generally good at editing explicit \`options\`, thresholds, and request groups when the script is small and named around user journeys. They are less reliable when a team asks them to invent a Python binding layer that the official k6 docs do not describe as the standard path. Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI, but the important bit is still the same: keep the tool boundary obvious.

## Option Two: Drive k6 From Python

Python is excellent as the controller. It can create test data, choose a script, pass environment variables, run \`k6\` as a subprocess, collect summary files, publish artifacts, and fail the build when the subprocess exits non-zero. This is the cleanest \`k6 python\` workflow because it uses each runtime where it is strongest.

k6 thresholds already determine the process exit status. If a threshold fails, the k6 run fails. Python should not duplicate all threshold math unless you have an additional governance rule, such as "block releases when p99 is 20 percent worse than the saved baseline." The wrapper below treats k6 as the source of truth and adds a JSON summary file for follow-up reporting.

\`\`\`ts
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    search: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 80,
      stages: [
        { target: 20, duration: '1m' },
        { target: 20, duration: '2m' },
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    'http_req_duration{endpoint:search}': ['p(95)<500'],
    'http_req_failed{endpoint:search}': ['rate<0.02'],
    checks: ['rate>0.98'],
  },
};

export default function () {
  const query = encodeURIComponent(__ENV.SEARCH_TERM || 'testing');
  const res = http.get(\`https://quickpizza.grafana.com/api/search?q=\${query}\`, {
    tags: { endpoint: 'search' },
  });

  check(res, {
    'search returned json': (r) => r.status === 200 && String(r.headers['Content-Type']).includes('application/json'),
    'search body is not empty': (r) => typeof r.body === 'string' && r.body.length > 2,
  });
}

export function handleSummary(data) {
  return {
    'artifacts/k6-summary.json': JSON.stringify(data, null, 2),
  };
}
\`\`\`

The Python wrapper:

\`\`\`python
from __future__ import annotations

import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "tests" / "load" / "k6" / "search-load.ts"
ARTIFACTS = ROOT / "artifacts"


def run_k6(search_term: str) -> None:
    ARTIFACTS.mkdir(exist_ok=True)
    env = os.environ.copy()
    env["SEARCH_TERM"] = search_term

    command = [
        "k6",
        "run",
        "--summary-mode=compact",
        "--summary-trend-stats=avg,min,med,p(90),p(95),p(99),max",
        str(SCRIPT),
    ]

    completed = subprocess.run(command, cwd=ROOT, env=env, text=True)
    if completed.returncode != 0:
        raise SystemExit(completed.returncode)


if __name__ == "__main__":
    run_k6(search_term="gluten free")
\`\`\`

Notice what the wrapper does not do. It does not scrape the human console table. It does not decide success by looking for a phrase in stdout. It does not swallow the exit code. Those are common sources of false green builds. Let thresholds fail the process, and use files for structured reporting.

| Wrapper responsibility | Good Python use | Risky Python use |
| --- | --- | --- |
| Launching the run | \`subprocess.run([...])\` with a list of args | Building one shell string with quoting bugs |
| Data setup | Create accounts, tokens, fixtures before k6 starts | Mutating shared staging data during the run |
| Pass or fail | Preserve k6's exit code | Parsing console art as the only signal |
| Reporting | Read \`handleSummary()\` JSON | Scrape terminal output that changes with modes |
| Secrets | Pass short-lived values through environment variables | Printing bearer tokens in command logs |

## Option Three: Parse k6 Results In Python

k6 gives you two different result shapes. The \`--out json=results.json\` output is newline-delimited time-series data. It is useful when you need individual metric points, timestamps, tags, and trend analysis. The \`handleSummary()\` object is an end-of-test aggregate. It is useful when you want one stable CI artifact.

Do not mix them up. A team often reaches for \`--out json\`, then gets surprised that the file is not one big JSON object. The official JSON output docs show filtering point records for metrics such as \`http_req_duration\`. For a CI gate, prefer \`handleSummary()\` first because it already contains threshold outcomes and aggregate metric values. Reach for \`--out json\` when you need custom time-series analysis.

\`\`\`python
from __future__ import annotations

import json
from pathlib import Path


SUMMARY = Path("artifacts/k6-summary.json")


def metric_percentile(summary: dict, metric_name: str, percentile: str) -> float:
    metric = summary["metrics"].get(metric_name)
    if metric is None:
        raise KeyError(f"Missing metric: {metric_name}")

    values = metric.get("values")
    if not isinstance(values, dict):
        raise ValueError(f"Metric has no values object: {metric_name}")

    value = values.get(percentile)
    if not isinstance(value, (int, float)):
        raise ValueError(f"Metric {metric_name} has no percentile {percentile}")

    return float(value)


def main() -> None:
    summary = json.loads(SUMMARY.read_text(encoding="utf-8"))
    p95 = metric_percentile(summary, "http_req_duration", "p(95)")
    if p95 >= 450:
        raise SystemExit(f"p95 was {p95:.1f} ms, expected below 450 ms")

    print(f"k6 p95 passed: {p95:.1f} ms")


if __name__ == "__main__":
    main()
\`\`\`

This parser has a boring but important quality: it checks that fields exist before comparing values. That is better than a one-line dictionary access that fails with an unhelpful \`KeyError\` when a script name changes, an artifact is missing, or a metric did not emit. Load-test failures are already noisy. Your parser should make diagnosis easier, not harder.

For time-series JSON, parse line by line:

\`\`\`python
from __future__ import annotations

import json
from pathlib import Path


def duration_points(path: Path, endpoint: str) -> list[float]:
    values: list[float] = []
    with path.open(encoding="utf-8") as file:
        for line in file:
            event = json.loads(line)
            if event.get("type") != "Point":
                continue
            if event.get("metric") != "http_req_duration":
                continue
            data = event.get("data", {})
            tags = data.get("tags", {})
            if tags.get("endpoint") == endpoint:
                values.append(float(data["value"]))
    return values


points = duration_points(Path("artifacts/k6-points.json"), endpoint="search")
if not points:
    raise SystemExit("No http_req_duration points found for endpoint=search")

print(f"Collected {len(points)} search duration points")
\`\`\`

This is where Python becomes valuable. You can compare the current run to a checked-in baseline, annotate a pull request, push metrics to a data warehouse, or enrich the report with deployment metadata. Just keep threshold enforcement close to k6 unless you have a specific reason to move it.

## Option Four: Generate k6 Scripts From Python

Some Python teams own large OpenAPI catalogs, tenant fixtures, or product matrices. In those cases, generating a k6 script can be reasonable. The trap is generating an unreadable mega-script that nobody can debug. Generate small, reviewable files, include a header that says they are generated, and commit either the generator or the generated script depending on your release process.

The safe pattern is data in Python, behavior in a k6 template. This example writes a tiny test from a list of endpoints. It uses JSON to pass data into the script without hand-building JavaScript arrays.

\`\`\`python
from __future__ import annotations

import json
from pathlib import Path


ENDPOINTS = [
    {"name": "menu", "path": "/api/json"},
    {"name": "search", "path": "/api/search?q=testing"},
]

template = """import http from 'k6/http';
import { check } from 'k6';

const endpoints = ENDPOINTS_PLACEHOLDER;

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  for (const endpoint of endpoints) {
    const res = http.get(\`https://quickpizza.grafana.com\${endpoint.path}\`, {
      tags: { endpoint: endpoint.name },
    });
    check(res, {
      'status is 200': (r) => r.status === 200,
      'body exists': (r) => typeof r.body === 'string' && r.body.length > 0,
    });
  }
}
"""


def main() -> None:
    rendered = template.replace("ENDPOINTS_PLACEHOLDER", json.dumps(ENDPOINTS, indent=2))
    output = Path("tests/load/k6/generated-catalog.ts")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered, encoding="utf-8")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
\`\`\`

Generated tests should still be testable as source. Run \`k6 run tests/load/k6/generated-catalog.ts\` locally. Review the generated diff. Keep the generator deterministic so AI coding agents and human reviewers do not chase meaningless line churn.

| Generation input | Good generated output | Bad generated output |
| --- | --- | --- |
| OpenAPI paths | Endpoint smoke tests with tags per operation | One giant scenario with no readable names |
| Tenant fixture list | Tenant-specific setup data passed as JSON | Secrets committed into the generated file |
| Critical user journeys | One script per journey | One script that tries to model the whole product |
| Release metadata | Tags such as service, version, and region | Tags with high-cardinality random values |

## CI Integration For Python Repositories

CI should answer three questions: did k6 run, did thresholds pass, and did we keep the artifacts needed to debug a failure? You do not need a special GitHub Action to start. Installing k6 in a runner or using the official Docker image is enough. The workflow below uses current GitHub Actions majors and keeps the Python wrapper in charge of repository-specific setup.

\`\`\`yaml
name: load-smoke

on:
  pull_request:
  workflow_dispatch:

jobs:
  k6-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-python@v7
        with:
          python-version: '3.13'

      - name: Install k6
        run: |
          curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install -y k6

      - name: Run load smoke
        env:
          SEARCH_TERM: testing
        run: python tests/load/python/run_k6.py

      - name: Upload k6 artifacts
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: k6-artifacts-\${{ github.run_id }}
          path: artifacts/
\`\`\`

If your organization forbids package installation from public repositories during CI, build a pinned image that contains Python, k6, and your trusted certificates. That is often better for enterprise QA anyway because load tests are sensitive to runner differences. CPU throttling, network egress, DNS, and shared runners can all change results.

A Docker-first command keeps the runner cleaner:

\`\`\`bash
docker run --rm -i -v "\${PWD}:/work" -w /work grafana/k6 run tests/load/k6/smoke-load.ts
\`\`\`

When you need Grafana Cloud k6, the current docs describe \`k6 cloud login\`, \`k6 cloud run\`, \`k6 cloud upload\`, and \`k6 cloud run --local-execution\`. The distinction matters: \`k6 cloud run script.js\` uploads the archive and runs on cloud infrastructure, while \`k6 cloud run --local-execution script.js\` runs locally and streams results to Grafana Cloud k6. Do not use local execution expecting cloud generators to carry the traffic.

## Diagnosing A Real Failure Mode

Here is a realistic failure: the Python wrapper reports success, the k6 console shows several failed checks, and the pull request still goes green. The root cause is usually that the k6 script used \`check()\` but did not define a threshold on \`checks\`, or the wrapper ignored the non-zero exit code from a threshold failure.

k6 checks are not traditional assertions. The docs say failed checks do not abort or finish the test with a failed status by themselves. To make checks fail the run, combine them with a threshold. That is why the earlier examples include \`checks: ['rate>0.99']\`.

Diagnosis steps:

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Console shows failed checks but CI is green | No \`checks\` threshold | Add a threshold such as \`checks: ['rate>0.99']\`. |
| Threshold failed but Python job is green | Wrapper did not preserve exit code | Raise \`SystemExit(completed.returncode)\` when non-zero. |
| JSON parser says metric missing | Tags or metric names changed | Print available metric keys and tag names from the summary. |
| p95 changed wildly across reruns | Test is too short or runner is noisy | Increase duration, pin runner shape, and compare only stable scenarios. |
| Results look better under overload | Open-loop arrival rate is missing latency correction | Use the right executor and inspect whether queues are hidden. |

Another common failure is using \`--out json\` and then loading the whole file with \`json.load()\`. That file is a stream of JSON events, not one JSON array. The fix is line-by-line parsing or using \`handleSummary()\` for aggregate artifacts. This single mismatch has wasted many CI debugging sessions because the test was fine, but the reporting step was not.

## When Locust Is The Better Python Answer

Choose Locust when the runtime behavior really needs Python. If your users call Python client libraries, maintain complex authenticated state in Python objects, reuse pytest-style fixtures, or need custom event hooks in Python during the load run, Locust is a better fit. The current Locust docs show Python user classes, headless mode with \`--headless\`, \`-u\` or \`--users\`, \`-r\` or \`--spawn-rate\`, \`-t\` or \`--run-time\`, and CSV output with \`--csv\`. The Locust GitHub release page shows it is actively maintained, with recent 2.46.x releases in 2026.

Choose k6 when you want a compact traffic spec, strong threshold ergonomics, fast local execution, cloud or Kubernetes execution paths, and a script that can be understood without the rest of the Python application. This is especially attractive for API performance gates, release smoke load, and SLO checks that should survive framework churn inside the app.

| Requirement | Lean toward k6 | Lean toward Locust |
| --- | --- | --- |
| Team wants official Python test scripts | No | Yes |
| CI needs simple pass or fail thresholds | Yes | Possible, but more custom |
| Runtime uses Python SDKs heavily | Usually no | Yes |
| Test should run as a portable binary tool | Yes | Usually no |
| Load model needs browser-level behavior | Consider k6 browser separately | Use other browser tooling |
| QA agents need small editable scripts | Yes | Yes, if the agent knows Locust |

The wrong move is forcing k6 to be Python-native just to keep one language everywhere. Language uniformity feels tidy, but load testing is operational work. Runtime behavior, reporting, and failure clarity matter more than using Python for every file.

## A Decision Path For QA Leads

Start with the result you need. If you need a release gate that says "the search API keeps p95 below 500 ms at expected traffic," write a TypeScript k6 script, put thresholds in \`options\`, and wrap it with Python only for setup and artifacts. If you need a Python client to negotiate a proprietary protocol during the test, use Locust. If you need a generated catalog of endpoint smoke checks, let Python generate k6 files but keep each generated file readable.

For agent-assisted teams, put guardrails in the repository. Add a README beside the load tests that states which options are allowed in CI, where artifacts go, and what the thresholds mean. Tell the agent whether it may change load shape, thresholds, target URLs, or only request checks. Performance test changes can silently weaken release protection, so threshold edits deserve the same review attention as production code.

A healthy Python plus k6 setup usually has these files:

\`\`\`text
tests/load/
  README.md
  k6/
    smoke-load.ts
    search-load.ts
    checkout-load.ts
  python/
    run_k6.py
    parse_summary.py
artifacts/
  .gitkeep
\`\`\`

Keep one rule simple: k6 owns traffic and thresholds, Python owns orchestration and analysis. That boundary gives Python teams a maintainable performance workflow without depending on unofficial language support. It also makes failures easier to explain during release pressure, which is when load testing earns its keep.

## Frequently Asked Questions

### Can I write k6 tests directly in Python?

Not in the standard, officially documented k6 workflow. Grafana k6 documents JavaScript and TypeScript scripting. The \`grafana/xk6-python\` project exists, but its README calls it a proof of concept and says it is not an official k6 extension. For production CI, the safer pattern is to write k6 scripts in TypeScript and use Python to prepare data, run the k6 command, parse summaries, and publish reports.

### Should a Python team choose k6 or Locust?

Use k6 when the test can be expressed as HTTP traffic, checks, tags, and thresholds in a compact script. Use Locust when the load behavior must execute Python code at runtime, such as Python SDK calls, complex user state, or reuse of Python domain helpers. The decision is not about team identity. It is about where the important test logic lives and which tool produces the clearest failure.

### How should Python parse k6 output?

For CI summaries, prefer a \`handleSummary()\` JSON artifact because it is one aggregate object with metrics and thresholds. For time-series analysis, use \`k6 run --out json=...\` and parse the file line by line because it contains JSON events, not a single JSON array. In both cases, check that metrics exist before comparing values so missing data produces a useful diagnostic.

### Do k6 checks fail the CI job automatically?

Failed checks alone do not necessarily fail a k6 run. k6 records check success and failure rates while the test continues. To make check failures affect CI, add a threshold such as \`checks: ['rate>0.99']\` in the script's \`options\`. Then make sure your Python wrapper preserves the k6 process exit code instead of swallowing it or replacing it with a generic success.
`,
};
