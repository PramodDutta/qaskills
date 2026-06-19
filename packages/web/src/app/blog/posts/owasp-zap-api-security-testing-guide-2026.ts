import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "OWASP ZAP API Security Testing in CI: 2026 Guide",
  description: "Automate DAST with OWASP ZAP in 2026: run baseline and full scans, test APIs from an OpenAPI spec, fail CI on findings, and triage alerts as a QA engineer.",
  date: "2026-06-15",
  category: "Security",
  content: `# OWASP ZAP API Security Testing in CI: 2026 Guide

OWASP ZAP (Zed Attack Proxy) is a free, open-source DAST (dynamic application security testing) tool that finds vulnerabilities in a *running* web app or API by actively probing it — like an automated penetration tester. For QA and automation teams, the high-value pattern is the **baseline scan** (fast, passive, safe to run on every pull request) and the **API scan** (imports your OpenAPI/Swagger spec, exercises every endpoint, and reports issues like missing security headers, injection, and misconfigurations). You run ZAP as a Docker container in CI, point it at a deployed environment, and fail the build when it reports alerts above a severity threshold.

This guide covers ZAP's scan types, running it in Docker, scanning an API from an OpenAPI spec, authentication, wiring it into GitHub Actions and GitLab CI, tuning the alert threshold, suppressing false positives, and triaging results. ZAP's packaged scripts and options evolve, so confirm exact flags against the current ZAP documentation before pinning a pipeline.

## ZAP scan types and which to use

ZAP ships three "packaged scan" scripts, each a different trade-off between speed and depth:

| Scan | What it does | Speed | Where to run |
|---|---|---|---|
| **Baseline** | Spiders the target, runs only *passive* checks (headers, cookies, info leaks). Does not attack. | Fast (minutes) | Every PR / commit |
| **Full** | Spiders, then runs the *active* scanner (injects payloads: SQLi, XSS, etc.). Intrusive. | Slow (can be hours) | Nightly / staging only |
| **API** | Imports an OpenAPI, SOAP, or GraphQL definition, then actively scans each endpoint. | Medium | Per-PR for APIs (against a test env) |

The decision rule for QA teams: run the **baseline scan on every PR** because it's fast and never modifies data, run the **API scan** against APIs you own (it's far more thorough than spidering for non-HTML services), and reserve the **full active scan** for a scheduled nightly job against a disposable staging environment — never against production, since active scanning sends real attack payloads. For how DAST fits alongside SAST and SCA, see our [security testing decision guide](/blog).

## Running ZAP in Docker

The simplest and most reproducible way to run ZAP in CI is the official Docker image. The baseline scan against a running app:

\`\`\`bash
docker run --rm -v "$(pwd)":/zap/wrk/:rw \\
  ghcr.io/zaproxy/zaproxy:stable \\
  zap-baseline.py \\
  -t https://test.example.com \\
  -r zap-baseline-report.html \\
  -J zap-baseline-report.json
\`\`\`

- \`-t\` is the target URL.
- \`-r\` writes an HTML report; \`-J\` writes machine-readable JSON for CI parsing.
- The volume mount (\`/zap/wrk/\`) is where ZAP writes reports and reads config files.

By default, \`zap-baseline.py\` exits with a non-zero code when it finds WARN- or FAIL-level alerts, which is exactly what you want for a CI gate. Control the behavior with \`-I\` (do not fail on warnings) and the threshold flags below.

## Scanning an API from an OpenAPI spec

For APIs, the API scan is the right tool — it reads your contract and exercises every documented endpoint instead of trying to crawl a UI that doesn't exist. Point it at a spec URL or a local file:

\`\`\`bash
# From a spec served by the app
docker run --rm -v "$(pwd)":/zap/wrk/:rw \\
  ghcr.io/zaproxy/zaproxy:stable \\
  zap-api-scan.py \\
  -t https://test.example.com/openapi.json \\
  -f openapi \\
  -r zap-api-report.html \\
  -J zap-api-report.json
\`\`\`

- \`-f openapi\` tells ZAP the format (also supports \`soap\` and \`graphql\`).
- \`-t\` is the spec location — a URL or a path under the mounted \`/zap/wrk/\` directory for a local file.

The API scan imports every path, parameter, and method from the spec, generates requests, and runs active checks against them. This catches issues a UI spider never would: an undocumented-but-reachable verb, a parameter that reflects input unsanitized, missing authentication on an endpoint. Keep your OpenAPI spec accurate and complete — the scan is only as good as the contract you feed it. For a primer on spec-driven API testing generally, browse our [API testing skills](/skills).

## Handling authentication

Most real APIs require auth, and an unauthenticated scan only tests the login wall. The pragmatic approach for CI is to pass a token via a header. ZAP reads replacer rules and environment-driven config; the common pattern is a header injection through the ZAP automation config or the \`-z\` passthrough:

\`\`\`bash
docker run --rm -v "$(pwd)":/zap/wrk/:rw \\
  -e ZAP_AUTH_TOKEN="$API_TOKEN" \\
  ghcr.io/zaproxy/zaproxy:stable \\
  zap-api-scan.py \\
  -t https://test.example.com/openapi.json -f openapi \\
  -z "replacer.full_list(0).description=auth \\
      replacer.full_list(0).enabled=true \\
      replacer.full_list(0).matchtype=REQ_HEADER \\
      replacer.full_list(0).matchstr=Authorization \\
      replacer.full_list(0).replacement=Bearer \${ZAP_AUTH_TOKEN}" \\
  -J zap-api-report.json
\`\`\`

This adds an \`Authorization: Bearer <token>\` header to every request ZAP sends. For more complex flows (session cookies, OAuth refresh, CSRF tokens) use ZAP's **Automation Framework** — a YAML file describing context, authentication, and the scan jobs — which is the maintainable way to express auth and is the recommended approach for anything beyond a static token. Store the token as a CI secret; never commit it.

## ZAP in GitHub Actions

The cleanest integration uses the maintained ZAP GitHub Actions, which run the scan and can open issues automatically. A baseline scan on pull requests:

\`\`\`yaml
# .github/workflows/zap-baseline.yml
name: zap-baseline
on:
  pull_request:
    branches: [main]
jobs:
  zap_scan:
    runs-on: ubuntu-latest
    permissions:
      issues: write       # lets the action file findings as issues
    steps:
      - uses: actions/checkout@v4
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: "https://test.example.com"
          # rules file lets you downgrade/ignore specific alert IDs
          rules_file_name: ".zap/rules.tsv"
          # -I = report warnings but don't fail; remove to make warnings fail the build
          cmd_options: "-a"
\`\`\`

For APIs, use \`zaproxy/action-api-scan\` and pass the spec:

\`\`\`yaml
      - name: ZAP API Scan
        uses: zaproxy/action-api-scan@v0.9.0
        with:
          target: "https://test.example.com/openapi.json"
          format: openapi
          cmd_options: "-a"
          rules_file_name: ".zap/rules.tsv"
\`\`\`

The action publishes the report as a workflow artifact and (with \`issues: write\`) can create a GitHub issue summarizing alerts. Pin the action to a specific version tag for reproducibility.

## ZAP in GitLab CI

The same Docker image runs cleanly in GitLab:

\`\`\`yaml
# .gitlab-ci.yml
zap_api_scan:
  stage: security
  image:
    name: ghcr.io/zaproxy/zaproxy:stable
    entrypoint: [""]
  variables:
    TARGET: "https://test.example.com/openapi.json"
  script:
    - mkdir -p /zap/wrk
    - zap-api-scan.py -t "$TARGET" -f openapi -J zap-report.json -r zap-report.html || true
    - cp /zap/wrk/zap-report.* .
  artifacts:
    when: always
    paths: [zap-report.html, zap-report.json]
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
\`\`\`

Note the \`|| true\` plus a separate parsing step is one strategy: capture the report unconditionally, then decide pass/fail by parsing the JSON, which gives you finer control than the script's own exit code.

## Tuning the alert threshold and gating CI

ZAP assigns each alert a **risk** (High, Medium, Low, Informational) and a **confidence**. Two levers control how strictly the scan gates your build:

- **Fail level.** By default the packaged scripts treat WARN/FAIL alerts as build failures. Use \`-I\` to *not* fail on warnings (useful while you triage), or keep the default so any new warning blocks the merge.
- **Rules file (\`.zap/rules.tsv\`).** A tab-separated file mapping each alert plugin ID to an action: \`IGNORE\`, \`WARN\`, or \`FAIL\`. This is how you tune per-rule severity without disabling the whole scan.

\`\`\`tsv
# .zap/rules.tsv  — columns: pluginId  TAB  action  TAB  optional-url-regex
10096	IGNORE	(timestamp disclosure — noisy, low value here)
40012	FAIL	(reflected XSS — always block)
10038	WARN	(CSP header — warn while we roll out the header)
\`\`\`

A sensible policy for a QA team adopting ZAP: start with everything as WARN so the scan never blocks merges, triage for a sprint, promote genuinely important rules to FAIL, and IGNORE confirmed false positives by plugin ID. This avoids the classic failure where a too-strict gate gets switched off entirely. Compare this gating philosophy with other security tools in our [tool comparison hub](/compare).

## Triaging and suppressing findings

Open the HTML report (or parse the JSON) and triage each alert by risk and confidence:

\`\`\`python
# parse_zap.py — fail CI only on High-risk alerts
import json, sys

with open("zap-api-report.json") as f:
    report = json.load(f)

high = []
for site in report.get("site", []):
    for alert in site.get("alerts", []):
        if alert.get("riskcode") == "3":     # 3 = High
            high.append(f'{alert["alert"]} ({len(alert.get("instances", []))} instances)')

if high:
    print("HIGH-RISK ZAP ALERTS:\\n  " + "\\n  ".join(high))
    sys.exit(1)
print("No high-risk alerts.")
\`\`\`

Triage guidance:

- **High risk, high confidence** — treat as real; fix or get a security sign-off before merging.
- **Low confidence** — verify manually; these are where false positives cluster.
- **Informational** — usually housekeeping (timestamps, version banners); IGNORE in the rules file unless relevant to your threat model.
- **Recurring false positives** — add the plugin ID to \`rules.tsv\` as IGNORE with a comment explaining why, so the next engineer understands the suppression.

Treat the rules file as code: review changes to it the way you'd review a test being skipped, so suppressions stay accountable.

## Common errors and how to fix them

- **Scan finds nothing because it couldn't reach the target.** In CI the app may be on a private network. Deploy to a reachable test environment first, or run the app and ZAP on the same Docker network and target the service name.
- **API scan reports almost no endpoints.** The OpenAPI spec is incomplete or the URL is wrong. Verify the spec loads in a browser and lists all paths; the scan only tests what the contract declares.
- **Every endpoint returns 401, so nothing is tested.** Authentication isn't configured — add the \`Authorization\` header via the replacer or use the Automation Framework with a real auth flow.
- **Full active scan times out or modifies data.** Active scanning is intrusive and slow; never point it at production or shared data. Run it nightly against a disposable environment and raise the timeout.
- **Build fails on noise after enabling the scan.** Start with warnings non-blocking (\`-I\`), triage with a rules file, and promote rules to FAIL gradually instead of disabling the scan.

## Frequently Asked Questions

### What is OWASP ZAP used for?

OWASP ZAP is a free, open-source dynamic application security testing (DAST) tool that finds vulnerabilities in a running web application or API by actively probing it, much like an automated penetration tester. QA and automation teams use it to scan apps and APIs in CI for issues like missing security headers, injection flaws, and misconfigurations, gating the build when serious findings appear.

### What is the difference between a ZAP baseline scan and a full scan?

A baseline scan spiders the target and runs only passive checks — it never attacks, so it's fast and safe to run on every pull request. A full scan adds the active scanner, which injects real attack payloads (SQL injection, XSS, and more), making it intrusive and slow. Run baseline per-PR and reserve full active scans for scheduled jobs against a disposable staging environment, never production.

### How do I scan an API with OWASP ZAP?

Use the API scan script (zap-api-scan.py) and point it at your OpenAPI, SOAP, or GraphQL definition with the format flag, for example \`-t https://app/openapi.json -f openapi\`. ZAP imports every documented path, parameter, and method, generates requests, and runs active checks against them, which is far more thorough for a non-HTML API than trying to spider a UI.

### How do I run OWASP ZAP in a CI pipeline?

Run the official ZAP Docker image as a step in your pipeline, point it at a deployed test environment, write a JSON report, and fail the build based on the exit code or by parsing the report. On GitHub Actions the maintained zaproxy/action-baseline and action-api-scan actions wrap this and can publish artifacts and open issues; on GitLab the Docker image runs directly with the report saved as an artifact.

### How do I stop ZAP from failing the build on false positives?

Use a rules file (a tab-separated .zap/rules.tsv mapping each alert plugin ID to IGNORE, WARN, or FAIL) to suppress confirmed false positives by ID and to tune per-rule severity without disabling the whole scan. A good adoption path is to start with all rules as WARN so nothing blocks merges, triage for a sprint, then promote important rules to FAIL and IGNORE the noise.

### Can I run OWASP ZAP active scans against production?

No. Active scanning sends real attack payloads and can modify or corrupt data, trigger alerts, and degrade performance, so it must never run against production or shared environments. Run active and full scans against a disposable staging environment that mirrors production, and limit production-adjacent checks to the passive baseline scan, which does not attack the target.
`,
};
