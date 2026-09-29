import { useCallback, useEffect, useMemo, useState } from 'react';
import { addLog, loadProgress, parseProgress, saveProgress, setFeeling, emptyProgress, type Feeling, type NewLog, type Progress } from './progress';
import { markSeen, mergeEarned, resolve, unseenIds } from './achievements';

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useProgress() {
  const [loaded] = useState(loadProgress);
  const [progress, setProgress] = useState<Progress>(loaded.progress);
  const [warning, setWarning] = useState(loaded.warning);
  useEffect(() => { setWarning(saveProgress(progress)); }, [progress]);
  // 新しく到達した実績を獲得済みとして保存する（記録が整理されても消えない）。
  useEffect(() => { setProgress(previous => mergeEarned(previous)); }, [progress.logs]);
  const record = useCallback((log: NewLog) => {
    const id = makeId();
    setProgress(previous => addLog(previous, { ...log, id, at: new Date().toISOString() }));
    return id;
  }, []);
  const rate = useCallback((id: string, feeling: Feeling) => setProgress(previous => setFeeling(previous, id, feeling)), []);
  const setGoal = useCallback((goal: number) => setProgress(previous => ({ ...previous, goal })), []);
  const dismissOnboarding = useCallback(() => setProgress(previous => ({ ...previous, onboarded: true })), []);
  const restore = useCallback((data: unknown) => setProgress(mergeEarned({ ...parseProgress(data), onboarded: true })), []);
  const reset = useCallback(() => setProgress(previous => ({ ...emptyProgress(), onboarded: previous.onboarded })), []);
  const see = useCallback((ids: string[]) => setProgress(previous => markSeen(previous, ids)), []);
  const evaluation = useMemo(() => resolve(progress), [progress]);
  const unseen = useMemo(() => unseenIds(progress), [progress]);
  return { progress, warning, record, rate, setGoal, dismissOnboarding, restore, reset, see, evaluation, unseen };
}
export type ProgressApi = ReturnType<typeof useProgress>;
