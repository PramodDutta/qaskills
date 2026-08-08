import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Clock Tick Time Travel for Deterministic Timer Tests',
  description: 'Use Cypress clock tick time travel to test debounce, expiry, polling, and countdowns instantly with correct setup order and deterministic assertions.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Cypress Clock Tick Time Travel for Deterministic Timer Tests

Cypress clock tick time travel replaces browser time functions with a controllable clock, then advances scheduled timers without making the test wait in real time. Call \`cy.clock(startTime)\` before \`cy.visit()\` or \`cy.mount()\`, trigger the behavior that registers a timer, call \`cy.tick(milliseconds)\`, and assert the user-visible result. Use it for debounce, delayed messages, countdowns, polling intervals, inactivity warnings, and client-side expiry decisions.

The critical distinction is between advancing timers and changing the displayed system time. \`cy.tick()\` moves through elapsed time and invokes timers that fall in that range. The yielded clock's \`setSystemTime()\` changes what \`Date\` reports without firing timers or changing their remaining delay. Choosing the wrong operation creates tests that look fast but verify the wrong model. Broader runner tradeoffs are covered in the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026), and stable element targeting for time-driven UI follows the same principles described in [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

Time control is not a blanket replacement for waiting. Cypress clock APIs control supported globals in the page's top window. They do not accelerate a backend job, resolve a real network request, change a database clock, or control an embedded iframe's timers. A reliable suite names which clock owns the behavior and manipulates only that clock.

## Map the behavior to the clock it actually reads

Before calling any time API, trace the behavior from trigger to observation. A search debounce usually belongs entirely to the browser. Subscription expiry may depend on server time. A status poll combines a browser interval with network responses. A countdown may read both \`Date.now()\` and \`setInterval()\`.

| Behavior | Browser timer involved | Wall-clock read involved | Correct test boundary |
|---|---|---|---|
| Search debounce | \`setTimeout\` | Usually no | Freeze before load, type, tick the debounce delay |
| Toast auto-dismiss | \`setTimeout\` | Usually no | Trigger toast, tick to each boundary |
| Countdown to deadline | \`setInterval\` | Usually \`Date\` | Start at a known instant and tick elapsed time |
| Session idle warning | Timeout or interval | Often both | Drive activity, tick to warning and expiry boundaries |
| API polling | \`setInterval\` or chained timeouts | Sometimes | Stub responses, tick one interval at a time |
| Server-side token expiry | Possibly none in browser | Server or identity provider clock | Control server test clock or stub the response |
| Embedded payment widget | Timer inside iframe | Third-party clock | Use provider sandbox controls or contract tests |

The test claim should identify the owner. “Shows warning after 14 minutes of browser inactivity” is controllable with the page clock. “Server rejects a token after 15 minutes” is not proven by changing \`Date\` in the browser, even if the UI eventually displays an error.

The official references are https://docs.cypress.io/api/commands/clock and https://docs.cypress.io/api/commands/tick. They document the controlled functions, command ordering, yielded clock methods, restoration behavior, and iframe limitation.

## Install the clock before application code captures timers

Call \`cy.clock()\` before \`cy.visit()\` when the application registers timers during startup. Cypress then overrides the native time functions on window load, before application code runs. Installing after navigation can be too late because a module may have already scheduled an interval or captured a reference to the native function.

The smallest useful timeout test looks like this:

\`\`\`ts
// cypress/e2e/welcome-delay.cy.ts
it('reveals the welcome hint after five seconds', () => {
  const start = Date.UTC(2026, 7, 8, 10, 0, 0);

  cy.clock(start);
  cy.visit('/welcome');

  cy.get('[data-testid="welcome-hint"]').should('not.exist');
  cy.tick(4999);
  cy.get('[data-testid="welcome-hint"]').should('not.exist');
  cy.tick(1);
  cy.get('[data-testid="welcome-hint"]').should('be.visible');
});
\`\`\`

This proves the exact boundary instead of merely ticking far beyond it. The explicit UTC timestamp prevents the application from starting at the Unix epoch, which is the default when \`cy.clock()\` receives no time. The epoch can produce unrealistic date labels and conceal calculations that assume a modern date.

For a Cypress component test, the same ordering applies around the mount command:

\`\`\`tsx
// cypress/component/DelayedStatus.cy.tsx
import React from 'react';
import { DelayedStatus } from '../../src/DelayedStatus';

it('changes status at the configured delay', () => {
  cy.clock(Date.UTC(2026, 7, 8, 10, 0, 0));
  cy.mount(<DelayedStatus delayMs={2000} />);

  cy.contains('[role="status"]', 'Preparing').should('be.visible');
  cy.tick(2000);
  cy.contains('[role="status"]', 'Ready').should('be.visible');
});
\`\`\`

The component import assumes the project provides the displayed component, while every command in the spec is defined by Cypress. In application repositories, keep this example beside the real component so TypeScript validates the prop name and build configuration.

## Test debounce by asserting calls before and at the boundary

A debounce test should prove suppression, final value selection, and the exact trigger point. Spying only after ticking misses whether an early request leaked.

\`\`\`ts
// cypress/e2e/search-debounce.cy.ts
it('sends one search with the final query after 300 ms', () => {
  cy.clock(Date.UTC(2026, 7, 8, 10, 0, 0));
  cy.intercept('GET', '/api/search*', {
    statusCode: 200,
    body: { results: [] },
  }).as('search');
  cy.visit('/search');

  cy.get('[data-testid="search-input"]').type('agent');
  cy.get('@search.all').should('have.length', 0);

  cy.tick(299);
  cy.get('@search.all').should('have.length', 0);

  cy.tick(1);
  cy.wait('@search').then(({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get('q')).to.eq('agent');
  });
  cy.get('@search.all').should('have.length', 1);
});
\`\`\`

The intercept is registered before visiting, and the alias history establishes that no request happened early. The URL is parsed instead of matched with an ambiguous substring. If the page performs an initial empty search on load, give that route a separate contract or clear the assumption by waiting for initialization before typing. Do not force a clean call count onto behavior that intentionally makes an initial request.

Typing itself uses Cypress's command timing. Fake browser timers do not mean the Cypress command queue stops functioning. Still, application code that mixes debounce with promise microtasks may complete in stages. Let Cypress assertions retry the final observable state after the relevant tick rather than trying to flush undocumented internals.

## Drive countdowns one meaningful boundary at a time

Countdown implementations often compute a deadline once, then update the display every second. A good test proves the initial label, an intermediate value, zero, and the terminal action. It should not iterate through every second.

\`\`\`ts
// cypress/e2e/reservation-countdown.cy.ts
it('expires a reservation at the declared deadline', () => {
  const start = Date.UTC(2026, 7, 8, 10, 0, 0);

  cy.clock(start);
  cy.intercept('GET', '/api/reservation', {
    statusCode: 200,
    body: {
      id: 'reservation-42',
      expiresAt: new Date(start + 10_000).toISOString(),
    },
  }).as('reservation');
  cy.visit('/checkout');
  cy.wait('@reservation');

  cy.get('[data-testid="countdown"]').should('have.text', '10 seconds');
  cy.tick(9000);
  cy.get('[data-testid="countdown"]').should('have.text', '1 second');
  cy.tick(1000);
  cy.get('[data-testid="reservation-expired"]').should('be.visible');
  cy.contains('button', 'Pay now').should('be.disabled');
});
\`\`\`

The response and browser clock share one anchor. If the test used a fixed fixture with a historical expiry timestamp, it would begin expired and never exercise the countdown. If it derived the server deadline from the runner's real \`Date.now()\` while the browser began at another instant, results would vary.

Calendar formatting deserves a separate scenario. Elapsed timer tests should use explicit instants, while locale and time-zone display tests need controlled browser configuration and expectations appropriate to the project. Do not infer daylight-saving correctness from a ten-second countdown.

## Verify polling without creating a request storm

Polling combines timers with network work. Tick a single interval, wait for the resulting request and rendered state, then move to the next interval. Advancing a large duration at once can execute many interval callbacks synchronously and obscure whether overlapping requests are prevented.

\`\`\`ts
// cypress/e2e/export-polling.cy.ts
it('polls until an export is ready and then stops', () => {
  const responses = [
    { state: 'processing' },
    { state: 'processing' },
    { state: 'ready', downloadUrl: '/downloads/export-17.csv' },
  ];
  let requestCount = 0;

  cy.clock(Date.UTC(2026, 7, 8, 10, 0, 0));
  cy.intercept('GET', '/api/exports/17', (req) => {
    const body = responses[Math.min(requestCount, responses.length - 1)];
    requestCount += 1;
    req.reply({ statusCode: 200, body });
  }).as('exportStatus');
  cy.visit('/exports/17');

  cy.wait('@exportStatus');
  cy.contains('[role="status"]', 'Preparing export').should('be.visible');

  cy.tick(5000);
  cy.wait('@exportStatus');
  cy.contains('[role="status"]', 'Preparing export').should('be.visible');

  cy.tick(5000);
  cy.wait('@exportStatus');
  cy.contains('a', 'Download export').should('have.attr', 'href', '/downloads/export-17.csv');

  cy.tick(15000);
  cy.get('@exportStatus.all').should('have.length', 3);
});
\`\`\`

This application is assumed to poll immediately and every five seconds, then stop when ready. The last assertion is essential. Without it, the visible download link could pass while a leaked interval keeps hitting the API. The closure belongs inside the test, so retries and other tests do not inherit its call count.

If the application schedules its next poll only after the previous response completes, wait for each aliased request before ticking again. Browser time control does not cause a real server to respond faster. Stub the response when the test is about scheduling, and maintain a separate integration test for the real status endpoint.

## Model inactivity as a sequence of user events

Idle logic is rarely “wait 15 minutes and log out.” It usually resets on approved activity, warns before expiry, allows renewal, and then performs a terminal action. Test that state machine explicitly.

| State | Entry condition, illustrative | Expected user evidence | Next relevant event |
|---|---|---|---|
| Active | Authenticated or recent activity | No warning | 14 minutes idle |
| Warning | Idle threshold reached | Dialog announces one minute remaining | User continues or one minute elapses |
| Renewed | Continue action succeeds | Dialog closes, session remains | New idle window begins |
| Expired | Final threshold reached | Login prompt and protected data removed | Reauthentication |

The durations here are illustrative. Use the actual product policy and distinguish browser UX from authoritative server expiry.

\`\`\`ts
// cypress/e2e/inactivity-warning.cy.ts
it('resets idle time after user activity and expires after the new window', () => {
  const minute = 60_000;

  cy.clock(Date.UTC(2026, 7, 8, 10, 0, 0));
  cy.visit('/workspace');

  cy.tick(13 * minute);
  cy.get('[data-testid="workspace-title"]').click();
  cy.tick(13 * minute);
  cy.get('[role="dialog"]').should('not.exist');

  cy.tick(1 * minute);
  cy.get('[role="dialog"]')
    .should('be.visible')
    .and('contain.text', 'Your session will expire');

  cy.tick(1 * minute);
  cy.location('pathname').should('eq', '/login');
});
\`\`\`

This test assumes clicking the workspace title is an activity event recognized by the application. A real test should use the documented activity set. If the application listens for keyboard, pointer, and visibility events differently, split those reset rules into focused tests rather than randomly clicking the page.

## Choose tick or setSystemTime based on causality

The yielded clock supports both timer advancement and system-time change. They are intentionally different.

| Operation | Changes \`Date\` | Fires timers | Changes time remaining on timers | Best use |
|---|---|---|---|---|
| \`cy.tick(ms)\` | Yes, for the fake clock | Yes, timers in range | Yes | Debounce, intervals, timeouts, countdown progression |
| \`clock.tick(ms)\` | Same behavior through yielded clock | Yes | Yes | Work inside a callback holding the clock |
| \`clock.setSystemTime(value)\` | Yes | No | No | Simulate a wall-clock jump without elapsed timer execution |
| \`clock.restore()\` | Returns native functions | No | Existing fake timers are discarded | Rare mid-test return to real time |

Use a wall-clock jump to test an application that recalculates staleness after a visibility event. Since changing system time does not fire timers, explicitly dispatch the event that makes the application re-evaluate.

\`\`\`ts
// cypress/e2e/stale-dashboard.cy.ts
it('refreshes stale data when the page becomes visible after a clock jump', () => {
  const start = Date.UTC(2026, 7, 8, 10, 0, 0);

  cy.clock(start);
  cy.intercept('GET', '/api/dashboard', {
    statusCode: 200,
    body: { updatedAt: new Date(start).toISOString(), total: 12 },
  }).as('dashboard');
  cy.visit('/dashboard');
  cy.wait('@dashboard');

  cy.clock().then((clock) => {
    clock.setSystemTime(start + 31 * 60_000);
  });
  cy.document().then((document) => {
    const EventConstructor = document.defaultView?.Event;
    if (!EventConstructor) {
      throw new Error('document has no associated window');
    }
    document.dispatchEvent(new EventConstructor('visibilitychange'));
  });

  cy.wait('@dashboard');
  cy.get('@dashboard.all').should('have.length', 2);
});
\`\`\`

The example assumes the product refreshes on that event when data is older than 30 minutes. In browsers, \`visibilityState\` is read-only, so this test does not pretend to change it. The application under test must base the refresh handler on the event plus staleness for this sample to match its contract. If it explicitly requires \`visibilityState === 'visible'\`, use an application seam or a browser-focused test strategy that can model that state accurately.

## Override only the functions the scenario owns

By default, Cypress controls \`setTimeout\`, \`clearTimeout\`, \`setInterval\`, \`clearInterval\`, and \`Date\`. The \`functionNames\` argument can limit overrides. Selective control is useful when a test needs a fixed date but wants timers to progress normally, or when only timeout scheduling belongs to the scenario.

\`\`\`ts
// cypress/e2e/date-banner.cy.ts
it('shows the promotion for a fixed calendar date', () => {
  const campaignDay = Date.UTC(2026, 10, 27, 12, 0, 0);

  cy.clock(campaignDay, ['Date']);
  cy.visit('/offers');

  cy.get('[data-testid="campaign-banner"]')
    .should('be.visible')
    .and('contain.text', 'Seasonal offer');
});
\`\`\`

This test fixes \`Date\` while leaving timers native. It should not call \`cy.tick()\` expecting a timeout to fire because the timeout functions were not replaced. Selective overrides demand a precise test name and a comment only if the reason is not clear from the scenario.

Avoid manually restoring time unless the journey genuinely needs real time afterward. Cypress restores overridden functions between tests. According to the official documentation, timers registered before or during the fake clock's lifetime are discarded when the clock is restored and do not resume automatically. A mid-test restore can therefore break application intervals in a way that looks like a product defect.

## Diagnose a timer that refuses to fire

The most realistic failure is simple: a test calls \`cy.clock()\` after \`cy.visit()\`, advances time, and the expected poll never appears. Inspect the command order first. If application startup scheduled the timer before clock installation, that timer belongs to the native clock and \`cy.tick()\` cannot control it. Move clock installation before navigation and repeat.

If ordering is correct, identify the actual scheduling primitive. The behavior may use an iframe, a worker, a server push channel, CSS animation, or a promise rather than one of the overridden globals. Cypress documentation states that \`cy.clock()\` applies only to the top window, not embedded iframes. Do not keep increasing the tick duration when the timer lives elsewhere.

| Symptom | Evidence to collect | Likely explanation | Correction |
|---|---|---|---|
| No callback after tick | Command order and timer registration log | Clock installed too late | Install before visit or mount |
| Date changes but timeout does not fire | Function names passed to clock | Only \`Date\` was overridden | Include the relevant timer functions |
| UI updates but request count explodes | Alias history after a large tick | Interval fired many times synchronously | Advance one interval and wait per cycle |
| Parent changes, iframe does not | Frame ownership | Top-window limitation | Test through provider support or frame-specific strategy |
| Backend record remains pending | Server logs and API state | Server uses an independent clock | Control or stub the server boundary |
| Test fails after restore | Timer registration timeline | Fake timers were discarded | Avoid restore or make the app re-register timers |

Another failure mode is assertion timing. Calling \`cy.tick()\` before the user action that registers a timeout moves time but has nothing to execute. Trigger the action, confirm the precondition, then tick. Arrange, act, advance, assert is the clearest order for a delayed behavior.

## What people get wrong about Cypress time travel

One mistake is using fake time to bypass every wait in a suite. Cypress's automatic retrying, aliased network waits, and real server readiness still matter. A clock should replace a deliberate product delay, not synchronization with unknown work.

Another is testing only the final state after a huge tick. That can miss an early callback, repeated polling, a countdown that skips zero, or a warning that never appears. Assert just before and exactly at important boundaries. For recurring timers, move one interval at a time until the terminal condition, then advance again to prove the interval stopped.

A third mistake is changing the browser date to claim an end-to-end expiry test. Security and billing decisions generally belong on a server. The browser clock can prove how the UI responds to an expiry response or local deadline. It cannot prove that an identity provider or database enforces the same instant.

Finally, some tests combine clock manipulation, many stubs, viewport changes, and broad DOM assertions into one scenario. When it fails, no one knows whether scheduling or rendering broke. Keep the timer contract focused, then cover the integrated journey with fewer time assumptions.

## Establish a review standard for time-driven tests

A reviewable timer test answers five questions directly in code:

1. What explicit instant does the browser start at?
2. Which action registers the timer?
3. Which boundary is proved before and after advancement?
4. Which clocks remain real, especially network and server clocks?
5. What proves recurring work stopped or reset correctly?

Prefer named duration constants such as \`minute\` and product terms such as \`warningDelay\` over unexplained millisecond literals. Keep UTC anchors in elapsed-time tests. Put route response sequences inside each test. Avoid sharing a yielded clock or mutable counter across tests. Rely on Cypress's between-test restoration rather than complicated global cleanup.

For agent-authored tests, provide the relevant implementation or timer contract and ask the agent to explain whether it needs \`tick\` or \`setSystemTime\`. Reject samples that install the clock after startup, accelerate an external system, or omit a pre-boundary assertion. These checks turn fast-generated code into trustworthy regression coverage.

## Frequently Asked Questions

### Must cy.clock run before cy.visit?

It should run before \`cy.visit()\` whenever application startup creates a timer or reads the current date. Cypress then replaces supported globals as the new window loads, before application code executes. Installing later can still control timers registered afterward, but it cannot take ownership of a native timer that already exists. The same principle applies to component tests: install the clock before mounting when initialization schedules work. Make that ordering visible in every test rather than relying on a shared hook whose purpose is hard to see.

### What is the difference between cy.tick and setSystemTime?

\`cy.tick(milliseconds)\` advances the fake clock through elapsed time and invokes controlled timers scheduled within that range. \`clock.setSystemTime(value)\` changes the current system time reported by \`Date\`, but it does not fire timers or change how much delay remains on them. Use tick for debounce, timeouts, intervals, and countdown progression. Use setSystemTime for a wall-clock jump that the application notices through another event or action. The distinction models causality and prevents a date-change test from accidentally executing every interval.

### Can Cypress time travel make API or database jobs finish faster?

No. It controls supported time-related globals in the tested page's top window. A backend process, database server, queue worker, third-party provider, web worker, or iframe can have an independent clock. Stub the API response when the test is specifically about browser scheduling. For an integrated expiry or scheduled-job test, introduce a supported server-side clock seam, invoke the job directly in a test environment, or wait on an observable server condition. State clearly which layer the test proves.

### Why does a polling test send many requests after one tick?

A large tick can execute every interval callback whose scheduled time falls inside the advanced range. If polling runs every five seconds, advancing a minute may trigger many callbacks before the test inspects the first response. That can expose a genuine overlap bug or simply make the test hard to diagnose. Advance one interval, wait for the aliased request and UI update, then advance again. Once a terminal response arrives, tick beyond another interval and assert the alias history does not grow.
`,
};
