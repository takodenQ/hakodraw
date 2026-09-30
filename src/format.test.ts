import { expect, it } from 'vitest';
import { estimateSeconds, formatDuration } from './format';

it('estimates total time including the turn between questions', () => {
  expect(estimateSeconds(12, 30)).toBe(366);
  expect(estimateSeconds(2, 30, 0)).toBe(60);
});
it('formats durations in natural Japanese', () => {
  expect(formatDuration(0)).toBe('約1秒');
  expect(formatDuration(45)).toBe('約45秒');
  expect(formatDuration(366)).toBe('約6分');
  expect(formatDuration(3600)).toBe('約1時間');
  expect(formatDuration(5400)).toBe('約1時間30分');
});
