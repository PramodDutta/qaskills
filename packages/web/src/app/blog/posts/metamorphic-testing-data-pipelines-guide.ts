import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Metamorphic Testing for Data Pipelines',
  description:
    'Apply metamorphic testing to data pipelines when exact expected outputs are unavailable, catching transformation defects with relation-based checks.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Metamorphic Testing for Data Pipelines

The dashboard total is wrong by 1.7 percent, and nobody can produce the correct answer. Source events arrive late, currency rates change daily, deduplication rules depend on business exceptions, and the warehouse query has three joins that were copied from an older model. Traditional expected-output tests help when you have a small fixture with a known result. They are much weaker when the real problem is whether a transformation keeps its promises across many possible inputs.

Metamorphic testing gives data teams another option. Instead of asking "what is the exact output for this input?", you ask "what relationship must hold when I transform the input in a controlled way?" If duplicating a row with the same event_id should not change revenue after deduplication, that relation can become a test. If sorting input files should not change the aggregate, that relation can become a test. If multiplying every amount by 100 should multiply totals by 100, that relation can become a test.

This is useful when the oracle is unavailable, expensive, or disputed. It is not a free pass to skip known examples. Keep golden fixtures for the business rules you can define exactly. Add metamorphic tests around invariants, monotonic behavior, idempotence, partitioning, and tolerance. For data contract boundaries, pair these checks with [the data contract testing guide](/blog/data-contract-testing-guide-2026). For release-level safety nets around changed transformations, connect them to [regression testing strategy](/blog/regression-testing-strategies-guide).

## Relations are the test case, not the fixture

A metamorphic test has two parts. First, run the pipeline or transformation on a source input. Second, create a follow-up input by applying a controlled change. The assertion compares the two outputs through a relation. The expected value may still be unknown, but the relationship is known.

| Relation type | Data pipeline example | Defect it can expose |
|---|---|---|
| Permutation invariance | Reordering input events does not change daily totals | Hidden dependence on file order or dataframe index |
| Duplicate tolerance | Replaying the same event_id does not double count revenue | Broken deduplication key or late-event handling |
| Scaling | Multiplying all amounts by 10 multiplies aggregate revenue by 10 | Hard-coded thresholds or currency conversion mistakes |
| Partition consistency | Processing one month at once equals summing daily partitions | Window boundary bug or state leakage |
| Monotonicity | Adding a valid purchase cannot reduce gross revenue | Incorrect sign handling or filter condition |
| Null preservation | Adding optional null metadata does not change core aggregates | Accidental inner join or required-field assumption |

The relation must be true for the business rule, not merely true for a convenient implementation. For example, adding a refund event can reduce net revenue, so monotonicity would be wrong for net revenue. It may still be valid for gross purchase count. Senior data QA starts by naming the metric precisely.

## A pandas transformation with metamorphic tests

Start small. The following transformation deduplicates events by event_id, filters purchases, converts cents to dollars, and aggregates by account. The exact output for a large event set may be hard to know. Several relations are still clear.

\`\`\`python
import pandas as pd


def account_revenue(events: pd.DataFrame) -> pd.DataFrame:
    purchases = events[events["event_type"] == "purchase"].copy()
    purchases = purchases.drop_duplicates(subset=["event_id"], keep="last")
    purchases["revenue_usd"] = purchases["amount_cents"] / 100

    return (
        purchases.groupby("account_id", as_index=False)["revenue_usd"]
        .sum()
        .sort_values("account_id")
        .reset_index(drop=True)
    )


def test_reordering_events_does_not_change_revenue():
    events = pd.DataFrame(
        [
            {"event_id": "e1", "account_id": "a1", "event_type": "purchase", "amount_cents": 500},
            {"event_id": "e2", "account_id": "a2", "event_type": "purchase", "amount_cents": 300},
            {"event_id": "e3", "account_id": "a1", "event_type": "view", "amount_cents": 0},
        ]
    )

    baseline = account_revenue(events)
    shuffled = account_revenue(events.sample(frac=1, random_state=42))

    pd.testing.assert_frame_equal(baseline, shuffled)


def test_replayed_event_id_is_not_double_counted():
    events = pd.DataFrame(
        [
            {"event_id": "e1", "account_id": "a1", "event_type": "purchase", "amount_cents": 500},
            {"event_id": "e2", "account_id": "a1", "event_type": "purchase", "amount_cents": 250},
        ]
    )
    replayed = pd.concat([events, events.iloc[[0]]], ignore_index=True)

    pd.testing.assert_frame_equal(account_revenue(events), account_revenue(replayed))
\`\`\`

Those tests do not care whether a1 has exactly 7.50 dollars in the first scenario. That exact assertion could be added as a normal unit test. The metamorphic value is different: the transformation must not care about row order, and it must not count replayed event IDs twice.

The relation also documents production risk. Event replay and file ordering are common pipeline realities. A single fixture with a fixed expected CSV often misses them.

## Partition consistency for batch jobs

Data pipelines often run by partition: daily folders, hourly event windows, or customer shards. A strong metamorphic relation is that processing compatible partitions separately and combining them should equal processing them together. This catches boundary filters, time zone mistakes, and stateful code that leaks across groups.

\`\`\`python
import pandas as pd


def daily_revenue(events: pd.DataFrame) -> pd.DataFrame:
    purchases = events[events["event_type"] == "purchase"].copy()
    purchases["event_day"] = pd.to_datetime(purchases["event_time"], utc=True).dt.strftime("%Y-%m-%d")
    purchases["revenue_usd"] = purchases["amount_cents"] / 100
    return (
        purchases.groupby("event_day", as_index=False)["revenue_usd"]
        .sum()
        .sort_values("event_day")
        .reset_index(drop=True)
    )


def combine_daily_outputs(outputs: list[pd.DataFrame]) -> pd.DataFrame:
    merged = pd.concat(outputs, ignore_index=True)
    return (
        merged.groupby("event_day", as_index=False)["revenue_usd"]
        .sum()
        .sort_values("event_day")
        .reset_index(drop=True)
    )


def test_month_equals_sum_of_daily_partitions():
    events = pd.DataFrame(
        [
            {"event_time": "2026-07-01T09:00:00Z", "event_type": "purchase", "amount_cents": 1000},
            {"event_time": "2026-07-01T22:00:00Z", "event_type": "purchase", "amount_cents": 500},
            {"event_time": "2026-07-02T01:00:00Z", "event_type": "purchase", "amount_cents": 700},
        ]
    )

    monthly = daily_revenue(events)
    partitions = [
        daily_revenue(events.iloc[[0, 1]]),
        daily_revenue(events.iloc[[2]]),
    ]

    pd.testing.assert_frame_equal(monthly, combine_daily_outputs(partitions))
\`\`\`

The test is small, but the relation scales. You can generate many partition splits with property-based tooling, but do not start there. First write the relation with a human-readable example. Then decide whether random generation adds value.

## Choosing relations that match business semantics

Metamorphic testing fails when relations are chosen casually. A common mistake is asserting that adding rows can never decrease a metric. That is true for gross purchase count. It is false for net revenue if the added row is a refund. It is false for conversion rate if the added row is a non-converting visit. It is false for distinct active users if the input changes identity stitching.

Use business language before code. Write the relation in a sentence, then ask the data owner whether it is always true, true under conditions, or not true. Conditional relations are fine, but encode the condition in the test data.

| Metric | Tempting relation | Safer relation |
|---|---|---|
| Net revenue | Adding events cannot lower revenue | Adding purchase events with positive amount cannot lower gross revenue |
| Conversion rate | Adding purchases increases conversion rate | Adding a purchase for an existing visitor cannot reduce numerator |
| Active accounts | Duplicate source files do not change count | Duplicate rows with same stable account_id do not change count |
| Inventory balance | Reordering events does not matter | Reordering events with identical event_time and sequence does not matter |
| SLA breach count | Time zone conversion preserves counts | UTC conversion preserves counts for events outside boundary hour |

The safer relation is narrower but testable. Narrow truth beats broad false confidence.

## Where metamorphic tests sit in a data QA stack

Metamorphic tests are not data contracts. A contract might require that event_id is present, amount_cents is an integer, and event_time is UTC. A metamorphic test might duplicate a valid event and expect deduplication to hold. Contracts protect interface assumptions. Metamorphic tests protect transformation behavior.

They are also not reconciliation checks. Reconciliation compares two systems, such as warehouse revenue versus payment processor settlement. Metamorphic testing compares a pipeline against itself under controlled input changes. Reconciliation can tell you something differs. Metamorphic testing can tell you a class of logic is unstable.

In a mature stack, use all three:

| Layer | Example check | Run timing |
|---|---|---|
| Data contract | purchases.amount_cents is required and non-negative | On ingestion and producer change |
| Golden fixture | Known refund and purchase fixture produces exact net revenue | On transformation pull request |
| Metamorphic relation | Reordering events preserves account revenue | On transformation pull request |
| Reconciliation | Daily revenue matches settlement export within tolerance | Scheduled after data availability |
| Anomaly monitoring | Today's null rate differs sharply from baseline | Production monitoring |

The value is coverage diversity. A schema contract will not catch a stateful groupby bug. A golden fixture may not include a late event. A reconciliation check may arrive too late for a pull request. A relation can run before merge.

## Generating follow-up inputs carefully

Follow-up inputs should be realistic enough to exercise the defect and controlled enough to preserve the relation. For replay testing, duplicate records exactly or duplicate with fields that are expected to differ, such as ingestion_time. For partition tests, split on a boundary that mirrors production. For scaling tests, scale fields that are safe to scale and leave identifiers unchanged.

Avoid transformations that accidentally change multiple meanings. If you sort rows and reset timestamps, a failure no longer points to order dependence. If you multiply amounts and also change currency, the relation becomes muddy. A good metamorphic test changes one concept.

Naming helps. Instead of test_pipeline_relation, use test_replayed_event_id_does_not_change_revenue or test_daily_partitions_sum_to_monthly_total. The name becomes incident documentation when the relation fails.

## Handling floating point and approximate equality

Data pipelines often use decimals, floats, currency conversion, and aggregation. Metamorphic relations should define tolerance explicitly. A relation that compares floating point frames exactly may fail because of harmless operation order. A relation that accepts any difference under 5 percent may hide real defects.

Use decimal types for money when possible. When using floats, compare with a tight tolerance and document why. In pandas, assert_frame_equal supports rtol and atol. In SQL, round at the same precision the business uses for reporting, but avoid rounding away the defect you are trying to catch.

## Metamorphic tests in SQL-first pipelines

If your transformations live in SQL models, the same idea applies. Create a source fixture table, create a follow-up fixture table, run the model twice in isolated schemas or temporary tables, and compare relation queries. For dbt projects, this often means using seeds or unit test fixtures for small cases and writing custom tests for relation checks.

For example, a relation query can assert that a duplicate event_id in the source does not change count in the output. Another can assert that unioning two non-overlapping partitions equals the full output. Keep these checks close to the model they protect.

## Incident examples that become relations

Metamorphic testing is especially powerful after production incidents. If an outage happened because late files were processed twice, write a replay relation. If a dashboard changed when input order changed, write a permutation relation. If a timezone migration shifted boundary events, write a boundary-preservation relation around UTC conversion.

The best relation is often hiding in the postmortem sentence: "This should not have changed when..." Turn that sentence into a test.

## Scheduling relation checks in real pipelines

Run the smallest metamorphic tests in the same pull request pipeline as the transformation code. They should use fixtures measured in rows, not gigabytes. For SQL models, that can mean temporary tables or seed files. For Spark jobs, it can mean local mode with tiny dataframes. For pandas transformations, ordinary pytest is enough. The goal is to catch logic movement before merge.

Larger relation checks belong closer to the data platform. A nightly job can sample recent partitions, create controlled follow-up inputs in a scratch schema, and compare aggregates. Keep those jobs read-only against production data unless the platform has a sanctioned test workspace. The relation should never corrupt source tables just to prove a property.

Report relation failures with the transformation name, relation name, source fixture, follow-up mutation, and the compared metric. "Metamorphic check failed" is too vague. "Replay relation failed for account_revenue: duplicate event_id changed a1 revenue from 75.00 to 125.00" points directly at the broken invariant.

## Relation reviews with data owners

Metamorphic testing works best when QA, analytics engineering, and business owners review relations together. The data owner can say whether a relation is universally true, true for a segment, or false after a policy change. That conversation prevents tests from freezing outdated assumptions.

Keep a short relation catalog. For each relation, record the metric, the controlled input change, the expected relationship, and the business caveat. This catalog is not bureaucracy. It is how future maintainers know why a strange-looking duplicate-row test exists and when it should be updated.

## Debugging a failed relation

When a metamorphic relation fails, resist the urge to loosen tolerance immediately. First compare the baseline input, follow-up input, baseline output, and follow-up output side by side. Identify whether the controlled mutation changed only what the test intended to change. Many early failures come from a flawed follow-up generator rather than the pipeline.

If the relation is correct and the input mutation is clean, reduce the fixture until the failure remains. A failing replay relation with one duplicated event is easier to fix than a failing replay relation with a full production partition. Then attach the minimized fixture to the defect. That minimized example often becomes the permanent regression case.

Metamorphic failures are also good prompts for observability improvements. If the output changed but no intermediate metric explains why, add row counts, dedupe counts, rejected-record counts, or partition summaries to the pipeline. The next relation failure should be faster to diagnose.

That feedback loop is part of the payoff.

## Frequently Asked Questions

### When should I prefer metamorphic testing over golden fixtures?

Use golden fixtures when the exact expected output is known and meaningful. Use metamorphic testing when the exact output is hard to calculate but a relationship across controlled inputs is clearly true.

### Can metamorphic tests replace data contracts?

No. Data contracts protect the shape and meaning of inputs between producer and consumer. Metamorphic tests protect transformation behavior after valid data arrives. They cover different risks.

### How many metamorphic relations should one pipeline have?

Start with two or three relations tied to real failure modes: replay, ordering, partitioning, scaling, or boundary conversion. Add more only when they protect a named risk. A long list of weak relations becomes maintenance noise.

### Are metamorphic tests useful for machine learning feature pipelines?

Yes, but relations must reflect feature semantics. For example, shuffling rows should not change per-user aggregates, and adding a duplicate event with the same stable key should not change deduplicated features. Relations around model predictions need extra caution.

### What is a bad metamorphic relation?

A bad relation sounds plausible but is not always true for the metric. "Adding rows cannot reduce conversion rate" is wrong because non-converting visits can lower the rate. Narrow the condition until the relation is actually guaranteed.
`,
};
