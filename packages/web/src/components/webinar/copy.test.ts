import { describe, expect, it } from 'vitest';
import { IST, WEBINAR, currentWebinarSession } from '../../lib/webinar';
import { webinarCopy } from './copy';

// Fixed dates so a new batch in lib/webinar.ts never breaks these tests.
const CONFIG = {
  ...WEBINAR,
  enabled: true,
  sessions: [
    '2026-10-10T14:30:00Z',
    '2026-10-13T14:30:00Z',
    '2026-10-17T14:30:00Z',
    '2026-10-27T14:30:00Z',
  ],
};

const copyAt = (iso: string, timeZone: string = IST) => {
  const session = currentWebinarSession(Date.parse(iso), { timeZone, config: CONFIG });
  if (!session) throw new Error(`no session at ${iso}`);
  return webinarCopy(session, timeZone, CONFIG);
};

describe('webinarCopy', () => {
  it('names the next date in IST and lists the later sessions', () => {
    const copy = copyAt('2026-10-11T12:00:00Z');
    expect(copy).toMatchObject({
      badge: 'Upcoming',
      hot: false,
      when: 'Tue 13 Oct, 8 PM IST',
      hint: null,
      cta: 'Save your seat',
      moreDates: 'More dates: Sat 17 Oct · Tue 27 Oct',
    });
  });

  it('says tomorrow the day before', () => {
    // 9 PM IST on 12 Oct.
    expect(copyAt('2026-10-12T15:30:00Z')).toMatchObject({
      badge: 'Tomorrow',
      hot: false,
      when: 'Tomorrow, 8 PM IST',
    });
  });

  it('counts down on the day and turns the badge red', () => {
    // 10 AM IST on 13 Oct, ten hours out.
    expect(copyAt('2026-10-13T04:30:00Z')).toMatchObject({
      badge: 'Today',
      hot: true,
      when: 'Today, 8 PM IST · starts in 10h 0m',
    });
  });

  it('switches to join-live while the session runs', () => {
    expect(copyAt('2026-10-13T15:00:00Z')).toMatchObject({
      badge: 'Live now',
      hot: true,
      when: 'Started at 8 PM IST. Join now.',
      hint: null,
      cta: 'Join live',
    });
  });

  it('gives visitors outside India the start in their own zone', () => {
    // 11:30 AM on 12 Oct in New York; the session starts at 10:30 AM there on 13 Oct.
    const copy = copyAt('2026-10-12T15:30:00Z', 'America/New_York');
    expect(copy.badge).toBe('Tomorrow');
    expect(copy.hint).toBe('Tue 10:30 AM your time');
  });

  it('marks the last session of the batch', () => {
    expect(copyAt('2026-10-27T15:00:00Z').moreDates).toBe('Last session of this batch');
  });
});
