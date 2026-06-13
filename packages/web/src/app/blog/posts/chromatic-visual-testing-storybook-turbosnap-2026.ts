import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chromatic Visual Testing + Storybook TurboSnap Official 2026',
  description:
    'Chromatic + Storybook TurboSnap guide. Cover the chromatic CLI, project-token, --only-changed, baselines, review workflow, and CI integration patterns.',
  date: '2026-06-09',
  category: 'Guide',
  content: `
# Chromatic Visual Testing + Storybook TurboSnap Official 2026

Chromatic is the visual regression and review service built by the Storybook team. If you maintain a component library in Storybook, Chromatic plus TurboSnap gives you visual diffing, interaction testing, accessibility checks, and a review workflow that integrates natively with your component-driven development cycle. TurboSnap is the secret sauce: it analyzes your dependency graph and snapshots only the stories affected by your changes, cutting snapshot counts (and Chromatic costs) by 70-90% on most projects. This guide covers the full Chromatic stack as of 2026 -- installation, project token setup, the chromatic CLI flags, TurboSnap configuration, baselines, the review workflow, branch handling, and the GitHub Actions pattern most Storybook projects use.

If you are searching for \`chromatic visual testing storybook official docs\`, this guide walks you through every step from zero to gated PRs.

## Key Takeaways

- Chromatic publishes your Storybook to a cloud URL on every CI run, snapshots every story across the configured browser/viewport matrix, and diffs against the baseline
- \`--only-changed\` activates TurboSnap, which uses your bundler dependency graph to skip unchanged stories. Typical speedup: 5-10x on warm runs
- Authentication is via a per-project \`CHROMATIC_PROJECT_TOKEN\`. Tokens are write-only and safe to expose in CI but should not be committed to public source
- The Chromatic CLI is one binary: \`npx chromatic\`. Common flags are \`--only-changed\`, \`--exit-zero-on-changes\`, \`--auto-accept-changes\`, \`--externals\`
- Baselines are managed in the Chromatic UI. The first run becomes the baseline; subsequent diffs require approval to update it

## Why Storybook + Chromatic

Storybook isolates each component in a controlled state. Chromatic captures that controlled state visually. The combination catches:

- CSS regressions per component
- Prop-driven visual variants (loading, error, empty states)
- Accessibility regressions via the built-in a11y addon
- Behavioral regressions via interaction tests in stories
- Cross-browser visual differences

Chromatic is component-first. If you ship a design system or a heavily-componentized app, it is the strongest visual testing fit. For end-to-end visual testing of pages, see our [Percy + Playwright guide](/blog/percy-visual-testing-playwright-official-2026).

## Installing Chromatic

\`\`\`bash
npm install --save-dev chromatic
\`\`\`

Chromatic also requires Storybook 7 or 8. Storybook setup is out of scope for this guide; assume you already have stories at \`src/**/*.stories.tsx\`.

## Getting a Project Token

Sign in to chromatic.com, create a project, copy the project token from the settings page. Tokens look like \`chpt_abc123...\`. Set in CI:

\`\`\`yaml
env:
  CHROMATIC_PROJECT_TOKEN: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
\`\`\`

Locally:

\`\`\`bash
export CHROMATIC_PROJECT_TOKEN=chpt_abc123...
\`\`\`

## First Publish

\`\`\`bash
npx chromatic
\`\`\`

What happens:

1. Chromatic builds Storybook (\`build-storybook\`) into a static directory
2. Uploads the bundle to Chromatic's cloud
3. Renders every story across the configured browser/viewport matrix
4. The first run establishes baselines; all stories show "New" in the UI
5. Prints a build URL to the console

Open the build URL and approve the baseline. Subsequent runs diff against it.

## TurboSnap

TurboSnap is Chromatic's killer feature. Activate with the \`--only-changed\` flag:

\`\`\`bash
npx chromatic --only-changed
\`\`\`

What it does:

1. Reads your bundler dependency graph (Webpack, Vite)
2. Compares the current commit to the base commit (default: main)
3. Determines which source files changed
4. Walks the import graph to find affected stories
5. Snapshots only those stories; skips the rest

On a 500-story library where a single PR touches 3 components, TurboSnap might snapshot 20 stories instead of 500 -- a 25x reduction. Cost savings scale linearly because Chromatic charges per snapshot.

## .chromatic Configuration

\`\`\`json
{
  "projectId": "Project:abc123",
  "onlyChanged": true,
  "externals": ["public/**", "src/assets/**"],
  "junitReport": true,
  "exitZeroOnChanges": false,
  "buildScriptName": "build-storybook"
}
\`\`\`

| Key | Purpose |
|---|---|
| \`onlyChanged\` | Enable TurboSnap |
| \`externals\` | Glob patterns of files that affect every story (CSS variables, fonts, public assets) |
| \`exitZeroOnChanges\` | Exit 0 even when diffs exist (useful for non-blocking visual checks) |
| \`autoAcceptChanges\` | Glob of branches where diffs auto-accept (\`main\`, \`release/*\`) |
| \`buildScriptName\` | NPM script to build Storybook |
| \`storybookBuildDir\` | Use a pre-built Storybook directory |

## Chromatic CLI Flags Reference

| Flag | Purpose |
|---|---|
| \`--only-changed\` | TurboSnap |
| \`--exit-zero-on-changes\` | Don't fail CI on diffs |
| \`--auto-accept-changes\` | Auto-approve all diffs on the branch |
| \`--externals "<glob>"\` | Files that invalidate TurboSnap |
| \`--skip\` | Skip the build entirely (useful for documentation-only branches) |
| \`--ci\` | Optimize for CI environments |
| \`--branch-name <name>\` | Override branch detection |
| \`--storybook-build-dir <path>\` | Use prebuilt Storybook |
| \`--build-script-name <name>\` | Override the npm script |
| \`--debug\` | Verbose logging |

Typical CI invocation:

\`\`\`bash
npx chromatic --only-changed --exit-zero-on-changes
\`\`\`

\`--exit-zero-on-changes\` lets you decide in GitHub branch protection whether to block on diffs.

## Branch Strategy

Chromatic tracks baselines per branch and per branch hierarchy. The most common shape:

| Branch | Baseline source | Auto-accept? |
|---|---|---|
| \`main\` | Itself | Yes |
| \`release/*\` | Last release | Yes |
| \`feat/*\` | main | No (review required) |
| \`fix/*\` | main | No (review required) |

Configure auto-accept via:

\`\`\`bash
npx chromatic --auto-accept-changes=main,release/*
\`\`\`

Or in the .chromatic config:

\`\`\`json
{
  "autoAcceptChanges": "main"
}
\`\`\`

## GitHub Actions Workflow

\`\`\`yaml
name: Chromatic
on:
  push:
    branches: [main]
  pull_request:

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true
          exitZeroOnChanges: true
\`\`\`

The official \`chromaui/action\` wraps the CLI with sensible defaults. \`fetch-depth: 0\` is critical -- TurboSnap needs the full git history to compute the dependency delta.

## Review Workflow

When a PR creates diffs:

1. Chromatic posts a check on the PR
2. The PR author opens the Chromatic build URL
3. Each diff shows side-by-side baseline vs current with a pixel overlay
4. Reviewer accepts or denies each diff
5. Accepted diffs become the new baseline when the PR merges

Required reviewers can be configured per-project. The Chromatic UI supports threaded comments on diffs, making it a true visual code review.

## Interaction Tests

Storybook 7+ supports interaction testing via the play function. Chromatic captures the post-interaction state:

\`\`\`typescript
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Forms/Login',
  component: LoginForm,
};
export default meta;

export const Empty: StoryObj<typeof LoginForm> = {};

export const ValidationError: StoryObj<typeof LoginForm> = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: /sign in/i }));
    await expect(c.getByText(/email is required/i)).toBeVisible();
  },
};
\`\`\`

Chromatic snapshots both stories: the empty form and the post-submission error state. Diffs reveal regressions in either layout.

## A11y Testing

Storybook's accessibility addon runs axe-core on each story. With the Chromatic addon enabled, accessibility violations show up alongside visual diffs:

\`\`\`bash
npm install --save-dev @storybook/addon-a11y
\`\`\`

\`.storybook/main.ts\`:

\`\`\`typescript
import type { StorybookConfig } from '@storybook/react-vite';
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
};
export default config;
\`\`\`

Configure failure thresholds per-story:

\`\`\`typescript
export const Default: StoryObj<typeof Button> = {
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
};
\`\`\`

## Comparison: Chromatic vs Other Visual Tools

| Tool | Best for | Tradeoff |
|---|---|---|
| Chromatic | Storybook-driven design systems | Storybook-specific |
| Percy | Page-level visual tests with any framework | No native Storybook integration |
| Applitools | Enterprise, AI-powered diffing | Expensive |
| Playwright \`toHaveScreenshot\` | Free local diffing | No cloud UI, baseline conflicts |
| Backstop.js | Self-hosted, free | DIY infrastructure |

Pick Chromatic if your design system lives in Storybook. Pick Percy if your visual coverage is page-level.

## TurboSnap Caveats

| Caveat | Why it matters | Fix |
|---|---|---|
| External CSS files not in webpack graph | Style changes don't trigger snapshots | Add to \`--externals\` |
| Public assets | Logo or font changes missed | Add to \`--externals\` |
| Shallow git clone | TurboSnap fails | \`fetch-depth: 0\` in checkout |
| First TurboSnap run | Needs baseline reference | Run without \`--only-changed\` once |
| Force pushes | Baseline lookup confused | Avoid force-pushing PRs |

When TurboSnap misses changes, the symptom is "I changed CSS and no diffs appeared." Add the CSS to externals or run without TurboSnap on that branch.

## externals Patterns

Common externals worth declaring:

\`\`\`json
{
  "externals": [
    "public/**",
    "src/assets/**",
    "src/styles/**",
    "src/theme/**",
    ".storybook/preview.ts",
    ".storybook/preview-head.html"
  ]
}
\`\`\`

Storybook preview files affect every story. If you change \`.storybook/preview.ts\` without listing it as external, TurboSnap might think no stories changed.

## Modes (Per-Story Variant Snapshots)

Chromatic Modes let you snapshot the same story under different parameters -- viewports, themes, locales -- without writing separate stories:

\`\`\`typescript
// .storybook/preview.ts
import { withThemeByClassName } from '@storybook/addon-themes';

export default {
  decorators: [
    withThemeByClassName({
      themes: { light: 'theme-light', dark: 'theme-dark' },
      defaultTheme: 'light',
    }),
  ],
  parameters: {
    chromatic: {
      modes: {
        'light desktop': { theme: 'light', viewport: { width: 1280 } },
        'dark mobile': { theme: 'dark', viewport: { width: 375 } },
      },
    },
  },
};
\`\`\`

Each mode renders separately in Chromatic and gets its own baseline.

## Externals for Vite vs Webpack

Vite and Webpack handle the dependency graph differently. The Chromatic CLI auto-detects, but if TurboSnap is missing changes:

| Bundler | Common fix |
|---|---|
| Vite | Add CSS modules to externals if they import via \`?inline\` |
| Webpack | Ensure stats.json is enabled in build |
| Next.js | Use \`chromatic --storybook-build-dir storybook-static\` |

## Multi-Story Snapshots Per Component

A well-organized story file covers every visual variant:

\`\`\`typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary', children: 'Primary' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Secondary' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true, children: 'Disabled' } };
export const Loading: Story = { args: { variant: 'primary', loading: true, children: 'Loading' } };
export const WithIcon: Story = { args: { variant: 'primary', icon: 'check', children: 'Done' } };
export const FullWidth: Story = { args: { variant: 'primary', fullWidth: true, children: 'Wide' } };
\`\`\`

Six stories = six snapshots per browser per viewport. With Chromatic's default matrix (Chrome at 320, 768, 1280), that's 18 renders per Button change.

## Snapshot Disabling Per Story

If a story has too much legitimate visual churn (canvas animations, random data), opt out:

\`\`\`typescript
export const RandomAnimation: Story = {
  parameters: { chromatic: { disable: true } },
};
\`\`\`

Or pause animations universally:

\`\`\`typescript
// .storybook/preview.ts
export default {
  parameters: {
    chromatic: { pauseAnimationAtEnd: true, delay: 300 },
  },
};
\`\`\`

\`delay\` waits N ms before snapshotting to let animations settle.

## Comparison Table -- Chromatic Plans

| Plan | Snapshots/month | Seats | Approx price |
|---|---|---|---|
| Free | 5,000 | Unlimited | $0 |
| Starter | 35,000 | Unlimited | starts ~$149/mo |
| Standard | 85,000 | Unlimited | starts ~$349/mo |
| Pro | 200,000+ | Unlimited | enterprise |

TurboSnap is included in all paid tiers. Pricing is per-snapshot, so TurboSnap is essentially free money: every snapshot you skip is one you don't pay for.

## Cost Optimization

| Tactic | Snapshot reduction |
|---|---|
| Enable TurboSnap | 70-90% |
| Reduce viewport count | Up to 67% (3 -> 1) |
| Reduce browser count | Up to 75% (4 -> 1) |
| Use Modes selectively | 50-80% |
| Skip stories with \`chromatic: { disable: true }\` | Per-story |
| Run only on PR (not push) | 50% (push and PR -> PR only) |

## Frequently Asked Questions

### Does Chromatic work with Vue, Angular, Svelte?

Yes. Chromatic supports every Storybook framework: React, Vue, Angular, Svelte, Web Components, HTML, Preact, Solid. The CLI flags are framework-agnostic.

### Can I use Chromatic without Storybook?

No. Chromatic is Storybook-specific. For page-level visual testing without Storybook, see Percy, Applitools, or Playwright's built-in screenshot diffing.

### What is the difference between Chromatic and chromaui/action?

\`chromatic\` (the npm package) is the CLI. \`chromaui/action\` is a GitHub Action wrapper around it. Both invoke the same underlying engine. Use the action in GitHub Actions; use the CLI elsewhere.

### How do I baseline new stories?

Run Chromatic once on the branch where the stories were introduced. The first render becomes the baseline. Approve it in the UI to make it the default.

### Do interaction tests run on every snapshot?

The play function runs during Storybook capture. Chromatic snapshots the state after play completes. If the play function fails, the story is marked failed in the build.

### Can I use Chromatic to gate merges?

Yes. In GitHub branch protection, require the "Chromatic" check to pass. Combined with required reviewers in Chromatic UI, no visual change merges without explicit approval.

### What happens to baselines when I delete a story?

Chromatic detects removed stories and asks you to confirm removal in the review UI. Approving removes the baseline. Denying keeps it (useful if the story is temporarily disabled).

## Conclusion

Chromatic plus Storybook plus TurboSnap is the most efficient visual regression setup available to component-first teams in 2026. The first integration takes an afternoon: install, set the token, run \`npx chromatic\` once for baselines, wire up the GitHub Action with TurboSnap. From there it scales as your design system scales -- new components get stories, stories get snapshots, snapshots get reviewed.

For more visual testing options, see our [Percy + Playwright guide](/blog/percy-visual-testing-playwright-official-2026), the [visual testing skills directory](/skills) for AI agent skills that scaffold story files automatically, and our [visual testing tool comparison](/compare) to evaluate Chromatic, Percy, and Playwright screenshot diffing side by side.
`,
};
