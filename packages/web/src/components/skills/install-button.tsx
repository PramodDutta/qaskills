'use client';

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallButtonProps {
  skillSlug: string;
}

export function InstallButton({ skillSlug }: InstallButtonProps) {
  const [copied, setCopied] = useState(false);
  const command = `npx @qaskills/cli add ${skillSlug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window?.datafast?.('copy_install_command', { skill: skillSlug });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm flex-1">
        <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
        <code className="truncate">{command}</code>
      </div>
      <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy install command">
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
