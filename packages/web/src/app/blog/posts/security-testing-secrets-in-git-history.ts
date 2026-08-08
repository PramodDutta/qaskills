import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Secrets in Git History: Find, Prove, and Contain Exposure',
  description: 'Use security testing secrets in git history workflows to detect deleted credentials, verify full cleanup, and prevent exposed tokens from returning.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing Secrets in Git History: Find, Prove, and Contain Exposure

**Security testing secrets in git history** means examining every reachable commit, tag, and branch, not merely the files present in the latest checkout. A credential deleted five minutes after it was committed is still retrievable from the earlier Git object. The practical test is therefore: seed a harmless canary, prove the detector finds it before and after deletion, rotate the real credential if exposure is confirmed, rewrite history only when the risk justifies it, and scan the rewritten refs again.

Treat discovery and remediation as separate controls. Detection tells you which credential, object, path, and refs are affected. Revocation removes the credential's authority. History rewriting reduces continuing disclosure, but it cannot erase an existing clone, screenshot, build log, artifact, or fork. A green scan after a force push is useful evidence, not a time machine.

This guide builds a disposable Git laboratory, repeatable command-line probes, a dependency-free Node scanner, CI checks, and post-rewrite acceptance criteria. It focuses on credentials rather than token-verification defects. For those adjacent threats, use [security testing JWT algorithm confusion](/blog/security-testing-jwt-algorithm-confusion) and [testing JWT key rotation and JWKS cache](/blog/testing-jwt-key-rotation-jwks-cache).

## Define the security claim before choosing a scanner

The phrase "no secrets in Git" hides several different claims. A working-tree scan covers only the current files. A staged-diff scan covers what is about to enter the next commit. A history scan covers objects reachable through selected refs. A hosting-provider scan may add closed pull request refs, forks, cached views, and partner-pattern detection. QA engineers should state which surface a test covers so a passing result is not overinterpreted.

| Test surface | What it can prove | What it misses | Useful execution point |
| --- | --- | --- | --- |
| Working tree | current visible files lack selected patterns | deleted content and untracked exclusions | local review |
| Staged diff | the proposed commit does not add a match | earlier commits and unstaged files | pre-commit or pre-push |
| Reachable Git history | selected refs contain no matching text blobs | unreachable objects, remote-only refs, forks | CI and incident validation |
| Provider secret scanning | provider-recognized patterns and validity checks | unsupported secret types and external copies | continuous repository monitoring |
| Credential audit | exposed credential is revoked and replacements work | residual disclosure of the old value | incident response |

The claim should also name the pattern set. High-confidence provider tokens have recognizable prefixes and lengths. Internal passwords, database URLs, webhook secrets, and private keys require organization-specific rules. Entropy-only detection produces both misses and noise, because a short credential can look ordinary while a fixture hash can look random.

Use harmless canaries in tests. Never paste a production secret into a scanner fixture just to prove the scanner works. A canary should resemble the structure your custom rule expects but be cryptographically invalid and clearly labeled as test-only.

## Build a disposable repository that preserves the deletion trap

Create a laboratory outside any production clone. The following commands make three commits: a clean baseline, a file containing two invalid canaries, and a deletion. The final checkout is clean, but the middle commit remains reachable.

\`\`\`bash
lab_dir="$(mktemp -d)"
cd "\${lab_dir}"
git init
git config user.name "QA Fixture"
git config user.email "qa-fixture@example.invalid"

printf '%s\\n' '# Secret history laboratory' > README.md
git add README.md
git commit -m "clean baseline"

mkdir -p config
printf '%s\\n' 'AWS_ACCESS_KEY_ID=AKIA0000000000000000' 'INTERNAL_API_TOKEN=test_only_abcdefghijklmnopqrstuvwxyz' > config/local.env
git add config/local.env
git commit -m "add invalid canaries"

git rm config/local.env
git commit -m "delete canary file"
git status --short
\`\`\`

The checkout now contains no \`config/local.env\`. A recursive filesystem scanner can report success while \`git show HEAD~1:config/local.env\` still prints the canaries. That contrast is the first acceptance test for any history-scanning workflow.

Do not use a canary that accidentally matches a real provider's valid credential format closely enough to trigger automated revocation or abuse workflows. Documentation prefixes can be useful, but use impossible values, reserved domains, disabled test accounts, and an explicit fixture marker.

## Traverse refs, commits, and blobs deliberately

Git commands answer different questions. \`git log -G\` finds commits whose patches add or remove lines matching a regular expression. \`git grep <pattern> <tree>\` searches the files represented by a particular commit. \`git rev-list --all\` enumerates commits reachable from local refs selected by \`--all\`. These are complementary, not interchangeable.

| Command shape | Unit examined | Best question | Important limitation |
| --- | --- | --- | --- |
| \`git log -G PATTERN -p --all\` | changed patch lines | when was matching text introduced or removed? | unchanged copies may not appear in later commits |
| \`git grep PATTERN COMMIT\` | one commit tree | which tracked paths contain a match at this snapshot? | must be repeated across commits |
| \`git rev-list --objects --all\` | reachable objects and path hints | which blobs are reachable and under what historical names? | output is not content scanning |
| \`git show COMMIT:PATH\` | one historical blob | what exactly did a known path contain? | requires a known commit and path |

Start investigation with pickaxe-style patch search. The pattern below finds the deliberately invalid AWS-shaped canary without printing unrelated history.

\`\`\`bash
git log --all --date=iso --format='commit %H %ad %an' -G'AKIA[0-9A-Z]{16}' -p --no-ext-diff -- .
\`\`\`

Then scan every reachable commit tree. \`git grep\` returns status 1 when a commit has no match, so the loop handles that expected outcome and continues.

\`\`\`bash
git rev-list --all |
while IFS= read -r commit; do
  git grep -n -I -E 'AKIA[0-9A-Z]{16}|INTERNAL_API_TOKEN=[A-Za-z0-9_-]{20,}' "\${commit}" -- . || true
done
\`\`\`

This output intentionally contains the invalid canary. In a real incident, avoid copying full matches into tickets, chat, test reports, or terminal recordings. Record the commit ID, path, detector rule, credential owner, and a one-way fingerprint. Restrict raw evidence to responders who need it.

Fetch the refs you intend to certify before scanning. A shallow clone cannot inspect ancestors it does not possess, and a default clone may not create local refs for every remote branch. CI should either use a full-history checkout or run an explicit fetch appropriate to the repository. Verify the actual state rather than assuming checkout defaults.

\`\`\`bash
git rev-parse --is-shallow-repository
git branch --all
git tag --list
git for-each-ref --format='%(refname)' refs/heads refs/remotes refs/tags
\`\`\`

If the first command prints \`true\`, the local object database is not sufficient for a complete historical claim. If a sensitive commit existed only in a closed pull request ref or fork, even a complete local branch-and-tag scan may not cover it. State that boundary in the result.

## Turn custom patterns into a testable Node scanner

Provider scanners are valuable, but QA teams often need rules for internal tokens. Keep these rules in code, add positive and negative fixtures, and make findings structured. The following module scans input lines and redacts the detected value by reporting only its rule and SHA-256 fingerprint.

Save it as \`scripts/secret-patterns.mjs\`.

\`\`\`javascript
import { createHash } from "node:crypto";

export const rules = [
  {
    id: "aws-access-key-id-shape",
    expression: /AKIA[0-9A-Z]{16}/g,
  },
  {
    id: "internal-api-token",
    expression: /INTERNAL_API_TOKEN=([A-Za-z0-9_-]{20,})/g,
    capture: 1,
  },
];

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function scanText(text) {
  const findings = [];
  for (const rule of rules) {
    for (const match of text.matchAll(rule.expression)) {
      const value = match[rule.capture ?? 0];
      findings.push({
        rule: rule.id,
        fingerprint: fingerprint(value),
        index: match.index,
      });
    }
  }
  return findings;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const findings = scanText(input);
  process.stdout.write(JSON.stringify(findings, null, 2) + "\\n");
  process.exitCode = findings.length === 0 ? 0 : 1;
}
\`\`\`

The global flag is required because \`matchAll\` expects a global regular expression. Each invocation creates its own iterator state, so repeated scans remain deterministic. The scanner does not claim that every match is active. It claims that text matching a reviewed detector exists in the supplied stream.

Test both recognition and restraint with Node's built-in test runner. Save this as \`scripts/secret-patterns.test.mjs\` and run \`node --test scripts/secret-patterns.test.mjs\`.

\`\`\`javascript
import assert from "node:assert/strict";
import test from "node:test";
import { scanText } from "./secret-patterns.mjs";

test("detects both invalid canary formats without returning their values", () => {
  const input = [
    "AWS_ACCESS_KEY_ID=AKIA0000000000000000",
    "INTERNAL_API_TOKEN=test_only_abcdefghijklmnopqrstuvwxyz",
  ].join("\\n");

  const findings = scanText(input);
  assert.deepEqual(
    findings.map((finding) => finding.rule),
    ["aws-access-key-id-shape", "internal-api-token"],
  );
  assert.equal(JSON.stringify(findings).includes("AKIA"), false);
  assert.equal(JSON.stringify(findings).includes("test_only"), false);
});

test("ignores documentation placeholders and short ordinary assignments", () => {
  const input = [
    "AWS_ACCESS_KEY_ID=replace_me",
    "INTERNAL_API_TOKEN=short",
    "tokenCount=25",
  ].join("\\n");
  assert.deepEqual(scanText(input), []);
});
\`\`\`

False-positive fixtures are security work. If noisy rules teach contributors to ignore failures, the control loses value. Review every allowlist entry like production code: scope it to an exact fingerprint or fixture path, explain its purpose, and give it an owner. Avoid blanket exclusions such as all test directories, because copied production secrets often land in fixtures.

## Scan additions before they become permanent history

A staged-diff check shortens feedback without pretending to replace server-side scanning. Git's zero-context diff makes added lines easy to scan. The Node program reports fingerprints only, and Git retains responsibility for showing the contributor the actual staged content locally.

Save this executable hook as \`.githooks/pre-commit\`, then configure the repository with \`git config core.hooksPath .githooks\`.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

if git diff --cached --no-ext-diff --unified=0 --diff-filter=ACMR |
  node scripts/secret-patterns.mjs; then
  exit 0
else
  printf '%s\\n' 'Potential secret detected in staged changes.' >&2
  printf '%s\\n' 'Review with: git diff --cached' >&2
  exit 1
fi
\`\`\`

What people get wrong is scanning only the added file content after a merge. That catches a present-day leak but misses a secret added and deleted within the same pull request, because the final merge diff can be clean. Scan each pushed commit or the complete resulting history, and keep provider push protection enabled where available.

Client hooks are bypassable and are not automatically installed merely because the file is committed. Treat the hook as fast local feedback. Enforce the policy in a protected CI check and at the hosting boundary as well.

## Make the CI job cover history rather than the checkout

The following GitHub Actions job checks out full history, confirms the clone is not shallow, and sends patches for all reachable commits into the tested scanner. It uses documented action inputs and standard Git commands. Pin third-party or official actions according to your organization's dependency policy, ideally to reviewed commit SHAs.

\`\`\`yaml
name: Secret history regression

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  scan-history:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Test custom rules
        run: node --test scripts/secret-patterns.test.mjs

      - name: Confirm complete clone
        run: test "$(git rev-parse --is-shallow-repository)" = "false"

      - name: Scan reachable patches
        run: git log --all -p --no-ext-diff --format= | node scripts/secret-patterns.mjs
\`\`\`

Scanning patches detects values on both added and removed lines. It can process duplicate appearances and may not cover binary blobs. A mature pipeline combines recognized-provider scanning, custom rules, binary and archive handling where relevant, and explicit ref coverage. Keep the simple job as an executable baseline rather than marketing it as universal detection.

For large repositories, avoid weakening coverage merely to save minutes. Cache a reviewed baseline of previously triaged fingerprints, scan newly reachable objects on ordinary pull requests, and schedule a full scan. Periodically test the incremental algorithm against the full scan with seeded canaries.

## Diagnose the clean-checkout, failing-history incident

Consider a realistic failure: an engineer committed \`.env.production\`, deleted it in the next commit, and verified that \`rg API_KEY .\` returned nothing. CI still reports an internal token. The engineer assumes the scanner cached stale files.

Diagnosis should follow evidence:

1. Confirm the finding's rule, commit, path, and fingerprint without republishing the value.
2. Run \`git log --all -G'INTERNAL_API_TOKEN=' --format='%H %ad %an' --date=iso -p -- .\` in an authorized clone.
3. Check which refs contain the offending commit with \`git branch --all --contains <commit>\` and \`git tag --contains <commit>\`.
4. Ask the credential owner to revoke or rotate it immediately. Do not wait for repository cleanup.
5. Search build logs, artifacts, image layers, package registries, and deployment systems that processed the tainted commit.
6. Decide whether disclosure reduction warrants coordinated history rewriting.

| Observation | Likely explanation | Next test |
| --- | --- | --- |
| Filesystem scan passes, history scan fails | secret was deleted in a later commit | inspect the reported commit tree |
| Local scan passes, provider alert remains | local refs do not cover PR refs, forks, or cached views | inspect provider alert location and ref |
| Rewritten clone passes, colleague push reintroduces finding | old clone merged tainted ancestry | freeze pushes and coordinate fresh clones |
| Token was rotated, scanner still fails | detection and authority are separate concerns | verify revocation, then decide cleanup policy |
| Text scan passes, artifact scan fails | value exists in binary, archive, or generated output | inspect artifact provenance safely |

The most urgent question is not "How do we make CI green?" It is "Can the exposed value still authorize anything?" Revocation answers that. A rewrite cannot.

## Rewrite only after containment and coordination

GitHub's official guidance says to revoke or rotate a secret first, then assess whether rewriting is warranted. The current removal guide is at https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository. Git command behavior is documented at https://git-scm.com/docs.

History rewriting changes commit IDs and can invalidate signatures, disrupt open pull requests, conflict with branch protection, and invite recontamination from old clones. Run it in a fresh mirror or purpose-built cleanup clone, record affected refs, stop normal pushes, and communicate exact recovery instructions. Do not improvise a force push from a developer's everyday checkout.

If the exposure is an entire path and coordinated removal is approved, the documented \`git-filter-repo\` workflow can remove that path from history. This example is intentionally shown as a plan fragment with a placeholder. Resolve the exact historical paths first, including previous names.

\`\`\`bash
git-filter-repo --sensitive-data-removal --invert-paths --path config/local.env
\`\`\`

For a credential embedded among legitimate lines, a reviewed replacement-expression file may be more appropriate than deleting the whole path. Follow the installed tool's manual and the hosting provider's current instructions. Never place the real secret in a shell command that will enter history, process listings, terminal logs, or ticket attachments.

## Prove remediation with independent acceptance checks

The person who performs a rewrite should not be the only person validating it. Use a fresh clone of the rewritten remote, fetch the agreed refs, and rerun both the original detector and a targeted fingerprint search. Confirm the old credential is revoked through the credential provider, not by trying dangerous production actions.

| Acceptance check | Required evidence | Failure meaning |
| --- | --- | --- |
| Old credential authority | provider shows revoked, disabled, or expired | containment incomplete |
| Replacement health | dependent services authenticate with new secret | rotation rollout incomplete |
| Historical detector | no finding across agreed reachable refs | rewrite or ref coverage incomplete |
| Hosting residue | provider reviews cached views and PR refs as needed | remote disclosure may remain |
| Clone hygiene | collaborators reclone or follow cleanup instructions | recontamination remains likely |
| Prevention | push protection and CI canary tests fail correctly | recurrence control unproven |

Add a negative regression without preserving the leaked value. Store only the detector ID and a SHA-256 fingerprint if policy permits. Better still, add a new harmless canary with the same structural class and assert the pipeline blocks it. A test containing the real revoked secret creates another copy of the sensitive data and defeats the cleanup objective.

Include ref inventory in the signed-off evidence. Record the heads, tags, remote-tracking refs, clone depth, scanner rule revision, and scan timestamp. If a release tag is created after the cleanup validation, scan again because the reachable set changed. If archived build bundles contain a source checkout, handle those bundles under the retention policy rather than assuming the Git rewrite touched them. Finally, ask the credential owner to confirm replacement monitoring shows only expected clients. Unexpected use of the replacement may reveal that rotation instructions were copied into an unsafe system or that an undeclared consumer still depends on the credential.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a team wants an agent to apply a reviewed workflow consistently. Keep incident authority with humans: an agent may collect evidence and prepare commands, but credential revocation, history rewriting, and force pushes require explicit ownership and coordination.

## Frequently Asked Questions

### Does deleting a secret in a later commit remove it from Git history?

No. The later commit changes the current tree, but an earlier reachable commit still points to the blob containing the secret. Anyone with suitable repository access can inspect that commit. Test the difference explicitly: scan the checkout, then scan every intended ref or run a targeted \`git log -G\` investigation. If the value was real, revoke or rotate it immediately. A revert is also insufficient because it adds another commit while retaining the original content in history.

### Should we rotate the credential or rewrite the repository first?

Rotate or revoke first. That action removes the exposed value's authority and reduces immediate risk. Rewriting history is a separate disclosure-reduction decision with operational costs: commit hashes change, signatures can be lost, pull requests can be disrupted, and old clones can reintroduce the tainted objects. After containment, assess the sensitivity of the material, the affected refs and forks, provider caches, and coordination capacity. In some cases revocation is sufficient; in others a carefully planned rewrite is justified.

### Can a passing secret scanner prove that the repository never contained credentials?

No scanner proves an unlimited negative. A result applies to its pattern set, object types, refs, clone depth, decoding behavior, and execution time. It may miss an unknown internal format, an encoded value, an archive, an unreachable object, a fork, or a provider-only pull request ref. Report those boundaries with the result. Confidence comes from layered controls: provider patterns, custom tested rules, full-history coverage, artifact checks, canaries, credential inventory, and periodic review of false negatives.

### How should an AI coding agent participate in a secret-history incident?

Give the agent a least-privilege, read-only investigation role first. It can enumerate refs, run approved detectors, correlate commit IDs and paths, redact output, and draft a remediation checklist. Do not expose raw credentials in prompts, logs, or generated tests. Humans should own credential revocation, notifications, cleanup scope, branch-protection changes, and force pushes. Require the agent to state scan boundaries and request confirmation before destructive commands. Finish with an independent fresh-clone scan and provider-side proof that the credential no longer authorizes access.
`,
};
