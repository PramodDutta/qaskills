import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing postMessage Across iframes: Origins, Handshakes, and Replay',
  description: 'postmessage testing verifies iframe origins, handshake state, message shape, replay resistance, and browser behavior so cross-frame flows fail safely.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing postMessage Across iframes: Origins, Handshakes, and Replay

postmessage testing proves that two browser contexts exchange only the messages they are supposed to exchange, with the expected origin, target origin, message shape, timing, and replay protection. For iframe flows, that means testing both sides: the parent must send messages to a specific child origin, and the child must reject unexpected parents before acting on commands.

The fastest useful test is not "a message was received." It is "a message from this exact origin, with this validated type, after this handshake, caused this one state change and nothing else."

Browser messaging is documented by MDN at https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage. The API is small, but the failure modes are not. A wildcard \`targetOrigin\`, a missing \`event.origin\` check, or a command accepted before handshake can turn an embedded widget into a confused deputy.

## Name The Trust Boundary First

An iframe boundary is not automatically a security boundary. It becomes useful when both sides treat it as one. Start testing by naming the participants and the commands they may exchange.

| Participant | Example origin | Allowed to send | Must reject |
|---|---|---|---|
| Parent app | \`https://app.example.test\` | Session token, theme, selected project | Widget-only events from unknown origins |
| Embedded QA widget | \`https://widget.example.test\` | Ready event, result selection, resize request | Commands before handshake |
| Marketing preview page | \`https://preview.example.test\` | No privileged commands | Token requests and project updates |
| Local development parent | \`http://127.0.0.1:5173\` | Same commands only in dev config | Production widget trust in dev wildcard |

This table forces two decisions. First, origin allowlists are environment-specific. Second, message types are directional. A \`ready\` message from the iframe is not the same as a \`setSession\` command from the parent.

The common mistake is testing only the receiver. You also need to test the sender uses a precise \`targetOrigin\`. If the parent sends a token with \`"*"\`, the child may still check \`event.origin\`, but the sensitive data has already been offered to any window reference the parent targeted.

## Build A Small Message Protocol

Do not let random object shapes become your protocol. Define message types, required fields, and state transitions. The code below is intentionally plain JavaScript that can run in a browser.

\`\`\`html
<!doctype html>
<html lang="en">
  <body>
    <iframe
      id="qa-widget"
      title="QA widget"
      src="https://widget.example.test/embed.html">
    </iframe>

    <script>
      const widgetOrigin = "https://widget.example.test";
      const frame = document.querySelector("#qa-widget");
      const session = { nonce: "nonce-123", token: "session-token-abc" };

      window.addEventListener("message", (event) => {
        if (event.origin !== widgetOrigin) return;
        if (!event.data || event.data.type !== "widget.ready") return;
        if (event.data.nonce !== session.nonce) return;

        frame.contentWindow.postMessage({
          type: "parent.session",
          nonce: session.nonce,
          token: session.token
        }, widgetOrigin);
      });
    </script>
  </body>
</html>
\`\`\`

The parent waits for a \`widget.ready\` message with the expected nonce before sending a session token. The token is sent to \`https://widget.example.test\`, not to \`"*"\`.

The iframe side must be just as strict:

\`\`\`html
<!doctype html>
<html lang="en">
  <body>
    <button id="start" disabled>Start run</button>

    <script>
      const parentOrigin = "https://app.example.test";
      const nonce = new URLSearchParams(window.location.search).get("nonce") || "nonce-123";
      let sessionToken = null;

      window.parent.postMessage({
        type: "widget.ready",
        nonce
      }, parentOrigin);

      window.addEventListener("message", (event) => {
        if (event.origin !== parentOrigin) return;
        if (!event.data || event.data.type !== "parent.session") return;
        if (event.data.nonce !== nonce) return;
        if (typeof event.data.token !== "string") return;

        sessionToken = event.data.token;
        document.querySelector("#start").disabled = false;
      });
    </script>
  </body>
</html>
\`\`\`

These examples are not a full security design. They are a testable protocol. QA can now assert that unknown origins, wrong nonces, early commands, and malformed payloads do not enable the button.

## Validate Origins As Data, Not As Comments

Origin checks should be code you can unit test. Avoid scattering string comparisons across listeners. Put the allowlist behavior in a function and test it with production, development, and attacker-like inputs.

\`\`\`ts
import { describe, expect, test } from "vitest";

type Environment = "development" | "production";

const allowedParents: Record<Environment, Set<string>> = {
  development: new Set(["http://127.0.0.1:5173", "http://localhost:5173"]),
  production: new Set(["https://app.example.test"])
};

export function isAllowedParentOrigin(origin: string, environment: Environment) {
  return allowedParents[environment].has(origin);
}

describe("parent origin allowlist", () => {
  test("allows only the production app in production", () => {
    expect(isAllowedParentOrigin("https://app.example.test", "production")).toBe(true);
    expect(isAllowedParentOrigin("https://preview.example.test", "production")).toBe(false);
    expect(isAllowedParentOrigin("http://localhost:5173", "production")).toBe(false);
  });

  test("keeps local origins limited to development", () => {
    expect(isAllowedParentOrigin("http://127.0.0.1:5173", "development")).toBe(true);
    expect(isAllowedParentOrigin("https://evil.example.test", "development")).toBe(false);
  });
});
\`\`\`

This is where environment mistakes show up. A dev origin accidentally allowed in production is more common than a clever browser exploit. Tests should make that impossible to miss.

For iframe-heavy apps, pair these unit tests with browser tests that actually exercise frames. The guide on [Playwright iframe and shadow DOM testing](/blog/playwright-iframe-shadow-dom-guide) covers locator mechanics. Here, the concern is protocol behavior.

## Parse Message Shapes Before Acting

\`postMessage\` can deliver any serializable data. Your listener should reject null, strings, arrays, unknown types, missing fields, and fields with the wrong type. Schema validation libraries can help, but a small hand-written parser is often enough for narrow protocols.

\`\`\`ts
type ParentSessionMessage = {
  type: "parent.session";
  nonce: string;
  token: string;
};

type WidgetThemeMessage = {
  type: "parent.theme";
  nonce: string;
  theme: "light" | "dark";
};

type ParentMessage = ParentSessionMessage | WidgetThemeMessage;

export function parseParentMessage(value: unknown): ParentMessage | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (record.type === "parent.session") {
    if (typeof record.nonce !== "string") return null;
    if (typeof record.token !== "string") return null;
    return { type: "parent.session", nonce: record.nonce, token: record.token };
  }

  if (record.type === "parent.theme") {
    if (typeof record.nonce !== "string") return null;
    if (record.theme !== "light" && record.theme !== "dark") return null;
    return { type: "parent.theme", nonce: record.nonce, theme: record.theme };
  }

  return null;
}
\`\`\`

Test the parser with hostile and boring cases:

\`\`\`ts
import { describe, expect, test } from "vitest";
import { parseParentMessage } from "./messages";

describe("postMessage payload parser", () => {
  test("accepts a valid session message", () => {
    expect(parseParentMessage({
      type: "parent.session",
      nonce: "nonce-123",
      token: "session-token-abc"
    })).toEqual({
      type: "parent.session",
      nonce: "nonce-123",
      token: "session-token-abc"
    });
  });

  test("rejects malformed messages", () => {
    expect(parseParentMessage(null)).toBeNull();
    expect(parseParentMessage("parent.session")).toBeNull();
    expect(parseParentMessage({ type: "parent.session", nonce: "nonce-123" })).toBeNull();
    expect(parseParentMessage({ type: "parent.theme", nonce: "nonce-123", theme: "blue" })).toBeNull();
  });
});
\`\`\`

If your team uses an AI coding agent to generate protocol tests, ask for malformed payloads first. Agents tend to write the happy path and one unknown-origin case. The ugly values are where parsers break.

## Test The Handshake State Machine

Most iframe protocols have a handshake even if nobody has drawn it. The child announces ready. The parent responds with configuration. The child acknowledges or enables UI. Commands before that point should be ignored.

Write the state machine down:

| State | Accepted message | Rejected message | Next state |
|---|---|---|---|
| \`idle\` | Child sends \`widget.ready\` | Parent sends privileged command too early | \`readySeen\` |
| \`readySeen\` | Parent sends \`parent.session\` with nonce | Message with wrong nonce | \`sessionActive\` |
| \`sessionActive\` | Theme, resize, selection, command messages | Replayed session setup with old nonce | Depends on type |
| \`closed\` | None except telemetry-safe cleanup | Any command | \`closed\` |

Then test it as a pure reducer. This is faster than a browser test and catches most logic mistakes.

\`\`\`ts
import { describe, expect, test } from "vitest";

type State = "idle" | "readySeen" | "sessionActive" | "closed";

type Event =
  | { type: "widget.ready"; nonce: string }
  | { type: "parent.session"; nonce: string; token: string }
  | { type: "widget.close" };

function nextState(state: State, event: Event, expectedNonce: string): State {
  if (state === "closed") return "closed";
  if (event.type === "widget.close") return "closed";
  if (event.nonce !== expectedNonce) return state;
  if (state === "idle" && event.type === "widget.ready") return "readySeen";
  if (state === "readySeen" && event.type === "parent.session") return "sessionActive";
  return state;
}

describe("iframe handshake state", () => {
  test("requires ready before session", () => {
    expect(nextState("idle", {
      type: "parent.session",
      nonce: "nonce-123",
      token: "token"
    }, "nonce-123")).toBe("idle");

    const afterReady = nextState("idle", {
      type: "widget.ready",
      nonce: "nonce-123"
    }, "nonce-123");

    expect(afterReady).toBe("readySeen");
    expect(nextState(afterReady, {
      type: "parent.session",
      nonce: "nonce-123",
      token: "token"
    }, "nonce-123")).toBe("sessionActive");
  });
});
\`\`\`

The reducer makes a security property visible: a valid-looking session command does not matter if it arrives in the wrong state.

## Add Replay Resistance For Sensitive Commands

Replay means an old valid message is sent again later. The browser does not prevent that for you. If the message can create a session, confirm a payment, submit a test result, or change permissions, treat replay as a test case.

Use a nonce, message ID, timestamp window, or server-backed one-time token depending on the risk. Client-only replay caches are not enough for high-value server actions, but they are still useful for local UI commands.

| Command | Replay risk | Test expectation |
|---|---|---|
| \`parent.session\` | Old token reactivates widget | Nonce and token freshness are checked |
| \`widget.resultSelected\` | Duplicate selection event | Parent handles idempotently |
| \`parent.submitRun\` | Duplicate run submission | Server or parent rejects duplicate message ID |
| \`widget.resize\` | Low security, possible UI noise | Rate limit or ignore repeated dimensions |

Here is a small replay cache for message IDs:

\`\`\`ts
import { expect, test } from "vitest";

class MessageReplayCache {
  private seen = new Set<string>();

  accept(messageId: string) {
    if (this.seen.has(messageId)) return false;
    this.seen.add(messageId);
    return true;
  }
}

test("rejects replayed message IDs", () => {
  const cache = new MessageReplayCache();

  expect(cache.accept("msg-1")).toBe(true);
  expect(cache.accept("msg-1")).toBe(false);
  expect(cache.accept("msg-2")).toBe(true);
});
\`\`\`

For production, a cache needs size limits and expiry. The test above proves the rule, not the memory policy. If a command reaches your backend, enforce idempotency there as well. A browser cache can be cleared; a server can decide whether a message ID has already performed a protected action.

## Drive A Real Browser Through The Frame

Unit tests are fast, but browser tests catch wiring mistakes: wrong frame URL, missing sandbox permission, incorrect target origin, listener registered too late, or UI enabled after a rejected message.

The browser test should verify both acceptance and rejection. Here is a Playwright test for a page that embeds a widget and shows a start button inside the frame after a valid handshake:

\`\`\`ts
import { expect, test } from "@playwright/test";

test("iframe enables start only after trusted handshake", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/parent.html");

  const widget = page.frameLocator('iframe[title="QA widget"]');
  await expect(widget.getByRole("button", { name: "Start run" })).toBeEnabled();
});

test("iframe rejects a session message from a non-allowlisted parent", async ({ page }) => {
  // attacker.html runs on a DIFFERENT port and embeds the same widget,
  // so the widget sees event.origin = http://127.0.0.1:5174, which is
  // not in its allowlist. Posting from the trusted parent page cannot
  // exercise the origin check; the message has to arrive from a window
  // the widget does not trust.
  await page.goto("http://127.0.0.1:5174/attacker.html");

  const widget = page.frameLocator('iframe[title="QA widget"]');
  await expect(widget.getByRole("button", { name: "Start run" })).toBeDisabled();
  await expect(widget.getByText("attacker-token")).toBeHidden();
});
\`\`\`

The attacker page is four lines: it embeds the widget and fires the same message shape the real parent would send:

\`\`\`html
<iframe title="QA widget" src="http://127.0.0.1:5173/widget.html"></iframe>
<script>
  const frame = document.querySelector("iframe");
  frame.addEventListener("load", () => {
    frame.contentWindow.postMessage(
      { type: "parent.session", nonce: "nonce-123", token: "attacker-token" },
      "*"
    );
  });
</script>
\`\`\`

The rejection test depends on the app exposing no sensitive token text. In many apps, a better assertion is that a privileged button stays disabled, a network request is not made, or a message is logged as rejected. Choose the assertion that reflects the actual risk.

Be careful with same-origin local tests. If parent and child both run on \`http://127.0.0.1:5173\`, you are not testing the production origin boundary. Use separate ports or hostnames for parent and child in at least one test job.

## Test iframe Sandbox And Frame Policy Together

The \`sandbox\` attribute changes what the iframe can do. Frame-related headers decide who can embed whom. These controls interact with postMessage because a widget that cannot run scripts cannot complete a message handshake, and a page that should not be framed should never reach the handshake at all.

| Control | Test question | Common miss |
|---|---|---|
| \`iframe sandbox\` | Does the widget have only the permissions it needs? | Adding \`allow-same-origin\` and \`allow-scripts\` without review |
| \`allow\` attribute | Are browser features limited? | Camera or clipboard allowed by copy-pasted embed code |
| \`frame-ancestors\` | Can only approved parents embed the child? | Staging host works, production host forgotten |
| \`X-Frame-Options\` | Legacy protection for pages that should not be framed | Header conflicts with intended embeds |

PostMessage tests should sit next to frame policy tests because they protect the same trust boundary from different angles. The related guide on [security testing clickjacking and frame options](/blog/security-testing-clickjacking-frame-options) goes deeper on headers and clickjacking.

For an embeddable widget, test that approved parents can frame it and unapproved parents cannot. For a non-embeddable app page, test that frame protections block framing before any message protocol matters.

## A Failure Story: The Replay That Looked Like A Double Click

The symptom was duplicate test-run submissions from an embedded widget. The wrong theory was a frontend double-click bug, so the first patch disabled the submit button after click. That reduced duplicates but did not remove them.

The actual cause was message replay. The widget posted \`widget.submitRun\` to the parent with a run payload. The parent forwarded it to the API. During a network retry in the parent shell, the same message handler ran twice because a recovery script reattached the listener without removing the old one. Both listeners accepted the same message ID because there was no message ID.

The fix was not just "remove the duplicate listener." The team added a required \`messageId\` to submit commands, kept an in-memory accepted-message cache in the parent, and enforced idempotency at the API boundary. QA added a browser test that fired the same submit message twice and expected one API call. A unit test covered the cache. A regression test covered listener cleanup.

The diagnosis mattered because UI debouncing would never stop replay from another source. The message protocol needed idempotency.

## Log Rejections Without Leaking Tokens

Rejected messages are useful telemetry. They can reveal bad deploy config, stale embed snippets, or attempted abuse. Logging the whole message is risky because postMessage payloads often contain tokens, project names, user IDs, or draft content.

Use structured, low-detail rejection logs:

| Field | Safe example | Avoid |
|---|---|---|
| Reason | \`origin_not_allowed\` | Full payload dump |
| Origin | \`https://preview.example.test\` | Token or cookie values |
| Message type | \`parent.session\` | Entire session object |
| Frame role | \`qa-widget\` | DOM snapshot with user content |

Test your logger with a sensitive payload:

\`\`\`ts
import { expect, test } from "vitest";

function rejectionLog(event: { origin: string; data: unknown }) {
  const record = event.data as { type?: unknown } | null;
  return {
    event: "postmessage_rejected",
    origin: event.origin,
    type: record && typeof record.type === "string" ? record.type : "unknown"
  };
}

test("rejection log does not include token payloads", () => {
  // The hostile payload carries the token INTO the logger; the test
  // proves the logger does not let it out. A logger that never sees
  // the token proves nothing.
  const hostile = {
    origin: "https://evil.example.test",
    data: { type: "parent.session", nonce: "nonce-123", token: "session-token-abc" }
  };
  const serialized = JSON.stringify(rejectionLog(hostile));

  expect(serialized).toContain("postmessage_rejected");
  expect(serialized).toContain("parent.session");
  expect(serialized).not.toContain("session-token-abc");
});
\`\`\`

This looks obvious until an incident response team asks for more context and someone logs \`event.data\` wholesale. Keep the safe shape boring and tested.

## Review postMessage Changes With A Protocol Checklist

Use this checklist in pull requests:

| Check | Pass condition |
|---|---|
| Sender target | Sensitive messages use a specific \`targetOrigin\` |
| Receiver origin | \`event.origin\` is checked before parsing or acting |
| Direction | Parent and child message types are not interchangeable |
| Shape validation | Unknown and malformed payloads are rejected |
| Handshake | Privileged commands require the expected state and nonce |
| Replay | Sensitive commands carry IDs or one-time tokens |
| Browser coverage | At least one real-frame test covers acceptance and rejection |
| Logging | Rejections are observable without dumping payloads |

The best test suites mix small pure tests with a few browser tests. Pure tests make the protocol hard to misunderstand. Browser tests prove the page wiring follows it.

## Make Negative Cases As Important As The Happy Path

Iframe messaging bugs usually hide in negative cases. The widget works in the demo parent, so the team assumes the protocol is fine. Then a preview host, stale embed code, duplicated listener, or browser restore path sends a message that is valid-looking but not valid for the current state.

Use a negative-case matrix for every privileged command:

| Negative case | Expected behavior | What it catches |
|---|---|---|
| Wrong origin | Message ignored before payload is trusted | Missing \`event.origin\` check |
| Wrong nonce | Message ignored with safe telemetry | Stale tab or copied embed session |
| Correct message before handshake | No privileged state change | Listener acting without state |
| Duplicate message ID | Second message ignored or idempotent | Replay and duplicate listener bugs |
| Unknown message type | No exception and no state change | Parser fallthrough mistakes |
| Oversized payload | Rejected or capped | Memory and logging problems |

Run these cases at two levels. Pure tests should cover the parser, origin allowlist, state machine, and replay cache. Browser tests should cover at least one trusted flow and one rejected flow in real frames. The browser layer catches mistakes that pure tests cannot see, such as the child iframe loaded from the wrong host, the parent registering listeners after the child sends ready, or the local test accidentally using same-origin frames.

Same-origin local tests deserve special suspicion. They are convenient, but they can hide production-only mistakes because \`event.origin\` values look friendlier and browser restrictions differ. Use separate local ports or mapped hostnames for at least one automated run. The test does not need to be slow. It only needs to prove that the origin boundary exists when the parent and child are not the same page wearing different labels.

## Frequently Asked Questions

### What should postmessage testing verify first?

Verify the origin rule first: the sender uses a specific \`targetOrigin\`, and the receiver checks \`event.origin\` before acting. Then test payload shape, handshake state, nonce matching, and replay behavior for sensitive commands. A message-received assertion alone is too weak because it can pass for the wrong sender, wrong state, or malformed payload. For iframe flows, include at least one browser test that exercises the real parent and child frame wiring.

### Is using targetOrigin "*" ever acceptable?

It can be acceptable for non-sensitive broadcast-style messages where the payload contains no secrets and any receiver learning it is safe. It is not acceptable for session tokens, user data, payment state, permissions, or privileged commands. Even when the receiver validates \`event.origin\`, a wildcard sender can disclose data before the receiver has a chance to reject anything. The safer default is a precise origin, with environment-specific allowlists tested as code.

### How do I test replay attacks in iframe messaging?

Give sensitive commands a message ID, nonce, one-time token, or server idempotency key. Then send the same valid message twice in a unit test and in at least one browser or integration test. The first message should be accepted, and the second should be ignored or treated as an idempotent duplicate. For actions that reach a backend, enforce replay protection at the server boundary too, because browser memory can be cleared or bypassed.

### Do iframe sandbox attributes replace origin checks?

No. Sandbox attributes restrict frame capabilities, while origin checks decide whether a received message is trusted. You usually need both. A sandbox can reduce what the child can do, but it does not prove that a command came from the approved parent. An origin check can reject bad senders, but it does not limit browser features granted to the frame. Test sandbox, frame headers, and postMessage protocol as one boundary.
`,
};
