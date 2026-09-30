import { useCallback, useEffect, useState } from 'react';
import AnimatedTabs from '@/components/rareui/AnimatedTab';

/** 'achievements' はタブに出さず、ホームなどから開く画面。 */
export type Mode = 'home' | 'rotation' | 'perspective' | 'connection' | 'achievements';
export const MODES: { id: Mode; label: string }[] = [
  { id: 'home', label: 'ホーム' }, { id: 'rotation', label: '回転練習' }, { id: 'connection', label: '接続練習' }, { id: 'perspective', label: 'パース練習' },
];
const SCREENS: Mode[] = [...MODES.map(item => item.id), 'achievements'];
const fromHash = (hash: string): Mode => SCREENS.find(id => id === hash.replace(/^#\/?/, '')) ?? 'home';

/** 画面をURLのハッシュと同期する。再読み込みや戻るボタンでも同じ画面に戻れる。 */
export function useMode(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState(() => fromHash(location.hash));
  useEffect(() => {
    const sync = () => setMode(fromHash(location.hash));
    window.addEventListener('popstate', sync);window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync);window.removeEventListener('hashchange', sync); };
  }, []);
  const change = useCallback((next: Mode) => {
    if (fromHash(location.hash) !== next) history.pushState(null, '', next === 'home' ? location.pathname + location.search : `#${next}`);
    setMode(next);
    window.scrollTo({ top: 0 });
  }, []);
  return [mode, change];
}

export default function ModeNav({ mode, locked, onChange }: { mode: Mode; locked: boolean; onChange: (mode: Mode) => void }) {
  return <AnimatedTabs label="練習モード" tabs={MODES} activeTab={mode} disabled={locked} onChange={id => onChange(id as Mode)} className="mode-tabs" />;
}
