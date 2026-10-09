import { PerspectiveCamera, Vector3 } from 'three';
import { mulberry32 } from './random';
export { randomSeed } from './random';
export type Point = [number, number];
export type Edge = { a: Point; b: Point; axis: number; visible?: boolean };
export function extendLine(a: Point, b: Point): [Point, Point] | null {
 const dx=b[0]-a[0],dy=b[1]-a[1],hits:Point[]=[];
 if(Math.abs(dx)>1e-8)for(const x of [0,100]){const y=a[1]+(x-a[0])*dy/dx;if(y>=-1e-6&&y<=100.000001)hits.push([x,y]);}
 if(Math.abs(dy)>1e-8)for(const y of [0,100]){const x=a[0]+(y-a[1])*dx/dy;if(x>=-1e-6&&x<=100.000001)hits.push([x,y]);}
 const unique=hits.filter((p,i)=>!hits.slice(0,i).some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5));
 return unique.length>=2?[unique[0],unique[1]]:null;
}
/** 立方体の向き（Y回転）と目線の高さ。同じ seed・問題番号なら常に同じ。前の問題から必ず60°以上回す。 */
export function perspectivePose(index:number,seed:number){
 const random=mulberry32(seed);
 let yaw=random()*360,elevation=8+random()*30;
 for(let i=1;i<=index;i++){yaw=(yaw+60+random()*240)%360;elevation=8+random()*30;}
 return {yaw,elevation};
}
const DISTANCE=8.4,AZIMUTH=29.7*Math.PI/180;
export function perspectiveExercise(index: number, seed = 0) {
 const {yaw:yawDegrees,elevation:elevationDegrees}=perspectivePose(index,seed);
 const elevation=elevationDegrees*Math.PI/180;
 const camera=new PerspectiveCamera(42,1,.1,100);
 camera.position.set(DISTANCE*Math.cos(elevation)*Math.sin(AZIMUTH),DISTANCE*Math.sin(elevation),DISTANCE*Math.cos(elevation)*Math.cos(AZIMUTH));
 camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const project=(v:Vector3):Point=>{v.project(camera);return [(v.x+1)*50,(1-v.y)*50];};
 const yaw=yawDegrees*Math.PI/180;
 const vertices=Array.from({length:8},(_,i)=>new Vector3(i&1?1:-1,i&2?1:-1,i&4?1:-1).applyAxisAngle(new Vector3(0,1,0),yaw));
 const points=vertices.map(v=>project(v.clone()));
 const edges:Edge[]=[];
 for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++)if(!(i&(1<<axis)))edges.push({a:points[i],b:points[i|(1<<axis)],axis});
 const definitions=[[0,2,6,4],[1,5,7,3],[0,4,5,1],[2,3,7,6],[0,1,3,2],[4,6,7,5]];
 const frontFaces=definitions.map(ids=>{
  const a=vertices[ids[0]],b=vertices[ids[1]],c=vertices[ids[2]];
  const normal=b.clone().sub(a).cross(c.clone().sub(a));
  return {ids,visible:normal.dot(camera.position.clone().sub(a))>0};
 }).filter(f=>!f.visible);
 let edgeIndex=0;
 for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++)if(!(i&(1<<axis))){edges[edgeIndex++].visible=frontFaces.some(f=>f.ids.includes(i)&&f.ids.includes(i|(1<<axis)));}
 const faces=frontFaces.map(f=>f.ids.map(i=>points[i]));
 // アイレベル（水平消失線）：カメラから水平方向へ無限に遠い点の投影。回転や目線の高さが変わっても水平辺の消失点はこの線上に乗る。
 const forward=new Vector3(-camera.position.x,0,-camera.position.z).normalize();
 const horizon=project(camera.position.clone().add(forward.multiplyScalar(1e7)))[1];
 return {edges,faces,horizon};
}
