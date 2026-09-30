import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import GlassShimmerButton from '@/components/rareui/GlassShimmerButton';
import { useSession } from './useSession';
import { extendLine, perspectiveExercise, randomSeed, type Point } from './perspective';
import type { Mode } from './ModeNav';
import CompletionCard from './CompletionCard';
import { COURSE, nextStep, planFor, type CourseStep, type StepPlan } from './course';
import { estimateSeconds, formatDuration } from './format';
import { primeAudio } from './sound';
import { useSessionLogger } from './useSessionLogger';
import { useChime, useSessionKeys, useWakeLock } from './useSessionAids';
import type { ProgressApi } from './useProgress';

function Drawing({index,seed,horizon,guides,answer,enabled,strokes,onChange}: {index:number;seed:number;horizon:number;guides:number;answer:boolean;enabled:boolean;strokes:Point[][];onChange:(s:Point[][])=>void}) {
 const [draft,setDraft]=useState<Point[]>([]);const active=useRef<{id:number;points:Point[]}|null>(null);
 const exercise=useMemo(()=>perspectiveExercise(index,seed),[index,seed]);
 const point=(e:PointerEvent<SVGSVGElement>):Point=>{const r=e.currentTarget.getBoundingClientRect();return [Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))];};
 const finish=(e:PointerEvent<SVGSVGElement>)=>{if(active.current?.id!==e.pointerId)return;const p=active.current.points;active.current=null;setDraft([]);if(p.length>1&&enabled)onChange([...strokes,p]);};
 return <svg className="perspective-board drawing-board" viewBox="0 0 100 100" aria-label="描画キャンバス" data-strokes={strokes.length}
 onPointerDown={e=>{if(!enabled||e.button!==0||active.current)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const p=point(e);active.current={id:e.pointerId,points:[p]};setDraft([p]);}}
 onPointerMove={e=>{if(!enabled||active.current?.id!==e.pointerId)return;active.current.points.push(point(e));setDraft([...active.current.points]);}}
 onPointerUp={finish} onLostPointerCapture={finish} onPointerCancel={()=>{active.current=null;setDraft([]);}}>
 <line className="eye-level" x1="0" x2="100" y1={horizon} y2={horizon}/>
 <g opacity={guides/100}>{exercise.edges.map((edge,i)=>{const p=extendLine(edge.a,edge.b);return p&&<line key={i} className={'guide guide-'+edge.axis} x1={p[0][0]} y1={p[0][1]} x2={p[1][0]} y2={p[1][1]}/>;})}</g>
 {strokes.map((s,i)=><polyline className="draw-stroke" key={i} points={s.map(p=>p.join(',')).join(' ')}/>)}
 {enabled&&<polyline className="draw-stroke" points={draft.map(p=>p.join(',')).join(' ')}/>}
 {answer&&<g className="answer-lines">{exercise.edges.map((e,i)=><line key={i} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]}/>)}</g>}
 </svg>;
}
interface Props {onNavigate:(mode:Mode)=>void;onLock:(locked:boolean)=>void;sound:boolean;onSound:()=>void;plan:{count:number;seconds:number}|null;step:{step:CourseStep;quick:boolean}|null;progress:ProgressApi;onStartPlan:(plan:StepPlan,quick:boolean)=>void;warning:string}
export default function PerspectivePractice({onNavigate,onLock,sound,onSound,plan,step,progress,onStartPlan,warning}:Props) {
 const {session,dispatch}=useSession(true);
 const [count,setCount]=useState(String(plan?.count??12)),[seconds,setSeconds]=useState(String(plan?.seconds??30)),[guides,setGuides]=useState(18);
 const [seed,setSeed]=useState(randomSeed);
 const [drawings,setDrawings]=useState<Record<number,Point[][]>>({});const [checked,setChecked]=useState<number|null>(null);
 const setup=session.phase==='setup',complete=session.phase==='complete',paused=session.phase==='paused';
 const valid=/^\d+$/.test(count)&&+count>=1&&+count<=360&&/^\d+$/.test(seconds)&&+seconds>=1&&+seconds<=3600;
 const exercise=useMemo(()=>perspectiveExercise(session.index,seed),[session.index,seed]),strokes=drawings[session.index]??[];
 const update=(s:Point[][])=>setDrawings(old=>({...old,[session.index]:s}));
 const logId=useSessionLogger(session,{mode:'perspective',label:'パース：立方体',stepId:step&&!step.quick?step.step.id:undefined,onLog:progress.record});
 useWakeLock(!setup&&!complete);useChime(session,sound);
 useEffect(()=>{if(setup)setSeed(randomSeed());},[setup]);
 const start=()=>{if(!valid)return;primeAudio();if(complete)setSeed(randomSeed());setDrawings({});setChecked(null);dispatch({type:'start',exercise:{count:+count,seconds:+seconds,axis:'Y'},now:performance.now()});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));};
 const move=(delta:-1|1)=>{if(delta<0&&session.index===0)return;setChecked(null);dispatch({type:'move',delta,now:performance.now(),duration:0});};
 useSessionKeys(!setup&&!complete,{toggle:()=>{setChecked(null);dispatch({type:paused?'resume':'pause',now:performance.now()});},previous:()=>move(-1),next:()=>move(1)});
 const next=nextStep(progress.progress.logs);
 // 練習中は、共通ヘッダーのタブを切り替えられないようにする。
 const locked=!setup&&!complete;
 useEffect(()=>{onLock(locked);return()=>onLock(false);},[locked,onLock]);
 return <>
 <p className="perspective-intro">問題ごとに、立方体の向きと目線の高さがランダムに変わります。お手本を見ながら、薄いパース線をなぞって立方体を描きましょう。</p>
 {setup&&step&&<section className="course-banner" aria-label="コースの案内"><p className="eyebrow">はじめてのコース ステップ {COURSE.indexOf(step.step)+1} / {COURSE.length}{step.quick?'（1分だけ）':''}</p><h2>{step.step.title}</h2><p>{step.step.aim}</p><p className="muted">描くコツ：{step.step.tip}</p></section>}
 <div className="perspective-pair">
 <section><h2>お手本</h2><svg className="perspective-board" viewBox="0 0 100 100" role="img" aria-label="立方体のお手本">
 <line className="eye-level" x1="0" x2="100" y1={exercise.horizon} y2={exercise.horizon}/>
 {exercise.faces.map((f,i)=><polygon className={'reference-face face-'+i%3} key={i} points={f.map(p=>p.join(',')).join(' ')}/>)}
 {exercise.edges.map((e,i)=><line className="reference-edge" style={{opacity:e.visible?1:.22,strokeDasharray:e.visible?undefined:'1 .8'}} key={i} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]}/>)}</svg></section>
 <section><h2>描いてみよう</h2><Drawing key={session.index+':'+session.phase} seed={seed} index={session.index} horizon={exercise.horizon} guides={guides} answer={checked===session.index||complete} enabled={session.phase==='running'} strokes={strokes} onChange={update}/></section>
 </div>
 <div className="perspective-bottom">
 <p className="muted">破線は共通のアイレベル。X・Y・Z方向の補助線を薄く表示しています。</p>
 <div className="drawing-tools"><button disabled={!strokes.length||complete} onClick={()=>update(strokes.slice(0,-1))}>一筆戻す</button><button disabled={!strokes.length||complete} onClick={()=>update([])}>線を消す</button><button disabled={setup||complete} aria-pressed={checked===session.index} onClick={()=>{dispatch({type:'pause',now:performance.now()});setChecked(checked===session.index?null:session.index);}}>答えを重ねる</button></div>
 <label className="range-setting"><span>補助線の濃さ<output>{guides}%</output></span><input aria-label="補助線の濃さ" type="range" min="0" max="50" value={guides} onChange={e=>setGuides(+e.target.value)}/></label>
 {setup?<><div className="number-fields"><label>問題数<input type="number" min="1" max="360" value={count} onChange={e=>setCount(e.target.value)}/></label><label>1問の秒数<input type="number" min="1" max="3600" value={seconds} onChange={e=>setSeconds(e.target.value)}/></label></div>{valid&&<p className="muted total-time">全部で{formatDuration(estimateSeconds(+count,+seconds,0))}です。</p>}<button className="quiet sound-toggle" aria-pressed={sound} onClick={onSound}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}切り替え音：{sound?'あり':'なし'}</button><GlassShimmerButton className="start-button mt-6 w-full" disabled={!valid} onClick={start}>練習スタート</GlassShimmerButton>{!valid&&<p role="alert">問題数は1〜360、秒数は1〜3600の整数を入力してください。</p>}</>:complete?<CompletionCard title="練習完了！" summary={`${session.exercise.count}問、おつかれさまでした。`} logId={logId} progress={progress.progress} api={progress} onAchievements={()=>onNavigate('achievements')} next={next} onRate={progress.rate} onAgain={start} onSetup={()=>dispatch({type:'exit'})} onHome={()=>onNavigate('home')} onNext={()=>{if(next)onStartPlan(planFor(next,progress.progress.logs),false);}}/>:<>
 <div className="progress-label"><span>{session.index+1} / {session.exercise.count}問</span><span className="seconds">残り{Math.ceil(session.remaining)}秒</span></div>
 <div className={`time-track ${session.remaining<=10?'last-seconds':''} ${paused?'paused':''}`} role="progressbar" aria-label="残り時間" aria-valuemin={0} aria-valuemax={session.exercise.seconds} aria-valuenow={Math.ceil(session.remaining)}><div style={{transform:`scaleX(${session.remaining/session.exercise.seconds})`}}/></div>
 <p className="angle">{paused?'一時停止中 · 再開すると描けます':'マウス・ペン・指で線を引けます'}</p>
 <div className="navigation"><button disabled={session.index===0} onClick={()=>move(-1)}>前へ</button><button className="primary" onClick={()=>{setChecked(null);dispatch({type:paused?'resume':'pause',now:performance.now()});}}>{paused?'再開':'一時停止'}</button><button onClick={()=>move(1)}>次へ</button></div>
 <div className="session-aids"><button className="quiet sound-toggle" aria-pressed={sound} onClick={onSound}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}切り替え音：{sound?'あり':'なし'}</button><span className="muted key-hint">スペース：一時停止　←→：前後</span></div><button className="quiet exit" onClick={()=>dispatch({type:'exit'})}>練習を終了</button>
 </>}
 {warning&&<p className="storage-warning" role="status">{warning}</p>}
 </div></>;
}
