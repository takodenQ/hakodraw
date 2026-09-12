import { describe, expect, it } from 'vitest';
import { extendLine, perspectiveExercise } from './perspective';
describe('perspective projection',()=>{
 it('clips vertical, horizontal and diagonal lines without invalid coordinates',()=>{
  expect(extendLine([20,30],[20,60])).toEqual([[20,0],[20,100]]);
  expect(extendLine([30,20],[60,20])).toEqual([[0,20],[100,20]]);
  expect(extendLine([10,10],[90,90])).toEqual([[0,0],[100,100]]);
  expect(extendLine([1,1],[1,1])).toBeNull();
 });
 it('keeps every cube in frame and horizontal edge intersections on the horizon',()=>{
  for(let index=0;index<24;index++){
   const e=perspectiveExercise(index);expect(e.faces.length).toBeGreaterThanOrEqual(2);expect(e.faces.length).toBeLessThanOrEqual(3);
   for(const edge of e.edges)for(const p of [edge.a,edge.b])for(const v of p){expect(v).toBeGreaterThan(0);expect(v).toBeLessThan(100);}
   for(const axis of [0,2]){
    const [a,b]=e.edges.filter(x=>x.axis===axis);
    const dx=a.b[0]-a.a[0],dy=a.b[1]-a.a[1],ex=b.b[0]-b.a[0],ey=b.b[1]-b.a[1];
    const determinant=dx*ey-dy*ex;
    if(Math.abs(determinant)>1e-6){const t=((b.a[0]-a.a[0])*ey-(b.a[1]-a.a[1])*ex)/determinant;expect(a.a[1]+t*dy).toBeCloseTo(e.horizon,3);}
   }
  }
 });
});
