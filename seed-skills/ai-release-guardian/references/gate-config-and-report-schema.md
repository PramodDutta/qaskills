# Reference: release-gates.yaml fields and the JSON report schema

Companion to the AI Release Guardian skill: the full gate vocabulary and the
machine-readable report contract CI can consume.

## release-gates.yaml full field reference

```yaml
gates:
  tests:
    required_suites: [unit, integration, e2e-smoke]
    flake_policy: quarantine-lane   # quarantine-lane | zero-tolerance | rerun-once
    max_new_skips: 0                # skips ADDED by this diff
  coverage:
    changed_line_blockers: 0        # Blocker-class gaps allowed (keep 0)
    changed_line_min_pct: 80        # optional; % of changed lines executed
  static:
    lint_errors: 0
    type_errors: 0
    new_security_findings: 0        # delta vs base branch, from the repo's scanner
  data:
    migration_rollback_documented: true
    destructive_migration_requires_waiver: true   # DROP/ALTER-narrowing
  process:
    risk_map_reviewed: true         # a named human read Stage 2
    max_diff_lines: 2000            # above this, recommend splitting
```

Field semantics:

| Field | Gate fails when |
|---|---|
| required_suites | Any listed suite missing, red, or not run at judged HEAD |
| flake_policy: quarantine-lane | A non-quarantined test failed (quarantined failures report, not block) |
| max_new_skips | Diff adds .skip/.only/xit/xdescribe beyond the limit |
| changed_line_blockers | Untested changed lines classified Blocker exceed the limit |
| new_security_findings | Scanner reports findings on HEAD absent on base |
| migration_rollback_documented | Diff has a migration but no down path or deploy note |
| risk_map_reviewed | No human acknowledgment recorded in the PR |
| max_diff_lines | Source diff exceeds the honest-analysis budget |

## JSON report schema

```json
{
  "verdict": "GO | GO_WITH_WAIVERS | NO_GO",
  "head_sha": "abc1234",
  "base_ref": "origin/main",
  "risk_map": [
    { "change": "orders.status enum + migration 0043",
      "behavior_at_risk": "order display, status webhooks",
      "blast_radius": "all order reads",
      "surface": "data-shape",
      "risk": "high" }
  ],
  "selected_tests": {
    "strategy": "per-test-coverage | import-graph | convention",
    "selected": 14,
    "total": 412,
    "run_id": "8841",
    "result": "passed"
  },
  "coverage": {
    "changed_lines": 74,
    "executed": 61,
    "gaps": [
      { "file": "orders/service.ts", "lines": "118-131",
        "class": "blocker", "surface": "money",
        "reason": "new refund branch executed by zero tests" }
    ]
  },
  "gate_results": [
    { "gate": "tests.required_suites", "status": "pass", "evidence": "run #8841" },
    { "gate": "coverage.changed_line_blockers", "status": "fail", "evidence": "1 blocker gap" },
    { "gate": "data.migration_rollback_documented", "status": "fail", "evidence": "0043 has no down path" }
  ],
  "blockers": [
    "refund branch orders/service.ts:118-131 untested (money surface)",
    "migration 0043 lacks rollback; rolling deploy reads unknown enum"
  ],
  "waivers": [
    { "item": "uncovered debug log orders/service.ts:140", "owner": null, "accepted": false }
  ],
  "to_reach_go": [
    "Add a test driving the refund branch through the public API",
    "Add the down migration or a deploy note proving old-code tolerance"
  ]
}
```

Contract rules:
- `verdict` is derivable from `gate_results` + `waivers`; CI should recompute and reject a report where they disagree
- Every `gate_results.evidence` and every `blockers[]` entry names a concrete artifact (run id, file:lines, migration id)
- `GO_WITH_WAIVERS` requires every waiver to carry a non-null `owner` and `accepted: true`
- A report produced from stale artifacts (run not at `head_sha`) is invalid by definition
