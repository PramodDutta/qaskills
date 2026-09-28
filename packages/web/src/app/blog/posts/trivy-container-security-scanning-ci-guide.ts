import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Trivy: Container, IaC, and SBOM Security Scanning in CI',
  description: 'Trivy guide for QA teams: scan containers, repos, IaC, Kubernetes, and SBOMs in CI with pinned actions, caching, SBOMs, and sane release gates.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Trivy: Container, IaC, and SBOM Security Scanning in CI

Trivy is active and current. I verified Trivy \`v0.74.0\`, released on August 14, 2026, in the official Aqua Security changelog, and the official install docs now reference \`v0.74.0\` release assets. I also verified \`aquasecurity/trivy-action@v0.36.0\` as the current documented GitHub Action release and confirmed the action has built-in caching for the vulnerability DB, Java DB, and checks bundle.

The important caveat is supply-chain history. Aqua's official advisory (GHSA-69fq-xp46-6x23) says the Trivy ecosystem was temporarily compromised on March 19, 2026, including a malicious \`v0.69.4\` release and affected GitHub Actions tags. That does not mean Trivy should be avoided in 2026. It means security scanners belong in the same threat model as compilers, package managers, and deploy actions. Pin versions or commit SHAs, review release notes, and never use floating scanner tags in privileged CI.

For QA and test automation engineers, Trivy is useful because it scans multiple risk surfaces with one CLI: container images, file systems, Git repositories, infrastructure-as-code, Kubernetes clusters, secrets, licenses, and SBOM inputs. Pair it with code-level checks like [Semgrep for QA engineers](/blog/semgrep-for-qa-engineers-guide-2026) and external probe workflows like [Nuclei security testing in CI](/blog/nuclei-security-testing-ci-guide-2026) when you want a broader release gate.

## Verified Tooling Snapshot

| Component | Verified version or behavior | CI recommendation |
| --- | --- | --- |
| Trivy CLI | \`v0.74.0\`, official changelog dated 2026-08-14 | Install exact versions in repeatable jobs |
| Trivy install docs | Official script and release examples reference \`v0.74.0\` | Prefer package manager, official binary, or pinned container image |
| GitHub Action | \`aquasecurity/trivy-action@v0.36.0\`, latest release on 2026-04-22 | Use \`v0.36.0\` or a reviewed commit SHA |
| Setup action | \`aquasecurity/setup-trivy\` latest verified as \`v0.3.1\` | Let \`trivy-action\` install Trivy unless you need manual setup |
| Cache | Action caches vulnerability DB, Java DB, and checks bundle by default | Keep built-in cache enabled unless debugging |
| SBOM | Supports CycloneDX and SPDX generation and SBOM scanning | Save SBOMs as release artifacts, scan them again during deploy |

The scanner is not one thing. It is a set of targets and scanners. The target is what you scan: image, file system, repo, config, Kubernetes cluster, or SBOM. The scanner is what Trivy looks for: vulnerabilities, misconfigurations, secrets, licenses, and related findings. Most bad CI implementations confuse those two dimensions, then either scan too little or block every build on stale noise.

## Target Matrix For QA Pipelines

| Trivy target | Example command | Good CI stage |
| --- | --- | --- |
| Container image | \`trivy image local/app:ci\` | After image build, before push or deploy |
| File system | \`trivy fs --scanners vuln,secret,misconfig .\` | Pull request validation |
| Git repository | \`trivy repo https://github.com/org/repo\` | Scheduled checks or external repo intake |
| IaC config | \`trivy config ./infra\` | Terraform, Kubernetes YAML, Helm, CloudFormation review |
| Kubernetes cluster | \`trivy k8s --report summary\` | Pre-release cluster review or scheduled audit |
| SBOM | \`trivy sbom release.cdx.json\` | Release verification and downstream deployment gates |

A QA team should start with \`fs\` and \`image\`. \`fs\` catches vulnerable dependencies, secrets, and IaC issues before a container even exists. \`image\` catches OS package vulnerabilities, image-layer surprises, and runtime package drift. Add \`config\` when infrastructure changes are reviewed in the same repo. Add \`sbom\` when your release process stores an inventory and later needs to rescan the exact shipped artifact.

## Install And Pin The CLI

For local use on macOS or Linux, Homebrew is the simplest official path:

\`\`\`bash
brew install trivy
trivy version
trivy image alpine:3.20
\`\`\`

For CI images where you want an exact version from official release assets, use the install script with a version. Keep this in a pinned build image or a controlled setup step, not inside every test if you can avoid it.

\`\`\`bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b ./bin v0.74.0
./bin/trivy version
./bin/trivy fs --scanners vuln,secret,misconfig .
\`\`\`

For containerized scanner usage, pin the scanner image version too. The official install docs show Trivy images in Docker Hub, GHCR, and public ECR. A digest pin is stronger than a tag pin, but a fixed version tag is still much better than \`latest\`.

\`\`\`bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v /tmp/trivy-cache:/root/.cache aquasec/trivy:0.74.0 image alpine:3.20
\`\`\`

If the scanner runs inside your CI container, give it a persistent cache directory. Trivy downloads vulnerability databases and a Java DB. Without caching, repeated jobs are slower and more likely to hit registry or network limits.

## Command Patterns That Work

Start report-only, then add gates. The \`--exit-code\` flag controls failure when security issues are found, and \`--severity\` narrows which severities appear. \`--ignore-unfixed\` displays only vulnerabilities with a known fix, which is often reasonable for a pull-request gate.

\`\`\`bash
trivy fs --scanners vuln,secret,misconfig --format table --severity HIGH,CRITICAL .
trivy fs --scanners vuln,secret,misconfig --format json --output trivy-fs.json .
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 local/app:ci
trivy config --severity HIGH,CRITICAL --exit-code 1 ./infra
trivy image --format cyclonedx --output sbom.cdx.json local/app:ci
trivy sbom --severity HIGH,CRITICAL --exit-code 1 sbom.cdx.json
\`\`\`

The two-pass pattern is deliberate. First produce a complete JSON or SARIF report with \`exit-code: 0\` or no failure. Then run a stricter table or SARIF gate for \`HIGH,CRITICAL\`. This preserves evidence even when a gate fails. It also lets QA automation attach the full report to a test run while the blocking gate remains focused.

## trivy.yaml For Repeatable Policy

Trivy supports a \`trivy.yaml\` config file. Use it when CLI flags have grown into a policy. The official config docs map keys like \`format\`, \`ignorefile\`, \`exit-code\`, \`severity\`, \`scan.scanners\`, \`vulnerability.ignore-unfixed\`, and cache or DB options to flags.

\`\`\`yaml
format: table
exit-code: 1
severity:
  - HIGH
  - CRITICAL
ignorefile: .trivyignore
scan:
  scanners:
    - vuln
    - misconfig
    - secret
pkg:
  include-dev-deps: false
vulnerability:
  ignore-unfixed: true
misconfiguration:
  scanners:
    - dockerfile
    - terraform
    - kubernetes
license:
  confidenceLevel: 0.9
db:
  repository:
    - mirror.gcr.io/aquasec/trivy-db:2
    - ghcr.io/aquasecurity/trivy-db:2
  java-repository:
    - mirror.gcr.io/aquasec/trivy-java-db:1
    - ghcr.io/aquasecurity/trivy-java-db:1
\`\`\`

A config file helps AI coding agents too. Instead of asking an agent to remember scanner policy, ask it to update \`trivy.yaml\` and the CI job together. Then review the diff for one policy surface. That prevents a common drift where \`.github/workflows/security.yml\` blocks on \`CRITICAL\`, a local Makefile blocks on \`HIGH,CRITICAL\`, and a release job silently ignores unfixed vulnerabilities.

## GitHub Actions With Built-In Cache

This workflow builds an image, produces a full report, uploads the report, then runs a blocking gate. It uses current GitHub Actions majors from the provided environment and the verified Trivy Action version.

\`\`\`yaml
name: container-security

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  trivy:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
    steps:
      - name: Check out code
        uses: actions/checkout@v7

      - name: Build image
        run: docker build -t local/app:\${{ github.sha }} .

      - name: Generate full Trivy image report
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          image-ref: local/app:\${{ github.sha }}
          format: json
          output: trivy-image.json
          exit-code: 0

      - name: Upload Trivy report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: trivy-image-\${{ github.run_id }}
          path: trivy-image.json
          if-no-files-found: error

      - name: Fail on fixed high and critical vulnerabilities
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          image-ref: local/app:\${{ github.sha }}
          severity: HIGH,CRITICAL
          ignore-unfixed: true
          format: table
          exit-code: 1
          skip-setup-trivy: true
\`\`\`

The final step uses \`skip-setup-trivy: true\` because the action already installed Trivy in the earlier step. The action cache is on by default, so you do not need a separate \`actions/cache\` block for normal cases. If your organization requires cache warming on the default branch, follow the action docs and keep the cache key workflow simple. Do not make every pull request download databases from scratch.

Pinning matters more here than it does for ordinary build helpers. A security scanner often runs with access to source code, image layers, package manifests, registry credentials, and sometimes cloud tokens. The official Trivy advisory is the proof: scanner infrastructure can be a target. Use verified releases, protect workflow files with CODEOWNERS, and consider commit-SHA pins for actions that touch secrets.

## Suppressions With Expiry

Trivy supports \`.trivyignore\` and experimental \`.trivyignore.yaml\`. The simple file handles finding IDs and inline expiration syntax. The YAML file lets you scope IDs by paths, package URLs, and scanner type, but the official docs mark YAML ignore support experimental and require explicitly passing the YAML path.

\`\`\`text
# Accepted until the upstream image publishes a fixed OpenSSL package.
CVE-2026-12345 exp:2026-10-15

# Local dev Dockerfile is never shipped.
AVD-DS-0002
\`\`\`

\`\`\`yaml
vulnerabilities:
  - id: CVE-2026-12345
    paths:
      - "usr/lib/libssl.so.3"
    expired_at: 2026-10-15
    statement: Base image maintainer has acknowledged the fix window.
misconfigurations:
  - id: AVD-DS-0002
    paths:
      - "docs/Dockerfile"
    statement: Documentation-only image, not published.
secrets:
  - id: generic-unwanted-rule
    paths:
      - "test/fixtures/example.env"
licenses:
  - id: GPL-3.0
\`\`\`

Suppressions need owners. A \`.trivyignore\` entry without expiry is a parking lot for risk. A good pull request that adds an ignore entry should include the finding, affected artifact, reason, expiry, and follow-up ticket. QA should reject suppressions that say only "false positive" without explaining why the vulnerable code path or config path cannot be reached.

## SBOM Generation And Rescanning

Trivy can generate SBOMs in CycloneDX JSON and SPDX formats. The official docs note that CycloneDX XML is not supported for Trivy output in the referenced page, and that \`--format cyclonedx\` represents an SBOM by default without vulnerabilities unless scanners are explicitly requested. SPDX output is available as tag-value or \`spdx-json\`.

| Need | Command | Artifact |
| --- | --- | --- |
| CycloneDX inventory | \`trivy image --format cyclonedx --output sbom.cdx.json local/app:ci\` | \`sbom.cdx.json\` |
| SPDX JSON inventory | \`trivy image --format spdx-json --output sbom.spdx.json local/app:ci\` | \`sbom.spdx.json\` |
| Rescan shipped inventory | \`trivy sbom --severity HIGH,CRITICAL sbom.cdx.json\` | Current vulnerability view of stored SBOM |
| Include vulnerabilities in CycloneDX | \`trivy image --format cyclonedx --scanners vuln --output bom-vuln.cdx.json local/app:ci\` | SBOM plus vulnerability data |

The best release process stores both image digest and SBOM. Later, when a new CVE appears, you can rescan the SBOM and map affected releases without rebuilding old images. That is not a substitute for scanning the live image, because image metadata and package detection can differ, but it gives incident response a fast inventory path.

## Kubernetes And IaC Gates

Use \`trivy config\` for manifests and IaC before deployment. Use \`trivy k8s\` for cluster state after deployment or on a schedule. The Kubernetes command is marked experimental in the CLI docs, so avoid making its exact output format a fragile contract.

\`\`\`bash
trivy config --severity HIGH,CRITICAL --exit-code 1 ./infra
trivy config --include-non-failures --format json --output trivy-iac.json ./infra
trivy k8s --report summary
trivy k8s --include-namespaces staging --report summary
\`\`\`

What people get wrong is scanning Terraform source only after \`terraform apply\`. At that point, the pipeline has already created or changed infrastructure. Put \`trivy config\` before plan review, then optionally scan the cluster later for drift. For Helm, include the same values files your deployment uses. A chart scanned with defaults can pass while the production values create privileged containers or public services.

## Diagnose A CI Failure That Looks Random

The common noisy failure is a sudden flood of new vulnerabilities with no source diff. First check the database timestamp and Trivy version. Vulnerability databases change independently of your code. If the gate blocks every pull request after a DB update, you have one gate doing two jobs: preventing new risk and forcing old-risk remediation.

Split the work. Keep the pull-request gate focused on fixed \`HIGH,CRITICAL\` findings in changed artifacts or in the image built by that branch. Route pre-existing findings to a scheduled security backlog with artifact names, CVE IDs, installed versions, fixed versions when available, and owner. Use \`--ignore-unfixed\` for PR gates if your policy allows it, then keep a report-only job that still records unfixed critical exposure.

The other failure is cache or registry throttling. The Trivy Action cache is enabled by default and stored under \`.cache/trivy\` in the workspace. If jobs repeatedly download DBs, check whether the cache is disabled, whether pull requests from forks can access the default-branch cache, and whether your workflow is running in fresh ephemeral contexts that never save cache. For self-hosted runners, a stable cache directory plus periodic \`trivy image --download-db-only\` can remove most noise.

## What QA Engineers Should Own

Security scanning is not only a security team's job when it blocks delivery. QA engineers are good owners for the release mechanics because they already think in gates, evidence, reproduction, and failure triage.

| QA responsibility | Concrete artifact | Review question |
| --- | --- | --- |
| Scanner coverage | Workflow file and \`trivy.yaml\` | Are we scanning source, image, and IaC at the right stages? |
| Evidence | JSON, SARIF, SBOM, and artifact uploads | Can someone debug a failed gate after logs expire? |
| Suppression hygiene | \`.trivyignore\` or \`.trivyignore.yaml\` | Does each exception have scope, reason, owner, and expiry? |
| Agent guardrails | Prompt templates and review checklist | Did the agent change policy or only fix the finding? |
| Release readiness | SBOM and image digest | Can we map a new CVE to shipped versions quickly? |

When using Claude Code, Cursor, or Copilot, ask for small changes: upgrade a base image, replace a vulnerable package, narrow a Dockerfile permission, or add a focused Trivy job. Do not ask an agent to "make Trivy pass" across a whole repo. That prompt tends to produce broad suppressions, lower severity gates, or image changes that break runtime behavior.

## Frequently Asked Questions

### Is Trivy safe to use after the 2026 compromise?

Yes, if you use current verified releases and treat scanner setup as sensitive CI code. Aqua's official advisory describes the March 2026 compromise and the affected \`v0.69.4\` era. The current verified CLI version for this guide is \`v0.74.0\`, and the current action guidance is \`aquasecurity/trivy-action@v0.36.0\` or a reviewed commit SHA. Avoid floating tags, protect workflow files, and review scanner upgrades like production dependencies.

### Should pull requests fail on all vulnerabilities?

Usually no. A gate that fails on every low, medium, unfixed, or pre-existing issue will train teams to bypass it. Start by failing on fixed \`HIGH,CRITICAL\` findings in the artifact under review, while still publishing a full report. Track older findings in a scheduled backlog. Tighten the policy once remediation flow is reliable.

### When should I scan an SBOM instead of an image?

Scan the image before release because it represents the built artifact. Scan the SBOM later when you need to assess already shipped versions quickly, especially during incident response. SBOM scanning is fast and useful for inventory, but it can be less precise when the SBOM was generated by a different tool or lacks Trivy-specific properties.

### Do I need both \`trivy fs\` and \`trivy image\`?

Most teams do. \`trivy fs\` catches dependency, secret, and config issues before an image exists. \`trivy image\` catches OS packages, image-layer contents, and final runtime composition. Running both also helps diagnose where a finding entered the system: application manifest, Dockerfile, base image, or generated artifact.
`,
};
