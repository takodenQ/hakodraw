import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import GlassShimmerButton from '@/components/rareui/GlassShimmerButton';
import { SHAPES, shapeLabel } from './shapes';
import { CONNECTIONS, connectionById, type GuidePreset } from './connections';
import { COURSE, nextStep, planFor, type CourseStep, type StepPlan } from './course';
import { estimateSeconds, formatDuration } from './format';
import TransformPanel from './TransformPanel';
import ModelView from './ModelView';
import PerspectivePractice from './PerspectivePractice';
import Home from './Home';
import Shell from './Shell';
import { useMode, type Mode } from './ModeNav';
import CompletionCard from './CompletionCard';
import Achievements from './Achievements';
import { loadSettings, saveSettings, type Settings, type Axis, type Grid } from './settings';
import { useSession } from './useSession';
import { useProgress } from './useProgress';
import { useSessionLogger } from './useSessionLogger';
import { useChime, useSessionKeys, useWakeLock } from './useSessionAids';
import { primeAudio } from './sound';
import { randomSeed } from './random';
import { bodyPose } from './body';

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => { const media = matchMedia(query);const update = () => setMatches(media.matches);media.addEventListener('change', update);return () => media.removeEventListener('change', update); }, [query]);
  return matches;
}
const PRESETS = [
  { label: 'おためし', count: 5, seconds: 30, hint: '5問 × 30秒' },
  { label: 'ふつう', count: 12, seconds: 30, hint: '12問 × 30秒' },
  { label: 'じっくり', count: 6, seconds: 90, hint: '6問 × 90秒' },
];
export interface PerspectivePlan { count: number; seconds: number }

function SoundToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <button className="quiet sound-toggle" aria-pressed={on} onClick={onToggle}>{on ? <Volume2 size={16} /> : <VolumeX size={16} />}切り替え音：{on ? 'あり' : 'なし'}</button>;
}

export default function App() {
  const [mode, setMode] = useMode();
  const [loaded] = useState(loadSettings);
  const [settings, setSettings] = useState(loaded.settings);
  const [warning, setWarning] = useState(loaded.warning);
  const [ready, setReady] = useState(false);
  const [highlightAxis, setHighlightAxis] = useState<Axis | null>(null);
  const [pulseAt, setPulseAt] = useState(0);
  const [countInput, setCountInput] = useState(String(settings.count));
  const [secondsInput, setSecondsInput] = useState(String(settings.seconds));
  const [activeStep, setActiveStep] = useState<{ step: CourseStep; quick: boolean } | null>(null);
  const [perspectivePlan, setPerspectivePlan] = useState<PerspectivePlan | null>(null);
  const [perspectiveLocked, setPerspectiveLocked] = useState(false);
  const [poseSeed, setPoseSeed] = useState(randomSeed);
  const progressApi = useProgress();
  const systemDark = useMedia('(prefers-color-scheme: dark)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && systemDark);
  const { session, dispatch, turnDuration } = useSession(reducedMotion);
  const setup = session.phase === 'setup', complete = session.phase === 'complete';
  const rotating = session.phase === 'rotating', paused = session.phase === 'paused';
  const onReady = useCallback((ok: boolean) => { setReady(ok);if (!ok) dispatch({ type: 'hide', now: performance.now() }); }, [dispatch]);
  const update = (patch: Partial<Settings>) => { setSettings(previous => ({ ...previous, ...patch })); };
  useEffect(() => { setWarning(saveSettings(settings)); }, [settings]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light';document.documentElement.style.colorScheme = dark ? 'dark' : 'light';document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#242626' : '#fffaf3'); }, [dark]);
  // 戻るボタンなどで画面が変わったら、進行中の練習は終了する。
  useEffect(() => { dispatch({ type: 'exit' }); }, [mode, dispatch]);

  const connection = connectionById(settings.connectionId);
  const count = Number(countInput), seconds = Number(secondsInput);
  const validCount = /^\d+$/.test(countInput) && count >= 1 && count <= 360;
  const validSeconds = /^\d+$/.test(secondsInput) && seconds >= 1 && seconds <= 3600;
  const step = activeStep?.step;
  const stepApplies = !!step && step.mode === mode && (mode === 'rotation' ? step.shape === settings.shape : mode === 'connection' && step.connectionId === connection.id);
  const logId = useSessionLogger(session, {
    mode: mode === 'connection' ? 'connection' : 'rotation',
    label: mode === 'connection' ? connection.label : `${shapeLabel(settings.shape)}の回転`,
    stepId: stepApplies && !activeStep!.quick ? step!.id : undefined,
    onLog: progressApi.record,
  });
  const inSession = !setup && !complete && (mode === 'rotation' || mode === 'connection');
  useWakeLock(!setup && !complete);
  useChime(session, settings.sound);
  const go = (delta: -1 | 1) => { if (!rotating && ready && session.index + delta >= 0) dispatch({ type: 'move', delta, now: performance.now(), duration: turnDuration }); };
  useSessionKeys(inSession, {
    toggle: () => { if (!rotating && ready) dispatch({ type: paused ? 'resume' : 'pause', now: performance.now() }); },
    previous: () => go(-1), next: () => go(1),
  });

  const start = () => {
    if (!validCount || !validSeconds || !ready) return;
    primeAudio();
    // 接続練習は、練習のたびに新しいポーズの組み合わせにする（同じ練習の中では前後しても同じポーズ）。
    setPoseSeed(randomSeed());
    update({ count, seconds });dispatch({ type: 'start', exercise: { count, seconds, axis: settings.axis }, now: performance.now() });
  };
  const isConnection = mode === 'connection';
  const pose = useMemo(() => isConnection && !setup ? bodyPose(connection.id, poseSeed, session.index) : undefined, [isConnection, setup, connection.id, poseSeed, session.index]);
  const navigate = (next: Mode) => { setActiveStep(null);setPerspectivePlan(null);setMode(next); };
  /** ホームやコースから、設定を入れた状態で各練習画面へ移る（開始は本人が押す）。 */
  const startPlan = ({ step: target, count: planCount, seconds: planSeconds }: StepPlan, quick: boolean) => {
    dispatch({ type: 'exit' });
    setActiveStep({ step: target, quick });
    if (target.mode === 'perspective') setPerspectivePlan({ count: planCount, seconds: planSeconds });
    else {
      setPerspectivePlan(null);
      update({ count: planCount, seconds: planSeconds, ...(target.shape ? { shape: target.shape } : {}), ...(target.connectionId ? { connectionId: target.connectionId } : {}), ...(target.axis ? { axis: target.axis } : {}), ...(target.guidePreset ? { guidePreset: target.guidePreset } : {}) });
      setCountInput(String(planCount));setSecondsInput(String(planSeconds));
    }
    setMode(target.mode);
  };
  /** 配色の切り替えは、対応ブラウザでは全体をなめらかに移り変わらせる（動きを減らす設定では即時）。 */
  const toggleTheme = () => {
    const apply = () => update({ theme: dark ? 'light' : 'dark' });
    if (document.startViewTransition && !reducedMotion) document.startViewTransition(() => flushSync(apply));
    else apply();
  };
  const toggleSound = () => update({ sound: !settings.sound });
  const warningText = warning || progressApi.warning;

  const shell = (className: string, locked: boolean, children: ReactNode) =>
    <Shell mode={mode} className={className} dark={dark} locked={locked} onTheme={toggleTheme} onNavigate={navigate}>{children}</Shell>;
  if (mode === 'perspective') return shell('perspective-app', perspectiveLocked, <PerspectivePractice onNavigate={navigate} onLock={setPerspectiveLocked} sound={settings.sound} onSound={toggleSound}
    plan={perspectivePlan} step={activeStep && activeStep.step.mode === 'perspective' ? activeStep : null} progress={progressApi} onStartPlan={startPlan} warning={warningText} />);
  if (mode === 'home') return shell('home-app', false, <Home api={progressApi} onStart={startPlan} onFree={navigate} onAchievements={() => navigate('achievements')} />);
  if (mode === 'achievements') return shell('home-app', false, <Achievements api={progressApi} onHome={() => navigate('home')} />);

  return shell(setup ? 'is-setup' : 'is-session', !setup && !complete, <>
    {mode === 'connection' && <section aria-label="接続練習の案内"><p>{connection.hint}</p><p className="muted">紙や描画ソフトに描き、補助表示で接続を確認しましょう。</p><label className="setting-row">補助表示<select aria-label="補助表示" value={settings.guidePreset ?? 'standard'} onChange={e => update({ guidePreset: e.target.value as GuidePreset })}><option value="learning">学習</option><option value="standard">標準</option><option value="test">テスト</option></select></label><p className="muted">{settings.guidePreset === 'learning' ? '中心線・接続点・接続軸・方向線（矢印は前）' : settings.guidePreset === 'test' ? '立体のみ表示' : '中心線・接続点を表示'}</p></section>}
    <div className="workspace">
      <ModelView positionX={settings.positionX} positionY={settings.positionY} opacity={settings.opacity} brightness={settings.brightness} rotationX={settings.rotationX} rotationY={settings.rotationY} rotationZ={settings.rotationZ} scale={settings.scale} focalLength={settings.focalLength} shape={settings.shape} axis={setup ? settings.axis : session.exercise.axis} angle={setup ? 0 : session.angle} phase={session.phase}
        connectionId={isConnection ? connection.id : undefined} guidePreset={settings.guidePreset} pose={pose} poseKey={pose ? `${poseSeed}:${session.index}` : undefined}
        showAxes={mode === 'connection' ? settings.guidePreset === 'learning' : setup || settings.localAxes} dark={dark} grid={settings.grid} completedAt={session.completedAt}
        reducedMotion={reducedMotion} highlightAxis={highlightAxis} axisPulseAt={pulseAt} onReady={onReady} />
      <div className="controls">
        {setup && stepApplies && <section className="course-banner" aria-label="コースの案内">
          <p className="eyebrow">はじめてのコース ステップ {COURSE.indexOf(step!) + 1} / {COURSE.length}{activeStep!.quick ? '（1分だけ）' : ''}</p>
          <h2>{step!.title}</h2><p>{step!.aim}</p><p className="muted">描くコツ：{step!.tip}</p></section>}
        {!complete && <TransformPanel settings={settings} setup={setup} canRotate={!isConnection} update={update} onAxis={axis => { setHighlightAxis(axis);setPulseAt(performance.now()); }} />}
        {setup ? <section aria-label="練習の設定">
          {mode === 'connection' ? <fieldset><legend>練習する接続</legend><div className="connection-options">{CONNECTIONS.map(item => <label key={item.id}><input type="radio" name="connection" checked={connection.id === item.id} onChange={() => update({ connectionId: item.id })} />{item.label}</label>)}</div></fieldset> : <fieldset className="shape-choice"><legend>練習する形</legend><div className="shape-options">
            {SHAPES.map(shape => <label key={shape.id}><input type="radio" name="shape" value={shape.id} checked={settings.shape === shape.id}
              onChange={() => update({ shape: shape.id })} /><span><svg viewBox="0 0 40 40" aria-hidden="true">
              {shape.id === 'mannequin' ? <path d="M17 3H23V10H17Z M14 13H26L24 23H16Z M14 14 8 25 M26 14 32 25 M17 24 15 37 M23 24 25 37" /> : <>
              {shape.id === 'figure' ? <path d="M16 3H24V11H16Z M12 16 25 13 29 25 16 28Z M15 31 25 29 27 37 17 39Z" /> : shape.id === 'circle' ? <circle cx="20" cy="20" r="13" /> : shape.id === 'square' ? <rect x="7" y="7" width="26" height="26" /> : <path d={shape.id === 'cube' ? 'M6 12 20 5 34 12 34 28 20 35 6 28Z M6 12 20 19 34 12 M20 19V35' : 'M10 9 22 4 32 9 32 31 20 36 10 31Z M10 9 20 14 32 9 M20 14V36'} />}
              </>}
              </svg><b>{shape.label}</b><small aria-hidden="true">✓</small></span></label>)}
          </div><p className="muted shape-hint">{SHAPES.find(item => item.id === settings.shape)?.hint}</p></fieldset>}
          {isConnection ? <p className="muted random-note">問題ごとに、関節の曲げ・ひねり（人体の可動域の範囲内）と、全体の向きがランダムに変わります。</p> : <fieldset className="axes-choice"><legend>回転軸</legend><div className="axis-options">
            {(['X', 'Y', 'Z'] as Axis[]).map((axis, i) => <label key={axis}><input type="radio" name="axis" value={axis} checked={settings.axis === axis}
              onChange={() => { update({ axis });setPulseAt(performance.now()); }} /><span><b className={`axis-${axis}`}>{axis}</b>{['左右', '上下', '奥行き'][i]}<small aria-hidden="true">✓</small></span></label>)}
          </div><p className="muted">選んだ軸を中心に、1問ごとに形が少しずつ回ります。迷ったら「上下」で大丈夫です。</p></fieldset>}
          <div className="presets" role="group" aria-label="練習の量">{PRESETS.map(preset => <button key={preset.label} aria-pressed={countInput === String(preset.count) && secondsInput === String(preset.seconds)}
            onClick={() => { setCountInput(String(preset.count));setSecondsInput(String(preset.seconds)); }}><b>{preset.label}</b><small>{preset.hint}</small></button>)}</div>
          <div className="number-fields"><label>問題数<input type="number" min="1" max="360" step="1" inputMode="numeric" value={countInput}
            aria-invalid={!validCount} aria-describedby={!validCount ? 'count-error' : undefined} onChange={e => setCountInput(e.target.value)}
            onBlur={() => { if (validCount) update({ count }); }} /></label>
            <label>1問の秒数<input type="number" min="1" max="3600" step="1" inputMode="numeric" value={secondsInput}
              aria-invalid={!validSeconds} aria-describedby={!validSeconds ? 'seconds-error' : undefined} onChange={e => setSecondsInput(e.target.value)}
              onBlur={() => { if (validSeconds) update({ seconds }); }} /></label></div>
          {!validCount && <p className="error" id="count-error">問題数は1〜360の整数で入力してください。</p>}
          {!validSeconds && <p className="error" id="seconds-error">秒数は1〜3600の整数で入力してください。</p>}
          {validCount && validSeconds && <p className="muted total-time">全部で{formatDuration(estimateSeconds(count, seconds))}です。</p>}
          <SoundToggle on={settings.sound} onToggle={toggleSound} />

          <GlassShimmerButton className="start-button mt-6 w-full" onClick={start} disabled={!ready || !validCount || !validSeconds}><Play size={17} />{ready ? '練習スタート' : '3D表示を準備中'}</GlassShimmerButton>
        </section> : complete ? <CompletionCard summary={`${session.exercise.count}問のセッションが終了しました`} logId={logId} progress={progressApi.progress} api={progressApi} onAchievements={() => navigate('achievements')} busy={!ready}
          next={nextStep(progressApi.progress.logs)} onRate={progressApi.rate} onAgain={start} onSetup={() => dispatch({ type: 'exit' })} onHome={() => navigate('home')}
          onNext={() => { const target = nextStep(progressApi.progress.logs);if (target) startPlan(planFor(target, progressApi.progress.logs), false); }} /> : <section aria-label="練習の進行">
          <div className="progress-label"><span aria-live="polite">{session.index + 1} / {session.exercise.count}問</span><span className="seconds">残り{Math.ceil(session.remaining)}秒</span></div>
          <div className={`time-track ${session.remaining <= 10 && !rotating ? 'last-seconds' : ''} ${paused ? 'paused' : ''}`} role="progressbar" aria-label="残り時間"
            aria-valuemin={0} aria-valuemax={session.exercise.seconds} aria-valuenow={Math.ceil(session.remaining)}>
            <div style={{ transform: `scaleX(${session.remaining / session.exercise.seconds})` }} /></div>
          <p className="angle" aria-live="polite">{isConnection ? 'ランダムな向き・ポーズ' : `${session.exercise.axis}軸 · ${+(session.index * 360 / session.exercise.count).toFixed(1)}°`}{rotating ? ' · 回転中' : paused ? ' · 一時停止中' : ''}</p>
          {stepApplies && <p className="session-tip">描くコツ：{step!.tip}</p>}
          <div className="navigation"><button disabled={session.index === 0 || rotating || !ready} onClick={() => go(-1)}><ChevronLeft size={16} />前へ</button>
            <button className="primary" disabled={rotating || !ready} onClick={() => dispatch({ type: paused ? 'resume' : 'pause', now: performance.now() })}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? '再開' : '一時停止'}</button>
            <button disabled={rotating || !ready} onClick={() => go(1)}>次へ<ChevronRight size={16} /></button></div>
          <div className="session-aids"><SoundToggle on={settings.sound} onToggle={toggleSound} /><span className="muted key-hint">スペース：一時停止　←→：前後</span></div>
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
        {warningText && <p className="storage-warning" role="status">{warningText}</p>}
      </div>
    </div>
  </>);
}
