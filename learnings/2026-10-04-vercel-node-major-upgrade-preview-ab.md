# Upgrading a live Vercel app's Node major without gambling on production

## The problem

Vercel stopped building Node 20.x on 2026-10-01, and the repo's own CLAUDE.md said
"never bump Node, the Neon driver breaks on 24." So the upgrade was mandatory, the
house rule forbade it, and the site serves 30K users a month.

## The approach

1. **Find what actually pins the version.** Root `engines` was `>=20.0.0` (a range),
   `packages/web` (Vercel's root directory) had no `engines`, so only the dashboard
   setting held 20.x.
2. **Test the scary belief at its source.** `grep` for `Pool|Client|neonConfig`:
   every DB call (app and both seeders) used the HTTP `neon()` path. The WebSocket
   path is the only one that breaks on 24.
3. **Prove the real build without touching settings.** Throwaway worktree of HEAD,
   add `"engines": {"node": "24.x"}` (uncommitted), deploy a PREVIEW. `engines`
   overrides the dashboard per deployment, so this tests Vercel's real toolchain
   on 24 with zero production impact. The log line to look for: `Node.js version
   changed from "20.x" to "24.x"`.
4. **Notice what the preview did NOT prove.** `/api/skills` returned 200 on the
   preview, but `total: 0`: `DATABASE_URL` is production-only, so the API fell
   back gracefully. A 200 is not a DB test. Test the driver separately: a tiny
   `.mjs` that runs `neon()` against the dev DB, executed with
   `npx -y -p node@24 -- node check.mjs` (no Node 24 was installed locally).
5. **Ask, then ship, then A/B.** Settings changes need approval. After deploying,
   compare the new deployment against the PREVIOUS production URL: same DB,
   different runtime. Identical totals (475, filtered 108) proves the runtime swap.
6. **Flip the dashboard last** with `vercel project update <name> --node-version 24.x`
   (exists in CLI 62; no browser clicking), then rewrite every stale "never bump"
   rule (CLAUDE.md, skills, memory) so no future agent reverts it.

## The judgment calls

- **Did not trust pnpm's docs over a test.** The docs say installs "always fail" when
  a project's `engines` mismatches. An isolated scratch workspace showed pnpm 9.15
  only WARNs for a workspace sub-project, so local Node 22 and CLI CI on Node 20
  stayed safe. Tested in scratch, never in the real repo.
- **Did not test a DB write in production.** Writes use the same HTTP fetch transport
  as reads; a fake install row would pollute real stats.
- **Did not touch the other flagged projects** (botskills, the decoy `qaskills`).
  The approval covered one project.
- **Did not call a 404 a regression before checking the old deployment.**
  `/skills/playwright-e2e` 404'd on both runtimes: it was a wrong URL guess.

## The reusable rule

Before a runtime upgrade, pin the new version on a preview deploy to test the build,
then test the parts the preview cannot reach (prod-only env vars) separately, and
A/B the production deploy against the previous deployment URL. Also: in zsh never
name a loop variable `path`; it is tied to `PATH` and kills every command after it.
