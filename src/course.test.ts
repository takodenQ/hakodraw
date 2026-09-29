import { describe, expect, it } from 'vitest';
import { COURSE, completedStepIds, nextStep, planFor, quickPlan } from './course';
import { connectionById } from './connections';
import { SHAPES } from './shapes';
import type { PracticeLog } from './progress';

const log = (patch: Partial<PracticeLog>): PracticeLog =>
  ({ id: 'x', at: new Date().toISOString(), mode: 'rotation', label: '', count: 5, seconds: 45, done: 5, completed: true, ...patch });

describe('course definition', () => {
  it('has unique steps that point at real shapes and connections', () => {
    expect(new Set(COURSE.map(step => step.id)).size).toBe(COURSE.length);
    for (const step of COURSE) {
      if (step.mode === 'rotation') expect(SHAPES.some(shape => shape.id === step.shape)).toBe(true);
      if (step.mode === 'connection') expect(connectionById(step.connectionId).id).toBe(step.connectionId);
      expect(step.count).toBeGreaterThanOrEqual(1);
      expect(step.aim.length).toBeGreaterThan(0);
      expect(step.tip.length).toBeGreaterThan(0);
    }
  });
});

describe('recommendation', () => {
  it('starts at the first step and advances when a step is completed', () => {
    expect(nextStep([])!.id).toBe(COURSE[0].id);
    expect(nextStep([log({ stepId: COURSE[0].id })])!.id).toBe(COURSE[1].id);
  });
  it('ignores unfinished runs and skips steps that are already done', () => {
    expect(nextStep([log({ stepId: COURSE[0].id, completed: false })])!.id).toBe(COURSE[0].id);
    expect(nextStep([log({ stepId: COURSE[1].id })])!.id).toBe(COURSE[0].id);
    expect(completedStepIds([log({ stepId: 'a' }), log({})])).toEqual(new Set(['a']));
  });
  it('is undefined after the whole course', () => {
    expect(nextStep(COURSE.map(step => log({ stepId: step.id })))).toBeUndefined();
  });
});

describe('plan adjustment', () => {
  const step = COURSE[0];
  it('keeps the planned amount without feedback', () => {
    expect(planFor(step, [])).toMatchObject({ count: step.count, seconds: step.seconds, note: '' });
  });
  it('gives more time after a hard session and more questions after an easy one', () => {
    const hard = planFor(step, [log({ feeling: 'hard' })]);
    expect(hard.seconds).toBeGreaterThan(step.seconds);
    expect(hard.count).toBeLessThan(step.count);
    expect(hard.note).not.toBe('');
    expect(planFor(step, [log({ feeling: 'easy' })]).count).toBe(step.count + 2);
  });
  it('uses only the latest feeling', () => {
    expect(planFor(step, [log({ feeling: 'hard' }), log({ feeling: 'ok' })]).seconds).toBe(step.seconds);
  });
  it('keeps the quick plan tiny', () => {
    expect(quickPlan(step)).toMatchObject({ count: 2, seconds: 30 });
  });
});
