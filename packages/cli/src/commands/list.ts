import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { detectAgents } from '../lib/agent-detector';
import { parseSkillMd } from '@qaskills/shared';

export const listCommand = new Command('list')
  .description('List installed QA skills')
  .option('--agents', 'Show detected agents only')
  .action(async (options: { agents?: boolean }) => {
    p.intro(pc.bgCyan(pc.black(' qaskills list ')));

    const spinner = p.spinner();
    spinner.start('Detecting agents and scanning skills...');
    const detected = detectAgents();
    spinner.stop(`Found ${detected.length} agent(s)`);

    if (options.agents) {
      for (const agent of detected) {
        p.log.info(`${pc.bold(agent.definition.name)} ${pc.dim(agent.skillsDir)}`);
      }
      p.outro(`${detected.length} agent(s) detected`);
      return;
    }

    let totalSkills = 0;
    for (const agent of detected) {
      const skillsDir = agent.skillsDir;
      p.log.info(pc.bold(`\n${agent.definition.name} (${pc.dim(skillsDir)})`));

      try {
        const entries = await fs.readdir(skillsDir, { withFileTypes: true });
        const dirs = entries.filter((e) => e.isDirectory());

        for (const dir of dirs) {
          const skillMdPath = path.join(skillsDir, dir.name, 'SKILL.md');
          try {
            const raw = await fs.readFile(skillMdPath, 'utf-8');
            const parsed = parseSkillMd(raw);
            p.log.info(
              `  ${pc.green('●')} ${pc.bold(parsed.frontmatter.name)} ${pc.dim(`v${parsed.frontmatter.version}`)}\n` +
              `    ${parsed.frontmatter.description}\n` +
              `    ${pc.dim(parsed.frontmatter.testingTypes.join(', '))}`
            );
            totalSkills++;
          } catch {
            p.log.info(`  ${pc.yellow('○')} ${dir.name} ${pc.dim('(no SKILL.md)')}`);
          }
        }

        if (dirs.length === 0) {
          p.log.info(pc.dim('  No skills installed'));
        }
      } catch {
        p.log.info(pc.dim('  Skills directory not found'));
      }
    }

    p.outro(`${totalSkills} skill(s) installed across ${detected.length} agent(s)`);
  });
