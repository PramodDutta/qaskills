import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bind Release Evidence Head SHA Guide',
  description:
    'Apply the bind release evidence head sha policy across GitHub Actions, test reports, coverage files, and artifacts so reviewers judge one exact commit.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'bind release evidence head sha',
  keywords: [
    'bind release evidence head sha',
    'GitHub Actions commit SHA',
    'release evidence provenance',
    'stale CI artifact detection',
    'release readiness report',
    'required status checks',
    'artifact attestation proof',
    'AI release guardian',
  ],
  contentKind: 'child',
  pillarSlug: 'ai-release-readiness-scorecard-2026',
  relatedSlugs: [
    'max-diff-lines-release-analysis-gate',
    'ai-release-guardian-human-control-boundary',
    'schema-authority-ddl-orm-openapi-types-test-data',
    'constraint-field-map-before-test-data-generation',
  ],
  sources: [
    'https://docs.github.com/en/actions/reference/workflows-and-actions/contexts',
    'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks',
    'https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts',
  ],
  content: `The policy label **bind release evidence head sha** means putting one immutable commit SHA in each test, coverage, scan, risk, and gate result. A reviewer should reject a release packet when any artifact lacks that SHA or names another commit. This policy stops an old green run from serving as evidence for code that changed later.

Start with the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian), then add its evidence policy to the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026). The [QASkills directory](/skills) has more test guides, while the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) links code risk to test depth. SHA validation must come before test choice or a final verdict.

## Why Must Release Evidence Provenance Use One Commit?

A release report covers one code tree, not a branch name, pull request number, workflow name, or artifact label. Each mutable label can point to new code after a push, sync, rerun, or base update. A full commit SHA identifies the exact Git object that the guardian inspected.

The repository skill rejects evidence from an old commit. Its JSON report includes \`head_sha\`, and its gate policy runs suites at the head under review. This design stops a report from mixing the current diff with old coverage or an old security scan.

Consider a pull request with commits A, B, and C. Unit tests pass at B, then C changes an auth branch without starting the expected run. A board that shows only "unit: passed" may prompt a false GO, while a row that names B shows the mismatch at once.

| Evidence label | Stable enough for a verdict? | Failure mode | Required binding |
| --- | --- | --- | --- |
| Branch name | No | A later push moves the branch | Full judged commit SHA |
| Pull request number | No | Many commits share one number | Pull request plus judged SHA |
| Workflow run ID | Not alone | A run can test a merge commit or old head | Run ID plus tested SHA |
| Artifact filename | No | Names can be reused across runs | SHA inside content and metadata |
| Full Git commit SHA | Yes | Immutable object identity | Compare at every handoff |

One SHA does not answer each GitHub event question. A pull request run may test a synthetic merge commit, while a gate report may judge the pull request head. The policy must name the judged object, the tested object, and whether that relationship is allowed.

The [GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts) says that \`github.sha\` depends on the event. Copying that value without the event can still leave doubt. A clear report stores the event, head SHA, tested SHA, base ref, run ID, and attempt together.

## Which GitHub Actions Commit SHA Should You Record?

For a \`push\` run, \`github.sha\` will normally name the pushed commit tied to that run. For an open pull request, the default checkout may be the merge ref instead of the source branch tip. Release rules must tell these cases apart rather than call both values HEAD.

Use a small identity table before you write the workflow. It makes reviewers choose whether the gate validates source changes, the planned merge result, or both. The right choice comes from the repository's merge model and branch policy, not the agent.

| Workflow event | Candidate identity | What it represents | Recommended report field |
| --- | --- | --- | --- |
| \`push\` | \`github.sha\` | Commit associated with the push run | \`head_sha\` and \`tested_sha\` match |
| \`pull_request\` | \`github.event.pull_request.head.sha\` | Latest source branch commit | \`head_sha\` |
| \`pull_request\` | \`github.sha\` | Event-dependent merge ref commit | \`tested_sha\` when merge-result testing is intended |
| \`workflow_dispatch\` | Explicit input resolved to SHA | Operator-selected revision | Store input and resolved SHA |
| Reusable workflow | Caller-provided immutable value | Identity chosen by caller | Validate against checkout before testing |

GitHub's [workflow event docs](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts) link context values to the event payload. Do not infer the source head from a handy env var when the payload gives it. Use the full SHA as well, since tools may cut short forms in different ways.

An honest policy may need two successful lanes. One lane validates the source head for changed-line mapping, while a second tests the merge result on the current base. Keep both identities in the report instead of letting the last lane overwrite one field.

The [test impact analysis CI guide](/blog/test-impact-analysis-ci-guide-2026) helps after this choice because selected tests must use the same diff ends. If the selector reads base to head but the runner checks out another tree, that test set no longer proves the stated change.

## How Do You Build a Release Readiness Report?

Capture and validate identity in the first executable step. Each later job should read one small, immutable manifest from that step instead of recalculating branch state independently. This makes a checkout mismatch clear before slow test suites run.

Follow this procedure for a pull request gate:

1. Read the source head SHA from the pull request event and save it as the judged identity.
2. Check out the intended revision explicitly, then compare \`git rev-parse HEAD\` with the planned tested identity.
3. Write an evidence manifest containing event, repository, base ref, head SHA, tested SHA, run ID, and attempt.
4. Pass that manifest to every test and analysis job through job outputs or an immutable artifact.
5. Fail aggregation if any result omits the manifest values or reports a conflicting SHA.

The next workflow keeps the source head and checked-out commit clear. Its template marks are escaped because this article sits inside a TypeScript template string.


\`\`\`yaml
name: release-evidence
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  identity:
    runs-on: ubuntu-latest
    outputs:
      head_sha: \${{ steps.identity.outputs.head_sha }}
      tested_sha: \${{ steps.identity.outputs.tested_sha }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - id: identity
        shell: bash
        env:
          EXPECTED_HEAD: \${{ github.event.pull_request.head.sha }}
        run: |
          tested_sha="$(git rev-parse HEAD)"
          test "$tested_sha" = "$EXPECTED_HEAD"
          echo "head_sha=$EXPECTED_HEAD" >> "$GITHUB_OUTPUT"
          echo "tested_sha=$tested_sha" >> "$GITHUB_OUTPUT"
\`\`\`

This example tests the source head on purpose. A repository that needs merge-result tests should check out the merge ref and store the pull request head as a separate field. The key is an explicit choice with a machine-validated relationship, not one checkout plan for all repositories.

Do not place untrusted event text in shell commands. The values above come from SHA fields, while titles and branch names stay as data, not shell text. This keeps the source trail apart from labels that a code author can control.

## How Do You Carry the SHA Through Each Artifact?

Once the identity is set, each producer should copy it into its result. A name such as \`coverage-COMMIT.json\` helps people, but the artifact itself must also hold the commit. A renamed artifact must not change what that evidence claims to prove.

The repository report schema gives all producers one shared shape. It stores \`head_sha\`, test run identities, coverage gaps with paths, gate evidence, blockers, waivers, and steps needed for GO. Add a small envelope when a test tool does not write commit metadata itself.


\`\`\`json
{
  "schema_version": "release-evidence/v1",
  "head_sha": "4bd51b0c45b7f9d2355f4cbf6bc5f9c7f8184f64",
  "tested_sha": "4bd51b0c45b7f9d2355f4cbf6bc5f9c7f8184f64",
  "workflow": {
    "run_id": "98124417",
    "run_attempt": 1,
    "event": "pull_request"
  },
  "producer": "unit-tests",
  "result": "passed",
  "artifact": "junit.xml"
}
\`\`\`

Use the same envelope for unit, integration, browser, coverage, lint, type, and security results. The full result can stay in its native format, while the envelope gives aggregation one known identity policy. A producer without that envelope counts as missing evidence and fails closed.

The [GitHub Actions pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers job links and file flow. Use those steps, but never let a later job fetch "the latest" file from some other run. Select the current run, then check the SHA stored inside each file.

For a **bind release evidence head sha** policy on each run, make the SHA a required report field instead of a log habit. Logs help with debugging, but a gate cannot reliably validate unstructured text. Named fields let CI prove that the final verdict matches the gate rows.

## How Does Stale CI Artifact Detection Work?

Aggregation turns many artifacts into one release claim. It must validate schema, identity, required producers, and gate policy before it sets a verdict. It must not trust the first green artifact with a friendly name.

This TypeScript sample validates the core identity policy. Production code should also validate the complete report shape with the repository's chosen schema library.


\`\`\`ts
type EvidenceEnvelope = {
  producer: string;
  head_sha: string;
  tested_sha: string;
  result: 'passed' | 'failed';
  artifact: string;
};

export function requireEvidenceForHead(
  judgedHead: string,
  requiredProducers: string[],
  evidence: EvidenceEnvelope[],
) {
  const byProducer = new Map(evidence.map((item) => [item.producer, item]));

  for (const producer of requiredProducers) {
    const item = byProducer.get(producer);
    if (!item) throw new Error('Missing release evidence from ' + producer);
    if (item.head_sha !== judgedHead) {
      throw new Error(producer + ' evidence belongs to ' + item.head_sha);
    }
    if (item.tested_sha !== judgedHead) {
      throw new Error(producer + ' tested a different commit');
    }
    if (item.result !== 'passed') {
      throw new Error(producer + ' did not pass');
    }
  }
}
\`\`\`

Some repos test a merge commit on purpose, so their link check will differ. They may require \`head_sha\` to match the pull request and \`tested_sha\` to match GitHub's current merge ref. Test that rule with an old head, old merge, missing job, duplicate job, and failed result.

GitHub says that [required checks must pass against the latest commit SHA](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks). Treat that rule as a floor, not the whole proof model. A custom guardian must still show that coverage, risk maps, and scan results belong to the same commit.

Mixed evidence should lead to NO-GO, not "inconclusive" or a score. The skill fails missing evidence because an unknown result cannot support a positive release recommendation. A person may still choose the next step, but the guardian must state the gap in plain terms.

## What Does Artifact Attestation Proof Add?

Workflow artifacts keep reports after producers finish, but storage alone does not prove which source produced them. Include the evidence envelope, use a retention policy that fits your audit needs, and store run links beside artifact digests. A later reviewer should trace the provenance chain without guesswork.

GitHub says [workflow artifacts can store test results, coverage, logs, and build output](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts). Its documentation says attestations include a workflow link plus the repository, organization, environment, commit SHA, triggering event, and OIDC provenance. Those claims link a built file to the workflow that produced it.

An attestation does not replace test meaning. It can show that one workflow produced a file tied to a commit, but not that the right tests ran or a waiver was sound. Keep build-source checks and quality gates as separate rows in the report.

Use artifact digests when a release candidate moves through build, scan, staging, and deployment tools. The commit identifies the source, while the digest identifies the exact built subject. A rebuild of the same commit may get a new digest if tools, dependencies, or timestamps changed, so save both.

| Question | Identity to record | Why both levels matter |
| --- | --- | --- |
| Which source was judged? | Full commit SHA | Connects risk map and changed lines |
| Which workflow ran? | Run ID and attempt | Locates execution logs and reruns |
| Which file was tested? | Artifact digest | Distinguishes rebuilt subjects |
| Which policy applied? | Gate config revision or digest | Explains threshold decisions |
| Who accepted a waiver? | Named owner and record | Preserves human accountability |

The guide to [maximum diff size release analysis](/blog/max-diff-lines-release-analysis-gate) adds another check: the guardian must be able to read the whole source diff. The SHA answers "which change," while diff size asks whether the stated review method can cover it.

## How Do Required Status Checks Handle New Pushes?

Reruns need care because the run ID and attempt can change without a new source commit. Save both values and build the final report from one clear attempt. Do not mix a rerun's unit result with old coverage unless a rule proves the inputs match and records that link.

A new push voids all prior advice to ship, even when the change looks like docs. The guardian has not yet read the new diff, and a docs file can change config or runnable samples. Start a new SHA check and report flow.

A base branch update can change a synthetic merge commit while the pull request head stays fixed. Repositories that test merge results must rerun that lane and save the new tested SHA. Source-head evidence can help with debugging, but it cannot replace a current merge-result check.

Apply these operational rules:

1. Cancel superseded runs where possible, but still reject their artifacts if they arrive late.
2. Query the current pull request head immediately before publishing the guardian report.
3. Compare every required result with the chosen head and merge identities.
4. Mark an existing report superseded when a new push or required base update occurs.
5. Require a new human review when repository policy treats the latest push as review-sensitive.

The [AI release guardian human control guide](/blog/ai-release-guardian-human-control-boundary) explains why the report remains advice. SHA binding makes that advice more sound, but it gives the agent no right to merge, tag, deploy, approve, or accept a waiver.

Schema changes need the same care. The [schema authority test data guide](/blog/schema-authority-ddl-orm-openapi-types-test-data) finds which rule drives each generated case, while the [test data constraint field map](/blog/constraint-field-map-before-test-data-generation) turns those rules into review inputs. Each result should name the schema commit that generated it.

## How Do You Check Identity at Each Tool Boundary?

A rule labeled **bind release evidence head sha** can fail even when the first checkout is right. Test runners, coverage tools, scanners, file jobs, and final gates often run in separate jobs. Each handoff needs a clear SHA and a check against local Git state.

Start at checkout. Run \`git rev-parse HEAD\` after checkout and store the full result instead of trusting the requested ref. If the run tests a synthetic merge commit on purpose, also store the pull request head and base SHA so reviewers can verify their relationship.

Next, pass the SHA to the test process through a known env var or argument. Put it in report fields, not just console text. The test job can then prove which tree it ran even when JUnit, JSON, or coverage data lacks Git fields.

Run the **bind release evidence head sha** policy check again after each download. A run ID narrows the source, but the stored SHA proves that the file belongs to that run and commit. Reject duplicate job names so an old file cannot replace a current file without notice.

| Tool boundary | Local observation | Received claim | Failure response |
| --- | --- | --- | --- |
| Checkout to test runner | \`git rev-parse HEAD\` | Judged and tested SHA | Stop before tests when they differ |
| Test runner to reporter | Process identity input | Report envelope SHA | Fail report creation when absent |
| Reporter to artifact upload | File digest and envelope | Job output SHA | Upload only the validated pair |
| Artifact download to aggregator | Downloaded digest | Embedded producer and SHA | Reject stale, duplicate, or unknown producer |
| Aggregator to reviewer | Current pull request head | Final report \`head_sha\` | Mark report superseded on mismatch |
| Reviewer to deployment | Approved artifact digest | Release record SHA and digest | Block promotion when either changed |

Scanners need the same rule. A scan may read checked-out source, a container image, or a software bill of materials. Name the target type and digest, then link that target to the judged commit through build proof instead of assuming each scan reads source.

Coverage adds another endpoint rule. Changed-line review joins a coverage result with diff hunks, so both must name matching commits. Coverage from HEAD plus hunks from a newer base can mark the wrong gaps even when the application source SHA did not move.

Apply the **bind release evidence head sha** policy before you read pass rates. Coverage from another tree is not weak proof for this release; it is proof about a different release. Keep it as history, but leave it out of the current verdict.

For shared workflows, make the judged SHA a required input and compare it with caller and checkout data. A shared job must never find "latest main" in the middle of a review. Resolve each moving ref once near the caller, then pass a fixed SHA from that point.

## How Do You Test SHA Binding Before a Release?

Teams often test only the happy path, where all jobs end for one commit. A control labeled **bind release evidence head sha** also needs stale-file drills because parallel runs, retries, and late uploads can clash. The right result is a clear NO-GO that names the wrong job.

Create test records for the current head, old head, missing SHA, bad SHA, merge commit, and duplicate job. Feed them to the final gate in different orders. The verdict must stay the same because file arrival time does not grant trust.

Exercise this procedure in a test repository or non-production workflow:

1. Start a release evidence run for commit A and pause one slow producer.
2. Push commit B, complete its required jobs, and let its aggregation begin.
3. Allow the delayed artifact from A to arrive after B's current artifacts.
4. Confirm B rejects A's artifact and reports its producer, SHA, run, and attempt.
5. Rerun the failed producer for B and confirm only coherent B evidence can replace it.

Also test base updates when merge-result checks are required. Keep the source head fixed, update the base, and prove the old merge proof is now stale. This case finds systems that compare only pull request heads and ignore the tree they ran.

Failure text should help a reviewer act without weakening the rule. State the judged SHA, received SHA, job, run link, and next fix. Avoid a vague "file invalid" message that sends someone through all jobs during a release.

| Failure | Useful report statement | Required next action |
| --- | --- | --- |
| Previous-head unit report | Unit evidence names A; current judged head is B | Run unit suite at B |
| Missing coverage identity | Coverage artifact has no \`head_sha\` | Fix producer and regenerate coverage |
| Old merge-result scan | Scan subject is not current merge commit | Rebuild and rescan current merge result |
| Duplicate security producer | Two envelopes claim one producer | Resolve workflow ownership and rerun |
| Current head changed during review | Report head no longer matches pull request | Supersede report and start current analysis |

The **bind release evidence head sha** policy must stay strict during outages. If file storage loses SHA data or the current run cannot be read, proof is missing. A named person can use a separate emergency rule, but the guardian must not infer success from an old green badge.

Keep failed drill reports long enough to review them. They show whether the gate rejected stale input for the right reason and whether staff knew the fix. A gate that fails closed but gives poor help can still prompt a manual bypass.

## How Should an AI Release Guardian Enforce SHA Binding?

Make SHA binding a required gate, not a nice report field. Add \`head_sha\`, \`tested_sha\`, run ID, gate config commit, and file digest where needed. Then fail the final check when a required field is missing, bad, stale, or in conflict.

A useful check asks whether CI read the current pull request head at verdict time. It also asks whether each suite names its tested tree, coverage uses the same diff ends, and gate rows drive the verdict. Last, it checks that waivers name an owner and no job falls back to a branch label.

To apply the **bind release evidence head sha** policy in your next review, use the [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) on one pull request. Keep its first report at NO-GO until each required file proves the judged commit. Then let the named release owner make the final choice.

## Frequently Asked Questions

### Is github.sha always the pull request HEAD SHA?

No. GitHub says context values depend on the event, and pull request runs can use a merge ref. Save \`github.event.pull_request.head.sha\` as the source head when that is your rule, then save the real checkout on its own. One variable does not mean the same thing for each event.

### Can a passing workflow from the previous commit be reused?

Not for a positive verdict on the current commit. It can help with debug history, but it does not prove the latest change. The guardian should mark the gate stale, start a current run when allowed, and wait for proof whose SHA matches the judged commit.

### Should source HEAD or the synthetic merge commit be tested?

That choice belongs in repo rules. Source-head tests support exact diff and changed-line checks, while merge-result tests catch clashes with the current base. Some teams need both. Store separate \`head_sha\` and \`tested_sha\` values, then check the allowed link rather than treat them as one object.

### Do artifact attestations prove a release is safe?

No. Attestations make source and integrity claims for a built file, such as its workflow and commit. They do not decide whether coverage is enough, the risk map is complete, or a failed gate can be waived. The guardian should show the attestation check as one proof row among several.

### How should rerun attempts appear in the report?

Store the workflow run ID and attempt beside the commit and file digest. Use one full attempt unless a rule defines checked reuse. Even when a rerun changes only timing, these fields matter because reviewers need an exact path to logs, files, and the cited result.

### What happens when evidence has no commit field?

Treat it as missing proof and issue NO-GO. A filename, upload time, branch, or nearby run is too weak for a release claim. Make the job write a clear SHA record, build the file again, and let the final gate check that SHA before it reviews the verdict.
`,
};
