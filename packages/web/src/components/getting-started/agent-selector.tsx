'use client';

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { AGENTS } from '@qaskills/shared';
import { cn } from '@/lib/utils';

const topAgents = AGENTS.slice(0, 10);

interface AgentSelectorProps {
  selectedSkill: string;
}

export function AgentSelector({ selectedSkill }: AgentSelectorProps) {
  const [selectedAgent, setSelectedAgent] = useState(topAgents[0]);
  const [copied, setCopied] = useState(false);

  const command = `npx qaskills add ${selectedSkill}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Agent grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {topAgents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={cn(
              'rounded-lg border px-3 py-3 text-sm font-medium transition-all duration-200 text-left',
              selectedAgent.id === agent.id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {agent.name}
          </button>
        ))}
      </div>

      {/* Agent details */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-medium">{selectedAgent.name}</span>
          <span className="text-xs text-muted-foreground">— {selectedAgent.description}</span>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Config directory:</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {selectedAgent.configDir}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Skills file:</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {selectedAgent.configFile}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Install method:</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {selectedAgent.installMethod}
            </code>
          </div>
        </div>
      </div>

      {/* Install command */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm flex-1">
          <Terminal className="h-4 w-4 text-primary shrink-0" />
          <code className="truncate">{command}</code>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Copy install command"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
