import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Assert a Specific Log Level with pytest caplog",
  description:
    "Assert specific Python log levels with pytest caplog, isolate logger records, verify exception metadata, and avoid tests coupled to formatted output.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Assert a Specific Log Level with pytest caplog

A cache fallback returns the right value, but it also emits \`ERROR\` for a condition the service expects during normal operation. The functional assertion passes. Operations still gets paged. That is exactly the gap \`caplog\` can close: test the severity and identity of Python logging records as part of observable behavior.

pytest's built-in \`caplog\` fixture captures records created through the standard \`logging\` package. It gives tests both rendered text and the original \`LogRecord\` objects. For specific-level assertions, those records are the important interface. They let a test distinguish a warning from an error without parsing timestamps, formatter output, or terminal colors.

Severity tests need restraint. Logging every internal branch into the behavioral contract makes refactoring expensive. Assert a level when it carries operational meaning: an error triggers alerting, a warning signals degraded service, an info event provides an audit trail, or debug details must not leak in production. The goal is not line coverage for logger calls.

## The smallest reliable level assertion

Use \`caplog.at_level()\` to set a temporary capture threshold, run the behavior, and inspect the captured records. The context manager restores the prior logger level when it exits.

\`\`\`py
import logging

import pytest


logger = logging.getLogger('payments.refunds')


def refund_with_fallback(refund_id: str, gateway) -> str:
    try:
        return gateway.refund(refund_id)
    except TimeoutError:
        logger.warning('gateway timeout, refund queued', extra={'refund_id': refund_id})
        return 'queued'


def test_timeout_is_logged_as_warning(caplog: pytest.LogCaptureFixture) -> None:
    class TimedOutGateway:
        def refund(self, refund_id: str) -> str:
            raise TimeoutError

    with caplog.at_level(logging.WARNING, logger='payments.refunds'):
        result = refund_with_fallback('rf_123', TimedOutGateway())

    assert result == 'queued'
    matching = [
        record
        for record in caplog.records
        if record.name == 'payments.refunds'
        and record.levelno == logging.WARNING
        and getattr(record, 'refund_id', None) == 'rf_123'
    ]
    assert len(matching) == 1
    assert matching[0].getMessage() == 'gateway timeout, refund queued'
\`\`\`

This assertion checks four independent properties: the logger namespace, numeric severity, structured context, and message. \`levelno\` is preferable to comparing the string \`levelname\` because Python's logging decisions are based on numeric levels and applications can define custom level names.

The logger argument on \`at_level\` narrows the configuration change. It does not automatically filter every captured record to that name, so the list comprehension still checks \`record.name\`. Test runners and application dependencies may log concurrently or during fixture setup.

## Capture threshold and emitted severity are different facts

A common mistake is to set the capture level to \`WARNING\` and then conclude that every captured record must be a warning. The threshold means records at warning or above are eligible. An \`ERROR\` or \`CRITICAL\` record also passes that threshold.

That distinction changes the assertion:

| Test intent | Configuration | Record assertion |
|---|---|---|
| At least one warning is emitted | Capture at \`WARNING\` | Find \`levelno == logging.WARNING\` |
| No error-or-higher event occurs | Capture at a sufficiently low level | Assert every relevant \`levelno < logging.ERROR\` |
| Exact severity sequence is preserved | Capture at \`DEBUG\` | Compare selected \`levelno\` values in order |
| Debug event is available for diagnosis | Capture named logger at \`DEBUG\` | Match logger, level, and stable event fields |

Another source of confusion is the effective logger level. Python loggers inherit configuration from their ancestors unless a level is set directly. \`caplog.set_level()\` and \`caplog.at_level()\` temporarily adjust capture behavior for the chosen logger, which is safer than assigning \`logger.level\` in a test and forgetting to restore it.

Use the context-manager form when only one phase should be captured. Use \`caplog.set_level()\` when the level should apply for the remainder of the test. Both are part of pytest's logging capture fixture.

## Isolating the record from setup and dependency noise

\`caplog.records\` contains records for the current test stage. pytest separates setup, call, and teardown capture internally, and \`caplog.get_records(when)\` can retrieve a named phase. Within the test body, unrelated libraries may still produce records. Filtering by logger name is therefore a normal part of a robust assertion.

Name application loggers hierarchically. A module using \`logging.getLogger(__name__)\` might emit \`shop.checkout.inventory\`. Tests can match the exact module or intentionally include descendants with a prefix rule. Do not filter only by message text, since two subsystems can emit the same phrase.

\`\`\`py
import logging


def records_from(caplog, namespace: str) -> list[logging.LogRecord]:
    return [
        record
        for record in caplog.records
        if record.name == namespace or record.name.startswith(f'{namespace}.')
    ]


def test_checkout_does_not_escalate_expected_stock_race(caplog, checkout) -> None:
    caplog.set_level(logging.INFO, logger='shop.checkout')

    checkout.reserve_or_backorder(sku='SKU-9', quantity=2)

    checkout_records = records_from(caplog, 'shop.checkout')
    assert any(
        record.levelno == logging.WARNING
        and record.getMessage() == 'stock changed, item backordered'
        for record in checkout_records
    )
    assert not any(record.levelno >= logging.ERROR for record in checkout_records)
\`\`\`

The negative assertion is valuable because warning and error records can coexist. It protects the operational contract that an expected race degrades gracefully rather than presenting as a system fault.

Be careful with logger propagation. A child logger normally propagates a record to ancestor handlers. \`caplog\` works with pytest's installed logging handler, but application code that disables propagation or replaces root handlers can interfere with capture. Treat such global logging mutations as infrastructure changes and restore them. The fixture documentation specifically warns that replacing the root logger's handlers can remove pytest's capture handler.

## Assert LogRecord fields, not console decoration

\`caplog.text\` is useful for diagnostics and occasional whole-output checks, but it contains formatted output. Formatters can add time, process ID, file name, colors, and exception text. A formatter change should not break a test whose actual requirement is warning severity.

The fixture exposes several views:

| caplog view | Contains | Best use | Coupling risk |
|---|---|---|---|
| \`records\` | Full \`LogRecord\` instances | Severity, logger, extras, exception metadata | Lowest when matching stable fields |
| \`record_tuples\` | Logger name, level, rendered message | Compact exact-event assertions | Message wording remains contractual |
| \`messages\` | Rendered messages only | Ordering or simple presence | Loses logger and severity identity |
| \`text\` | Final formatted capture text | Formatter-focused tests and debugging | High, environment formatting leaks in |

\`record.getMessage()\` resolves a message template with its arguments. \`record.msg\` may still hold the unformatted template. Choose deliberately. If the application uses \`logger.warning('retry %s', attempt)\`, the end-user log message is available through \`getMessage()\`, while \`msg\` and \`args\` can prove parameterized logging was used.

Structured extras are attached as attributes to the record. Keep their names away from reserved \`LogRecord\` fields. In tests, access optional extras with \`getattr\` so a failure reads as an unmet assertion instead of an unrelated \`AttributeError\`.

## Verifying error logs with exception information

\`logger.exception()\` emits at \`ERROR\` by default and adds exception information when called inside an exception handler. A test for an error boundary should verify more than the word \`failed\`. It can inspect \`exc_info\` to ensure the original exception remains diagnosable while sensitive input stays out of the message.

\`\`\`py
import logging

import pytest


logger = logging.getLogger('imports.csv')


def import_row(raw_row: str) -> None:
    try:
        int(raw_row)
    except ValueError:
        logger.exception('row rejected')


def test_rejected_row_logs_value_error_without_raw_data(
    caplog: pytest.LogCaptureFixture,
) -> None:
    secret_row = 'customer-email@example.test'

    with caplog.at_level(logging.ERROR, logger='imports.csv'):
        import_row(secret_row)

    errors = [
        record
        for record in caplog.records
        if record.name == 'imports.csv' and record.levelno == logging.ERROR
    ]
    assert len(errors) == 1
    assert errors[0].getMessage() == 'row rejected'
    assert errors[0].exc_info is not None
    assert errors[0].exc_info[0] is ValueError
    assert secret_row not in caplog.text
\`\`\`

The final negative check intentionally examines formatted text because exception formatting can append content beyond \`getMessage()\`. In real security tests, use synthetic sensitive values and remember that traceback content can include local data depending on logging and exception design.

If application code uses \`logger.error(..., exc_info=True)\`, the same \`exc_info\` inspection applies. If it only interpolates an exception into a string, the record has no traceback tuple. That may be acceptable for a known domain error, but it is a different diagnostic contract.

## Clearing capture between actions

Sometimes a test must compare logging from two calls. \`caplog.clear()\` removes captured records and text so the second assertion is not contaminated by the first. This is clearer than remembering array offsets.

\`\`\`py
import logging


def test_only_the_final_retry_is_an_error(caplog, retrying_client) -> None:
    caplog.set_level(logging.DEBUG, logger='clients.billing')

    retrying_client.attempt(failures_before_success=1)
    first_levels = [record.levelno for record in caplog.records]
    assert logging.WARNING in first_levels
    assert logging.ERROR not in first_levels

    caplog.clear()

    retrying_client.attempt(failures_before_success=99)
    second_levels = [record.levelno for record in caplog.records]
    assert logging.ERROR in second_levels
\`\`\`

This pattern works when both calls must share a fixture or object state. Two separate tests may be better when the scenarios are independent, especially if the second action depends on nothing created by the first.

Capture is also phase-aware. A fixture can inspect \`caplog.get_records('setup')\` or \`caplog.get_records('call')\` during teardown to fail on warnings emitted earlier. That technique can enforce a suite-wide no-warning policy, but use it carefully. Dependency deprecations and expected test warnings can turn a broad rule into noise. Namespace filtering and explicit allowlists are more sustainable than a blanket assertion over every logger.

## Testing level policy without freezing prose

Operational event identity should be more stable than natural-language wording. If logs feed alert rules or analytics, consider structured event fields such as \`event='payment_gateway_timeout'\` and assert that field plus severity. Humans can improve the message without rewriting dozens of tests.

For ordinary application logs, decide which layer owns the contract:

- Unit tests can verify that a branch chooses \`WARNING\` rather than \`ERROR\`.
- Integration tests can verify context added by adapters and request middleware.
- Logging configuration tests can verify that handlers route warning and error events correctly.
- End-to-end observability checks can prove ingestion, parsing, and alerts outside pytest capture.

\`caplog\` covers emitted Python records. It does not prove that a container collector ships them, that a JSON formatter preserves extras, or that an alert query matches. Do not overstate what the fixture validates.

Parameterized tests are useful when several exception classes intentionally map to different levels. Keep the mapping small and meaningful rather than duplicating the logging implementation in the expected-data table. If every internal exception and exact phrase appears in test parameters, the test becomes a mirror of the code.

Fixtures can centralize logger setup when many tests share it. The [pytest fixtures and conftest guide](/blog/pytest-fixtures-conftest-complete-guide-2026) covers scope and ownership decisions. For wider advice on assertion design, isolation, and plugin use, see [pytest best practices](/blog/pytest-best-practices-2026).

## Why capsys and unittest assertLogs are different tools

\`capsys\` captures writes to \`sys.stdout\` and \`sys.stderr\`. Logging may ultimately write to stderr, but asserting the stream loses structured record data and depends on handler formatting. Use \`capsys\` when the program's terminal output is the contract, not as a substitute for log-level assertions.

\`unittest.TestCase.assertLogs\` is useful in unittest-style suites. It captures matching records within a context and accepts a level. In pytest-native code, \`caplog\` integrates with pytest phases, exposes fixture methods, and works without inheriting from \`TestCase\`.

Third-party structured logging libraries may bridge into standard logging, in which case \`caplog\` can see the resulting records. If a library bypasses \`logging\`, use its documented test capture facility. Do not invent an adapter in tests that production never uses, because that validates a different path.

| Tool | Captures | Choose it when |
|---|---|---|
| pytest \`caplog\` | Standard logging records | A pytest test needs logger, level, message, or extras |
| pytest \`capsys\` | Python stdout and stderr | Command-line text is user-visible behavior |
| pytest \`capfd\` | OS file descriptors 1 and 2 | Native code or subprocess output must be captured |
| unittest \`assertLogs\` | Standard logging in a context | The suite is based on \`unittest.TestCase\` |

The practical rule is simple: inspect the representation closest to the requirement. For severity, that representation is a \`LogRecord\`.

## Detecting unexpected warnings across a test phase

Libraries sometimes log a warning during fixture setup and still return a usable object. The test body passes, but the warning is the earliest evidence of a deprecated configuration or degraded connection. A fixture can inspect phase-specific records during teardown and fail on warnings from an owned namespace.

\`caplog.get_records('setup')\` and \`caplog.get_records('call')\` return records captured in those completed phases. Filter them before deciding. A database driver's harmless retry should not be treated the same as an application's data-loss warning merely because both use the same numeric level.

\`\`\`py
import logging

import pytest


@pytest.fixture
def no_checkout_warnings(caplog: pytest.LogCaptureFixture):
    caplog.set_level(logging.WARNING, logger='shop.checkout')
    yield

    relevant = [
        record
        for phase in ('setup', 'call')
        for record in caplog.get_records(phase)
        if record.name == 'shop.checkout'
        or record.name.startswith('shop.checkout.')
    ]
    assert relevant == [], [
        (record.name, record.levelname, record.getMessage())
        for record in relevant
    ]
\`\`\`

Apply such a fixture only to tests whose policy genuinely forbids warnings. An autouse fixture across the entire repository can make an unrelated dependency upgrade fail hundreds of tests with duplicate noise. If a no-warning policy is broad, maintain explicit namespace ownership and an expiring allowlist with reasons.

Warnings emitted through Python's separate \`warnings\` module are not the same as logging records. pytest has warning capture and \`pytest.warns()\` for that channel. Some environments route warnings into logging with \`logging.captureWarnings(True)\`, but tests should not assume that global bridge exists unless production config enables it.

## Level assertions under threads and background tasks

The logging handler can receive records from background threads while a test is active. That makes namespace and correlation filtering essential in suites that run workers. Add a synthetic request or job ID through \`extra\`, then match it along with logger and level. Without correlation, two concurrent operations can satisfy each other's assertion.

Do not let work outlive the capture window. Join a thread, await an async task, or drain the worker before leaving \`caplog.at_level()\`. A log emitted after the context exits may be captured under a restored threshold or during teardown, producing intermittent results.

When testing multiprocessing, remember that child processes do not automatically write records through the parent process's in-memory pytest handler. Production may forward child logs through a queue, file, or collector. Exercise that configured transport in an integration test, or test the child logging decision locally inside the child. Claiming that \`caplog\` validates cross-process delivery without such plumbing overstates its reach.

For asynchronous code in one process, the ordinary fixture works because standard logging is synchronous at emission. Await the behavior and assert records afterward. If the application schedules a fire-and-forget task, expose a completion signal for tests rather than sleeping and hoping the log arrives.

## Preserve the application's logging configuration

Tests should observe logger behavior without permanently rewriting it. Avoid calling \`logging.basicConfig()\` inside a test because it changes global handlers and may do nothing when handlers already exist. Likewise, removing root handlers to make output quieter can detach pytest's capture handler.

If the code under test installs a production JSON formatter, isolate that configuration in a fixture and restore every changed handler, level, filter, and propagation flag. Better still, expose configuration as an application function whose result can be tested with a fresh logger. One test can verify routing and formatting, while behavioral tests use \`caplog\` to inspect records before presentation.

The \`--log-cli-level\` pytest option controls live terminal display and is useful while diagnosing CI. It is not an assertion and should not be required for \`caplog\` tests to pass. A suite whose outcome changes when live logging is enabled has leaked configuration between the runner and application.

Finally, include the logger namespace in assertion failure output. A bare “expected WARNING” provides little evidence when several dependencies emit records. Printing selected name, numeric level, message, and correlation fields usually makes the first failure actionable without exposing whole request payloads.

## Frequently Asked Questions

### Does caplog.at_level(logging.WARNING) prove that only warnings were emitted?

No. The argument establishes a threshold, so warning, error, and critical records are eligible. Filter records by logger and assert \`record.levelno == logging.WARNING\` when exact severity matters.

### Why is my application's log missing from caplog.records?

Check the effective logger level, whether the code uses Python's standard \`logging\` package, and whether application configuration replaced root handlers or disabled propagation. Also confirm that the log occurred in the phase and logger namespace the test inspects.

### Can I assert that no errors were logged?

Yes. Capture at a level low enough to include relevant records, filter to the application namespace, and assert that none has \`levelno >= logging.ERROR\`. A high threshold or narrow logger setting can otherwise hide records from the check.

### Should a test compare caplog.text exactly?

Only when formatted output itself is the contract. For level behavior, prefer \`caplog.records\` and stable fields. Exact text comparisons are sensitive to formatters, timestamps, paths, and traceback rendering.

### How do I test logs from fixture setup?

Use \`caplog.get_records('setup')\` from a point where that phase has completed, commonly fixture teardown. pytest also recognizes the \`'call'\` and \`'teardown'\` phase names.
`,
};
