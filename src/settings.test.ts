import { expect, it } from 'vitest';
import { DEFAULTS, parseSettings } from './settings';
it('rejects corrupt and out-of-range preferences without losing valid fields', () => {
  expect(parseSettings(null)).toEqual(DEFAULTS);
  expect(parseSettings({ count: 2.5, seconds: -1, axis: 'bad', grid: 5, localAxes: 'false', theme: 'pink' })).toEqual(DEFAULTS);
  expect(parseSettings({ count: 24, seconds: 10, grid: 0, localAxes: false, theme: 'dark', axis: 'X' })).toEqual({ opacity: 65, brightness: 75, elevation: 20, shape: 'square', count: 24, seconds: 10, grid: 0, localAxes: false, theme: 'dark', axis: 'X' });
});
it('restores new shapes and migrates older settings to the square', () => {
  expect(parseSettings({ shape: 'cuboid', grid: 2 }).shape).toBe('cuboid');
  expect(parseSettings({ shape: 'circle' }).shape).toBe('circle');
  expect(parseSettings({ shape: 'cube' }).shape).toBe('cube');
  expect(parseSettings({ shape: 'unknown', grid: 2 })).toMatchObject({ shape: 'square', grid: 2 });
  expect(parseSettings({ seconds: 15 })).toMatchObject({ shape: 'square', seconds: 15 });
});
it('validates appearance and camera preferences when restoring old or invalid data', () => {
  expect(parseSettings({ opacity: -1, brightness: Infinity, elevation: 61 })).toMatchObject({ opacity: 65, brightness: 75, elevation: 20 });
  expect(parseSettings({ shape: 'figure', opacity: 0, brightness: 100, elevation: -60 })).toMatchObject({ shape: 'figure', opacity: 0, brightness: 100, elevation: -60 });
});
