#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import {
  addCommand,
  searchCommand,
  initCommand,
  listCommand,
  removeCommand,
  updateCommand,
  infoCommand,
  publishCommand,
} from './commands';

const program = new Command();

const banner = `
${pc.bold(pc.cyan('  ╔═══════════════════════════════════════╗'))}
${pc.bold(pc.cyan('  ║'))}  ${pc.bold('QA Skills')} ${pc.dim('— Agent Skills for QA')}     ${pc.bold(pc.cyan('║'))}
${pc.bold(pc.cyan('  ║'))}  ${pc.dim('https://qaskills.sh')}                  ${pc.bold(pc.cyan('║'))}
${pc.bold(pc.cyan('  ╚═══════════════════════════════════════╝'))}
`;

program
  .name('qaskills')
  .description('QA Skills Directory for AI Coding Agents')
  .version('0.1.0')
  .addHelpText('before', banner)
  .addCommand(addCommand)
  .addCommand(searchCommand)
  .addCommand(initCommand)
  .addCommand(listCommand)
  .addCommand(removeCommand)
  .addCommand(updateCommand)
  .addCommand(infoCommand)
  .addCommand(publishCommand);

program.parse();
