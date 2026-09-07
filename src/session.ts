import type { Axis } from './settings';

export type Phase = 'setup' | 'running' | 'paused' | 'rotating' | 'complete';
export interface Exercise { count: number; seconds: number; axis: Axis }
export interface Session {
  phase: Phase; exercise: Exercise; index: number; angle: number; remaining: number;
  deadline: number; turn: null | { from: number; to: number; started: number; duration: number; paused: boolean };
  completedAt: number;
}
export type Action =
  | { type: 'start'; exercise: Exercise; now: number }
  | { type: 'tick'; now: number }
  | { type: 'move'; delta: -1 | 1; now: number; duration: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'hide'; now: number }
  | { type: 'exit' };
export const TURN_MS = 500;
export function initialSession(): Session {
  return { phase: 'setup', exercise: { count: 12, seconds: 30, axis: 'Y' }, index: 0,
    angle: 0, remaining: 30, deadline: 0, turn: null, completedAt: 0 };
}
export function targetAngle(index: number, count: number) { return index * Math.PI * 2 / count; }
export function sessionReducer(s: Session, a: Action, turnDuration = TURN_MS): Session {
  switch (a.type) {
    case 'start': return { ...initialSession(), exercise: { ...a.exercise }, phase: 'running',
      remaining: a.exercise.seconds, deadline: a.now + a.exercise.seconds * 1000 };
    case 'exit': return initialSession();
    case 'move': {
      if (s.phase !== 'running' && s.phase !== 'paused') return s;
      const index = s.index + a.delta;
      if (index < 0) return s;
      if (index >= s.exercise.count) return { ...s, phase: 'complete', remaining: 0, completedAt: a.now, turn: null };
      const to = targetAngle(index, s.exercise.count);
      if (a.duration === 0) return { ...s, index, angle: to, remaining: s.exercise.seconds,
        deadline: a.now + s.exercise.seconds * 1000 };
      return { ...s, index, phase: 'rotating', remaining: s.exercise.seconds,
        turn: { from: s.angle, to, started: a.now, duration: a.duration, paused: s.phase === 'paused' } };
    }
    case 'tick': {
      if (s.phase === 'running') {
        const remaining = Math.max(0, (s.deadline - a.now) / 1000);
        if (remaining === 0) return sessionReducer(s, { type: 'move', delta: 1, now: a.now, duration: turnDuration });
        return { ...s, remaining };
      }
      if (s.phase === 'rotating' && s.turn) {
        const t = Math.min(1, Math.max(0, (a.now - s.turn.started) / s.turn.duration));
        if (t === 1) return { ...s, phase: s.turn.paused ? 'paused' : 'running', angle: s.turn.to,
          deadline: a.now + s.exercise.seconds * 1000, turn: null };
        return { ...s, angle: s.turn.from + (s.turn.to - s.turn.from) * t * t * (3 - 2 * t) };
      }
      return s;
    }
    case 'pause': return s.phase === 'running' ? { ...s, phase: 'paused', remaining: Math.max(0, (s.deadline - a.now) / 1000) } : s;
    case 'resume': return s.phase === 'paused' ? { ...s, phase: 'running', deadline: a.now + s.remaining * 1000 } : s;
    case 'hide': {
      if (s.phase === 'rotating' && s.turn) return { ...s, phase: 'paused', angle: s.turn.to, turn: null };
      return sessionReducer(s, { type: 'pause', now: a.now });
    }
  }
}
