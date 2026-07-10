import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'libFuzzer C and C++ Testing Guide',
  description:
    'Use libFuzzer C and C++ testing with sanitizer builds, focused harnesses, seed corpora, crash reproduction, and CI-friendly fuzz targets for native code.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# libFuzzer C and C++ Testing Guide

The first useful fuzz target is usually smaller than the function you wanted to test. A parser, decoder, decompressor, tokenizer, or protocol frame reader can be fuzzed effectively when the harness feeds bytes directly into that boundary and lets sanitizers catch undefined behavior. libFuzzer is built for that loop: generate input, run the target in-process, keep inputs that increase coverage, and reduce crashes to the smallest reproducer it can find.

This guide is for C and C++ teams adding libFuzzer to native codebases. It covers harness design, sanitizer flags, corpus layout, dictionaries, reproducing crashes, and what to run in CI without turning every pull request into an endless fuzzing campaign. If you also work in Go, compare the workflow with [Go fuzzing tutorial 2026](/blog/go-fuzzing-tutorial-2026). For broader vulnerability coverage beyond memory safety, see [Security testing complete guide](/blog/security-testing-complete-guide).

## Choosing a fuzz boundary that will actually run

libFuzzer works best when the target is deterministic, fast, and in-process. A JSON parser is a better first target than a full HTTP server with sockets, threads, database calls, and timeouts. You can fuzz the HTTP request parser directly and test the server elsewhere. This is not a compromise. It is how fuzzing produces signal quickly.

The harness receives arbitrary bytes. Your job is to translate those bytes into the smallest realistic call into production code. Do not validate the bytes so heavily that the fuzzer cannot explore interesting states. Do not catch every exception or error code and hide sanitizer findings. The target should tolerate invalid input but still let memory bugs, assertion failures, integer overflows, and use-after-free defects crash the process.

| Candidate boundary | Good first libFuzzer target | Harness concern | Common bug class |
|---|---:|---|---|
| Binary message parser | Yes | Feed byte span directly and reject only impossible sizes | Out-of-bounds read, integer overflow |
| URL parser | Yes | Preserve percent encoding and unusual separators | Buffer overrun, incorrect normalization |
| Image decoder | Yes | Cap maximum dimensions after parsing headers | Heap overflow, excessive allocation |
| Compression format reader | Yes | Avoid writing decompressed output to disk | Infinite loop, memory exhaustion |
| TLS handshake state machine | Sometimes | Mock network reads and time carefully | State confusion, null dereference |
| Whole web service | No for first target | Too slow and nondeterministic | Fuzzer spends time on infrastructure |
| Database migration runner | No | External state dominates execution | Better tested with integration tests |

## A minimal C++ harness

Every libFuzzer target exports LLVMFuzzerTestOneInput. The function receives a pointer and a size. It returns 0 for every handled input. Crashing is how libFuzzer detects a failure. The following harness fuzzes a hypothetical frame parser that accepts a byte span and returns either a parsed frame or an error. The production function is not allowed to retain the pointer after the call.

\`\`\`cpp
#include <cstddef>
#include <cstdint>
#include <span>

#include "protocol/frame_parser.h"

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
  if (size > 4096) {
    return 0;
  }

  std::span<const uint8_t> input(data, size);
  auto result = protocol::ParseFrame(input);

  if (result.ok()) {
    const protocol::Frame &frame = result.value();
    if (frame.payload_size() > frame.raw_size()) {
      __builtin_trap();
    }
  }

  return 0;
}
\`\`\`

The size cap is not there to make the parser look good. It prevents the fuzzer from wasting most of its time on huge inputs when the format you care about is small. Keep caps tied to realistic protocol limits. If production accepts 16 MB payloads, a 4 KB fuzz target may still be useful for parser structure, but you should also have targeted tests for large allocation behavior.

## Building with sanitizers and libFuzzer

With Clang, libFuzzer is enabled through -fsanitize=fuzzer. You normally combine it with AddressSanitizer and UndefinedBehaviorSanitizer. AddressSanitizer catches memory errors such as heap overflows and use-after-free. UndefinedBehaviorSanitizer catches issues such as signed integer overflow, invalid shifts, and misaligned access. MemorySanitizer is powerful but requires all linked code to be instrumented, so start with address and undefined behavior.

\`\`\`bash
clang++ -std=c++20 -g -O1 \
  -fsanitize=fuzzer,address,undefined \
  -fno-omit-frame-pointer \
  fuzz/frame_parser_fuzz.cc \
  src/frame_parser.cc \
  -Iinclude \
  -o build/frame_parser_fuzz

mkdir -p corpus/frame_parser findings/frame_parser

./build/frame_parser_fuzz \
  corpus/frame_parser \
  -artifact_prefix=findings/frame_parser/ \
  -max_total_time=60
\`\`\`

Use -O1 for a debug-friendly fuzz build. Higher optimization can find different bugs, but -O1 with symbols usually gives readable stack traces and decent speed. Keep fuzz binaries separate from release binaries. You want sanitizer instrumentation and debug symbols here, not production compiler settings.

## Seed corpora and dictionaries

libFuzzer can start from an empty corpus, but format-aware seeds help it reach deeper code sooner. A seed corpus should contain small valid examples and a few intentionally malformed cases that represent interesting edges. Do not dump thousands of production files into the starting corpus without trimming. Large corpora slow startup and can duplicate coverage.

Dictionaries tell libFuzzer about tokens worth inserting. They are useful for text protocols, JSON-like formats, magic bytes, keywords, and delimiters. A dictionary is not a schema. It is a set of hints that helps mutations create inputs that survive early parsing.

| Artifact | What to include | What to avoid | Why |
|---|---|---|---|
| Seed corpus | Minimal valid frames, empty frame, max header length, one known malformed frame | Huge random captures | Seeds should unlock code paths quickly. |
| Dictionary | Magic bytes, field names, separators, enum strings | Full production documents | Tokens help mutation without freezing structure. |
| Regression corpus | Crashes that are fixed and minimized | Unreduced megabyte reproducers | Regressions should run fast on every change. |
| Generated corpus | Inputs kept by libFuzzer after coverage growth | Hand-edited files with unclear source | The fuzzer manages this set over time. |
| CI smoke corpus | Small stable corpus plus fixed crash reproducers | Endless fuzz campaign inputs | Pull requests need bounded runtime. |

A dictionary for a frame protocol might look like this:

\`\`\`text
"QAFR"
"\x00\x01"
"\xff\xff"
"content-type"
"payload"
"gzip"
"\r\n"
"\0"
\`\`\`

Run with -dict=fuzz/frame_parser.dict. If the dictionary makes no difference after a few runs, remove it. Dictionaries are cheap, but stale ones can give a false sense that the harness is format-aware.

## Reproducing and minimizing crashes

When libFuzzer finds a crash, it writes an artifact with the input that triggered it. That file is the test case. Reproduce it by running the fuzz binary with the artifact path as an argument. Do this before opening a bug so you know the crash is deterministic under the same build.

\`\`\`bash
./build/frame_parser_fuzz findings/frame_parser/crash-6f0b8c4d8f5a

./build/frame_parser_fuzz \
  -minimize_crash=1 \
  -runs=100000 \
  findings/frame_parser/crash-6f0b8c4d8f5a
\`\`\`

The minimized output should be added to a regression directory after the bug is fixed. That turns a fuzzing discovery into a normal deterministic test. If the crash only reproduces with a particular sanitizer, record that in the issue. A UBSan finding and an ASan finding may point to different root causes even when the input file is the same.

## Writing harness assertions carefully

It is legitimate for a harness to include invariants, such as encoded size never being smaller than header size, round-trip parse then serialize preserving a canonical form, or a decompressed buffer not exceeding a configured limit. Be careful with assertions that merely restate implementation assumptions. A bad harness can create false crashes that are not product defects.

For parsers, a strong pattern is differential or round-trip checking. Parse arbitrary bytes. If parsing succeeds, serialize the parsed value. Parse the serialized form again. Assert that the second parse succeeds and produces an equivalent object. That checks a real property of the public API.

\`\`\`cpp
extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
  auto parsed = protocol::ParseFrame(std::span<const uint8_t>(data, size));
  if (!parsed.ok()) {
    return 0;
  }

  std::vector<uint8_t> encoded = protocol::SerializeFrame(parsed.value());
  auto reparsed = protocol::ParseFrame(std::span<const uint8_t>(encoded.data(), encoded.size()));

  if (!reparsed.ok()) {
    __builtin_trap();
  }

  if (!(reparsed.value() == parsed.value())) {
    __builtin_trap();
  }

  return 0;
}
\`\`\`

This kind of property is much better than checking a handful of fixed examples. The fuzzer creates odd but valid frames that normal unit tests would not invent.

## CI strategy for libFuzzer

Continuous fuzzing and pull request fuzzing are different jobs. Pull requests need a bounded smoke run: build fuzz targets with sanitizers, run fixed regression inputs, then run a short time-limited fuzz pass. Nightly or dedicated fuzzing infrastructure can run longer campaigns and preserve corpora between runs.

Make fuzz target builds part of normal compilation. A harness that does not compile is dead coverage. Keep each target focused so a failure points to a subsystem. One giant fuzz target for the whole library will be slow, hard to debug, and likely to hide shallow bugs behind initialization cost.

| Pipeline stage | Suggested command shape | Time budget | Signal |
|---|---|---:|---|
| Pull request compile | Build every fuzz target with sanitizer flags | Normal build time | Harness and target code still compile. |
| Pull request regression | Run corpus and fixed crash files with -runs=1 | Seconds | Previously fixed crashes stay fixed. |
| Pull request smoke fuzz | Run selected targets with -max_total_time=30 or 60 | Bounded | Obvious new memory bugs surface early. |
| Nightly fuzz | Run all targets with saved corpora | Minutes to hours | Deeper coverage growth and rare crashes. |
| Pre-release fuzz | Longer campaign on risky parsers | Hours or dedicated service | Confidence before shipping native parser changes. |

## Common false starts

The first false start is putting file I/O in the harness. libFuzzer already gives you bytes. Writing them to a temporary file and asking the parser to read it adds filesystem noise unless the API only accepts paths. If the API only accepts paths, consider adding a byte-oriented API and testing that. It will likely improve production design too.

The second false start is swallowing crashes. A catch-all exception block that returns 0 converts failures into passes. Catch only exceptions that represent expected parse rejection, and let unexpected exceptions terminate. In C, avoid setjmp-style recovery unless the production parser uses it and you understand the implications.

The third false start is fuzzing without sanitizers. libFuzzer can find explicit aborts and assertion failures alone, but sanitizers are what turn silent memory corruption into actionable crashes. A fuzz target without sanitizers is leaving most of the value on the table.

## Keeping the harness deterministic

libFuzzer rewards deterministic code. If the same input sometimes crashes and sometimes passes, minimization becomes painful and the corpus fills with noise. Remove wall-clock time, random seeds, network calls, thread races, and environment-dependent behavior from the fuzz boundary. If production code needs a clock or random generator, inject a fixed implementation in the harness.

Global state is another source of nondeterminism. A parser that caches settings after the first input may behave differently on the thousandth input in the same process. libFuzzer runs many inputs in one process by design. Reset mutable singletons, clear caches, and avoid leaking state from one call to LLVMFuzzerTestOneInput to the next. If reset is impossible, that may be a design smell in the production component.

| Nondeterministic source | Harness repair | Why it matters |
|---|---|---|
| Random id generation | Seed deterministic RNG or inject fixed generator | Crashes need to reproduce from the artifact alone. |
| Current time | Use fixed clock object | Date-dependent branches can make minimization unstable. |
| Background threads | Fuzz the synchronous parser below the threaded layer | Thread scheduling turns findings into flakes. |
| Global cache | Clear cache per input or construct a fresh parser | Inputs should not depend on previous mutations. |
| Locale or environment | Set locale and config explicitly | CI and developer machines should behave the same. |
| Network lookup | Replace with in-memory fake | Fuzz speed and determinism collapse with I/O. |

## Reading sanitizer reports like a developer

A sanitizer crash report is not just a red build. It includes the access type, address, stack trace, allocation stack, and sometimes shadow memory hints. Start with the top frame inside your code, then inspect the allocation and free stacks. A heap-use-after-free report usually needs all three: where the invalid read happened, where the object was allocated, and where it was freed.

Do not immediately blame the fuzz input for being unrealistic. Attackers, corrupt files, old clients, and broken network peers also send unrealistic input. The question is whether the public boundary should survive it without undefined behavior. A parser may return an error. It may reject the message. It should not read past a buffer because a length field was inconsistent.

When the stack trace is too optimized to read, rebuild with -g, -O1, and -fno-omit-frame-pointer. If the stack still points mostly into templates, add smaller helper assertions around decoded lengths, offsets, and ownership transitions. The best fuzz fixes often make those invariants explicit in production code.

## Corpus maintenance over time

Corpora age. A corpus that was useful for version one of a parser may become bloated after the grammar changes. Periodically merge and minimize corpora with the current binary. Keep a small committed regression corpus and store larger generated corpora in CI cache or artifact storage. Review any newly committed crash reproducer like source code: it should be minimized, named, and tied to a bug or test case.

\`\`\`bash
./build/frame_parser_fuzz \
  -merge=1 \
  corpus/frame_parser_minimized \
  corpus/frame_parser \
  corpus/frame_parser_from_ci

./build/frame_parser_fuzz corpus/frame_parser_minimized -runs=1000
\`\`\`

The merge command keeps inputs that add coverage for the current target. It is a cleanup tool, not a guarantee of complete coverage. If a seed file represents an important business case but no longer adds coverage, keep a normal unit or integration test for that case.

## When to split a fuzz target

A single fuzz target can become too broad. If one target initializes a full document parser, decodes embedded images, evaluates expressions, and writes output, crashes will be harder to triage. Split targets around boundaries that have different input formats or bug classes. A tokenizer target, parser target, and serializer round-trip target may each find different issues.

Splitting also helps CI. A tiny tokenizer fuzz target can run on every pull request. A deep document import target can run nightly with a larger corpus. The split should match ownership. If the networking team owns frame decoding and the storage team owns snapshot import, give them separate fuzz binaries and separate findings.

## Reviewing fuzz fixes

A fuzz-found bug fix should include the minimized input, an explanation of the violated invariant, and a regression path. Do not accept a fix that only increases the harness size cap, ignores the input, or catches the crash without correcting the parser. The patch should make the production boundary safer for the same class of malformed data.

## Frequently Asked Questions

### Is libFuzzer only for security teams?

No. Security teams value it because memory bugs can become vulnerabilities, but product teams benefit from finding parser crashes, hangs, and undefined behavior before users hit unusual files or network frames.

### How long should a libFuzzer target run in CI?

For pull requests, keep it bounded: compile targets, run regression corpora, then run a short smoke pass such as 30 to 60 seconds for selected targets. Use nightly jobs for longer corpus growth.

### Should the harness reject invalid inputs early?

Only reject inputs that are outside realistic limits, such as enormous sizes. Let the production parser reject malformed structure. If the harness filters too much, libFuzzer cannot explore the code paths where bugs live.

### What sanitizer combination should I start with?

Start with -fsanitize=fuzzer,address,undefined on Clang. Add other sanitizers once the build system and dependencies can support them. AddressSanitizer plus UBSan gives strong early coverage for many native defects.

### Where do minimized crash files belong?

Put fixed crash reproducers in a regression corpus committed with the fuzz target. The next CI run should execute them deterministically so the same bug cannot return unnoticed.
`,
};
