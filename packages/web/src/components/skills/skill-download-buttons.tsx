'use client';

import { useState } from 'react';
import { FileDown, BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SkillDownloadButtonsProps {
  slug: string;
  name: string;
  version: string;
  description: string;
  agents: string[];
}

const AGENT_INSTALL_INFO: Record<string, { configFile: string; skillsDir: string }> = {
  'claude-code': { configFile: 'CLAUDE.md', skillsDir: '~/.claude/commands' },
  cursor: { configFile: '.cursorrules', skillsDir: '.cursor/rules' },
  'github-copilot': { configFile: '.github/copilot-instructions.md', skillsDir: '.github/copilot-instructions' },
  windsurf: { configFile: '.windsurfrules', skillsDir: '.windsurf/rules' },
  codex: { configFile: 'AGENTS.md', skillsDir: '~/.codex/instructions' },
  aider: { configFile: '.aider.conf.yml', skillsDir: '.aider/conventions' },
  continue: { configFile: '.continue/config.json', skillsDir: '.continue/rules' },
  cline: { configFile: '.clinerules', skillsDir: '.cline/rules' },
};

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateInstallGuide(
  slug: string,
  name: string,
  version: string,
  description: string,
  agents: string[],
): string {
  const lines: string[] = [
    `# Install Guide: ${name}`,
    '',
    `> ${description}`,
    '',
    `**Version:** ${version}`,
    '',
    '---',
    '',
    '## Quick Install (Recommended)',
    '',
    '```bash',
    `npx @qaskills/cli add ${slug}`,
    '```',
    '',
    'This auto-detects your AI agent and installs the skill in the correct location.',
    '',
    '---',
    '',
    '## Manual Install by Agent',
    '',
  ];

  const compatibleAgents = agents.length > 0 ? agents : Object.keys(AGENT_INSTALL_INFO);

  for (const agentId of compatibleAgents) {
    const info = AGENT_INSTALL_INFO[agentId];
    if (!info) continue;

    const displayName =
      agentId === 'claude-code'
        ? 'Claude Code'
        : agentId === 'github-copilot'
          ? 'GitHub Copilot'
          : agentId.charAt(0).toUpperCase() + agentId.slice(1);

    lines.push(
      `### ${displayName}`,
      '',
      `1. Download the SKILL.md file from [qaskills.sh/skills/${slug}](https://qaskills.sh/skills/${slug})`,
      `2. Copy it to your skills directory: \`${info.skillsDir}/\``,
      `3. Rename to \`${slug}.md\` (or keep as SKILL.md)`,
      '',
    );
  }

  lines.push(
    '---',
    '',
    `[View on QASkills.sh](https://qaskills.sh/skills/${slug})`,
    '',
  );

  return lines.join('\n');
}

export function SkillDownloadButtons({
  slug,
  name,
  version,
  description,
  agents,
}: SkillDownloadButtonsProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSkillMd = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(slug)}/content`);
      if (!res.ok) throw new Error('Failed to fetch');
      const content = await res.text();
      triggerDownload(`${slug}.SKILL.md`, content);
      window?.datafast?.('download_skill_md', { skill: slug });
    } catch {
      // User can retry — button returns to default state
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadGuide = () => {
    const guide = generateInstallGuide(slug, name, version, description, agents);
    triggerDownload(`${slug}-install-guide.md`, guide);
    window?.datafast?.('download_install_guide', { skill: slug });
  };

  return (
    <div className="flex gap-3 mt-4">
      <Button
        size="sm"
        onClick={handleDownloadSkillMd}
        disabled={downloading}
        className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
        data-fast-goal="download_skill_md"
        data-fast-goal-skill={slug}
      >
        <FileDown className="h-4 w-4" />
        {downloading ? 'Downloading...' : 'Download SKILL.md'}
      </Button>
      <Button
        size="sm"
        onClick={handleDownloadGuide}
        className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        data-fast-goal="download_install_guide"
        data-fast-goal-skill={slug}
      >
        <BookOpenCheck className="h-4 w-4" />
        How to Install
      </Button>
    </div>
  );
}
