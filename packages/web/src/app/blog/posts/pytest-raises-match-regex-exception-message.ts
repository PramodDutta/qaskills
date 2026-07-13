import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Match Exception Messages with pytest.raises() Regex',
  description:
    'Use pytest.raises() regex matching precisely, escape dynamic text safely, avoid brittle patterns, and verify exception types and messages together.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Match Exception Messages with pytest.raises() Regex

\`ValueError\` is often only half the contract. A parser can reject an input for the wrong reason, an authorization layer can surface the wrong policy, or a validator can report the wrong field while still raising the expected class. The \`match\` argument to \`pytest.raises()\` lets a test check the exception's string representation with a regular expression.

That phrase, regular expression, carries most of the sharp edges. Pytest uses Python's \`re.search\`, not literal equality and not an implicit full-string match. Parentheses, square brackets, plus signs, periods, and question marks in a message are regex operators unless escaped. A precise test starts by deciding which part of the message is a stable interface.

## What \`match\` actually examines

In context-manager form, \`pytest.raises(ExpectedType, match=pattern)\` performs two checks after the block exits:

1. The raised object is an instance of the expected type, including subclasses.
2. The regex can be found in the exception's string representation. Current pytest also considers PEP 678 exception notes.

The pattern is evaluated with \`re.search\`, so a substring can pass without \`.*\` around it.

\`\`\`python
import pytest


def parse_retry_count(raw: str) -> int:
    try:
        count = int(raw)
    except ValueError as error:
        raise ValueError(f"retry count must be an integer, received {raw!r}") from error
    if count < 0:
        raise ValueError(f"retry count must be non-negative, received {count}")
    return count


def test_retry_count_rejects_negative_value() -> None:
    with pytest.raises(
        ValueError,
        match=r"retry count must be non-negative, received -3$",
    ):
        parse_retry_count("-3")


def test_retry_count_rejects_non_integer_text() -> None:
    with pytest.raises(ValueError, match=r"must be an integer, received 'many'"):
        parse_retry_count("many")
\`\`\`

The first pattern uses \`$\` to require the expected ending. It is not anchored at the start, so a future prefix could still pass. The second asserts a stable phrase and value but intentionally ignores any suffix.

If the block returns normally, pytest fails because no exception was raised. If it raises a different type, the unexpected exception propagates. If the type matches but the regex does not, pytest reports the pattern and input string, which is far more diagnostic than a separate boolean check with no context.

## Search, full match, and literal equality are different contracts

The right pattern depends on how much of the message is public behavior. These forms are not interchangeable:

| Intended contract | Pattern form | Example effect |
|---|---|---|
| Stable phrase appears anywhere | \`r"unknown currency"\` | Allows prefixes and suffixes |
| Message begins with a field label | \`r"^email:"\` | Rejects logging or wrapper text before the label |
| Message ends with a code | \`r"code=E104$"\` | Allows context before the final code |
| Exact message | \`r"^literal text$"\` after escaping | Rejects every extra character, including newline |
| One of a small set | \`r"must be (enabled|disabled)"\` | Accepts alternatives deliberately |

Exact matching can be appropriate for a public command-line error or a protocol adapter whose message is deliberately specified. It is usually too rigid for an exception that includes incidental object representations, filesystem paths, ordering from a collection, or text inherited from a dependency.

Do not add \`.*\` mechanically. Since \`re.search\` already scans the string, \`.*expected.*\` usually adds no value and can make multiline behavior confusing because dot does not match a newline unless the DOTALL flag is enabled.

## Escape punctuation when the expected text is literal

A common failure appears when an accurate-looking message contains regex syntax. Suppose validation raises:

\`Field user.email (required) received value [none]\`

The pattern \`r"user.email (required) ... [none]"\` does not mean those literal characters. A period matches any character, parentheses create a group without consuming literal parentheses, and square brackets define a character class.

Use \`re.escape\` when the desired message or fragment is ordinary text:

\`\`\`python
import re

import pytest


class ValidationError(Exception):
    pass


def require_email(payload: dict[str, object]) -> None:
    if payload.get("user.email") is None:
        raise ValidationError("Field user.email (required) received value [none]")


def test_missing_email_reports_external_field_name() -> None:
    expected = "Field user.email (required) received value [none]"
    with pytest.raises(ValidationError, match=f"^{re.escape(expected)}$"):
        require_email({})
\`\`\`

\`re.escape(expected)\` produces a pattern that treats regex-significant punctuation literally. The anchors turn the search into exact equality for this single-line message. This technique is safer than manually adding backslashes because it continues to work when expected text changes.

Raw string notation and regex escaping solve separate problems. The prefix in \`r"\d+"\` tells Python not to consume the backslash as a string escape. The regex engine still interprets \`\d\` as a digit class. For a literal dynamic string, \`re.escape\` is the tool regardless of whether the surrounding Python string is raw.

## Interpolate only escaped dynamic values

Sometimes the stable contract combines structure with a runtime-specific literal. Escape the literal portion, then embed it in a hand-written regex.

\`\`\`python
import re
from pathlib import Path

import pytest


def load_manifest(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"manifest not found: {path}")
    return path.read_text(encoding="utf-8")


def test_missing_manifest_names_requested_path(tmp_path: Path) -> None:
    missing = tmp_path / "release[final].toml"
    pattern = rf"^manifest not found: {re.escape(str(missing))}$"

    with pytest.raises(FileNotFoundError, match=pattern):
        load_manifest(missing)
\`\`\`

Without \`re.escape\`, the brackets in the filename define a character class. Paths may also contain backslashes or other metacharacters depending on the platform. Escaping after string conversion preserves the exact displayed path.

Never escape the entire composed pattern when part of it is meant to remain regex. For \`rf"record {record_id}: expected \d+ fields"\`, escape only \`record_id\`. Escaping the whole string would turn \`\d+\` into literal backslash text.

If a value is sensitive, reconsider whether the production exception should include it at all. Tests should not normalize leakage by asserting access tokens, full credentials, or personal data in messages.

## Boundaries prevent accidental substring passes

A short search pattern may accept an unintended message. The pattern \`r"user"\` matches \`"superuser required"\`; \`r"code 4"\` matches \`"code 404"\`. Regex boundaries state the shape you actually mean.

Useful controls include:

| Regex element | Meaning in this context | Example |
|---|---|---|
| \`^\` | Start of the inspected string | \`r"^invalid token"\` |
| \`$\` | End, or just before one final newline | \`r"expired$"\` |
| \`\A\` and \`\Z\` | Absolute string boundaries | Strict whole-string contracts |
| \`\b\` | Word boundary | \`r"\buser\b"\` does not match \`superuser\` |
| \`[0-9]+\` | One or more ASCII digits | Numeric identifier without accepting other text |
| \`(?:...)\` | Non-capturing group | Alternatives without an unused capture |

Be deliberate about \`\d\`: in Python regex it can recognize Unicode decimal digits, not only \`0\` through \`9\`. If an API error code is defined as ASCII, \`[0-9]\` states that contract more accurately.

Anchoring an alternation requires grouping. \`r"^missing|invalid$"\` means either starts with \`missing\` or ends with \`invalid\`. It does not mean the complete message is exactly one of those words. Write \`r"^(?:missing|invalid)$"\`.

## Flags belong in compiled patterns or inline groups

The \`match\` argument accepts a string or a compiled \`re.Pattern\`. A compiled pattern is clean when case sensitivity or multiline interpretation is intentional.

\`\`\`python
import re

import pytest


def verify_header(name: str) -> None:
    if name.lower() != "x-request-id":
        raise LookupError(f"Required header X-Request-ID, got {name}")


def test_header_diagnostic_is_case_insensitive_for_the_canonical_name() -> None:
    pattern = re.compile(r"^required header x-request-id, got x-trace$", re.IGNORECASE)
    with pytest.raises(LookupError, match=pattern):
        verify_header("x-trace")
\`\`\`

Inline flags such as \`(?i)\` also work, but compiled patterns make flags visible as Python values. Avoid \`IGNORECASE\` as a casual fix for a mismatched test. If capitalization is part of user-facing copy, exact case may be worth checking.

Multiline messages require particular care. \`re.MULTILINE\` changes \`^\` and \`$\` so they operate around line breaks; it does not make dot match newlines. \`re.DOTALL\` changes dot. Instead of a permissive dot expression, a test can capture the exception and assert its lines as structured text.

## Capture \`exc_info\` for attributes and causal structure

\`match\` is concise when type plus message is the complete observable contract. Real exceptions may expose fields such as \`status_code\`, \`field\`, or \`retry_after\`, and Python exceptions can preserve \`__cause__\`. Capture the context manager result when those properties matter.

\`\`\`python
import pytest


class InventoryError(RuntimeError):
    def __init__(self, sku: str, available: int) -> None:
        self.sku = sku
        self.available = available
        super().__init__(f"insufficient inventory for {sku}: {available} available")


def reserve(sku: str, requested: int, available: int) -> None:
    if requested > available:
        raise InventoryError(sku, available)


def test_reservation_error_preserves_machine_readable_details() -> None:
    with pytest.raises(
        InventoryError,
        match=r"^insufficient inventory for SKU-42: 2 available$",
    ) as exc_info:
        reserve("SKU-42", requested=3, available=2)

    assert exc_info.value.sku == "SKU-42"
    assert exc_info.value.available == 2
    assert exc_info.type is InventoryError
\`\`\`

The assertions occur after the \`with\` block. Code after the statement that should raise, but still inside the block, will not execute when the exception occurs. This can hide intended assertions. Keep the raising block as narrow as possible, often one call.

Pytest's type check uses subclass semantics. If the exact exception class matters, \`exc_info.type is InventoryError\` makes that stricter requirement explicit. Use exactness sparingly because subclassing exceptions is normal Python design.

## A message assertion should survive harmless refactoring

Error text has at least three layers:

- stable identifier or policy, such as a field name and reason code;
- useful variable detail, such as the rejected value;
- incidental rendering, such as dictionary order or a dependency's wording.

Match the first layer, include the second only when it matters, and avoid binding to the third. If callers need a stable machine contract, a typed attribute or error code is better than parsing prose.

This affects pattern breadth. \`r"email.*required"\` may be too tolerant because it accepts \`"email is not required"\`. A pattern that models the grammar, such as \`r"^email: required field$"\`, is stronger and easier to reason about. Conversely, asserting a complete SQL driver message is brittle because database versions can change detail while the application behavior remains correct.

Review patterns for false positives by mentally testing a plausible wrong message. If the regex would accept it, narrow the pattern. Review for false negatives by considering harmless context additions. If those additions are allowed by the product contract, avoid unnecessary anchors.

## Parameterize a family of exception contracts

When one parser has related invalid inputs, parameterization keeps the invalid value, exception class, and message pattern adjacent. Use explicit IDs so CI output names the violated rule.

\`\`\`python
import pytest


@pytest.mark.parametrize(
    "raw,exception,pattern",
    [
        pytest.param("", ValueError, r"^port is required$", id="empty"),
        pytest.param("abc", ValueError, r"^port must be an integer", id="non-numeric"),
        pytest.param("0", ValueError, r"^port must be between 1 and 65535", id="below-range"),
        pytest.param("65536", ValueError, r"got 65536$", id="above-range"),
    ],
)
def test_invalid_ports(raw: str, exception: type[Exception], pattern: str) -> None:
    with pytest.raises(exception, match=pattern):
        parse_port(raw)
\`\`\`

Do not collapse unrelated exceptions into a huge table merely because their assertion shape matches. A parsing error, a network timeout, and a permission denial usually deserve different setup and different narrative. Parametrize equivalence classes within one behavior.

For more on row IDs and per-case marks, consult the [pytest parametrization guide](/blog/pytest-parametrize-complete-guide-2026). If a known defect needs an expected-failure marker rather than an exception assertion, the [pytest skip and xfail marker guide](/blog/pytest-markers-custom-skip-xfail-guide-2026) draws that distinction.

## Common patterns that weaken the test

Several exception tests pass while verifying less than their authors expect.

\`with pytest.raises(Exception)\` catches almost anything, including programmer mistakes in the test setup. Prefer the narrow production exception.

\`match="value [0]"\` is not a literal bracketed value. Escape it or use \`re.escape\`.

\`match=r".*"\` verifies no meaningful message content and even has newline caveats. Omit \`match\` if only the type is contractual.

An enormous exact pattern that copies a third-party exception freezes someone else's wording. Assert your adapter's stable wrapping message and inspect the cause type if required.

A broad \`with\` block can catch an exception from arrangement rather than the intended action. Prepare data first, enter the context immediately before the call, and leave it immediately after.

Finally, do not use \`pytest.raises\` to prove a function returns an error object. It only observes raised Python exceptions. Result types and HTTP responses require ordinary assertions on their data.

## Review failure output as part of pattern design

A good exception assertion is not only selective when it passes. It is diagnostic when it fails. Deliberately change the expected pattern once while developing the test and inspect pytest's report. The output should let a maintainer see the expected expression, the actual message, and the call that raised without reproducing the entire setup mentally.

Very large patterns undermine that report. A single expression containing several optional groups, broad wildcards, and embedded alternations can be correct but unreadable. Split the contract when its parts carry different meanings. Capture the exception, use match for the stable message grammar, then assert structured attributes separately. This produces smaller failure diffs and avoids turning prose back into a data format.

Pattern comments can also preserve intent. Python's verbose regular-expression mode is useful for genuinely complex grammars, but it changes how unescaped whitespace is interpreted. Most error messages do not justify that complexity. A named constant such as MISSING_FIELD_PATTERN can help when several tests share one deliberately public message grammar, provided the constant does not make unrelated behaviors depend on identical copy.

When production wording changes, decide whether the test or the implementation is wrong. A copy edit in an internal diagnostic may warrant changing a narrow pattern. A removed field name, error code, or rejected value may be a regression even when the new sentence sounds reasonable. The test's scope should make that decision visible.

Internationalized errors deserve a different design. If localization occurs at the presentation boundary, unit tests for the domain exception should assert a stable code and parameters, while localization tests verify message catalogs in selected locales. Matching translated prose in every domain test creates wide churn and can miss placeholder defects. If the exception itself exposes only localized text, select the locale explicitly in setup and escape literal translations rather than relying on the developer machine's locale.

Finally, verify that logging wrappers do not change the object being asserted. A logger may add context to output while the raised exception string remains unchanged. Capture logs and exceptions through their respective test facilities instead of expecting the exception matcher to inspect console output.

## Frequently Asked Questions

### Does \`match\` compare the entire exception message?

No. Pytest applies \`re.search\`, so an unanchored pattern can match anywhere in the string representation. Add appropriate start and end anchors, plus \`re.escape\` for literal content, when the whole message is the contract.

### Why does a message containing square brackets fail to match itself?

Square brackets define a regex character class. Parentheses, dots, plus signs, question marks, braces, and other characters also have special meanings. Pass the literal text through \`re.escape\`, or manually escape only when the pattern intentionally mixes literal and regex portions.

### Can \`pytest.raises\` verify exception notes?

Current pytest matching includes the exception string and PEP 678 \`__notes__\`. That can be useful, but be clear about whether the text originates in the main exception or an added note. For structured assertions, capture \`exc_info.value\` and inspect \`__notes__\` directly.

### Should I use \`str(exc_info.value) == expected\` instead of \`match\`?

Use equality when every character is intentionally stable and regex adds no value. \`match\` gives better concise checks for structured fragments and alternatives. Capturing the exception is also necessary when asserting custom attributes, exact class identity, causes, or arguments.

### How can I assert a dynamic filename without turning it into regex syntax?

Convert the displayed filename or path to a string, apply \`re.escape\`, and interpolate that escaped fragment into the surrounding pattern. Escape only the dynamic literal, leaving deliberate anchors and regex groups untouched.
`,
};
