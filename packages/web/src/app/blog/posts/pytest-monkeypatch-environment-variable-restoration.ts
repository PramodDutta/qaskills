import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Restore Environment Variables with pytest monkeypatch",
  description:
    "Restore environment variables with pytest monkeypatch using scoped setenv and delenv changes, import-safe tests, teardown guarantees, and subprocess checks.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Restore Environment Variables with pytest monkeypatch

\`os.environ["PAYMENTS_MODE"] = "sandbox"\` looks harmless until the next test inherits it. Environment variables are process-global mutable state, so an un-restored assignment can make results depend on execution order. pytest's built-in \`monkeypatch\` fixture records each change and reverses it after the requesting test or fixture finishes.

## Restoration is the feature, not a cleanup convenience

\`monkeypatch.setenv(name, value)\` sets a variable while remembering its previous condition. Teardown restores the original value if it existed, or removes the name if it did not. \`monkeypatch.delenv(name, raising=False)\` temporarily models absence and likewise restores the old value.

| Starting condition | Test operation | During test | After teardown |
|---|---|---|---|
| \`REGION=eu\` | \`setenv('REGION', 'us')\` | \`REGION=us\` | \`REGION=eu\` |
| \`FEATURE\` absent | \`setenv('FEATURE', '1')\` | \`FEATURE=1\` | Absent |
| \`TOKEN=secret\` | \`delenv('TOKEN')\` | Absent | \`TOKEN=secret\` |
| \`OPTION\` absent | \`delenv('OPTION', raising=False)\` | Absent | Absent |

That guarantee holds even when the test assertion fails or raises. It also composes with pytest fixture teardown, provided changes are made through the supplied monkeypatch object rather than direct assignments.

## Exercise present, absent, and empty as different inputs

Configuration code often treats these states differently. \`os.getenv('TIMEOUT', '30')\` uses the default only when the key is absent; an empty string remains an explicit value and may fail integer conversion.

\`\`\`python
# app/config.py
import os

def request_timeout() -> int:
    raw = os.getenv("REQUEST_TIMEOUT_SECONDS", "30")
    timeout = int(raw)
    if timeout <= 0:
        raise ValueError("timeout must be positive")
    return timeout
\`\`\`

\`\`\`python
# tests/test_config.py
import pytest
from app.config import request_timeout

def test_uses_default_when_timeout_is_missing(monkeypatch):
    monkeypatch.delenv("REQUEST_TIMEOUT_SECONDS", raising=False)
    assert request_timeout() == 30

def test_reads_configured_timeout(monkeypatch):
    monkeypatch.setenv("REQUEST_TIMEOUT_SECONDS", "7")
    assert request_timeout() == 7

@pytest.mark.parametrize("value", ["", "fast"])
def test_rejects_non_integer_timeout(monkeypatch, value):
    monkeypatch.setenv("REQUEST_TIMEOUT_SECONDS", value)
    with pytest.raises(ValueError):
        request_timeout()
\`\`\`

There is no manual \`finally\` block. The [pytest monkeypatch and mocking guide](/blog/pytest-mock-monkeypatch-guide-2026) covers the fixture's broader patching surface; environment restoration is its most direct use.

## Prove the original process environment survives

Usually trusting pytest's fixture is correct. A small contract test can help a team migrating from direct environment edits understand the lifecycle. Put the mutation in an inner context so restoration is observable before the test ends.

\`\`\`python
import os

def test_context_restores_an_existing_value(monkeypatch):
    os.environ["DEPLOYMENT_REGION"] = "original-test-value"
    try:
        with monkeypatch.context() as scoped:
            scoped.setenv("DEPLOYMENT_REGION", "temporary")
            assert os.environ["DEPLOYMENT_REGION"] == "temporary"

        assert os.environ["DEPLOYMENT_REGION"] == "original-test-value"
    finally:
        os.environ.pop("DEPLOYMENT_REGION", None)
\`\`\`

The direct edit is used only to establish and clean a controlled baseline inside this demonstration. Application tests should not seed baselines this way because a failure before cleanup can still leak.

## Match fixture scope to the mutation lifetime

The built-in \`monkeypatch\` fixture is function-scoped. Requesting it from a broader fixture causes a scope mismatch, which is protective: a session-wide environment mutation would undermine per-test isolation.

| Desired lifetime | Technique | Caution |
|---|---|---|
| One test | Request \`monkeypatch\` directly | Preferred default |
| Setup plus test | Function-scoped fixture requests monkeypatch | Restoration occurs after dependent test |
| One block inside a test | \`monkeypatch.context()\` | Useful when patch must end before later assertions |
| Whole test session | Configure the test process before pytest | Document because it is no longer isolated per test |

A focused fixture makes intent reusable:

\`\`\`python
import pytest

@pytest.fixture
def isolated_aws_environment(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    return {"region": "us-east-1"}

def test_client_uses_explicit_test_credentials(isolated_aws_environment):
    client = build_storage_client()
    assert client.meta.region_name == isolated_aws_environment["region"]
\`\`\`

The [fixture scope guide](/blog/pytest-fixtures-scope-complete-guide) explains dependency lifetime in detail. Keep an environment-changing fixture function-scoped unless every consumer truly needs an invariant process setting.

## Import-time configuration changes the test strategy

Many modules read environment variables at import:

\`\`\`python
# app/settings.py
import os

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
\`\`\`

Changing \`LOG_LEVEL\` after importing that module does not recompute the constant. This is not a monkeypatch failure. Python has cached the module object in \`sys.modules\`.

Prefer reading configuration in a function or constructing a settings object. If legacy code must be tested, set the environment before importing and reload deliberately:

\`\`\`python
import importlib
import app.settings

def test_log_level_is_captured_from_environment(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    reloaded = importlib.reload(app.settings)
    assert reloaded.LOG_LEVEL == "DEBUG"
\`\`\`

Reloading mutates the shared module object. Other modules may have imported names with \`from app.settings import LOG_LEVEL\`, and those references will not change. Treat reload-based tests as a compromise, not a general pattern. A \`Settings.from_environment()\` factory is easier to isolate and supports multiple configurations in one process.

## PATH changes deserve the prepend option

\`setenv\` accepts \`prepend\`, commonly \`os.pathsep\`, to add a directory before an existing path rather than reconstructing it manually.

\`\`\`python
import os
import shutil

def test_private_tool_wins_path_resolution(monkeypatch, tmp_path):
    tool = tmp_path / "reporter"
    tool.write_text("#!/bin/sh\nexit 0\n")
    tool.chmod(0o755)

    monkeypatch.setenv("PATH", str(tmp_path), prepend=os.pathsep)
    assert shutil.which("reporter") == str(tool)
\`\`\`

On Windows, executable discovery and script format differ, so make this test platform-specific or create an appropriate executable fixture. The important API behavior is that the temporary prefix is removed and the exact original PATH returns afterward.

## Child processes receive a snapshot at launch

A subprocess inherits the parent's current environment by default. It does not share a live mapping. Patch before launching it, and assert through the child's output when process behavior is the subject.

\`\`\`python
import subprocess
import sys

def test_worker_receives_temporary_mode(monkeypatch):
    monkeypatch.setenv("WORKER_MODE", "validation")
    result = subprocess.run(
        [sys.executable, "-c", "import os; print(os.environ['WORKER_MODE'])"],
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.stdout.strip() == "validation"
\`\`\`

For stricter isolation, pass an explicit \`env\` dictionary to \`subprocess.run\`. That prevents unrelated machine secrets from reaching the child and makes the process contract visible. Monkeypatch still helps build the parent-side scenario, but an explicit child environment is often safer for security tests.

## Avoid leaking secrets in assertion output

Environment values frequently contain API keys. Do not compare an entire \`dict(os.environ)\` in a failing assertion or include it in logs. Assert presence, absence, selected non-secret values, or a redacted fingerprint. Fake credentials should be recognizable and unusable outside tests.

| Risky practice | Failure mode | Safer alternative |
|---|---|---|
| Print all environment variables | CI secret exposure | Log selected variable names only |
| Use a developer's real token | Accidental external calls | Stub transport and use an obvious dummy token |
| Patch production endpoint alone | Credentials may still be valid | Inject both endpoint and inert credentials |
| Depend on ambient \`.env\` | Machine-dependent result | Set or delete every relevant name |

If a library automatically loads a \`.env\` file during import, control the working directory and loader call as well. Environment isolation cannot compensate for a second configuration source silently overwriting values.

## Understand nested patches and teardown order

The same monkeypatch instance can set a name multiple times. pytest records undo operations and restores the pre-test state when the fixture ends. For a temporary inner override, \`monkeypatch.context()\` makes the boundary explicit.

\`\`\`python
def test_nested_feature_mode(monkeypatch):
    monkeypatch.setenv("FEATURE_MODE", "control")
    assert choose_variant() == "control"

    with monkeypatch.context() as inner:
        inner.setenv("FEATURE_MODE", "candidate")
        assert choose_variant() == "candidate"

    assert choose_variant() == "control"
\`\`\`

This pattern is useful when teardown code itself must run under the outer value. It is clearer than manually saving a string and hoping every exit path restores it.

## Parallel execution changes who can observe a patch

pytest-xdist workers are separate processes, so a patch in one worker does not alter another worker's environment. Tests within one worker still share a process sequentially and rely on teardown. Threads created by the test are different: they share \`os.environ\`, and another thread can observe the temporary value.

Do not run concurrent tests in threads inside the same interpreter while mutating environment variables. For application code that needs concurrent configurations, environment lookup is the wrong runtime dependency. Read values once into immutable configuration objects and inject those objects.

Fork behavior also matters. A child created after a patch inherits the value; a previously running service does not. Restart a process when testing startup configuration.

## Diagnose a value that appears not to restore

First search for direct writes with \`os.environ[\`, \`os.putenv\`, and helpers that load dotenv files. Then determine whether the failing assertion reads the environment or a cached application setting.

| Symptom | Probable explanation | Next check |
|---|---|---|
| Later test sees patched text | Direct assignment bypassed fixture or background thread wrote it | Search mutations and stop thread before teardown |
| \`getenv\` restored, app value stale | Import-time or singleton cache | Rebuild settings object |
| Child process has old value | It started before patch | Launch after setting env |
| Test fails only on laptop | Ambient variable was never deleted | Use \`delenv(..., raising=False)\` |
| PATH assertion differs by OS | Separator or executable rules | Use \`os.pathsep\` and platform fixtures |

The fixture restores environment state, not objects derived from it. If a global client was constructed while a variable was patched, close or reset that client through its supported lifecycle.

## Review rules for environment-dependent tests

Every relevant variable should be intentionally set, intentionally absent, or explicitly accepted as ambient. Prefer factories over import-time constants. Keep patch scope narrow, avoid real credentials, and assert through public behavior. For processes, state whether inheritance is part of the test. For threads, do not rely on process-global mutation as dependency injection.

With those rules, the suite can run in any order because each example owns its environment delta and pytest reliably returns the process to its prior state.

## Expand coverage for configuration precedence

Most applications combine command-line arguments, environment variables, configuration files, and defaults. Test precedence by controlling every layer, not by hoping the developer machine lacks a setting. For example, set \`API_TIMEOUT=10\`, pass a command-line value of 5 to the parser, and assert the documented winner. Then remove the environment name with \`delenv\` and repeat. This proves restoration and precedence together.

Case sensitivity deserves a platform decision. POSIX environment names are case-sensitive, while Windows environment behavior is effectively case-insensitive through its native environment block. Do not write one cross-platform test that expects \`Path\` and \`PATH\` to be separate everywhere. Normalize supported names in application configuration or mark platform-specific behavior explicitly.

Unicode values, spaces, equals signs, and newline characters may be accepted by the Python mapping while downstream shells or services interpret them differently. Test the boundary that consumes the value. A direct Python client can safely receive a space-containing URL; a command assembled through a shell can introduce quoting risks. Prefer argument arrays to shell strings.

Boolean variables are another common trap. \`bool(os.getenv('DEBUG'))\` treats the string \`"false"\` as true. Patch values such as \`1\`, \`true\`, \`0\`, \`false\`, empty string, and absence according to an explicit parser. Reject unknown spellings rather than silently enabling a dangerous feature.

For numeric settings, cover whitespace, signs, zero, maximum, and overflow relevant to the consumer. Monkeypatch does not coerce values; \`setenv\` converts its value to a string and may warn for non-string input depending on pytest behavior. Pass strings intentionally so tests represent the operating-system interface.

Test aliases during migrations. If \`NEW_ENDPOINT\` should override deprecated \`OLD_ENDPOINT\`, set both, each alone, and neither. Capture a deprecation warning without logging either secret. Removing the old name after its sunset becomes a clear contract change.

Libraries that read proxy variables deserve special isolation. Clear both uppercase and lowercase proxy names when the HTTP stack recognizes both, and also handle \`NO_PROXY\`. Otherwise a corporate laptop can route a supposedly local test through a proxy while CI does not. Prefer mocking the transport for unit cases and reserve actual proxy inheritance for an integration test.

Locale and timezone environment variables affect parsing and formatting globally. Setting \`TZ\` may require calling \`time.tzset()\` on platforms that provide it, and teardown of the variable alone does not automatically reset library-level timezone state. Encapsulate that lifecycle in a platform-aware fixture. The same principle applies to caches in SSL, cloud, and database clients.

Finally, add an order-randomization run periodically. Correct monkeypatch usage should survive any test order. If random ordering reveals a leak, preserve the minimal failing pair, look for direct mutations or cached derived objects, and fix ownership rather than pinning the order.

Configuration loaded through a singleton needs an explicit reset seam. A fixture can patch the environment, construct the singleton, yield it, and call the library's supported close or reset operation during teardown. The environment may restore perfectly while the singleton continues holding a test endpoint and dummy credential.

Test failure during fixture setup as well as during the body. If setup applies direct changes and then raises, cleanup written after the exception never runs. Making each mutation through the requested monkeypatch fixture gives its finalizer ownership independent of the failing fixture code.

Home-directory tests should patch the abstraction the application uses. If code calls \`Path.home()\`, setting \`HOME\` may not be sufficient on every platform or after caches are populated. Patch \`Path.home\` for a unit test, and retain a separate integration check for operating-system environment resolution.

When testing a dotenv loader, use \`tmp_path\` for a minimal file, change directory with \`monkeypatch.chdir()\`, and control whether override is enabled. Assert the environment after loading and rely on monkeypatch to restore both directory and variables. Never point tests at the developer \`.env\`, which may contain live secrets.

Native extensions may call \`getenv\` during initialization and retain copied values outside Python. Patch before importing or constructing them, then use their supported shutdown lifecycle. Reverting \`os.environ\` cannot reach memory owned by an already initialized C library.

A final diagnostic can snapshot only the names owned by the application at test boundaries, with all values redacted. If one remains changed, fail with its key and phase. Keep this allowlist narrow because pytest plugins can legitimately manage unrelated environment entries.

Review fixture dependencies when a patched variable appears to vanish too early. Teardown happens in reverse dependency order, so a consumer's cleanup can still observe the environment supplied by its dependency. If cleanup must see the original value, end the patch with an inner context before yielding the resource. State that lifecycle in the fixture name and test it directly.

Command-line invocations through pytest's own subprocess helpers should receive an explicit environment whenever the child is the unit under test. Copy \`os.environ\`, replace or remove the owned names, and pass that mapping. This avoids relying on a parent mutation while still letting monkeypatch protect setup surrounding the launch.

## Frequently Asked Questions

### Does monkeypatch restore a variable that already existed before pytest started?

Yes. \`setenv\` remembers the original value and restores it at fixture teardown. If the variable was initially absent, teardown removes it instead.

### What does raising=False do on delenv?

It allows deletion when the name may already be absent. Without it, \`delenv\` raises \`KeyError\` for a missing variable, which is useful only when presence is part of setup validation.

### Why does my module still use the old value after setenv?

The module probably read the environment during import or cached a settings object. Patch before construction, redesign around a factory, or use a careful reload for legacy coverage.

### Can a session-scoped fixture request monkeypatch?

No, the built-in monkeypatch fixture is function-scoped, so pytest reports a scope mismatch. Configure session-wide values outside that fixture or build an explicit, carefully restored session mechanism.

### Will monkeypatch isolate environment changes from threads?

No. Threads share the same process environment and can observe temporary values. Use injected configuration objects when concurrent code requires different settings.
`,
};
