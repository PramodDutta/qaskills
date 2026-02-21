'use client';

import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

const SKILLS = [
  'playwright-e2e',
  'selenium-advance-pom',
  'jest-unit',
  'k6-performance',
  'owasp-security',
  'cypress-e2e',
];

const BASE_COMMAND = 'npx @qaskills/cli add ';
const TYPING_SPEED = 50;
const DELETING_SPEED = 30;
const PAUSE_DURATION = 2500;
const WAIT_DURATION = 300;

type Phase = 'typing' | 'paused' | 'deleting' | 'waiting';

export function HeroTerminal() {
  const [copied, setCopied] = useState(false);
  const [skillIndex, setSkillIndex] = useState(0);
  const [displayedSlug, setDisplayedSlug] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');

  const currentSlug = SKILLS[skillIndex];

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    switch (phase) {
      case 'typing': {
        if (displayedSlug.length < currentSlug.length) {
          timeout = setTimeout(() => {
            setDisplayedSlug(currentSlug.slice(0, displayedSlug.length + 1));
          }, TYPING_SPEED);
        } else {
          setPhase('paused');
        }
        break;
      }
      case 'paused': {
        timeout = setTimeout(() => setPhase('deleting'), PAUSE_DURATION);
        break;
      }
      case 'deleting': {
        if (displayedSlug.length > 0) {
          timeout = setTimeout(() => {
            setDisplayedSlug(displayedSlug.slice(0, -1));
          }, DELETING_SPEED);
        } else {
          setPhase('waiting');
        }
        break;
      }
      case 'waiting': {
        timeout = setTimeout(() => {
          setSkillIndex((prev) => (prev + 1) % SKILLS.length);
          setDisplayedSlug('');
          setPhase('typing');
        }, WAIT_DURATION);
        break;
      }
    }

    return () => clearTimeout(timeout);
  }, [phase, displayedSlug, currentSlug]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${BASE_COMMAND}${currentSlug}`);
      setCopied(true);
      window?.datafast?.('copy_hero_command');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable or permission denied
    }
  };

  const showBlinkingCursor = phase === 'paused';

  return (
    <div className="mx-auto max-w-xl animate-glow rounded-xl border border-border bg-card shadow-lg">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/20" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/20" />
          <span className="h-3 w-3 rounded-full bg-green-500/20" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">terminal</span>
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
        <div>
          <span className="text-green-400">$</span>{' '}
          <span className="text-foreground">{BASE_COMMAND}</span>
          <span className="text-foreground">{displayedSlug}</span>
          <span className={`${showBlinkingCursor ? 'animate-blink' : ''} text-primary ml-0.5`}>
            |
          </span>
        </div>
      </div>
      {/* Output */}
      <div className="border-t border-border/50 px-4 py-3 font-mono text-xs text-muted-foreground">
        <p>Detected agent: Claude Code</p>
        <p>Installing {currentSlug} v1.0.0...</p>
        <p className="text-green-400">Skill installed successfully!</p>
      </div>
    </div>
  );
}
