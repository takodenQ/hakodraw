import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BODY_SETS, JOINTS, PARTS, bodyPose, jointRotation, linkPivot, shapeCenter, type JointId, type PartId } from './body';
import { bodyGeometry } from './scene/bodyMesh';

const box = (part: PartId) => {
  const b = new THREE.Box3();
  for (const s of PARTS[part].shapes) { const g = bodyGeometry(s);g.computeBoundingBox();b.union(g.boundingBox!);g.dispose(); }
  return b;
};
/** 関節を回したとき、ピボットから見た点がどこへ動くか。 */
const moved = (joint: JointId, angles: Parameters<typeof jointRotation>[1], point: number[]) => {
  const pivot = new THREE.Vector3(...JOINTS[joint].pivot);
  return new THREE.Vector3(point[0], point[1], point[2]).sub(pivot).applyQuaternion(jointRotation(JOINTS[joint], angles)).add(pivot);
};

describe('model from the three-view drawing', () => {
  it('stands 7.5 heads tall with the head on top and the soles on the ground', () => {
    expect(box('head').max.y).toBeCloseTo(750, 5);
    expect(box('head').max.y - box('head').min.y).toBeCloseTo(92, 5);
    expect(box('footR').min.y).toBeCloseTo(0, 5);
  });
  it('keeps the drawn proportions and tilts', () => {
    const head = PARTS.head.shapes[0], thorax = PARTS.thorax.shapes[0], pelvis = PARTS.pelvis.shapes[0];
    if (head.kind !== 'loft' || thorax.kind !== 'loft' || pelvis.kind !== 'loft') throw new Error('loft expected');
    expect([head.top.w, head.top.d]).toEqual([62, 90]);
    expect(thorax.top.tilt).toBeCloseTo(-9.45, 1);   // 胸郭は上が後ろへ傾く
    expect(pelvis.top.tilt).toBeCloseTo(7.03, 1);    // 骨盤は前へ傾く
    expect(pelvis.bottom.w).toBeGreaterThan(pelvis.top.w);
  });
  it('mirrors the left side', () => {
    expect(shapeCenter(PARTS.shoulderL.shapes[0])).toEqual([64, shapeCenter(PARTS.shoulderR.shapes[0])[1], -12]);
    expect(box('thighL').min.x).toBeCloseTo(-box('thighR').max.x, 6);
    expect(JOINTS.hipL.dofs.find(d => d.axis === 'z')).toMatchObject({ min: -15, max: 40 });
  });
});

describe('connection sets', () => {
  it('start from a root and attach each part after its parent', () => {
    for (const [id, links] of Object.entries(BODY_SETS)) {
      expect(links[0].parent, id).toBeUndefined();
      links.slice(1).forEach((link, i) => expect(links.slice(0, i + 1).some(l => l.part === link.parent), `${id}:${link.part}`).toBe(true));
    }
  });
  it('place every joint where the parent and child meet', () => {
    // 三面図でも、肩・膝の球は胸郭や太ももの箱から少しはみ出す（球の半径ほど）。それより大きなずれは写し間違い。
    for (const links of Object.values(BODY_SETS)) for (const link of links) {
      if (!link.parent) continue;
      const pivot = new THREE.Vector3(...linkPivot(link));
      expect(box(link.parent).expandByScalar(24).containsPoint(pivot), `${link.part} joint vs ${link.parent}`).toBe(true);
      expect(box(link.part).expandByScalar(24).containsPoint(pivot), `${link.part} joint vs itself`).toBe(true);
    }
  });
});

describe('anatomical directions', () => {
  const elbow = JOINTS.elbowR.pivot, wrist = JOINTS.wristR.pivot, knee = JOINTS.kneeR.pivot, ankle = JOINTS.ankleR.pivot;
  it('bends the elbow forward and the knee backward', () => {
    expect(moved('elbowR', { x: -90 }, wrist).z).toBeGreaterThan(wrist[2] + 80);
    expect(moved('kneeR', { x: 90 }, ankle).z).toBeLessThan(ankle[2] - 100);
  });
  it('raises the arm forward with flexion and outward with abduction, mirrored on the left', () => {
    expect(moved('shoulderR', { x: -90 }, elbow).z).toBeGreaterThan(80);
    expect(moved('shoulderR', { z: -90 }, elbow).x).toBeLessThan(elbow[0] - 80);
    const leftElbow = [-elbow[0], elbow[1], elbow[2]];
    expect(moved('shoulderL', { z: 90 }, leftElbow).x).toBeGreaterThan(leftElbow[0] + 80);
    expect(moved('hipR', { x: -90 }, knee).z).toBeGreaterThan(knee[2] + 120);
  });
  it('bends the trunk and the neck forward with positive flexion', () => {
    const neck = JOINTS.neck.pivot;
    expect(moved('lumbar', { x: 30 }, neck).z).toBeGreaterThan(neck[2] + 50);
    expect(moved('neck', { x: 30 }, [0, 700, 9]).z).toBeGreaterThan(9 + 20);
  });
  it('points the toes down with plantar flexion and the palm-side inward with wrist flexion', () => {
    const toe = [-26.5, 6, 52];
    expect(moved('ankleR', { x: 40 }, toe).y).toBeLessThan(toe[1] - 30);
    expect(moved('wristR', { z: 60 }, [-130, 327, 9.5]).x).toBeGreaterThan(-130 + 30);
  });
});

describe('random poses', () => {
  it('are repeatable per seed and question, and change between questions', () => {
    expect(bodyPose('arm-hand', 3, 4)).toEqual(bodyPose('arm-hand', 3, 4));
    expect(bodyPose('arm-hand', 3, 4)).not.toEqual(bodyPose('arm-hand', 3, 5));
    expect(bodyPose('arm-hand', 3, 4)).not.toEqual(bodyPose('arm-hand', 4, 4));
  });
  it('stay within each joint range and give unit rotations', () => {
    for (const id of Object.keys(BODY_SETS)) for (let index = 0; index < 120; index++) {
      const pose = bodyPose(id, 11, index);
      expect(Math.hypot(...pose.orientation)).toBeCloseTo(1, 9);
      for (const [joint, angles] of Object.entries(pose.angles) as [JointId, Record<string, number>][]) {
        for (const d of JOINTS[joint].dofs) {
          expect(angles[d.axis], `${joint}.${d.axis}`).toBeGreaterThanOrEqual(d.min);
          expect(angles[d.axis], `${joint}.${d.axis}`).toBeLessThanOrEqual(d.max);
        }
        expect(Math.hypot(...pose.joints[joint]!)).toBeCloseTo(1, 9);
      }
    }
  });
  it('bend every joint of the set, and only flex the elbow and knee one way', () => {
    for (const [id, links] of Object.entries(BODY_SETS)) expect(Object.keys(bodyPose(id, 1, 0).joints).sort()).toEqual(links.filter(l => l.joint).map(l => l.joint).sort());
    for (let index = 0; index < 100; index++) {
      expect(bodyPose('arm-hand', 5, index).angles.elbowR!.x!).toBeLessThanOrEqual(0);
      expect(bodyPose('leg-foot', 5, index).angles.kneeR!.x!).toBeGreaterThanOrEqual(0);
    }
  });
});
