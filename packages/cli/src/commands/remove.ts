import { Command } from 'commander';
import * as path from 'node:path';
import * as os from 'node:os';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { detectAgents, getAllAgents } from '../lib/agent-detector';
import { uninstallFromAgent } from '../lib/installer';
import { sendTelemetry } from '../lib/telemetry';

export const removeCommand = new Command('remove')
  .argument('<skill>', 'Skill name to remove')
  .description('Remove an installed QA skill')
  .option('-a, --agent <agent>', 'Remove from specific agent only')
  .action(async (skillName: string, options: { agent?: string }) => {
    p.intro(pc.bgCyan(pc.black(' qaskills remove ')));

    const detected = detectAgents();

    let targetAgents = detected;
    if (options.agent) {
      // First check detected agents
      targetAgents = detected.filter(
        (a) => a.definition.id === options.agent || a.definition.name === options.agent,
      );
      // If not detected, check all known agents (allows removing from agents not currently detected)
      if (targetAgents.length === 0) {
        const allAgents = getAllAgents();
        const knownAgent = allAgents.find(
          (a) => a.id === options.agent || a.name === options.agent,
        );
        if (knownAgent) {
          const resolvedSkillsDir = knownAgent.skillsDir.startsWith('~')
            ? knownAgent.skillsDir.replace('~', os.homedir())
            : path.resolve(process.cwd(), knownAgent.skillsDir);
          targetAgents = [
            {
              definition: knownAgent,
              skillsDir: resolvedSkillsDir,
              exists: false,
              scope: knownAgent.configDir.startsWith('~') ? 'global' : 'project',
            },
          ];
        } else {
          p.log.error(`Agent "${options.agent}" is not a known agent.`);
          p.outro(pc.dim('Run `qaskills list --agents` to see supported agents'));
          return;
        }
      }
    }

    const confirm = await p.confirm({
      message: `Remove skill "${skillName}" from ${targetAgents.length} agent(s)?`,
    });
    if (p.isCancel(confirm) || !confirm) { p.cancel('Cancelled.'); process.exit(0); }

    const spinner = p.spinner();
    for (const agent of targetAgents) {
      spinner.start(`Removing from ${agent.definition.name}...`);
      await uninstallFromAgent(skillName, agent.definition);
      spinner.stop(`${pc.green('✓')} Removed from ${agent.definition.name}`);
    }

    sendTelemetry({
      skillId: skillName,
      action: 'remove',
      agents: targetAgents.map((a) => a.definition.id),
    });

    p.outro(`${pc.green('✓')} Skill "${skillName}" removed`);
  });
