# QASkills.sh - Work in Progress Tracker

**Last Updated:** 2026-02-12 (Session 3 — All features deployed to production)

---

## 🎯 Current Sprint Goals

### 1. Leaderboard Filter Tabs Fix
**Status:** ✅ COMPLETED
**Priority:** High

**Issue:**
- Filter tabs (All Time, Trending, Hot, New) weren't working when clicked
- Was using anchor tags instead of Next.js Link
- URL construction created `/leaderboard?` for "all" filter
- Page was statically cached

**Solution Implemented:**
- [x] Replaced `<a>` tags with Next.js `<Link>` component
- [x] Fixed URL construction: `/leaderboard` for "all", `/leaderboard?filter=X` for others
- [x] Added `export const dynamic = 'force-dynamic'` to prevent static caching
- [x] Added `export const revalidate = 300` for 5-minute cache

---

### 2. Resend Email Integration
**Status:** ✅ COMPLETED
**Priority:** Medium

**Implementation Complete:**
- [x] Resend client initialized in `src/lib/email/client.ts` (lazy singleton pattern)
- [x] Email sending functions in `src/lib/email/send.ts`
- [x] Welcome email wired to Clerk webhook
- [x] New skill alert wired to skill creation API
- [x] Weekly digest cron job created
- [x] Vercel cron configured (runs Mondays at 9 AM)
- [x] All email templates updated with signed unsubscribe URLs (Session 3)

**Deployment Checklist:**
- [ ] Set `RESEND_API_KEY` in production environment
- [ ] Set `CRON_SECRET` in production environment
- [ ] Set `UNSUBSCRIBE_SECRET` in production environment (or it falls back to `CRON_SECRET`)
- [ ] Verify email templates render correctly
- [ ] Test welcome email (create test user)
- [ ] Test new skill alert (publish test skill)
- [ ] Test weekly digest (call `/api/cron/weekly-digest` manually with auth header)

---

### 3. datafa.st Analytics Integration
**Status:** ✅ COMPLETED (all 11 events restored)
**Priority:** Low

**Goals Currently Tracked:**
- [x] `copy_hero_command` - Hero terminal copy button
- [x] `copy_install_command` - Install button clicks
- [x] `filter_skills` - Skills filter interactions
- [x] `pack_viewed` - Pack card clicks (via `PacksGrid` client component — Session 3)
- [x] `leaderboard_filter_click` - Filter tab clicks (via `FilterTabs` client component — Session 3)
- [x] `review_submitted` - Skill review submissions
- [x] `skill_published` - Skill publication events
- [x] `gate_hit` - Signup gate triggers
- [x] `select_agent` - Agent selector interactions
- [x] `email_preferences_updated` - Email preference changes
- [x] `preference_toggled` - General preference toggles

---

### 4. Production Server-Side Exceptions Fix (Session 2)
**Status:** ✅ COMPLETED & DEPLOYED
**Priority:** Critical

**Issue:**
- Both `/leaderboard` and `/packs` pages returning 500 server-side exceptions
- Caused by Sonnet adding `onClick` event handlers in Server Components (forbidden in RSC)
- Packs page also had `currentUser()` + inline `PackCard` causing runtime 500 on Vercel

**Solution:**
- [x] Removed `onClick` handler from leaderboard `<Link>` component
- [x] Reverted packs page, then re-implemented properly with client components (Session 3)
- [x] Force-deployed via `vercel --prod` (git push wasn't triggering auto-deploy)

**Commits:** `38cc177`, `eac4e25`

---

### 5. SignupGate & Auth Features (Session 2)
**Status:** ✅ COMPLETED & DEPLOYED
**Priority:** Medium

- [x] `packages/web/src/components/auth/signup-gate.tsx` — Client component gating content behind Clerk auth
- [x] `packages/web/src/components/skills/install-button.tsx` — Updated with SignupGate wrapper
- [x] `packages/web/src/app/api/user/preferences/route.ts` — GET/PATCH for email preferences
- [x] `packages/web/src/app/dashboard/preferences/page.tsx` — User preferences UI page

---

### 6. Unsubscribe API Endpoint (Session 3)
**Status:** ✅ COMPLETED & DEPLOYED
**Priority:** High (CAN-SPAM compliance)

**Implementation:**
- [x] `src/lib/email/unsubscribe-token.ts` — HMAC-SHA256 token generation/verification using Node.js crypto
- [x] `src/app/api/unsubscribe/route.ts` — POST endpoint that verifies token + updates userPreferences
  - Supports `type: 'all' | 'weekly' | 'alerts'` for granular unsubscribe
  - Creates preferences row if it doesn't exist
  - No auth required (token-based verification)
- [x] Updated `src/app/unsubscribe/page.tsx` — Calls real API instead of faking success, wrapped in Suspense
- [x] Updated all 3 email templates (`welcome.tsx`, `weekly-digest.tsx`, `new-skill-alert.tsx`) with `unsubscribeUrl` prop
- [x] Updated `send.ts` with `buildUnsubscribeUrl()` helper + `userId` passed from all callers
- [x] Updated webhook (`clerk/route.ts`), cron (`weekly-digest/route.ts`), and skills API (`skills/route.ts`) to pass `userId`

**Commit:** `0e7182e`

---

### 7. Packs Page Auth Gating (Session 3)
**Status:** ✅ COMPLETED & DEPLOYED
**Priority:** Medium

**Implementation:**
- [x] `src/components/packs/packs-grid.tsx` — `'use client'` component using `useAuth()` from Clerk
  - Signed in: shows all packs
  - Not signed in: shows 2 free packs + SignupGate for the rest
  - Includes loading skeleton state
- [x] Updated `src/app/packs/page.tsx` — Server component passes serializable data to `<PacksGrid>`
- [x] Proper server/client split: data fetching stays on server, interactivity on client

**Commit:** `0e7182e`

---

### 8. Analytics Tracking Restoration (Session 3)
**Status:** ✅ COMPLETED & DEPLOYED
**Priority:** Low

- [x] `src/components/leaderboard/filter-tabs.tsx` — Client component with `leaderboard_filter_click` event
  - Icons passed as string keys (serializable), mapped to Lucide components in client
- [x] `pack_viewed` event added to `PackCard` inside `PacksGrid` client component
- [x] `src/components/packs/pack-card-tracker.tsx` — Standalone tracker wrapper (available if needed)

**Commit:** `0e7182e`

---

### 9. Repo Cleanup (Session 3)
**Status:** ✅ COMPLETED
**Priority:** Low

- [x] Added `.gitignore` patterns for 8 untracked local working files
- [x] No files deleted — all remain on disk, just hidden from version control
- [x] `scripts/` dir confirmed as temp awesome-playwright PR submission files

**Commit:** `0e7182e`

---

### 10. CLAUDE.md Updates (Session 2)
**Status:** ✅ COMPLETED
**Priority:** Low

- [x] Added Resend to web stack listing
- [x] Fixed inaccurate middleware description (was "dynamically imported", actually direct import)
- [x] Added userPreferences to schema listing
- [x] Added newer API routes (user preferences, cron/weekly-digest)

---

## 📝 Completed Tasks Summary

### Bug Fixes
- [x] Fixed leaderboard filter tabs (Session 1)
- [x] Fixed TypeScript errors in new-skill-alert email template (Session 1)
- [x] Fixed /leaderboard 500 error — removed onClick from server component (Session 2)
- [x] Fixed /packs 500 error — reverted then re-implemented properly (Session 2+3)
- [x] Fixed unsubscribe page Suspense boundary error (Session 3)
- [x] Force-deployed to Vercel when git push failed (Session 2+3)

### Features Shipped
- [x] Resend email integration (welcome, new skill alert, weekly digest)
- [x] SignupGate auth component + InstallButton auth gating
- [x] User preferences API + dashboard page
- [x] Unsubscribe API with HMAC-SHA256 token verification
- [x] PacksGrid client component with auth gating
- [x] FilterTabs client component with analytics
- [x] All 11 datafa.st analytics events working
- [x] CLAUDE.md accuracy improvements

### Production Verification
- [x] `/packs` — 200
- [x] `/leaderboard` — 200
- [x] `/unsubscribe` — 200
- [x] `/skills` — 200
- [x] Build passes with zero errors

---

## 🚧 Needs Attention

1. **Vercel Git Integration:** `git push` to main is not triggering auto-deployments. Had to use `vercel --prod` CLI twice. Check GitHub webhook settings in Vercel dashboard.
2. **Resend env vars:** Set `RESEND_API_KEY`, `CRON_SECRET`, `UNSUBSCRIBE_SECRET` in Vercel production environment.
3. **datafa.st Goals:** All 11 events now tracked. Confirm in datafa.st dashboard they're firing correctly.

---

## 📋 Backlog

### Code Quality
- [ ] Add TypeScript strict mode checks
- [ ] Review error handling in API routes
- [ ] Add request validation middleware

### Testing
- [ ] Add unit tests for email functions (send.ts, unsubscribe-token.ts)
- [ ] Add integration tests for leaderboard API
- [ ] Add E2E tests for skill publishing flow
- [ ] Add E2E test for unsubscribe flow

### Documentation
- [ ] Update CLAUDE.md with SDK and Skill Validator sections
- [ ] Add environment variables documentation
- [ ] Create API documentation

### Features
- [ ] Skill Packs implementation (deeper, beyond pack cards)
- [ ] Private skills for enterprise
- [ ] Skill analytics dashboard
- [ ] Unsubscribe feedback form (currently renders but doesn't submit)

---

## 💡 Ideas / Nice to Have

- [ ] Add email preview functionality in dev mode
- [ ] Create admin dashboard for analytics
- [ ] Add A/B testing for email templates
- [ ] Implement rate limiting for API endpoints
- [ ] Add monitoring and alerting (Sentry?)

---

## 📚 Resources

- [Resend Docs](https://resend.com/docs)
- [datafa.st Docs](https://datafa.st/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)

---

## 🔗 Quick Links

- **Production:** https://qaskills.sh
- **GitHub:** https://github.com/PramodDutta/qaskills
- **npm Package:** https://www.npmjs.com/package/@qaskills/cli
- **YouTube:** https://youtube.com/@TheTestingAcademy
