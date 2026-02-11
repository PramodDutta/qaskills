import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { searchSkills } from '../lib/api-client';

export const searchCommand = new Command('search')
  .argument('[query]', 'Search query')
  .description('Search for QA skills')
  .option('-t, --type <type>', 'Filter by testing type')
  .option('-f, --framework <framework>', 'Filter by framework')
  .option('-l, --limit <limit>', 'Number of results', '10')
  .action(async (query: string | undefined, options: { type?: string; framework?: string; limit: string }) => {
    p.intro(pc.bgCyan(pc.black(' qaskills search ')));

    let searchQuery = query;
    if (!searchQuery) {
      const input = await p.text({
        message: 'What kind of QA skill are you looking for?',
        placeholder: 'e.g. playwright e2e, api testing, performance',
      });
      if (p.isCancel(input)) { p.cancel('Cancelled.'); process.exit(0); }
      searchQuery = input;
    }

    const spinner = p.spinner();
    spinner.start('Searching...');

    try {
      const results = await searchSkills({
        query: searchQuery,
        testingTypes: options.type ? [options.type] : undefined,
        frameworks: options.framework ? [options.framework] : undefined,
        pageSize: parseInt(options.limit, 10),
      });

      spinner.stop(`Found ${results.total} skill(s)`);

      if (results.skills.length === 0) {
        p.log.info('No skills found. Try a different search query.');
        p.outro(pc.dim('Browse all skills at https://qaskills.sh/skills'));
        return;
      }

      for (const skill of results.skills) {
        const quality = skill.qualityScore >= 80 ? pc.green(`★ ${skill.qualityScore}`) :
                        skill.qualityScore >= 50 ? pc.yellow(`★ ${skill.qualityScore}`) :
                        pc.dim(`★ ${skill.qualityScore}`);
        p.log.info(
          `${pc.bold(skill.name)} ${pc.dim(`by ${skill.author}`)} ${quality}\n` +
          `  ${skill.description}\n` +
          `  ${pc.dim(`Tags: ${skill.testingTypes.join(', ')}`)}  ${pc.cyan(`Installs: ${skill.installCount}`)}\n` +
          `  ${pc.dim(`Install: npx qaskills add ${skill.slug}`)}`
        );
      }

      p.outro(`Showing ${results.skills.length} of ${results.total} results`);
    } catch {
      spinner.stop('Search failed');
      p.log.error('Could not reach qaskills.sh. Showing local seed skills...');
      p.outro(pc.dim('Check your internet connection and try again'));
    }
  });
