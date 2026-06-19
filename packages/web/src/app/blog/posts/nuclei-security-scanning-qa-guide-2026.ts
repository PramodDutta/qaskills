import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Nuclei Security Scanning for QA Engineers (2026)",
  description: "Run Nuclei template-based security scanning in CI for 2026: install, write YAML templates, scan APIs and URLs, gate on severity, and integrate with GitHub Actions.",
  date: "2026-06-15",
  category: "Security",
  content: `# Nuclei Security Scanning for QA Engineers (2026)

Nuclei is a fast, open-source security scanner from ProjectDiscovery that finds vulnerabilities and misconfigurations by matching **YAML templates** against a target's responses. Instead of a generic crawl-and-attack model, each template encodes one specific check — a known CVE, an exposed \`.env\` file, a missing security header, a default credential — as a request plus a matcher, and Nuclei runs thousands of them in parallel. For QA engineers it's the ideal "shift-left" security gate: you point it at a deployed URL or API in CI, run the community template library (regularly updated with new CVEs), and fail the build when it reports findings above a severity threshold. It's lightweight, scriptable, and template-driven, so the checks are reviewable code you commit to your repo.

This guide covers installation, the template model, running scans, writing a custom template, targeting APIs, severity gating, GitHub Actions integration, and troubleshooting. Nuclei and its flags evolve quickly, so confirm exact options against the current ProjectDiscovery documentation before pinning a pipeline.

## How Nuclei works: templates and matchers

Nuclei's whole model is **template-based detection**. A template is a YAML file describing:

1. **What request to send** (HTTP method, path, headers, body — or a DNS/TCP/SSL probe).
2. **What to look for in the response** (a matcher: a status code, a string in the body, a header, a regex, a binary signature).
3. **Metadata** (an ID, a severity, a description, references).

When a matcher fires, that's a finding. Because each check is one self-contained file, the community maintains a large, continuously updated **public template library** covering thousands of known CVEs, exposures, misconfigurations, and default-credential checks. You can run that whole library, a tagged subset, or your own custom templates. This is what makes Nuclei both broad (thousands of known issues out of the box) and precise (each template is a targeted, low-false-positive check). For how this complements crawl-based DAST, see our [security testing decision guide](/blog).

## Installation

Nuclei is a single Go binary. Install it with the Go toolchain or download a release:

\`\`\`bash
# Via Go (Go 1.21+)
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Verify
nuclei -version
\`\`\`

On first run, update the community templates so you have the latest CVE checks:

\`\`\`bash
nuclei -update-templates
\`\`\`

This downloads/refreshes the public template collection into a local directory. In CI, run the update step before scanning so you're always testing against current templates. A Docker image is also published by ProjectDiscovery if you prefer not to install the binary on runners.

## Running your first scan

The simplest scan points Nuclei at a target and runs all applicable templates:

\`\`\`bash
# Scan a single target with the full community template set
nuclei -u https://test.example.com
\`\`\`

Useful flags for real use:

\`\`\`bash
nuclei -u https://test.example.com \\
  -severity critical,high,medium \\   # only run/report these severities
  -tags cve,exposure,misconfig \\     # restrict to relevant template categories
  -json-export results.json \\        # machine-readable output for CI parsing
  -stats                             # progress + summary
\`\`\`

- \`-u\` is a single URL; \`-l targets.txt\` scans a list of URLs (one per line).
- \`-severity\` filters by template severity — keep it tight in CI to avoid noise.
- \`-tags\` selects template categories (e.g. \`cve\`, \`exposure\`, \`default-login\`, \`misconfig\`).
- \`-json-export\` writes structured results your pipeline can parse to decide pass/fail.

Run it against a **deployed test environment**, not production for intrusive templates — many checks are safe detections, but treat any scan as potentially noisy to the target's logs and rate limits.

## Writing a custom Nuclei template

The real power for QA teams is encoding *your* checks — an internal misconfiguration, a header your security policy requires, an endpoint that must never be public. A template is plain YAML:

\`\`\`yaml
# templates/missing-hsts.yaml
id: missing-hsts-header

info:
  name: Missing Strict-Transport-Security Header
  author: qa-team
  severity: medium
  description: Flags responses that do not set the HSTS header on HTTPS.
  tags: misconfig,headers

http:
  - method: GET
    path:
      - "{{BaseURL}}/"

    matchers-condition: and
    matchers:
      - type: word
        part: header
        words:
          - "Strict-Transport-Security"
        negative: true        # finding fires when the header is ABSENT
      - type: status
        status:
          - 200
\`\`\`

Key pieces:

- \`{{BaseURL}}\` is the target you pass with \`-u\`/\`-l\`; Nuclei substitutes it per target.
- \`matchers-condition: and\` means all matchers must agree before reporting.
- \`negative: true\` inverts a matcher — here, "report when the header is *missing*".
- \`part: header\` scopes the match to response headers (vs \`body\`, \`all\`).

Run only your custom templates:

\`\`\`bash
nuclei -u https://test.example.com -t templates/ -json-export results.json
\`\`\`

Because templates are just files, they belong in version control and get code-reviewed like any test. Browse community security and QA skills in our [skills directory](/skills).

## Scanning APIs

Nuclei scans APIs well because templates are just HTTP requests with matchers — you don't need a UI to crawl. Two common approaches:

**1. Target specific endpoints with custom templates.** Encode each sensitive endpoint's expected secure behavior:

\`\`\`yaml
# templates/api-no-auth.yaml
id: api-admin-requires-auth
info:
  name: Admin API must reject unauthenticated requests
  severity: high
  tags: api,auth
http:
  - method: GET
    path:
      - "{{BaseURL}}/api/admin/users"
    matchers:
      - type: status
        status:
          - 200        # a 200 here is a finding — admin data without auth
\`\`\`

**2. Scan an OpenAPI-defined surface.** Provide the documented paths as a target list (one URL per endpoint) and run header/exposure templates across all of them, so every endpoint is checked for missing headers, verbose errors, or default responses. Combine with the \`-tags api,exposure,misconfig\` filter to keep the run focused. For broader API testing patterns, see our [comparison hub](/compare).

## Severity gating in CI

Nuclei assigns each template a severity (\`info\`, \`low\`, \`medium\`, \`high\`, \`critical\`). Gate your build on it two ways:

**Filter at scan time** so only relevant severities run/report:

\`\`\`bash
nuclei -l targets.txt -severity critical,high -json-export results.json
\`\`\`

**Decide pass/fail by parsing the output**, which gives you exact control:

\`\`\`python
# gate.py — fail CI on any high/critical finding
import json, sys

findings = []
with open("results.json") as f:
    for line in f:                      # json-export is newline-delimited JSON
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        sev = rec.get("info", {}).get("severity", "info")
        if sev in ("high", "critical"):
            findings.append(f'{sev.upper()}: {rec["info"]["name"]} @ {rec.get("matched-at","")}')

if findings:
    print("NUCLEI FINDINGS ABOVE THRESHOLD:\\n  " + "\\n  ".join(findings))
    sys.exit(1)
print("No high/critical findings.")
\`\`\`

A sensible QA policy: fail the build on \`critical\` and \`high\`, report \`medium\` as warnings while you triage, and leave \`info\`/\`low\` for periodic review. This keeps the gate meaningful without drowning developers in noise.

## Nuclei in GitHub Actions

ProjectDiscovery maintains a Nuclei GitHub Action; you can also run the binary directly. A direct-run workflow on pull requests:

\`\`\`yaml
# .github/workflows/nuclei.yml
name: nuclei-scan
on:
  pull_request:
    branches: [main]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Nuclei
        run: |
          go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
          echo "$(go env GOPATH)/bin" >> "$GITHUB_PATH"

      - name: Update templates
        run: nuclei -update-templates

      - name: Run scan
        run: |
          nuclei -u "\${{ vars.TEST_TARGET }}" \\
            -t .nuclei-templates/ \\
            -severity critical,high,medium \\
            -json-export results.json -stats || true

      - name: Gate on findings
        run: python gate.py

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: nuclei-results
          path: results.json
\`\`\`

Run \`-update-templates\` before scanning so new CVEs are covered, capture results unconditionally (\`|| true\` then a separate gate step) for full control, and upload the JSON as an artifact for auditing. Point \`TEST_TARGET\` at a deployed test environment.

## Common errors and how to fix them

- **No templates found / outdated checks.** You haven't run \`nuclei -update-templates\`, or the templates directory path is wrong. Update first, and pass \`-t <dir>\` explicitly for custom templates.
- **Scan reports nothing because the target is unreachable.** In CI the app may be private. Deploy to a reachable test environment, or run app and scanner on the same Docker network.
- **Too much noise from low-severity templates.** Restrict with \`-severity critical,high\` and \`-tags\` so only relevant checks run; gate the build on high/critical only.
- **Custom template never matches.** Check the matcher \`part\` (header vs body), \`matchers-condition\` (and/or), and \`negative\` flag, and test the template against a known-vulnerable fixture to confirm it fires.
- **Rate limiting or target overload.** Tune concurrency and rate (\`-rate-limit\`, \`-concurrency\`) downward against sensitive environments, and avoid running the full intrusive set against production.

## Frequently Asked Questions

### What is Nuclei used for?

Nuclei is an open-source, template-based security scanner that detects vulnerabilities, exposures, and misconfigurations by matching YAML templates against a target's responses. Each template encodes one specific check — a known CVE, an exposed file, a missing header, a default credential — and Nuclei runs thousands in parallel. QA teams use it as a fast shift-left security gate in CI against deployed URLs and APIs.

### How is Nuclei different from OWASP ZAP?

Nuclei is template-driven: it runs a large library of targeted, low-false-positive checks (especially known CVEs and exposures) and is extremely fast and CI-friendly, but it doesn't crawl an app to discover attack surface on its own. OWASP ZAP spiders and actively scans a running app, finding issues like reflected XSS through generated payloads. Many teams run both — Nuclei for known-issue and misconfiguration coverage, ZAP for crawl-based active scanning.

### How do I write a custom Nuclei template?

Create a YAML file with an info block (id, name, severity, tags), an http section describing the request (method and path using the {{BaseURL}} variable), and matchers that define what response indicates a finding — a status code, a word in the body or header, or a regex. Use matchers-condition to require all or any matchers, and the negative flag to fire when something is absent, such as a missing security header.

### Can Nuclei scan APIs?

Yes. Because templates are just HTTP requests with matchers, Nuclei scans APIs without needing a UI to crawl. You can write custom templates that assert each endpoint's secure behavior (for example, an admin path must not return 200 without auth) or pass a list of OpenAPI-documented endpoints as targets and run header, exposure, and misconfiguration templates across all of them.

### How do I run Nuclei in CI?

Install the Nuclei binary (or use the Docker image), run nuclei -update-templates to fetch the latest CVE checks, then scan a deployed test environment with severity and tag filters and write JSON output. Parse that output in a gate step to fail the build on high and critical findings, and upload the results as an artifact. ProjectDiscovery also maintains a GitHub Action that wraps these steps.

### Is Nuclei safe to run against production?

Many Nuclei templates are passive detections, but the full template set can include intrusive checks and will generate traffic, log noise, and load. Run scans against a deployed test or staging environment that mirrors production, tune concurrency and rate limits downward for sensitive targets, and restrict the template set with tags and severity filters rather than running everything against production.
`,
};
