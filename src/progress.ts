// 練習記録。ブラウザ内（localStorage）だけに保存し、上達や巧拙は判定しない。「練習した日」だけを数える。
export type PracticeMode = 'rotation' | 'connection' | 'perspective';
export type Feeling = 'hard' | 'ok' | 'easy';
export interface PracticeLog {
  id: string; at: string; mode: PracticeMode; label: string;
  count: number; seconds: number; done: number; completed: boolean;
  stepId?: string; feeling?: Feeling;
}
export type NewLog = Omit<PracticeLog, 'id' | 'at'>;
/** earned：獲得した実績のID→獲得日時。seen：獲得を知らせ済みの実績ID。 */
export interface Progress { logs: PracticeLog[]; goal: number; onboarded: boolean; earned: Record<string, string>; seen: string[] }

export const PROGRESS_KEY = 'hakodraw.progress.v1';
export const MAX_LOGS = 2000;
const MAX_EARNED = 300;
export const DEFAULT_GOAL = 3;
/** 1日休んでも連続記録が途切れない日数。 */
export const REST_DAYS_ALLOWED = 1;
export const emptyProgress = (): Progress => ({ logs: [], goal: DEFAULT_GOAL, onboarded: false, earned: {}, seen: [] });
export const FEELING_LABELS: Record<Feeling, string> = { hard: 'むずかしかった', ok: 'ちょうどよかった', easy: 'もの足りない' };

const MODES: PracticeMode[] = ['rotation', 'connection', 'perspective'];
const FEELINGS: Feeling[] = ['hard', 'ok', 'easy'];
const int = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;

function parseLog(value: unknown): PracticeLog | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<PracticeLog>;
  if (typeof v.id !== 'string' || typeof v.at !== 'string' || Number.isNaN(Date.parse(v.at))) return null;
  if (!MODES.includes(v.mode as PracticeMode) || typeof v.label !== 'string') return null;
  if (!int(v.count, 1, 360) || !int(v.seconds, 1, 3600) || !int(v.done, 0, 360) || typeof v.completed !== 'boolean') return null;
  return { id: v.id.slice(0, 60), at: v.at, mode: v.mode as PracticeMode, label: v.label.slice(0, 40), count: v.count!, seconds: v.seconds!, done: v.done!, completed: v.completed,
    ...(typeof v.stepId === 'string' ? { stepId: v.stepId.slice(0, 40) } : {}),
    ...(FEELINGS.includes(v.feeling as Feeling) ? { feeling: v.feeling as Feeling } : {}) };
}
/** 壊れた保存データや読み込んだファイルを、使える部分だけ残して補正する。 */
export function parseProgress(value: unknown): Progress {
  const v = value && typeof value === 'object' ? value as { logs?: unknown; goal?: unknown; onboarded?: unknown; earned?: unknown; seen?: unknown } : {};
  const logs = Array.isArray(v.logs) ? v.logs.map(parseLog).filter((log): log is PracticeLog => log !== null) : [];
  const earned: Record<string, string> = {};
  if (v.earned && typeof v.earned === 'object' && !Array.isArray(v.earned))
    for (const [id, at] of Object.entries(v.earned).slice(0, MAX_EARNED)) if (id.length <= 60 && typeof at === 'string' && !Number.isNaN(Date.parse(at))) earned[id] = at;
  const seen = Array.isArray(v.seen) ? [...new Set(v.seen.filter((id): id is string => typeof id === 'string' && id.length <= 60))].slice(0, MAX_EARNED) : [];
  return { logs: logs.slice(-MAX_LOGS), goal: int(v.goal, 1, 7) ? v.goal as number : DEFAULT_GOAL, onboarded: v.onboarded === true, earned, seen };
}
export function loadProgress(): { progress: Progress; warning: string } {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return { progress: raw ? parseProgress(JSON.parse(raw)) : emptyProgress(), warning: '' };
  } catch { return { progress: emptyProgress(), warning: '保存した練習記録を読み込めませんでした。' }; }
}
export function saveProgress(progress: Progress): string {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); return ''; }
  catch { return 'このブラウザでは練習記録を保存できません。練習はそのまま続けられます。'; }
}

export function addLog(progress: Progress, log: PracticeLog): Progress {
  return { ...progress, logs: [...progress.logs, log].slice(-MAX_LOGS) };
}
export function setFeeling(progress: Progress, id: string, feeling: Feeling): Progress {
  return { ...progress, logs: progress.logs.map(log => log.id === id ? { ...log, feeling } : log) };
}

/** 端末の暦日を、うるう秒・夏時間に影響されない通し番号へ変換する。 */
export const dayIndex = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
const dayDate = (index: number) => { const d = new Date(index * 864e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
export function practiceDayIndexes(logs: PracticeLog[]): number[] {
  return [...new Set(logs.map(log => dayIndex(new Date(log.at))))].sort((a, b) => a - b);
}
/** 月曜始まりの週の先頭日。 */
export const weekStartIndex = (d: Date) => dayIndex(d) - ((d.getDay() + 6) % 7);
export function daysThisWeek(logs: PracticeLog[], today: Date): number {
  const start = weekStartIndex(today);
  return practiceDayIndexes(logs).filter(day => day >= start && day < start + 7).length;
}
export function practicedToday(logs: PracticeLog[], today: Date): boolean {
  return practiceDayIndexes(logs).includes(dayIndex(today));
}
/** 練習した日の連続数。REST_DAYS_ALLOWED日までの休みは途切れとしない。 */
export function currentStreak(logs: PracticeLog[], today: Date): number {
  const days = practiceDayIndexes(logs).reverse();
  const limit = REST_DAYS_ALLOWED + 1;
  if (!days.length || dayIndex(today) - days[0] > limit) return 0;
  let streak = 1;
  while (streak < days.length && days[streak - 1] - days[streak] <= limit) streak++;
  return streak;
}
export function totalMinutes(logs: PracticeLog[]): number {
  return Math.round(logs.reduce((sum, log) => sum + log.seconds * log.done, 0) / 60);
}

export interface CalendarCell { key: number; date: Date; practiced: boolean; today: boolean; future: boolean }
/** 直近 `weeks` 週（今週を最終行）の月曜始まりカレンダー。 */
export function calendar(logs: PracticeLog[], today: Date, weeks = 5): CalendarCell[] {
  const practiced = new Set(practiceDayIndexes(logs));
  const now = dayIndex(today), first = weekStartIndex(today) - (weeks - 1) * 7;
  return Array.from({ length: weeks * 7 }, (_, i) => ({ key: first + i, date: dayDate(first + i), practiced: practiced.has(first + i), today: first + i === now, future: first + i > now }));
}

export const backupFileName = (today: Date) => `hakodraw-backup-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.json`;
