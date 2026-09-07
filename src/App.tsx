import { useCallback, useEffect, useState } from 'react';
import { Sun, Moon, ChevronDown, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import ModelView from './ModelView';
import { loadSettings, saveSettings, type Settings, type Axis, type Grid } from './settings';
import { useSession } from './useSession';

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => { const media = matchMedia(query);const update = () => setMatches(media.matches);media.addEventListener('change', update);return () => media.removeEventListener('change', update); }, [query]);
  return matches;
}
export default function App() {
  const [loaded] = useState(loadSettings);
  const [settings, setSettings] = useState(loaded.settings);
  const [warning, setWarning] = useState(loaded.warning);
  const [ready, setReady] = useState(false);
  const [pulseAt, setPulseAt] = useState(0);
  const [countInput, setCountInput] = useState(String(settings.count));
  const [secondsInput, setSecondsInput] = useState(String(settings.seconds));
  const systemDark = useMedia('(prefers-color-scheme: dark)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && systemDark);
  const { session, dispatch, turnDuration } = useSession(reducedMotion);
  const setup = session.phase === 'setup', complete = session.phase === 'complete';
  const rotating = session.phase === 'rotating', paused = session.phase === 'paused';
  const onReady = useCallback((ok: boolean) => { setReady(ok);if (!ok) dispatch({ type: 'hide', now: performance.now() }); }, [dispatch]);
  const update = (patch: Partial<Settings>) => { const next = { ...settings, ...patch };setSettings(next);setWarning(saveSettings(next)); };
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light';document.documentElement.style.colorScheme = dark ? 'dark' : 'light';document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#242626' : '#fffaf3'); }, [dark]);
  const count = Number(countInput), seconds = Number(secondsInput);
  const validCount = /^\d+$/.test(countInput) && count >= 1 && count <= 360;
  const validSeconds = /^\d+$/.test(secondsInput) && seconds >= 1 && seconds <= 3600;
  const start = () => {
    if (!validCount || !validSeconds || !ready) return;
    update({ count, seconds });dispatch({ type: 'start', exercise: { count, seconds, axis: settings.axis }, now: performance.now() });
  };
  return <main className={`app ${setup ? 'is-setup' : 'is-session'}`}>
    <header><h1>HakoDraw</h1><button className="icon-button" aria-label={dark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
      title={dark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'} onClick={() => update({ theme: dark ? 'light' : 'dark' })}>{dark ? <Moon /> : <Sun />}</button></header>
    <div className="workspace">
      <ModelView axis={setup ? settings.axis : session.exercise.axis} angle={setup ? 0 : session.angle} phase={session.phase}
        showAxes={setup || settings.localAxes} dark={dark} grid={settings.grid} completedAt={session.completedAt}
        reducedMotion={reducedMotion} axisPulseAt={pulseAt} onReady={onReady} />
      <div className="controls">
        {setup ? <section aria-labelledby="setup-title"><h2 id="setup-title">練習をはじめる</h2><p className="muted">正方形の面 · 正面からスタート</p>
          <fieldset className="axes-choice"><legend>回転軸</legend><div className="axis-options">
            {(['X', 'Y', 'Z'] as Axis[]).map((axis, i) => <label key={axis}><input type="radio" name="axis" value={axis} checked={settings.axis === axis}
              onChange={() => { update({ axis });setPulseAt(performance.now()); }} /><span><b className={`axis-${axis}`}>{axis}</b>{['左右', '上下', '奥行き'][i]}<small aria-hidden="true">✓</small></span></label>)}
          </div></fieldset>
          <div className="number-fields"><label>問題数<input type="number" min="1" max="360" step="1" inputMode="numeric" value={countInput}
            aria-invalid={!validCount} aria-describedby={!validCount ? 'count-error' : undefined} onChange={e => setCountInput(e.target.value)}
            onBlur={() => { if (validCount) update({ count }); }} /></label>
            <label>1問の秒数<input type="number" min="1" max="3600" step="1" inputMode="numeric" value={secondsInput}
              aria-invalid={!validSeconds} aria-describedby={!validSeconds ? 'seconds-error' : undefined} onChange={e => setSecondsInput(e.target.value)}
              onBlur={() => { if (validSeconds) update({ seconds }); }} /></label></div>
          {!validCount && <p className="error" id="count-error">問題数は1〜360の整数で入力してください。</p>}
          {!validSeconds && <p className="error" id="seconds-error">秒数は1〜3600の整数で入力してください。</p>}
          <p className="summary">{validCount && validSeconds ? `${+(360 / count).toFixed(1)}°ずつ / 描く時間 ${+(count * seconds / 60).toFixed(1)}分 ＋ 回転時間` : '問題数と秒数を確認してください。'}</p>
          <button className="primary full" onClick={start} disabled={!ready || !validCount || !validSeconds}><Play size={17} />{ready ? '練習スタート' : '3D表示を準備中'}</button>
        </section> : complete ? <section className="done" aria-label="練習完了"><h2>練習完了</h2><p className="muted">{session.exercise.count}問のセッションが終了しました</p>
          <button className="primary full" onClick={start} disabled={!ready}>同じ設定でもう一度</button><button className="full" onClick={() => dispatch({ type: 'exit' })}>設定に戻る</button>
        </section> : <section aria-label="練習の進行">
          <div className="progress-label"><span aria-live="polite">{session.index + 1} / {session.exercise.count}問</span><span className="seconds">残り{Math.ceil(session.remaining)}秒</span></div>
          <div className={`time-track ${session.remaining <= 10 && !rotating ? 'last-seconds' : ''} ${paused ? 'paused' : ''}`} role="progressbar" aria-label="残り時間"
            aria-valuemin={0} aria-valuemax={session.exercise.seconds} aria-valuenow={Math.ceil(session.remaining)}>
            <div style={{ transform: `scaleX(${session.remaining / session.exercise.seconds})` }} /></div>
          <p className="angle" aria-live="polite">{session.exercise.axis}軸 · {+(session.index * 360 / session.exercise.count).toFixed(1)}°{rotating ? ' · 回転中' : paused ? ' · 一時停止中' : ''}</p>
          <div className="navigation"><button disabled={session.index === 0 || rotating || !ready} onClick={() => dispatch({ type: 'move', delta: -1, now: performance.now(), duration: turnDuration })}><ChevronLeft size={16} />前へ</button>
            <button className="primary" disabled={rotating || !ready} onClick={() => dispatch({ type: paused ? 'resume' : 'pause', now: performance.now() })}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? '再開' : '一時停止'}</button>
            <button disabled={rotating || !ready} onClick={() => dispatch({ type: 'move', delta: 1, now: performance.now(), duration: turnDuration })}>次へ<ChevronRight size={16} /></button></div>
          <button className="quiet exit" onClick={() => dispatch({ type: 'exit' })}>練習を終了</button>
        </section>}
        {!complete && <details className="view-settings"><summary>ビューの表示設定<ChevronDown size={16} /></summary><div className="view-options">
          <label className="setting-row">模写用グリッド<select value={settings.grid} onChange={e => update({ grid: Number(e.target.value) as Grid })}>
            <option value={0}>非表示</option><option value={2}>2 × 2</option><option value={3}>3 × 3</option><option value={4}>4 × 4</option></select></label>
          <label className="setting-row">練習中のローカル軸<span className="switch"><input type="checkbox" role="switch" checked={settings.localAxes} onChange={e => update({ localAxes: e.target.checked })} /><span aria-hidden="true" /></span></label>
        </div></details>}
        {warning && <p className="storage-warning" role="status">{warning}</p>}
      </div>
    </div>
  </main>;
}
