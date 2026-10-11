// Live webinar invite rendered in the site-wide top bar by
// components/layout/webinar-banner.tsx. While any session below is upcoming or
// live, the webinar takes the top slot and the course PromoBanner steps aside;
// once the last session ends, the course banner comes back on its own.
//
// Switch off: set `enabled` to false.
// New batch: replace `sessions` (UTC ISO strings; 8:00 PM IST is 14:30 UTC) and
// bump `campaign` so UTM reports keep the batches apart.

export const WEBINAR = {
  enabled: true,
  title: 'How to become an AI Architect, even as a manual tester or automation tester',
  joinUrl: 'https://sdet.live/webinar',
  campaign: 'ai-architect-webinar-oct26',
  sessions: [
    '2026-10-10T14:30:00Z', // Sat 10 Oct, 8 PM IST
    '2026-10-13T14:30:00Z', // Tue 13 Oct
    '2026-10-17T14:30:00Z', // Sat 17 Oct
    '2026-10-20T14:30:00Z', // Tue 20 Oct
    '2026-10-23T14:30:00Z', // Fri 23 Oct
    '2026-10-27T14:30:00Z', // Tue 27 Oct
  ],
  // A session stays "live now" (and joinable) for this long after it starts.
  liveMinutes: 120,
};

export type WebinarConfig = typeof WEBINAR;

export interface WebinarHook {
  id: string; // sent as utm_content; matches the ad creative file name
  lead: string;
  punch: string;
  short: string; // narrow screens, at most two lines
  accent: 'violet' | 'emerald' | 'rose';
}

// Copy lifted from the AI-batch ad creatives. Each visitor keeps one hook, so
// clicks per utm_content compare the hooks cleanly.
export const WEBINAR_HOOKS: WebinarHook[] = [
  {
    id: '43-ai-will-not-replace-you',
    lead: 'AI will not replace you.',
    punch: 'The person who knows AI will.',
    short: "AI won't replace you. People who know AI will.",
    accent: 'violet',
  },
  {
    id: '44-only-3-of-10-qa-remain-2027',
    lead: 'Only 3 of 10 QA will remain in 2027.',
    punch: 'All 3 know AI.',
    short: 'Only 3 of 10 QA will remain in 2027. All 3 know AI.',
    accent: 'emerald',
  },
  {
    id: '45-someone-on-your-team-is-building-it',
    lead: 'Someone on your team is building an AI agent.',
    punch: 'They will show your manager first.',
    short: 'Someone on your team is building AI agents. Are you?',
    accent: 'violet',
  },
  {
    id: '46-where-are-you-L0-to-L5',
    lead: 'Where are you on the AI ladder?',
    punch: 'L0 prompting to L5 AI architect.',
    short: 'L0 prompting to L5 AI architect. Where are you?',
    accent: 'violet',
  },
  {
    id: '48-hiring-now-ai-plus-automation',
    lead: 'Hiring now: QA who know AI + automation.',
    punch: 'Manual only: not shortlisted.',
    short: 'Hiring now: QA who know AI + automation.',
    accent: 'rose',
  },
  {
    id: '52-i-hear-this-every-week',
    lead: '"15 years in manual testing, no idea what MCP or RAG is."',
    punch: 'Start at L0. No code. 90 days.',
    short: 'Manual tester? Start at L0. No code. 90 days.',
    accent: 'emerald',
  },
];

export const IST = 'Asia/Kolkata';

export type WebinarState = 'upcoming' | 'tomorrow' | 'today' | 'live';

export interface WebinarSession {
  start: number;
  index: number;
  remaining: number; // sessions after this one
  state: WebinarState;
  minutesToStart: number;
}

function dayKey(ts: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts));
}

/**
 * The session to promote at `now`: the first one that has not finished.
 * "Today" and "tomorrow" follow the visitor's own calendar (`timeZone`),
 * so a US visitor the evening before is told "tomorrow", not "today".
 */
export function currentWebinarSession(
  now: number,
  opts: { timeZone?: string; config?: WebinarConfig } = {},
): WebinarSession | null {
  const config = opts.config ?? WEBINAR;
  if (!config.enabled) return null;

  const starts = config.sessions
    .map((s) => Date.parse(s))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    if (now >= start + config.liveMinutes * 60_000) continue;

    let state: WebinarState = 'upcoming';
    if (now >= start) state = 'live';
    else if (dayKey(now, opts.timeZone) === dayKey(start, opts.timeZone)) state = 'today';
    else if (dayKey(now + 86_400_000, opts.timeZone) === dayKey(start, opts.timeZone)) {
      state = 'tomorrow';
    }

    return {
      start,
      index: i,
      remaining: starts.length - i - 1,
      state,
      minutesToStart: Math.max(0, Math.ceil((start - now) / 60_000)),
    };
  }
  return null;
}

function part(ts: number, timeZone: string | undefined, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...opts }).formatToParts(new Date(ts));
}

/** "8 PM" or "10:30 AM" in the given zone. */
export function formatClock(ts: number, timeZone?: string): string {
  const p = part(ts, timeZone, { hour: 'numeric', minute: '2-digit', hour12: true });
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? '';
  const period = get('dayPeriod').toUpperCase();
  return get('minute') === '00' ? `${get('hour')} ${period}` : `${get('hour')}:${get('minute')} ${period}`;
}

/** "Tue 13 Oct" in the given zone. */
export function formatDay(ts: number, timeZone?: string): string {
  const p = part(ts, timeZone, { weekday: 'short', day: 'numeric', month: 'short' });
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month')}`;
}

/** "Tue 10:30 AM your time" for visitors outside India, otherwise null. */
export function localTimeHint(ts: number, timeZone: string | undefined): string | null {
  if (!timeZone || timeZone === IST || timeZone === 'Asia/Calcutta') return null;
  const weekday = part(ts, timeZone, { weekday: 'short' }).find((x) => x.type === 'weekday');
  return `${weekday?.value ?? ''} ${formatClock(ts, timeZone)} your time`.trim();
}

/** "45 min" or "3h 20m". */
export function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Site section for utm_term: "/" -> "home", "/blog/x" -> "blog". */
export function sectionFromPath(pathname: string | null | undefined): string {
  const first = (pathname ?? '').split('/').filter(Boolean)[0] ?? '';
  const clean = first.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return clean || 'home';
}

/** Join link carrying all five UTM fields. */
export function webinarUrl(
  params: { medium: string; term: string; content: string },
  config: WebinarConfig = WEBINAR,
): string {
  const qs = new URLSearchParams({
    utm_source: 'qaskills',
    utm_medium: params.medium,
    utm_campaign: config.campaign,
    utm_term: params.term,
    utm_content: params.content,
  });
  return `${config.joinUrl}?${qs.toString()}`;
}

/** Keep a returning visitor's hook; otherwise pick one from `random` in [0, 1). */
export function pickHook(storedId: string | null, random: number): WebinarHook {
  const kept = WEBINAR_HOOKS.find((h) => h.id === storedId);
  if (kept) return kept;
  const i = Math.min(WEBINAR_HOOKS.length - 1, Math.floor(random * WEBINAR_HOOKS.length));
  return WEBINAR_HOOKS[i];
}
