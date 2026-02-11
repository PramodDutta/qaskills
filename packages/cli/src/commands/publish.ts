import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'fs/promises';
import path from 'path';
import { parseSkillMd, skillFrontmatterSchema } from '@qaskills/shared';

export const publishCommand = new Command('publish')
  .description('Validate and publish your skill to qaskills.sh')
  .action(async () => {
    p.intro(pc.bgCyan(pc.black(' qaskills publish ')));

    const skillMdPath = path.join(process.cwd(), 'SKILL.md');

    // 1. Check for SKILL.md
    try {
      await fs.access(skillMdPath);
    } catch {
      p.log.error('No SKILL.md found in current directory.');
      p.log.info(pc.dim('Run `qaskills init` to create one.'));
      p.outro('');
      return;
    }

    const spinner = p.spinner();

    // 2. Parse and validate
    spinner.start('Validating SKILL.md...');
    const raw = await fs.readFile(skillMdPath, 'utf-8');
    const parsed = parseSkillMd(raw);
    const validation = skillFrontmatterSchema.safeParse(parsed.frontmatter);

    if (!validation.success) {
      spinner.stop('Validation failed');
      for (const error of validation.error.errors) {
        p.log.error(`${error.path.join('.')}: ${error.message}`);
      }
      p.outro(pc.dim('Fix the issues above and try again'));
      return;
    }

    spinner.stop(`${pc.green('✓')} SKILL.md is valid`);

    // 3. Show preview
    p.log.info([
      pc.bold('Skill Preview:'),
      `  Name: ${parsed.frontmatter.name}`,
      `  Description: ${parsed.frontmatter.description}`,
      `  Testing Types: ${parsed.frontmatter.testingTypes.join(', ')}`,
      `  Frameworks: ${parsed.frontmatter.frameworks.join(', ') || 'N/A'}`,
      `  Languages: ${parsed.frontmatter.languages.join(', ')}`,
      `  Content: ${parsed.content.length} characters`,
    ].join('\n'));

    // 4. Confirm
    const confirm = await p.confirm({ message: 'Publish this skill to qaskills.sh?' });
    if (p.isCancel(confirm) || !confirm) { p.cancel('Cancelled.'); process.exit(0); }

    // 5. Publish
    spinner.start('Publishing to qaskills.sh...');
    // TODO: Implement actual API publish when auth is ready
    await new Promise((resolve) => setTimeout(resolve, 1500));
    spinner.stop(`${pc.green('✓')} Published successfully!`);

    p.outro(`${pc.dim('View at: https://qaskills.sh/skills/' + parsed.frontmatter.name.toLowerCase().replace(/\s+/g, '-'))}`);
  });
