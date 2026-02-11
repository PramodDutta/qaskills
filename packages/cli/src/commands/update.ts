import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { detectAgents } from '../lib/agent-detector';
import { resolveSkill, downloadSkill, installToAgent } from '../lib/installer';
import { sendTelemetry } from '../lib/telemetry';

export const updateCommand = new Command('update')
  .argument('[skill]', 'Skill name to update (updates all if omitted)')
  .description('Update installed QA skill(s)')
  .action(async (skillName?: string) => {
    p.intro(pc.bgCyan(pc.black(' qaskills update ')));

    const spinner = p.spinner();
    spinner.start('Checking for updates...');
    const detected = detectAgents();

    if (skillName) {
      const skill = await resolveSkill(skillName);
      const skillDir = await downloadSkill(skill);
      for (const agent of detected) {
        await installToAgent(skillDir, skill.name, agent.definition);
      }
      spinner.stop(`${pc.green('✓')} Updated "${skillName}"`);

      sendTelemetry({
        skillId: skill.name,
        action: 'update',
        agents: detected.map((a) => a.definition.id),
      });
    } else {
      spinner.stop('Update all skills - scanning installed skills...');
      p.log.info(pc.dim('To update a specific skill: qaskills update <skill-name>'));
      p.log.info(pc.dim('Full update scanning coming in a future release'));
    }

    p.outro('Done');
  });
