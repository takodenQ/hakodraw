import { describe, expect, it } from 'vitest';
import { addLog, calendar, currentStreak, daysThisWeek, emptyProgress, parseProgress, practicedToday, setFeeling, totalMinutes, MAX_LOGS, type PracticeLog } from './progress';

// 2026-09-30 は水曜日。時刻は昼にして、どのタイムゾーンでも同じ暦日になるようにする。
const day = (offset: number, hour = 12) => new Date(2026, 8, 30 + offset, hour);
const today = day(0);
let n = 0;
const log = (offset: number, patch: Partial<PracticeLog> = {}): PracticeLog =>
  ({ id: `log-${n++}`, at: day(offset).toISOString(), mode: 'rotation', label: '正方形の回転', count: 6, seconds: 60, done: 6, completed: true, ...patch });

describe('practice days', () => {
  it('counts distinct days in the current Monday-start week', () => {
    // 月曜(-2)・火曜(-1)は今週、前の日曜(-3)は先週。同じ日の2回は1日と数える。
    const logs = [log(-3), log(-2), log(-2, { id: 'again' }), log(-1)];
    expect(daysThisWeek(logs, today)).toBe(2);
    expect(daysThisWeek([log(-3)], today)).toBe(0);
  });
  it('detects whether today has been practiced', () => {
    expect(practicedToday([log(-1)], today)).toBe(false);
    expect(practicedToday([log(0)], today)).toBe(true);
  });
  it('sums practiced minutes from finished questions only', () => {
    expect(totalMinutes([log(0, { done: 6, seconds: 60 }), log(-1, { done: 3, seconds: 60, completed: false })])).toBe(9);
  });
});

describe('streak', () => {
  it('is zero without recent practice', () => {
    expect(currentStreak([], today)).toBe(0);
    expect(currentStreak([log(-4)], today)).toBe(0);
  });
  it('forgives one rest day but not two', () => {
    expect(currentStreak([log(0), log(-1), log(-3)], today)).toBe(3);
    expect(currentStreak([log(0), log(-3)], today)).toBe(1);
  });
  it('stays alive today if yesterday or the day before was practiced', () => {
    expect(currentStreak([log(-1)], today)).toBe(1);
    expect(currentStreak([log(-2)], today)).toBe(1);
  });
});

describe('calendar', () => {
  it('ends on the current week and marks practiced days and today', () => {
    const cells = calendar([log(0), log(-8)], today, 5);
    expect(cells).toHaveLength(35);
    expect(cells[0].date.getDay()).toBe(1);
    expect(cells.filter(c => c.today)).toHaveLength(1);
    expect(cells.find(c => c.today)!.practiced).toBe(true);
    expect(cells.filter(c => c.practiced)).toHaveLength(2);
    expect(cells.at(-1)!.future).toBe(true);
  });
});

describe('storage', () => {
  it('keeps valid logs and repairs the rest', () => {
    const good = log(0, { stepId: 'square', feeling: 'ok' });
    const parsed = parseProgress({ logs: [good, { ...good, mode: 'other' }, { ...good, count: 0 }, 'x', null, { ...good, at: 'nope' }], goal: 99, onboarded: 'yes' });
    expect(parsed.logs).toEqual([good]);
    expect(parsed.goal).toBe(3);
    expect(parsed.onboarded).toBe(false);
    expect(parseProgress(undefined)).toEqual(emptyProgress());
    expect(parseProgress({ goal: 5, onboarded: true })).toMatchObject({ goal: 5, onboarded: true });
  });
  it('keeps earned achievements and seen ids, dropping malformed entries', () => {
    const at = new Date().toISOString();
    const parsed = parseProgress({ earned: { 'sessions-1': at, bad: 'not a date', other: 5 }, seen: ['sessions-1', 3, 'sessions-1', null] });
    expect(parsed.earned).toEqual({ 'sessions-1': at });
    expect(parsed.seen).toEqual(['sessions-1']);
    expect(parseProgress({ earned: ['x'], seen: 'x' })).toMatchObject({ earned: {}, seen: [] });
  });
  it('drops an unknown feeling but keeps the log', () => {
    expect(parseProgress({ logs: [{ ...log(0), feeling: 'great' }] }).logs[0].feeling).toBeUndefined();
  });
  it('caps stored logs and updates feelings immutably', () => {
    let progress = emptyProgress();
    for (let i = 0; i < MAX_LOGS + 5; i++) progress = addLog(progress, log(0, { id: `id-${i}` }));
    expect(progress.logs).toHaveLength(MAX_LOGS);
    expect(progress.logs[0].id).toBe('id-5');
    const rated = setFeeling(progress, 'id-10', 'hard');
    expect(rated.logs.find(l => l.id === 'id-10')!.feeling).toBe('hard');
    expect(progress.logs.find(l => l.id === 'id-10')!.feeling).toBeUndefined();
  });
});
