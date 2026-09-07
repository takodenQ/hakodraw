import { expect, it } from 'vitest';
import { DEFAULTS, parseSettings } from './settings';
it('rejects corrupt and out-of-range preferences without losing valid fields', () => {
  expect(parseSettings(null)).toEqual(DEFAULTS);
  expect(parseSettings({ count: 2.5, seconds: -1, axis: 'bad', grid: 5, localAxes: 'false', theme: 'pink' })).toEqual(DEFAULTS);
  expect(parseSettings({ count: 24, seconds: 10, grid: 0, localAxes: false, theme: 'dark', axis: 'X' })).toEqual({ count: 24, seconds: 10, grid: 0, localAxes: false, theme: 'dark', axis: 'X' });
});
