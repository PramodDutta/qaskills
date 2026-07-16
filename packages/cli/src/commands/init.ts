import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'fs/promises';
import path from 'path';
import { TESTING_TYPES, FRAMEWORKS, LANGUAGES } from '@qaskills/shared';
import { serializeSkillMd } from '@qaskills/shared';

interface InitOptions {
  yes?: boolean;
  name?: string;
  description?: string;
  author?: string;
  testingType?: string;
  framework?: string;
  language?: string;
}

const DEFAULT_TESTING_TYPE: Record<string, string> = {
  playwright: 'e2e',
  cypress: 'e2e',
  api: 'api',
  generic: 'e2e',
};

export const initCommand = new Command('init')
  .argument('[template]', 'Template name (playwright, cypress, api, generic)')
  .description('Scaffold a new SKILL.md for your QA skill')
  .option('-y, --yes', 'Non-interactive: scaffold from flags and defaults without prompting')
  .option('--name <name>', 'Skill name (non-interactive)')
  .option('--description <text>', 'Description (non-interactive)')
  .option('--author <author>', 'Author (non-interactive)')
  .option('--testing-type <type>', 'Primary testing type id (non-interactive)')
  .option('--framework <framework>', 'Primary framework id, or "none" (non-interactive)')
  .option('--language <language>', 'Primary language id (non-interactive)')
  .action(async (template: string | undefined, options: InitOptions) => {
    const tmpl = template || 'generic';
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const anyFlags =
      options.name || options.description || options.author || options.testingType || options.framework || options.language;
    // Run non-interactively when explicitly asked, when flags were supplied,
    // or whenever there is no usable terminal (CI, pipes, redirected stdout).
    const nonInteractive = options.yes || Boolean(anyFlags) || !interactive;

    let name: string;
    let description: string;
    let author: string;
    let testingType: string;
    let framework: string;
    let language: string;

    if (nonInteractive) {
      name = options.name || `my-${tmpl}-skill`;
      description =
        options.description || `${tmpl === 'generic' ? 'QA' : tmpl} testing patterns and best practices for AI agents.`;
      author = options.author || 'your-github-username';
      testingType = options.testingType || DEFAULT_TESTING_TYPE[tmpl] || 'e2e';
      framework = options.framework || (tmpl === 'playwright' || tmpl === 'cypress' ? tmpl : 'none');
      language = options.language || 'typescript';

      // Validate flag values against the known vocabularies so a typo fails
      // loudly here rather than at seed/validate time.
      const badType = !TESTING_TYPES.some((t) => t.id === testingType);
      const badFramework = framework !== 'none' && !FRAMEWORKS.some((f) => f.id === framework);
      const badLanguage = !LANGUAGES.some((l) => l.id === language);
      if (badType || badFramework || badLanguage) {
        if (badType) console.error(pc.red(`Unknown testing type "${testingType}". Valid: ${TESTING_TYPES.map((t) => t.id).join(', ')}`));
        if (badFramework) console.error(pc.red(`Unknown framework "${framework}". Valid: none, ${FRAMEWORKS.map((f) => f.id).join(', ')}`));
        if (badLanguage) console.error(pc.red(`Unknown language "${language}". Valid: ${LANGUAGES.map((l) => l.id).join(', ')}`));
        process.exit(1);
      }
    } else {
      p.intro(pc.bgCyan(pc.black(' qaskills init ')));

      const nameInput = await p.text({ message: 'Skill name:', placeholder: 'my-playwright-tests' });
      if (p.isCancel(nameInput)) { p.cancel('Cancelled.'); process.exit(0); }

      const descInput = await p.text({ message: 'Description:', placeholder: 'Comprehensive Playwright E2E testing patterns' });
      if (p.isCancel(descInput)) { p.cancel('Cancelled.'); process.exit(0); }

      const typeInput = await p.select({
        message: 'Primary testing type:',
        options: TESTING_TYPES.map((t) => ({ value: t.id, label: t.name, hint: t.description })),
      });
      if (p.isCancel(typeInput)) { p.cancel('Cancelled.'); process.exit(0); }

      const frameworkInput = await p.select({
        message: 'Primary framework:',
        options: [
          { value: 'none', label: 'None / Generic' },
          ...FRAMEWORKS.map((f) => ({ value: f.id, label: f.name })),
        ],
      });
      if (p.isCancel(frameworkInput)) { p.cancel('Cancelled.'); process.exit(0); }

      const languageInput = await p.select({
        message: 'Primary language:',
        options: LANGUAGES.map((l) => ({ value: l.id, label: l.name })),
      });
      if (p.isCancel(languageInput)) { p.cancel('Cancelled.'); process.exit(0); }

      const authorInput = await p.text({ message: 'Author:', placeholder: 'your-github-username' });
      if (p.isCancel(authorInput)) { p.cancel('Cancelled.'); process.exit(0); }

      name = nameInput as string;
      description = descInput as string;
      testingType = typeInput as string;
      framework = frameworkInput as string;
      language = languageInput as string;
      author = authorInput as string;
    }

    const content = getTemplateContent(tmpl, name);

    const skillMd = serializeSkillMd(
      {
        name,
        description,
        version: '1.0.0',
        author,
        license: 'MIT',
        tags: [testingType],
        testingTypes: [testingType],
        frameworks: framework !== 'none' ? [framework] : [],
        languages: [language],
        domains: ['web'],
        agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex'],
      },
      content,
    );

    const outputPath = path.join(process.cwd(), 'SKILL.md');
    await fs.writeFile(outputPath, skillMd, 'utf-8');

    if (nonInteractive) {
      console.log(`${pc.green('✓')} Created SKILL.md at ${outputPath}`);
    } else {
      p.outro(`${pc.green('✓')} Created SKILL.md at ${pc.dim(outputPath)}`);
    }
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
