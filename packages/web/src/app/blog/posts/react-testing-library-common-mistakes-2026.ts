import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "React Testing Library Common Mistakes to Avoid in 2026",
  description: "Fix the most common React Testing Library mistakes in 2026 — the \"not wrapped in act()\" warning, getByRole priority, waitFor misuse, and cleanup pitfalls.",
  date: "2026-06-15",
  category: "JavaScript",
  content: `# React Testing Library Common Mistakes to Avoid in 2026

The most common React Testing Library mistakes are: ignoring the "not wrapped in act(...)" warning (a sign a state update happened after the test thought it was done), querying by test id or class instead of \`getByRole\`, putting assertions or side effects inside \`waitFor\`, and forgetting that \`userEvent\` is asynchronous. RTL is designed so that if you query the way a user perceives the UI and \`await\` user interactions, most of these problems disappear. This guide walks through each mistake, shows the wrong and right code, and explains the reasoning so you can avoid them for good.

## Mistake 1: Ignoring the "not wrapped in act(...)" warning

This is the warning everyone hits:

\`\`\`text
Warning: An update to MyComponent inside a test was not wrapped in act(...).
\`\`\`

It does **not** mean "you forgot to call \`act()\`." In modern RTL, \`render\`, \`fireEvent\`, and \`userEvent\` already wrap their work in \`act()\` for you. The warning almost always means a **state update happened after your test stopped waiting** — typically a resolved promise (a fetch, a \`setTimeout\`, a debounce) updating state once the test body had already finished its synchronous assertions.

The fix is not to sprinkle \`act()\` everywhere. The fix is to **wait for the result of the async work** so the update happens inside the test's awaited window:

\`\`\`jsx
// Wrong — assertion runs before the fetch resolves; the later setState triggers the warning
test('shows the user name', () => {
  render(<Profile id="42" />);
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument(); // not there yet
});

// Right — await a finder so the state update is captured
test('shows the user name', async () => {
  render(<Profile id="42" />);
  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
});
\`\`\`

\`findBy*\` queries return a promise that resolves once the element appears (they are \`getBy*\` + \`waitFor\` under the hood). Awaiting one lets React's state update settle inside the act-wrapped window, and the warning goes away. If the update is from a timer, advance fake timers inside an \`act()\` wrapper — but reach for that only when there is no user-visible result to wait for.

When you *do* need a manual wrap, import it from the right place:

\`\`\`jsx
import { act } from 'react'; // modern React exposes act from the main package
\`\`\`

## Mistake 2: Reaching for getByTestId instead of getByRole

RTL ships a deliberate query priority order. The whole philosophy is that tests should resemble how users — including users of assistive technology — find elements. Test ids are last because they are invisible to real users.

The recommended order, from most to least preferred:

| Priority | Query | Finds elements by |
|---|---|---|
| 1 | \`getByRole\` | ARIA role + accessible name (the main workhorse) |
| 2 | \`getByLabelText\` | Form labels (best for inputs) |
| 3 | \`getByPlaceholderText\` | Placeholder (only if no label) |
| 4 | \`getByText\` | Visible text (non-interactive content) |
| 5 | \`getByDisplayValue\` | Current value of a filled-in form field |
| 6 | \`getByAltText\` | \`alt\` on images |
| 7 | \`getByTitle\` | \`title\` attribute |
| 8 | \`getByTestId\` | \`data-testid\` (escape hatch only) |

So instead of this:

\`\`\`jsx
// Wrong — couples the test to an implementation detail
const button = screen.getByTestId('submit-btn');
\`\`\`

prefer this:

\`\`\`jsx
// Right — finds the button the way a user (or screen reader) would
const button = screen.getByRole('button', { name: /submit/i });
\`\`\`

The \`name\` option matches the element's **accessible name**, which for a button is its text content (or \`aria-label\`). This single query also acts as an accessibility check: if \`getByRole('button', { name: /submit/i })\` fails, your button probably has no accessible name, which is a real bug for assistive tech. Reserve \`getByTestId\` for elements with no role and no text — a styling wrapper \`<div>\`, for example. For more on accessibility-first selectors across tools, browse the [QA skills directory](/skills).

A helpful debugging trick: when a role query fails, call \`screen.logTestingPlaygroundURL()\` or \`screen.getByRole('foo')\` with a bogus role — RTL prints every available role and accessible name in the current DOM, so you can see exactly what to query.

## Mistake 3: Putting assertions and side effects inside waitFor

\`waitFor\` retries its callback until it stops throwing. That design has two consequences people violate constantly.

**Do not put multiple assertions inside one \`waitFor\`.** If the first assertion passes but the second fails, \`waitFor\` keeps retrying the *whole* callback until timeout, turning a fast failure into a slow one and producing a confusing error.

\`\`\`jsx
// Wrong — both assertions retried; slow, noisy failures
await waitFor(() => {
  expect(screen.getByText('Saved')).toBeInTheDocument();
  expect(mockSave).toHaveBeenCalledTimes(1);
});
\`\`\`

\`\`\`jsx
// Right — wait for one thing, then assert the rest synchronously
await screen.findByText('Saved');
expect(mockSave).toHaveBeenCalledTimes(1);
\`\`\`

**Do not put side effects inside \`waitFor\`.** Because the callback runs many times, a \`fireEvent\` or \`userEvent\` inside it fires repeatedly. Keep \`waitFor\` callbacks to pure assertions only.

\`\`\`jsx
// Wrong — the click may fire several times
await waitFor(() => {
  fireEvent.click(button);
  expect(something).toBeTrue();
});
\`\`\`

The cleanest mental model: prefer \`findBy*\` to wait for an element to **appear**, use \`waitForElementToBeRemoved\` to wait for one to **disappear**, and only fall back to a bare \`waitFor(() => expect(...))\` when you are waiting on something that is not a DOM-presence change (like a mock having been called). Never use \`waitFor\` to assert that something is *absent* — it will pass immediately on the first tick before the thing has had a chance to appear; use \`findBy*\` then \`expect(...).not.toBeInTheDocument()\` patterns carefully, or assert absence synchronously after an awaited anchor.

## Mistake 4: Forgetting userEvent is asynchronous

In \`@testing-library/user-event\` v14+, every interaction returns a promise and **must be awaited**. The API also requires setting up a session with \`userEvent.setup()\` before rendering. Forgetting either causes events to be only partially processed, which then resurfaces as the act warning from Mistake 1.

\`\`\`jsx
import userEvent from '@testing-library/user-event';

// Wrong — no setup, no await
test('types into the field', () => {
  render(<Form />);
  userEvent.type(screen.getByRole('textbox'), 'hello');
  expect(screen.getByRole('textbox')).toHaveValue('hello');
});

// Right — setup once, await every interaction
test('types into the field', async () => {
  const user = userEvent.setup();
  render(<Form />);
  await user.type(screen.getByRole('textbox', { name: /name/i }), 'hello');
  expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('hello');
});
\`\`\`

\`userEvent\` simulates a real user far more faithfully than \`fireEvent\` — it dispatches the full sequence of events (\`pointerdown\`, \`mousedown\`, \`focus\`, \`keydown\`, etc.) and respects things like \`disabled\` and \`pointer-events\`. Prefer \`userEvent\` for interactions and reserve \`fireEvent\` for low-level events \`userEvent\` cannot express. If you are evaluating interaction libraries side by side, see our [framework comparison hub](/compare).

## Mistake 5: Manual cleanup (or expecting none)

A frequent confusion is whether you must call \`cleanup()\` yourself. With any of the standard test runners (Jest, Vitest, Mocha) configured for RTL, **cleanup runs automatically after each test** via an injected \`afterEach\`. You should *not* call \`cleanup()\` manually in that setup, and you should *not* disable it — doing so leaves multiple component trees mounted, so a second \`getByRole('button')\` throws "found multiple elements."

\`\`\`text
TestingLibraryElementError: Found multiple elements with the role "button"
\`\`\`

If you see that and you only rendered one component, you have **leaked a previous render** — usually because auto-cleanup is off (you imported from \`@testing-library/react/pure\`, or your runner's globals are not enabled). The fix is to use the normal entry point and ensure your test environment injects the \`afterEach\`. Only the \`/pure\` entry point skips auto-cleanup, and then it is your job to call \`cleanup()\` yourself.

## Mistake 6: Testing implementation details instead of behavior

RTL exists to push you toward behavioral tests. Two anti-patterns recur:

- **Querying the container with \`container.querySelector('.my-class')\`.** This couples tests to CSS that designers change freely. Query by role/label/text instead.
- **Asserting on component internals** (state, props, instance methods). RTL gives you no API for this on purpose. Assert on what the user sees: rendered text, enabled/disabled controls, and which elements are present.

A behavior-first test reads like a user story:

\`\`\`jsx
test('disables submit until both fields are filled', async () => {
  const user = userEvent.setup();
  render(<SignupForm />);

  const submit = screen.getByRole('button', { name: /sign up/i });
  expect(submit).toBeDisabled();

  await user.type(screen.getByRole('textbox', { name: /email/i }), 'a@b.com');
  await user.type(screen.getByLabelText(/password/i), 'hunter2!');

  expect(submit).toBeEnabled();
});
\`\`\`

## A realistic end-to-end example

Putting it all together for a component that fetches and renders data:

\`\`\`jsx
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserList } from '../src/UserList';

test('loads users and lets you filter them', async () => {
  const user = userEvent.setup();
  render(<UserList />);

  // 1. Wait for the loading state to disappear (don't assert absence prematurely)
  await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

  // 2. The data has rendered — assert with a role query
  expect(screen.getByRole('listitem', { name: /ada lovelace/i })).toBeInTheDocument();

  // 3. Interact, awaiting userEvent
  await user.type(screen.getByRole('searchbox', { name: /filter/i }), 'grace');

  // 4. Wait for the filtered result with a finder, then assert the rest sync
  expect(await screen.findByRole('listitem', { name: /grace hopper/i })).toBeInTheDocument();
  expect(screen.queryByRole('listitem', { name: /ada lovelace/i })).not.toBeInTheDocument();
});
\`\`\`

Every async boundary is awaited, every element is found by role + accessible name, assertions live outside \`waitFor\`, and there is no manual \`act()\` or \`cleanup()\` in sight. That is idiomatic RTL.

## CI usage

RTL tests run under your normal test command in CI. The two things worth pinning are the DOM environment and the matchers. With Jest, set \`testEnvironment: 'jsdom'\` and import \`@testing-library/jest-dom\` in your after-framework setup file so matchers like \`toBeInTheDocument\` and \`toBeDisabled\` are registered. Under Vitest, set \`environment: 'jsdom'\` in \`vitest.config.ts\` and import the matchers in \`setupFiles\`. Run with the runner's CI flag so snapshots are not silently written:

\`\`\`yaml
- name: Test
  run: npx vitest run   # or: npx jest --ci
\`\`\`

If a test passes locally but the act warning appears only in CI, you almost certainly have an unawaited async update; convert the relevant assertion to a \`findBy*\` query.

## Common errors and troubleshooting

**"not wrapped in act(...)"** — An async state update settled after the test ended. Await a \`findBy*\` query or \`waitForElementToBeRemoved\` so the update lands inside the awaited window.

**"Found multiple elements with the role…"** — A previous render leaked. Confirm auto-cleanup is active (use the standard entry point, not \`/pure\`) and your runner's \`afterEach\` is injected.

**"Unable to find an element with the role…"** — The element lacks that role or accessible name. Trigger RTL's role dump (query a bogus role) to list available roles, then adjust the query or fix the missing label.

**A \`userEvent\` interaction seems to do nothing** — You forgot \`await\` or \`userEvent.setup()\`. Both are required in v14+.

**\`waitFor\` times out slowly on a failing assertion** — You put multiple assertions in one \`waitFor\`. Wait for a single anchor with \`findBy*\`, then assert the rest synchronously.

For more testing patterns and library deep-dives, browse the [blog](/blog).

## Frequently Asked Questions

### How do I fix the "not wrapped in act(...)" warning in React Testing Library?

The warning means a state update happened after your test stopped waiting — usually a resolved fetch or timer updating state once your synchronous assertions had already run. Fix it by awaiting an async query such as \`await screen.findByText(...)\` or \`await waitForElementToBeRemoved(...)\`, so the update settles inside the test's awaited window. You rarely need to call \`act()\` manually, because \`render\`, \`fireEvent\`, and \`userEvent\` already wrap their work in \`act()\`.

### Why does React Testing Library recommend getByRole over getByTestId?

\`getByRole\` finds elements the way a real user or screen reader does — by ARIA role and accessible name — so your tests verify behavior and accessibility at the same time. \`getByTestId\` relies on \`data-testid\`, which is invisible to users and couples the test to implementation details. RTL's query priority lists test ids last; reserve them for elements that genuinely have no role and no text.

### Can I put multiple assertions inside waitFor?

You should not. \`waitFor\` retries its entire callback until it stops throwing, so if a later assertion fails it keeps retrying every assertion until timeout, turning a quick failure into a slow, confusing one. Instead, wait for a single anchor with \`await screen.findBy...\`, then run the remaining assertions synchronously afterward. Keep \`waitFor\` callbacks free of side effects too, since they run many times.

### Do I need to call cleanup() in React Testing Library?

No, not with the standard setup. When RTL is used with Jest, Vitest, or Mocha and globals are enabled, \`cleanup()\` runs automatically after every test via an injected \`afterEach\`. Calling it manually is unnecessary, and the only time you must call it yourself is when you import from the \`@testing-library/react/pure\` entry point, which deliberately disables auto-cleanup.

### Why is my userEvent interaction not working?

In \`@testing-library/user-event\` v14 and later, every interaction is asynchronous and must be awaited, and you must create a session with \`userEvent.setup()\` before rendering. If you forget either, events are only partially processed and you often see the "not wrapped in act(...)" warning as a side effect. Write \`const user = userEvent.setup()\` once, then \`await user.click(...)\` or \`await user.type(...)\`.

### When should I use fireEvent instead of userEvent?

Prefer \`userEvent\` for almost all interactions because it simulates a real user faithfully, dispatching the full event sequence and respecting \`disabled\` and \`pointer-events\`. Reach for \`fireEvent\` only for low-level or unusual DOM events that \`userEvent\` does not model, such as dispatching a specific \`scroll\` or \`transitionEnd\` event. For clicks, typing, hovering, and keyboard navigation, \`userEvent\` is the correct choice.
`,
};
