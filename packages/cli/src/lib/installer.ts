import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import type { AgentDefinition } from '@qaskills/shared';

export interface ResolvedSkill {
  name: string;
  source: string; // 'registry' | 'github' | 'local'
  path: string;
  url?: string;
}

export async function resolveSkill(nameOrUrl: string): Promise<ResolvedSkill> {
  // Local path
  if (nameOrUrl.startsWith('.') || nameOrUrl.startsWith('/')) {
    return { name: path.basename(nameOrUrl), source: 'local', path: path.resolve(nameOrUrl) };
  }
  // GitHub shorthand (user/repo)
  if (nameOrUrl.includes('/') && !nameOrUrl.includes('://')) {
    return {
      name: nameOrUrl.split('/').pop()!,
      source: 'github',
      path: '',
      url: `https://github.com/${nameOrUrl}`,
    };
  }
  // Registry name
  return { name: nameOrUrl, source: 'registry', path: '', url: `https://qaskills.sh/api/skills/${nameOrUrl}` };
}

export async function downloadSkill(skill: ResolvedSkill): Promise<string> {
  const tmpDir = path.join(os.tmpdir(), 'qaskills', skill.name);
  await fs.mkdir(tmpDir, { recursive: true });

  if (skill.source === 'local') {
    // Copy local files
    await copyDir(skill.path, tmpDir);
    return tmpDir;
  }

  if (skill.source === 'github' && skill.url) {
    // Shallow clone
    execSync(`git clone --depth 1 ${skill.url} "${tmpDir}"`, { stdio: 'pipe' });
    return tmpDir;
  }

  // Registry: download from API
  if (skill.url) {
    const res = await fetch(skill.url);
    if (!res.ok) throw new Error(`Skill "${skill.name}" not found in registry`);
    const data = await res.json();
    if (data.githubUrl) {
      execSync(`git clone --depth 1 ${data.githubUrl} "${tmpDir}"`, { stdio: 'pipe' });
    }
  }

  return tmpDir;
}

export async function installToAgent(
  skillDir: string,
  skillName: string,
  agent: AgentDefinition,
): Promise<string> {
  const targetBase = agent.skillsDir.replace('~', os.homedir());
  const targetDir = path.join(targetBase, skillName);

  await fs.mkdir(targetDir, { recursive: true });
  await copyDir(skillDir, targetDir);

  return targetDir;
}

export async function uninstallFromAgent(skillName: string, agent: AgentDefinition): Promise<void> {
  const targetBase = agent.skillsDir.replace('~', os.homedir());
  const targetDir = path.join(targetBase, skillName);

  try {
    await fs.rm(targetDir, { recursive: true, force: true });
  } catch {
    // Already removed
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.name === '.git') continue;
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
