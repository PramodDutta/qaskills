import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
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
  const safeName = skill.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tmpDir = path.join(os.tmpdir(), 'qaskills', safeName);
  // Clean up any previous download to avoid stale data / git clone conflicts
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(tmpDir, { recursive: true });

  if (skill.source === 'local') {
    // Copy local files
    await copyDir(skill.path, tmpDir);
    return tmpDir;
  }

  if (skill.source === 'github' && skill.url) {
    // Shallow clone — use execFileSync to avoid shell injection
    execFileSync('git', ['clone', '--depth', '1', skill.url, tmpDir], { stdio: 'pipe' });
    // If the repo carries a SKILL.md anywhere, keep just that (agents need the
    // instruction file, not the whole repo). No SKILL.md -> keep repo as-is,
    // since a direct user/repo install may intentionally be a code template.
    await extractSkillMdOnly(tmpDir);
    return tmpDir;
  }

  // Registry: download from API
  if (skill.url) {
    const res = await fetch(skill.url);
    if (!res.ok) throw new Error(`Skill "${skill.name}" not found in registry`);
    const data = await res.json();

    let cloned = false;
    if (data.githubUrl) {
      try {
        execFileSync('git', ['clone', '--depth', '1', data.githubUrl, tmpDir], { stdio: 'pipe' });
        // Registry skills must deliver a SKILL.md. If the linked repo has one,
        // keep only that; if it has none (repo is just a code framework), treat
        // the clone as a miss and fall back to the /content endpoint, which
        // reconstructs the curated SKILL.md from the registry.
        cloned = await extractSkillMdOnly(tmpDir);
        if (!cloned) {
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          await fs.mkdir(tmpDir, { recursive: true });
        }
      } catch {
        // Git clone failed — fall through to content endpoint / reconstruction
      }
    }

    if (!cloned) {
      // Try the /content endpoint for full SKILL.md (frontmatter + complete body)
      const contentUrl = `${skill.url}/content`;
      const contentRes = await fetch(contentUrl).catch(() => null);
      if (contentRes && contentRes.ok) {
        const skillMd = await contentRes.text();
        await fs.writeFile(path.join(tmpDir, 'SKILL.md'), skillMd, 'utf-8');
      } else {
        // Last resort: reconstruct from metadata JSON
        const skillMd = buildSkillMd(data);
        await fs.writeFile(path.join(tmpDir, 'SKILL.md'), skillMd, 'utf-8');
      }
    }
  }

  // Validate that the download produced at least one file
  const entries = await fs.readdir(tmpDir);
  const meaningful = entries.filter((e) => e !== '.git');
  if (meaningful.length === 0) {
    throw new Error(`Download produced no files for skill "${skill.name}"`);
  }

  return tmpDir;
}

/**
 * If the directory tree contains a SKILL.md, replace the directory contents
 * with just that file (shallowest match wins). Returns true when a SKILL.md
 * was found and extracted, false when the tree has none (dir left untouched).
 */
async function extractSkillMdOnly(dir: string): Promise<boolean> {
  const found: string[] = [];
  async function walk(d: string, depth: number): Promise<void> {
    if (depth > 4) return;
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p, depth + 1);
      else if (e.name === 'SKILL.md') found.push(p);
    }
  }
  await walk(dir, 0);
  if (found.length === 0) return false;

  // Shallowest path = the canonical skill file
  found.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
  const content = await fs.readFile(found[0], 'utf-8');

  // Wipe the clone, keep only SKILL.md
  const entries = await fs.readdir(dir);
  for (const e of entries) {
    await fs.rm(path.join(dir, e), { recursive: true, force: true }).catch(() => {});
  }
  await fs.writeFile(path.join(dir, 'SKILL.md'), content, 'utf-8');
  return true;
}

export async function installToAgent(
  skillDir: string,
  skillName: string,
  agent: AgentDefinition,
  overrideDir?: string,
): Promise<string> {
  const targetBase = overrideDir
    ? path.resolve(overrideDir)
    : agent.skillsDir.replace('~', os.homedir());
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

function buildSkillMd(data: Record<string, unknown>): string {
  const frontmatter: Record<string, unknown> = {};
  const fields = [
    'name', 'description', 'version', 'author', 'license',
    'tags', 'testingTypes', 'frameworks', 'languages', 'domains', 'agents',
  ];
  for (const key of fields) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      frontmatter[key] = data[key];
    }
  }

  const yamlLines: string[] = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      const quoted = value.map((v: unknown) => String(v).replace(/"/g, '\\"'));
      yamlLines.push(`${key}: [${quoted.join(', ')}]`);
    } else {
      const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      yamlLines.push(`${key}: "${escaped}"`);
    }
  }

  const body = typeof data.fullDescription === 'string' && data.fullDescription.length > 0
    ? data.fullDescription
    : `# ${data.name || 'Skill'}\n\n${data.description || ''}`;

  return `---\n${yamlLines.join('\n')}\n---\n\n${body}\n`;
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
