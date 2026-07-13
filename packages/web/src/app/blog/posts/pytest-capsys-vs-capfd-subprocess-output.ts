import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest capsys vs capfd for Subprocess Output',
  description:
    'Choose pytest capsys vs capfd for subprocess output with accurate capture boundaries, runnable examples, binary variants, and debugging guidance for mixed I/O.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# pytest capsys vs capfd for Subprocess Output

A child Python process prints READY, exits successfully, and the assertion sees an empty string. Replace capsys with capfd and the line appears. That change is not folklore: the fixtures intercept different layers of the output stack, and a subprocess inherits operating-system file descriptors rather than the parent interpreter's sys.stdout object.

The distinction becomes important in CLI tests, native extensions, os.write calls, and wrappers around external programs. Selecting the right fixture requires knowing where bytes enter the output path and whether subprocess APIs are already collecting them.

## Map the write path before selecting a fixture

Python print normally writes through sys.stdout or sys.stderr. capsys temporarily replaces those high-level streams and records text written through them. capfd captures at file descriptor 1 and 2, which sit beneath Python's stream objects. Writes made by a child inheriting those descriptors, by os.write, or by native code can therefore be visible to capfd.

| Output producer | capsys | capfd | Reason |
|---|---|---|---|
| print('hello') in tested Python process | Captured | Captured | Both intercept a layer on its path |
| sys.stderr.write('bad') | Captured | Captured | Standard Python stream ultimately reaches fd 2 |
| os.write(1, b'raw') | Not captured | Captured | Bypasses sys.stdout and writes to fd 1 |
| Child inheriting stdout and stderr | Generally not captured | Captured | Child uses inherited descriptors, not replaced Python objects |
| subprocess.run(..., capture_output=True) | Available on CompletedProcess, not fixture | Available on CompletedProcess, not fixture | A pipe owned by subprocess receives the bytes |
| Logging routed to another file or socket | Not captured | Not captured | Output never travels through standard streams |

This table is a routing model, not a claim that every third-party test runner configuration behaves identically. Plugins and custom stream wrappers can alter the path. When behavior surprises you, reduce the test to print, os.write, and one child process to establish the local capture boundary.

## Demonstrate the boundary with an inherited child

The following module writes through three routes. normal_output uses print, raw_output writes directly to fd 1, and child_output starts a Python subprocess without redirecting its streams. The tests show where capsys stops and capfd succeeds.

\`\`\`python
# output_demo.py
import os
import subprocess
import sys


def normal_output() -> None:
    print('python-stream')


def raw_output() -> None:
    os.write(1, b'file-descriptor\\n')


def child_output() -> None:
    subprocess.run(
        [sys.executable, '-c', "print('child-process')"],
        check=True,
    )
\`\`\`

\`\`\`python
# test_output_demo.py
from output_demo import child_output, normal_output, raw_output


def test_python_print_with_capsys(capsys):
    normal_output()

    captured = capsys.readouterr()
    assert captured.out == 'python-stream\\n'
    assert captured.err == ''


def test_descriptor_and_child_writes_with_capfd(capfd):
    raw_output()
    child_output()

    captured = capfd.readouterr()
    assert captured.out == 'file-descriptor\\nchild-process\\n'
    assert captured.err == ''
\`\`\`

These examples use official pytest fixture names and standard-library subprocess behavior. The exact ordering of concurrent writers is not guaranteed, so an application with overlapping parent and child output should avoid asserting one long combined string unless ordering is part of the protocol and synchronization enforces it.

Notice that subprocess.run does not use capture_output=True here. The child inherits the test process's stdout and stderr, which capfd has redirected. If the application itself sets stdout=subprocess.PIPE, the bytes belong to the returned CompletedProcess or a pipe reader. A pytest fixture cannot capture bytes that were intentionally sent elsewhere.

## capsys is the sharper tool for Python-level output

When the unit under test is a Python function that writes to sys.stdout, capsys expresses the correct boundary. It is lightweight in concept, produces text, and makes it clear that the contract is a Python stream rather than arbitrary process output.

capsys is especially suitable for:

- A function using print for a user-facing summary.
- Code calling sys.stdout.write or sys.stderr.write.
- A Click-independent helper whose formatted text is tested before CLI integration.
- A test that temporarily replaces sys.stdout and wants to reason at that level.
- A library where native writes are outside the supported contract.

Because capsys swaps stream objects, code that stores a reference to sys.stdout at import time can bypass the current captured stream. That design is difficult for redirection generally, not just pytest. Prefer resolving sys.stdout at write time or accepting a text stream parameter.

Use readouterr() as a checkpoint. It returns a CaptureResult with out and err, then resets the accumulated captured content for the next interval. This supports phase assertions without manually slicing text.

\`\`\`python
def test_progress_phases(capsys):
    print('validating')
    first = capsys.readouterr()
    assert first.out == 'validating\\n'

    print('complete')
    second = capsys.readouterr()
    assert second.out == 'complete\\n'
    assert second.err == ''
\`\`\`

Calling readouterr is not required only at the end. It is a deliberate drain point. This detail helps when a test starts a child or performs another action after confirming an earlier message.

## capfd covers descriptors, native code, and inherited streams

capfd temporarily redirects file descriptors 1 and 2 to temporary files. Python's standard streams normally write to those descriptors, so capfd captures ordinary print as well as lower-level writes. This wider reach makes it the default choice when the tested behavior includes a child process that inherits standard output.

Use capfd for:

- os.write to descriptor 1 or 2.
- C or Rust extensions that write to the process standard descriptors.
- A subprocess launched without stdout or stderr redirection.
- A command wrapper whose parent and child both print.
- Legacy code mixing Python streams with descriptor-level output.

The greater reach is not always better. A test aimed only at a formatter may accidentally capture diagnostics emitted by a native dependency, making assertions noisy. capfd also changes the descriptor environment of the process, which can expose buffering differences. Choose it because descriptor behavior is part of the scenario, not as a reflexive fix for every empty assertion.

Buffering explains many intermittent observations. A child connected to a terminal may line-buffer output, while a redirected descriptor can be block-buffered. Python subprocesses generally flush on normal interpreter shutdown, but a long-running child may hold text. Run Python with -u, set PYTHONUNBUFFERED, call flush=True, or design an explicit readiness protocol when the test needs output before process exit. Pick the option that reflects production operation.

## Do not double-capture subprocess pipes

Python's subprocess API can capture output itself. With capture_output=True, stdout and stderr are set to PIPE. With text=True, the CompletedProcess fields are strings. In that case, assert completed.stdout and completed.stderr. Neither capsys nor capfd should be responsible for them.

\`\`\`python
import subprocess
import sys


def test_cli_result_from_completed_process():
    completed = subprocess.run(
        [sys.executable, '-c', "import sys; print('ok'); print('warn', file=sys.stderr)"],
        check=True,
        capture_output=True,
        text=True,
    )

    assert completed.stdout == 'ok\\n'
    assert completed.stderr == 'warn\\n'
\`\`\`

This pattern gives the cleanest attribution when the test explicitly owns the child. It also separates channels and exposes the return code. capfd is more useful when the child launch occurs inside the subject under test and changing it to return CompletedProcess would distort the public API.

Do not combine capture_output=True with an expectation that capfd will receive the child's lines. PIPE diverts those lines before they reach inherited fd 1 or 2. The fixture may still record output from the parent, leading to confusing partial results.

Popen adds lifecycle responsibility. If a test reads stdout manually, use communicate with a timeout or manage the pipes carefully to avoid deadlock. Large output can fill an unread pipe. A test that only needs the final result should generally prefer subprocess.run.

## Text fixtures versus binary fixtures

capsys and capfd return text. pytest also supplies capsysbinary and capfdbinary for byte-oriented capture. Choose binary variants for invalid UTF-8, exact encoding checks, binary protocols accidentally sent to standard output, or tools whose output is explicitly bytes.

| Fixture | Capture layer | readouterr fields | Typical purpose |
|---|---|---|---|
| capsys | sys.stdout and sys.stderr | str | Python text output |
| capsysbinary | sys.stdout and sys.stderr | bytes | Binary writes through Python stream layer |
| capfd | OS descriptors 1 and 2 | str | Native or inherited process text |
| capfdbinary | OS descriptors 1 and 2 | bytes | Raw descriptor output without text decoding |

A small binary case demonstrates the API:

\`\`\`python
import os


def test_non_utf8_descriptor_output(capfdbinary):
    os.write(1, b'header:\\xff\\n')
    os.write(2, b'problem:\\x00\\n')

    captured = capfdbinary.readouterr()
    assert captured.out == b'header:\\xff\\n'
    assert captured.err == b'problem:\\x00\\n'
\`\`\`

Do not decode bytes merely to use the text fixture if encoding is what the test must validate. Conversely, byte assertions add noise to a human-readable CLI contract. Match the fixture to the output specification.

## Temporarily expose output with disabled capture

Both capsys and capfd provide disabled() context managers. Output inside the context goes to the real streams or descriptors instead of the fixture's capture. This is useful for interactive diagnosis and rare cases involving a prompt or external tool that must communicate with the terminal.

\`\`\`python
def test_with_diagnostic_window(capfd):
    print('captured before')

    with capfd.disabled():
        print('visible while the test runs')

    print('captured after')
    captured = capfd.readouterr()
    assert captured.out == 'captured before\\ncaptured after\\n'
\`\`\`

Do not leave diagnostic output permanently disabled in routine tests. It pollutes CI logs and can interleave under parallel execution. If a program requires a TTY, disabling capture may still be insufficient because the worker may not have one. A pseudo-terminal test or a specialized terminal harness is then the correct level.

## Understand interaction with pytest's global capture modes

pytest captures output by default and displays it for failed tests. Command-line capture modes include fd, sys, tee-sys, and no capture through -s. Fixture capture creates a scoped interface for assertions, while the global mode controls broader session behavior.

The default global method is fd capture in ordinary pytest usage. That does not make capsys equivalent to capfd inside a test. The selected fixture determines what readouterr exposes for that case. If a team changes global options in configuration or installs capture-related plugins, verify the reduced examples before attributing behavior to the application.

The [pytest reference cheatsheet](/blog/pytest-official-reference-cheatsheet-2026) is useful for adjacent fixtures and runner options. Keep configuration visible in pyproject.toml or pytest.ini so local and CI runs use the same mode.

Running pytest -s disables global capture and is valuable during investigation. It is not a fix for a test that asserts the wrong stream. Restore normal capture and use the appropriate fixture once the route is understood.

## Compare output without making assertions brittle

CLI output changes more often than core state. Decide what is contractual. Exact strings are appropriate for machine-consumed output, stable error messages, and protocol lines. For human prose, assert the meaningful fields, order only when important, and normalize platform line endings if the product supports several operating systems.

Avoid assertions such as assert 'ok' in output when error text could contain not ok. Parse structured output when the CLI offers JSON. For tabular output, test the data formatter separately and keep a small end-to-end snapshot if alignment matters.

Concurrent output requires special care. Two threads or processes may write fragments that interleave at the byte level. capfd captures what arrived, not a logical message sequence. If ordering is a requirement, synchronize the producers. If not, split lines and compare sets or independently assert required records.

| Assertion need | Robust technique | Anti-pattern |
|---|---|---|
| Exact single line | Equality including newline | Substring that also matches errors |
| Several unordered worker records | Parse lines and compare a set | Expect one scheduler-dependent order |
| JSON mode | json.loads then compare fields | Whitespace-sensitive full text |
| stderr warning plus stdout result | Assert channels independently | Concatenate and lose attribution |
| Platform-neutral text | Normalize documented line endings | Ignore all whitespace globally |

Output tests should still validate exit status and side effects. A command printing Success while failing to write the file is not correct. When invoking through subprocess.run, check returncode or use check=True for the expected success path.

## Diagnose an empty or partial CaptureResult

Work from routing rather than swapping fixtures randomly.

1. Determine whether the writer is the current Python interpreter, native code, or a child.
2. Check whether stdout or stderr is redirected to PIPE, a file, logging handler, or socket.
3. Confirm the writer flushed before readouterr.
4. For a running Popen child, wait or communicate before reading the fixture.
5. Reduce to a literal print or os.write at the same layer.
6. Inspect pytest configuration and plugins if the reduced case differs across environments.

If only some child output appears, buffering or early assertion is more likely than the fixture suddenly changing layers. If parent output appears but child output does not, inspect Popen stdout and stderr arguments. If fd writes appear but Python prints do not, code may have replaced sys.stdout with a separate buffer.

Logging is its own subsystem. Use caplog for log records when the contract is logging behavior. A StreamHandler pointed at stderr may also be visible to capture fixtures, but asserting formatted output couples the test to handler configuration. caplog provides levels, logger names, and record messages directly.

For broader test design, fixture scope, and deterministic subprocess cleanup, the [pytest best practices guide](/blog/pytest-best-practices-2026) provides the surrounding conventions.

## A practical selection rule

Start with the narrowest layer that owns the contract. Use capsys for Python stream output. Use capfd when descriptor-level or inherited child output is intentionally part of the behavior. Use capture_output and CompletedProcess fields when the test launches and owns a subprocess directly. Select binary fixture variants only for byte contracts, and use caplog for log records.

This rule improves failure diagnosis. An empty capsys result from an os.write call is then an incorrect test boundary, not a mysterious pytest defect. A missing capfd line from a piped subprocess directs attention to the pipe. Clear ownership of the bytes makes capture predictable.

## Keep cross-platform subprocess assertions deliberate

Descriptor inheritance and text rendering differ across operating systems. A child started with the standard handles inherited should remain visible to capfd, but shell syntax, executable lookup, default encodings, and newline conventions can change the observed text. Launch Python children with sys.executable and an argument list, as in the earlier example, instead of depending on a particular shell.

If the product promises identical logical lines on Windows and POSIX, compare splitlines() output or normalize only the documented newline difference. Do not strip all whitespace, because spaces may be part of a CLI table or machine-readable record. For platform-specific native tools, mark expectations by supported platform and keep the capture-layer assertion common.

## Frequently Asked Questions

### Why does capfd capture print if it works below sys.stdout?

The ordinary sys.stdout stream writes to operating-system descriptor 1. Redirecting that descriptor catches bytes emitted through the higher-level stream as well as direct descriptor writes, assuming code has not replaced stdout with an unrelated destination.

### Should I use capfd for every CLI test?

No. Use the layer the CLI behavior actually traverses. A Python-only command can be clearer with capsys, while a wrapper invoking inherited child processes needs capfd. A directly launched external CLI is often simplest to assert through CompletedProcess.

### Why is subprocess output missing when capture_output=True?

capture_output sends the child's stdout and stderr to pipes owned by subprocess. Read completed.stdout and completed.stderr. Those bytes do not travel to the parent's captured descriptors.

### How can I capture output before a long-running child exits?

If the child inherits descriptors, ensure it flushes and wait for an observable readiness condition before readouterr. If it uses PIPE, read through Popen carefully, commonly with a dedicated reader or protocol. Avoid arbitrary sleeps and prevent pipe deadlocks.

### When is capfdbinary preferable to capfd?

Use capfdbinary when exact bytes matter or output may not decode as text. For ordinary Unicode CLI messages, capfd is easier to read and better aligned with the user-facing contract.
`,
};
