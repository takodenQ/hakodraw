import { useEffect, useRef } from 'react';
import type { Session } from './session';
import { chime } from './sound';

/** 練習中は画面が暗くならないようにする。未対応・拒否された場合は何もしない。 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null, cancelled = false;
    const acquire = () => navigator.wakeLock.request('screen').then(next => { if (cancelled) void next.release(); else lock = next; }).catch(() => {});
    void acquire();
    const visible = () => { if (!document.hidden) void acquire(); };
    document.addEventListener('visibilitychange', visible);
    return () => { cancelled = true;document.removeEventListener('visibilitychange', visible);void lock?.release().catch(() => {}); };
  }, [active]);
}

/** 問題が切り替わったとき、完了したときに合図音を鳴らす。 */
export function useChime(session: Session, enabled: boolean) {
  const previous = useRef({ index: session.index, phase: session.phase });
  useEffect(() => {
    const before = previous.current;
    previous.current = { index: session.index, phase: session.phase };
    if (!enabled) return;
    const running = (phase: Session['phase']) => phase !== 'setup' && phase !== 'complete';
    if (session.phase === 'complete' && before.phase !== 'complete') chime('done');
    else if (running(before.phase) && running(session.phase) && session.index !== before.index) chime('next');
  }, [session.index, session.phase, enabled]);
}

export interface SessionKeyHandlers { toggle: () => void; previous: () => void; next: () => void }
/** スペースで一時停止／再開、←→で前後の問題へ。ボタンや入力欄にフォーカスがあるときは通常動作を優先する。 */
export function useSessionKeys(active: boolean, handlers: SessionKeyHandlers) {
  const latest = useRef(handlers);latest.current = handlers;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, input, select, textarea, summary, [contenteditable]')) return;
      if (e.key === ' ') latest.current.toggle();
      else if (e.key === 'ArrowRight') latest.current.next();
      else if (e.key === 'ArrowLeft') latest.current.previous();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}
