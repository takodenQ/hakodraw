import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createScene, type ViewState } from './scene/renderer';
import type { Grid } from './settings';

export default function ModelView(props: ViewState & { grid: Grid; onReady: (ready: boolean) => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const snapshot = useRef(props);snapshot.current = props;
  const [error, setError] = useState('');
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    let scene: ReturnType<typeof createScene>;
    let id = 0;
    const host = mount.current!;
    try {
      scene = createScene(host, positions => positions.forEach((p, i) => {
        const label = labelRefs.current[i];if (!label) return;
        label.style.left = `${p.x}%`;label.style.top = `${p.y}%`;
        label.dataset.depth = p.depth < -.05 ? 'behind' : 'front';
      }));
    } catch { setError('3D表示を開始できませんでした。WebGLが使えるブラウザで開き直してください。');snapshot.current.onReady(false);return; }
    snapshot.current.onReady(true);
    const frame = (now: number) => { scene.render(snapshot.current, now);id = requestAnimationFrame(frame); };
    id = requestAnimationFrame(frame);
    const contextLost = (e: Event) => { e.preventDefault();setLost(true);snapshot.current.onReady(false); };
    const canvas = host.querySelector('canvas')!;
    canvas.addEventListener('webglcontextlost', contextLost);
    return () => { cancelAnimationFrame(id);canvas.removeEventListener('webglcontextlost', contextLost);scene.dispose(); };
  }, []);
  const complete = props.phase === 'complete';
  return <div className={`model-view ${complete ? 'celebrating' : ''}`} data-testid="model-view" data-axis={props.axis}
    data-position-x={props.positionX} data-position-y={props.positionY} data-rotation-x={props.rotationX} data-rotation-y={props.rotationY} data-rotation-z={props.rotationZ} data-scale={props.scale} data-focal-length={props.focalLength} data-opacity={props.opacity} data-brightness={props.brightness} data-shape={props.shape} data-angle={props.angle.toFixed(4)} data-phase={props.phase}>
    <div className="webgl-host" ref={mount} />
    {(error || lost) && <div className="view-error" role="alert"><p>{error || '3D表示が中断されました。ページを再読み込みしてください。'}</p><button onClick={() => location.reload()}>再読み込み</button></div>}
    <svg className="grid-overlay" viewBox="0 0 100 100" aria-hidden="true" style={{ opacity: complete ? 0 : 1 }}>
      {Array.from({ length: Math.max(0, props.grid - 1) }, (_, i) => <path key={i} d={`M${100 * (i + 1) / props.grid} 0V100 M0 ${100 * (i + 1) / props.grid}H100`} />)}
    </svg>
    <div className="axis-labels" hidden={!props.showAxes || complete} data-testid="local-axes" aria-label="対象のローカル座標軸">
      {(['X', 'Y', 'Z'] as const).map((axis, i) => <span key={axis} ref={el => { labelRefs.current[i] = el; }}
        className={`axis-label axis-${axis} ${props.axis === axis ? 'selected' : ''}`}>{axis}</span>)}
    </div>
    {complete && <div className="celebration" key={props.completedAt}>
      {!props.reducedMotion && <div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <span key={i} style={{
        '--dx': `${Math.cos(i * 2.39996) * (70 + i % 5 * 15)}px`, '--dy': `${Math.sin(i * 2.39996) * 70 + 50}px`,
        '--turn': `${i * 47}deg`, '--delay': `${i % 4 * 35}ms`, '--confetti-color': `var(--confetti-${i % 4})`,
      } as CSSProperties} />)}</div>}
      <div className="cheer" role="status"><strong>セッション完了！</strong><span>今日の練習、おつかれさま！</span></div>
    </div>}
  </div>;
}
