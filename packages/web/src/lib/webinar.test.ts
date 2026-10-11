import { describe, expect, it } from 'vitest';
import {
  IST,
  WEBINAR,
  WEBINAR_HOOKS,
  currentWebinarSession,
  formatClock,
  formatCountdown,
  formatDay,
  localTimeHint,
  pickHook,
  sectionFromPath,
  webinarUrl,
} from './webinar';

const at = (iso: string) => Date.parse(iso);

describe('currentWebinarSession', () => {
  it('promotes the next session that has not finished', () => {
    const session = currentWebinarSession(at('2026-10-11T12:00:00Z'), { timeZone: IST });
    expect(session?.start).toBe(at('2026-10-13T14:30:00Z'));
    expect(session?.state).toBe('upcoming');
    expect(session?.remaining).toBe(4);
  });

  it('says tomorrow, then today with a countdown', () => {
    // 12 Oct, 9 PM IST: the 13 Oct session is tomorrow.
    expect(currentWebinarSession(at('2026-10-12T15:30:00Z'), { timeZone: IST })?.state).toBe(
      'tomorrow',
    );
    // 13 Oct, 10 AM IST: today, ten hours out.
    const today = currentWebinarSession(at('2026-10-13T04:30:00Z'), { timeZone: IST });
    expect(today?.state).toBe('today');
    expect(today?.minutesToStart).toBe(600);
  });

  it('judges today and tomorrow on the visitor calendar, not IST', () => {
    // 01:00 UTC on 13 Oct is 6:30 AM in India but still 9 PM on 12 Oct in New York.
    const now = at('2026-10-13T01:00:00Z');
    expect(currentWebinarSession(now, { timeZone: IST })?.state).toBe('today');
    expect(currentWebinarSession(now, { timeZone: 'America/New_York' })?.state).toBe('tomorrow');
  });

  it('stays live through the live window, then moves to the next session', () => {
    expect(currentWebinarSession(at('2026-10-13T15:00:00Z'), { timeZone: IST })?.state).toBe(
      'live',
    );
    const next = currentWebinarSession(at('2026-10-13T16:31:00Z'), { timeZone: IST });
    expect(next?.start).toBe(at('2026-10-17T14:30:00Z'));
    expect(next?.state).toBe('upcoming');
  });

  it('disappears after the last session ends, or when switched off', () => {
    expect(currentWebinarSession(at('2026-10-27T16:31:00Z'))).toBeNull();
    expect(
      currentWebinarSession(at('2026-10-11T12:00:00Z'), {
        config: { ...WEBINAR, enabled: false },
      }),
    ).toBeNull();
  });
});

describe('formatting', () => {
  const start = at('2026-10-13T14:30:00Z');

  it('formats the session in IST', () => {
    expect(formatDay(start, IST)).toBe('Tue 13 Oct');
    expect(formatClock(start, IST)).toBe('8 PM');
  });

  it('adds a local-time hint only for visitors outside India', () => {
    expect(localTimeHint(start, 'America/New_York')).toBe('Tue 10:30 AM your time');
    expect(localTimeHint(start, IST)).toBeNull();
    expect(localTimeHint(start, 'Asia/Calcutta')).toBeNull();
    expect(localTimeHint(start, undefined)).toBeNull();
  });

  it('formats countdowns', () => {
    expect(formatCountdown(45)).toBe('45 min');
    expect(formatCountdown(200)).toBe('3h 20m');
    expect(formatCountdown(0)).toBe('1 min');
  });
});

describe('webinarUrl', () => {
  it('carries all five UTM fields to the join link', () => {
    const url = new URL(
      webinarUrl({ medium: 'top-banner', term: 'blog', content: '43-ai-will-not-replace-you' }),
    );
    expect(`${url.origin}${url.pathname}`).toBe('https://sdet.live/webinar');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'qaskills',
      utm_medium: 'top-banner',
      utm_campaign: WEBINAR.campaign,
      utm_term: 'blog',
      utm_content: '43-ai-will-not-replace-you',
    });
  });
});

describe('sectionFromPath', () => {
  it('maps a path to its site section for utm_term', () => {
    expect(sectionFromPath('/')).toBe('home');
    expect(sectionFromPath(null)).toBe('home');
    expect(sectionFromPath('/blog/some-post')).toBe('blog');
    expect(sectionFromPath('/skills/thetestingacademy/playwright-e2e')).toBe('skills');
    expect(sectionFromPath('/Agents/claude-code')).toBe('agents');
  });
});

describe('hooks', () => {
  it('keeps a returning visitor on the same hook', () => {
    expect(pickHook('46-where-are-you-L0-to-L5', 0.99).id).toBe('46-where-are-you-L0-to-L5');
  });

  it('assigns a new or unknown visitor by the random draw', () => {
    expect(pickHook(null, 0).id).toBe(WEBINAR_HOOKS[0].id);
    expect(pickHook('retired-hook', 0.999).id).toBe(WEBINAR_HOOKS[WEBINAR_HOOKS.length - 1].id);
  });

  it('has unique ids and copy that fits the bar', () => {
    const ids = WEBINAR_HOOKS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of WEBINAR_HOOKS) {
      expect(h.short.length, h.id).toBeLessThanOrEqual(52);
      expect(`${h.lead} ${h.punch}`.length, h.id).toBeLessThanOrEqual(90);
      expect(`${h.lead}${h.punch}${h.short}`, h.id).not.toMatch(/\u2014/);
    }
  });
});
