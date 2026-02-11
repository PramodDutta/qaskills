import { Check, X } from 'lucide-react';
import { AGENTS } from '@qaskills/shared';

interface CompatibilityMatrixProps {
  supportedAgents: string[];
}

export function CompatibilityMatrix({ supportedAgents }: CompatibilityMatrixProps) {
  const agentList = AGENTS.slice(0, 15); // Show top 15

  return (
    <div className="rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Agent Compatibility</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {supportedAgents.length} of {AGENTS.length} agents supported
        </p>
      </div>
      <div className="divide-y divide-border">
        {agentList.map((agent) => {
          const supported = supportedAgents.includes(agent.id);
          return (
            <div key={agent.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={supported ? 'text-foreground' : 'text-muted-foreground'}>{agent.name}</span>
              {supported ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
