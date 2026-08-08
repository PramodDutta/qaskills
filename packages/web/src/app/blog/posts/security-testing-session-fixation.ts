import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Session Fixation: Prove IDs Rotate at Every Privilege Change',
  description: 'Run security testing session fixation workflows that prove session ID rotation, old-token invalidation, cookie scope, OAuth safety, and CI regression coverage.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing Session Fixation: Prove IDs Rotate at Every Privilege Change

**Security testing session fixation** proves that an identifier known before authentication cannot become an authenticated credential afterward. The core test uses two clients: an attacker obtains or chooses a pre-authentication session identifier, a victim authenticates while presenting it, and the suite verifies that the server issues a different identifier. It then replays the old identifier and requires an unauthenticated response.

Rotation alone is not enough. The old session must be invalidated or stripped of privileged state, the new identifier must carry the authenticated state, and every privilege-changing path must enforce the same transition. Test password login, MFA completion, OAuth or OIDC callback, password reset auto-login, impersonation, and role elevation. Also verify cookie scope so a less-trusted sibling application cannot plant a session cookie for the protected host.

This guide builds a runnable Express fixture, SuperTest and Vitest security cases, and a browser-level proof. If your application also accepts bearer tokens, keep this threat separate from algorithm selection issues covered in [security testing JWT algorithm confusion](/blog/security-testing-jwt-algorithm-confusion). When a token system rotates signing material, the [testing JWT key rotation and JWKS cache guide](/blog/testing-jwt-key-rotation-jwks-cache) covers that different lifecycle.

## Model the attack as an identity transition

Session fixation is not ordinary session theft. In theft, an attacker learns an identifier after the victim has an authenticated session. In fixation, the attacker knows or controls an identifier before the victim authenticates and relies on the application preserving that identifier across the privilege change.

| Phase | Attacker knowledge | Victim action | Secure server behavior |
| --- | --- | --- | --- |
| 1. Anonymous session | attacker knows pre-auth ID \`S1\` | none | session has no authenticated principal |
| 2. Fixation attempt | attacker induces victim to send \`S1\` | victim visits login flow | server treats ID as untrusted input |
| 3. Authentication | attacker still knows \`S1\` | victim proves identity | server creates fresh ID \`S2\` |
| 4. Replay | attacker sends \`S1\` | victim uses \`S2\` | \`S1\` is unauthorized, \`S2\` is authorized |

The security invariant can be written precisely:

1. \`S2 !== S1\` after a successful privilege change.
2. Replaying \`S1\` cannot access the authenticated principal.
3. \`S2\` retains only the state explicitly carried across regeneration.
4. Failed authentication does not promote either identifier.

OWASP recommends renewing the session ID after any privilege-level change and destroying the old identifier. The Session Management Cheat Sheet is at https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html. Use it as a threat reference, then translate your framework's behavior into observable HTTP assertions.

## Inventory every place anonymous state becomes privileged

Testing only \`POST /login\` leaves alternate paths open. Draw the application state machine and mark each transition that adds identity, authorization, or delegated power.

| Transition | Typical entry point | Fixation-specific question | Additional state risk |
| --- | --- | --- | --- |
| Password success | login form | did the ID rotate after credentials passed? | cart or locale migration |
| MFA completion | OTP or WebAuthn callback | did rotation occur at final authentication? | partial-auth flags |
| OAuth/OIDC callback | authorization response | did callback rotate before local login? | state and nonce handling |
| Password reset | reset token flow | does auto-login create a fresh session? | reset token replay |
| Role elevation | admin switch or approval | is a lower-privilege ID replaced? | stale role cache |
| Support impersonation | staff tool | are start and stop transitions rotated? | audit identity confusion |
| Reauthentication | sensitive action gate | is elevated assurance bound safely? | step-up timeout |

Some applications create no anonymous server-side session. That reduces one common fixation path, but does not eliminate the test. A framework can accept a client-supplied identifier at login, an OAuth callback can preserve a temporary session, or a broad-domain cookie can be planted by another host.

## Establish the vulnerable behavior in a controlled fixture

A deliberately vulnerable fixture makes the expected test failure obvious. Never deploy this example. It assigns authenticated state to the existing session without regeneration.

Save the following as \`vulnerable-app.ts\` in an isolated test project with \`express\` and \`express-session\` installed.

\`\`\`typescript
import express from "express";
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    anonymousMarker?: string;
    userId?: string;
  }
}

export function buildVulnerableApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: "test-only-secret-that-is-not-for-production",
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax" },
    }),
  );

  app.get("/anonymous", (request, response) => {
    request.session.anonymousMarker = "created";
    response.json({ anonymous: true });
  });

  app.post("/login", (request, response) => {
    if (request.body.username !== "alice" || request.body.password !== "test-pass") {
      response.status(401).json({ error: "invalid_credentials" });
      return;
    }
    request.session.userId = "user-alice";
    response.json({ authenticated: true });
  });

  app.get("/me", (request, response) => {
    if (request.session.userId === undefined) {
      response.status(401).json({ error: "unauthenticated" });
      return;
    }
    response.json({ userId: request.session.userId });
  });

  return app;
}
\`\`\`

The hard-coded credential and in-memory default store make this a teaching fixture only. Production applications need an appropriate shared session store, environment-managed secrets, secure transport, rate limiting, and real authentication. Those concerns do not change the fixation invariant.

## Regenerate safely and save before returning success

With \`express-session\`, \`request.session.regenerate(callback)\` creates a new session. Set authenticated state inside the callback and save it before sending the successful response. Error paths must reach error handling instead of reporting a login that was not persisted.

Save this corrected fixture as \`secure-app.ts\`.

\`\`\`typescript
import express, { type NextFunction } from "express";
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    anonymousMarker?: string;
    userId?: string;
  }
}

export function buildSecureApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: "sid",
      secret: "test-only-secret-that-is-not-for-production",
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax", path: "/" },
    }),
  );

  app.get("/anonymous", (request, response) => {
    request.session.anonymousMarker = "created";
    response.json({ anonymous: true });
  });

  app.post("/login", (request, response, next: NextFunction) => {
    if (request.body.username !== "alice" || request.body.password !== "test-pass") {
      response.status(401).json({ error: "invalid_credentials" });
      return;
    }

    request.session.regenerate((regenerateError) => {
      if (regenerateError !== undefined && regenerateError !== null) {
        next(regenerateError);
        return;
      }
      request.session.userId = "user-alice";
      request.session.save((saveError) => {
        if (saveError !== undefined && saveError !== null) {
          next(saveError);
          return;
        }
        response.json({ authenticated: true });
      });
    });
  });

  app.get("/me", (request, response) => {
    if (request.session.userId === undefined) {
      response.status(401).json({ error: "unauthenticated" });
      return;
    }
    response.json({ userId: request.session.userId });
  });

  return app;
}
\`\`\`

Do not copy every anonymous session property into the new session automatically. Carry only explicitly approved state, such as locale or a validated cart reference. Copying the whole object can preserve partial-auth flags, attacker-controlled return URLs, or stale authorization state.

## Write the two-client regression test

The most important automated case must preserve the old cookie for attacker replay while allowing the victim to receive the new cookie. SuperTest agents normally manage their own cookie jar, so use explicit cookie values to make the identity transition visible.

This Vitest file includes a narrow helper for the fixture's single \`sid\` cookie. It uses the secure app and runs as written with \`vitest\`, \`supertest\`, and their TypeScript declarations installed.

\`\`\`typescript
import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildSecureApp } from "./secure-app";

function cookiePair(setCookie: string[] | undefined, name: string): string {
  if (setCookie === undefined) throw new Error("Set-Cookie header is missing");
  const cookie = setCookie
    .map((value) => value.split(";", 1)[0])
    .find((value) => value.startsWith(\`\${name}=\`));
  if (cookie === undefined) throw new Error(\`Cookie \${name} is missing\`);
  return cookie;
}

describe("session fixation defense", () => {
  it("rotates on login and rejects the pre-authentication identifier", async () => {
    const app = buildSecureApp();

    const anonymous = await request(app).get("/anonymous").expect(200);
    const oldCookie = cookiePair(anonymous.headers["set-cookie"], "sid");

    const login = await request(app)
      .post("/login")
      .set("Cookie", oldCookie)
      .send({ username: "alice", password: "test-pass" })
      .expect(200);
    const newCookie = cookiePair(login.headers["set-cookie"], "sid");

    expect(newCookie).not.toBe(oldCookie);

    await request(app).get("/me").set("Cookie", oldCookie).expect(401);
    const me = await request(app).get("/me").set("Cookie", newCookie).expect(200);
    expect(me.body).toEqual({ userId: "user-alice" });
  });
});
\`\`\`

If this test runs against the vulnerable fixture, login may not send a new \`Set-Cookie\`, and replaying the old value reaches \`/me\`. That is the exploit condition expressed as a deterministic regression.

Run a focused iteration with \`vitest run -t "rotates on login"\`. Keep test credentials and the application in an isolated environment. Do not aim fixation probes at systems without authorization.

## Add negative cases that catch partial fixes

A single successful login case can approve an incomplete patch. Parameterize the state transitions and add these assertions:

- invalid credentials do not create an authenticated session;
- a new ID is not issued as an authenticated session before MFA completes;
- MFA completion rotates the identifier used by the partial-auth state;
- logout invalidates the current authenticated identifier server-side;
- role elevation rotates again and the lower-privilege identifier cannot use elevated functions;
- parallel requests using the old ID cannot win a race during regeneration;
- the new session contains only approved carried state.

The failed-login test below ensures the old anonymous session remains unprivileged. Whether the application rotates after a failed login is a separate anti-abuse policy; the security requirement here is no promotion.

\`\`\`typescript
import request from "supertest";
import { expect, it } from "vitest";
import { buildSecureApp } from "./secure-app";

function firstCookie(values: string[] | undefined): string {
  if (values === undefined || values.length === 0) {
    throw new Error("Expected an anonymous session cookie");
  }
  return values[0].split(";", 1)[0];
}

it("never promotes an anonymous session after failed credentials", async () => {
  const app = buildSecureApp();
  const anonymous = await request(app).get("/anonymous").expect(200);
  const cookie = firstCookie(anonymous.headers["set-cookie"]);

  await request(app)
    .post("/login")
    .set("Cookie", cookie)
    .send({ username: "alice", password: "wrong" })
    .expect(401);

  await request(app).get("/me").set("Cookie", cookie).expect(401);
});
\`\`\`

For MFA, capture the identifier before first-factor submission, after first factor, and after final factor. Your policy may rotate more than once. The decisive assertion is that an identifier known before the final privilege transition cannot use fully authenticated endpoints afterward.

## Verify cookie scope without confusing it with regeneration

Cookie flags support session security, but they do not replace ID rotation. \`HttpOnly\` reduces script access to a cookie; \`Secure\` restricts transmission to secure connections; \`SameSite\` influences cross-site sending; narrow \`Domain\` and \`Path\` reduce where a cookie is sent. None makes preservation of a fixed identifier across login safe.

| Attribute or property | Security value | Fixation relevance | Test observation |
| --- | --- | --- | --- |
| host-only cookie | sibling hosts cannot set it through a broad Domain scope | reduces cross-subdomain planting | \`Domain\` attribute absent |
| \`Secure\` | browser sends only over HTTPS | resists network injection paths | flag present in production |
| \`HttpOnly\` | scripts cannot read it through \`document.cookie\` | limits some script-assisted attacks | flag present |
| \`SameSite\` | controls cross-site cookie sending | limits some delivery paths | declared policy present |
| narrow \`Path\` | restricts request paths | can reduce collision surface | path matches application design |
| ID regeneration | replaces known identifier | primary fixation control | value changes and old value fails |

Do not assert \`Secure\` in an in-process HTTP fixture unless the test config intentionally enables it and simulates HTTPS correctly. Assert production cookie policy at a deployed HTTPS boundary. Framework proxy-trust settings can affect whether a secure cookie is emitted behind TLS termination, so public-path coverage matters.

## Reproduce the browser path with isolated contexts

An HTTP test proves server semantics. A browser test adds cookie selection, redirects, frontend submission, and real storage behavior. Use one browser context to obtain the anonymous cookie and another to represent the victim. Copy only the pre-authentication cookie, then log in through the victim context and replay the original from the attacker context.

The following Playwright test assumes an authorized test deployment with \`/anonymous\`, \`/login\`, and \`/me\` matching the fixture contract. It uses API requests within isolated browser contexts, so it does not depend on a particular login-page DOM.

\`\`\`typescript
import { expect, test } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL;
if (baseURL === undefined) throw new Error("TEST_BASE_URL is required");

test("a fixed browser cookie cannot cross authentication", async ({ browser }) => {
  const attacker = await browser.newContext({ baseURL });
  const victim = await browser.newContext({ baseURL });

  await attacker.request.get("/anonymous");
  const attackerCookies = await attacker.cookies();
  const oldSession = attackerCookies.find((cookie) => cookie.name === "sid");
  if (oldSession === undefined) throw new Error("sid cookie was not issued");

  await victim.addCookies([oldSession]);
  const login = await victim.request.post("/login", {
    data: { username: "alice", password: "test-pass" },
  });
  expect(login.status()).toBe(200);

  const victimCookies = await victim.cookies();
  const newSession = victimCookies.find((cookie) => cookie.name === "sid");
  if (newSession === undefined) throw new Error("rotated sid cookie was not issued");
  expect(newSession.value).not.toBe(oldSession.value);

  expect((await attacker.request.get("/me")).status()).toBe(401);
  expect((await victim.request.get("/me")).status()).toBe(200);

  await attacker.close();
  await victim.close();
});
\`\`\`

This pattern also reveals duplicate cookie-name problems. If the application sets two \`sid\` cookies with different paths or domains, \`find\` may hide ambiguity. In that case, assert the full cookie set and resolve which cookie the protected request actually sends.

## Test alternate fixation channels and reject unsupported IDs

Historically, applications have accepted session IDs through URL parameters, path segments, hidden form fields, custom headers, or cookies. Supporting more than one exchange mechanism expands fixation and leakage opportunities. If your policy is cookie-only, prove that a valid session identifier copied into a query parameter or request body is ignored.

\`\`\`typescript
import request from "supertest";
import { expect, it } from "vitest";
import { buildSecureApp } from "./secure-app";

it("does not accept a session identifier from the URL", async () => {
  const app = buildSecureApp();
  const response = await request(app)
    .get("/me")
    .query({ sid: "attacker-selected-value" })
    .expect(401);
  expect(response.body).toEqual({ error: "unauthenticated" });
});
\`\`\`

Also verify that malformed, unsigned, expired, or unknown cookie values produce a fresh anonymous state or an unauthorized response, not a server error and never a privileged session. Treat session IDs as untrusted input. Avoid reflecting them in response bodies or logs.

## Diagnose the proxy-only fixation failure

Suppose in-process tests show a new session cookie after login, but the browser test through staging observes the same value. The easy conclusion is that regeneration failed. The actual cause may sit at the boundary.

Use this diagnosis sequence:

1. Capture every \`Set-Cookie\` field on the anonymous response, login response, and redirect chain.
2. Inspect the browser cookie store after each hop, including domain and path.
3. Compare direct application traffic with the public reverse-proxy path.
4. Look for a second component that rewrites, caches, or appends a cookie with the same name.
5. Confirm HTTPS termination and framework proxy trust allow the intended secure cookie to be set.
6. Check sibling applications sharing an overly broad \`Domain\` attribute.

A common concrete failure is two same-name cookies: the login service sets a fresh host-only \`sid\`, while an older gateway cookie with \`Domain=example.test\` remains. Different servers or libraries select different values from the resulting Cookie field. Rotation occurred, but ambiguity preserves attacker influence. Fix cookie naming and scope, expire the obsolete cookie correctly, and keep a browser regression that asserts there is one authoritative session cookie.

Another failure comes from session-store races. Regeneration destroys \`S1\` and creates \`S2\`, but a concurrent request using \`S1\` writes stale session state back after destruction. Test parallel replay around login against the real shared store. The secure result is that none of the old-ID requests gains authenticated state.

## Keep evidence useful without leaking credentials

Security test artifacts should record transition outcomes, not raw session values. Log a short test-local digest when correlation is necessary. Use a per-run random salt, retain it briefly, and never write the original cookie to CI output.

\`\`\`typescript
import { createHash, randomBytes } from "node:crypto";

const runSalt = randomBytes(32);

export function sessionFingerprint(sessionId: string): string {
  return createHash("sha256")
    .update(runSalt)
    .update(sessionId)
    .digest("hex")
    .slice(0, 16);
}

console.log({ event: "session-rotated", oldRejected: true });
\`\`\`

Even a digest can become linkable within a run, so include it only when it answers a diagnostic question. Mask \`Cookie\`, \`Set-Cookie\`, authorization codes, reset tokens, and credentials in HTTP tracing. Restrict full traces to an approved secure artifact path with short retention.

## Turn the state machine into a release gate

For each privilege-changing route, require evidence for four outcomes: identifier changed, old identifier rejected, new identifier authorized at exactly the new level, and unapproved anonymous state absent. Run fast in-process tests on every change to authentication or session middleware. Run browser and shared-store race tests in a controlled deployment before release.

AI coding agents frequently patch the happy path while missing OAuth callbacks or MFA completion. Give the agent the transition inventory, cookie name, expected status codes, and old-token replay requirement. Ask it to show failing-before and passing-after evidence. A diff that merely calls a regeneration method is not proof because callback ordering, state copying, proxy cookies, and store races can still break the defense.

## Frequently Asked Questions

### Is changing the session cookie value enough to stop fixation?

Only if the server also ensures the previous identifier cannot access the authenticated state. A cosmetic cookie change can leave the old server-side session privileged, or two identifiers can point to the same promoted object. The regression must assert both halves: the post-authentication value differs, and replaying the pre-authentication value receives an unauthorized result. Then verify the new identifier has exactly the intended privileges and no unsafe anonymous state was copied.

### Should the session ID rotate before or after MFA?

Rotate at every meaningful privilege change according to the application's state model. After a correct first factor, the user may enter a limited partial-authentication state; final MFA completion grants full authentication and must not preserve an identifier known before that transition. Some systems rotate after both stages. Test the identifier captured at each boundary and verify that older values cannot access endpoints requiring the later assurance level.

### Do Secure, HttpOnly, and SameSite cookies prevent session fixation?

They reduce important delivery and theft paths, but they do not replace regeneration. \`Secure\` restricts transmission to HTTPS, \`HttpOnly\` blocks normal script reads, and \`SameSite\` changes cross-site sending behavior. An application that keeps the same known identifier across login can remain fixable with all three flags present. Test cookie attributes at the deployed HTTPS boundary, and separately prove rotation plus old-identifier invalidation at each privilege change.

### How is session fixation different from CSRF?

Session fixation makes a victim authenticate into an identifier the attacker already knows or influenced. CSRF causes a victim's browser to perform an unwanted action using the victim's existing credentials. They can interact, but the test oracles differ. Fixation testing compares identifiers across authentication and replays the old value. CSRF testing verifies request intent defenses such as tokens, origin checks, or same-site policy on state-changing operations. Passing one suite does not imply passing the other.
`,
};
