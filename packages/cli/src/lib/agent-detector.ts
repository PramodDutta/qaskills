import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { AgentDefinition } from '@qaskills/shared';
import { AGENTS } from '@qaskills/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectedAgent {
  /** The agent definition from the shared constants. */
  definition: AgentDefinition;
  /** Absolute path to the agent's skills directory. */
  skillsDir: string;
  /** Whether the skills directory already exists. */
  exists: boolean;
  /** 'global' if lives in the home dir, 'project' if in cwd. */
  scope: 'global' | 'project';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function isGlobalPath(configDir: string): boolean {
  return configDir.startsWith('~/') || configDir.startsWith('~');
}

function probeExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect all installed / configured AI coding agents by scanning expected
 * filesystem paths.
 *
 * @param projectDir  The root of the current project (defaults to cwd).
 * @returns Array of detected agents with resolved paths.
 */
export function detectAgents(projectDir?: string): DetectedAgent[] {
  const cwd = projectDir ?? process.cwd();
  const detected: DetectedAgent[] = [];

  for (const agent of AGENTS) {
    const scope: 'global' | 'project' = isGlobalPath(agent.configDir) ? 'global' : 'project';
    const resolvedConfigDir =
      scope === 'global'
        ? expandHome(agent.configDir)
        : path.resolve(cwd, agent.configDir);
    const resolvedSkillsDir =
      scope === 'global'
        ? expandHome(agent.skillsDir)
        : path.resolve(cwd, agent.skillsDir);

    // Check if the agent's config directory (or config file) exists
    const configExists = probeExists(resolvedConfigDir);
    const configFileExists =
      agent.configFile && scope === 'project'
        ? probeExists(path.resolve(cwd, agent.configFile))
        : false;

    if (configExists || configFileExists) {
      detected.push({
        definition: agent,
        skillsDir: resolvedSkillsDir,
        exists: probeExists(resolvedSkillsDir),
        scope,
      });
    }
  }

  return detected;
}

/**
 * Return all known agents (regardless of whether they are detected).
 * Useful for the `init` command when users want to specify targets manually.
 */
export function getAllAgents(): AgentDefinition[] {
  return [...AGENTS];
}
