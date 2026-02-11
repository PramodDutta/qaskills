import { AGENTS } from '@qaskills/shared';

export function AgentMarquee() {
  const agents = AGENTS.slice(0, 20);

  return (
    <div className="relative overflow-hidden py-6">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

      <div className="flex animate-marquee hover:[animation-play-state:paused] w-max gap-4">
        {[...agents, ...agents].map((agent, i) => (
          <span
            key={`${agent.id}-${i}`}
            className="inline-flex shrink-0 items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground"
          >
            {agent.name}
          </span>
        ))}
      </div>
    </div>
  );
}
