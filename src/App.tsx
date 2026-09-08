import { useCallback, useEffect, useState } from 'react';
import { Sun, Moon, ChevronDown, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { SHAPES } from './shapes';
import TransformPanel from './TransformPanel';
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
  const [highlightAxis, setHighlightAxis] = useState<Axis | null>(null);
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
  const update = (patch: Partial<Settings>) => { setSettings(previous => { const next = { ...previous, ...patch };return next; }); };
  useEffect(() => { setWarning(saveSettings(settings)); }, [settings]);
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
      <ModelView positionX={settings.positionX} positionY={settings.positionY} opacity={settings.opacity} brightness={settings.brightness} rotationX={settings.rotationX} rotationY={settings.rotationY} rotationZ={settings.rotationZ} scale={settings.scale} focalLength={settings.focalLength} shape={settings.shape} axis={setup ? settings.axis : session.exercise.axis} angle={setup ? 0 : session.angle} phase={session.phase}
        showAxes={setup || settings.localAxes} dark={dark} grid={settings.grid} completedAt={session.completedAt}
        reducedMotion={reducedMotion} highlightAxis={highlightAxis} axisPulseAt={pulseAt} onReady={onReady} />
      <div className="controls">
        {!complete && <TransformPanel settings={settings} setup={setup} update={update} onAxis={axis => { setHighlightAxis(axis);setPulseAt(performance.now()); }} />}
        {setup ? <section aria-label="練習の設定">
          <fieldset className="shape-choice"><legend>練習する形</legend><div className="shape-options">
            {SHAPES.map(shape => <label key={shape.id}><input type="radio" name="shape" value={shape.id} checked={settings.shape === shape.id}
              onChange={() => update({ shape: shape.id })} /><span><svg viewBox="0 0 40 40" aria-hidden="true">
              {shape.id === 'figure' ? <path d="M16 3H24V11H16Z M12 16 25 13 29 25 16 28Z M15 31 25 29 27 37 17 39Z" /> : shape.id === 'circle' ? <circle cx="20" cy="20" r="13" /> : shape.id === 'square' ? <rect x="7" y="7" width="26" height="26" /> : <path d={shape.id === 'cube' ? 'M6 12 20 5 34 12 34 28 20 35 6 28Z M6 12 20 19 34 12 M20 19V35' : 'M10 9 22 4 32 9 32 31 20 36 10 31Z M10 9 20 14 32 9 M20 14V36'} />}
              </svg><b>{shape.label}</b><small aria-hidden="true">✓</small></span></label>)}
          </div></fieldset>
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

          <button className="primary full start-button" onClick={start} disabled={!ready || !validCount || !validSeconds}><Play size={17} />{ready ? '練習スタート' : '3D表示を準備中'}</button>
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
        {!complete && <details className="view-settings" key={setup ? "setup" : "practice"}><summary>ビューの設定<ChevronDown size={16} /></summary><div className="view-options">
          {setup && <section className="initial-settings" aria-label="初期姿勢とパース"><h3>初期姿勢とパース</h3>
            <label className="range-setting"><span>焦点距離<output>{settings.focalLength} mm</output></span><input aria-label="焦点距離" type="range" min="35" max="150" value={settings.focalLength} onChange={e => update({ focalLength: Number(e.target.value) })} /></label>
            <div className="lens-presets">{[35, 50, 100, 150].map(mm => <button key={mm} aria-pressed={settings.focalLength === mm} onClick={() => update({ focalLength: mm })}>{mm}mm</button>)}</div>
            <p className="muted">短い焦点距離ほど遠近感が強くなります。見かけの大きさを保つため、カメラ距離も連動します。</p>
            <button className="quiet" onClick={() => update({ positionX: 0, positionY: 0, scale: 100, rotationX: 0, rotationY: 0, rotationZ: 0, focalLength: 50 })}>初期姿勢とパースをリセット</button>
          </section>}


          <h3>補助表示と面</h3><label className="setting-row">模写用グリッド<select value={settings.grid} onChange={e => update({ grid: Number(e.target.value) as Grid })}>
            <option value={0}>非表示</option><option value={2}>2 × 2</option><option value={3}>3 × 3</option><option value={4}>4 × 4</option></select></label>
          <label className="setting-row">練習中のローカル軸<span className="switch"><input type="checkbox" role="switch" checked={settings.localAxes} onChange={e => update({ localAxes: e.target.checked })} /><span aria-hidden="true" /></span></label>
          <label className="range-setting"><span>面の不透明度<output>{settings.opacity}%</output></span><input aria-label="面の不透明度" type="range" min="0" max="100" value={settings.opacity} onChange={e => update({ opacity: Number(e.target.value) })} /></label>
          <label className="range-setting"><span>面の明度<output>{settings.brightness}%</output></span><input aria-label="面の明度" type="range" min="0" max="100" value={settings.brightness} onChange={e => update({ brightness: Number(e.target.value) })} /></label>
          <p className="muted">奥の辺は薄く表示します。面を0%にすると辺だけになります。</p>
        </div></details>}
        {warning && <p className="storage-warning" role="status">{warning}</p>}
      </div>
    </div>
  </main>;
}
