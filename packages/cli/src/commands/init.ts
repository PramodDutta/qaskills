import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'fs/promises';
import path from 'path';
import { TESTING_TYPES, FRAMEWORKS, LANGUAGES } from '@qaskills/shared';
import { serializeSkillMd } from '@qaskills/shared';

export const initCommand = new Command('init')
  .argument('[template]', 'Template name (playwright, cypress, api, generic)')
  .description('Scaffold a new SKILL.md for your QA skill')
  .action(async (template?: string) => {
    p.intro(pc.bgCyan(pc.black(' qaskills init ')));

    const name = await p.text({ message: 'Skill name:', placeholder: 'my-playwright-tests' });
    if (p.isCancel(name)) { p.cancel('Cancelled.'); process.exit(0); }

    const description = await p.text({ message: 'Description:', placeholder: 'Comprehensive Playwright E2E testing patterns' });
    if (p.isCancel(description)) { p.cancel('Cancelled.'); process.exit(0); }

    const testingType = await p.select({
      message: 'Primary testing type:',
      options: TESTING_TYPES.map((t) => ({ value: t.id, label: t.name, hint: t.description })),
    });
    if (p.isCancel(testingType)) { p.cancel('Cancelled.'); process.exit(0); }

    const framework = await p.select({
      message: 'Primary framework:',
      options: [
        { value: 'none', label: 'None / Generic' },
        ...FRAMEWORKS.map((f) => ({ value: f.id, label: f.name })),
      ],
    });
    if (p.isCancel(framework)) { p.cancel('Cancelled.'); process.exit(0); }

    const language = await p.select({
      message: 'Primary language:',
      options: LANGUAGES.map((l) => ({ value: l.id, label: l.name })),
    });
    if (p.isCancel(language)) { p.cancel('Cancelled.'); process.exit(0); }

    const author = await p.text({ message: 'Author:', placeholder: 'your-github-username' });
    if (p.isCancel(author)) { p.cancel('Cancelled.'); process.exit(0); }

    const content = getTemplateContent(template || 'generic', name as string);

    const skillMd = serializeSkillMd(
      {
        name: name as string,
        description: description as string,
        version: '1.0.0',
        author: author as string,
        license: 'MIT',
        tags: [testingType as string],
        testingTypes: [testingType as string],
        frameworks: framework !== 'none' ? [framework as string] : [],
        languages: [language as string],
        domains: ['web'],
        agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex'],
      },
      content,
    );

    const outputPath = path.join(process.cwd(), 'SKILL.md');
    await fs.writeFile(outputPath, skillMd, 'utf-8');

    p.outro(`${pc.green('✓')} Created SKILL.md at ${pc.dim(outputPath)}`);
  });

function getTemplateContent(template: string, name: string): string {
  const templates: Record<string, string> = {
    playwright: `# ${name}\n\nYou are an expert Playwright test automation engineer.\n\n## Guidelines\n\n- Use Page Object Model pattern\n- Use web-first assertions (expect(locator).toBeVisible())\n- Use auto-waiting locators (getByRole, getByText, getByTestId)\n- Always use fixtures for test setup\n- Group related tests with describe blocks\n\n## Code Examples\n\n\`\`\`typescript\nimport { test, expect } from '@playwright/test';\n\ntest('example test', async ({ page }) => {\n  await page.goto('/');\n  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();\n});\n\`\`\`\n`,
    cypress: `# ${name}\n\nYou are an expert Cypress test automation engineer.\n\n## Guidelines\n\n- Use custom commands for reusable actions\n- Use cy.intercept() for network stubbing\n- Use cy.session() for authentication\n- Chain assertions naturally\n- Use data-testid attributes for selectors\n\n## Code Examples\n\n\`\`\`typescript\ndescribe('Feature', () => {\n  it('should work', () => {\n    cy.visit('/');\n    cy.get('[data-testid=\"title\"]').should('be.visible');\n  });\n});\n\`\`\`\n`,
    api: `# ${name}\n\nYou are an expert API test automation engineer.\n\n## Guidelines\n\n- Validate response status codes, headers, and body\n- Use JSON Schema validation\n- Test error scenarios and edge cases\n- Use environment variables for base URLs\n- Implement proper test data cleanup\n\n## Code Examples\n\n\`\`\`typescript\ntest('GET /api/users', async ({ request }) => {\n  const response = await request.get('/api/users');\n  expect(response.status()).toBe(200);\n  const body = await response.json();\n  expect(body).toHaveProperty('users');\n});\n\`\`\`\n`,
    generic: `# ${name}\n\nYou are a QA testing expert. Follow these guidelines when writing tests.\n\n## Guidelines\n\n- Write clear, descriptive test names\n- Follow the Arrange-Act-Assert pattern\n- Keep tests independent and idempotent\n- Use meaningful assertions\n- Handle async operations properly\n\n## Best Practices\n\n- One assertion concept per test\n- Use test fixtures for setup/teardown\n- Mock external dependencies\n- Test both happy and unhappy paths\n`,
  };
  return templates[template] || templates.generic;
}
