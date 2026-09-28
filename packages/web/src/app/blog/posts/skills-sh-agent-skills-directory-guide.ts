import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'skills.sh Explained: The Open Agent Skills Directory, npx skills add, and the Leaderboard',
  description: 'Learn how skills.sh works, how npx skills add installs agent skills, and how QA teams can judge leaderboard, packs, audits, install paths, and risk.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# skills.sh Explained: The Open Agent Skills Directory, npx skills add, and the Leaderboard

skills.sh is the Vercel-made open agent skills directory for reusable \`SKILL.md\` instruction packages. Its homepage describes it as "The Open Agent Skills Ecosystem", and the official footer says skills are open source on GitHub and made by Vercel. The associated \`skills\` CLI is published on npm, points to \`github.com/vercel-labs/skills\`, and is current at version \`1.7.0\` as of September 28, 2026.

For QA engineers, the short answer is this: skills.sh helps you discover general agent skills, while qaskills.sh is a separate QA-focused directory. There is no affiliation implied between them. Use skills.sh when you want broad ecosystem discovery, official vendor skills, packs, topics, leaderboard movement, or the open \`npx skills add\` installer. Use qaskills.sh when your evaluation starts from testing workflows such as Cypress, Playwright, API testing, accessibility checks, or CI triage. Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but that is a different distribution path.

The important caution is that skills.sh is not a trust oracle. Its docs say routine security audits exist, and the public Audits page combines results from Gen Agent Trust Hub, Socket, and Snyk, but the docs also say the directory cannot guarantee the quality or security of every skill. Treat the leaderboard as a discovery surface, not as a dependency policy.

## What skills.sh actually indexes

An agent skill is a directory with a \`SKILL.md\` file. The \`SKILL.md\` file carries YAML frontmatter, usually at least \`name\` and \`description\`, followed by procedural instructions for the agent. The \`skills\` CLI can install those folders into the paths expected by many coding agents, including Claude Code, Codex, Cursor, GitHub Copilot, OpenCode, Cline, Windsurf, Gemini-related agents, and many others. The current Vercel Labs README says the CLI supports more than 75 agents, while the skills.sh homepage highlights common agents such as Claude Code, Cursor, Codex, GitHub Copilot, Windsurf, Gemini, Cline, AMP, Antigravity, and OpenClaw.

The directory is not only a list of Markdown files. It has several surfaces:

| Surface | What it is for | QA use case |
|---|---|---|
| Leaderboard | Popular skills ranked from install telemetry | Find candidate workflows to inspect before adoption |
| Trending and Hot | Recent movement windows | Notice new vendor tooling or fast-moving agent workflows |
| Topics | Category browsing such as Testing, Databases, React, Marketing | Start with a domain before searching by repo |
| Official | Skills from technology makers | Prefer vendor-maintained instructions for product-specific APIs |
| Packs | Bundles that install multiple skills together | Bootstrap a team baseline in one command |
| Audits | Combined audit signals from three security sources | Add review friction before a skill reaches developer machines |
| Docs and API | CLI reference, customization, packs, catalog API | Automate inventory and repository display |

That mix matters for QA teams because test automation is operational knowledge. You are not only asking an agent to write code. You are asking it to pick selectors, manage state, run subsets, collect artifacts, diagnose flakes, and avoid expensive CI loops. A weak skill can encode brittle habits at scale. A strong one makes the agent slower to guess and faster to verify.

## How \`npx skills add\` works in practice

The basic official install form is:

\`\`\`bash
npx skills add vercel-labs/agent-skills
\`\`\`

That command downloads skills from a source and configures them for one or more agents. The source can be a GitHub shorthand, a full GitHub URL, a direct path to a skill in a repo, a GitLab URL, an Azure Repos URL, another git URL, a local path, or a direct \`SKILL.md\` or archive URL. The current README also documents private repository behavior: the CLI uses normal git authentication, GitHub CLI fallback, SSH, or tokens such as \`GITHUB_TOKEN\` and \`GH_TOKEN\` where applicable.

Here are the install decisions a QA lead should standardize before giving the command to a team:

| Decision | Default or flag | Recommendation for QA teams |
|---|---|---|
| Install scope | Project by default | Prefer project installs for shared test practices |
| Global install | \`-g\` or \`--global\` | Useful for personal workflow skills, risky for team policy |
| Agent target | \`-a\` or \`--agent\` | Pin the exact agents used by the team |
| Skill selection | \`-s\` or \`--skill\` | Install the minimum skill set rather than every folder |
| Confirmation | \`-y\` or \`--yes\` | Use in scripted onboarding after review |
| Install method | symlink or copy interactively, \`--copy\` available | Use copy if symlinks create trouble on Windows or locked-down machines |
| Listing only | \`--list\` | Inspect candidates before installing |

A reproducible project-level install might look like this:

\`\`\`bash
npx skills add cypress-io/ai-toolkit \\
  --skill cypress-author \\
  --skill cypress-docs \\
  --agent claude-code \\
  --agent codex \\
  --agent cursor \\
  --yes
\`\`\`

The paths differ by agent. The official CLI README lists \`.claude/skills/\` for Claude Code project installs, \`.agents/skills/\` for Codex project installs, and \`.agents/skills/\` for Cursor project installs. Global paths include \`~/.claude/skills/\`, \`~/.codex/skills/\`, and \`~/.cursor/skills/\` for those agents. That is one reason the CLI exists: copying skill folders by hand becomes error-prone as soon as a team uses more than one assistant.

## Agent path mapping you should verify

Do not assume every agent reads the same directory. A skill can be valid and still invisible because it landed in a path your agent does not scan, or because the agent needs a reload.

| Agent | CLI target | Project path in current docs | Global path in current docs |
|---|---|---|---|
| Claude Code | \`claude-code\` | \`.claude/skills/\` | \`~/.claude/skills/\` |
| Codex | \`codex\` | \`.agents/skills/\` | \`~/.codex/skills/\` |
| Cursor | \`cursor\` | \`.agents/skills/\` | \`~/.cursor/skills/\` |
| GitHub Copilot | \`github-copilot\` | \`.agents/skills/\` | \`~/.copilot/skills/\` |
| Universal, Replit, Amp | \`universal\`, \`replit\`, \`amp\` | \`.agents/skills/\` | \`~/.config/agents/skills/\` |

The safest habit is to run:

\`\`\`bash
npx skills list
npx skills ls -a claude-code -a codex -a cursor
\`\`\`

Then open the installed folder and read the \`SKILL.md\` that your agent will actually consume. A QA skill is effectively executable policy for an LLM. You would not merge an unreviewed test harness into your repo, and the same caution applies here.

## Leaderboard ranking and what the numbers mean

The skills.sh docs say the leaderboard ranks skills using anonymous telemetry collected by the \`skills\` CLI. The CLI docs say telemetry is on by default and can be disabled with \`DISABLE_TELEMETRY=1\`. The npm README adds \`DO_NOT_TRACK=1\` as another opt-out and clarifies that GitHub repository and skill identifiers are sent only for repositories GitHub confirms are public, while non-GitHub source identifiers may be included because visibility cannot be checked the same way.

This is useful, but it has limits:

| Signal | What it can tell you | What it cannot prove |
|---|---|---|
| All Time rank | A skill has been installed often | The skill is still current or safe |
| Trending 24h | Recent install velocity | Whether the installs came from successful usage |
| Hot | Momentum in the directory | Whether the skill matches your stack |
| Official badge | A known maker owns the source | That every instruction fits your repo |
| Audit status | External scanners found or did not find risk indicators | That prompt injection, stale commands, or poor QA heuristics are absent |
| Install count badge | Public popularity for a repo | Quality of tests generated after installation |

For QA leaders, the practical move is to separate "discover" from "adopt". The leaderboard is good at discover. Adoption needs a mini review: read instructions, inspect referenced scripts, check tool versions, run the skill on a disposable branch, compare output to your existing test conventions, then decide whether to commit it into project-level agent directories.

## Packs, private sharing, and repository pages

Packs bundle skills from files, GitHub, or skills.sh into one install command. The packs page says packs stay unlisted and can be shared with anyone or with a Vercel team. This makes packs attractive for onboarding, but it also means your review process should handle the pack as a manifest of dependencies. A pack is convenient precisely because it hides multiple choices behind one URL.

Install syntax is documented as:

\`\`\`bash
npx skills add https://skills.sh/p/<pack-id>
\`\`\`

For public repositories listed on skills.sh, maintainers can add \`skills.sh.json\` at the repository root to customize the directory page. The docs say this changes display only, not CLI installation behavior and not the contents of \`SKILL.md\`. That distinction matters: a neat repository page does not alter what the agent reads. The source files remain the authority.

An example repository display config looks like this:

\`\`\`json
{
  "$schema": "https://skills.sh/schemas/skills.sh.schema.json",
  "notGrouped": "bottom",
  "groupings": [
    {
      "title": "Testing",
      "description": "Skills for browser, API, and CI test automation.",
      "skills": ["cypress-author", "cypress-docs", "cypress-tap"]
    }
  ]
}
\`\`\`

The customization docs say skill matching is case-insensitive, spaces and underscores are treated like hyphens, and invalid groups are skipped. They also say changes are picked up after a repository install with telemetry enabled and may be delayed by caches. If your team publishes internal skills, treat the display file as a cataloging aid, not as a package manifest.

## What people get wrong about open agent skills

The common mistake is thinking \`SKILL.md\` is just documentation. It is closer to a runbook that the agent may follow while editing files, running commands, and making judgment calls. If the skill says "prefer CSS selectors", your suite will drift toward brittle tests. If it says "rerun the full suite after every edit", CI cost goes up. If it says "ignore network flakes", root causes get buried.

A second mistake is letting every engineer install a different global stack. Global skills are pleasant for personal productivity, but QA consistency is usually a project property. When selector strategy, naming conventions, fixture policy, artifact retention, and retry policy are encoded in project-level skills, a new agent session starts closer to your team standard.

A third mistake is confusing agent portability with behavioral equivalence. The same \`SKILL.md\` can be installed for Claude Code, Codex, Cursor, and Copilot-oriented tools, but each agent has different context loading, command execution, prompting, and safety behavior. Portability means the file can travel. It does not mean the output is identical. For deeper strategy on cross-agent reuse, see [Agent Skills Open Standard Portability](/blog/agent-skills-open-standard-portability).

## A QA-centered review workflow

Use this review before adding an external skill to a testing repository:

| Review step | Command or action | Pass condition |
|---|---|---|
| Inspect source | \`npx skills add owner/repo --list\` | You understand which skills exist |
| Install to scratch | Use a temporary repo or branch | No unexpected files outside agent skill directories |
| Read instructions | Open each \`SKILL.md\` and references | Commands, flags, and tool names are current |
| Check risk | Review audit page and source scripts | No suspicious shell, credential handling, or remote execution |
| Run prompt test | Ask agent to create or fix a small test | Output follows your selector and assertion rules |
| Verify execution | Run the generated tests locally | Failure messages are useful and artifacts are present |
| Commit policy | Project-level install only | Team gets one reviewed copy |

A scripted install for a reviewed team baseline can be simple:

\`\`\`bash
npx skills add cypress-io/ai-toolkit \\
  --skill cypress-docs \\
  --agent claude-code \\
  --agent codex \\
  --yes

npx skills list
\`\`\`

If your team wants repeatable onboarding, put the commands in a documented bootstrap step, not in an opaque postinstall hook. Agents should be easy to inspect.

## Security audits and prompt-supply-chain risk

The Audits page currently describes combined audit results from Gen Agent Trust Hub, Socket, and Snyk. Rows can show values such as Safe, Pending, Low Risk, Medium Risk, or Critical depending on the scanner and skill. The overview docs say there are routine security audits and direct security issue reports to Vercel security, but they also warn that quality and security are not guaranteed.

For test automation teams, the highest-risk skill patterns are not always obvious malware. Watch for:

| Risk pattern | Why it matters in QA | Safer alternative |
|---|---|---|
| Unpinned remote scripts | A test-fix prompt could run changed code later | Prefer reviewed scripts in the repository |
| Secret-printing debug steps | CI keys and record keys may appear in logs | Use CI secret stores and masked variables |
| Broad destructive cleanup | Test reset commands may remove local data | Scope cleanup to generated artifacts |
| Stale CLI flags | Agents generate commands that fail in CI | Verify against official docs and release notes |
| Overbroad selectors | Generated tests become flaky after UI changes | Encode data attribute and accessibility strategy |
| No verification loop | Agent stops after editing test code | Require local run, artifact review, or CI rerun |

For example, a security-conscious CI step should set telemetry preferences explicitly if your organization requires it:

\`\`\`yaml
name: Install agent skills

on:
  workflow_dispatch:

jobs:
  install-skills:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - name: Install reviewed skills
        env:
          DISABLE_TELEMETRY: "1"
        run: |
          npx skills add cypress-io/ai-toolkit --skill cypress-docs --agent codex --yes
          npx skills list
\`\`\`

That workflow is illustrative. Many teams should not install skills inside CI at all, because CI may not run an agent. The point is to make policy explicit: which source, which skill, which agent, whether telemetry is allowed, and how the result is inspected.

## How skills.sh differs from qaskills.sh

skills.sh is a broad ecosystem directory and installer. qaskills.sh is a QA-skills directory for AI coding agents. The overlap is the concept of reusable agent instruction, but the editorial job is different.

| Question | skills.sh | qaskills.sh |
|---|---|---|
| Primary scope | General agent skills across many domains | QA and test automation skills |
| Discovery model | Leaderboard, topics, official makers, packs | QA-oriented browsing and testing workflows |
| Installer | \`npx skills add\` | qaskills CLI |
| Best use | Broad ecosystem research and cross-agent installation | Finding skills for concrete QA tasks |
| Affiliation | Made by Vercel according to site footer | Separate directory, no affiliation claimed |

If your immediate query is "how do I install skills into Claude Code", start with [How to Install Skills in Claude Code](/blog/how-to-install-skills-claude-code). If your query is "which testing skill should my team try", a QA-specific catalog is usually a faster route because it can evaluate the skill against browser automation, API assertions, CI artifacts, and failure triage rather than generic popularity.

## Failure mode: the skill installed, but the agent ignores it

A realistic failure looks like this: you run \`npx skills add cypress-io/ai-toolkit --skill cypress-author --agent cursor --yes\`, the command succeeds, but Cursor keeps writing Cypress tests with brittle class selectors and old environment APIs.

Diagnose it in order:

1. Run \`npx skills list\` and confirm the skill name appears.
2. Check the actual target folder for your agent. For Cursor project installs, current CLI docs list \`.agents/skills/\`; if your agent expects a different local rule format, confirm support in that agent.
3. Open the installed \`SKILL.md\` and confirm the description is relevant enough to trigger. Some agents load skills only when their trigger description matches the task.
4. Restart or reload the agent session. Some tools do not watch skill folders continuously.
5. Invoke the skill directly if your agent supports slash commands, then compare output.
6. Ask the agent to state which project instructions it loaded. Do not treat the answer as proof, but it often exposes a path mismatch.

The fix is usually mundane: wrong agent target, global install when the project session only reads project files, stale session, or a skill whose description is too narrow for the prompt. The frustrating part is that all of these look like "the skill does not work" from the outside.

## Using the API and badges without overbuilding

The API docs expose programmatic access to the skills.sh catalog, leaderboard, and search under \`https://skills.sh/api/v1/\`. They document Vercel OIDC authentication for Vercel apps and warn not to cache a rotated token at module scope. Most QA teams do not need a custom integration on day one. A badge and a small review checklist are usually enough.

If you publish a skill repository, the docs show an install-count badge pattern:

\`\`\`markdown
[![skills.sh](https://skills.sh/b/owner/repo)](https://skills.sh/owner/repo)
\`\`\`

Badges are good for discoverability. They are not release management. If a skill affects a regulated QA process, pin review to a commit or tag in your own documentation and retest when upstream changes.

## A practical adoption sequence

Start narrow. Pick one pain point, such as flaky Cypress selector repair or failed CI triage. Find two candidate skills from skills.sh and one from a QA-focused source. Install them in a scratch repo. Give each agent the same task with the same failing fixture. Score the result on correctness, command accuracy, assertion quality, and verification behavior. Keep the winner, edit local instructions if needed, and commit it at project scope.

Then create a small lifecycle:

| Cadence | Action | Owner |
|---|---|---|
| On install | Review \`SKILL.md\`, scripts, and referenced files | QA automation lead |
| On Cypress or Playwright major upgrade | Recheck commands and migration notes | Framework owner |
| Monthly | Run \`npx skills update\` on a branch and review the \`SKILL.md\` diff | Developer experience owner |
| Before team rollout | Run sample prompts against a known fixture | QA guild |
| After incident | Patch the skill with the missed diagnostic | Person who fixed the failure |

Skills work best when treated as living test infrastructure. The value is not only that an agent writes faster. The value is that the agent repeatedly chooses the workflow your best QA engineer would have chosen on a tired Thursday afternoon.

## Frequently Asked Questions

### Is skills.sh the same thing as qaskills.sh?

No. skills.sh is a broad open agent skills directory made by Vercel, with the \`skills\` CLI, leaderboard, packs, topics, official makers, and audits. qaskills.sh is a separate QA-focused directory for skills aimed at testing and QA automation workflows. They share the general idea of installable agent guidance, but you should evaluate them as separate sources and should not assume affiliation, shared rankings, or shared security review.

### Does \`npx skills add\` install skills globally by default?

No. The current CLI docs describe project installs as the default. A project install places skills under the current project’s agent-specific skill directory so they can be committed and shared. Use \`-g\` or \`--global\` when you want user-level skills available across projects. For QA standards, project installs are usually easier to review because the exact instructions travel with the test repository.

### Can I trust the skills.sh leaderboard?

Trust it for discovery, not for approval. The leaderboard is based on anonymous install telemetry from the CLI, so it shows popularity and movement. It does not prove that a skill is current, secure, or right for your stack. Before adopting a skill, read the source, check audit signals, verify commands against official docs, and run a small prompt-based evaluation against your own test conventions.

### What should a QA team review before installing a skill?

Review the \`SKILL.md\`, any referenced scripts or files, the install scope, the target agent paths, and the commands the skill tells the agent to run. Pay special attention to test selector rules, environment variable handling, cleanup commands, CI artifact behavior, and whether the skill requires verification after editing. A good QA skill should make failures easier to reproduce, not merely produce prettier test code.
`,
};
