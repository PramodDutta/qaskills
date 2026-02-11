import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getSkill } from '../lib/api-client';

export const infoCommand = new Command('info')
  .argument('<skill>', 'Skill name or slug')
  .description('Show detailed information about a skill')
  .action(async (skillName: string) => {
    p.intro(pc.bgCyan(pc.black(' qaskills info ')));

    const spinner = p.spinner();
    spinner.start('Fetching skill details...');

    try {
      const skill = await getSkill(skillName);
      spinner.stop('');

      p.log.info([
        `${pc.bold(skill.name)} ${pc.dim(`v${skill.version || '1.0.0'}`)}`,
        `${pc.dim('by')} ${skill.author}`,
        '',
        skill.description,
        '',
        `${pc.bold('Quality Score:')} ${skill.qualityScore}/100`,
        `${pc.bold('Installs:')} ${skill.installCount}`,
        `${pc.bold('Testing Types:')} ${(skill.testingTypes || []).join(', ')}`,
        `${pc.bold('Frameworks:')} ${(skill.frameworks || []).join(', ') || 'N/A'}`,
        `${pc.bold('Languages:')} ${(skill.languages || []).join(', ')}`,
        `${pc.bold('License:')} ${skill.license}`,
        skill.githubUrl ? `${pc.bold('GitHub:')} ${skill.githubUrl}` : '',
        '',
        `${pc.dim(`Install: npx qaskills add ${skill.slug}`)}`,
      ].filter(Boolean).join('\n'));

      p.outro(`${pc.dim('View on web: https://qaskills.sh/skills/' + skill.slug)}`);
    } catch {
      spinner.stop('Failed to fetch skill details');
      p.log.error(`Skill "${skillName}" not found. Try \`qaskills search ${skillName}\``);
      p.outro('');
    }
  });
