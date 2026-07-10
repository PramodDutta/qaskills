import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'mutmut Python Mutation Testing Guide',
  description:
    'mutmut Python mutation testing guide: find weak assertions, inspect surviving mutants, tune thresholds, and add CI gates that developers trust.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `# mutmut Python Mutation Testing Guide

The uncomfortable part of coverage reports is that they can be completely truthful and still overstate confidence. A line executed by pytest is not the same as a behavior checked by pytest. mutmut attacks that gap by changing your Python code in small ways, running your tests, and asking a blunt question: did any test notice?

That question is valuable because Python projects often accumulate high coverage through import-heavy tests, broad smoke checks, and assertions that only verify a happy path returned something. Mutation testing turns those habits into visible survivors. If changing \`>=\` to \`>\` still leaves the suite green, the test probably never exercised the boundary. If replacing a return value does not fail anything, the assertion might be ornamental. For the broader mutation-testing landscape, compare the JavaScript side in [mutation testing with Stryker](/blog/mutation-testing-stryker-guide). If your immediate problem is line and branch measurement, pair this with [pytest coverage and pytest-cov guide](/blog/pytest-coverage-pytest-cov-guide-2026).

## What mutmut changes in Python code

mutmut is a mutation testing tool for Python. It rewrites small pieces of code, called mutants, then runs your existing test command. A killed mutant means at least one test failed after the change. A surviving mutant means the modified behavior slipped through. The output is not a replacement for coverage. It is a pressure test for assertion quality.

Mutation testing is intentionally slower than normal testing because it runs tests many times. That means the best mutmut rollout is focused. Start with a core module that has meaningful business rules, not the whole repository. Pure functions, pricing rules, validators, schedulers, permission checks, and parsing code are strong candidates. Thin framework glue and generated models usually produce noisy mutants.

| Mutation result | Meaning in practice | Typical next action |
|---|---|---|
| Killed | A test detected the changed behavior | Keep the test, maybe simplify if many tests killed the same mutant |
| Survived | Tests stayed green after code was changed | Add or sharpen an assertion, or mark as not worth testing only after review |
| Timeout | The mutant made tests hang or run too long | Inspect for infinite loops, then tune timeouts or exclude unsuitable code |
| Suspicious | mutmut could not classify cleanly | Re-run locally and inspect the generated mutant |

## Installing mutmut into a pytest project

Install mutmut in the same environment that can run your test suite. For many projects that means a development dependency in your virtual environment or tool-managed environment.

\`\`\`bash
python -m pip install mutmut pytest
mutmut run
mutmut results
\`\`\`

By default, mutmut looks for a test command it can run. Real projects should make the command explicit so CI and local runs behave the same. Configure it in \`setup.cfg\` or \`pyproject.toml\`, depending on your project style.

\`\`\`toml
[tool.mutmut]
paths_to_mutate = ["src/price_rules"]
runner = "python -m pytest tests/price_rules -q"
tests_dir = ["tests"]
also_copy = ["pyproject.toml"]
max_stack_depth = 8
\`\`\`

The exact keys supported can vary by mutmut version, so keep the config small and check it into the repository with the tool version pinned. The important decisions are stable: mutate a specific source path, run a specific pytest subset, and keep enough project files available for the test command.

## A boundary-value example that coverage misses

Consider a discount rule. The product owner says orders of 100 dollars or more receive a loyalty discount. The first test covers a qualifying order and reports coverage on the function. It does not prove the boundary.

\`\`\`python
# src/price_rules/discounts.py

from decimal import Decimal


def loyalty_discount(subtotal: Decimal) -> Decimal:
    if subtotal >= Decimal("100.00"):
        return Decimal("10.00")
    return Decimal("0.00")
\`\`\`

\`\`\`python
# tests/price_rules/test_discounts.py

from decimal import Decimal

from price_rules.discounts import loyalty_discount


def test_loyalty_discount_for_large_order():
    assert loyalty_discount(Decimal("125.00")) == Decimal("10.00")
\`\`\`

Line coverage looks fine for the true branch. A mutant that changes \`>=\` to \`>\` may survive because the test never checks exactly 100.00. The fix is not to chase mutmut with a random assertion. Add the missing boundary that expresses the rule.

\`\`\`python
from decimal import Decimal

from price_rules.discounts import loyalty_discount


def test_loyalty_discount_starts_at_one_hundred():
    assert loyalty_discount(Decimal("100.00")) == Decimal("10.00")


def test_loyalty_discount_is_not_applied_below_threshold():
    assert loyalty_discount(Decimal("99.99")) == Decimal("0.00")
\`\`\`

That is the kind of improvement mutation testing is meant to provoke. The test suite now documents the threshold from both sides.

## Inspecting surviving mutants without guessing

After a run, use mutmut's result and show commands to inspect survivors. Do not infer from the summary alone. The changed line matters because some survivors are equivalent mutants, meaning the mutation does not actually change observable behavior for the domain.

\`\`\`bash
mutmut results
mutmut show 3
\`\`\`

A survivor in a permission check deserves different treatment from a survivor in a defensive branch that can never be reached. Review each survivor as a small code review. Ask what behavior changed, whether that behavior should be observable, and which test would fail if a human made the same mistake.

| Survivor location | Useful interpretation | Poor reaction |
|---|---|---|
| Boundary comparison | Boundary case missing | Add one test at the threshold |
| Boolean condition | Branch expectation too broad | Assert the denied and allowed paths separately |
| Constant value | Expected output not checked precisely | Replace truthy checks with exact assertions |
| Logging-only line | Mutation may be irrelevant | Consider excluding logging wrappers |
| Defensive unreachable branch | Possible equivalent mutant | Document why no test is added |

## Tuning mutmut scope for useful signal

The fastest way to make developers hate mutation testing is to run it across everything and demand a perfect score. That produces slow feedback and arguments over mutants in code that nobody should test at that level. Scope is a quality decision.

Start with modules where a bug would be expensive and behavior is deterministic. Pricing, tax, eligibility, data masking, retry classification, and date calculations are good. Code that mostly wires a framework route to a service is weaker. Generated clients, migrations, and schema constants are usually poor first targets.

You can grow scope over time. Add one package, establish a baseline, fix the survivors that reveal real weakness, then move to another package. Keep a reviewed exclusion list. Exclusions should say "this code is not a useful mutation target", not "this code made the number look bad."

## Designing pytest tests that kill meaningful mutants

Mutation testing rewards precise assertions. It does not require brittle tests. The best tests are still behavior-level tests with clear inputs and outputs. What changes is your tolerance for vague checks.

Avoid assertions such as \`assert result\` when the domain has a specific value. Avoid testing only one representative case for a branching rule. For exception behavior, assert the exception type and the part of the message that matters. For collections, assert both membership and absence when the exclusion is important.

Parametrization is often the cleanest way to cover mutation-sensitive cases without duplicating test bodies.

\`\`\`python
from decimal import Decimal

import pytest

from price_rules.discounts import loyalty_discount


@pytest.mark.parametrize(
    ("subtotal", "expected"),
    [
        (Decimal("0.00"), Decimal("0.00")),
        (Decimal("99.99"), Decimal("0.00")),
        (Decimal("100.00"), Decimal("10.00")),
        (Decimal("250.00"), Decimal("10.00")),
    ],
)
def test_loyalty_discount_threshold(subtotal, expected):
    assert loyalty_discount(subtotal) == expected
\`\`\`

This is not testing for mutmut specifically. It is testing the rule in a form that happens to kill useful mutants.

## Handling equivalent mutants honestly

An equivalent mutant is a mutation that changes syntax but not behavior that can be observed. Python code with redundant conditions, defensive guards, or normalized data can produce them. Equivalent mutants should be discussed, not hidden casually.

Sometimes an equivalent mutant is a design smell. If a condition can be removed without changing behavior, maybe the production code is more complex than necessary. Simplifying the code can be better than adding a test. Other times the mutant is truly harmless, such as changing an internal expression where inputs are already validated.

Do not create tests that assert implementation trivia only to kill an equivalent mutant. That makes the suite worse. The right response may be to refactor, exclude a narrow line, or accept a documented survivor in the baseline.

## CI gates that do not punish normal development

Mutation testing is expensive enough that it should not run on every tiny push for every path. Use a staged approach. Run normal pytest and coverage on every pull request. Run mutmut on changed high-risk modules, nightly, or as a required job for packages that have adopted it. For small core libraries, pull-request mutation gates can work if the runtime is short.

Avoid a hard 100 percent mutation score gate unless the package is tiny and deliberately designed for it. A more useful policy is "no new surviving mutants in protected modules" or "mutation score must not drop below the reviewed baseline." That encourages improvement without turning the tool into theater.

Store mutmut output as CI artifacts when possible. A developer should be able to see the survivor without reproducing the entire run locally. If the CI platform supports annotations, surface the mutated file and line in the job summary.

## Reading mutation score with senior judgment

Mutation score is a signal, not a universal KPI. A score of 85 percent in a pricing engine may be unacceptable if the survivors are all money boundary cases. A score of 65 percent in a framework adapter may be fine if the survivors are logging branches and defensive checks. The contents of survivors matter more than the percentage.

Use the score for trend and scope, not bragging rights. A team that inspects five serious survivors and fixes two real test gaps has improved more than a team that excludes half the code to reach a prettier number.

## Creating a baseline without accepting weak tests forever

Most established Python projects will not reach a clean mutation result on the first run. That is normal. The important decision is how the team records the baseline. A baseline should be a temporary map of known survivors, not a permanent excuse to ignore them.

Create a short review note for each meaningful survivor category. Boundary survivors in money logic should become backlog work quickly. Logging wrappers and unreachable defensive checks may be accepted or excluded narrowly. If the team cannot explain a survivor, do not bless it. Unknown survivors are exactly where mutation testing creates value.

A useful baseline has owners and dates. For example, "price threshold survivors owned by payments team, fix before next fee release" is actionable. "Mutation score is 61 percent" is not. The baseline should also name the command used to generate it so future runs compare the same scope.

When a pull request touches a baselined module, ask whether any existing survivor is now easier to kill. Refactors often make tests simpler. Mutation testing should improve with code clarity, not sit outside normal engineering work.

## Mutating legacy code safely

Legacy Python code often has side effects at import time, broad monkeypatching, slow integration tests, and unclear boundaries. Running mutmut against all of it can produce more heat than light. Start by extracting a deterministic core or selecting a module with a stable pytest subset.

Before running mutmut, make the normal tests boring. Remove order dependencies, isolate filesystem writes, and replace real network calls. Mutation testing magnifies existing flake. A suite that is barely deterministic under normal pytest will become painful when executed repeatedly under mutants.

One practical pattern is to wrap legacy behavior with characterization tests first. These tests document current behavior without claiming it is ideal. Then run mutmut against the wrapped module. Survivors can reveal where characterization is too shallow. After refactoring, the improved tests remain valuable because they protect behavior while implementation changes.

Do not use mutmut to shame legacy code. Use it to choose where new assertions will reduce the most risk.

## When a surviving mutant points to production code, not tests

Some survivors are better fixed by simplifying production code. Suppose a function checks the same condition twice or guards against a value that can no longer arrive after validation was centralized. A mutant that removes one branch may survive because the branch is redundant. Adding a test for the redundant branch would preserve unnecessary complexity.

In that case, prefer a production refactor with tests around the real behavior. Mutation testing is at its best when it provokes a conversation: should this behavior be observable, should this branch exist, and does the current test suite express the rule clearly?

This is where senior review matters. Junior teams sometimes treat every survivor as a command to write another assertion. Mature teams treat survivors as design feedback. The output is a queue of questions about behavior, not a scoreboard that replaces judgment.

## Reporting mutmut results to stakeholders

Mutation results should be explained differently to engineers and non-engineers. Engineers need file names, changed expressions, and test gaps. Engineering managers need trend, scope, and risk. Product stakeholders usually need to know whether critical rules such as fees, eligibility, or permissions gained stronger protection.

Avoid presenting mutation score as a broad quality percentage. It is scoped to the files mutated and the tests run. Say "the pricing rules package killed 92 percent of reviewed mutants after adding boundary tests" rather than "our quality is 92 percent." That distinction keeps the metric honest.

The most useful report lists the top survivors by risk, the tests added, and the modules excluded with reasons. That creates a record future maintainers can challenge.

## Pairing mutmut with code review

Mutation testing works best when its findings enter normal review instead of living in a separate quality ritual. If a pull request changes a rule in a protected module, reviewers can ask whether existing mutants around that rule were killed, whether a new boundary was introduced, and whether the test asserts the business outcome directly.

Small review habits matter. When a developer adds a boolean condition, ask for both true and false behavior if both are meaningful. When a constant changes, ask which test would fail if the old value came back. When an exception branch is added, ask whether the message and type are asserted. These questions are the human version of mutation testing, and mutmut gives the team concrete examples to discuss.

Do not paste mutmut output into reviews without interpretation. A useful comment says which behavior escaped and what assertion would expose it. That keeps the conversation focused on product risk.

## Frequently Asked Questions

### Should mutmut run against the entire Python repository?

Usually no. Start with deterministic modules where behavior matters and tests run quickly. Expanding after the first useful baseline is better than launching a huge slow job that nobody trusts.

### Is a surviving mutant always a missing test?

No. It can be an equivalent mutant, a harmless logging change, or a sign that production code is overly defensive. Inspect the mutation before adding a test.

### How is mutmut different from pytest-cov?

pytest-cov tells you which lines and branches executed. mutmut asks whether tests would fail if code behavior changed. They answer different questions and work best together.

### What mutation score should CI require?

Use a reviewed baseline per module. For mature critical code, raise the threshold over time. For new adoption, preventing new meaningful survivors is often more productive than demanding a universal score.

### Why did mutmut make my test run much slower?

Mutation testing reruns tests for many small code changes. Narrow \`paths_to_mutate\`, use a focused pytest command, and avoid mutating framework glue that does not produce useful survivors.
`,
};
