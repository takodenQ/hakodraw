import { SHAPES, type Shape } from './shapes';
export type Axis = 'X' | 'Y' | 'Z';
export type Grid = 0 | 2 | 3 | 4;
export type Theme = 'auto' | 'light' | 'dark';
export interface Settings { opacity: number; brightness: number; elevation: number; shape: Shape; count: number; seconds: number; axis: Axis; grid: Grid; localAxes: boolean; theme: Theme }
export const DEFAULTS: Settings = { opacity: 65, brightness: 75, elevation: 20, shape: 'square', count: 12, seconds: 30, axis: 'Y', grid: 4, localAxes: true, theme: 'auto' };
export const STORAGE_KEY = 'hakodraw.settings.v1';
const integer = (n: unknown, min: number, max: number, fallback: number) =>
  typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : fallback;
export function parseSettings(value: unknown): Settings {
  const v = value && typeof value === 'object' ? value as Partial<Settings> : {};
  return {
    opacity: integer(v.opacity, 0, 100, 65), brightness: integer(v.brightness, 0, 100, 75), elevation: integer(v.elevation, -60, 60, 20),
    shape: SHAPES.some(item => item.id === v.shape) ? v.shape! : 'square',
    count: integer(v.count, 1, 360, 12), seconds: integer(v.seconds, 1, 3600, 30),
    axis: v.axis === 'X' || v.axis === 'Z' ? v.axis : 'Y',
    grid: v.grid === 0 || v.grid === 2 || v.grid === 3 ? v.grid : 4,
    localAxes: typeof v.localAxes === 'boolean' ? v.localAxes : true,
    theme: v.theme === 'light' || v.theme === 'dark' ? v.theme : 'auto',
  };
}
export function loadSettings(): { settings: Settings; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { settings: raw ? parseSettings(JSON.parse(raw)) : { ...DEFAULTS }, warning: '' };
  } catch { return { settings: { ...DEFAULTS }, warning: '保存した設定を読み込めませんでした。初期設定で練習できます。' }; }
}
export function saveSettings(settings: Settings): string {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); return ''; }
  catch { return 'このブラウザでは設定を保存できません。現在の練習はそのまま続けられます。'; }
}
