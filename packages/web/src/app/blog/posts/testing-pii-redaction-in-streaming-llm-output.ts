import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing PII Redaction in Streaming LLM Output',
  description:
    'Test PII redaction in streaming LLM output across chunk boundaries, Unicode text, partial identifiers, buffering, flush behavior, and downstream event delivery.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing PII Redaction in Streaming LLM Output

The first token chunk ends with \`sam@\`. The next begins with \`example.com\`. A detector that scans chunks independently sees neither a complete email nor a reason to block delivery. The browser, after concatenation, sees the entire address. Streaming redaction must therefore protect the reconstructed byte or character sequence, not merely each callback payload.

The core design decision is where untrusted text may travel before classification. Once a raw fragment reaches a WebSocket client, analytics event, trace, or console, replacing it in a later chunk does not undo disclosure. Tests need observability at every egress boundary and cases that split identifiers at every plausible position.

## Draw the stream's trust boundaries first

A typical path includes model provider, server-side stream parser, redactor, application event encoder, reverse proxy, browser transport, UI accumulator, telemetry, and persistence. Redaction should happen before the first component that is not authorized to receive raw model output.

| Boundary | What to capture in tests | PII failure mode |
|---|---|---|
| Provider chunk callback | Raw input only in isolated test harness | Detector never sees provider metadata correctly |
| Redactor output iterator | Every emitted fragment and final concatenation | Cross-chunk identifier leaks |
| SSE or WebSocket serializer | Exact bytes sent to client | Escaping or event framing reconstructs raw value |
| UI state update | Rendered text and intermediate updates | Temporary display before later masking |
| Logs and traces | Structured fields and exception paths | Raw buffer copied into diagnostics |
| Conversation store | Persisted assistant content | Display is masked but database is not |

Do not declare the system safe because the final DOM is clean. A user can inspect network frames, an extension can observe mutations, and telemetry may have already exported an intermediate value.

## Choose buffering from the longest detectable pattern

A streaming detector needs enough lookbehind to recognize a pattern spanning chunks. One approach holds a tail of characters and emits only the prefix considered safe. The tail length must cover the longest relevant candidate or the detector needs an incremental state machine.

There is no universal safe number. Email addresses, phone numbers, national identifiers, payment card numbers, IP addresses, and free-form postal addresses have different shapes. Arbitrarily retaining 32 characters may cover one rule set and miss another. Entity models also need surrounding context to decide that a number is sensitive.

| Strategy | Leakage latency | Accuracy potential | Tradeoff |
|---|---:|---:|---|
| Scan each chunk | Lowest | Poor across boundaries | Unsafe for split entities |
| Fixed lookbehind buffer | Small delay | Good for bounded patterns | Must justify maximum tail |
| Tokenize into safe segments | Variable | Good for delimiter-based entities | Holds incomplete words or fields |
| Incremental recognizer state | Low | High for formal patterns | More implementation complexity |
| Buffer entire completion | Highest | Highest batch-detector parity | Loses streaming experience |

Set a maximum completion size even when buffering. Resource exhaustion is a separate security and reliability risk.

## A runnable buffered redactor

The following Python implementation is deliberately small. It handles email and US-style Social Security number patterns, retains a configurable tail, redacts on every feed, and scans everything remaining on close. It is an example of the mechanics, not a comprehensive PII product.

\`\`\`python
# streaming_redactor.py
import re
from collections.abc import Iterable, Iterator


PATTERNS = (
    (re.compile(r'(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b'), '[EMAIL]'),
    (re.compile(r'(?<!\\d)\\d{3}-\\d{2}-\\d{4}(?!\\d)'), '[SSN]'),
)


def redact(text: str) -> str:
    for pattern, replacement in PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class StreamingRedactor:
    def __init__(self, tail_size: int = 128) -> None:
        if tail_size < 1:
            raise ValueError('tail_size must be positive')
        self._tail_size = tail_size
        self._buffer = ''
        self._closed = False

    def feed(self, chunk: str) -> str:
        if self._closed:
            raise RuntimeError('redactor is closed')
        self._buffer += chunk
        if len(self._buffer) <= self._tail_size:
            return ''
        cut = len(self._buffer) - self._tail_size
        ready, self._buffer = self._buffer[:cut], self._buffer[cut:]
        return redact(ready)

    def close(self) -> str:
        if self._closed:
            return ''
        self._closed = True
        final, self._buffer = redact(self._buffer), ''
        return final


def redact_stream(chunks: Iterable[str]) -> Iterator[str]:
    redactor = StreamingRedactor()
    for chunk in chunks:
        if safe := redactor.feed(chunk):
            yield safe
    if safe := redactor.close():
        yield safe
\`\`\`

This implementation exposes a critical limitation: cutting at a fixed character boundary before redaction can still divide an entity longer than the retained tail. The test suite must set limits consistent with supported identifier lengths or replace the mechanism with an incremental recognizer. Document that threat model rather than presenting the sample as universal.

For safe source data and governance, consult [PII-masked production data for testing](/blog/pii-masked-production-data-for-testing). Redaction is one guardrail among several, so align it with the [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026).

## Split every fixture at every boundary

One hand-picked split is insufficient. Given a sensitive string embedded in safe context, generate every two-chunk partition and assert that no emitted prefix and no reconstructed result contains the raw entity.

\`\`\`python
# test_streaming_redactor.py
import pytest

from streaming_redactor import redact_stream


@pytest.mark.parametrize(
    ('sensitive', 'marker'),
    [
        ('sam.qa+alerts@example.co.uk', '[EMAIL]'),
        ('219-09-9999', '[SSN]'),
    ],
)
def test_redacts_at_every_two_chunk_boundary(sensitive: str, marker: str) -> None:
    source = f'Contact value: {sensitive}. Do not expose it.'
    start = source.index(sensitive)
    end = start + len(sensitive)

    for split in range(start + 1, end):
        emitted: list[str] = []
        for part in redact_stream((source[:split], source[split:])):
            emitted.append(part)
            visible_so_far = ''.join(emitted)
            assert sensitive not in visible_so_far

        result = ''.join(emitted)
        assert sensitive not in result
        assert marker in result
\`\`\`

The intermediate assertion matters. A flawed redactor might emit raw text first and a correction later; checking only the final joined string could miss that if a consumer applies replacement events. For append-only SSE text, every emitted prefix is irreversible.

Expand beyond two chunks. Split an email into one-character chunks, empty chunks, a chunk per UTF-8 byte at the transport parser boundary, and large chunks containing multiple adjacent entities. Random chunking is helpful, but retain deterministic partitions so failures reproduce.

## Test the transport parser with bytes, not just strings

Provider SDKs may yield decoded strings, but HTTP bodies arrive as bytes. A multibyte Unicode code point can be split between network frames. A correct incremental UTF-8 decoder holds incomplete bytes; decoding each frame separately can insert replacement characters, corrupting both content and detector input.

\`\`\`python
import codecs


def decode_utf8_stream(parts: list[bytes]) -> list[str]:
    decoder = codecs.getincrementaldecoder('utf-8')(errors='strict')
    output = [decoder.decode(part, final=False) for part in parts]
    output.append(decoder.decode(b'', final=True))
    return [text for text in output if text]


def test_utf8_code_point_split_across_frames() -> None:
    payload = 'Owner José, email josé@example.test'.encode('utf-8')
    byte_index = payload.index('é'.encode('utf-8')) + 1
    decoded = ''.join(decode_utf8_stream([payload[:byte_index], payload[byte_index:]]))

    assert decoded == 'Owner José, email josé@example.test'
\`\`\`

Whether an internationalized email should match depends on the detector. The sample regex intentionally supports ASCII-style address characters and therefore does not claim to cover \`josé\`. Your fixtures must reflect supported languages and identifier standards, including Unicode normalization forms, full-width digits, non-breaking spaces, right-to-left text, and localized phone formatting.

## Include chunk framing and event syntax

Server-Sent Events have fields and blank-line event boundaries. JSON strings can contain escape sequences. WebSocket messages preserve message boundaries that do not necessarily align with model tokens. Test at the layer where the application extracts text deltas, then again at the serialized egress.

For SSE, capture the bytes a client would receive and parse them with the same event parser used in production. Ensure a malicious model cannot inject \`data:\` or blank lines that bypass redaction through a metadata field. Redact content before JSON serialization, and validate event type separately from model text.

If the protocol sends replacement or patch events, specify whether consumers are allowed to see unredacted text temporarily. For privacy boundaries, the answer should normally be no. Patch-based cleanup is not prevention.

## Cover overlapping and adjacent entities

Detectors interact. A text can contain \`Call +1 415 555 0123 or email a@b.test\`, two emails separated by punctuation, or a card-like number embedded in an order identifier. Test multiple entities in one buffer and entities that touch the retained-tail cutoff.

| Fixture shape | Defect it targets |
|---|---|
| Two emails in one chunk | Only first match replaced |
| Email begins in retained tail | Unsafe prefix emission |
| Identifier ends at stream close | Missing final flush scan |
| Safe text resembles a number | Over-redaction and broken utility |
| Entity spans three chunks | Two-part-only logic |
| Long local part exceeds buffer assumption | Pattern length limit |
| Redaction marker appears in source | Confused marker accounting |

Assert safe context remains intact. A redactor that replaces an entire paragraph whenever it sees \`@\` has high recall but unacceptable utility. Tests need expected masking boundaries, not only “secret absent.”

## Verify close, cancel, error, and empty-stream behavior

The final buffer is the most common hiding place for a leak. If the provider closes normally, \`close()\` must scan and emit safe remainder. If the upstream errors, decide whether buffered safe text is discarded or flushed. Flushing after an error can expose an incomplete candidate that would have become sensitive if more chunks arrived.

A conservative policy discards unresolved tail on abnormal termination and records a non-sensitive error. Tests should cover:

1. Normal end immediately after a complete identifier.
2. End with an incomplete email-like prefix such as \`name@\`.
3. Provider exception while the buffer contains digits.
4. Client cancellation and generator cleanup.
5. Empty stream and chunks containing empty strings.
6. Calling close twice.
7. Feeding after close.

Do not log the raw retained buffer in the exception handler. A useful diagnostic contains run ID, rule ID, buffer length, and detector outcome, not content.

## Evaluate precision and recall with policy-labeled data

Regex examples validate mechanics, not adequate PII recognition. Build a labeled corpus based on the organization's definition of sensitive data and jurisdictions. Include true identifiers, synthetic but structurally valid identifiers, near misses, code snippets, order numbers, public business contacts, and context-dependent names or locations.

Measure entity-level recall, false-positive rate, exact boundary quality, and time-to-first-safe-output. Do not invent a universal pass percentage. Set thresholds by harm: payment card leakage may demand a different control and blocking policy from masking a common first name.

Use synthetic fixtures in source control. If production-derived text is required for evaluation, apply access controls, minimization, documented purpose, retention, and independent masking before it enters ordinary CI.

## Test detector outages and timeouts

If redaction calls a remote classification service, the stream now depends on network latency and availability. Decide fail-open versus fail-closed explicitly. For PII leaving a trusted boundary, fail-closed is often the defensible policy: stop delivery and show a generic error. Internal low-risk tools may choose another policy, but tests must pin it.

Inject timeout, 429, 500, malformed response, partial response, and circuit-open states. Confirm raw buffered content never appears in user errors or retry payloads. Bound detector retries so the redaction guard itself cannot create an infinite stream stall.

| Detector failure policy | User result | Privacy posture | Operational cost |
|---|---|---|---|
| Fail closed, terminate | Generic interruption | Strong | Reduced availability |
| Fail closed, buffer and retry | Delayed output | Strong if memory protected | Memory and latency growth |
| Fallback to local rules | Continued partial protection | Depends on fallback coverage | More rule maintenance |
| Fail open | Uninterrupted output | Potential raw disclosure | Usually unacceptable at external egress |

## Inspect every copy of the content

Instrumentation frequently leaks what the UI masks. Test log appenders, OpenTelemetry span attributes, error trackers, prompt archives, replay tools, feedback payloads, caches, database rows, and moderation queues. Inject a unique canary identifier, execute the streaming path, then query authorized test sinks for that canary.

Prefer allowlisted telemetry fields over a second best-effort redaction pass. Record counts and rule identifiers, not raw matches. Restrict trace sampling does not solve leakage if a sampled trace contains the secret.

The canary should be synthetic and unmistakable. Never test with a real person's email, phone, or government identifier.

## Load and backpressure change correctness

Under a slow client, buffers may grow. Under high concurrency, mutable detector state can cross streams if accidentally shared. Run concurrent streams with distinct canaries and assert that output A never contains B's marker or text. Apply backpressure or bounded queues rather than accumulating unlimited raw chunks.

Measure redaction latency at realistic chunk sizes and concurrency, but present results as measurements of your environment. Include a worst-case input with many near matches, since regex backtracking or entity models can behave differently from ordinary prose. Use regex engines and patterns designed to avoid catastrophic backtracking.

## Verify masking is stable under reprocessing

Streams may be redacted at egress and again before persistence. The operation should be idempotent: processing \`[EMAIL]\` twice must not corrupt the marker, create nested labels, or shift evidence offsets unexpectedly. Feed already masked text, mixed raw and masked entities, and source strings that resemble marker syntax.

If consumers need entity identity, opaque labels such as \`[EMAIL_1]\` are safe only when the mapping remains protected. Never send that mapping to an unauthorized client. Verify numbering is scoped to one stream and cannot reveal that two users shared an identifier.

## Treat structured model events separately from prose

An LLM stream may contain tool-call arguments, citations, reasoning summaries, and visible text deltas. Applying a prose regex to serialized JSON can miss escaped identifiers or corrupt syntax. Classify each field, redact authorized textual values before serialization, and reject sensitive tool arguments where policy forbids them.

Create a test where an email is divided across tool-argument deltas, then reconstruct arguments exactly as the runtime does before validation. Put the same canary in a citation title and exception field. Handling may differ, but no field should reach an unauthorized sink accidentally.

## Test reconnect and replay behavior

SSE gateways may replay events after reconnect using an event ID. WebSocket clients may resubscribe and receive buffered content. Assert replay storage contains only redacted events, not raw provider chunks redacted again during delivery. Otherwise a bypass in the replay endpoint can expose data while the live path remains clean.

Reconnect mid-entity is especially useful. End the first connection while the server retains \`person@\`, resume with \`example.test\`, and verify server-side redactor state stays coherent or safely terminates the incomplete stream. Browser memory cannot be the privacy context after reconnection.

## Frequently Asked Questions

### How many characters should a streaming redactor buffer?

Derive the value from the longest bounded entity and context required by the actual detectors, then test the boundary. If identifiers or context are unbounded, a fixed tail cannot prove safety and an incremental recognizer or full buffering is needed.

### Is checking the final concatenated answer sufficient?

No. Raw PII may have appeared in an earlier event, network frame, DOM update, log, or trace. Assert every emitted prefix and inspect downstream sinks, then also verify the final reconstruction.

### Should incomplete PII be emitted when the provider stream fails?

Usually not across an untrusted boundary. An incomplete fragment can still be identifying or become meaningful with prior context. Define abnormal flush behavior explicitly and test that diagnostics exclude the retained content.

### Can token boundaries be used as privacy boundaries?

No. Model tokens, provider chunks, Unicode characters, transport frames, and application events are different boundaries. Sensitive entities can span any of them, so detection must operate on reconstructed text with correct incremental decoding.

### How do I test names and postal addresses that lack rigid patterns?

Use a policy-labeled multilingual corpus and contextual entity detector, then measure both missed entities and damaging over-redaction. Add streaming partitions around every labeled span and include ambiguous negatives such as place names used as product names.
`,
};
