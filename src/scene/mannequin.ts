import * as THREE from 'three';

// Artist-adjustable cross sections: height, half-width, front depth, back depth.
// Y is up, +Z is front. Dimensions are approximate, not anatomical measurements.
type Ring = [number, number, number, number];
export interface BodyPart { name: string; position: number[]; rotation: number[]; rings: Ring[]; joint?: boolean }
export const BODY_PARTS: BodyPart[] = [
 {name:'head',position:[0,0,0],rotation:[0,0,0],rings:[[6.45,.025,.12,.05],[6.57,.22,.26,.19],[6.83,.33,.31,.32],[7.12,.36,.27,.37],[7.36,.27,.20,.28],[7.48,.035,.035,.035]]},
 {name:'neck',position:[0,0,0],rotation:[0,0,0],joint:true,rings:[[6.05,.24,.16,.20],[6.25,.18,.15,.19],[6.62,.18,.14,.19]]},
 {name:'ribcage',position:[0,0,0],rotation:[0,0,0],rings:[[5.15,.36,.25,.24],[5.35,.49,.34,.30],[5.70,.56,.34,.34],[5.98,.52,.24,.29],[6.12,.27,.17,.21]]},
 {name:'abdomen',position:[0,0,0],rotation:[0,0,0],joint:true,rings:[[4.45,.40,.25,.24],[4.7,.32,.23,.21],[4.98,.33,.22,.23],[5.3,.43,.27,.27]]},
 {name:'pelvis',position:[0,0,0],rotation:[0,0,0],rings:[[3.78,.18,.19,.29],[3.98,.52,.29,.43],[4.22,.59,.28,.39],[4.48,.43,.24,.25],[4.62,.36,.22,.22]]},
];
for (const side of [-1,1]) {
 const add=(name:string,position:number[],rotation:number[],rings:Ring[],joint=false)=>BODY_PARTS.push({name:`${side<0?'right':'left'}-${name}`,position,rotation,rings,joint});
 add('chest',[side*.27,5.48,.27],[0,0,side*8],[[-.23,.045,.04,.06],[-.13,.22,.19,.11],[.08,.24,.21,.09],[.28,.07,.03,.05]]);
 add('shoulder',[side*.65,5.85,0],[0,0,side*22],[[-.26,.18,.19,.18],[0,.24,.24,.24],[.22,.14,.16,.16]]);
 add('upper-arm',[side*.81,5.42,0],[0,0,side*22],[[-.49,.13,.13,.13],[-.20,.18,.19,.17],[.17,.20,.20,.20],[.43,.17,.17,.17]]);
 add('elbow',[side*1.00,4.93,0],[0,0,side*22],[[-.14,.10,.10,.10],[0,.15,.15,.15],[.14,.10,.10,.10]],true);
 add('forearm',[side*1.20,4.47,.015],[0,0,side*25],[[-.49,.085,.085,.08],[-.23,.12,.13,.11],[.19,.18,.17,.15],[.43,.12,.12,.11]]);
 add('wrist',[side*1.42,3.99,.015],[0,0,side*15],[[-.10,.08,.08,.07],[.10,.09,.09,.08]],true);
 add('palm',[side*1.46,3.79,.03],[0,0,side*10],[[-.19,.12,.065,.06],[.12,.13,.08,.065],[.20,.075,.065,.055]]);
 for(let finger=0;finger<4;finger++)add(`finger-${finger+1}`,[side*(1.36+finger*.067),3.49+(finger===3?.05:0),.04],[0,0,side*8],[[-.18,.023,.025,.025],[0,.030,.034,.03],[.15,.028,.032,.03]]);
 add('thumb',[side*1.31,3.70,.10],[0,0,-side*22],[[-.17,.027,.035,.03],[0,.045,.05,.04],[.12,.04,.04,.035]]);
 add('thigh',[side*.40,0,-.015],[0,0,0],[[2.47,.15,.17,.15],[2.85,.21,.23,.20],[3.35,.30,.31,.30],[3.81,.33,.30,.36],[4.06,.23,.23,.26]]);
 add('knee',[side*.40,2.36,.015],[0,0,0],[[-.20,.12,.12,.10],[0,.17,.18,.13],[.18,.14,.14,.12]],true);
 add('shin',[side*.40,0,-.04],[0,0,0],[[.62,.095,.10,.10],[1.12,.13,.12,.17],[1.66,.23,.16,.28],[1.98,.22,.15,.23],[2.25,.14,.12,.14]]);
 add('ankle',[side*.40,.58,-.025],[0,0,0],[[-.13,.10,.10,.10],[0,.12,.12,.13],[.14,.09,.09,.10]],true);
 add('foot',[side*.40,0,0],[0,0,0],[[.06,.18,.48,.17],[.15,.20,.51,.19],[.28,.16,.34,.17],[.50,.10,.12,.12],[.62,.08,.075,.085]]);
 add('ear',[side*.35,6.88,-.015],[0,0,0],[[-.14,.025,.045,.045],[0,.06,.06,.06],[.15,.025,.03,.03]]);
}

export function bodyGeometry(rings: Ring[]) {
 const segments=12, vertices:number[]=[], indices:number[]=[];
 for(const [y,width,front,back] of rings)for(let i=0;i<segments;i++) {
  const a=i/segments*Math.PI*2, z=Math.cos(a);
  vertices.push(Math.sin(a)*width,y,z*(z>=0?front:back));
 }
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++) {
  const a=r*segments+i,b=r*segments+(i+1)%segments,c=b+segments,d=a+segments;
  indices.push(a,b,d,b,c,d);
 }
 const bottom=vertices.length/3;vertices.push(0,rings[0][0],0);
 const top=vertices.length/3;vertices.push(0,rings[rings.length-1][0],0);
 for(let i=0;i<segments;i++){const j=(i+1)%segments;indices.push(bottom,j,i);const end=(rings.length-1)*segments;indices.push(top,end+i,end+j);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 // Draw cross contours instead of every polygon edge, including through the body.
 const lines:number[]=[];
 const line=(a:number,b:number)=>lines.push(...vertices.slice(a*3,a*3+3),...vertices.slice(b*3,b*3+3));
 for(let r=0;r<rings.length-1;r++)for(const i of [0,3,6,9])line(r*segments+i,(r+1)*segments+i);
 for(const r of new Set([0,Math.floor((rings.length-1)/2),rings.length-1]))for(let i=0;i<segments;i++)line(r*segments+i,r*segments+(i+1)%segments);
 geometry.userData.contours=new THREE.BufferGeometry();
 geometry.userData.contours.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
 return geometry;
}
