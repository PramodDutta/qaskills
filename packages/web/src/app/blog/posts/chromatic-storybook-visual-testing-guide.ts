import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chromatic Storybook Visual Testing Complete Guide 2026',
  description:
    'Master Chromatic for Storybook visual testing in 2026. Component-level visual regression, interaction testing, UI review, branching, CI integration, and design system workflows.',
  date: '2026-05-21',
  category: 'AI Testing',
  content: `
# Chromatic Storybook Visual Testing Complete Guide 2026

Chromatic, built by the makers of Storybook, is the leading visual testing platform for component-level testing. Where Percy and Applitools focus on page-level testing, Chromatic operates at the component level: every Storybook story becomes a visual test, automatically. For design systems, component libraries, and React/Vue apps with mature Storybook setups, Chromatic is the natural choice.

This guide covers Chromatic end to end: installation, Storybook integration, the publish-and-compare workflow, interaction testing, UI review, branching strategies, and CI integration. We include code samples for the common workflows and a setup checklist. By the end you should know how to add Chromatic to a Storybook setup and use it for design system quality assurance. The guide assumes basic familiarity with Storybook and React (or Vue/Angular/Svelte).

## Key Takeaways

- Chromatic is the Storybook visual testing platform; every story becomes a visual test.
- Component-level testing catches design system regressions before they reach product code.
- Interaction tests use Storybook's play function for click-and-assert workflows.
- UI review workflow surfaces diffs for design and product approval.
- Branching strategy supports feature branch testing alongside main.
- Pricing is per-snapshot; cost is moderate and competitive with Percy.

---

## Why Chromatic for Storybook

If your team uses Storybook for component development, Chromatic is the most natural visual testing choice. Stories are already the canonical test fixtures; Chromatic turns each one into a visual test without additional authoring.

The benefits compound:

Every PR that touches a component runs visual tests automatically.

Design system regressions surface at the component level, not after they affect product pages.

Designers and product managers can review component diffs in a UI built for them.

Storybook's interaction testing layers in with Chromatic's visual layer.

The trade-off is scope. Chromatic is Storybook-centric. For pages that are not in Storybook, you need another tool (Percy, Applitools).

---

## Installation

\`\`\`bash
npm install --save-dev chromatic
\`\`\`

Initialize Chromatic by running it once and selecting a project.

\`\`\`bash
npx chromatic --project-token=...
\`\`\`

The first run uploads your Storybook to Chromatic and creates baseline snapshots for every story.

---

## Storybook Build

Chromatic builds your Storybook in the cloud or uses your local build.

\`\`\`bash
# Cloud build (Chromatic builds Storybook)
npx chromatic --project-token=...

# Local build (you build first)
npm run build-storybook
npx chromatic --project-token=... --storybook-build-dir=storybook-static
\`\`\`

Cloud builds are simpler; local builds are faster for large Storybooks.

---

## Snapshot Workflow

Each Storybook story becomes a snapshot. Chromatic renders every story across the configured browsers and compares to baselines.

\`\`\`typescript
// Button.stories.ts
export default { component: Button, title: "Components/Button" };
export const Primary = { args: { variant: "primary", label: "Submit" } };
export const Secondary = { args: { variant: "secondary", label: "Cancel" } };
export const Disabled = { args: { variant: "primary", label: "Submit", disabled: true } };
\`\`\`

Three snapshots: Primary, Secondary, Disabled. Each renders independently and compares to its baseline.

For variants of the same component, create stories. For visual states (hover, focus, error), create stories with the right setup.

---

## Modes

Chromatic supports multiple modes per story: different viewports, themes, or backgrounds.

\`\`\`typescript
import { parameters } from "../.storybook/preview";

export const Primary = {
  args: { variant: "primary" },
  parameters: {
    chromatic: {
      modes: {
        mobile: { viewport: { width: 375 } },
        desktop: { viewport: { width: 1280 } },
        dark: { theme: "dark" },
      },
    },
  },
};
\`\`\`

Each mode is a separate snapshot. Catches issues where a component works in one configuration and breaks in another.

---

## Interaction Testing

Storybook's play function lets you script interactions. Chromatic runs the play function, takes a snapshot at the end, and compares.

\`\`\`typescript
import { userEvent, within, expect } from "@storybook/test";

export const FormFilled = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await expect(canvas.getByText(/success/i)).toBeInTheDocument();
  },
};
\`\`\`

The play function runs as part of the snapshot. Chromatic captures the final state.

Interaction testing in Chromatic catches:

UI states after user input.

Conditional rendering based on actions.

Error states triggered by validation.

---

## Review Workflow

Chromatic's UI review workflow is built for designers and product managers, not just engineers.

The interface shows component diffs with the baseline, current, and difference highlighted. Reviewers click Accept or Reject. Accepting updates the baseline; rejecting flags the build as failing.

The review interface includes:

Per-story diffs with side-by-side and overlay views.

Comments per snapshot.

Approval status (pending, approved, rejected, denied).

Filters by component, story, or change type.

For design systems, the review workflow is the daily interface for designers reviewing engineering changes.

---

## Branching

Chromatic supports branching to match your git workflow. Each branch has its own baselines.

\`\`\`bash
# On a feature branch
npx chromatic --project-token=...
\`\`\`

Chromatic compares the feature branch snapshots to main snapshots. Accepted changes on the feature branch persist; on merge, they update main's baselines.

This branching strategy lets feature branches iterate without polluting main's baselines.

---

## CI Integration

Add Chromatic to your CI pipeline.

\`\`\`yaml
# .github/workflows/chromatic.yml
name: Chromatic
on: [pull_request, push]
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required for baseline detection
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx chromatic --exit-zero-on-changes
        env:
          CHROMATIC_PROJECT_TOKEN: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
\`\`\`

The fetch-depth: 0 is critical. Chromatic uses git history to detect baselines.

The --exit-zero-on-changes flag prevents CI failure on visual changes; reviewers approve in the UI. Without the flag, any visual change fails CI.

---

## Turbosnap

Turbosnap is Chromatic's incremental rebuild feature. It identifies which stories were affected by a code change and only re-snapshots those.

\`\`\`bash
npx chromatic --only-changed
\`\`\`

For large Storybooks (1000+ stories), Turbosnap reduces snapshot count by 90%+ on most PRs. The cost savings are dramatic.

---

## Pricing

Chromatic pricing is per-snapshot, similar to Percy.

| Tier | Snapshots/Month | Price |
| --- | --- | --- |
| Free | 5,000 | $0 |
| Starter | 35,000 | $149 |
| Standard | 100,000 | $349 |
| Pro | 600,000 | $999 |
| Enterprise | Custom | Custom |

The free tier is generous; small projects often stay free for months.

For mid-size design systems with 500 stories and 30 PRs per day, expect $300-$700/month with Turbosnap enabled.

---

## Comparison to Alternatives

| Tool | Storybook Native | Component-Level | Cross-Browser | Pricing |
| --- | --- | --- | --- | --- |
| Chromatic | Yes (built by Storybook team) | Yes | Yes (4 browsers) | Moderate |
| Percy | Add-on | Add-on | Best | Moderate |
| Applitools | Add-on | Add-on | Best | Higher |
| Loki | Yes | Yes | Limited | Free (OSS) |

Chromatic is the most Storybook-native. Percy and Applitools work but require more setup for component-level coverage.

---

## When to Choose Chromatic

Choose Chromatic if:

You use Storybook for component development.

You build a design system.

You need component-level visual testing.

You want interaction testing integrated.

Designers and PMs review UI changes.

Avoid Chromatic if:

You do not use Storybook.

You need page-level E2E testing (Percy or Applitools).

You need self-healing locators (Mabl, Functionize, Applitools).

---

## Setup Checklist

Install Chromatic CLI.

Run npx chromatic to create the project and upload baseline.

Verify baselines in the Chromatic UI.

Set up modes for different viewports/themes.

Add interaction tests with play functions.

Configure CI with Chromatic Action or CLI.

Enable Turbosnap for cost optimization.

Set up reviewer notifications.

Integrate with your design tool (Figma) if applicable.

Add Chromatic URL to your team wiki.

---

## Common Patterns

Pattern 1: design system validation. Chromatic catches changes to shared components before they break apps.

Pattern 2: PR-time visual review. Every PR runs Chromatic; designers review before merge.

Pattern 3: theme regression detection. Modes catch regressions across light/dark themes.

Pattern 4: interaction state coverage. Play functions exercise states; snapshots verify each.

---

## Common Pitfalls

Insufficient story coverage. Stories must cover the visual states you want tested. Add stories for hover, focus, error, loading.

Skipping Turbosnap. Without Turbosnap, every PR snapshots every story, inflating cost.

No fetch-depth in CI. Without full git history, baseline detection breaks.

Ignoring TurboSnap-flagged changes. The tool flags stories likely affected; if you skip them, you miss regressions.

Reviewing in code instead of UI. The Chromatic UI is built for review. Pasting diffs in PR comments wastes the workflow.

---

## Design System Workflow

For design systems, Chromatic is part of the standard workflow:

Designer makes a change in Figma.

Engineer implements the change in code.

PR triggers Chromatic.

Designer reviews the Chromatic diff.

If approved, PR can merge.

Merged change updates main baseline.

This loop closes design-engineering review with a structured tool. Cosmetic regressions are caught; intentional changes are confirmed.

---

## Migrating from Other Tools

From Percy: Percy and Chromatic both support Storybook. The migration is renaming SDK calls and reconfiguring CI.

From Loki: Loki is open source; Chromatic is hosted. Plan to migrate baselines and set up review workflow.

From Applitools: Applitools Eyes-Storybook works similarly. The migration is renaming and reconfiguring.

---

## Further Resources

- Chromatic documentation at chromatic.com/docs.
- Storybook documentation at storybook.js.org.
- Browse visual testing skills at /skills.
- Compare visual tools at /blog.

---

## Conclusion

Chromatic is the leading Storybook visual testing platform in 2026. Component-level testing, interaction testing, UI review workflow, and design system fit. For teams using Storybook, Chromatic is the natural choice. The pricing is competitive, the integration is seamless, and the design workflow is best in class. Browse [/skills](/skills) for related tools and the [/blog](/blog) for deeper guides.
`,
};
