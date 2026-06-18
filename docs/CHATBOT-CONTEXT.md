# QASkills.sh — Complete Project Context (Chatbot Training Corpus)

> Purpose: a single, authoritative knowledge base about QASkills.sh for training/grounding a
> support & info chatbot. Use the prose sections for RAG/system-prompt grounding and the Q&A
> section (bottom) for fine-tuning or few-shot examples. Last updated: 2026-06-15.

---

## 1. One-liner

**QASkills.sh is a free, open-source directory of curated QA-testing "skills" that you install
into AI coding agents (Claude Code, Cursor, GitHub Copilot, and 30+ others) to give them
expert software-testing knowledge.**

Domain: https://qaskills.sh

## 2. Elevator pitch

AI coding agents are great at writing app code but mediocre at testing it — they produce
flaky tests, miss edge cases, and don't know framework best practices. QASkills.sh fixes that.
It's a registry of ready-made `SKILL.md` files (each one teaches an agent how to do a specific
QA task well — e.g., "write Playwright E2E tests with the Page Object Model"). You install a
skill in ~5 seconds with one CLI command; the agent instantly inherits that expertise. You can
also browse skills on the web, bundle them into packs, and publish your own.

## 3. Mission & audience

- **Mission:** make AI coding agents genuinely good at QA by giving them curated, expert
  testing knowledge, openly and for free.
- **Primary audience:** developers, SDETs, QA engineers, and test automation engineers who use
  AI coding agents.
- **Secondary:** engineering teams standardizing test practices across an org, and content/SEO
  readers searching for testing tutorials and tool comparisons.

## 4. Core concepts (glossary)

- **Skill** — a unit of QA expertise packaged as a `SKILL.md` file (YAML frontmatter +
  markdown instructions) that teaches an AI agent how to perform a specific testing task.
- **SKILL.md** — the file format. YAML frontmatter holds metadata (name, description, version,
  author, tags, testingTypes, frameworks, languages, domains, agents); the markdown body holds
  the actual instructions the agent follows.
- **AI coding agent** — tools like Claude Code, Cursor, Copilot that read config/skill files to
  guide their behavior. QASkills installs skills into each agent's correct config directory.
- **Skill Pack** — a curated bundle of related skills installed together in one command
  (e.g., a "Playwright starter pack").
- **Quality score** — each skill gets a 0–100 score based on content completeness, metadata
  accuracy, description quality, and token count. Higher scores rank better in search and on
  the leaderboard.
- **Leaderboard** — ranks skills by popularity/quality.
- **Agent compatibility** — which agents a given skill supports (skills can be agent-agnostic
  or agent-specific).

## 5. What we have (inventory — approximate, grows continuously)

- **380+ QA skills** (in `seed-skills/`, seeded to the database).
- **650+ blog articles/tutorials** covering testing frameworks, comparisons, and AI-agent QA.
- **48 side-by-side `/compare/<a>-vs-<b>` pages** (tool comparisons with feature matrices).
- **Topic hub landing pages** at `/skills-for/<topic>` (e.g., Claude Code testing, Cursor,
  Copilot, Windsurf, Playwright+TypeScript, Selenium+Java, API contract testing, visual
  regression, AI/LLM evals, MCP testing).
- **30+ supported AI agents** (full list in §9).
- **A CLI** published to npm as `@qaskills/cli` (current version 0.2.0).
- **An SDK**, a **skill validator**, and a **shared type/schema library**.

Blog content by category (top): Guides (~333), References (~90), Tutorials (~82), Comparisons
(~40), AI Testing (~30), API Testing (~17), Migration guides (~15), BDD (~12), Performance
(~10), plus Career, Security, Strategy, and more.

## 6. Tech stack & architecture

QASkills.sh is a **pnpm monorepo** (pnpm 9.15, Node ≥ 20) orchestrated with **Turborepo**.

**Packages:**
| Package | Purpose |
|---|---|
| `@qaskills/shared` | Source-of-truth types, constants (agent definitions), Zod schemas, the SKILL.md parser. Dependency of all others. |
| `@qaskills/cli` | The `qaskills` command-line tool (Commander.js + @clack/prompts). |
| `@qaskills/sdk` | Programmatic TypeScript SDK. |
| `@qaskills/skill-validator` | Validates SKILL.md files against the schema. |
| `@qaskills/web` | The Next.js 15 web app (directory + dashboard + API). |

**Web app stack:** Next.js 15 (App Router), React 19, TailwindCSS v4, shadcn/ui (Radix).
Backend services: **Neon Postgres** (via Drizzle ORM) for data, **Typesense** for search,
**Upstash Redis** for caching, **Clerk** for auth, **PostHog** for analytics, **Resend** for
email. Deployed on **Vercel**.

**Key patterns:** lazy DB/email singletons (avoid build-time errors); server components fetch
data and pass serializable props to client components; markdown rendered with react-markdown +
remark-gfm + rehype-sanitize; SEO schema via JSON-LD (WebSite, Organization, BlogPosting,
FAQPage, BreadcrumbList, etc.).

## 7. The CLI

Install/run via npx (no global install needed): `npx @qaskills/cli <command>`.

**Commands:** `add`, `search`, `init`, `list`, `remove`, `update`, `info`, `publish`.

- `add <skill>` — auto-detects your AI agent and installs the skill to the right config dir.
- `search <query>` — search the registry.
- `list` — list installed skills.
- `remove <skill>` — uninstall a skill.
- `info <skill>` — show skill details.
- `update` — update installed skills.
- `init` — scaffold a new SKILL.md.
- `publish <path>` — publish your SKILL.md to the registry.

The CLI probes 30+ agent config paths to auto-detect which agents you have, and downloads
skills with a 3-tier fallback (git clone → content API → reconstruct from metadata).
Requires Node.js 18+. Anonymous install telemetry can be disabled with
`export QASKILLS_TELEMETRY=0`.

## 8. Web app — key pages

- `/` — homepage (hero, leaderboard preview, agent marquee, stats, categories, demo, CTA).
- `/skills` — browse/search all skills (filter by framework, language, testing type, agent).
- `/skills/<author>/<slug>` — individual skill detail page (renders full SKILL.md).
- `/leaderboard` — top skills by popularity/quality.
- `/blog` and `/blog/<slug>` — 650+ testing tutorials, guides, comparisons.
- `/compare/<a>-vs-<b>` — tool comparison pages.
- `/skills-for/<topic>` — topic hub landing pages.
- `/packs` — skill packs (bundles).
- `/agents` — supported AI agents.
- `/faq`, `/contact`, `/how-to-publish` — help pages.
- `/llms.txt` — machine-readable summary for AI crawlers/citation.

## 9. Supported AI agents (30+)

Claude Code, Cursor, GitHub Copilot, Windsurf, Codex CLI, Aider, Continue, Cline, Zed AI,
Bolt.new, Lovable, v0, Devin, Sourcegraph Cody, Tabnine, Replit Agent, Amazon Q Developer,
JetBrains AI, Gemini Code Assist, Supermaven, Double, Aide, Void, Trae, Roo Code, Augment Code,
Privy, Gemini CLI, Amp, and more. Each agent definition records its config directory, skills
directory, config file, and install method so the CLI installs to the correct location.

## 10. Content & SEO

QASkills.sh publishes a large, growing library of QA content for SEO and to help users:
650+ blog tutorials/guides, 48 comparison pages, and topic hubs. Content is optimized for
both traditional search and AI search (GEO): FAQPage/BlogPosting/HowTo JSON-LD schema, an
enhanced `/llms.txt`, internal-link clustering, and direct-answer formatting so AI Overviews
and assistants (ChatGPT, Perplexity, Claude) can cite it. Some QASkills.sh content is already
cited in Google AI Overviews (e.g., for "comparing popular BDD frameworks").

## 11. Brand & people

- **Creator:** Pramod Dutta — founder of **The Testing Academy** (QA education brand,
  YouTube `@TheTestingAcademy`).
- **Positioning:** practical, developer-first, no-fluff QA expertise for the AI-agent era.
- **Voice:** knowledgeable, concise, practical, friendly; favors concrete examples and code.

## 12. Pricing & licensing

- **Free and open source.** Browsing skills, installing via the CLI, and publishing your own
  skills are all free. Core code and seed skills are open source (MIT).

## 13. Common user journeys

1. **Install a skill:** find a skill on the site or via `npx @qaskills/cli search`, then
   `npx @qaskills/cli add <skill>` — the CLI detects your agent and installs it.
2. **Publish a skill:** write a `SKILL.md`, validate with the skill-validator, then
   `npx @qaskills/cli publish ./SKILL.md` (or follow the How-to-Publish guide).
3. **Browse/learn:** read blog tutorials and comparison pages; browse `/skills` and
   `/leaderboard`.
4. **Standardize a team:** install a Skill Pack so every engineer's agent shares the same QA
   practices.

---

## 14. FAQ / Q&A (primary chatbot training pairs)

**Q: What is QASkills.sh?**
A: A free, open-source directory of curated QA-testing skills for AI coding agents. You install
these skills into Claude Code, Cursor, Copilot, and 30+ other agents to give them expert
software-testing knowledge.

**Q: What is a "skill"?**
A: A skill is a `SKILL.md` file — YAML frontmatter (metadata) plus markdown instructions — that
teaches an AI agent how to perform a specific QA task, like writing Playwright tests with the
Page Object Model or setting up API contract tests.

**Q: Is QASkills.sh free?**
A: Yes. Browsing, installing via the CLI, and publishing your own skills are all free. It's
open source.

**Q: How do I install a skill?**
A: Run `npx @qaskills/cli add <skill-name>` in your terminal. The CLI auto-detects your AI
agent and installs the skill to the correct config directory.

**Q: Which AI agents are supported?**
A: 30+, including Claude Code, Cursor, GitHub Copilot, Windsurf, Codex CLI, Aider, Continue,
Cline, Zed, Bolt.new, Lovable, v0, Devin, Sourcegraph Cody, JetBrains AI, Gemini Code Assist,
Gemini CLI, Amp, Roo Code, and more.

**Q: Do I need Node.js?**
A: Yes — Node.js 18+ and npx to use the CLI. Most developers already have these.

**Q: How do I publish my own skill?**
A: Create a `SKILL.md` file, validate it with `npx @qaskills/skill-validator validate
./SKILL.md`, then publish with `npx @qaskills/cli publish ./SKILL.md`. See the How-to-Publish
guide for details.

**Q: What is the quality score?**
A: A 0–100 score for each skill based on content completeness, metadata accuracy, description
quality, and token count. Higher scores rank better in search and on the leaderboard.

**Q: Can I install multiple skills at once?**
A: Yes. Install as many as you want, or use a Skill Pack to install a bundle of related skills
in one command.

**Q: How do I uninstall a skill?**
A: Run `npx @qaskills/cli remove <skill-name>`.

**Q: Where are skills stored on my machine?**
A: In your AI agent's config directory — e.g., `~/.claude/` for Claude Code, `.cursor/rules`
for Cursor. The CLI auto-detects the correct location per agent.

**Q: How do I update an installed skill?**
A: Run `npx @qaskills/cli update`, or re-run `add`. Publishers bump the version in their
SKILL.md frontmatter and re-publish.

**Q: Does the CLI collect data?**
A: It collects anonymous install/remove telemetry to improve the service — no personal data.
Disable it with `export QASKILLS_TELEMETRY=0`.

**Q: Is QASkills.sh open source?**
A: Yes, MIT-licensed — the CLI, SDK, web app, and seed skills.

**Q: What kinds of skills are available?**
A: 380+ skills across E2E (Playwright, Cypress, Selenium, WebdriverIO), unit testing (Jest,
Vitest, pytest, JUnit), API testing, performance (k6, JMeter), accessibility, visual
regression, mutation testing, BDD, contract testing, mobile (Appium, Detox, Maestro), and
AI/LLM evaluation (OpenAI Evals, promptfoo, RAGAS, DeepEval).

**Q: What's the difference between a skill and a blog article?**
A: A skill is installed into your AI agent to change how it works. A blog article is human-
readable documentation/tutorial on the website. Skills act; articles teach.

**Q: Can QASkills help my agent write better Playwright/Cypress/pytest tests?**
A: Yes — that's the core use case. Install the relevant skill and your agent follows that
framework's best practices (locators, fixtures, Page Object Model, etc.).

**Q: Who made QASkills.sh?**
A: Pramod Dutta, founder of The Testing Academy (YouTube @TheTestingAcademy).

**Q: How is QASkills different from just prompting my agent?**
A: Skills are reusable, version-controlled, and curated by experts. Instead of re-writing the
same testing instructions in every prompt, you install a skill once and the agent applies it
consistently.

**Q: What is a Skill Pack?**
A: A curated bundle of related skills installed together in one command — handy for onboarding
a team to a shared set of testing practices.

**Q: Does it work offline?**
A: Installing requires internet (downloads from the registry). Once installed, the skill files
live locally and the agent uses them without QASkills.

**Q: What's `/llms.txt`?**
A: A machine-readable summary of the site for AI crawlers and assistants, so they can discover
and cite QASkills content accurately.

**Q: Can I contribute or report an issue?**
A: Yes — it's open source on GitHub (PramodDutta/qaskills). Publish skills via the CLI, or open
a GitHub discussion/issue. There's also a contact page.

---

## 15. Guidance for the chatbot (scope & voice)

- **Scope:** answer questions about QASkills.sh (what it is, installing/publishing skills,
  supported agents, the CLI, pricing, concepts) and general QA/testing topics QASkills covers.
- **Voice:** concise, practical, developer-friendly, example-driven. Match The Testing Academy
  tone — helpful and no-fluff.
- **When unsure:** point users to the relevant page (`/faq`, `/how-to-publish`, `/skills`, the
  blog) or the GitHub repo rather than inventing specifics (exact skill names, versions, or
  internal API details change over time).
- **Don't:** invent skill names, quality scores, or commands that aren't in this document;
  don't claim paid tiers (it's free); don't promise agent support beyond the listed agents
  without checking.
- **Canonical install command:** `npx @qaskills/cli add <skill-name>`.
