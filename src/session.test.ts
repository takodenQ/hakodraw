import { describe, expect, it } from 'vitest';
import { initialSession, sessionReducer as reduce, targetAngle } from './session';
const start = (count = 12, seconds = 30) => reduce(initialSession(), { type: 'start', exercise: { count, seconds, axis: 'Y' }, now: 0 });
describe('session', () => {
  it('covers one revolution without a duplicate final question', () => {
    let s = start();
    for (let i = 1; i <= 12; i++) {
      expect(s.index).toBe(i - 1);expect(s.angle).toBeCloseTo(targetAngle(i - 1, 12));
      s = reduce(s, { type: 'tick', now: s.deadline });
      if (i < 12) { expect(s.phase).toBe('rotating');s = reduce(s, { type: 'tick', now: s.turn!.started + 500 }); }
    }
    expect(s.phase).toBe('complete');expect(s.index).toBe(11);expect(s.angle).toBeCloseTo(330 * Math.PI / 180);
  });
  it('keeps a full question time after rotation, including late frames', () => {
    let s = reduce(start(), { type: 'tick', now: 30000 });
    s = reduce(s, { type: 'tick', now: 30250 });expect(s.remaining).toBe(30);expect(s.angle).toBeGreaterThan(0);
    s = reduce(s, { type: 'tick', now: 31000 });expect(s.deadline).toBe(61000);expect(s.remaining).toBe(30);
  });
  it('ignores navigation spam while rotating', () => {
    const s = reduce(start(), { type: 'move', delta: 1, now: 20, duration: 500 });
    expect(reduce(s, { type: 'move', delta: 1, now: 30, duration: 500 })).toBe(s);
  });
  it('preserves pause and supports reverse rotation', () => {
    let s = reduce(start(), { type: 'pause', now: 5000 });expect(s.remaining).toBe(25);
    s = reduce(s, { type: 'move', delta: 1, now: 6000, duration: 500 });
    s = reduce(s, { type: 'tick', now: 6500 });expect(s.phase).toBe('paused');expect(s.remaining).toBe(30);
    s = reduce(s, { type: 'move', delta: -1, now: 7000, duration: 500 });expect(s.turn!.from).toBeGreaterThan(s.turn!.to);
    s = reduce(s, { type: 'tick', now: 7500 });expect(s.angle).toBe(0);expect(s.phase).toBe('paused');
    s = reduce(s, { type: 'resume', now: 9000 });expect(s.deadline).toBe(39000);
  });
  it('pauses a hidden tab, settling an in-flight turn', () => {
    const s = reduce(start(), { type: 'move', delta: 1, now: 10, duration: 500 });
    const hidden = reduce(s, { type: 'hide', now: 200 });expect(hidden.phase).toBe('paused');expect(hidden.turn).toBe(null);expect(hidden.angle).toBe(targetAngle(1,12));
  });
  it('supports reduced motion and a one-question session', () => {
    const s = reduce(start(), { type: 'tick', now: 30000 }, 0);expect(s.phase).toBe('running');expect(s.index).toBe(1);
    expect(reduce(start(1, 1), { type: 'tick', now: 1000 }).phase).toBe('complete');
  });
  it('cannot go before the first question and exit cancels rotation', () => {
    const s = start();expect(reduce(s, { type: 'move', delta: -1, now: 10, duration: 500 })).toBe(s);
    expect(reduce(reduce(s, { type: 'move', delta: 1, now: 10, duration: 500 }), { type: 'exit' })).toEqual(initialSession());
  });
});
