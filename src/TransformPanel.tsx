import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Settings, Axis } from './settings';
export default function TransformPanel({ settings: s, setup, update, onAxis }: { settings: Settings; setup: boolean; update: (p: Partial<Settings>) => void; onAxis: (axis: Axis) => void }) {
 const [mode,setMode]=useState<'rotate'|'move'|'scale'>('rotate');
 const [axis,setAxis]=useState<Axis>('X');const [fine,setFine]=useState(false);
 const active=!setup&&mode==='rotate'?'move':mode;
 const key=('rotation'+axis) as 'rotationX'|'rotationY'|'rotationZ';
 const step=fine?1:15, moveStep=fine?1:5, sizeStep=fine?1:10;
 const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
 return <details className="transform-panel view-settings">
  <summary>オブジェクトの調整<ChevronDown size={16} aria-hidden="true" /></summary>
  <div className="transform-modes" role="group" aria-label="操作の種類">{(['rotate','move','scale'] as const).map((value,i)=><button key={value} disabled={value==='rotate'&&!setup} aria-pressed={active===value} onClick={()=>{setMode(value);if(value==='rotate')onAxis(axis);}}>{['回転','移動','大きさ'][i]}</button>)}</div>
  <label className="fine-control"><input type="checkbox" checked={fine} onChange={e=>setFine(e.target.checked)}/>細かく（1{active==='rotate'?'°':'%'}ずつ）</label>
  {active==='rotate'?<>
   <div className="transform-modes" role="group" aria-label="初期回転の軸">{(['X','Y','Z'] as Axis[]).map(a=><button key={a} className={'axis-'+a} aria-pressed={axis===a} onClick={()=>{setAxis(a);onAxis(a);}}>{a}軸</button>)}</div>
   <div className="step-row"><button aria-label="回転を減らす" disabled={s[key]<=-180} onClick={()=>{update({[key]:clamp(s[key]-step,-180,180)});onAxis(axis);}}>−{step}°</button><output>{s[key]}°</output><button aria-label="回転を増やす" disabled={s[key]>=180} onClick={()=>{update({[key]:clamp(s[key]+step,-180,180)});onAxis(axis);}}>＋{step}°</button></div>
   <input className="rotation-slider" type="range" aria-label={axis+'軸の初期回転'} min="-180" max="180" value={s[key]} onChange={e=>{update({[key]:Number(e.target.value)});onAxis(axis);}}/>
   <button className="quiet" onClick={()=>update({[key]:0})}>この軸を0°に戻す</button>
  </>:active==='move'?<>
   <div className="move-pad"><button className="up" aria-label="上へ移動" disabled={s.positionY>=100} onClick={()=>update({positionY:clamp(s.positionY+moveStep,-100,100)})}>↑</button><button className="left" aria-label="左へ移動" disabled={s.positionX<=-100} onClick={()=>update({positionX:clamp(s.positionX-moveStep,-100,100)})}>←</button><button className="center" onClick={()=>update({positionX:0,positionY:0})}>中央</button><button className="right" aria-label="右へ移動" disabled={s.positionX>=100} onClick={()=>update({positionX:clamp(s.positionX+moveStep,-100,100)})}>→</button><button className="down" aria-label="下へ移動" disabled={s.positionY<=-100} onClick={()=>update({positionY:clamp(s.positionY-moveStep,-100,100)})}>↓</button></div>
   <p className="muted">左右 {s.positionX}% · 上下 {s.positionY}%</p>
  </>:<><div className="step-row"><button aria-label="縮小" disabled={s.scale<=50} onClick={()=>update({scale:clamp(s.scale-sizeStep,50,150)})}>−{sizeStep}%</button><output>{s.scale}%</output><button aria-label="拡大" disabled={s.scale>=150} onClick={()=>update({scale:clamp(s.scale+sizeStep,50,150)})}>＋{sizeStep}%</button></div><button className="quiet" onClick={()=>update({scale:100})}>100%に戻す</button></>}
 </details>;
}
