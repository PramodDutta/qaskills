import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cosmic Ray Python Mutation Testing Guide',
  description:
    'Run Cosmic Ray Python mutation testing with realistic config, pytest workflow, survivor triage, and CI strategy for stronger Python test suites.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Cosmic Ray Python Mutation Testing Guide

The coverage report says 96 percent, but changing \`<=\` to \`<\` in a pricing rule does not break a single test. Cosmic Ray exists for that uncomfortable moment. It mutates Python source code, runs your test command against each mutant, and shows where the suite observed behavior weakly enough that changed code survived.

Mutation testing is slower than coverage and more demanding than linting. That is why it should be introduced with a narrow target, a stable test command, and a triage habit. Cosmic Ray gives you sessions, resumable execution, local or distributed workers, and reports. It does not decide which survivors matter to your product. That judgment remains with the team.

This guide is about using Cosmic Ray in a Python project with pytest, not about selling mutation testing as a silver bullet. For the metric relationship, read [code coverage types line branch mutation explained](/blog/code-coverage-types-line-branch-mutation-explained). For choosing Python test frameworks before mutation testing, see [Python unittest vs pytest](/blog/python-unittest-vs-pytest).

## Start With a Function Where a Mutant Should Obviously Die

Do not begin by mutating the whole repository. Start with a small module that has business rules and fast tests. Pricing, eligibility, parsing, and validation logic are good first targets. UI glue, migrations, generated clients, and logging wrappers are poor first targets.

\`\`\`python
# src/pricing/discounts.py
from dataclasses import dataclass


@dataclass(frozen=True)
class Customer:
    plan: str
    months_active: int
    has_overdue_invoice: bool


def renewal_discount_percent(customer: Customer) -> int:
    if customer.has_overdue_invoice:
        return 0

    if customer.plan == \"enterprise\" and customer.months_active >= 12:
        return 15

    if customer.months_active >= 24:
        return 10

    return 0
\`\`\`

\`\`\`python
# tests/test_discounts.py
from pricing.discounts import Customer, renewal_discount_percent


def test_enterprise_customer_after_first_year_gets_15_percent():
    customer = Customer(
        plan=\"enterprise\",
        months_active=12,
        has_overdue_invoice=False,
    )

    assert renewal_discount_percent(customer) == 15


def test_overdue_invoice_blocks_discount_even_for_enterprise():
    customer = Customer(
        plan=\"enterprise\",
        months_active=36,
        has_overdue_invoice=True,
    )

    assert renewal_discount_percent(customer) == 0


def test_long_running_non_enterprise_customer_gets_10_percent():
    customer = Customer(
        plan=\"team\",
        months_active=24,
        has_overdue_invoice=False,
    )

    assert renewal_discount_percent(customer) == 10
\`\`\`

A line coverage tool will mark the branches as covered. Cosmic Ray asks a different question: if the comparison changes from \`>= 12\` to \`> 12\`, does the suite catch the boundary? In this example, it should, because the test uses exactly 12 months.

## Configure Cosmic Ray Deliberately

Cosmic Ray uses a TOML configuration to describe the module path, timeout, excluded modules, test command, and distributor. The official tutorial can create a starter file with \`cosmic-ray new-config\`, but real projects usually edit it by hand.

\`\`\`toml
# cosmic-ray.toml
[cosmic-ray]
module-path = \"src/pricing\"
timeout = 10.0
excluded-modules = []
test-command = \"python -m pytest tests/test_discounts.py -x\"

[cosmic-ray.distributor]
name = \"local\"
\`\`\`

The \`-x\` in the pytest command is intentional. A mutant is killed as soon as one test fails. Continuing the whole test suite after the first failure wastes time. The timeout is also part of correctness. Some mutations create infinite loops or extremely slow behavior; Cosmic Ray marks those cases as incompetent rather than letting the session hang forever.

| Config field | Practical meaning | SDET guidance |
|---|---|---|
| \`module-path\` | Python module or package to mutate | Start narrow, expand only after triage is useful |
| \`test-command\` | Command Cosmic Ray runs for each mutant | Make it deterministic and fast before mutation testing |
| \`timeout\` | Maximum time for a mutant test run | Set above normal test time, below painful CI time |
| \`excluded-modules\` | Files or modules not mutated | Exclude generated code, test code, and low-value wrappers |
| \`distributor.name\` | Execution backend | Use local first, consider distributed only after workflow works |

Keep tests outside the module under mutation where possible. Cosmic Ray mutates code under the configured module path, and mutating test code is not the goal.

## Run Baseline, Init, Exec, Report

Cosmic Ray's flow has more steps than a simple pytest run because it stores mutation work in a session database. That is a feature, not ceremony. Long mutation sessions can be resumed, inspected, and reported.

\`\`\`bash
python -m pytest tests/test_discounts.py -x
cosmic-ray --verbosity=INFO baseline cosmic-ray.toml
cosmic-ray init cosmic-ray.toml pricing.sqlite
cosmic-ray exec cosmic-ray.toml pricing.sqlite
cr-report pricing.sqlite
\`\`\`

Run pytest directly first because it gives faster feedback when the test command is broken. Then run \`baseline\` so Cosmic Ray verifies the unmutated code passes under the same command it will use for mutants. A failing baseline invalidates mutation results because every mutant would be tested against an already broken suite.

The \`init\` command creates the session. The \`exec\` command runs mutation jobs. The report shows killed mutants, surviving mutants, incompetent mutants, and timeouts. Treat the first run as diagnostic. You are learning whether the target is scoped properly and whether the test command is stable.

## Reading Survivors Without Gaming the Score

A surviving mutant is not automatically a bug. It is evidence that the tests did not distinguish original code from mutated code. Sometimes the mutation is equivalent, meaning the changed code behaves the same for all practical inputs. Sometimes it exposes a missing boundary test. Sometimes it points to dead code.

| Survivor type | Example | Response |
|---|---|---|
| Boundary weakness | \`>= 12\` becomes \`> 12\` and tests still pass | Add a boundary test at 12 and 11 |
| Removed guard | \`if overdue\` condition changes and tests pass | Add scenario for blocked discount |
| Equivalent mutant | Reordered expression with same behavior | Document and move on |
| Dead branch | Mutated branch is unreachable | Remove code or add test through real path |
| Fixture blind spot | Mutant changes one customer tier nobody tests | Add representative fixture for that tier |
| Assertion weakness | Test calls function but asserts only type | Assert actual outcome |

The wrong response is to chase 100 percent mutation score as a vanity metric. A better response is to ask why each survivor lived and whether killing it would improve confidence in product behavior.

## Improve Tests by Targeting Boundaries

Mutation testing often reveals that tests cover examples but not edges. For the discount function, add boundaries around the month thresholds and negative cases around overdue invoices.

\`\`\`python
# tests/test_discount_boundaries.py
import pytest

from pricing.discounts import Customer, renewal_discount_percent


@pytest.mark.parametrize(
    (\"months_active\", \"expected\"),
    [
        (11, 0),
        (12, 15),
        (23, 15),
        (24, 15),
    ],
)
def test_enterprise_thresholds(months_active, expected):
    customer = Customer(
        plan=\"enterprise\",
        months_active=months_active,
        has_overdue_invoice=False,
    )

    assert renewal_discount_percent(customer) == expected


@pytest.mark.parametrize(
    (\"months_active\", \"expected\"),
    [
        (23, 0),
        (24, 10),
    ],
)
def test_team_plan_thresholds(months_active, expected):
    customer = Customer(
        plan=\"team\",
        months_active=months_active,
        has_overdue_invoice=False,
    )

    assert renewal_discount_percent(customer) == expected
\`\`\`

This is not adding tests for Cosmic Ray. It is using Cosmic Ray to find where product rules need explicit examples. Good mutation testing leads to smaller, sharper tests, not a pile of redundant assertions.

## Scoping Strategies for Real Repositories

Mutation testing every Python file on every pull request is rarely practical. Use scope as an engineering control.

| Scope | When to use | Cost profile | Decision rule |
|---|---|---|---|
| One function module | First adoption or bug-prone logic | Low | Run locally during test design |
| One package | Domain area with stable tests | Medium | Run in scheduled CI or before risky release |
| Changed modules | Pull request mutation gate | Variable | Use when module mapping is reliable |
| Critical algorithms | Payment, eligibility, policy, parsing | Medium but valuable | Prioritize over generic service glue |
| Whole repository | Small libraries with fast tests | High for most apps | Use only when runtime is acceptable |

The strongest pattern is targeted mutation testing for critical code plus scheduled broader runs. That gives developers fast feedback where it matters and keeps the full signal visible without blocking every commit.

## CI Without Turning Mutation Testing Into a Bottleneck

CI mutation testing needs a different posture from unit tests. Unit tests should block every change quickly. Mutation testing is often better as a scheduled job, a manual workflow for risky changes, or a required gate only for a small package.

Set the test command to the smallest test set that exercises the mutated module. If the package has clean test ownership, point Cosmic Ray at those tests. If tests are scattered across integration suites, mutation runs will be slow and noisy. That is useful feedback about test architecture.

Store reports as artifacts so reviewers can inspect survivors. Failing a build on any survivor can work for a mature library, but it is harsh for an application introducing mutation testing. A more realistic first gate is: baseline must pass, mutation run must complete, and new survivors in selected modules require review.

## What Cosmic Ray Does Not Tell You

Cosmic Ray does not prove correctness. It samples code changes through mutation operators. If tests kill mutants, that means the suite observed those changed behaviors. It does not mean the suite covers every requirement or every data combination.

It also does not replace property-based testing. Hypothesis can generate diverse inputs for a function. Cosmic Ray changes the code and checks whether tests notice. The two complement each other well: property-based tests often kill mutants that example-based tests miss.

Finally, mutation testing does not rescue slow or flaky tests. A flaky test command makes mutation results unreliable because a mutant can appear killed by chance. Stabilize the target test command before trusting survivors.

## Combining Cosmic Ray With Hypothesis

Cosmic Ray is especially valuable when paired with property-based tests. Example tests cover named business cases. Hypothesis explores a larger input space. Mutants that survive three examples often die when the property describes the invariant directly.

\`\`\`python
# tests/test_discount_properties.py
from hypothesis import given, strategies as st

from pricing.discounts import Customer, renewal_discount_percent


@given(
    plan=st.sampled_from([\"free\", \"team\", \"enterprise\"]),
    months_active=st.integers(min_value=0, max_value=120),
)
def test_overdue_customers_never_receive_discount(plan, months_active):
    customer = Customer(
        plan=plan,
        months_active=months_active,
        has_overdue_invoice=True,
    )

    assert renewal_discount_percent(customer) == 0


@given(months_active=st.integers(min_value=24, max_value=120))
def test_team_plan_discount_never_exceeds_10_percent(months_active):
    customer = Customer(
        plan=\"team\",
        months_active=months_active,
        has_overdue_invoice=False,
    )

    assert renewal_discount_percent(customer) <= 10
\`\`\`

This does not mean every function needs Hypothesis. Use it where invariants are easy to state and examples are likely to miss combinations. Then run Cosmic Ray against that module and watch whether arithmetic, comparison, and Boolean mutants survive. If they do, the property is probably too weak or the function has behavior that needs a named example.

## Triage Notes Should Live Beside the Run

Mutation testing creates review work. Treat survivor triage as an artifact. A simple markdown file or issue comment can record which survivors were killed by new tests, which were equivalent, and which were deferred with a reason. Without that record, the same survivors get rediscovered every run.

| Triage label | Meaning | Next action |
|---|---|---|
| Killed by new test | Survivor exposed a real test gap | Keep the test and reference the mutant |
| Equivalent | Mutation does not change observable behavior | Document and avoid churn |
| Dead code | Mutated path is unreachable | Remove code or create a real integration path |
| Low value | Wrapper or defensive branch not worth current cost | Exclude only with review |
| Needs product answer | Expected behavior is unclear | Ask product or domain owner before adding assertion |

This practice keeps mutation testing from becoming a score-chasing exercise. The value is not the percentage printed by \`cr-report\`; the value is the decision trail that shows how the suite improved or why a survivor is acceptable.

## When to Exclude Modules

Exclusions are sometimes necessary. Generated files, compatibility shims, framework glue, and modules that perform only logging may produce noisy mutants. But exclusions should be specific and reviewed. If half the package is excluded, the configured target is probably wrong.

A good exclusion comment explains why the module is low value for mutation testing, not why it is inconvenient. "Generated from OpenAPI, covered by schema contract tests" is a defensible reason. "Too many survivors" is not. Survivors are the point.

## Choosing the First Mutation Targets

The best first target is code where a small semantic change would matter and the test command is already fast. Domain packages usually beat web controllers. Pure functions usually beat orchestration code. A package with clear fixtures beats one that needs a database, network service, and message broker for every assertion.

| Candidate module | First-run value | Reason |
|---|---|---|
| Pricing rules | High | Comparisons and branches create meaningful mutants |
| Eligibility checks | High | Boundary examples are easy to add |
| Parsers and normalizers | High | Mutants reveal weak input coverage |
| API route glue | Medium | Often needs integration setup |
| Logging wrappers | Low | Surviving mutants rarely change product behavior |
| Generated clients | Low | Better covered by contract generation and schema tests |

A successful pilot should produce a few actionable survivors, not a giant report nobody triages. Once the team sees how one survivor becomes one better test, expanding the target becomes easier to justify.

## Performance Tuning Without Losing Signal

Cosmic Ray cost comes from multiplying mutants by test runtime. The cleanest optimization is not parallelism, it is a smaller and more relevant test command. If a pricing module can be tested by \`tests/pricing\`, do not run the entire API suite for each mutant. Use pytest markers only when they are reliable and reviewed.

After narrowing the command, consider distributor options and CI scheduling. Distributed execution can help, but it also adds setup and artifact complexity. Do not add workers before the local workflow is trusted. A slow but interpretable pilot is better than a fast report the team does not understand.

Measure runtime per target and publish it with the report so future scope changes are visible.

## Frequently Asked Questions

### Should Cosmic Ray run on every pull request?

Only for narrow, fast targets. Most application teams start with scheduled runs or manual workflows for critical packages. Running the entire repository on every pull request often creates more delay than signal.

### What does a surviving mutant mean?

It means the tests passed even after Cosmic Ray changed the code. The survivor may reveal a missing assertion, an untested boundary, dead code, or an equivalent mutation. Triage is required before treating it as a defect.

### Why should I run cosmic-ray baseline first?

Baseline confirms the configured test command passes on unmutated code. Without that, mutation results are not trustworthy because failures may come from an already broken test command rather than from killed mutants.

### How should I set the timeout?

Set it above the normal runtime of the target test command but low enough to stop pathological mutants. If the normal command takes one second, a ten second timeout may be reasonable. If tests vary wildly, fix that before relying on mutation results.

### Is mutation score better than line coverage?

It answers a different question. Line coverage asks whether code executed. Mutation testing asks whether tests noticed meaningful code changes. Mutation score is harder to game, but it still needs interpretation and should not become the only quality target.
`,
};
