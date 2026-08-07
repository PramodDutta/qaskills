import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Eval Golden Dataset Versioning That Keeps Scores Comparable',
  description: 'Build LLM eval golden dataset versioning that preserves lineage, prevents leakage, explains score shifts, and supports reproducible AI release decisions.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# LLM Eval Golden Dataset Versioning That Keeps Scores Comparable

LLM eval golden dataset versioning is the practice of treating evaluation cases, reference answers, grading rules, and dataset membership as a governed test artifact. Each evaluation run must point to an immutable dataset revision, while proposed corrections create a new revision with reviewable provenance. That is how a team can tell whether a score changed because the model improved, the prompt changed, the judge changed, or the test itself moved.

The practical design is a small data contract plus disciplined release workflow. Give every case a stable identity, version mutable expectations, record sources and adjudication, separate hidden holdouts from development examples, and store a manifest hash with every result. When the dataset changes, run both old and new revisions against the same system so the score bridge is visible rather than silently rewriting history.

## A golden dataset is an executable claim, not a folder of examples

A case usually contains an input, an expected behavior, and enough grading information to decide whether an output is acceptable. For deterministic extraction, the gold might be an exact JSON object. For summarization, it may be a rubric and required facts. For retrieval-augmented generation, it can include relevant source identifiers, supported claims, and an abstention expectation. Calling all of these a “question and answer CSV” throws away the information needed for diagnosis.

The dataset also makes a claim about the traffic it represents. A hundred nearly identical password-reset questions can produce a stable score while missing billing, authorization, multilingual input, and adversarial instructions. Versioning must therefore cover both case content and the composition manifest.

| Artifact | What it fixes in history | Why it matters |
|---|---|---|
| Case ID | Identity across edits | Links regressions and adjudication to one scenario |
| Case revision | Exact input, expectations, and rubric | Distinguishes correction from model behavior |
| Dataset manifest | Membership and weighting | Makes aggregate scores reproducible |
| Evaluator configuration | Judge prompt, deterministic checks, thresholds | Separates grading drift from model drift |
| System snapshot | Model identifier, prompt, tools, retrieval corpus | Identifies what was actually tested |
| Run record | Outputs, per-case results, latency, cost inputs | Supports audits and paired comparisons |

An immutable historical run should never resolve “latest” case content. It should resolve the exact manifest and revisions used at execution time. You can still expose friendly aliases such as candidate or production, but persist their resolved digest in the result.

## Give cases stable IDs and revisions with different jobs

A stable ID names the scenario. A revision says which form of that scenario was evaluated. Editing punctuation in a prompt, correcting a reference fact, or changing the acceptance rubric creates a new case revision under the same ID when the underlying user need is unchanged. Split into a new ID when the intent changes enough that paired comparison would be misleading.

Use opaque IDs rather than a slug derived from the current wording. Slugs change, and sequential row numbers collide when files merge. A readable prefix plus a random or content-independent suffix works well.

\`\`\`ts
export type GoldenCase = {
  schemaVersion: 1;
  caseId: string;
  revision: number;
  status: 'active' | 'retired';
  task: 'qa' | 'extract' | 'classify' | 'agent';
  input: {
    messages: Array<{ role: 'user' | 'system'; content: string }>;
    contextRefs?: string[];
  };
  expectation: {
    kind: 'exact-json' | 'rubric' | 'supported-answer' | 'tool-trace';
    requiredFacts?: string[];
    forbiddenClaims?: string[];
    exactJson?: unknown;
    rubricId?: string;
  };
  metadata: {
    language: string;
    risk: 'low' | 'medium' | 'high';
    sourceType: 'production' | 'synthetic' | 'expert';
    sourceRef?: string;
    tags: string[];
  };
  provenance: {
    createdAt: string;
    createdBy: string;
    reason: string;
    parentRevision?: number;
  };
};
\`\`\`

Keep sensitive production text out of ordinary repositories unless it has been approved and transformed according to your data policy. A \`sourceRef\` can point to a controlled research record instead of embedding personal data. Redaction itself can alter task difficulty, so record that transformation in provenance.

Revision numbers are local to a case. Dataset release numbers or content hashes describe the manifest. Do not overload one semantic version to mean schema compatibility, case edits, and membership changes at once.

## Store a manifest that freezes membership and weight

A manifest lists exact case revisions, split assignment, and optional weights. The case files can live as JSONL, JSON, YAML, or database records. JSONL is convenient for diffs only when each logical record remains readable; large nested contexts may be better stored separately by content hash.

\`\`\`json
{
  "datasetId": "support-assistant-core",
  "release": "2026-08-07.1",
  "schemaVersion": 1,
  "cases": [
    { "caseId": "sup_7f31", "revision": 3, "split": "validation", "weight": 1 },
    { "caseId": "sup_a912", "revision": 1, "split": "holdout", "weight": 2 },
    { "caseId": "sup_c044", "revision": 4, "split": "challenge", "weight": 1 }
  ],
  "notes": "Adds authorization boundary cases reviewed by support and security."
}
\`\`\`

Weights require restraint. A weight can reflect business risk or traffic frequency, but it can also make an aggregate opaque. Always publish unweighted counts and slice results beside the headline score. A single high-risk case should often be a release gate of its own rather than hidden inside a weighted average.

| Change | Case revision | Manifest release | Score bridge required |
|---|---:|---:|---:|
| Fix typo with no semantic effect | Usually yes for exact reproducibility | Yes if referenced | Recommended |
| Correct a wrong expected fact | Yes | Yes | Required |
| Add a new edge case | New ID | Yes | Required |
| Move a case from validation to holdout | No | Yes | Required |
| Change case weight | No | Yes | Required |
| Add optional metadata tag | Depends on schema policy | If manifest digest changes | Usually |
| Retire obsolete product behavior | Case status revision | Yes | Required |

The bridge means evaluating the same system snapshot on both manifests. Report unchanged-case score, added or removed cases, revised-case score, and aggregate delta. That decomposition prevents a corrected bad gold from being celebrated as a model gain.

## Canonicalize and hash the release, but keep the source reviewable

A content hash is useful only if serialization is deterministic. Define canonicalization: UTF-8, stable object-key ordering, preserved array order, and a clear rule for newlines. Hash the canonical case documents and manifest, not an incidental ZIP timestamp.

\`\`\`ts
import { createHash } from 'node:crypto';

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return \`[\${value.map(canonicalize).join(',')}]\`;
  }
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return \`{\${keys.map((key) =>
    \`\${JSON.stringify(key)}:\${canonicalize(object[key])}\`
  ).join(',')}}\`;
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}
\`\`\`

This compact canonicalizer is suitable for a constrained JSON data shape, not a claim of compatibility with every canonical JSON standard. Test it with nested maps, arrays, Unicode, numbers, booleans, and null. Reject unsupported values such as \`undefined\`, functions, or non-finite numbers before hashing.

Store both a readable release label and the digest. Humans discuss \`2026-08-07.1\`; machines prove exactly which bytes were loaded with a SHA-256 value. If files are fetched from object storage, verify their digest before execution and fail closed on a mismatch.

## Validate data quality before spending model tokens

Dataset validation should be a fast local and CI step. It catches duplicate IDs, missing referenced revisions, invalid tags, empty rubrics, accidental holdout exposure, and malformed exact outputs before an expensive eval begins.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { loadCases, loadManifest } from './dataset-loader';

describe('golden dataset release', () => {
  it('resolves every manifest entry exactly once', async () => {
    const manifest = await loadManifest('datasets/support/2026-08-07.1.json');
    const cases = await loadCases('datasets/support/cases');
    const keys = cases.map((item) => \`\${item.caseId}@\${item.revision}\`);

    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of manifest.cases) {
      expect(keys).toContain(\`\${entry.caseId}@\${entry.revision}\`);
      expect(entry.weight).toBeGreaterThan(0);
    }
  });

  it('keeps holdout cases out of development exports', async () => {
    const manifest = await loadManifest('datasets/support/2026-08-07.1.json');
    const development = manifest.cases.filter((item) => item.split === 'validation');
    expect(development.every((item) => item.split !== 'holdout')).toBe(true);
  });
});
\`\`\`

The second assertion is illustrative but too tautological by itself. In a real system, validate the exported development artifact against the source manifest and access policy. The development tool should not even receive hidden case text. Merely labeling rows “holdout” inside a file available to prompt authors does not prevent leakage.

Add semantic linting that machines can perform reliably:

| Validator | Example rejection | Owner for resolution |
|---|---|---|
| Identity uniqueness | Two active records have \`caseId@revision\` \`sup_7f31@3\` | Dataset maintainer |
| Reference integrity | Manifest names a missing context document | Data pipeline owner |
| Expectation completeness | Rubric case has no rubric ID | Eval engineer |
| Privacy scan | Unapproved email or account number pattern | Data governance reviewer |
| Label vocabulary | Unknown risk value \`urgent\` | Schema owner |
| Split policy | Same semantic cluster crosses development and hidden holdout | Eval lead |
| Freshness rule | Product-policy case references retired documentation | Domain expert |

Automated privacy scans are supporting controls, not proof that data is safe. Human review and the organization's data handling process still apply.

## Track gold corrections through adjudication

Golden does not mean infallible. Models expose ambiguous prompts and wrong references surprisingly often. When a case fails, reviewers must be able to challenge the gold without editing it during the run.

Create an adjudication record with the case revision, system output, evaluator result, reviewer decision, evidence, and proposed action. At least two qualified reviewers are useful for high-risk or subjective changes. Record disagreement rather than averaging it away.

\`\`\`yaml
adjudicationId: adj_20260807_014
caseId: sup_7f31
caseRevision: 3
runId: run_91c2
decision: gold-incorrect
reason: "Reference answer cites a policy retired on 2026-07-15."
evidenceRefs:
  - policy-record-882
proposedAction:
  type: revise-case
  nextRevision: 4
reviewers:
  - role: support-domain-owner
    outcome: approve
  - role: eval-maintainer
    outcome: approve
\`\`\`

Do not mutate the failing run after adjudication. Its result remains an honest evaluation against revision 3. Create revision 4, publish a new manifest, and use the bridge run to show how the correction changes scores. Dashboards can offer a separate “adjudicated interpretation,” but raw history stays intact.

Distinguish these outcomes:

- \`system-incorrect\`: the output violates a valid expectation.
- \`gold-incorrect\`: the expected answer or rubric is wrong.
- \`ambiguous-input\`: multiple incompatible answers are reasonable.
- \`evaluator-incorrect\`: deterministic or judge logic misgraded the case.
- \`product-change\`: the prior expectation was valid but is now obsolete.
- \`insufficient-evidence\`: reviewers cannot decide yet.

These categories route fixes to different owners. Without them, “update the dataset” can hide a regression by moving the target.

## Keep evaluator versions beside dataset versions

An LLM judge prompt is code. So are normalization rules, JSON schema validation, retrieval metrics, and pass thresholds. Version them separately from the cases and bind them in the run configuration.

\`\`\`json
{
  "runId": "run_91c2",
  "dataset": {
    "id": "support-assistant-core",
    "release": "2026-08-07.1",
    "sha256": "recorded-manifest-digest"
  },
  "system": {
    "promptRevision": "support-prompt-18",
    "retrievalCorpus": "kb-2026-08-06",
    "toolPolicy": "tools-7"
  },
  "evaluators": [
    { "id": "required-facts", "revision": 4 },
    { "id": "support-rubric-judge", "revision": 6 }
  ],
  "execution": {
    "startedAt": "2026-08-07T07:30:00Z",
    "attemptsPerCase": 3
  }
}
\`\`\`

For model-backed judges, also capture the provider model identifier returned or configured according to the provider's documented interface, judge prompt revision, sampling settings you intentionally set, and raw judge output. Hosted model behavior can change even when a friendly alias remains similar, so periodic anchor checks are important.

Maintain a judge calibration set with clear human labels. It is separate from the product eval and measures grader agreement. If judge revision 6 changes borderline decisions, evaluate revision 5 and 6 on the same stored candidate outputs. This isolates grading change from generation change.

The broader [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) is useful when a case includes planning, tools, or multi-step state. For an agent, version expected invariants and allowed tool behavior rather than demanding one exact natural-language trace.

## Prevent train-on-test leakage in agent-assisted development

AI coding agents make leakage easier. A developer may paste failed hidden cases into a prompt, ask the agent to tune the system, and later commit the resulting special-case rule. The benchmark improves without generalization.

Use access and workflow controls:

1. Keep validation examples available for iteration, but store holdout text in a restricted service or repository.
2. Return slice-level and error-category feedback for holdouts, not full prompts and gold answers.
3. Cluster near-duplicates before splitting so paraphrases of one incident do not land in both sets.
4. Rotate a portion of the holdout using newly adjudicated production cases.
5. Scan prompts, fixtures, and retrieval documents for exact or near-exact overlap with protected cases.
6. Record who accessed unblinded data and why.

Leakage is not limited to model training. Retrieval corpora may contain the reference answer, evaluator prompts may reveal required phrases, or a tool mock may return the gold directly. In MCP-based systems, a fixture can accidentally expose hidden expectations through a tool response. The [MCP servers test automation guide](/blog/mcp-servers-test-automation-2026) provides the surrounding protocol context; the dataset rule is to version tool fixtures and keep protected expectations outside the agent-visible response.

## Compare releases with paired, case-level evidence

Aggregate score alone is a weak change detector. Run the candidate and baseline on the same case revisions, then compare per-case outcomes. For nondeterministic systems, repeat each case enough to estimate variability, retain each attempt, and avoid treating retries as opportunities to select the best output.

\`\`\`python
from dataclasses import dataclass
from collections import defaultdict

@dataclass
class Result:
    case_id: str
    revision: int
    system: str
    passed: bool

def paired_summary(results: list[Result]) -> dict[str, int]:
    grouped: dict[tuple[str, int], dict[str, list[bool]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for row in results:
        grouped[(row.case_id, row.revision)][row.system].append(row.passed)

    summary = {"improved": 0, "regressed": 0, "unchanged": 0, "incomplete": 0}
    for systems in grouped.values():
        if "baseline" not in systems or "candidate" not in systems:
            summary["incomplete"] += 1
            continue
        old_rate = sum(systems["baseline"]) / len(systems["baseline"])
        new_rate = sum(systems["candidate"]) / len(systems["candidate"])
        if new_rate > old_rate:
            summary["improved"] += 1
        elif new_rate < old_rate:
            summary["regressed"] += 1
        else:
            summary["unchanged"] += 1
    return summary
\`\`\`

This summary is descriptive, not a statistical significance test. Choose analysis based on metric type, pairing, sample size, and repeated measures. For release decisions, show confidence intervals or uncertainty estimates appropriate to the data, plus high-risk case gates. A tiny overall gain should not outweigh a new authorization hallucination.

When the dataset manifest changes, report four populations separately: unchanged cases, revised cases, additions, and removals. That score bridge is the central payoff of dataset versioning.

## Diagnose a score jump before celebrating it

Suppose accuracy rises from 72 percent to 81 percent after a dataset refresh. Begin with lineage, not prompt quality. Resolve both manifest hashes and compare membership. Check whether difficult cases were retired, weights changed, references were corrected, or the judge revision moved.

Then rerun the same stored system outputs through both evaluator revisions where possible. If labels change without generation changing, the evaluator caused the movement. Run the baseline system on the new dataset and the candidate on the old dataset. This two-by-two bridge separates system and data effects:

| Run | Old dataset | New dataset |
|---|---:|---:|
| Baseline system | Historical anchor | Dataset effect on baseline |
| Candidate system | System effect on old benchmark | Combined current result |

A second realistic failure is one case producing different results on identical reruns. Inspect model sampling, tool fixtures, retrieval index revision, judge variability, network failures, and retry policy. Do not silently replace failed attempts. An infrastructure error is not a failed answer, but excluding it requires an explicit status and policy.

Store raw outputs before post-processing. If a parser update changes extracted JSON, you need the original text to determine whether the model or parser failed.

## What teams get wrong about dataset version numbers

The most damaging misconception is that Git history alone provides sufficient versioning. A commit identifies repository state, but a run may load external context, a database sample, a mutable object-store file, or a judge prompt from another service. The run must record resolved identities for all of them.

Another mistake is updating expected answers in place because they were “obviously wrong.” That destroys the evidence needed to explain historical scores. A correction deserves a new revision even when everyone agrees.

Teams also overfit to exact wording. Exact match is excellent for canonical IDs and structured outputs, but brittle for open-ended explanations. Conversely, using an LLM judge for a field that can be validated with JSON Schema adds cost and uncertainty. Use deterministic evaluation wherever the requirement is deterministic, then reserve rubric judges for semantic dimensions.

Finally, more cases do not automatically produce a better benchmark. Redundant cases inflate confidence and hide missing slices. Measure cluster diversity, source coverage, risk coverage, and reviewer agreement, not just row count.

## Operate dataset releases like code releases

Use pull requests or an equivalent review mechanism for case changes. Render a human-readable diff showing input, expectation, metadata, split, source, and reason. Automated checks validate structure; domain reviewers validate truth; eval maintainers validate gradeability.

| Release checkpoint | Required evidence | Failure action |
|---|---|---|
| Proposal | New or revised cases plus provenance | Return incomplete records |
| Automated validation | Schema, identity, references, privacy and split checks | Block merge |
| Domain review | Expected behavior matches current policy | Correct or reject gold |
| Eval review | Rubric is observable and discriminating | Rewrite expectation |
| Bridge run | Old and new manifests on fixed system snapshot | Explain unexplained delta |
| Publication | Immutable manifest, digest, release notes | Do not move release alias |
| Monitoring | Slice stability and adjudication queue | Schedule corrective release |

Release notes should name added slices, retired behavior, revised golds, known ambiguities, and score impact on the fixed baseline. They should not expose hidden case text.

The result is not bureaucracy for its own sake. It is a debugging system. When a model update regresses, engineers can retrieve the exact cases and graders, reproduce the outcome, see whether the benchmark evolved, and make a release decision with evidence.

## Frequently Asked Questions

### Should every edit create a new golden case revision?

Yes when the edit changes bytes used by an evaluation run, because exact reproducibility requires the old form to remain addressable. A spelling correction may have no semantic impact, but it can still affect tokenization or an exact-match grader. The release process can classify it as non-semantic and use a lightweight review, yet preserve a revision. Metadata that is provably outside execution can follow a documented exception, although the manifest digest may still change. Consistent immutability is usually simpler than debating whether a small edit could matter.

### How large should an LLM golden dataset be?

There is no universal row count. Start with coverage of important tasks, risk boundaries, languages, input shapes, tool paths, abstention cases, and known failure clusters. Add cases when they represent a distinct behavior or production incident, not just another paraphrase. Use uncertainty estimates and slice stability to decide where more examples would improve confidence. A smaller, carefully adjudicated and diverse set can guide releases better than thousands of noisy synthetic rows. Keep a separate stream of fresh cases to detect overfitting and product drift.

### Can production conversations become golden cases automatically?

They can become candidates, but automatic promotion is unsafe. Production data needs authorization, minimization, redaction, source tracking, and expert review. The expected behavior must be established independently, and ambiguous or policy-sensitive cases require adjudication. Near-duplicate clustering should prevent a high-volume incident from dominating the benchmark. Store a controlled reference to the source where possible, record transformations, and keep personal data out of general developer access. Only publish a case revision after it passes the same schema, privacy, truth, and gradeability gates as a manually authored example.

### What belongs in an LLM evaluation run record?

Record the immutable dataset release and digest, exact case revisions, system prompt revision, configured model identity, retrieval corpus or index revision, tool and fixture versions, evaluator revisions, execution time, intentional sampling settings, attempt count, raw outputs, parsed outputs, per-metric results, errors, latency, and available cost inputs. Include the code commit and environment identity when they influence execution. The record should let another engineer explain the result without relying on a moving “latest” alias, while respecting policies for sensitive prompts, outputs, and provider data.
`,
};
