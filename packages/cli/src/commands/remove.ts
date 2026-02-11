import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { detectAgents } from '../lib/agent-detector';
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
      targetAgents = detected.filter((a) => a.definition.id === options.agent || a.definition.name === options.agent);
      if (targetAgents.length === 0) {
        p.log.error(`Agent "${options.agent}" not found among detected agents.`);
        p.outro(pc.dim('Detected agents: ' + detected.map((a) => a.definition.id).join(', ')));
        return;
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
