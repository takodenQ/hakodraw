import { useEffect, useRef, useState } from 'react';
import type { Session } from './session';
import type { NewLog, PracticeMode } from './progress';

export interface LoggerOptions { mode: PracticeMode; label: string; stepId?: string; onLog: (log: NewLog) => string }
/**
 * セッションが完了した、または1問以上進んで途中終了したときに練習記録を1件残す。
 * 開始してすぐ終了しただけの操作は記録しない。戻り値は直近の完了記録のID（感想の入力先）。
 */
export function useSessionLogger(session: Session, options: LoggerOptions): string | null {
  const latest = useRef(options);latest.current = options;
  const previous = useRef(session.phase);
  const lastActive = useRef({ index: session.index, exercise: session.exercise });
  const [logId, setLogId] = useState<string | null>(null);
  if (session.phase !== 'setup' && session.phase !== 'complete') lastActive.current = { index: session.index, exercise: session.exercise };
  useEffect(() => {
    const before = previous.current;
    previous.current = session.phase;
    if (before === session.phase) return;
    const { mode, label, stepId, onLog } = latest.current;
    if (session.phase === 'complete') {
      const { count, seconds } = session.exercise;
      setLogId(onLog({ mode, label, count, seconds, done: count, completed: true, ...(stepId ? { stepId } : {}) }));
    } else if (session.phase === 'setup' && before !== 'complete') {
      const { index, exercise } = lastActive.current;
      if (index >= 1) onLog({ mode, label, count: exercise.count, seconds: exercise.seconds, done: index, completed: false });
    } else if (before === 'complete') setLogId(null);
  }, [session.phase, session.exercise]);
  return logId;
}
