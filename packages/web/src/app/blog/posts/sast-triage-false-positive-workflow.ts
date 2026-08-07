import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SAST Triage False Positive Workflow That Scales Without Hiding Risk',
  description: 'Use a SAST triage false positive workflow to validate data flow, document dismissals, reduce alert noise, and keep security findings actionable over time.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# SAST Triage False Positive Workflow That Scales Without Hiding Risk

A reliable SAST triage false positive workflow does three things: it proves whether attacker-controlled data can reach a security-sensitive operation, records enough evidence for another reviewer to reproduce the decision, and makes every dismissal expire or reopen when its assumptions change. The goal is not to drive the dashboard to zero. The goal is to keep true risk visible while removing demonstrably incorrect findings from the active queue.

For QA and test-automation engineers, the fastest defensible sequence is: stabilize the scan and fingerprint, classify the rule and path, reconstruct source-to-sink flow, test the disputed sanitizer or guard, choose the correct disposition, obtain risk-based review, and preserve a regression test. If any link in that chain is unknown, the result is not yet a false positive.

This matters even more when AI coding agents help with remediation. An agent can summarize a path and draft a test, but it can also accept a nearby sanitizer without proving that the actual sink receives sanitized data. Deterministic code references, executable tests, scanner history, and human accountability must remain the decision record.

## Define what “false positive” means before closing alerts

Teams often use false positive as a catch-all for inconvenient findings. That destroys trend data and prevents auditors from distinguishing analyzer error from accepted business risk. Establish a small disposition vocabulary and train reviewers to use it consistently.

| Disposition | Meaning | Required evidence | Typical next action |
|---|---|---|---|
| True positive | The reported weakness is reachable or the unsafe condition exists | Reproduced flow, unsafe configuration, or confirmed exploit precondition | Fix, mitigate, or formally accept risk |
| False positive | The analyzer's claim is factually wrong for the scanned revision | Broken path, proven sanitizer, impossible source, or incorrect language semantics | Dismiss with evidence and improve modeling |
| Accepted risk | The weakness exists, but an authorized owner accepts residual risk | Impact, likelihood, compensating controls, owner, expiry | Track exception and review before expiry |
| Not applicable | The rule does not apply to this component or threat model | Scope and architecture proof | Adjust rule scope or scan configuration |
| Duplicate | Another finding represents the same root cause and remediation | Canonical issue or shared data-flow root | Link to canonical finding |
| Fixed | Code or configuration changed so the weakness no longer exists | Patch plus regression evidence and rescan | Close after scan confirms |

A sanitizer that the analyzer does not understand can create a genuine false positive if the sanitizer is effective for the exact context. A SQL-escaping function does not make data safe for an HTML sink. Authentication does not automatically neutralize command injection. Network placement does not turn a vulnerable call into a false positive; it may reduce likelihood and support a risk-acceptance argument.

Write these distinctions into the triage form. If the interface exposes only a few dismissal reasons, put the richer classification in the comment and link it to the ticketing system. GitHub's code-scanning interface, for example, supports dismissal reasons and comments, while the alert history keeps that context for review. Current behavior is documented at https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/resolve-alerts.

## Stabilize scanner input before judging individual results

Triage is unreliable when scans analyze different code, build modes, generated sources, or rule packs. Before opening the first alert, capture the commit SHA, scanner and query configuration, build command, language version, dependency lockfile, and scan category. A result that disappears because the build silently skipped a module is not fixed.

Use a pre-triage gate:

| Gate | Passing evidence | Failure symptom |
|---|---|---|
| Revision | SARIF and CI metadata identify the expected commit | Findings point to lines absent from the pull request |
| Build coverage | All security-relevant modules compile or are extracted | Sudden alert drop after a build warning |
| Rule consistency | Query suite or ruleset change is recorded | Severity and count shift without code changes |
| Source maps or paths | Stable repository-relative locations | Duplicate alerts from temporary paths |
| Generated code policy | Inclusion or exclusion is explicit | Reviewers repeatedly dismiss generated files manually |
| Baseline | Existing and new findings are separable | Legacy backlog blocks every pull request |

SARIF 2.1.0 is the exchange format used by many SAST tools. Do not depend on line number alone as an alert identity; lines move. Prefer the tool's stable fingerprint or result identity, rule ID, and normalized repository path. Preserve the raw SARIF artifact for difficult investigations.

\`\`\`json
{
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "Example SAST",
          "rules": [{ "id": "js/sql-injection" }]
        }
      },
      "results": [
        {
          "ruleId": "js/sql-injection",
          "message": { "text": "User-controlled data reaches a query." },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": { "uri": "src/search.ts" },
                "region": { "startLine": 42 }
              }
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

This is a minimal illustrative fragment, not a complete schema or a claim about a particular scanner. The official SARIF specification and your platform's supported subset decide which properties are accepted. A triage pipeline should tolerate optional fields without manufacturing identities from incomplete data.

## Read the rule before reading the highlighted line

The highlighted sink is only one point in the analyzer's model. Open the rule documentation and record its weakness category, sources, sinks, sanitizers, barriers, path sensitivity, and known limitations. A reviewer cannot assess a path without knowing what the tool claims.

For a data-flow alert, answer these questions in order:

1. What value is classified as untrusted, and who can control it?
2. Which transformations and assignments carry that value?
3. What operation is classified as sensitive?
4. What exact security property must hold at that sink?
5. Does a barrier break the path on every feasible route?
6. Are runtime, framework, or deployment assumptions part of the conclusion?

For a local pattern alert, such as use of a weak API or hardcoded value, the path may be short, but context still matters. Verify that the code is executed and that the literal has the meaning the rule assigns. Test fixtures and example files may be out of production scope, but excluding them should follow a documented policy rather than ad hoc dismissal.

What people get wrong is starting with severity. Severity helps order work, but it does not validate the finding. A critical-looking sink with an impossible source may be false. A medium alert on a public unauthenticated route may deserve immediate attention. Triage establishes truth first, then combines technical impact and exploitability with business context.

## Reconstruct source-to-sink flow with a compact evidence packet

Create an evidence packet that another engineer can review in minutes. Include alert ID, rule ID, revision, source location, sink location, path steps, disputed barrier, call context, deployment assumptions, and test evidence. Link to code at the scanned revision so future changes do not rewrite history.

A simple TypeScript shape makes required fields explicit in an internal triage tool:

\`\`\`ts
type TriageDisposition =
  | 'true_positive'
  | 'false_positive'
  | 'accepted_risk'
  | 'not_applicable'
  | 'duplicate'
  | 'fixed';

type EvidenceReference = {
  kind: 'code' | 'test' | 'trace' | 'architecture' | 'scanner';
  uri: string;
  revision?: string;
  note: string;
};

type SastTriageRecord = {
  alertFingerprint: string;
  ruleId: string;
  scannedRevision: string;
  disposition: TriageDisposition;
  sourceClaim: string;
  sinkClaim: string;
  barrierClaim?: string;
  evidence: EvidenceReference[];
  reviewer: string;
  decidedAt: string;
  expiresAt?: string;
};
\`\`\`

Do not paste sensitive proof-of-concept data, secrets, or customer payloads into the record. Use synthetic identifiers and protected artifacts. Security triage often becomes long-lived audit data, so apply access, retention, and privacy controls.

For path reconstruction, follow actual values through aliases, object properties, callbacks, framework binding, serialization, and asynchronous queues. Confirm whether validation runs before or after the last mutation. A guard on \`request.query.name\` does not protect \`job.payload.name\` if a later step replaces it.

## Prove sanitizers in the exact sink context

The most common disputed finding is "the value is sanitized." Turn that claim into a contract. Name the accepted input domain, output guarantee, failure behavior, canonicalization order, and target context. Then test it directly.

Consider a query builder that restricts sort keys to known column identifiers. Parameterized query values cannot generally substitute for SQL identifiers, so an explicit mapping is appropriate. The security claim is not that arbitrary text was escaped; it is that untrusted text can select only one of a fixed set of constant fragments.

\`\`\`ts
const SORT_COLUMNS = {
  newest: 'created_at DESC',
  price_low: 'price_cents ASC',
  price_high: 'price_cents DESC',
} as const;

type SortKey = keyof typeof SORT_COLUMNS;

export function toSortClause(raw: string): string {
  if (!Object.hasOwn(SORT_COLUMNS, raw)) {
    throw new Error('unsupported_sort');
  }
  return SORT_COLUMNS[raw as SortKey];
}
\`\`\`

The corresponding test should cover every allowed key plus adversarial categories, not just one quote character.

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { toSortClause } from './sort-policy.js';

test('maps each documented sort key to a constant clause', () => {
  assert.equal(toSortClause('newest'), 'created_at DESC');
  assert.equal(toSortClause('price_low'), 'price_cents ASC');
  assert.equal(toSortClause('price_high'), 'price_cents DESC');
});

test('rejects input outside the identifier allowlist', () => {
  const rejected = [
    'created_at',
    'newest ',
    'NEWEST',
    'price_low, name',
    'missing',
    '',
  ];

  for (const value of rejected) {
    assert.throws(() => toSortClause(value), /unsupported_sort/);
  }
});
\`\`\`

If the scanner still reports a path from \`raw\` into the final query, the test and mapping support a false-positive decision for this revision. Better still, model the sanitizer for the scanner if its extension mechanism is documented, so every use receives consistent analysis. Do not add a broad suppression before proving that the mapping is the only route.

Context is decisive. HTML encoding protects HTML text when correctly applied, but not necessarily JavaScript, CSS, URL, or attribute contexts. Path normalization does not guarantee a path remains under an allowed root unless containment is checked after canonicalization. A regex that validates a JWT's shape does not verify its signature or claims. The [JWT key rotation and JWKS cache testing guide](/blog/testing-jwt-key-rotation-jwks-cache) shows how a security-looking check can be incomplete when key lifecycle and cache behavior are ignored.

## Use executable counterexamples for path feasibility

Sometimes the dispute is not a sanitizer but reachability. A branch may require mutually exclusive states, a route may be test-only, or a type refinement may make the sink value constant. Static analyzers trade precision for useful coverage, so infeasible paths occur.

Write the smallest test that demonstrates the invariant. If a framework route can never pass external input to the sink, call the handler through its real binding or a high-fidelity integration boundary. A unit test that manually supplies an impossible state proves little.

Property-based generation can strengthen evidence when a guard accepts a defined grammar. Keep the oracle simple and independent from the implementation. For example, if tenant IDs are mapped to server-owned database schemas, assert that every accepted external value resolves through the registry and no external string is concatenated into the identifier.

\`\`\`ts
type TenantRegistry = ReadonlyMap<string, { schema: string }>;

export function resolveTenantSchema(
  externalTenantId: string,
  registry: TenantRegistry,
): string {
  const tenant = registry.get(externalTenantId);
  if (!tenant) {
    throw new Error('unknown_tenant');
  }
  return tenant.schema;
}

// The registry is created from trusted deployment configuration.
const registry = new Map([
  ['tenant-a', { schema: 'customer_1042' }],
  ['tenant-b', { schema: 'customer_2048' }],
]);
\`\`\`

The triage record must state that the registry itself is trusted deployment configuration. If a later feature lets administrators edit schema names without validation, the assumption changes and the dismissal needs re-evaluation.

## Choose suppression scope only after the decision is approved

Suppressions are implementation details of a reviewed disposition. Prefer the narrowest mechanism supported by the tool: a single result or line with justification, then a path-level exclusion for truly out-of-scope generated or vendor content, and only rarely a repository-wide rule disablement.

| Suppression scope | Appropriate use | Main risk | Required review |
|---|---|---|---|
| Result-level dismissal | One proven false path | May become stale after code change | Code owner or security reviewer |
| Source annotation | Stable local pattern the scanner supports | Comment can outlive its reason | Security review plus nearby test |
| Path exclusion | Generated, vendored, or non-deployable content by policy | Real code can migrate into excluded path | Repository security owner |
| Rule configuration | Rule consistently mismatches framework semantics | Removes signal across many files | Security program owner and metrics review |
| Ruleset disablement | Rule is invalid for the entire threat model | Broad blind spot | Formal documented approval |

Never use an inline ignore as the evidence itself. The comment should include a durable reference and concise invariant. Avoid dumping a whole threat analysis into source code.

\`\`\`ts
export function getPublicReport(reportId: string): Promise<Report> {
  // Security review SEC-1842: reportId is resolved through the access-controlled
  // repository API. The regression test covers cross-tenant identifiers.
  return reportRepository.findAuthorized(reportId, currentPrincipal());
}
\`\`\`

The snippet intentionally does not invent a scanner-specific suppression directive. Each tool has documented syntax and different semantics. Add the actual directive only from the tool's official documentation, and test that the intended result is suppressed while neighboring real findings remain visible.

GitHub CodeQL SARIF can represent in-source suppressions in the result's \`suppressions\` property. Platform dismissals and source annotations are not interchangeable. Decide where ownership belongs and ensure your reporting pipeline preserves the chosen state.

## Add expiry and change detection to every fragile assumption

False-positive decisions are revision-specific even when they appear permanent. A sanitizer implementation, framework binding, route exposure, library version, or deployment boundary can change. Tie the decision to code ownership and review triggers.

Use expiry for assumptions outside the local code, such as a network boundary or identity-provider guarantee. Use change detection for local sanitizer functions and configuration. When protected files change, automatically reopen or queue related dismissals for review.

An internal manifest can map assumptions to paths without depending on a scanner's proprietary configuration:

\`\`\`yaml
dismissals:
  - fingerprint: alert-fingerprint-7d3f
    ticket: SEC-1842
    disposition: false_positive
    assumption: report repository enforces tenant ownership
    watch_paths:
      - src/reports/report-repository.ts
      - src/auth/current-principal.ts
      - test/security/report-authorization.test.ts
    owner: application-security
    review_by: 2026-11-07
\`\`\`

This is an example team manifest, not a GitHub, GitLab, or CodeQL configuration format. Its value is the workflow: a small script can compare changed paths, notify owners, and block silent carry-forward of stale reasoning.

A realistic failure mode illustrates the need. A custom \`safeRedirect\` helper allowed only same-origin paths, so reviewers dismissed an open-redirect alert and modeled the helper as a sanitizer. Six months later, a product change added support for absolute partner URLs. Tests covered the new partner case but not credentials, scheme-relative URLs, or host boundaries. The old scanner model still treated every helper output as safe, so a real path disappeared from results.

Diagnosis begins by comparing the sanitizer contract at dismissal time with the current implementation. The fix is not merely reopening one alert. Update the helper tests, narrow or remove the scanner model, rescan all call sites, and add the helper file to dismissal change detection. A false-positive workflow has failed if it cannot detect that its proof became false.

## Route findings by expertise and service ownership

Central security teams should not become a queue for basic code context, and feature teams should not unilaterally accept security risk. Define roles for intake, technical validation, risk decision, remediation, and audit.

| Role | Primary responsibility | Cannot decide alone |
|---|---|---|
| Scan owner | Healthy execution, deduplication, scanner metadata | Business risk acceptance |
| Service engineer | Runtime path and component behavior | Final exception approval |
| QA or SDET | Reproduction, sanitizer tests, regression coverage | Organization-wide rule disablement |
| Application security | Weakness validation, rule modeling, disposition review | Product priority without owner input |
| Risk owner | Time-bound residual-risk acceptance | Technical truth of analyzer path |

Set service-level targets by exposure and severity, but include an escape path for scanner outages and duplicate storms. Queue age is a health signal, not a substitute for risk. A team can meet a closure target by mislabeling results, so audit a sample of dismissals and measure reopen rates.

AI-assisted summaries can reduce reading time. Require the agent to output source, sink, barrier, unknowns, and cited code locations in a fixed schema. Reject any conclusion that does not identify the scanned revision. The [AI-augmented software testing guide](/blog/ai-augmented-software-testing-2026-guide) provides a wider framework for pairing agent speed with deterministic checks and human review.

## Measure signal quality without rewarding mass dismissal

Track metrics that reveal both scanner quality and triage quality. Raw alert count is affected by codebase size, rules, and scan coverage. A declining count can mean improvement, reduced coverage, or aggressive suppression.

Useful measures include time to first triage, time to remediation by exposure, disposition distribution by rule, false-positive concentration, dismissal reopen rate, findings introduced versus prevented, scan coverage, and percentage of dismissals with current evidence. Segment by rule and service so one noisy query does not obscure useful signal.

An analytics query might aggregate the decision table while keeping accepted risk separate:

\`\`\`sql
SELECT
  rule_id,
  disposition,
  COUNT(*) AS decisions,
  AVG(hours_to_first_triage) AS avg_triage_hours,
  SUM(CASE WHEN reopened_at IS NOT NULL THEN 1 ELSE 0 END) AS reopened
FROM sast_triage_decisions
WHERE decided_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY rule_id, disposition
ORDER BY decisions DESC;
\`\`\`

Review rules with high false-positive volume for modeling improvements. If a custom sanitizer is consistently proven, add a precise model and seed a test containing both sanitized and unsanitized flows. If a rule is useful in one service and noisy in another, scope configuration rather than disabling it globally.

Audit false-positive samples for evidence quality. Can a reviewer still locate the code? Does the test exercise the actual boundary? Is the assumption current? Did the scanner continue analyzing the file? These checks prevent the workflow from degrading into a comment-writing exercise.

Pair every rate with a denominator and coverage signal. "Ten false positives" means something different across fifty results and fifty thousand. Likewise, a zero reopen rate may mean excellent decisions, or it may mean the workflow never reevaluates dismissals. Publish definitions beside dashboards, annotate query-suite changes, and retain enough history to compare equivalent periods.

## Put triage and remediation into the pull-request loop

Use a baseline so existing debt does not make every change unactionable, then block or escalate genuinely new high-confidence findings according to policy. The pull request should show the rule, data-flow summary, changed lines, owner, and available secure pattern. Store complete artifacts outside the abbreviated annotation.

A GitHub Actions workflow can run CodeQL using GitHub's documented action components. The language matrix and build mode must match the repository. The following skeleton uses JavaScript and TypeScript as one documented language family and avoids custom CLI flags.

\`\`\`yaml
name: code-scanning

on:
  pull_request:
  push:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      packages: read
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
\`\`\`

Confirm supported action versions and configuration against current GitHub documentation when implementing the workflow. Repositories using default versus advanced setup have different management paths, and duplicate upload configurations can confuse results.

When a finding is true, the same triage packet accelerates remediation because it already identifies the source, sink, and missing barrier. When it is false, preserve the executable proof and improve the model. Either result should make the next scan more useful.

## Frequently Asked Questions

### Who should approve a SAST false-positive dismissal?

Approval should match the finding's risk and the team's governance model. A service engineer supplies runtime context, while a QA engineer can provide reproduction and regression evidence. For high-impact weaknesses, custom sanitizer claims, or broad suppressions, an application-security reviewer should validate the conclusion. Accepted risk also needs an authorized business or technical risk owner because it is not a false positive. Record the individual, decision date, scanned revision, evidence, and review trigger so approval remains attributable rather than becoming an anonymous dashboard action.

### Does a passing unit test prove that a SAST result is false?

Not by itself. The test must exercise the disputed invariant at the relevant boundary and cover the analyzer's claimed path. A manually constructed state may be impossible through the real framework, while a happy-path sanitizer test may omit alternate encodings or contexts. Pair the test with code-level source-to-sink analysis, the rule's model, and the scanned revision. An integration test is preferable when routing, serialization, dependency injection, or authorization creates the barrier. The executable evidence strengthens a false-positive conclusion, but it does not replace technical review.

### When should a noisy SAST rule be disabled repository-wide?

Only after rule-level analysis shows that it is systematically invalid for the repository's language, framework, or threat model, and narrower modeling or scoping cannot preserve useful findings. Review a representative sample, quantify true and false results, document the lost detection coverage, and obtain security-program approval. Add a review date because framework use and rule quality change. A high false-positive rate alone is not enough if the remaining true positives are important. Prefer precise sanitizer models, path exclusions for genuinely non-deployable content, or service-specific configuration first.

### How do we keep old dismissals from masking new vulnerabilities?

Tie dismissals to stable result identities, scanned revisions, evidence, owners, and the files or assumptions that justify them. Reopen review when a sanitizer, route binding, dependency, network boundary, or security test changes. Give external assumptions an expiry date and audit a sample of active dismissals regularly. Preserve unsuppressed control cases so scanner configuration is tested too. If a tool remaps an old dismissal onto materially different code, treat that as a workflow defect and require fresh analysis rather than inheriting the earlier conclusion automatically.
`,
};
