// Wording shared by the in-content webinar placements (cards and exit invite).
// Pure, so it is unit-tested without a browser. The import is relative because
// vitest in this package has no '@/' alias.

import {
  IST,
  WEBINAR,
  formatClock,
  formatCountdown,
  formatDay,
  localTimeHint,
  type WebinarConfig,
  type WebinarSession,
} from '../../lib/webinar';

export interface WebinarCopy {
  badge: string;
  hot: boolean; // live or today: the badge turns red
  when: string;
  hint: string | null; // the start in the visitor's own zone, outside India
  cta: string;
  moreDates: string;
}

export function webinarCopy(
  session: WebinarSession,
  timeZone: string | undefined,
  config: WebinarConfig = WEBINAR,
): WebinarCopy {
  const clock = `${formatClock(session.start, IST)} IST`;
  const later = config.sessions
    .map((s) => Date.parse(s))
    .filter((t) => !Number.isNaN(t) && t > session.start)
    .sort((a, b) => a - b)
    .map((t) => formatDay(t, IST));
  const moreDates = later.length ? `More dates: ${later.join(' · ')}` : 'Last session of this batch';
  const hint = localTimeHint(session.start, timeZone);

  switch (session.state) {
    case 'live':
      return {
        badge: 'Live now',
        hot: true,
        when: `Started at ${clock}. Join now.`,
        hint: null,
        cta: 'Join live',
        moreDates,
      };
    case 'today':
      return {
        badge: 'Today',
        hot: true,
        when: `Today, ${clock} · starts in ${formatCountdown(session.minutesToStart)}`,
        hint,
        cta: 'Save your seat',
        moreDates,
      };
    case 'tomorrow':
      return {
        badge: 'Tomorrow',
        hot: false,
        when: `Tomorrow, ${clock}`,
        hint,
        cta: 'Save your seat',
        moreDates,
      };
    default:
      return {
        badge: 'Upcoming',
        hot: false,
        when: `${formatDay(session.start, IST)}, ${clock}`,
        hint,
        cta: 'Save your seat',
        moreDates,
      };
  }
}
