/** 1問ごとの回転時間（session.ts の TURN_MS）を含めた、練習全体のおおよその所要時間。 */
export function estimateSeconds(count: number, seconds: number, turnSeconds = .5): number {
  return Math.round(count * (seconds + turnSeconds));
}
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `約${Math.max(1, totalSeconds)}秒`;
  const minutes = Math.round(totalSeconds / 60);
  return minutes < 60 ? `約${minutes}分` : `約${Math.floor(minutes / 60)}時間${minutes % 60 ? `${minutes % 60}分` : ''}`;
}
export const formatDay = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
