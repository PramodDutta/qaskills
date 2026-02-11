import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { detectAgents } from '../lib/agent-detector';
import { resolveSkill, downloadSkill, installToAgent } from '../lib/installer';
import { sendTelemetry } from '../lib/telemetry';

export const addCommand = new Command('add')
  .argument('<skill>', 'Skill name, GitHub shorthand (user/repo), or local path')
  .description('Install a QA skill to your AI coding agents')
  .option('-a, --agent <agent>', 'Target specific agent')
  .action(async (skillName: string, options: { agent?: string }) => {
    p.intro(pc.bgCyan(pc.black(' qaskills add ')));

    const spinner = p.spinner();

    // 1. Detect agents
    spinner.start('Detecting AI coding agents...');
    const detected = detectAgents();
    spinner.stop(`Found ${detected.length} agent(s)`);

    if (detected.length === 0) {
      p.log.error('No AI coding agents detected. Make sure you have Claude Code, Cursor, or another supported agent installed.');
      p.outro(pc.dim('Run `qaskills list --agents` to see supported agents'));
      return;
    }

    // 2. Select agents
    let selectedAgents = detected;
    if (options.agent) {
      selectedAgents = detected.filter((a) => a.definition.id === options.agent || a.definition.name === options.agent);
      if (selectedAgents.length === 0) {
        p.log.error(`Agent "${options.agent}" not found among detected agents.`);
        p.outro(pc.dim('Detected agents: ' + detected.map((a) => a.definition.id).join(', ')));
        return;
      }
    } else if (detected.length > 1) {
      const selected = await p.multiselect({
        message: 'Which agents should receive this skill?',
        options: detected.map((a) => ({
          value: a,
          label: a.definition.name,
          hint: a.skillsDir,
        })),
        required: true,
      });
      if (p.isCancel(selected)) { p.cancel('Cancelled.'); process.exit(0); }
      selectedAgents = selected as typeof detected;
    }

    // 3. Resolve & download skill
    spinner.start(`Resolving skill "${skillName}"...`);
    const skill = await resolveSkill(skillName);
    spinner.stop(`Resolved: ${skill.name} (${skill.source})`);

    spinner.start('Downloading skill...');
    const skillDir = await downloadSkill(skill);
    spinner.stop('Downloaded successfully');

    // 4. Install to each agent
    for (const agent of selectedAgents) {
      spinner.start(`Installing to ${agent.definition.name}...`);
      const installedPath = await installToAgent(skillDir, skill.name, agent.definition);
      spinner.stop(`${pc.green('✓')} Installed to ${agent.definition.name}: ${pc.dim(installedPath)}`);
    }

    // 5. Telemetry
    sendTelemetry({
      skillId: skill.name,
      action: 'install',
      agents: selectedAgents.map((a) => a.definition.id),
    });

    p.outro(`${pc.green('✓')} Skill "${skill.name}" installed to ${selectedAgents.length} agent(s)`);
  });
