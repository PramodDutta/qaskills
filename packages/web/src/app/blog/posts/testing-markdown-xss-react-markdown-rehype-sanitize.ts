import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Markdown XSS Sanitization Testing',
  description:
    'Markdown XSS sanitization testing verifies scripts, event handlers, unsafe URLs, raw HTML, GFM content, allowed elements, and production renderer parity.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'markdown XSS sanitization testing',
  keywords: [
    'markdown XSS sanitization testing',
    'react-markdown security test',
    'rehype-sanitize XSS test',
    'unsafe Markdown URL',
    'Markdown event handler removal',
    'raw HTML rendering test',
    'GFM sanitization test',
    'skill description security',
  ],
  relatedSlugs: [
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'skill-md-csv-yaml-array-normalization-tests',
    'malformed-skill-md-frontmatter-parser-tests',
    'agent-skill-dangerous-command-static-analysis-tests',
  ],
  sources: [
    'https://github.com/remarkjs/react-markdown',
    'https://github.com/rehypejs/rehype-sanitize',
    'https://github.com/remarkjs/remark-gfm',
  ],
  content: `
Markdown XSS sanitization testing feeds bad Markdown to the same page code that users see. The tests prove script tags, click hooks, bad link schemes, and blocked tags stay out of the DOM, while headings, links, tables, lists, and code still work.

QASkills shows skill text from many sources, so tests must guard this page edge instead of trusting default settings. The [QA skills directory](/skills) gives the page real content, while the [Playwright CLI skill](/skills/Pramod/playwright-cli) gives the test a safe file with code.

## How Do You Build a react-markdown Security Test?

A react-markdown security test should render the real component, not a simplified test-only pipeline. That choice catches changes to plugins, component mappings, wrapper behavior, and package configuration. The test then queries the browser-like DOM for effects that an attacker wants and safe elements that an author needs.

The live component loads ReactMarkdown, remarkGfm, and rehypeSanitize. GFM runs first, then the clean-up step runs on the HTML tree. RehypeRaw is not on, so raw HTML does not turn into live page nodes. The [react-markdown docs](https://github.com/remarkjs/react-markdown) show how plugins can change this flow.

\`\`\`tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export function SkillDescription({ content }: { content: string }) {
  return (
    <div data-testid="skill-description">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
\`\`\`

Test that component through Testing Library with a table-driven corpus. Each row should name the attack, provide input, list selectors that must be absent, and define harmless text that should remain. Naming each expectation makes a failed case useful during package upgrades instead of producing one opaque snapshot difference.

| Input class | Attacker goal | Required DOM assertion | Safe control |
| --- | --- | --- | --- |
| Script element | Execute inline JavaScript | No script node exists | Text before and after remains |
| Event attribute | Run code on load or click | No event attribute reaches DOM | Image alt text remains |
| Unsafe protocol | Trigger script through a link | No dangerous href exists | HTTPS links still work |
| Raw iframe | Load an untrusted document | No iframe node exists | A normal paragraph remains |
| GFM table | Hide payload inside extensions | Cells contain plain text only | Table structure remains |

Keep the corpus in the test file or a reviewed fixture under source control. Do not download live payload lists during CI because availability and content can change. The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can supply threat categories, but the renderer test must still express observable DOM outcomes.

Markdown XSS sanitization testing also needs a safe base case. A setup that strips all tags may pass each block test yet leave the skill hard to use. Check headings, text, links, lists, code, tables, and task boxes one by one.

## What Should a rehype-sanitize XSS Test Block?

A rehype-sanitize XSS test should block tags and fields that the clean list does not allow, such as click hooks and bad links. Test the exact live setup because a new plugin, or a new plugin order, can change what reaches the page.

The component now uses the default clean list. The [rehype-sanitize docs](https://github.com/rehypejs/rehype-sanitize) say to clean the tree after the last unsafe step, before later code trusts it. Test that order, since a package does not keep the order in place for you.

Build test rows at each point where text can change form. Try mixed case, coded chars, spaces in links, broken tags, nested marks, image links, and tag text in code. Read the final DOM fields because the browser may change the source text.

\`\`\`tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkillDescription } from './skill-description';

const hostileCases = [
  {
    name: 'script element',
    markdown: 'before <script>window.pwned = true</script> after',
    forbidden: 'script',
  },
  {
    name: 'image event handler',
    markdown: '<img src="x" onerror="window.pwned = true">',
    forbidden: 'img[onerror]',
  },
  {
    name: 'iframe element',
    markdown: '<iframe src="https://attacker.example"></iframe>',
    forbidden: 'iframe',
  },
];

describe('SkillDescription hostile Markdown', () => {
  it.each(hostileCases)('$name does not create active DOM', ({ markdown, forbidden }) => {
    const { container } = render(<SkillDescription content={markdown} />);

    expect(container.querySelector(forbidden)).toBeNull();
    expect(document.defaultView?.window).not.toHaveProperty('pwned', true);
  });

  it('keeps a normal heading and paragraph', () => {
    render(<SkillDescription content={'## Install\\n\\nRun the verified command.'} />);

    expect(screen.getByRole('heading', { name: 'Install' })).toBeVisible();
    expect(screen.getByText('Run the verified command.')).toBeVisible();
  });
});
\`\`\`

Do not check only that a global flag stayed false. JSDOM may leave a bad node in place without running its script, which can hide a real flaw. Check blocked tags, tag fields, and final link values first, then use run-time checks as extra proof.

The cleaner also needs tests for package upgrades. Keep one small case for each past flaw and state the harm it could cause. When a package changes, run all cases and read each changed result instead of saving a new snap by habit.

Markdown XSS sanitization testing should fail when rehypeSanitize is taken out. In a test-only change, render one bad tree with no clean step and prove the check turns red. This shows that the suite can see the flaw rather than pass due to a weak test host.

## How Do You Reject an Unsafe Markdown URL?

An unsafe Markdown URL test should read the final link or image path after the page has parsed it. Cover plain links, image links, named links, escapes, coded chars, and mixed case. Safe HTTPS and local paths must still work in the same test set.

Markdown destinations are a separate surface from raw HTML. A plain link can carry a scheme that should not become a clickable browser URL. Test at least JavaScript-like schemes, data URLs, protocol-relative URLs where policy forbids them, control characters, and a safe set defined by the product.

\`\`\`tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SkillDescription } from './skill-description';

it.each([
  ['javascript scheme', '[open](javascript:alert(1))'],
  ['mixed case scheme', '[open](JaVaScRiPt:alert(1))'],
  ['encoded newline', '[open](java%0Ascript:alert(1))'],
])('rejects an unsafe Markdown URL: %s', (_name, markdown) => {
  render(<SkillDescription content={markdown} />);

  const link = screen.queryByRole('link', { name: 'open' });
  expect(link?.getAttribute('href') ?? '').not.toMatch(/javascript/i);
});

it('preserves an HTTPS documentation link', () => {
  render(<SkillDescription content={'[format guide](https://qaskills.sh/blog/skill-md-format-guide)'} />);

  expect(screen.getByRole('link', { name: 'format guide' })).toHaveAttribute(
    'href',
    'https://qaskills.sh/blog/skill-md-format-guide',
  );
});
\`\`\`

Do not make the test depend on whether the link tag stays. One release may keep plain text with no href, while another may drop the tag. The key rule is that no bad path can be used, and a second check can guard the safe page view.

The [SKILL.md format guide](/blog/skill-md-format-guide) shows how links appear in real skill instructions. Add representative relative links, anchors, mail links if policy allows them, and external HTTPS documentation. These controls prevent a security fix from breaking every legitimate reference.

Define the URL policy next to the tests. If relative URLs are allowed, state which base resolves them. If images are permitted, state whether remote hosts are unrestricted or allowlisted. Markdown XSS sanitization testing becomes easier to review when each expected URL class maps to a written rule.

Include redirects in a separate browser or network test when links leave the site. DOM sanitization can validate the supplied destination but cannot guarantee the remote server will not redirect later. Keep that distinction clear in test names and findings.

## Verify Markdown Event Handler Removal

Markdown event handler removal checks fields such as onerror, onclick, and onload on each kind of page tag. Skill text must never add these fields to the live DOM, even when case, spaces, quotes, or broken tag text changes the way it is read.

Create positive and negative rows instead of one broad regular expression. Positive attack rows use several tags and quoting forms. Negative rows contain words such as "onclick" in paragraphs or fenced examples, which must remain readable without becoming attributes.

The renderer currently does not parse raw HTML because rehypeRaw is absent. That is a useful layer, but it should not be the only assertion. A future feature might add raw HTML support for diagrams or rich documentation, which would shift responsibility to the sanitizer schema. Direct property checks keep the security expectation visible across that change.

Use DOM calls to list each field on each tag, then fail names that start with "on". Check style fields for bad script links as well. Keep the rule narrow so data fields and aids for screen readers do not fail by mistake.

\`\`\`tsx
function collectEventAttributes(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('*')).flatMap((element) =>
    Array.from(element.attributes)
      .map((attribute) => attribute.name.toLowerCase())
      .filter((name) => name.startsWith('on')),
  );
}

it('performs Markdown event handler removal across the rendered tree', () => {
  const markdown = [
    '<img src=x ONERROR="alert(1)">',
    '<svg onload="alert(1)"></svg>',
    '<a href="/" onclick="alert(1)">home</a>',
  ].join('\\n');
  const { container } = render(<SkillDescription content={markdown} />);

  expect(collectEventAttributes(container)).toEqual([]);
});
\`\`\`

The [skill validation CI guide](/blog/validate-skill-md-in-ci-pipeline) explains metadata and content gates before publication. Renderer checks belong after those gates because valid metadata does not make Markdown safe. Keep both controls, and report which layer caught each fixture.

Do not claim event removal proves the whole document safe. CSS, URL schemes, plugin-generated nodes, and browser behavior require their own cases. This section supplies one bounded result inside the wider markdown XSS sanitization testing strategy.

## Add a Raw HTML Rendering Test

A raw HTML rendering test shows whether user HTML becomes a page node, plain text, or no output. Set the rule for scripts, forms, frames, notes, custom tags, SVG, and safe text tags. This test will catch a later rehypeRaw change that adds new risk.

The current ReactMarkdown configuration leaves raw HTML parsing disabled. A test should prove that hostile HTML does not create active nodes and that surrounding Markdown still renders. It should not claim every literal character must remain because parser versions can represent disallowed HTML differently.

Use an attack document that mixes Markdown and HTML rather than isolated tags only. Attackers exploit parser transitions, malformed nesting, comments, and code boundaries. Include HTML inside backticks and fenced code as safe text controls, because documentation often teaches browser automation with literal markup.

The [frontmatter schema guide](/blog/cursor-skill-md-frontmatter-schema-guide) separates metadata syntax from the Markdown body. Keep that boundary in fixtures. A raw tag in YAML is a parser case, while the same tag after the closing delimiter is a renderer case.

Markdown XSS sanitization testing should add one test-only setup with rehypeRaw placed before the clean step. Safe rows should still pass, while blocked tags and fields stay out. A second setup with no clean step must fail, which proves the block checks work.

Do not add raw HTML support only to satisfy presentation preferences. Prefer Markdown constructs or explicit React components whose props can be validated. If product requirements demand HTML, define a narrow sanitize schema, document allowed elements and properties, and add tests for every extension.

Treat comments and unknown tags as data, not trusted instructions. A sanitizer cannot determine whether prose asks an AI agent to run a risky command. That content-level risk belongs to command review, while this raw HTML rendering test covers browser DOM behavior.

## Preserve a Safe GFM Sanitization Test

A GFM sanitization test proves that tables, task boxes, struck text, auto links, and code still show after bad content is cut. These safe checks matter because a page that strips all form may look safe while it ruins the skill steps.

The production component loads remarkGfm before the rehype stage. The [remark-gfm documentation](https://github.com/remarkjs/remark-gfm) describes the syntax extensions it adds, including tables and task lists. Tests should use the installed plugin and assert accessible roles or stable text instead of fragile generated class names.

Render one document containing a heading, table, checked and unchecked tasks, struck text, an autolink, inline code, and a fenced command. Place hostile URL text in a table cell and event-handler text inside code. The former must not become an unsafe link, while the latter must remain visible as documentation.

| Safe GFM feature | Useful assertion | Fragile assertion to avoid |
| --- | --- | --- |
| Table | Correct row and cell text | Exact wrapper class list |
| Task list | Two checkbox inputs with states | Generated spacing classes |
| Strikethrough | Deleted semantic element or text | Full serialized HTML snapshot |
| Autolink | Safe href and visible label | Plugin internal node shape |
| Fenced code | Literal payload text remains | Syntax highlighter markup |

Use semantic queries when possible. A table should expose rows and cells, links should expose names and href values, and headings should preserve levels. Fenced code can use text lookup plus a check that no descendant script or event attribute exists.

The [portable Agent Skills guide](/blog/agent-skills-open-standard-portability) offers realistic cross-agent Markdown examples. Add one of those documents as a safe fixture, but keep the fixture compact enough that reviewers can understand every expected node.

Markdown XSS sanitization testing should tell page breakage from a security flaw. A lost table breaks the skill view, while a bad href can harm a user. Use two clear labels so the right owner can fix each fault without hiding the other.

## Protect Skill Description Security

Skill description security spans the source, saved text, page code, package updates, and browser rules. This test guards only the page step. Name what comes before and after it, and never claim that one clean DOM makes the whole skill safe.

Start with untrusted content from the registry and seeded skills. Store the exact Markdown and render it without custom pre-processing that can introduce HTML later. Confirm that fallback descriptions use the same output policy or a simpler escaped text path.

The [high-quality QA skills guide](/blog/how-to-write-high-quality-qa-skills) helps authors produce clear instructions, but editorial quality is not a security control. A well-written document can still contain an unsafe link, and a safe DOM can still instruct an agent to run a dangerous command.

Review package upgrades with lockfile changes. react-markdown, remarkGfm, rehypeSanitize, the unified parser stack, React, and the DOM environment can affect output. Run the corpus in unit tests and a browser smoke flow so parser-level and runtime differences both remain visible.

Add a Content Security Policy as defense in depth where the application supports it. CSP can limit damage if an unsafe node escapes sanitization, but it does not replace DOM assertions. Tests should report policy violations separately from sanitizer results.

For production evidence, save the attack-case names, dependency versions, renderer configuration, browser version, and pass or fail outcome. Do not save executable payload pages as public artifacts. Keep examples inert and use controlled local values.

The [Playwright security testing guide](/blog/security-testing-ai-generated-code) can extend unit checks with browser assertions around navigation, dialogs, downloads, and network requests. Keep the browser test small, deterministic, and isolated from real external services.

Markdown XSS sanitization testing must end with a bounded statement: the tested corpus did not produce forbidden DOM under the recorded versions. It must not state that a skill is safe in every agent, browser, or future plugin configuration.

## Run the Hostile Input Procedure

Run the hostile input steps when page packages, plugin order, the clean list, custom tags, or skill text paths change. Each run should name its test rows and code commit so the same fault can be seen on a laptop and in CI.

1. Copy the production renderer configuration into the test through a direct component import.
2. Build named attack rows for raw HTML, event attributes, URL schemes, parser boundaries, and plugin output.
3. Add safe Markdown and GFM controls for every content feature the product promises.
4. Render each row in Testing Library and inspect nodes, attributes, properties, roles, and visible text.
5. Run a browser smoke case against the built route with network and dialog monitoring enabled.
6. Mutate the renderer in an isolated control to prove the checks detect missing sanitization.
7. Record dependency versions, failed case names, and the exact commit under test.
8. Block publication when forbidden DOM appears, then add the repaired payload as a permanent regression case.

Keep unit and browser scopes different. Unit cases can cover a broad corpus quickly, while Playwright verifies the actual page bundle, CSP behavior, and browser URL normalization. Do not duplicate every payload in both layers without a clear risk reason.

Run tests with no external network dependency. Safe external links can be inspected without clicking them, and browser routing can intercept requests. This avoids contacting untrusted domains and keeps CI evidence stable.

The [QA skills directory](/skills) gives the final smoke flow realistic public content. Select a known skill, inject only controlled fixture data in a test environment, and confirm no forbidden nodes or unexpected requests appear.

Review failed payloads manually before changing expected output. A dependency upgrade can improve sanitization, alter harmless formatting, or reveal a gap. Accept only behavior supported by the written DOM and URL policy.

Use markdown XSS sanitization testing as a release gate for renderer changes. It should fail closed on forbidden DOM while providing separate diagnostics for safe formatting regressions.

## Test Production Renderer Parity Before Release

Production renderer parity means tests load the same component and package set that the site ships. A copied test setup can drift with no clear sign when one side adds a plugin, custom tag, clean list, or link rule.

Add one route-level test that opens a skill detail page in a built application and compares selected safe and hostile outcomes with the unit corpus. Do not compare the entire serialized DOM. Assert stable security facts, accessible content, console errors, dialogs, navigation attempts, and outbound requests.

Treat client and server rendering boundaries explicitly. SkillDescription is a client component, so tests should wait for hydration before inspecting final behavior. A server-rendered text state followed by an unsafe hydrated state would otherwise escape an early snapshot.

Markdown XSS sanitization testing should appear in the pull request evidence with the attacked classes and tested versions. Security review can then see what the suite proves, what CSP covers, and what remains outside scope.

Test each custom link, image, code, and heading map that the page passes to ReactMarkdown. A safe core setup can still lose its guard when a local map copies bad props to a tag. Give each map one bad input, one safe input, and one check on the final DOM field.

Run one built-page case with JavaScript on and one with the first server view saved before the page wakes. Compare the same blocked tags and safe text in both states. This catches a gap where the first HTML is clean but the client adds a bad field during page load.

Keep this route check small and use the wide attack set in unit tests, since a full page load costs more and gives less direct fault output. The page case should prove that build steps, client load, local tag maps, and browser rules do not change the core result.

Browse the [skill security checklist](/blog/agent-skill-security-review-checklist), install the [Playwright CLI skill](/skills/Pramod/playwright-cli), and add the hostile corpus to the real SkillDescription test flow. Run it after dependency changes, then retain every repaired payload as a named regression case.

## Frequently Asked Questions

### Does react-markdown make untrusted Markdown safe by itself?

ReactMarkdown avoids raw HTML parsing by default, which reduces risk, but plugins and custom components can alter that behavior. Test the installed production pipeline and its URL handling directly. A package design claim does not replace DOM assertions, dependency review, browser controls, or a written policy for allowed content.

### Why use rehype-sanitize when raw HTML is disabled?

The clean step guards the HTML tree, even when a plugin adds new tags or fields. It also sets a clear list of what may pass. Tests must still prove the live result because order, local rules, and package builds shape what React gets.

### Should hostile payloads execute during the test?

No. Prefer inert payload strings and structural DOM assertions for forbidden nodes, attributes, and URLs. JSDOM execution behavior is incomplete, and real execution creates needless risk. A controlled browser smoke test can monitor attempted effects without contacting external systems or embedding harmful production payloads.

### Can a snapshot replace targeted sanitizer assertions?

No. Large snapshots hide the security meaning of a change and invite automatic updates. Assert forbidden selectors, event attributes, normalized destinations, safe roles, and expected text directly. A compact supplemental snapshot may help review structure, but it should never be the only signal for a security boundary.

### How often should the attack corpus run?

Run the fast corpus on every relevant pull request and the built-browser smoke case before release. Trigger both when renderer packages, plugin order, sanitize schemas, custom components, CSP, or skill routes change. Schedule a periodic dependency review so known parser and sanitizer advisories become regression fixtures quickly.

### Does a passing renderer test prove an agent skill is safe?

No. It proves only that the tested Markdown did not create forbidden browser DOM under recorded versions and settings. Skills can still contain risky instructions, misleading links, secrets, or commands. Combine renderer evidence with schema validation, command review, provenance checks, permissions, and human security assessment.
`,
};
