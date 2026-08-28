import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Secrets Scanning in CI with Gitleaks: Baselines, Allowlists, and False Positives',
  description: 'Secrets scanning CI with Gitleaks blocks new tokens, manages baselines, and trims false positives without hiding real credential leaks.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Secrets Scanning in CI with Gitleaks: Baselines, Allowlists, and False Positives

Secrets scanning CI means every pull request and protected branch is checked for committed credentials before the code can land. With Gitleaks, the practical pattern is simple: scan the diff for new leaks, keep a baseline for known historical findings, use allowlists only for documented non-secrets, and fail builds on any unreviewed secret.

Official Gitleaks documentation: https://github.com/gitleaks/gitleaks

## The CI Contract: Block New Secrets, Do Not Pretend History Is Clean

A useful secrets scanning CI setup has one job: prevent new credentials from entering the repository. It is tempting to make the first build prove that the entire repository is clean, including every historical commit. That is noble, but it often creates a rollout stalemate. Large repositories usually contain old demo keys, expired tokens, vendor examples, generated fixtures, and at least one real secret that nobody wants to discuss in the same pull request as the scanner rollout.

The practical contract is stricter and more useful: scan the current change, block anything new, and track historical findings separately. Baselines exist for that reason. A baseline is not a pardon. It is a snapshot of findings that already exist so the scanner can distinguish old debt from new risk. You still need a cleanup plan for baseline entries, especially if any are live or reusable, but you do not need to let old debt disable the guardrail for every new branch.

For QA and test-automation engineers, the value is bigger than "security said so." Test code is full of realistic payloads: OAuth examples, API client fixtures, mobile push tokens, SMTP credentials, private keys for local TLS, and copied production request bodies. AI coding agents make this sharper. They can generate huge fixture sets in seconds, and they sometimes choose token-shaped strings because those strings look realistic. Your CI scanner becomes a fast feedback loop for both humans and agents.

| CI surface | What to scan | What should fail the build | What to record |
| --- | --- | --- | --- |
| Pull request | Changed commits or working tree | Any new finding not in baseline or allowlist | Report artifact and review comment |
| Main branch | Full current tree or new merge commit range | Any finding introduced by merge | Durable report for audit |
| Nightly job | Full history or broad branch set | Usually alert, not block | Trend, ownership, cleanup queue |
| Release branch | The exact release candidate revision | Any unresolved finding | Release evidence |

The key phrase is "new finding." If a pull request introduces a credential, fail loudly. If the repository already contains a documented false positive, suppress it narrowly. If the repository already contains a real credential, rotate it and remove it from history when the risk justifies the disruption. Do not solve those three cases with one global ignore pattern.

The companion concern is CI runtime. A full git history scan on every commit can be slow in a monorepo with years of binary patches. If your pipeline is already fighting cache churn, combine this rollout with the test selection thinking in [CI Test Impact Analysis and Caching Strategy](/blog/ci-test-impact-caching-strategy). Secrets scanning is cheap compared with browser suites, but bad placement still annoys developers enough that they look for bypasses.

## Gitleaks Modes That Matter in Pipelines

Gitleaks has three scanning modes that matter for CI: \`git\`, \`dir\`, and \`stdin\`. The official README describes them as separate commands. Use \`git\` when commit history matters, \`dir\` when you want the current filesystem state, and \`stdin\` when a pipeline step generates text that never lands in a file but still might contain credentials.

| Command | Pipeline fit | Strength | Watch-out |
| --- | --- | --- | --- |
| \`gitleaks git\` | Pull requests, protected branches, history audits | Sees secrets in commits and patches | Needs a sensible commit range for speed |
| \`gitleaks dir\` | Generated artifacts, current checkout, release bundles | Simple current-state scan | Does not inspect old commits |
| \`gitleaks stdin\` | Logs, rendered config, generated manifests | Catches secrets before persistence | You must choose what to stream |

Start with \`gitleaks git\` for repository protection. Add \`dir\` for release packages and generated files. Use \`stdin\` selectively, for example when a job renders Kubernetes manifests or Terraform plans and you want to prevent a later upload from carrying a token.

\`\`\`bash
gitleaks git --report-path gitleaks-report.json
gitleaks dir --report-path gitleaks-dir-report.json .
printf '%s\\n' "token=example" | gitleaks stdin --report-path gitleaks-stdin-report.json
\`\`\`

The examples above are intentionally plain. The exact command you use in CI depends on the Gitleaks version, the checkout depth, and whether the job receives a pull request base SHA. Do not invent flags because a blog post used them. Read the tool help in your build image:

\`\`\`bash
gitleaks git --help
gitleaks dir --help
gitleaks stdin --help
\`\`\`

One common mistake is scanning only the working directory in pull requests. That catches a secret present in the final file, but it can miss a credential that was committed and then deleted in the same branch. The credential still exists in the branch history. If your organization treats pull request branch history as publishable, scan commits. If your workflow squashes and never exposes branch history outside trusted infrastructure, you may still choose commit scanning because it catches bad habits earlier.

Another mistake is assuming the scanner understands your secret lifecycle. It does not know whether a token is expired, scoped to a test tenant, or copied from public documentation. Gitleaks detects patterns and entropy. Humans decide remediation. CI should produce enough context for that decision without dumping secrets into public logs.

## A Minimal GitHub Actions Gate

The most dependable GitHub Actions pattern is: checkout with enough history, install or invoke Gitleaks through a pinned method your team controls, run the scan, and upload the JSON report when the job fails. The official action ecosystem changes over time, so the sample below uses the Gitleaks CLI command shape and stable GitHub actions names rather than claiming a wrapper action that may change.

\`\`\`yaml
name: secrets

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Show Gitleaks version
        run: gitleaks version

      - name: Scan repository history
        run: gitleaks git --baseline-path gitleaks-baseline.json --report-path gitleaks-report.json

      - name: Upload report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: gitleaks-report
          path: gitleaks-report.json
\`\`\`

This workflow assumes \`gitleaks\` is available in the runner image or installed in an earlier step you own. Many teams bake security tools into a CI image for repeatability. Others install from a package manager. Either is fine if the version is visible in logs and controlled through normal dependency review.

Notice \`fetch-depth: 0\`. Shallow checkout can make commit-range scanning lie. If your job asks Gitleaks to inspect history but only one commit exists locally, you may get a fast green build that proved very little. For a directory-only scan, shallow checkout is less dangerous. For a git scan, make the history decision explicit.

If your repository has no baseline yet, create the baseline in a one-time controlled run, review it, commit it, and then switch the gate on. Do not generate a new baseline inside every CI run. That defeats the point by teaching CI to ignore whatever it just found.

\`\`\`bash
gitleaks git --report-path gitleaks-baseline.json
git add gitleaks-baseline.json
git commit -m "Add initial Gitleaks baseline"
\`\`\`

After that, CI uses the baseline as a fixed comparison input. A pull request that adds a new secret appears in \`gitleaks-report.json\` and fails. A pull request that only touches code near an old baseline finding should not be punished for unrelated history.

## Baselines Are Operational Debt, Not a Trash Can

Gitleaks documentation says a baseline can be any Gitleaks report and that applying it causes report output to contain only new issues. That is the behavior you want for rollout, but the team process around it matters more than the file.

Treat each baseline finding as a ticket with a status:

| Baseline status | Meaning | Action |
| --- | --- | --- |
| Rotated and removed | The credential was real and is no longer usable | Plan history cleanup if needed |
| Test fixture | The value is deliberately fake and used by tests | Move toward narrow allowlist |
| Vendor sample | The value came from public documentation | Keep only if fixture needs it |
| Unknown | Nobody can prove whether it is live | Assume risk until owner proves otherwise |

The worst baseline is a huge JSON blob nobody owns. It gets committed once, then every new false positive is added without review. Six months later the security job is green, but the baseline contains real access keys, stale demo tokens, and test data that could have been changed to safer values.

Add a baseline review cadence. Monthly is enough for many teams. The review does not need to be ceremony-heavy. Count entries by rule, path, and owning team. Delete entries when files disappear. Rotate anything that still looks plausible. Replace token-shaped fixtures with obviously fake values where the application under test does not require the exact shape.

Here is a small Node script that summarizes a Gitleaks JSON report by rule id and file. It is intentionally defensive because report fields can vary across tool versions and finding sources.

\`\`\`javascript
import fs from 'node:fs';

const path = process.argv[2] ?? 'gitleaks-baseline.json';
const raw = fs.readFileSync(path, 'utf8');
const findings = JSON.parse(raw);

if (!Array.isArray(findings)) {
  throw new Error('expected a JSON array of findings');
}

const byRule = new Map();
const byFile = new Map();

for (const finding of findings) {
  const rule = String(finding.RuleID ?? finding.ruleID ?? 'unknown-rule');
  const file = String(finding.File ?? finding.file ?? 'unknown-file');
  byRule.set(rule, (byRule.get(rule) ?? 0) + 1);
  byFile.set(file, (byFile.get(file) ?? 0) + 1);
}

console.log('Findings by rule');
for (const [rule, count] of [...byRule.entries()].sort()) {
  console.log(\`\${rule}: \${count}\`);
}

console.log('\\nTop files');
for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(\`\${count} \${file}\`);
}
\`\`\`

Run it against the baseline in a scheduled job and attach the output to a cleanup ticket. The point is not perfect analytics. The point is turning a hidden exception file into visible work.

## Allowlists: Make the Exception Smaller Than the Finding

Gitleaks supports rule-specific allowlists and global allowlists. The documentation notes that rule-specific allowlists can use criteria such as commits, paths, regexes, and stopwords, and that global allowlists have higher precedence. It also notes that newer configuration uses \`[[allowlists]]\` for global allowlists, while older examples may show deprecated syntax.

Use the narrowest allowlist that matches the reason. If a generated fixture file contains fake AWS-key-shaped strings, allowlist that path for the relevant rule. Do not globally allow every string that starts with the same prefix. If a specific old commit is noisy during history scanning, allowlist the commit only while the team decides whether to rewrite history. If a vendor lockfile produces entropy hits, allowlist the lockfile path, not all high-entropy strings.

\`\`\`toml
title = "Repository Gitleaks configuration"

[[allowlists]]
description = "Generated browser snapshots contain fake token-shaped strings"
paths = [
  '''(^|/)tests/fixtures/browser-snapshots/'''
]

[[rules]]
id = "fake-payment-token"
description = "Test-only payment tokens used by contract fixtures"
regex = '''tok_test_[A-Za-z0-9]{24}'''
secretGroup = 0

  [[rules.allowlists]]
  description = "Allow documented fake payment tokens in contract fixtures"
  condition = "AND"
  regexTarget = "line"
  paths = [
    '''(^|/)tests/contracts/payments/'''
  ]
  regexes = [
    '''tok_test_[A-Za-z0-9]{24}'''
  ]
\`\`\`

This configuration is not a recommendation to create fake secret rules for every project. It shows the shape of a scoped exception: path plus rule plus explanation. A reviewer can read it and understand why it exists.

The phrase "false positive" is often abused. A value is not a false positive just because the token has been revoked. It was a true positive at commit time and needs rotation evidence. A public example credential may be a false positive if it cannot authenticate anywhere and exists to test parsing. A generated hash is a false positive if it is not a credential and the scanner matched entropy alone. Those cases need different treatment.

| Finding type | Safe response | Bad response |
| --- | --- | --- |
| Live access token | Revoke, rotate, remove, audit use | Add to baseline and move on |
| Expired token | Prove expiry, remove from code, consider history | Call it false positive |
| Fake fixture token | Rename to obvious fake or allowlist fixture path | Add broad entropy ignore |
| Vendor sample | Replace with placeholder if possible | Ignore the whole vendor directory |
| Private key for local tests | Generate during test setup or store as fixture with clear scope | Commit production-like key material |

What people get wrong from practice: they use allowlists to make the report quiet instead of making the repository safer. Quiet is not the goal. Useful noise reduction is the goal. If an allowlist entry does not explain why the value is safe, it is just an undocumented bypass.

## Pull Request Triage Workflow for QA Teams

When CI fails on a secrets scan, treat it like a failed test with a security consequence. The triage path should be short enough that an AI coding agent can follow it and explicit enough that a human reviewer can verify it.

1. Read the report artifact, not the redacted console line.
2. Identify rule id, file path, commit, and author.
3. Decide whether the value is credential material, a fake fixture, or a scanner mismatch.
4. If credential material is possible, rotate first. Code cleanup is second.
5. Remove or replace the value in the branch.
6. If the value is intentionally fake, use a narrower fixture or allowlist.
7. Re-run the same Gitleaks command locally before pushing.

Here is a small shell script you can put in \`scripts/secrets-check.sh\`. It avoids clever shell features and uses an explicit report path so local and CI behavior match.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

REPORT_PATH="\${1:-gitleaks-report.json}"
BASELINE_PATH="\${2:-gitleaks-baseline.json}"

if [ -f "\${BASELINE_PATH}" ]; then
  gitleaks git --baseline-path "\${BASELINE_PATH}" --report-path "\${REPORT_PATH}"
else
  gitleaks git --report-path "\${REPORT_PATH}"
fi
\`\`\`

Pair that with an npm script only if this is a Node repository:

\`\`\`json
{
  "scripts": {
    "secrets:scan": "bash scripts/secrets-check.sh"
  }
}
\`\`\`

For non-Node repositories, use the native task runner. The important part is having one command that developers and agents can run before pushing. If the CI command and local command drift, failures become harder to reproduce and people start arguing with the tool instead of fixing the leak.

The review comment should never paste a secret. It should identify the rule, path, and remediation class. A good comment says: "Gitleaks found a possible token in \`tests/fixtures/oauth.json\`. If this is real, rotate it before updating the branch. If it is fake, replace it with \`fake_oauth_token_for_contract_tests\` or add a path-scoped allowlist with reviewer approval."

## Failure Story: The Baseline That Hid a Production Token

Symptom: a CI secrets job was green for months, then an external researcher reported a working third-party API token in a public repository mirror.

Wrong theory: the team assumed the mirror had a branch that CI did not scan. That was plausible because the repository had several release branches and a messy fork history.

Actual cause: during the scanner rollout, a contractor generated a baseline from the whole repository and committed it without owner review. The baseline contained both fake tokens and one live production token from an old load-test script. Later builds used \`--baseline-path\`, so the live token never appeared as a new finding. The code still contained the token. The mirror copied it. The green CI job was technically correct and operationally useless for historical debt.

Fix: the team revoked the token, audited service access, deleted the script, and split the baseline into reviewed categories. Test fixtures became obvious fake strings. Vendor samples moved under a path-scoped allowlist. Unknown findings became tickets owned by service teams. Pull requests still used the baseline, but the baseline stopped being anonymous debt.

The lesson is not "never use baselines." The lesson is "never use an unreviewed baseline as proof of safety." A baseline is a migration tool. It helps you turn on the guardrail today while cleaning yesterday's mess with intent.

This same pattern appears in other security checks. A scanner can prove a new subdomain takeover fingerprint appeared, but it cannot decide whether an old dangling DNS record is still exploitable. That broader inventory discipline belongs beside [Subdomain Takeover Testing for QA Teams](/blog/security-testing-subdomain-takeover), because both topics punish teams that confuse "not new" with "not risky."

## Designing Findings for Agents and Humans

AI coding agents can fix obvious secret leaks well if the report is structured. They struggle when the only output is a red terminal line with partial context. Give them artifacts: JSON report, scanner command, baseline file, and a remediation policy. Then tell the agent what it is allowed to do.

For example, an agent can safely replace fake fixture values, rename environment variables, move generated credentials into test setup, and add narrow allowlists for documented non-secrets. It should not rotate cloud credentials without human access and approval. It should not rewrite git history unless the team requested that explicitly. It should not broaden allowlists because a build is red.

Put this policy in your repository guidance:

\`\`\`markdown
# Secret finding remediation policy

When Gitleaks fails:

1. Do not paste the suspected secret into comments or logs.
2. If the value might authenticate, stop and ask the service owner to rotate it.
3. If the value is a test fixture, replace it with an obviously fake value when possible.
4. Add allowlists only when the value must keep a token-like shape.
5. Scope allowlists by path and rule. Include a description.
6. Re-run \`gitleaks git --baseline-path gitleaks-baseline.json --report-path gitleaks-report.json\`.
\`\`\`

That one page does more for agent reliability than a long security standard nobody reads. It turns a failed scan into a deterministic workflow.

## What to Assert Beyond "The Job Failed"

A secrets scanner is part of your test system, so test the scanner integration itself. That does not mean committing a real secret. It means adding a synthetic fixture in a temporary branch or a CI-only script that proves the job fails when it should.

| Integration check | How to perform it | Expected result |
| --- | --- | --- |
| Tool availability | Run \`gitleaks version\` | Version prints in CI logs |
| Baseline honored | Scan with known baseline file | Old findings do not fail PR |
| New finding blocked | Add a synthetic token in a throwaway branch | Job fails and uploads report |
| Allowlist scoped | Put the same token shape outside allowlisted path | Job fails outside exception |
| Report retained | Force a known failure | Artifact contains JSON report |

Use synthetic values that cannot authenticate anywhere. Prefer prefixes such as \`fake_\`, \`example_\`, or \`not_a_real_secret_\` when your application does not require a realistic provider token shape. If you must use provider-like shapes to test a detector, keep them in a clearly named fixture path and allowlist only that path after proving the detector fires.

Here is a tiny local canary file generator for a temporary branch. It writes an obvious fake value into a clearly named file, then reminds the developer to delete it. Do not keep this file in the repository.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p tmp-secret-canary
printf '%s\\n' "not_a_real_secret_value_for_gitleaks_canary" > tmp-secret-canary/example.txt
gitleaks dir --report-path tmp-secret-canary/report.json tmp-secret-canary
rm -f tmp-secret-canary/example.txt tmp-secret-canary/report.json
rmdir tmp-secret-canary
\`\`\`

If that script does not fail in your environment, it may be because the synthetic value does not match any rule. That is fine. Use a documented fake fixture that matches the rule you care about, but keep the fixture scoped. The test is for the CI integration, not for proving Gitleaks detects every possible provider secret.

## A Rollout Plan That Does Not Stall

Roll out in four phases. First, install the scanner and publish reports without blocking. Second, create and review a baseline. Third, block new findings on pull requests. Fourth, reduce baseline debt and expand scanning to generated artifacts.

Do not spend three months perfecting configuration before the first blocked pull request. That is backwards. The first win is stopping the next leak. After that, tune noise.

| Phase | Duration | Gate behavior | Exit criteria |
| --- | --- | --- | --- |
| Observe | A few builds | Report only | Tool runs consistently and artifacts are readable |
| Baseline | One focused cleanup pass | Report only or soft fail | Baseline reviewed by owners |
| Enforce | Ongoing | Fail on new findings | Developers can reproduce locally |
| Reduce | Scheduled | Fail on regressions | Baseline count trends downward |

The strongest teams make baseline reduction visible in the same place they show flaky test debt. A secret finding has ownership, age, and risk. If it is safe, remove it or document it. If it is unsafe, rotate it. If nobody knows, assign it.

## Frequently Asked Questions

### Should secrets scanning CI inspect full git history on every pull request?

Not always. Full history scanning gives the strongest signal, but it can be slow in large repositories. A practical setup scans enough pull request history to catch secrets committed and then deleted in the branch, while a scheduled job performs broader history scanning. If your checkout is shallow, be honest about that in the job name and documentation. Do not present a current-directory scan as a complete git-history audit.

### Is a Gitleaks baseline safe to commit?

It can be safe if the baseline is reviewed and does not expose raw secrets in a place with broader access than the original repository. Treat the baseline as security-sensitive metadata. Review entries before committing it, rotate anything that might still authenticate, and keep ownership for cleanup. The danger is not the baseline feature. The danger is committing an unreviewed report and letting CI treat every old finding as harmless forever.

### When should I use an allowlist instead of changing the test data?

Change the test data when the exact token shape is not required. Obvious fake values are easier to read, safer to copy, and less likely to train agents into generating realistic credentials. Use an allowlist when a parser, contract test, or compatibility suite must preserve a token-like shape. In that case, scope the allowlist by rule and path, add a description, and verify the same pattern still fails outside the allowed fixture.

### Can AI coding agents fix Gitleaks failures automatically?

They can fix the mechanical parts: replace fake fixtures, move generated credentials into setup, narrow an allowlist, or update a local reproduction command. They should not decide that a credential is harmless, rotate production secrets, or rewrite repository history without a human owner. Give the agent the JSON report and remediation policy, then require human review for any change that broadens scanner exceptions.
`,
};
