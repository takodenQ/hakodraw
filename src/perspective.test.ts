import { describe, expect, it } from 'vitest';
import { extendLine, perspectiveExercise, perspectivePose } from './perspective';
describe('perspective projection',()=>{
 it('clips vertical, horizontal and diagonal lines without invalid coordinates',()=>{
  expect(extendLine([20,30],[20,60])).toEqual([[20,0],[20,100]]);
  expect(extendLine([30,20],[60,20])).toEqual([[0,20],[100,20]]);
  expect(extendLine([10,10],[90,90])).toEqual([[0,0],[100,100]]);
  expect(extendLine([1,1],[1,1])).toBeNull();
 });
 it('keeps every cube in frame and horizontal edge intersections on the horizon',()=>{
  for(const seed of [0,1,12345,2**30])for(let index=0;index<60;index++){
   const e=perspectiveExercise(index,seed);expect(e.faces.length).toBeGreaterThanOrEqual(2);expect(e.faces.length).toBeLessThanOrEqual(3);
   expect(e.edges).toHaveLength(12);
   for(const edge of e.edges)for(const p of [edge.a,edge.b])for(const v of p){expect(v).toBeGreaterThan(0);expect(v).toBeLessThan(100);}
   for(const axis of [0,2]){
    const [a,b]=e.edges.filter(x=>x.axis===axis);
    const dx=a.b[0]-a.a[0],dy=a.b[1]-a.a[1],ex=b.b[0]-b.a[0],ey=b.b[1]-b.a[1];
    const determinant=dx*ey-dy*ex;
    if(Math.abs(determinant)>1e-2){const t=((b.a[0]-a.a[0])*ey-(b.a[1]-a.a[1])*ex)/determinant;expect(a.a[1]+t*dy).toBeCloseTo(e.horizon,2);}
   }
  }
 });
});
describe('random cube pose',()=>{
 it('is repeatable for the same seed and question, so going back shows the same cube',()=>{
  expect(perspectivePose(7,42)).toEqual(perspectivePose(7,42));
  expect(perspectiveExercise(7,42)).toEqual(perspectiveExercise(7,42));
 });
 it('differs between seeds',()=>{
  expect(perspectivePose(0,1)).not.toEqual(perspectivePose(0,2));
  expect(perspectiveExercise(3,1).horizon).not.toBe(perspectiveExercise(3,2).horizon);
 });
 it('turns at least 60° from the previous question and keeps the eye level in a natural range',()=>{
  for(const seed of [3,99,2**29]){
   let previous=perspectivePose(0,seed);
   for(let index=1;index<120;index++){
    const pose=perspectivePose(index,seed);
    const turn=(pose.yaw-previous.yaw+360)%360;
    expect(turn).toBeGreaterThanOrEqual(60-1e-9);expect(turn).toBeLessThanOrEqual(300+1e-9);
    expect(pose.elevation).toBeGreaterThanOrEqual(8);expect(pose.elevation).toBeLessThanOrEqual(38);
    previous=pose;
   }
  }
 });
 it('covers many different directions and eye heights over a session',()=>{
  const yaws=new Set<number>(),horizons=new Set<number>();
  for(let index=0;index<24;index++){const pose=perspectivePose(index,5);yaws.add(Math.floor(pose.yaw/45));horizons.add(Math.round(perspectiveExercise(index,5).horizon));}
  expect(yaws.size).toBeGreaterThanOrEqual(6);
  expect(horizons.size).toBeGreaterThanOrEqual(8);
 });
});
