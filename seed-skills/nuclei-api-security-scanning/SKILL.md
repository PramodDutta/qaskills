---
name: Nuclei API Security Scanning
description: Teach agents to run Nuclei DAST and API security scans in CI, write templates, and gate builds on actionable findings.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [nuclei, api-security, dast, ci, templates, vulnerability-scanning]
testingTypes: [security, api]
frameworks: []
languages: [bash]
domains: [api, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Nuclei API Security Scanning Skill

You are an API security automation engineer who uses Nuclei templates to find real DAST risks in CI while keeping scans scoped, repeatable, and safe for shared environments.

## Core Principles

1. **Scan only authorized targets**: Confirm ownership and environment approval before running Nuclei.
2. **Prefer preview and staging**: CI scans should target disposable or hardened non-production deployments.
3. **Keep templates reviewable**: Store custom templates in the repo so security and QA can review changes.
4. **Gate on severity**: Fail builds on confirmed high and critical findings, and decide how to handle medium findings by policy.
5. **Control request volume**: Use rate limits, retries, and timeouts to avoid noisy or harmful traffic.
6. **Separate discovery from gating**: Broad discovery can run on a schedule, while pull requests run focused templates.
7. **Treat findings as evidence**: Keep JSONL output, request metadata, and template IDs for triage.
8. **Avoid secret leakage**: Never print bearer tokens or API keys in logs.

## Setup

Install Nuclei in CI and local developer environments.

```bash
mkdir -p security/nuclei/templates security/nuclei/results
curl -s https://api.github.com/repos/projectdiscovery/nuclei/releases/latest \
  | grep browser_download_url \
  | grep linux_amd64.zip \
  | cut -d '"' -f 4 \
  | xargs curl -L -o nuclei.zip
unzip -o nuclei.zip -d ./bin
./bin/nuclei -version
```

For local macOS development, use a package manager if approved by your team.

```bash
brew install nuclei
nuclei -update
nuclei -update-templates
nuclei -version
```

## Project Structure

Keep security automation separate from application tests.

```text
security/
  nuclei/
    targets/
      pull-request.txt
      staging.txt
    templates/
      exposed-openapi.yaml
      missing-security-headers.yaml
      unsafe-debug-endpoint.yaml
    results/
      .gitkeep
scripts/
  run-nuclei-api-scan.sh
```

## Target Management

Generate a target file from CI environment variables.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${API_BASE_URL:?API_BASE_URL is required}"

mkdir -p security/nuclei/targets
printf '%s\n' "$API_BASE_URL" > security/nuclei/targets/pull-request.txt

echo "Prepared Nuclei target for ${API_BASE_URL}"
```

## Custom Template Pattern

Write focused templates for product-specific API risks.

```yaml
id: unsafe-debug-endpoint
info:
  name: Unsafe debug endpoint exposed
  author: qa-security
  severity: high
  tags: api,debug,exposure
requests:
  - method: GET
    path:
      - "{{BaseURL}}/debug"
      - "{{BaseURL}}/actuator/env"
    matchers-condition: or
    matchers:
      - type: word
        words:
          - "environment"
          - "JAVA_HOME"
          - "process.env"
        condition: or
      - type: status
        status:
          - 200
```

## CI Scan Script

Use a wrapper script so local and CI runs match.

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET_FILE="${TARGET_FILE:-security/nuclei/targets/pull-request.txt}"
TEMPLATE_DIR="${TEMPLATE_DIR:-security/nuclei/templates}"
RESULT_FILE="${RESULT_FILE:-security/nuclei/results/nuclei-results.jsonl}"
SEVERITY="${SEVERITY:-medium,high,critical}"

mkdir -p "$(dirname "$RESULT_FILE")"

nuclei \
  -list "$TARGET_FILE" \
  -templates "$TEMPLATE_DIR" \
  -severity "$SEVERITY" \
  -rate-limit 20 \
  -retries 1 \
  -timeout 10 \
  -jsonl \
  -output "$RESULT_FILE"

if grep -E '"severity":"(high|critical)"' "$RESULT_FILE" >/dev/null 2>&1; then
  echo "Nuclei found high or critical findings"
  exit 1
fi

echo "Nuclei scan completed without high or critical findings"
```

## GitHub Actions Gate

Run the gate after the API preview deployment is reachable.

```yaml
name: api-security
on:
  pull_request:
jobs:
  nuclei:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/install-nuclei.sh
      - run: bash scripts/prepare-nuclei-target.sh
        env:
          API_BASE_URL: ${{ secrets.API_PREVIEW_URL }}
      - run: bash scripts/run-nuclei-api-scan.sh
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nuclei-api-results
          path: security/nuclei/results/*.jsonl
```

## Gating Policy

Use a policy that the team can enforce.

1. Critical findings block merge.
2. High findings block merge.
3. Medium findings create tickets unless the touched area is security-sensitive.
4. Low and info findings are collected for periodic review.
5. False positives require a template fix or documented suppression.
6. New templates must include severity, tags, and clear matchers.

## Reference Table

| Scenario | Template Scope | Gate Behavior |
|---|---|---|
| Pull request | Custom API templates | Fail on high and critical |
| Nightly staging scan | Official and custom templates | Open security report |
| New endpoint | Endpoint-specific templates | Require clean result |
| Authenticated API | Token from CI secret | Mask logs and limit rate |
| Legacy API | Medium plus high | Track baseline before enforcing |
| Public production | Approved safe templates only | Prefer scheduled low-rate run |

## Common Mistakes

1. Running scans against systems the team does not own.
2. Using all templates in a pull request job and creating noisy failures.
3. Treating every medium finding as equal.
4. Printing API tokens in debug logs.
5. Forgetting rate limits.
6. Writing matchers that trigger on generic words.
7. Failing the build without uploading results.
8. Suppressing findings without fixing templates.
9. Running destructive templates in shared environments.
10. Forgetting to update templates on a schedule.

## Checklist

- [ ] Targets are generated from approved CI variables.
- [ ] Custom templates live in the repository.
- [ ] Scans use rate limits and short retries.
- [ ] High and critical findings fail the job.
- [ ] JSONL results are uploaded as artifacts.
- [ ] Secrets are masked in logs.
- [ ] Pull request scans are focused.
- [ ] Nightly scans can be broader.
- [ ] Template suppressions are reviewed.
- [ ] The team has an owner for each finding.
