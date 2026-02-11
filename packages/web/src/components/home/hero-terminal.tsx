'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function HeroTerminal() {
  const [copied, setCopied] = useState(false);
  const command = 'npx qaskills add playwright-e2e';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-xl animate-glow rounded-xl border border-border bg-card shadow-lg">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/20" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/20" />
          <span className="h-3 w-3 rounded-full bg-green-500/20" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">bash</span>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy command"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      {/* Command */}
      <div className="px-4 py-5 font-mono text-sm sm:text-base">
        <span className="text-green-400">$</span>{' '}
        <span className="text-foreground">{command}</span>
        <span className="animate-blink text-primary ml-0.5">|</span>
      </div>
      {/* Output */}
      <div className="border-t border-border/50 px-4 py-3 font-mono text-xs text-muted-foreground">
        <p>✓ Detected agent: Claude Code</p>
        <p>✓ Installing playwright-e2e v1.0.0...</p>
        <p className="text-green-400">✓ Skill installed successfully!</p>
      </div>
    </div>
  );
}
