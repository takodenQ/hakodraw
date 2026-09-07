import { useCallback, useEffect, useRef, useState } from 'react';
import { initialSession, sessionReducer, TURN_MS, type Action } from './session';

export function useSession(reducedMotion: boolean) {
  const [session, setSession] = useState(initialSession);
  const state = useRef(session);
  const duration = useRef(reducedMotion ? 0 : TURN_MS);
  duration.current = reducedMotion ? 0 : TURN_MS;
  const dispatch = useCallback((action: Action) => {
    const next = sessionReducer(state.current, action, duration.current);
    if (next !== state.current) { state.current = next; setSession(next); }
  }, []);
  useEffect(() => {
    let id = 0;
    const tick = (now: number) => { dispatch({ type: 'tick', now }); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    const hide = () => { if (document.hidden) dispatch({ type: 'hide', now: performance.now() }); };
    document.addEventListener('visibilitychange', hide);
    return () => { cancelAnimationFrame(id); document.removeEventListener('visibilitychange', hide); };
  }, [dispatch]);
  return { session, dispatch, turnDuration: duration.current };
}
