import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "DAST vs SAST vs SCA: A QA Decision Guide (2026)",
  description: "DAST vs SAST vs SCA explained for QA teams in 2026 — what each finds, how they map to the test pyramid, which CI gates to set, and when to run each tool.",
  date: "2026-06-15",
  category: "Security",
  content: `# DAST vs SAST vs SCA: A QA Decision Guide (2026)

SAST, DAST, and SCA are the three pillars of application security testing, and they answer different questions: **SAST (Static Application Security Testing)** analyzes your *source code* without running it, catching insecure patterns like SQL injection or hardcoded secrets early. **DAST (Dynamic Application Security Testing)** attacks your *running application* from the outside like a pentester, finding issues only visible at runtime — misconfigurations, auth flaws, reflected XSS. **SCA (Software Composition Analysis)** scans your *dependencies* for known-vulnerable third-party packages and license problems. You don't choose one; you layer all three at different stages of the pipeline, mapping them onto the test pyramid so cheap, fast checks gate every commit and slow, deep checks run later. This guide tells you what each finds, where it sits, and exactly which CI gates to set.

The tools and standards here evolve, so treat the gating thresholds as sensible starting points to tune for your risk tolerance, and confirm specific tool behavior against current vendor docs.

## The three at a glance

| | SAST | DAST | SCA |
|---|---|---|---|
| **Tests** | Source code (white-box) | Running app (black-box) | Third-party dependencies |
| **Needs running app?** | No | Yes | No |
| **Runs at** | Commit / PR (in IDE & CI) | Staging / deployed env | Commit / PR & continuously |
| **Finds** | Injection, hardcoded secrets, unsafe APIs, insecure patterns | Misconfig, auth/session flaws, reflected XSS, exposed endpoints | Known CVEs in libraries, risky licenses |
| **Speed** | Fast–medium | Slow | Fast |
| **False positives** | Higher (no runtime context) | Lower (confirmed at runtime) | Low (CVE matching) |
| **Example tools** | Semgrep, CodeQL, SonarQube | OWASP ZAP, Burp, Nuclei | Trivy, Grype, Dependabot, Snyk |

The shorthand: **SAST reads the code, DAST attacks the app, SCA checks the parts list.** Each catches a class of problem the others miss, which is exactly why you run all three. For a deeper dive on the DAST side, see our [OWASP ZAP CI guide](/blog).

## SAST — testing the source code

SAST analyzes source (or compiled) code *statically* — without executing it — by parsing it into an abstract representation and matching it against rules and data-flow analyses that flag insecure patterns.

**What it finds well:** SQL/command injection sinks, cross-site scripting in templates, hardcoded credentials and API keys, use of weak cryptography, unsafe deserialization, path traversal — anything detectable from the code's structure and data flow.

**What it misses:** runtime and configuration issues. SAST can't see that your reverse proxy exposes an admin route, that a session cookie lacks \`Secure\`, or that an environment variable holds a weak secret in production. It also produces **more false positives** than the others because it lacks runtime context — a tainted-looking path may be unreachable in practice.

**Where it runs:** earliest. SAST is the security equivalent of a linter — fast enough to run in the IDE and on every pull request.

\`\`\`yaml
# Semgrep SAST on every PR
- name: SAST (Semgrep)
  uses: semgrep/semgrep-action@v1
  with:
    config: "p/security-audit p/secrets"
  # fails the PR on findings at or above the configured severity
\`\`\`

## DAST — testing the running application

DAST tests a *deployed, running* application from the outside, with no knowledge of the source (black-box). It crawls or is fed endpoints, sends requests (including attack payloads), and observes responses — exactly how an external attacker probes a system.

**What it finds well:** server and framework **misconfigurations**, missing security headers, authentication and session-management flaws, reflected XSS, exposed debug endpoints, and issues that only manifest when the whole stack (app + config + infrastructure) is assembled.

**What it misses:** it can't point at the offending line of code, struggles to reach deep code paths behind complex state, and is slower because it exercises a live system. It needs a running environment, which adds pipeline complexity.

**Where it runs:** later — against a deployed test/staging environment, since you need the app actually running. Fast passive scans (e.g. a ZAP baseline or a Nuclei template run) can gate PRs against an ephemeral deploy; intrusive active scans run nightly. Compare the leading DAST tools in our [Burp vs ZAP comparison](/compare).

\`\`\`yaml
# DAST baseline (ZAP) against a deployed test env
- uses: zaproxy/action-baseline@v0.12.0
  with:
    target: "https://test.example.com"
\`\`\`

## SCA — testing your dependencies

Modern apps are mostly third-party code. SCA inventories your dependencies (direct and transitive), builds a software bill of materials (SBOM), and cross-references each package version against vulnerability databases (CVEs) and license rules.

**What it finds well:** known-vulnerable library versions (the Log4Shell class of problem), outdated packages with published CVEs, and license-compliance risks (a copyleft license in a proprietary product). Because it's matching versions against a database, its **false-positive rate is low** — though *reachability* (is the vulnerable function actually called?) is a separate question some tools now address.

**What it misses:** vulnerabilities in *your own* code (that's SAST/DAST) and zero-days not yet in a database. It also flags CVEs in dependencies you may not actually exercise, so triage matters.

**Where it runs:** on every PR (catch a newly added vulnerable dependency at introduction) *and* continuously/scheduled (a CVE can be published for a dependency you already shipped). Continuous scanning is what catches yesterday's safe dependency becoming today's emergency.

\`\`\`yaml
# SCA (Trivy) — scan the filesystem/lockfiles for vulnerable deps
- uses: aquasecurity/trivy-action@master
  with:
    scan-type: fs
    severity: CRITICAL,HIGH
    exit-code: "1"     # fail the build on HIGH/CRITICAL CVEs
\`\`\`

## Mapping to the test pyramid

The familiar test pyramid — many fast unit tests at the bottom, fewer slow end-to-end tests at the top — maps cleanly onto security testing:

- **Bottom (fast, every commit):** SAST and SCA. They're the "unit/integration tier" of security — fast, run without a deployed environment, and gate every pull request. SAST checks the code you wrote; SCA checks the code you imported. Like unit tests, they give developers feedback in minutes.
- **Top (slow, fewer, later):** DAST. It's the "end-to-end tier" — it requires the whole system running, is slower, and runs against a deployed environment, so it sits higher in the pyramid and runs less frequently (passive on PRs, active nightly). Like E2E tests, it's the most realistic and the most expensive.

This is "shift left" applied to security: push the cheap, fast checks (SAST, SCA) as early as possible so most issues are caught at the keyboard, and reserve the slow, realistic check (DAST) for later stages where a deployed environment exists. The pyramid shape holds — lots of cheap static checks, fewer expensive dynamic ones. The same skills that build a good test pyramid apply here; browse security testing skills in our [skills directory](/skills).

## Which CI gates to set

A practical, layered gating strategy that won't drown developers in noise:

| Stage | Check | Gate | Action on failure |
|---|---|---|---|
| **Pre-commit / IDE** | SAST (fast ruleset), secret scan | Block on confirmed secrets | Developer fixes locally |
| **Pull request** | SAST (full), SCA | Fail on HIGH/CRITICAL; warn on MEDIUM | Block merge until fixed or waived |
| **PR (ephemeral deploy)** | DAST passive (baseline / Nuclei) | Fail on HIGH; warn on MEDIUM | Block merge on serious findings |
| **Nightly (staging)** | DAST active (full scan) | Report; ticket HIGH/CRITICAL | Create issues, don't block merges |
| **Continuous / scheduled** | SCA re-scan of shipped deps | Alert on new CRITICAL CVE | Page/ticket for emergency patch |

Gating principles that keep this sustainable:

- **Fail fast and cheap first.** Secret detection and SCA on lockfiles are nearly instant — gate hard on them.
- **Calibrate by severity, not count.** Block on HIGH/CRITICAL; treat MEDIUM as warnings you triage, so the gate stays meaningful.
- **Don't block merges on slow active DAST.** Run it nightly and file tickets; a multi-hour scan blocking every PR gets disabled.
- **Allow accountable waivers.** A reviewed, time-boxed suppression (with a comment and an owner) beats teams turning the whole gate off.
- **Re-scan dependencies continuously.** New CVEs land daily; a PR-only SCA gate misses vulnerabilities published after merge.

## Do you need all three?

Yes — they're complementary, not redundant, and each covers a blind spot of the others:

- Run **only SAST** and you'll miss runtime misconfigurations and vulnerable dependencies.
- Run **only DAST** and you'll miss insecure code patterns (until they're exploitable) and ship known-vulnerable libraries.
- Run **only SCA** and you'll catch bad dependencies but none of your own bugs or your deployment's misconfigurations.

For a QA team adopting security testing, a sensible order is: start with **SCA** (highest signal-to-effort — it's fast, accurate, and catches the most common real-world incidents from vulnerable dependencies), add **SAST** for your own code, then layer **DAST** once you have a deployable test environment. Many modern platforms bundle all three, but the *category coverage* matters more than the specific vendor. See how the dynamic tools stack up in our [comparison hub](/compare).

## Frequently Asked Questions

### What is the difference between SAST, DAST, and SCA?

SAST analyzes your source code without running it to find insecure patterns like injection and hardcoded secrets; DAST attacks your running application from the outside like a pentester to find runtime issues such as misconfigurations and auth flaws; and SCA scans your third-party dependencies for known-vulnerable versions and license problems. SAST reads the code, DAST attacks the app, and SCA checks the parts list — each catches a class of issue the others miss.

### Do I need both SAST and DAST?

Yes, because they find different vulnerability classes and have complementary blind spots. SAST catches insecure code patterns early but misses runtime and configuration issues; DAST catches misconfigurations, auth flaws, and exposed endpoints that only appear when the whole stack runs, but can't point to the offending line of code. Running both, alongside SCA for dependencies, gives the coverage that any single technique cannot.

### Where do SAST, DAST, and SCA fit in the test pyramid?

SAST and SCA sit at the bottom of the pyramid — like unit and integration tests, they're fast, need no deployed environment, and gate every commit or pull request. DAST sits at the top, like end-to-end tests: it requires the whole application running, is slower, and runs less frequently against a deployed environment. The shape holds — many fast static checks, fewer expensive dynamic ones.

### Which CI gates should I set for security testing?

Gate hard and early on cheap, high-signal checks: fail pull requests on HIGH/CRITICAL findings from SAST and SCA and on confirmed secrets, while treating MEDIUM as warnings you triage. Run passive DAST against an ephemeral deploy to block serious findings, but run slow active DAST nightly and file tickets rather than blocking merges, and re-scan dependencies continuously to catch CVEs published after merge.

### Is SCA enough on its own?

No. SCA only finds known vulnerabilities in your third-party dependencies and license issues — it cannot detect insecure code you wrote (that's SAST) or runtime and deployment misconfigurations (that's DAST). It's often the best place to start because it's fast, accurate, and catches the most common real-world incidents from vulnerable libraries, but it must be layered with SAST and DAST for full coverage.

### Which should a QA team adopt first, SAST, DAST, or SCA?

Start with SCA: it has the highest signal-to-effort ratio because it's fast, has a low false-positive rate, and catches the very common real-world incidents caused by vulnerable dependencies, all without needing a deployed environment. Add SAST next to cover your own code on every pull request, then layer DAST once you have a deployable test or staging environment for runtime scanning.
`,
};
