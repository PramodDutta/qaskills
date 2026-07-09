# Email-capture lead magnet on qaskills.sh

## Problem

Ship a working email-capture popup that delivers a PDF ebook + a zip of 5 Claude Code QA skills, wired to existing infra, tested, in one session.

## Approach

1. **Explore before building.** Grepped for existing email/capture infra. Found an untracked WIP feature: `landing_signups` table (schema), `/api/signups/waitlist` route (Resend confirmation, idempotent insert, CORS), and a `waitlist-form.tsx`. Reused it instead of inventing a parallel system.
2. **Verify prod reality, read-only.** Pulled prod env (`vercel env pull`), queried `to_regclass('public.landing_signups')` from `packages/web` (driver only installed there, not repo root). Table was MISSING in prod even though schema existed. That single fact drove the whole plan.
3. **Build assets locally.** Zip = 5 real `seed-skills/*/SKILL.md` + a README via `zip`. PDF = hand-written HTML rendered with Playwright's `page.pdf()`, using `chromium.launch({ channel: 'chrome' })` (system Chrome) because the bundled chromium wasn't installed. Both dropped in `packages/web/public/lead-magnet/` so Vercel serves them as static files.
4. **Extend, don't fork, the route.** Added a `claude-qa-lead-magnet` source that returns download links in the JSON response AND emails them. Wrapped the DB insert in try/catch so a missing table logs-and-continues for the lead-magnet source (delivery never blocked on storage).
5. **Popup = client component** mounted in root layout, shows once via `localStorage`, delayed 12s.
6. **Test through HTTP, not just build.** Clerk middleware 500s every route locally on a missing/invalid key. The repo's dummy `pk_test_post_flow` fails Clerk's newer strict format check. Fix: construct a valid-FORMAT fake key `pk_test_$(printf 'foo.clerk.accounts.dev$' | base64)`; then `QASKILLS_DISABLE_AUTH=1` short-circuits the middleware body. Only then could I curl the endpoint (200 + links, 400 on bad email, idempotent dup, assets 200).
7. **Gate the one irreversible step.** Prod DDL (`CREATE TABLE`) is ask-first per repo rules. Asked, got yes, ran an additive `CREATE TABLE IF NOT EXISTS` + unique index (NOT `db:push`, which can diff/alter other tables).

## Judgment calls (deliberately NOT done)

- **Did NOT use db:push to prod.** A targeted idempotent CREATE is safer than letting drizzle diff the whole schema against prod.
- **Did NOT add n8n or Clerk** despite the ask mentioning them. Resend was already integrated and covers delivery; n8n needs an external instance, Clerk is auth (irrelevant to public capture). Used what existed; noted the rest as optional.
- **Did NOT commit the whole WIP.** Staged only the 7 files the lead magnet needs (schema, route, popup, layout, 2 assets, index export). Left `waitlist-form.tsx`, `globals.css`, and other WIP untracked.
- **Did NOT block on storage.** Endpoint returns downloads even if insert/email fail, so a captured lead always gets their file.

## Reusable rule

When asked to "build X," first grep for a half-built X in the working tree and complete it; verify prod schema reality read-only before coding; make the delivery path degrade gracefully around the one prod change that needs approval, so the feature works even before that approval lands.
