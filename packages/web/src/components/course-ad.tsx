// Reusable, SEO-safe course promo. Server component (no client JS, no layout
// shift). All outbound links are rel="sponsored nofollow": these are paid,
// commercial promos to an external domain, so they must NOT pass PageRank.
//
// Usage:
//   <CourseAd course="auto" variant="sidebar" slot="skill-sidebar" ctx={{ frameworks }} />
//   <CourseAd course="auto" variant="inline"  slot="blog-mid"      ctx={{ category, title }} />
//   <CourseAd course="playwright" variant="inline" slot="blog-end" />

import { COURSES, courseUrl, pickCourse, type CourseId } from '@/lib/courses';

type CourseCtx = Parameters<typeof pickCourse>[0];

interface CourseAdProps {
  course?: CourseId | 'auto';
  variant?: 'sidebar' | 'inline';
  slot: string;
  ctx?: CourseCtx;
}

const ACCENTS = {
  blue: {
    wrap: 'border-blue-500/30 bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:border-blue-500/25 dark:from-blue-950/20 dark:to-indigo-950/10',
    icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    label: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  emerald: {
    wrap: 'border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:border-emerald-500/25 dark:from-emerald-950/20 dark:to-teal-950/10',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
} as const;

export function CourseAd({ course = 'auto', variant = 'inline', slot, ctx }: CourseAdProps) {
  const id: CourseId = course === 'auto' ? pickCourse(ctx ?? {}) : course;
  const c = COURSES[id];
  const a = ACCENTS[c.accent];
  const href = courseUrl(id, slot);

  const rel = 'sponsored nofollow noopener noreferrer';

  if (variant === 'sidebar') {
    return (
      <div className={`rounded-xl border p-5 ${a.wrap}`}>
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${a.label}`}>
          {c.label}
        </span>
        <div className="mt-2 flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${a.icon}`}
            aria-hidden="true"
          >
            {c.emoji}
          </span>
          <h3 className="text-base font-bold leading-tight text-foreground">{c.title}</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{c.tagline}</p>
        <ul className="mt-3 space-y-1.5">
          {c.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className={a.label} aria-hidden="true">
                &#10003;
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${a.badge}`}>
            {c.cohort}
          </span>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${a.badge}`}>
            {c.discount}
          </span>
        </div>
        <a
          href={href}
          target="_blank"
          rel={rel}
          className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${a.btn}`}
        >
          Enroll now &rarr;
        </a>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Use code <span className="font-mono font-semibold">{c.code}</span> at checkout
        </p>
      </div>
    );
  }

  // inline (blog end + mid)
  return (
    <aside
      className={`my-10 flex flex-col gap-4 rounded-xl border p-6 sm:flex-row sm:items-center ${a.wrap}`}
      aria-label="Sponsored course"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${a.icon}`}
        aria-hidden="true"
      >
        {c.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${a.label}`}>
          {c.label} &middot; The Testing Academy
        </span>
        <h3 className="mt-0.5 text-lg font-bold leading-tight text-foreground">{c.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${a.badge}`}>
            {c.cohort}
          </span>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${a.badge}`}>
            {c.discount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Code <span className="font-mono font-semibold">{c.code}</span>
          </span>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel={rel}
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${a.btn}`}
      >
        Enroll now &rarr;
      </a>
    </aside>
  );
}
