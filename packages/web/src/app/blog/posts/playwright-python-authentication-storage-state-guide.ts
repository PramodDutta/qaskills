import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Python Authentication with storage_state Explained',
  description:
    'Master Playwright Python authentication using storage_state. Save login once, reuse cookies and localStorage across tests with pytest fixtures and worker scope.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# Playwright Python Authentication with storage_state

Authentication is the single most expensive step in most end-to-end test suites. If every test logs in through the UI -- filling a username, typing a password, waiting for redirects -- you pay that cost on every single test. With a suite of 200 tests, a three-second login adds ten minutes of pure overhead before a single assertion runs. Playwright solves this problem elegantly in Python with **storage_state**: you authenticate once, serialize the browser's cookies and localStorage to a JSON file, then reuse that authenticated state across every test that needs it.

This guide is a complete, runnable reference for Playwright Python authentication using \`storage_state\`. We will cover the underlying mechanics of what \`storage_state\` actually captures, how to save it both manually and programmatically, how to inject it into a fresh \`browser.new_context()\`, and how to wire the whole thing into clean pytest fixtures. We will also cover the trickier real-world scenarios: multiple user roles, token expiry, parallel workers each needing their own session, and storing JWTs that live in localStorage rather than cookies. Every code block here runs against a real Playwright install (\`pip install playwright pytest-playwright && playwright install\`). By the end you will have a battle-tested authentication layer that turns a ten-minute login tax into a one-time, sub-second setup. If you want a ready-made starting point, the [playwright-python skill](/skills) on QASkills ships these exact patterns.

## What storage_state Actually Captures

Before writing any code, it helps to understand precisely what \`storage_state\` serializes. When you call \`context.storage_state(path="state.json")\`, Playwright writes a JSON document containing two things: **cookies** and **origins**. Cookies are the familiar HTTP cookies -- session IDs, CSRF tokens, anything the server set via \`Set-Cookie\`. Origins is an array, one entry per web origin, each holding that origin's **localStorage** key-value pairs.

Here is what a saved \`state.json\` looks like:

\`\`\`json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "eyJhbGciOiJIUzI1...",
      "domain": "app.example.com",
      "path": "/",
      "expires": 1780000000,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://app.example.com",
      "localStorage": [
        { "name": "auth_token", "value": "eyJ1c2VyIjoxMjN9" },
        { "name": "feature_flags", "value": "{\\"newUi\\":true}" }
      ]
    }
  ]
}
\`\`\`

Two things are worth calling out. First, \`storage_state\` does **not** capture \`sessionStorage\` -- only \`localStorage\`. If your app stores its token in \`sessionStorage\`, you will need a different approach (covered later). Second, \`httpOnly\` cookies are captured fine; Playwright reads them at the browser-context level, not via JavaScript, so the \`httpOnly\` flag does not block you. This makes \`storage_state\` reliable for the common case of server-set session cookies.

## Saving Authentication State Programmatically

The most common pattern is a setup script that logs in once and writes \`state.json\`. Run this once, then every test reuses the file. Here is a complete, runnable login script:

\`\`\`python
# save_auth.py
from playwright.sync_api import sync_playwright

STATE_PATH = "state.json"
BASE_URL = "https://practice.qaskills.sh"

def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto(f"{BASE_URL}/login")
        page.get_by_label("Email").fill("qa.user@example.com")
        page.get_by_label("Password").fill("Sup3rS3cret!")
        page.get_by_role("button", name="Sign in").click()

        # Wait for an element that only exists after successful login.
        page.wait_for_url(f"{BASE_URL}/dashboard")
        page.get_by_role("heading", name="Welcome back").wait_for()

        # Serialize cookies + localStorage to disk.
        context.storage_state(path=STATE_PATH)
        print(f"Saved authenticated state to {STATE_PATH}")

        context.close()
        browser.close()

if __name__ == "__main__":
    main()
\`\`\`

The critical line is \`page.wait_for_url(...)\` followed by waiting for a post-login heading. **Never save state before the login has fully completed.** If you serialize too early, the cookie may not be set yet and you will save an unauthenticated state that fails mysteriously in every test. Always anchor the save to a web-first assertion that proves you are logged in.

Run it with \`python save_auth.py\`. You now have a \`state.json\` you can commit to a fixture directory (but never to source control if it holds real secrets -- add it to \`.gitignore\`).

## Reusing State with browser.new_context(storage_state=path)

Loading the saved state is a single argument. When you create a context, pass \`storage_state\`:

\`\`\`python
# test_dashboard.py
from playwright.sync_api import sync_playwright

def test_dashboard_loads_authenticated() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # The magic line: hydrate cookies + localStorage from disk.
        context = browser.new_context(storage_state="state.json")
        page = context.new_page()

        page.goto("https://practice.qaskills.sh/dashboard")
        # No login step -- we are already authenticated.
        assert page.get_by_role("heading", name="Welcome back").is_visible()

        context.close()
        browser.close()
\`\`\`

Notice there is **zero login code** in the test. The context starts pre-authenticated. You can pass either a file path (\`storage_state="state.json"\`) or an in-memory dict (\`storage_state=my_dict\`). The dict form is useful when you generate the state via an API call rather than the UI -- more on that below.

You can also combine \`storage_state\` with other context options. This is common when you need a specific viewport or locale alongside authentication:

\`\`\`python
context = browser.new_context(
    storage_state="state.json",
    viewport={"width": 1440, "height": 900},
    locale="en-US",
    timezone_id="America/New_York",
)
\`\`\`

## The pytest Fixture Pattern (session scope)

Hand-managing browsers in every test is tedious. The \`pytest-playwright\` plugin gives you \`browser\`, \`context\`, and \`page\` fixtures out of the box, and lets you customize context creation via \`browser_context_args\`. The cleanest pattern is a **session-scoped** fixture that logs in once for the entire test run, plus an override that feeds the saved state into every context.

\`\`\`python
# conftest.py
import pytest
from pathlib import Path
from playwright.sync_api import Browser

STATE_PATH = Path("state.json")
BASE_URL = "https://practice.qaskills.sh"

@pytest.fixture(scope="session")
def auth_state(browser: Browser) -> str:
    """Log in exactly once per test session, return the state path."""
    if STATE_PATH.exists():
        return str(STATE_PATH)

    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{BASE_URL}/login")
    page.get_by_label("Email").fill("qa.user@example.com")
    page.get_by_label("Password").fill("Sup3rS3cret!")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(f"{BASE_URL}/dashboard")

    context.storage_state(path=str(STATE_PATH))
    context.close()
    return str(STATE_PATH)

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, auth_state):
    """Inject the saved auth state into every context pytest-playwright builds."""
    return {**browser_context_args, "storage_state": auth_state}
\`\`\`

With this \`conftest.py\` in place, **every** test automatically receives an authenticated \`page\`:

\`\`\`python
# test_authenticated_flows.py
from playwright.sync_api import Page, expect

def test_profile_shows_user_email(page: Page) -> None:
    page.goto("https://practice.qaskills.sh/profile")
    expect(page.get_by_test_id("user-email")).to_have_text("qa.user@example.com")

def test_can_open_settings(page: Page) -> None:
    page.goto("https://practice.qaskills.sh/settings")
    expect(page.get_by_role("heading", name="Account Settings")).to_be_visible()
\`\`\`

Both tests skip login entirely. The first test that runs triggers \`auth_state\`, which logs in once; every subsequent test reuses \`state.json\`. This is the single highest-leverage optimization you can make to a Playwright Python suite.

## Choosing the Right Fixture Scope

Fixture scope determines how often the expensive login runs and how isolated your tests are. The table below summarizes the trade-offs.

| Scope | Login frequency | Isolation | Best for |
|---|---|---|---|
| \`function\` | Every test | Maximum | Tests that mutate the session (logout flows) |
| \`class\` | Once per test class | Moderate | Grouped tests sharing setup |
| \`module\` | Once per file | Moderate | A file of read-only tests |
| \`session\` | Once per run | Lowest | Large read-only suites (most common) |

For the overwhelming majority of authenticated tests -- which only read data and never log out -- **session scope wins** because login happens exactly once. The exception is any test that destroys the session (testing the logout button, testing token revocation). Those tests should use a function-scoped context with a fresh login, so they do not poison the shared state file.

## Handling Multiple User Roles

Real apps have admins, regular users, and guests. You need a distinct \`storage_state\` per role. The clean pattern is one state file per role and parametrized or named fixtures:

\`\`\`python
# conftest.py (multi-role)
import pytest
from pathlib import Path
from playwright.sync_api import Browser

BASE_URL = "https://practice.qaskills.sh"

CREDENTIALS = {
    "admin": ("admin@example.com", "AdminP@ss1"),
    "member": ("qa.user@example.com", "Sup3rS3cret!"),
}

def _login_and_save(browser: Browser, role: str) -> str:
    path = Path(f"state-{role}.json")
    if path.exists():
        return str(path)
    email, password = CREDENTIALS[role]
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{BASE_URL}/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(f"{BASE_URL}/dashboard")
    context.storage_state(path=str(path))
    context.close()
    return str(path)

@pytest.fixture(scope="session")
def admin_page(browser: Browser):
    state = _login_and_save(browser, "admin")
    context = browser.new_context(storage_state=state)
    page = context.new_page()
    yield page
    context.close()

@pytest.fixture(scope="session")
def member_page(browser: Browser):
    state = _login_and_save(browser, "member")
    context = browser.new_context(storage_state=state)
    page = context.new_page()
    yield page
    context.close()
\`\`\`

Now tests request the role they need:

\`\`\`python
def test_admin_sees_user_management(admin_page):
    admin_page.goto("https://practice.qaskills.sh/admin/users")
    assert admin_page.get_by_role("heading", name="User Management").is_visible()

def test_member_cannot_access_admin(member_page):
    member_page.goto("https://practice.qaskills.sh/admin/users")
    assert member_page.get_by_text("403 Forbidden").is_visible()
\`\`\`

## Bypassing the UI: Save State via an API Login

Logging in through the UI is slow and brittle -- it breaks whenever the login form changes. If your backend exposes a login API that returns a session cookie or token, you can authenticate via an HTTP request and construct \`storage_state\` directly, never touching the login page. This is the fastest possible authentication.

\`\`\`python
# api_auth.py
import json
from playwright.sync_api import sync_playwright

BASE_URL = "https://practice.qaskills.sh"

def save_state_via_api() -> None:
    with sync_playwright() as p:
        request = p.request.new_context(base_url=BASE_URL)
        # Hit the login endpoint directly; cookies land in the request context.
        resp = request.post("/api/login", data={
            "email": "qa.user@example.com",
            "password": "Sup3rS3cret!",
        })
        assert resp.ok, f"Login failed: {resp.status}"

        # storage_state() on a request context returns cookies set by the API.
        request.storage_state(path="state.json")
        request.dispose()

if __name__ == "__main__":
    save_state_via_api()
\`\`\`

For token-in-localStorage apps (most SPAs using JWTs), the API returns a token in the JSON body and you must inject it into localStorage yourself. Build the state dict by hand:

\`\`\`python
# jwt_auth.py
import json, requests

resp = requests.post("https://practice.qaskills.sh/api/login", json={
    "email": "qa.user@example.com",
    "password": "Sup3rS3cret!",
})
token = resp.json()["accessToken"]

state = {
    "cookies": [],
    "origins": [{
        "origin": "https://practice.qaskills.sh",
        "localStorage": [{"name": "accessToken", "value": token}],
    }],
}

with open("state.json", "w") as f:
    json.dump(state, f)
\`\`\`

Then load it exactly as before with \`browser.new_context(storage_state="state.json")\`. The browser opens with the JWT already in localStorage, and your SPA treats you as logged in.

## Parallel Workers and pytest-xdist

When you run tests in parallel with \`pytest -n 4\` (via \`pytest-xdist\`), four worker processes run simultaneously. A single shared \`state.json\` is fine if all tests are read-only and use the same user. But if tests mutate shared server-side state, you want each worker to use a **distinct account** so they do not collide. Use the \`worker_id\` fixture that xdist provides:

\`\`\`python
# conftest.py (per-worker auth)
import pytest
from pathlib import Path
from playwright.sync_api import Browser

BASE_URL = "https://practice.qaskills.sh"

@pytest.fixture(scope="session")
def worker_state(browser: Browser, worker_id: str) -> str:
    # worker_id is "master" without xdist, "gw0", "gw1", ... with it.
    path = Path(f"state-{worker_id}.json")
    if path.exists():
        return str(path)
    # Map each worker to its own seeded account.
    email = f"qa.{worker_id}@example.com" if worker_id != "master" else "qa.user@example.com"
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{BASE_URL}/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill("Sup3rS3cret!")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(f"{BASE_URL}/dashboard")
    context.storage_state(path=str(path))
    context.close()
    return str(path)

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, worker_state):
    return {**browser_context_args, "storage_state": worker_state}
\`\`\`

Each worker now logs in with its own account once and writes its own state file (\`state-gw0.json\`, \`state-gw1.json\`, ...). No collisions, full parallelism, one login per worker.

## Handling Token Expiry and Stale State

Saved state goes stale. Session cookies expire, JWTs have a TTL, and a \`state.json\` saved yesterday may be rejected today. There are two robust strategies. First, **regenerate on every CI run** -- delete the state file at the start of the pipeline so the session fixture always logs in fresh. Second, **validate and refresh on load**: hit a cheap authenticated endpoint, and if it returns 401, re-login.

\`\`\`python
# refresh_if_stale.py
from pathlib import Path
from playwright.sync_api import sync_playwright

STATE = Path("state.json")
BASE_URL = "https://practice.qaskills.sh"

def state_is_valid() -> bool:
    if not STATE.exists():
        return False
    with sync_playwright() as p:
        request = p.request.new_context(
            base_url=BASE_URL, storage_state=str(STATE)
        )
        resp = request.get("/api/me")
        request.dispose()
        return resp.status == 200
\`\`\`

In CI, the simplest reliable approach is to **not commit \`state.json\`** and always regenerate. Add it to \`.gitignore\` and let the session fixture create it on first use. This guarantees you never run against an expired session.

## Async Playwright: The Same Pattern with async/await

Everything above used the synchronous Playwright API, which is the most common choice for pytest. If your project uses the async API (for example, you are integrating with an async web framework or want concurrency within a test), the \`storage_state\` pattern is identical -- you just \`await\` the calls. Here is the async equivalent of saving and loading state:

\`\`\`python
# async_auth.py
import asyncio
from playwright.async_api import async_playwright

BASE_URL = "https://practice.qaskills.sh"

async def save_state() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto(f"{BASE_URL}/login")
        await page.get_by_label("Email").fill("qa.user@example.com")
        await page.get_by_label("Password").fill("Sup3rS3cret!")
        await page.get_by_role("button", name="Sign in").click()
        await page.wait_for_url(f"{BASE_URL}/dashboard")
        await context.storage_state(path="state.json")
        await browser.close()

async def use_state() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(storage_state="state.json")
        page = await context.new_page()
        await page.goto(f"{BASE_URL}/dashboard")
        assert await page.get_by_role("heading", name="Welcome back").is_visible()
        await browser.close()

asyncio.run(save_state())
asyncio.run(use_state())
\`\`\`

For async pytest, use \`pytest-asyncio\` and the async \`pytest-playwright\` fixtures; the \`browser_context_args\` override approach works the same way. The takeaway is that \`storage_state\` is a context-level concept independent of sync versus async -- the serialization format and the \`new_context(storage_state=...)\` argument are identical in both worlds.

## Security: Treating State Files as Credentials

A saved \`state.json\` is not a config file -- it is a live credential. Anyone holding it can impersonate the logged-in user until the session expires. Treat it with the same care as a password or API key. Three concrete rules keep you safe.

First, **never commit it**. Add \`state*.json\` and \`playwright/.auth/\` to \`.gitignore\` so it cannot be accidentally pushed. A leaked session token in git history is a real incident. Second, **use a dedicated test account**, never a real user's or an admin's production credentials. The blast radius of a leaked test-account session should be near zero. Third, in CI, **inject credentials via secrets** and generate state at runtime rather than storing a state file anywhere persistent.

\`\`\`python
# conftest.py (credentials from environment, never hard-coded)
import os
import pytest
from playwright.sync_api import Browser

BASE_URL = os.environ["APP_BASE_URL"]

@pytest.fixture(scope="session")
def auth_state(browser: Browser) -> str:
    email = os.environ["TEST_USER_EMAIL"]
    password = os.environ["TEST_USER_PASSWORD"]
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{BASE_URL}/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url(f"{BASE_URL}/dashboard")
    context.storage_state(path="state.json")
    context.close()
    return "state.json"
\`\`\`

Pulling \`TEST_USER_EMAIL\`, \`TEST_USER_PASSWORD\`, and \`APP_BASE_URL\` from the environment means no secret ever lives in the repository, and CI provides them through its secrets mechanism. Combined with regenerating state per run, this gives you an authentication layer that is both fast and safe.

## Common Mistakes and How to Avoid Them

The table below lists the failures we see most often and the fix for each.

| Symptom | Root cause | Fix |
|---|---|---|
| Tests redirect to /login | State saved before login completed | Add \`wait_for_url\` before \`storage_state()\` |
| Works locally, fails in CI | Committed a stale \`state.json\` | Gitignore it; regenerate per run |
| Token missing after load | App uses \`sessionStorage\`, not localStorage | Inject token via \`add_init_script\` instead |
| Parallel tests corrupt data | Shared account across workers | Per-worker accounts keyed on \`worker_id\` |
| 401 mid-run | Short-lived token expired | Use API login or validate-and-refresh |

For the \`sessionStorage\` case specifically, since \`storage_state\` cannot capture it, use \`context.add_init_script\` to set it on every page before any script runs:

\`\`\`python
context = browser.new_context()
context.add_init_script("""
  window.sessionStorage.setItem('accessToken', 'YOUR_TOKEN_HERE');
""")
\`\`\`

## Frequently Asked Questions

### Does storage_state capture sessionStorage?

No. Playwright's \`storage_state\` serializes cookies and localStorage only -- \`sessionStorage\` is explicitly excluded. If your application stores its auth token in \`sessionStorage\`, inject it manually using \`context.add_init_script()\`, which runs before page scripts and can call \`window.sessionStorage.setItem()\` on every navigation. This reliably restores session-scoped tokens that \`storage_state\` cannot.

### Should I commit state.json to git?

No, never commit \`state.json\` if it contains real session tokens or cookies -- it is effectively a stolen credential. Add it to \`.gitignore\` and let your session-scoped pytest fixture regenerate it on first run. In CI, delete any cached state at the start of the pipeline so every run authenticates fresh and you never test against an expired or leaked session.

### How do I authenticate without using the login UI?

Use Playwright's request context to call your backend login endpoint directly, then save the resulting cookies with \`request.storage_state(path=...)\`. For SPAs that return a JWT, parse the token from the response body and build the \`storage_state\` dict by hand, placing the token in the \`localStorage\` array. This skips the slow, brittle UI login entirely and is the fastest authentication method.

### What fixture scope should I use for authentication?

Use \`session\` scope for the overwhelming majority of authenticated tests, since they only read data and never destroy the session -- this means login happens exactly once per run. Switch to \`function\` scope only for tests that mutate the session itself, such as logout flows or token-revocation tests, so they do not corrupt the shared state file that other tests depend on.

### How do I handle multiple user roles like admin and member?

Save one \`storage_state\` file per role (for example \`state-admin.json\` and \`state-member.json\`) using separate session-scoped fixtures, each logging in with that role's credentials. Tests then request the fixture matching the role they need, such as \`admin_page\` or \`member_page\`. This keeps role sessions fully isolated and lets you verify permission boundaries cleanly.

### Why do my tests redirect to the login page even with storage_state?

The most common cause is saving state before login completed. If you serialize immediately after clicking "Sign in," the session cookie may not be set yet, so you save an unauthenticated state. Always anchor the save to a post-login signal -- call \`page.wait_for_url("/dashboard")\` and wait for an element that only exists when authenticated before calling \`context.storage_state()\`.

### How do I keep parallel pytest-xdist workers from colliding?

Give each worker its own account and its own state file keyed on the \`worker_id\` fixture (\`gw0\`, \`gw1\`, and so on). Each worker logs in once with a distinct seeded account and writes \`state-gw0.json\`, \`state-gw1.json\`, etc. This prevents two workers from mutating the same server-side data simultaneously while preserving one login per worker and full parallelism.

### What happens when the saved token expires mid-run?

A short-lived token can expire during a long suite, producing sudden 401 errors. The robust fixes are to authenticate via a fast API call so login is cheap to repeat, or to validate the saved state before use by hitting an endpoint like \`/api/me\` and re-logging in if it returns 401. In CI, regenerating state on every run sidesteps expiry entirely.

## Conclusion

Playwright Python's \`storage_state\` is the difference between a suite that wastes ten minutes logging in and one that authenticates once in under a second. The core pattern is simple: log in once, call \`context.storage_state(path="state.json")\`, then hydrate every test with \`browser.new_context(storage_state="state.json")\`. Wrap it in a session-scoped pytest fixture via \`browser_context_args\` and every test becomes authenticated for free. From there, layer in per-role state files, per-worker accounts for parallel runs, API-based login to skip the UI, and validate-and-refresh logic for token expiry.

Start with the session-scoped fixture today -- it is the single highest-leverage change you can make to a Playwright Python suite. Then explore the [playwright-python skill](/skills) on QASkills for a complete, drop-in authentication layer, and browse the full [QA skills catalog](/skills) or read more Playwright deep-dives on the [QASkills blog](/blog).
`,
};
