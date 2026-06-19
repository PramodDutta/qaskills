import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "pytest-mock vs monkeypatch in 2026: Which to Use & When",
  description: "pytest-mock's mocker fixture vs pytest's built-in monkeypatch in 2026 — what each does, when to pick which, auto-teardown, spies, and full code examples.",
  date: "2026-06-15",
  category: "Python",
  content: `# pytest-mock vs monkeypatch in 2026: Which to Use & When

\`monkeypatch\` is pytest's built-in fixture for temporarily setting attributes, dictionary items, and environment variables, with automatic teardown after each test. \`pytest-mock\` is a third-party plugin that wraps Python's standard \`unittest.mock\` and exposes it as a \`mocker\` fixture, also with automatic teardown — its job is creating **mocks and spies** with assertable call records. Use \`monkeypatch\` when you just need to replace a value, env var, or attribute. Use \`mocker\` when you need a \`Mock\`/\`MagicMock\` you can later assert was called with specific arguments. Many test suites use both. This guide explains the difference and shows exactly when each fits.

## The one-sentence rule

If you need to **assert how something was called** (\`assert_called_once_with\`, inspect \`call_args\`, count calls), reach for \`mocker\` from pytest-mock. If you only need to **substitute a value or attribute** and do not care about call inspection, reach for \`monkeypatch\`. Both clean up after the test automatically, so neither requires a manual \`try/finally\` or \`afterEach\`.

| Need | Use |
|---|---|
| Replace \`os.environ["KEY"]\` for one test | \`monkeypatch.setenv\` |
| Replace an attribute/function with a fixed value | \`monkeypatch.setattr\` |
| Replace a function and assert it was called with X | \`mocker.patch\` |
| Create a \`Mock\`/\`MagicMock\` object | \`mocker.Mock()\` / \`mocker.MagicMock()\` |
| Spy on a real function (run it **and** record calls) | \`mocker.spy\` |
| Stub a method to return/raise something | \`mocker.patch.object\` |
| Delete an attribute or env var temporarily | \`monkeypatch.delattr\` / \`delenv\` |
| \`chdir\` into a temp directory | \`monkeypatch.chdir\` |

## monkeypatch: the built-in for surgical replacements

\`monkeypatch\` ships with pytest — no install needed. Request it as a fixture argument. Every change it makes is reverted automatically when the test finishes, so tests stay isolated.

\`\`\`python
def test_uses_env(monkeypatch):
    monkeypatch.setenv("API_BASE", "https://test.local")
    assert build_url("/users") == "https://test.local/users"
    # API_BASE is restored automatically after the test
\`\`\`

Its core methods:

\`\`\`python
monkeypatch.setattr(obj, "name", value)          # replace an attribute
monkeypatch.setattr("pkg.mod.func", replacement) # by dotted path (string target)
monkeypatch.delattr(obj, "name", raising=False)  # remove an attribute
monkeypatch.setitem(some_dict, "key", value)     # set a dict entry
monkeypatch.delitem(some_dict, "key")            # remove a dict entry
monkeypatch.setenv("VAR", "value")               # set an env var
monkeypatch.delenv("VAR", raising=False)         # unset an env var
monkeypatch.syspath_prepend(path)                # prepend to sys.path
monkeypatch.chdir(path)                           # change working dir
\`\`\`

The classic use is replacing a function with a stub that returns a known value — without needing any assertion on how it was called:

\`\`\`python
def test_temperature_display(monkeypatch):
    def fake_read_sensor():
        return 21.5

    monkeypatch.setattr("weather.read_sensor", fake_read_sensor)
    assert format_temp() == "21.5°C"
\`\`\`

The critical gotcha — and it applies to \`mocker.patch\` too — is **patch where the name is looked up, not where it is defined**. If \`weather.py\` does \`from sensors import read_sensor\`, you must patch \`weather.read_sensor\` (the name imported into \`weather\`), not \`sensors.read_sensor\`. Getting this wrong is the number-one reason a patch "doesn't take." For broader testing patterns across Python tooling, browse the [QA skills directory](/skills).

## pytest-mock: the mocker fixture over unittest.mock

\`pytest-mock\` is a plugin you install:

\`\`\`bash
pip install pytest-mock
\`\`\`

It does **not** invent a new mocking engine. It is a thin, ergonomic wrapper around the standard library's \`unittest.mock\`, exposed as a \`mocker\` fixture so you avoid nesting \`with mock.patch(...)\` context managers or stacking \`@patch\` decorators. Crucially, every patch made via \`mocker\` is **undone automatically** at the end of the test — you never call \`.stop()\` yourself.

\`\`\`python
def test_sends_email(mocker):
    send = mocker.patch("app.notifications.send_email")
    register_user("ada@example.com")
    send.assert_called_once_with("ada@example.com", subject="Welcome")
\`\`\`

Because \`mocker.patch\` returns a \`MagicMock\`, you get the full assertion surface of \`unittest.mock\`:

\`\`\`python
mock_obj.assert_called()              # called at least once
mock_obj.assert_called_once()         # exactly once
mock_obj.assert_called_with(a, b=2)   # last call's args
mock_obj.assert_called_once_with(...) # exactly once, with these args
mock_obj.assert_not_called()
mock_obj.call_count                   # integer
mock_obj.call_args                    # last call
mock_obj.call_args_list               # every call
\`\`\`

Set return values and side effects directly:

\`\`\`python
def test_retry_on_timeout(mocker):
    fetch = mocker.patch("app.client.fetch")
    fetch.side_effect = [TimeoutError, TimeoutError, {"ok": True}]  # fail twice, then succeed

    result = fetch_with_retry()
    assert result == {"ok": True}
    assert fetch.call_count == 3
\`\`\`

\`mocker\` also exposes the constructors so you can build standalone mocks: \`mocker.Mock()\`, \`mocker.MagicMock()\`, \`mocker.patch.object(SomeClass, "method")\`, and \`mocker.create_autospec(target)\` for a mock whose signature matches the real object (autospec catches calls with the wrong arguments — highly recommended).

## mocker.spy: run the real thing and record calls

A standout feature unique to pytest-mock is \`mocker.spy\`. It wraps a real method so it **still executes** but also records every call — perfect for "I want the real behavior *and* to assert it was invoked."

\`\`\`python
def test_cache_calls_loader_once(mocker):
    spy = mocker.spy(DataLoader, "load")  # real load() still runs

    cache = Cache(DataLoader())
    cache.get("key")
    cache.get("key")  # served from cache the second time

    spy.assert_called_once()  # loader hit the disk only once
\`\`\`

\`monkeypatch\` cannot do this — it replaces, it does not wrap-and-observe. When you need both real execution and call assertions, \`mocker.spy\` is the tool. Note the spied object exposes \`spy_return\` and \`spy_exception\` so you can inspect what the real call produced.

## patch.object and autospec: safer, more precise patches

Two \`mocker\` features deserve their own section because they prevent whole categories of bugs.

\`mocker.patch.object\` patches a method **on a specific object or class** rather than by a dotted string path. This is often clearer and refactor-safe, because your IDE and type checker can see the attribute — a renamed method becomes an error instead of a silently-missed patch.

\`\`\`python
def test_charge_uses_object_patch(mocker):
    # patch the method on the class directly — no fragile string path
    charge = mocker.patch.object(PaymentGateway, "charge", return_value={"id": "ch_1"})

    gateway = PaymentGateway()
    gateway.charge(amount=4200)

    charge.assert_called_once_with(amount=4200)
\`\`\`

\`autospec\` makes a mock that **matches the real object's signature**. A plain \`MagicMock\` happily accepts any call, so a typo like \`charge(amont=4200)\` passes the test while breaking production. Autospec rejects calls that do not match the real signature:

\`\`\`python
def test_autospec_catches_bad_calls(mocker):
    charge = mocker.patch("billing.charge", autospec=True)
    # or: mocker.create_autospec(real_charge)

    billing.charge(amount=4200)        # ok — matches the real signature
    charge.assert_called_once_with(amount=4200)
    # billing.charge(amont=4200) would raise TypeError at call time
\`\`\`

Autospec is widely recommended for any mock standing in for a real, stable interface. It costs nothing and turns "the test passed but the call was wrong" into an immediate failure. \`monkeypatch\` has no equivalent — another reason to reach for \`mocker\` when correctness of the call matters.

There is also \`mocker.stub(name="...")\`, a lightweight callable double useful as a named callback whose calls you want to assert, without patching anything:

\`\`\`python
def test_observer_notified(mocker):
    on_done = mocker.stub(name="on_done")
    run_task(callback=on_done)
    on_done.assert_called_once_with(result="ok")
\`\`\`

## Side-by-side: the same test both ways

Consider testing a function that calls \`time.sleep\` between retries. If you only need to neutralize the sleep, \`monkeypatch\` is the lighter choice:

\`\`\`python
def test_no_real_sleep(monkeypatch):
    monkeypatch.setattr("app.retry.time.sleep", lambda s: None)
    assert do_work() == "done"   # runs instantly, no assertion on sleep
\`\`\`

But if you must verify the **back-off schedule** — that it slept for 1s, then 2s, then 4s — you need call inspection, so \`mocker\` wins:

\`\`\`python
def test_exponential_backoff(mocker):
    sleep = mocker.patch("app.retry.time.sleep")
    do_work()
    assert [c.args[0] for c in sleep.call_args_list] == [1, 2, 4]
\`\`\`

Same target, different needs, different tool. This is the practical decision in a nutshell. For a deeper look at how mocking libraries compare across languages, see the [framework comparison hub](/compare).

## Patching environment and config: a monkeypatch sweet spot

Environment variables and \`sys.path\` are where \`monkeypatch\` clearly beats \`mocker\`, because \`mocker.patch.dict("os.environ", ...)\` is more verbose and \`monkeypatch\` has purpose-built helpers:

\`\`\`python
def test_reads_feature_flag(monkeypatch):
    monkeypatch.setenv("FEATURE_NEW_CHECKOUT", "1")
    monkeypatch.delenv("LEGACY_MODE", raising=False)
    assert is_new_checkout_enabled() is True
\`\`\`

For config dictionaries, \`monkeypatch.setitem\` is similarly clean:

\`\`\`python
def test_overrides_setting(monkeypatch):
    monkeypatch.setitem(settings.CONFIG, "timeout", 1)
    assert client().timeout == 1
\`\`\`

## A realistic end-to-end example using both

A single test that combines both fixtures — \`monkeypatch\` for the environment, \`mocker\` for the asserted call:

\`\`\`python
def test_charge_customer(monkeypatch, mocker):
    # monkeypatch: make the env deterministic
    monkeypatch.setenv("STRIPE_KEY", "sk_test_123")

    # mocker: replace the network call AND assert how it was used
    charge = mocker.patch("billing.gateway.create_charge", return_value={"id": "ch_1"})

    receipt = charge_customer(customer_id="cus_9", amount_cents=4200)

    charge.assert_called_once_with(amount=4200, currency="usd", customer="cus_9")
    assert receipt.charge_id == "ch_1"
\`\`\`

Each fixture does what it is best at: \`monkeypatch\` sets a value with no assertion, \`mocker\` provides an assertable mock. Both auto-revert, leaving the next test pristine.

## CI usage

Neither fixture needs special CI handling — they are ordinary pytest features. The only setup step is installing the plugin so \`mocker\` exists:

\`\`\`yaml
- name: Install deps
  run: pip install pytest pytest-mock

- name: Test
  run: pytest --strict-markers
\`\`\`

\`monkeypatch\` requires nothing extra since it is built in. If you adopt \`mocker.create_autospec\` widely, consider running with \`-W error\` so any \`unittest.mock\` deprecation surfaces in CI rather than slipping by.

## Common errors and troubleshooting

**The patch has no effect.** You patched where the function is *defined* instead of where it is *imported and used*. If module \`a\` does \`from b import f\`, patch \`a.f\`, not \`b.f\`. This applies to both \`monkeypatch.setattr\` and \`mocker.patch\`.

**\`fixture 'mocker' not found\`.** \`pytest-mock\` is not installed. Run \`pip install pytest-mock\`; the fixture is provided by the plugin, not by pytest core.

**A mock accepts calls with wrong arguments.** A plain \`MagicMock\` accepts anything. Use \`mocker.create_autospec(target)\` or \`mocker.patch(..., autospec=True)\` so the mock enforces the real signature and fails on mismatched arguments.

**Manually stopping a patch.** You do not need to. The whole point of \`mocker\` (and \`monkeypatch\`) is automatic teardown after each test — calling \`.stop()\` yourself is unnecessary and can cause errors.

**Trying to assert calls with monkeypatch.** \`monkeypatch\` replaces values; it has no call-recording. If you find yourself writing a fake that counts its own invocations, switch to \`mocker.patch\` and use \`assert_called_once_with\`.

For more Python testing deep-dives and plugin comparisons, browse the [blog](/blog).

## Frequently Asked Questions

### What is the difference between pytest-mock and monkeypatch?

\`monkeypatch\` is pytest's built-in fixture for temporarily replacing attributes, dict items, and environment variables, with automatic teardown — it substitutes values but cannot record how they were called. \`pytest-mock\` is a third-party plugin exposing a \`mocker\` fixture that wraps \`unittest.mock\`, giving you \`Mock\`/\`MagicMock\` objects with full call-assertion methods, also auto-cleaned up. Use \`monkeypatch\` for plain replacement and \`mocker\` when you must assert call arguments or counts.

### When should I use mocker instead of monkeypatch?

Use \`mocker\` whenever you need to assert how something was called — \`assert_called_once_with\`, \`call_count\`, inspecting \`call_args_list\` — or when you need a \`Mock\`/\`MagicMock\`/spy object. Use \`monkeypatch\` when you only need to set a value, attribute, or environment variable and do not care about call inspection. If your fake function ends up manually counting its own calls, that is a signal to switch to \`mocker\`.

### Does mocker need manual teardown like unittest.mock?

No. \`pytest-mock\`'s entire value over raw \`unittest.mock\` is that every patch created through the \`mocker\` fixture is automatically undone when the test ends, so you never call \`.stop()\` or use a \`with\` block. \`monkeypatch\` also reverts all of its changes automatically after each test. This auto-teardown keeps tests isolated without boilerplate.

### Why isn't my monkeypatch.setattr taking effect?

Almost always because you patched the wrong name. Python binds imported names into the importing module, so if \`app.py\` does \`from utils import helper\`, you must patch \`app.helper\`, not \`utils.helper\`. Patch the location where the name is *looked up at call time*, not where it is originally defined — this same rule applies to \`mocker.patch\`.

### How do I spy on a function so it still runs but records calls?

Use \`mocker.spy(target, "method_name")\` from pytest-mock. Unlike \`mocker.patch\`, the spy lets the real method execute while recording every call, so you can run real behavior and still assert with \`assert_called_once()\` or inspect \`spy_return\`. \`monkeypatch\` cannot do this because it replaces rather than wraps, so \`mocker.spy\` is the right tool when you need both.

### Do I need to install anything to use monkeypatch?

No. \`monkeypatch\` is a built-in pytest fixture, available out of the box with no extra package. \`pytest-mock\` and its \`mocker\` fixture, by contrast, must be installed with \`pip install pytest-mock\`. If you only use \`monkeypatch\`, a plain pytest install is enough.
`,
};
