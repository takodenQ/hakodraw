import { Euler, Quaternion, Vector3, MathUtils } from 'three';
import type { Settings } from './settings';
import type { ViewState } from './scene/renderer';
type Point = { x: number; y: number; button: number; touch: boolean };
export function bindViewControls(host: HTMLElement, read: () => ViewState, change: (patch: Partial<Settings>) => void) {
 const points=new Map<number,Point>();
 const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,Math.round(v)));
 const pan=(x:number,y:number)=>{const s=read();change({positionX:clamp(s.positionX+x/host.clientWidth*200,-100,100),positionY:clamp(s.positionY-y/host.clientHeight*200,-100,100)});};
 const zoom=(f:number)=>change({scale:clamp(read().scale*f,50,150)});
 const sphere=(p:Point)=>{const r=host.getBoundingClientRect(),x=(p.x-r.left)/r.width*2-1,y=1-(p.y-r.top)/r.height*2;return new Vector3(x,y,Math.sqrt(Math.max(0,1-x*x-y*y))).normalize();};
 const down=(e:PointerEvent)=>{if(read().phase==='complete'||![0,2].includes(e.button))return;e.preventDefault();host.focus({preventScroll:true});host.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,touch:e.pointerType==='touch'});};
 const move=(e:PointerEvent)=>{const a=points.get(e.pointerId);if(!a)return;const b={...a,x:e.clientX,y:e.clientY},other=[...points.entries()].find(([id])=>id!==e.pointerId)?.[1];points.set(e.pointerId,b);if(read().phase==='complete')return;
 if(other&&a.touch){pan((b.x-a.x)/2,(b.y-a.y)/2);const old=Math.hypot(a.x-other.x,a.y-other.y),dist=Math.hypot(b.x-other.x,b.y-other.y);if(old>8&&dist>8)zoom(dist/old);}
 else if(a.button===2)pan(b.x-a.x,b.y-a.y);
 else if(read().phase==='setup'){const s=read(),q=new Quaternion().setFromEuler(new Euler(...[s.rotationX,s.rotationY,s.rotationZ].map(MathUtils.degToRad) as [number,number,number],'XYZ'));q.premultiply(new Quaternion().setFromUnitVectors(sphere(a),sphere(b)));const v=new Euler().setFromQuaternion(q,'XYZ');change({rotationX:Math.round(MathUtils.radToDeg(v.x)),rotationY:Math.round(MathUtils.radToDeg(v.y)),rotationZ:Math.round(MathUtils.radToDeg(v.z))});}};
 const up=(e:PointerEvent)=>{points.delete(e.pointerId);};
 const wheel=(e:WheelEvent)=>{if(read().phase==='complete')return;e.preventDefault();zoom(Math.exp(-e.deltaY*(e.deltaMode===1?.03:e.deltaMode===2?.5:.002)));};
 const context=(e:Event)=>e.preventDefault();
 const key=(e:KeyboardEvent)=>{if(read().phase==='complete')return;const dirs:Record<string,[number,number]>={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(dirs[e.key]){e.preventDefault();const[x,y]=dirs[e.key],s=read();if(e.shiftKey&&s.phase==='setup')change({rotationX:clamp(s.rotationX+y,-180,180),rotationY:clamp(s.rotationY+x,-180,180)});else pan(x,y);}if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?.9:1.1);}};
 host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);host.addEventListener('lostpointercapture',up);host.addEventListener('wheel',wheel,{passive:false});host.addEventListener('contextmenu',context);host.addEventListener('keydown',key);
 return()=>{points.clear();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('lostpointercapture',up);host.removeEventListener('wheel',wheel);host.removeEventListener('contextmenu',context);host.removeEventListener('keydown',key);};
}
