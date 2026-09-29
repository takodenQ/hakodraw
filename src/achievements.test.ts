import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, TIERS, evaluate, markSeen, mergeEarned, nearest, resolve, unseenIds, type Metric } from './achievements';
import { emptyProgress, type PracticeLog, type Progress } from './progress';

// 2026-09-28 は月曜日。offset 0〜6 が月〜日、時刻はローカル。
const time = (offset: number, hour = 12) => new Date(2026, 8, 28 + offset, hour).toISOString();
let n = 0;
const log = (offset: number, patch: Partial<PracticeLog> = {}, hour = 12): PracticeLog =>
  ({ id: `l${n++}`, at: time(offset, hour), mode: 'rotation', label: '正方形の回転', count: 6, seconds: 60, done: 6, completed: true, ...patch });
const stat = (logs: PracticeLog[], metric: Metric) => evaluate(logs).stats[metric];
const withLogs = (logs: PracticeLog[], patch: Partial<Progress> = {}): Progress => ({ ...emptyProgress(), logs, ...patch });

describe('definitions', () => {
  it('has unique ids and every rung climbs in target and never drops in tier', () => {
    expect(new Set(ACHIEVEMENTS.map(item => item.id)).size).toBe(ACHIEVEMENTS.length);
    for (const metric of new Set(ACHIEVEMENTS.map(item => item.metric))) {
      const rungs = ACHIEVEMENTS.filter(item => item.metric === metric);
      rungs.forEach((rung, i) => {
        if (!i) return;
        expect(rung.target).toBeGreaterThan(rungs[i - 1].target);
        expect(TIERS.indexOf(rung.tier)).toBeGreaterThanOrEqual(TIERS.indexOf(rungs[i - 1].tier));
      });
    }
  });
  it('offers the milestones people ask for, such as 100 sessions and 1000 drawings', () => {
    const ids = ACHIEVEMENTS.map(item => item.id);
    expect(ids).toContain('sessions-100');
    expect(ids).toContain('drawings-1000');
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
  });
});

describe('volume', () => {
  it('starts with nothing reached', () => {
    const result = evaluate([]);
    expect(result.items.every(item => !item.reached && item.current === 0)).toBe(true);
  });
  it('counts sessions, drawings and minutes, and dates each unlock by the log that reached it', () => {
    const logs = Array.from({ length: 10 }, (_, i) => log(i, { done: 6, seconds: 60 }));
    const result = evaluate(logs);
    expect(result.stats).toMatchObject({ sessions: 10, drawings: 60, minutes: 60 });
    const by = (id: string) => result.items.find(item => item.achievement.id === id)!;
    expect(by('sessions-10').reached).toBe(true);
    expect(by('sessions-10').unlockedAt).toBe(logs[9].at);
    expect(by('sessions-1').unlockedAt).toBe(logs.slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0].at);
    expect(by('drawings-100').reached).toBe(false);
    expect(by('minutes-60').reached).toBe(true);
  });
  it('counts unfinished sessions by the questions actually done', () => {
    expect(stat([log(0, { completed: false, done: 2, count: 6 })], 'drawings')).toBe(2);
  });
  it('tracks the biggest single session', () => {
    expect(stat([log(0, { done: 12, seconds: 120 }), log(1, { done: 3 })], 'bestSession')).toBe(12);
    expect(stat([log(0, { done: 12, seconds: 120 })], 'longSession')).toBe(24);
  });
});

describe('habit', () => {
  it('counts distinct days, best streak with one rest day allowed, and weeks with 3+ days', () => {
    const logs = [log(0), log(0, {}, 20), log(1), log(3), log(6), log(9)];
    const stats = evaluate(logs).stats;
    expect(stats.days).toBe(5);
    expect(stats.bestStreak).toBe(3);
    expect(stats.goalWeeks).toBe(1);
  });
  it('breaks the streak after two rest days', () => {
    expect(stat([log(0), log(3)], 'bestStreak')).toBe(1);
  });
  it('counts a perfect Monday-to-Sunday week', () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map(o => log(o));
    expect(stat(week, 'perfectWeeks')).toBe(1);
    expect(stat(week.slice(0, 6), 'perfectWeeks')).toBe(0);
    expect(stat(week, 'goalWeeks')).toBe(1);
  });
  it('celebrates coming back after a week away', () => {
    expect(stat([log(0), log(8)], 'comebacks')).toBe(1);
    expect(stat([log(0), log(7)], 'comebacks')).toBe(0);
    expect(stat([log(0), log(8), log(20)], 'comebacks')).toBe(2);
  });
  it('does not depend on the order the logs are stored in', () => {
    expect(stat([log(9), log(0), log(8)], 'comebacks')).toBe(stat([log(0), log(8), log(9)], 'comebacks'));
  });
});

describe('explore and special', () => {
  it('counts distinct course steps only when finished, and distinct kinds and modes', () => {
    const logs = [log(0, { stepId: 'square' }), log(1, { stepId: 'square' }), log(2, { stepId: 'circle', completed: false }),
      log(3, { mode: 'connection', label: '頭・首・胸郭' }), log(4, { mode: 'perspective', label: 'パース：立方体' })];
    const stats = evaluate(logs).stats;
    expect(stats.courseSteps).toBe(1);
    expect(stats.variety).toBe(3);
    expect(stats.modes).toBe(3);
  });
  it('detects early-morning and late-night sessions by local time', () => {
    const logs = [log(0, {}, 5), log(1, {}, 12), log(2, {}, 23), log(3, {}, 3), log(4, {}, 7), log(5, {}, 22)];
    expect(stat(logs, 'earlyBird')).toBe(1);
    expect(stat(logs, 'nightOwl')).toBe(3);
  });
  it('counts reflections and finished hard sessions', () => {
    const logs = [log(0, { feeling: 'hard' }), log(1, { feeling: 'hard', completed: false, done: 2 }), log(2, { feeling: 'ok' }), log(3)];
    expect(stat(logs, 'feelings')).toBe(3);
    expect(stat(logs, 'hardFinished')).toBe(1);
  });
});

describe('earned achievements', () => {
  it('records new unlocks once and leaves an unchanged state alone', () => {
    const progress = withLogs([log(0)]);
    const merged = mergeEarned(progress);
    expect(merged.earned['sessions-1']).toBe(progress.logs[0].at);
    expect(mergeEarned(merged)).toBe(merged);
  });
  it('keeps an earned achievement even if its logs are no longer stored', () => {
    const earned = { 'sessions-100': time(0) };
    const result = resolve(withLogs([], { earned }));
    const item = result.items.find(entry => entry.achievement.id === 'sessions-100')!;
    expect(item.reached).toBe(true);
    expect(item.unlockedAt).toBe(time(0));
    expect(result.items.find(entry => entry.achievement.id === 'sessions-300')!.reached).toBe(false);
  });
  it('tracks which unlocks have not been shown yet', () => {
    const merged = mergeEarned(withLogs([log(0), log(1), log(2)]));
    const unseen = unseenIds(merged);
    expect(unseen).toEqual(expect.arrayContaining(['sessions-1', 'days-3']));
    const seen = markSeen(merged, unseen);
    expect(unseenIds(seen)).toEqual([]);
    expect(markSeen(seen, unseen)).toBe(seen);
    expect(unseenIds({ ...merged, earned: { ...merged.earned, unknown: time(0) } })).not.toContain('unknown');
  });
});

describe('nearest', () => {
  it('lists unearned achievements by how close they are', () => {
    const result = evaluate(Array.from({ length: 9 }, (_, i) => log(i, { done: 1 })));
    const soon = nearest(result.items, 3);
    expect(soon[0].achievement.id).toBe('sessions-10');
    expect(soon.every(item => !item.reached)).toBe(true);
    expect(soon[0].current / soon[0].achievement.target).toBeGreaterThanOrEqual(soon[1].current / soon[1].achievement.target);
  });
});
