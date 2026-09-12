import { PerspectiveCamera, Vector3 } from 'three';
export type Point = [number, number];
export type PerspectiveSubject = 'cube' | 'head-torso';
export type Edge = { a: Point; b: Point; axis: number; visible?: boolean };
export function extendLine(a: Point, b: Point): [Point, Point] | null {
 const dx=b[0]-a[0],dy=b[1]-a[1],hits:Point[]=[];
 if(Math.abs(dx)>1e-8)for(const x of [0,100]){const y=a[1]+(x-a[0])*dy/dx;if(y>=-1e-6&&y<=100.000001)hits.push([x,y]);}
 if(Math.abs(dy)>1e-8)for(const y of [0,100]){const x=a[0]+(y-a[1])*dx/dy;if(x>=-1e-6&&x<=100.000001)hits.push([x,y]);}
 const unique=hits.filter((p,i)=>!hits.slice(0,i).some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5));
 return unique.length>=2?[unique[0],unique[1]]:null;
}
export function perspectiveExercise(index: number, subject: PerspectiveSubject = 'cube') {
 const camera=new PerspectiveCamera(42,1,.1,100);
 camera.position.set(4,2.4,7);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const project=(v:Vector3):Point=>{v.project(camera);return [(v.x+1)*50,(1-v.y)*50];};
 const yaw=(index*23+8)*Math.PI/180;
 const parts=subject==='cube'?[{size:[2,2,2],position:[0,0,0],tilt:0}]:[
  {size:[1.2,1.55,.75],position:[0,-.55,0],tilt:-10},
  {size:[.70,.85,.70],position:[0,1.03,.12],tilt:14},
 ];
 const allEdges:Edge[]=[],allFaces:Point[][]=[];
 for(const part of parts){
 const vertices=Array.from({length:8},(_,i)=>new Vector3((i&1?1:-1)*part.size[0]/2,(i&2?1:-1)*part.size[1]/2,(i&4?1:-1)*part.size[2]/2)
  .applyAxisAngle(new Vector3(1,0,0),part.tilt*Math.PI/180).add(new Vector3(...part.position as [number,number,number])).applyAxisAngle(new Vector3(0,1,0),yaw));
 const points=vertices.map(v=>project(v.clone()));
 const edges:Edge[]=[];
 for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++)if(!(i&(1<<axis)))edges.push({a:points[i],b:points[i|(1<<axis)],axis});
 const definitions=[[0,2,6,4],[1,5,7,3],[0,4,5,1],[2,3,7,6],[0,1,3,2],[4,6,7,5]];
 const visibleFaces=definitions.map(ids=>{
  const a=vertices[ids[0]],b=vertices[ids[1]],c=vertices[ids[2]];
  const normal=b.clone().sub(a).cross(c.clone().sub(a));
  return {ids,visible:normal.dot(camera.position.clone().sub(a))>0};
 }).filter(f=>!f.visible);
 let edgeIndex=0;
 for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++)if(!(i&(1<<axis))){edges[edgeIndex++].visible=visibleFaces.some(f=>f.ids.includes(i)&&f.ids.includes(i|(1<<axis)));}
 const faces=visibleFaces.map(f=>f.ids.map(i=>points[i]));
 allEdges.push(...edges);allFaces.push(...faces);
 }
 // The horizontal vanishing line: world horizontal direction perpendicular to camera right.
 const horizon=project(new Vector3(-4e6,0,-7e6))[1];
 return {edges:allEdges,faces:allFaces,horizon};
}
