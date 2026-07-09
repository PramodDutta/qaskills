'use client';

// Email-capture lead magnet. Appears once after a short delay, captures the
// email, then delivers the download links inline (and by email). Dismissal and
// conversion are remembered in localStorage so it never nags a returning user.

import { useState, useEffect, type FormEvent } from 'react';
import { X, Check, Loader2, Download, FileText, Package } from 'lucide-react';

const STORAGE_KEY = 'qaskills-lead-magnet-v1';
const SOURCE = 'claude-qa-lead-magnet';
const SHOW_DELAY_MS = 12000;

type State = 'idle' | 'loading' | 'done' | 'error';
type Downloads = { ebook: string; skillsZip: string };

function seen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function remember(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode: fine, popup just may reappear next visit */
  }
}

export function LeadMagnetPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [downloads, setDownloads] = useState<Downloads | null>(null);

  useEffect(() => {
    if (seen()) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    remember('dismissed');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/signups/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: SOURCE }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDownloads(data.downloads ?? null);
        setState('done');
        remember(`converted:${Date.now()}`);
      } else {
        setError(data.error || 'Something went wrong. Try again.');
        setState('error');
      }
    } catch {
      setError('Network error. Try again.');
      setState('error');
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Free Claude Code QA Playbook"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl sm:p-8">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {state === 'done' ? (
          <div>
            <div className="mb-3 flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Check your inbox. Grab them now too:</span>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={downloads?.ebook ?? '/lead-magnet/claude-code-qa-playbook.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <FileText className="h-4 w-4 shrink-0" />
                Download the Playbook (PDF)
                <Download className="ml-auto h-4 w-4" />
              </a>
              <a
                href={downloads?.skillsZip ?? '/lead-magnet/claude-code-qa-skills.zip'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                <Package className="h-4 w-4 shrink-0" />
                Download 5 QA skills (ZIP)
                <Download className="ml-auto h-4 w-4" />
              </a>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Install any of 400+ skills: <code className="font-mono">npx qaskills add &lt;skill&gt;</code>
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Free download
            </div>
            <h2 className="text-xl font-bold leading-tight text-foreground">
              The Claude Code QA Playbook
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              10+ QA skills to turn your AI coding agent into a disciplined QA engineer, plus a
              starter pack of 5 ready-to-install SKILL.md files. Free PDF and ZIP.
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                'Playwright E2E, unit tests, PR coverage review',
                'DeepEval LLM evals + Jira QA workflows',
                'Copy-paste prompts and real code',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <form onSubmit={submit} className="mt-4">
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === 'loading'}
                aria-label="Email address"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {state === 'error' && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={state === 'loading'}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {state === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  'Get the free playbook'
                )}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
