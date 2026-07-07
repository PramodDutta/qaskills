---
name: ship-prod
description: Use when deploying qaskills.sh to production, verifying whether a deploy landed, or when a push to main did not show up on the live site, e.g. "deploy", "ship it", "push this live", "is prod updated?", "the site still shows the old version".
---

# Ship Prod

Deploys COMMITTED HEAD only, to the correct Vercel project, then proves the deploy landed. `git push` to main does not reliably auto-deploy; this skill is the deploy path.

## Fixed facts

- Project: `qaskills.sh`, project ID `prj_rDKli4AyhHoXZXV8NHrs92Ncbf4f`, org `team_DGM6VSs6vhASlhktmHkSqPwn`, account `luckydutta96`
- A decoy project `qaskills` exists WITHOUT the domain. Never deploy there. Never accept interactive "link this directory?" defaults.
- Build command lives in root `vercel.json` (`shared build && web build`); Node must stay 20.x (Neon driver breaks on 24)
- `vercel --prod` uploads the WORKING TREE, not git HEAD
- `.vercel/project.json` is gitignored, so fresh worktrees are unlinked: explicit env IDs required there

## Preflight

```bash
cd /Users/promode/qaskills
vercel whoami                              # must be luckydutta96; else STOP, user must vercel login
git status --short                         # empty => clean path; anything => worktree path
git log -1 --oneline --stat | head -15     # confirm HEAD is exactly what you intend to ship
pnpm --filter @qaskills/shared build && pnpm --filter @qaskills/web build   # never ship a red build
```

## Deploy

**Clean tree** (no modified or untracked files that could ship):

```bash
cd /Users/promode/qaskills && npx vercel --prod --yes
```

**Dirty tree** (default assumption; the working tree here usually carries WIP):

```bash
DEPLOY_DIR=$(mktemp -d)/qaskills-deploy
git -C /Users/promode/qaskills worktree add "$DEPLOY_DIR" HEAD
cd "$DEPLOY_DIR"
VERCEL_ORG_ID=team_DGM6VSs6vhASlhktmHkSqPwn \
VERCEL_PROJECT_ID=prj_rDKli4AyhHoXZXV8NHrs92Ncbf4f \
npx vercel --prod --yes
cd /Users/promode/qaskills
git worktree remove "$DEPLOY_DIR" --force
```

Capture the deployment URL the CLI prints; it goes in the final summary.

## Verify (required, every deploy)

```bash
npx vercel ls | head -5                                         # newest deployment: Ready, Production
curl -s -o /dev/null -w '%{http_code}\n' https://qaskills.sh    # 200
# The specific change, visible live. Examples:
curl -s -o /dev/null -w '%{http_code}\n' https://qaskills.sh/blog/<new-slug>   # new article: 200
curl -s https://qaskills.sh/<changed-page> | grep -c '<expected-marker>'       # code change: >= 1
```

All three must pass before saying "deployed". If the domain still serves old content while the new deployment is Ready, the alias did not move: `npx vercel promote <deployment-url>`.

## Rollback

```bash
npx vercel ls                       # find the previous Ready production deployment
npx vercel promote <previous-url>   # fast path: point the domain back
```

For a code-level revert, `git revert <sha>` on main, then run this skill again.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| CLI asks to link / offers project `qaskills` | Unlinked dir, interactive defaults | Abort; re-run with both VERCEL_* env vars set |
| `Error: not authorized` / wrong scope | Logged into another account | `vercel whoami`; user runs `vercel login` as luckydutta96 |
| Vercel build fails, local build green | Env-dependent code at import time | Lazy-init pattern (see CLAUDE.md); no secrets required at build |
| Deploy Ready but site unchanged | Domain alias on older deployment, or you shipped stale HEAD | `vercel promote`; confirm intended commit was in HEAD |
| WIP appeared on prod | Deployed dirty working tree directly | Roll back via promote, then redeploy via worktree |

## Red flags

- "The push probably triggered a deploy"
- Deploying from a dirty root without the worktree
- Answering Vercel's interactive prompts with defaults
- Declaring success without the three verification commands' output
- Touching Vercel project settings (Node version, env vars, domains) without user approval
