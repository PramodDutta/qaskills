import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'unittest.mock vs pytest-mock -- The Complete 2026 Guide',
  description:
    'unittest.mock vs pytest-mock compared: the mocker fixture, patch, MagicMock, autospec, teardown, and when to use each Python mocking approach with runnable examples.',
  date: '2026-06-17',
  category: 'Comparison',
  content: `
# unittest.mock vs pytest-mock: Which Python Mocking Approach Should You Use?

If you write Python tests, you will eventually need to replace a real object -- a database call, an HTTP request, a slow computation -- with a fake one you control. Python gives you two popular ways to do this, and they confuse newcomers constantly because they are not actually competitors. The first is **unittest.mock**, the mocking library built into Python's standard library. The second is **pytest-mock**, a thin pytest plugin that wraps unittest.mock and exposes it through a fixture called \`mocker\`.

Understanding the **unittest.mock vs pytest-mock** distinction is the difference between fighting your test setup and writing clean, readable tests. The short version: pytest-mock does not replace unittest.mock -- it sits on top of it. Everything you can do with \`unittest.mock.patch\` you can do with \`mocker.patch\`, but pytest-mock handles cleanup for you automatically and integrates naturally with pytest fixtures. unittest.mock, on the other hand, works everywhere with zero dependencies and is the right tool if you are not using pytest at all.

This guide compares them in depth with runnable examples. We will cover patching, MagicMock, autospec, return values and side effects, assertions, and the automatic-teardown behavior that is pytest-mock's biggest selling point. By the end you will know exactly which approach to reach for in any situation. If you are still deciding on a test runner, our [unittest vs pytest 2026](/blog/unittest-vs-pytest-2026) comparison pairs well with this article. Let's dig in.

## Key Takeaways

- pytest-mock is a wrapper around unittest.mock -- it is not a separate mocking engine
- The \`mocker\` fixture automatically undoes all patches at the end of each test; unittest.mock requires manual cleanup or a context manager / decorator
- unittest.mock has zero dependencies and works with any test framework or none
- pytest-mock produces flatter, less-nested test code when you patch several things
- Both expose identical \`Mock\`, \`MagicMock\`, \`patch\`, and \`autospec\` capabilities
- Use unittest.mock for stdlib-only or non-pytest projects; use pytest-mock when you already run pytest

---

## What Each One Actually Is

**unittest.mock** is part of the Python standard library (since Python 3.3). You import it directly with no installation step:

\`\`\`python
from unittest.mock import Mock, MagicMock, patch
\`\`\`

It provides the core building blocks: \`Mock\`, \`MagicMock\`, \`patch\` (usable as a decorator, context manager, or manual start/stop), \`PropertyMock\`, and helpers like \`call\` and \`ANY\`.

**pytest-mock** is a third-party pytest plugin you install:

\`\`\`bash
pip install pytest-mock
\`\`\`

It exposes a single fixture, \`mocker\`, whose methods mirror unittest.mock's API exactly: \`mocker.patch\`, \`mocker.Mock\`, \`mocker.MagicMock\`, \`mocker.patch.object\`, \`mocker.spy\`, and so on. The crucial difference is that \`mocker\` registers every patch it creates and tears them all down automatically when the test ends -- no decorators, no \`with\` blocks, no \`addCleanup\`.

| Attribute | unittest.mock | pytest-mock |
|-----------|---------------|-------------|
| Source | Python standard library | Third-party plugin (\`pip install pytest-mock\`) |
| Dependencies | None | pytest |
| Entry point | \`patch\`, \`Mock\`, \`MagicMock\` | \`mocker\` fixture |
| Cleanup | Manual / decorator / context manager | Automatic at test end |
| Underlying engine | itself | unittest.mock (wraps it) |
| Works without pytest | Yes | No |

---

## The Code They Test

To make the comparison concrete, here is a small module we will test in every example. It fetches a user from an API and computes a discount.

\`\`\`python
# app/service.py
import requests

def get_user(user_id: int) -> dict:
    response = requests.get(f"https://api.example.com/users/{user_id}")
    response.raise_for_status()
    return response.json()

def premium_discount(user_id: int) -> float:
    user = get_user(user_id)
    return 0.20 if user["tier"] == "premium" else 0.0
\`\`\`

We do not want our tests hitting a real API, so we will mock \`requests.get\` (or \`get_user\`).

---

## Patching with unittest.mock

unittest.mock gives you three ways to apply a patch. The **decorator** form is the most common:

\`\`\`python
# test_service_unittest.py
from unittest.mock import patch
from app.service import premium_discount

@patch("app.service.get_user")
def test_premium_discount_decorator(mock_get_user):
    mock_get_user.return_value = {"tier": "premium"}

    assert premium_discount(1) == 0.20
    mock_get_user.assert_called_once_with(1)
\`\`\`

Note that the mock object is injected as a function argument, and when you stack multiple decorators the arguments are passed bottom-up -- a frequent source of confusion.

The **context manager** form scopes the patch to a \`with\` block:

\`\`\`python
from unittest.mock import patch
from app.service import premium_discount

def test_premium_discount_context():
    with patch("app.service.get_user") as mock_get_user:
        mock_get_user.return_value = {"tier": "basic"}
        assert premium_discount(2) == 0.0
        mock_get_user.assert_called_once()
\`\`\`

And the **manual start/stop** form, which you must remember to stop yourself (often via \`addCleanup\` in a TestCase):

\`\`\`python
import unittest
from unittest.mock import patch
from app.service import premium_discount

class TestDiscount(unittest.TestCase):
    def setUp(self):
        patcher = patch("app.service.get_user")
        self.mock_get_user = patcher.start()
        self.addCleanup(patcher.stop)  # ensures teardown even on failure

    def test_premium(self):
        self.mock_get_user.return_value = {"tier": "premium"}
        self.assertEqual(premium_discount(3), 0.20)
\`\`\`

The recurring theme: with unittest.mock you are always responsible for ensuring the patch is undone. Forget \`addCleanup\` or use \`start()\` without \`stop()\` and the patch leaks into other tests.

---

## Patching with pytest-mock

The same tests using pytest-mock are flatter. You request the \`mocker\` fixture and call \`mocker.patch\` -- no decorator, no \`with\`, no cleanup code:

\`\`\`python
# test_service_pytest.py
from app.service import premium_discount

def test_premium_discount(mocker):
    mock_get_user = mocker.patch("app.service.get_user")
    mock_get_user.return_value = {"tier": "premium"}

    assert premium_discount(1) == 0.20
    mock_get_user.assert_called_once_with(1)

def test_basic_discount(mocker):
    mock_get_user = mocker.patch("app.service.get_user", return_value={"tier": "basic"})
    assert premium_discount(2) == 0.0
\`\`\`

When the test function returns, pytest-mock undoes both patches automatically. The benefit becomes obvious when you need to patch several things in one test. Compare nested unittest.mock context managers:

\`\`\`python
# unittest.mock -- nesting grows with each patch
def test_multiple_unittest():
    with patch("app.service.get_user") as m_user, \\
         patch("app.service.requests.get") as m_get, \\
         patch("app.service.time.sleep") as m_sleep:
        m_user.return_value = {"tier": "premium"}
        # ... assertions
\`\`\`

with the flat pytest-mock version:

\`\`\`python
# pytest-mock -- no nesting, reads top to bottom
def test_multiple_pytest(mocker):
    m_user = mocker.patch("app.service.get_user")
    m_get = mocker.patch("app.service.requests.get")
    m_sleep = mocker.patch("app.service.time.sleep")
    m_user.return_value = {"tier": "premium"}
    # ... assertions
\`\`\`

This flatness is the main ergonomic win, and it is why pytest users overwhelmingly prefer \`mocker\` once they are already in the pytest ecosystem.

---

## Mock vs MagicMock

Both libraries expose the same two core mock classes, and the distinction is identical regardless of which you use.

- \`Mock\` is a flexible stand-in: accessing any attribute or calling it returns a new child mock.
- \`MagicMock\` is a \`Mock\` subclass that additionally configures Python's "magic" dunder methods (\`__len__\`, \`__iter__\`, \`__enter__\`, \`__getitem__\`, etc.), so it works in contexts that need them.

\`\`\`python
from unittest.mock import Mock, MagicMock

# Mock does NOT support dunder methods by default
m = Mock()
# len(m)  -> raises TypeError

# MagicMock does
mm = MagicMock()
mm.__len__.return_value = 3
assert len(mm) == 3          # works

# MagicMock supports context manager protocol
mm.__enter__.return_value = "resource"
with mm as r:
    assert r == "resource"
\`\`\`

\`mocker.patch\` uses \`MagicMock\` by default, just like \`unittest.mock.patch\`. Use plain \`Mock\` when you specifically want dunder access to fail loudly.

| Feature | Mock | MagicMock |
|---------|------|-----------|
| Auto-creates attributes | Yes | Yes |
| Records calls | Yes | Yes |
| Supports \`len()\`, \`iter()\`, \`with\` | No | Yes |
| Default for \`patch\` / \`mocker.patch\` | No | Yes |
| Use when | You want dunders to fail | You need dunder support |

---

## Return Values, Side Effects, and Exceptions

These behaviors are shared verbatim between the two approaches. \`return_value\` sets a single answer; \`side_effect\` lets you raise, iterate, or compute per call.

\`\`\`python
def test_side_effects(mocker):
    mock_get = mocker.patch("app.service.requests.get")

    # Raise an exception
    mock_get.side_effect = ConnectionError("network down")

    # Or return a different value each call (iterable)
    mock_get.side_effect = [{"id": 1}, {"id": 2}, {"id": 3}]

    # Or compute dynamically with a function
    mock_get.side_effect = lambda url: {"url": url}
\`\`\`

The exact same code works with \`unittest.mock.patch\`; only the way you obtain the mock differs.

---

## autospec: Catching Signature Mismatches

A pure \`MagicMock\` accepts any call -- wrong arguments, nonexistent methods, anything. That can hide bugs. \`autospec\` makes the mock match the real object's signature, so calling it incorrectly raises an error.

\`\`\`python
# unittest.mock
from unittest.mock import patch

@patch("app.service.get_user", autospec=True)
def test_autospec_unittest(mock_get_user):
    mock_get_user.return_value = {"tier": "premium"}
    # Calling with the wrong arity now raises TypeError

# pytest-mock -- identical option
def test_autospec_pytest(mocker):
    mock_get_user = mocker.patch("app.service.get_user", autospec=True)
    mock_get_user.return_value = {"tier": "premium"}
\`\`\`

Use \`autospec=True\` (or \`create_autospec\`) on important boundaries; it is one of the most underused safety features in Python mocking and works the same in both libraries.

---

## Spying on Real Objects

pytest-mock adds one genuinely convenient helper that has no one-line equivalent in unittest.mock: \`mocker.spy\`. A spy calls through to the real implementation while still recording every call, so you can assert on usage without changing behavior.

\`\`\`python
import app.service as service

def test_spy(mocker):
    spy = mocker.spy(service, "get_user")
    # real get_user still runs, but calls are recorded
    # spy.assert_called_once_with(1)
\`\`\`

With unittest.mock you would build this manually by setting \`side_effect\` to the original function and tracking calls -- more boilerplate for the same outcome.

---

## Assertions on Mocks

Assertion methods are part of unittest.mock and therefore available through both APIs. The most useful ones:

\`\`\`python
mock.assert_called()                 # called at least once
mock.assert_called_once()            # called exactly once
mock.assert_called_with(1, key="v")  # last call had these args
mock.assert_called_once_with(1)      # called once AND with these args
mock.assert_not_called()             # never called
mock.assert_any_call(2)              # at least one call had these args
assert mock.call_count == 3          # exact count
print(mock.call_args_list)           # every call recorded
\`\`\`

A common gotcha shared by both: \`assert_called_once_with\` is a real assertion, but if you typo it as \`assert_called_once\` without args, or misspell the method, the mock silently auto-creates that attribute and the "assertion" always passes. Using \`autospec\` or a recent Python that warns on unknown \`assert_*\` access mitigates this.

---

## When to Use Each

| Scenario | Recommended |
|----------|-------------|
| Project already uses pytest | pytest-mock (\`mocker\`) |
| Standard-library-only project (no extra deps) | unittest.mock |
| Using \`unittest.TestCase\` style | unittest.mock |
| Patching many things in one test | pytest-mock (flatter) |
| Want automatic, foolproof teardown | pytest-mock |
| Need to spy on a real function | pytest-mock (\`mocker.spy\`) |
| Writing a reusable library with no pytest dep | unittest.mock |

The decision is rarely about capability -- they are functionally equivalent because pytest-mock wraps unittest.mock. It is about ergonomics and dependencies. If you are already running pytest (and most modern Python projects are -- see our [unittest vs pytest 2026](/blog/unittest-vs-pytest-2026) and [pytest best practices 2026](/blog/pytest-best-practices-2026) guides), reach for \`mocker\` to keep tests flat and cleanup automatic. If you need zero dependencies or you are not on pytest, unittest.mock is always there.

For broader testing patterns and ready-made Python testing skills for AI coding agents, browse the [QASkills directory](/skills) and our [pytest testing complete guide](/blog/python-vs-pytest-explained).

## Patching Attributes and Methods with patch.object

Sometimes you do not want to patch a name by its string path -- you already hold a reference to the object and want to replace one of its attributes. Both libraries expose \`patch.object\` for this, and pytest-mock surfaces it as \`mocker.patch.object\`. It is safer than string patching because if you rename the attribute, your test fails to import rather than silently patching nothing.

\`\`\`python
# unittest.mock
from unittest.mock import patch
import app.service as service

def test_patch_object_unittest():
    with patch.object(service, "get_user", return_value={"tier": "premium"}):
        from app.service import premium_discount
        assert premium_discount(1) == 0.20

# pytest-mock -- same idea, automatic cleanup
def test_patch_object_pytest(mocker):
    mocker.patch.object(service, "get_user", return_value={"tier": "premium"})
    from app.service import premium_discount
    assert premium_discount(1) == 0.20
\`\`\`

A closely related tool is \`PropertyMock\`, used when the thing you need to fake is a property rather than a method. It must be attached to the type, not the instance:

\`\`\`python
from unittest.mock import PropertyMock, patch

class Account:
    @property
    def balance(self):
        return self._load_balance()

def test_property(mocker):
    mock_balance = mocker.patch.object(
        Account, "balance", new_callable=PropertyMock
    )
    mock_balance.return_value = 100
    assert Account().balance == 100
\`\`\`

Both \`patch.object\` and \`PropertyMock\` are unittest.mock features that pytest-mock simply re-exposes -- another reminder that the two are the same engine with different ergonomics.

## Async Mocking

Modern Python code is full of \`async def\` functions, and both approaches handle them through \`AsyncMock\` (added to unittest.mock in Python 3.8). When you patch an async target, \`patch\` and \`mocker.patch\` are smart enough to substitute an \`AsyncMock\` automatically so that \`await\` works correctly.

\`\`\`python
# app/async_service.py
import httpx

async def fetch_user(user_id: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.example.com/users/{user_id}")
        return resp.json()
\`\`\`

\`\`\`python
import pytest
from app import async_service

@pytest.mark.asyncio
async def test_fetch_user(mocker):
    mock_fetch = mocker.patch.object(async_service, "fetch_user")
    mock_fetch.return_value = {"tier": "premium"}  # AsyncMock auto-detected

    result = await async_service.fetch_user(1)
    assert result["tier"] == "premium"
    mock_fetch.assert_awaited_once_with(1)
\`\`\`

Notice \`assert_awaited_once_with\` -- AsyncMock adds await-aware assertion variants (\`assert_awaited\`, \`assert_awaited_once\`, \`await_count\`) on top of the normal call assertions. Because pytest-mock delegates to unittest.mock, all of this is available identically through the \`mocker\` fixture.

## Combining Mocks with pytest Fixtures

One underrated advantage of pytest-mock is how cleanly the \`mocker\` fixture composes with your own fixtures. Because \`mocker\` is just another fixture, you can build a higher-level fixture that pre-configures a mock and hands it to many tests, eliminating repetition while keeping automatic teardown intact.

\`\`\`python
import pytest

@pytest.fixture
def mock_premium_user(mocker):
    mock = mocker.patch("app.service.get_user")
    mock.return_value = {"tier": "premium"}
    return mock

def test_discount_uses_fixture(mock_premium_user):
    from app.service import premium_discount
    assert premium_discount(1) == 0.20
    mock_premium_user.assert_called_once_with(1)

def test_discount_called_twice(mock_premium_user):
    from app.service import premium_discount
    premium_discount(1)
    premium_discount(2)
    assert mock_premium_user.call_count == 2
\`\`\`

Achieving the same reuse with raw unittest.mock means either repeating the patch in every test or building a custom context-manager/setUp helper -- more boilerplate for the same result. This fixture composition is exactly the kind of pattern that makes pytest-mock feel native rather than bolted on. If you want a deeper tour of fixtures, parametrization, and markers, our [pytest best practices 2026](/blog/pytest-best-practices-2026) guide covers them in detail.

## Resetting and Inspecting Mocks

Both libraries let you reset a mock's recorded state mid-test with \`reset_mock()\`, and inspect the full call history through \`call_args\`, \`call_args_list\`, and \`mock_calls\`. These help when one mock is exercised across several phases of a test.

\`\`\`python
def test_reset_and_inspect(mocker):
    mock_get = mocker.patch("app.service.requests.get")
    mock_get(1)
    mock_get(2)
    assert mock_get.call_count == 2
    assert mock_get.call_args_list == [mocker.call(1), mocker.call(2)]

    mock_get.reset_mock()
    assert mock_get.call_count == 0
\`\`\`

Note \`mocker.call\` -- pytest-mock re-exports the \`call\` helper so you do not even need to import it from unittest.mock. Again, the behavior is identical; only the import surface differs.

## Common Pitfalls That Affect Both

The most important rule in Python mocking applies regardless of which library you choose: **patch where the object is looked up, not where it is defined.** If \`app/service.py\` contains \`from data import load\` and calls \`load()\`, you must patch \`app.service.load\`, not \`data.load\`, because the name was bound into the service module's namespace at import time. This single misunderstanding causes the majority of "my mock isn't working" questions, and it is identical for \`patch\` and \`mocker.patch\`.

A second shared pitfall is over-mocking. Mocks that do not use \`autospec\` happily accept any call, so a test can keep passing long after the real interface changed. Reaching for \`autospec=True\` on the boundaries that matter catches drift early. A third is asserting on a mock's auto-created attribute by accident -- typo an assertion method name and it silently passes -- which \`autospec\` and recent Python's spec-aware warnings help surface.

## Frequently Asked Questions

### What is the difference between unittest.mock and pytest-mock?

unittest.mock is Python's built-in mocking library with no dependencies. pytest-mock is a pytest plugin that wraps unittest.mock and exposes it through the \`mocker\` fixture. The key practical difference is that pytest-mock automatically undoes every patch when a test ends, while unittest.mock requires manual cleanup via a decorator, context manager, or \`addCleanup\`.

### Is pytest-mock better than unittest.mock?

Neither is strictly better -- pytest-mock is built on unittest.mock, so they share the same engine. pytest-mock is more convenient inside pytest because it removes cleanup boilerplate and keeps tests flat. unittest.mock is better when you need zero dependencies, are not using pytest, or are writing \`unittest.TestCase\` style tests.

### Do I need pytest-mock if I already have unittest.mock?

No, you do not need it -- everything pytest-mock does is possible with unittest.mock directly. pytest-mock is purely a convenience layer. If you are already running pytest, installing it makes your mocking code cleaner with automatic teardown and a flatter structure, but it adds no new mocking capability beyond \`mocker.spy\` ergonomics.

### Does pytest-mock automatically clean up patches?

Yes. Every patch created through the \`mocker\` fixture is automatically reverted at the end of the test, even if the test fails. This is the main reason pytest users prefer it: you never have to remember to stop a patcher or wrap code in a \`with\` block to ensure the original object is restored.

### What is the mocker fixture in pytest-mock?

\`mocker\` is the single fixture pytest-mock provides. You add it as a test function argument and call methods that mirror unittest.mock exactly: \`mocker.patch\`, \`mocker.Mock\`, \`mocker.MagicMock\`, \`mocker.patch.object\`, and \`mocker.spy\`. It tracks and tears down all patches automatically when the test completes.

### When should I use MagicMock instead of Mock?

Use MagicMock when the code under test relies on Python magic methods -- iteration, \`len()\`, indexing, or context managers (\`with\`). MagicMock pre-configures those dunder methods, while plain Mock raises errors when they are used. Use plain Mock when you want unexpected dunder usage to fail loudly. Both \`patch\` and \`mocker.patch\` default to MagicMock.

### How do I mock requests.get in pytest?

Patch the name where it is used, not where it is defined. If your module does \`import requests\` and calls \`requests.get\`, write \`mocker.patch("yourmodule.requests.get")\` and set its \`return_value\` or \`side_effect\`. The same applies to unittest.mock with \`@patch("yourmodule.requests.get")\`. Mocking the import location is the most common beginner mistake.

### Can I use pytest-mock and unittest.mock together?

Yes, freely. Because pytest-mock wraps unittest.mock, the \`Mock\` and \`MagicMock\` objects are the same class, and all assertion methods behave identically. You can import \`MagicMock\` from unittest.mock for type hints or construction while still using \`mocker.patch\` for the patching and automatic cleanup. They interoperate seamlessly.

## Conclusion

The unittest.mock vs pytest-mock question has a satisfying answer: they are the same engine with different ergonomics. unittest.mock is the dependency-free standard-library foundation that works everywhere; pytest-mock is the pytest-native wrapper that removes cleanup boilerplate and keeps multi-patch tests flat. Choose pytest-mock when you already run pytest and want automatic teardown; choose unittest.mock when you need zero dependencies or are outside the pytest ecosystem.

Master both and your Python tests become faster to write and easier to maintain. To level up further, read our [pytest best practices 2026](/blog/pytest-best-practices-2026) guide and explore Python testing skills built for AI coding agents in the [QASkills directory](/skills).
`,
};
