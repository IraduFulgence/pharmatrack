import { describe, it, expect } from 'vitest';
import { ageOn, birthYearFromRwandanNid, birthdayAtAge, isRealDate, todayIso } from './age.js';

describe('age helpers', () => {
  it('counts completed years on calendar dates', () => {
    expect(ageOn('2008-11-26', '2026-11-26')).toBe(18);
    expect(ageOn('2008-11-27', '2026-11-26')).toBe(17);
    expect(ageOn('2008-12-01', '2026-11-30')).toBe(17);
  });

  it('treats 29 February birthdays as 1 March in non-leap years', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
    expect(birthdayAtAge('2008-02-29', 18)).toBe('2026-03-01');
    expect(birthdayAtAge('2008-02-29', 20)).toBe('2028-02-29');
  });

  it('uses the Rwanda date, not the server date', () => {
    // 23:30 UTC on 25 Nov is already 26 Nov in Kigali (UTC+2).
    expect(todayIso('Africa/Kigali', new Date('2026-11-25T23:30:00Z'))).toBe('2026-11-26');
  });

  it('rejects impossible dates', () => {
    expect(isRealDate('2001-02-30')).toBe(false);
    expect(isRealDate('2000-02-29')).toBe(true);
  });

  it('reads the birth year from a Rwandan National ID', () => {
    expect(birthYearFromRwandanNid('1199080012345012')).toBe(1990);
    expect(birthYearFromRwandanNid('1234567890123456')).toBe(null); // year 2345: not a real layout
    expect(birthYearFromRwandanNid(null)).toBe(null);
  });
});
