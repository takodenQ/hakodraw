import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BODY_SETS, BODY_TYPES, MODELS, bodyPose, jointRotation, linkPivot, pathAnchors, shapeCenter, type BodyModel, type BodyType, type JointId, type PartId } from './body';
import { bodyGeometry } from './scene/bodyMesh';

const TYPES = BODY_TYPES.map(item => item.id);
const box = (model: BodyModel, part: PartId) => {
  const b = new THREE.Box3();
  for (const s of model.parts[part]) { const g = bodyGeometry(s);g.computeBoundingBox();b.union(g.boundingBox!);g.dispose(); }
  return b;
};
const vec = (v: readonly number[]) => new THREE.Vector3(v[0], v[1], v[2]);
/** 関節を回したとき、ピボットから見た点がどこへ動くか。 */
const moved = (model: BodyModel, joint: JointId, angles: Parameters<typeof jointRotation>[1], point: readonly number[]) => {
  const pivot = vec(model.joints[joint].pivot);
  return vec(point).sub(pivot).applyQuaternion(jointRotation(model.joints[joint], angles)).add(pivot);
};
const loft = (model: BodyModel, part: PartId) => {
  const s = model.parts[part][0];
  if (s.kind !== 'loft') throw new Error(`${part} is not a loft`);
  return s;
};

describe('reading the three-view spec', () => {
  it('takes the anchor points of a path and skips curve control points', () => {
    expect(pathAnchors('M -51 265 L 51 265 L 49 300 Q 0 303 -49 300 Z')).toEqual([[-51, 265], [51, 265], [49, 300], [-49, 300]]);
    expect(pathAnchors('M -31.0 0.0 L 31.0 0.0 L 31.0 92.0 L -31.0 92.0 Z')).toHaveLength(4);
    // 始点へ戻る曲線で閉じるパスでも、始点は1回だけ
    expect(pathAnchors('M -97.5 164.5 L -104.0 237.3 Q -91.3 244.1 -77.3 241.0 L -63.8 169.2 Q -79.9 161.9 -97.5 164.5 Z'))
      .toEqual([[-104, 237.3], [-77.3, 241], [-63.8, 169.2], [-97.5, 164.5]]);
  });
});

describe.each(TYPES)('%s model', type => {
  const model = MODELS[type];
  it('stands 7.5 heads tall with the head on top and the soles on the ground', () => {
    expect(box(model, 'head').max.y).toBeCloseTo(750, 5);
    expect(box(model, 'head').max.y - box(model, 'head').min.y).toBeCloseTo(92, 5);
    expect(box(model, 'footR').min.y).toBeCloseTo(0, 5);
  });
  it('keeps the drawn tilts: the chest leans back and the pelvis tips forward', () => {
    expect(loft(model, 'thorax').top.tilt).toBeLessThan(-5);
    expect(loft(model, 'pelvis').top.tilt).toBeGreaterThan(3);   // 男性 約4°、女性 約7°
    expect(loft(model, 'pelvis').bottom.w).toBeGreaterThan(loft(model, 'pelvis').top.w);
  });
  it('puts the spec\'s _L side on the person\'s right (−X) and mirrors the left', () => {
    expect(model.joints.shoulderR.pivot[0]).toBeLessThan(0);
    expect(shapeCenter(model.parts.shoulderL[0])[0]).toBeCloseTo(-shapeCenter(model.parts.shoulderR[0])[0], 9);
    expect(box(model, 'thighL').min.x).toBeCloseTo(-box(model, 'thighR').max.x, 6);
    expect(model.joints.hipL.dofs.find(d => d.axis === 'z')).toMatchObject({ min: -15, max: 40 });
  });
  it('builds hands with a palm, fingers and a thumb, and feet that point forward', () => {
    expect(model.parts.handR).toHaveLength(3);
    const foot = box(model, 'footR');
    expect(foot.max.z).toBeGreaterThan(model.joints.ankleR.pivot[2] + 40);
  });
  it('places every joint where the parent and child meet', () => {
    // 肩・股関節・膝などの球は、隣の箱から球の半径ほどはみ出す。それより大きなずれは読み取り間違い。
    for (const links of Object.values(BODY_SETS)) for (const link of links) {
      if (!link.parent) continue;
      const pivot = vec(linkPivot(link, model));
      expect(box(model, link.parent).expandByScalar(24).containsPoint(pivot), `${link.part} joint vs ${link.parent}`).toBe(true);
      expect(box(model, link.part).expandByScalar(24).containsPoint(pivot), `${link.part} joint vs itself`).toBe(true);
    }
  });
  it('bends joints in anatomical directions', () => {
    const j = model.joints, length = (a: JointId, b: JointId) => vec(j[a].pivot).distanceTo(vec(j[b].pivot));
    // 肘は前、膝は後ろへ曲がる
    expect(moved(model, 'elbowR', { x: -90 }, j.wristR.pivot).z - j.wristR.pivot[2]).toBeGreaterThan(.7 * length('elbowR', 'wristR'));
    expect(moved(model, 'kneeR', { x: 90 }, j.ankleR.pivot).z - j.ankleR.pivot[2]).toBeLessThan(-.7 * length('kneeR', 'ankleR'));
    // 肩の屈曲は前へ、外転は外（右腕は −X、左腕は +X）へ
    expect(moved(model, 'shoulderR', { x: -90 }, j.elbowR.pivot).z - j.elbowR.pivot[2]).toBeGreaterThan(.7 * length('shoulderR', 'elbowR'));
    expect(moved(model, 'shoulderR', { z: -90 }, j.elbowR.pivot).x - j.elbowR.pivot[0]).toBeLessThan(-.5 * length('shoulderR', 'elbowR'));
    expect(moved(model, 'shoulderL', { z: 90 }, j.elbowL.pivot).x - j.elbowL.pivot[0]).toBeGreaterThan(.5 * length('shoulderL', 'elbowL'));
    expect(moved(model, 'hipR', { x: -90 }, j.kneeR.pivot).z - j.kneeR.pivot[2]).toBeGreaterThan(.7 * length('hipR', 'kneeR'));
    // 背骨と首の +x は前屈
    expect(moved(model, 'lumbar', { x: 30 }, j.neck.pivot).z).toBeGreaterThan(j.neck.pivot[2] + 40);
    // 足首の +x は底屈（つま先が下がる）、手首の +z は掌屈（右手は体の内側 +X へ）
    const toe = box(model, 'footR').max.z;
    expect(moved(model, 'ankleR', { x: 40 }, [j.ankleR.pivot[0], 6, toe]).y).toBeLessThan(6 - 25);
    const fingertip = shapeCenter(model.parts.handR[1]);
    expect(moved(model, 'wristR', { z: 60 }, fingertip).x).toBeGreaterThan(fingertip[0] + 15);
  });
});

describe('male and female models', () => {
  const width = (type: BodyType, part: PartId, edge: 'top' | 'bottom') => loft(MODELS[type], part)[edge].w;
  it('give the male model wider shoulders and chest, and the female model a wider pelvis', () => {
    expect(Math.abs(MODELS.male.joints.shoulderR.pivot[0])).toBeGreaterThan(Math.abs(MODELS.female.joints.shoulderR.pivot[0]));
    expect(width('male', 'thorax', 'top')).toBeGreaterThan(width('female', 'thorax', 'top'));
    expect(width('female', 'pelvis', 'bottom')).toBeGreaterThan(width('male', 'pelvis', 'bottom'));
    expect(Math.abs(MODELS.female.joints.hipR.pivot[0])).toBeGreaterThan(Math.abs(MODELS.male.joints.hipR.pivot[0]));
  });
});

describe('connection sets', () => {
  it('start from a root and attach each part after its parent', () => {
    for (const [id, links] of Object.entries(BODY_SETS)) {
      expect(links[0].parent, id).toBeUndefined();
      links.slice(1).forEach((link, i) => expect(links.slice(0, i + 1).some(l => l.part === link.parent), `${id}:${link.part}`).toBe(true));
      expect(new Set(links.map(l => l.part)).size, id).toBe(links.length);
    }
  });
  it('cover every joint in the whole-body set', () => {
    expect(BODY_SETS['full-body'].filter(l => l.joint).map(l => l.joint).sort()).toEqual(Object.keys(MODELS.male.joints).sort());
  });
});

describe('random poses', () => {
  it('are repeatable per seed and question, and change between questions and models', () => {
    expect(bodyPose('arm-hand', 3, 4)).toEqual(bodyPose('arm-hand', 3, 4));
    expect(bodyPose('arm-hand', 3, 4)).not.toEqual(bodyPose('arm-hand', 3, 5));
    expect(bodyPose('arm-hand', 3, 4)).not.toEqual(bodyPose('arm-hand', 4, 4));
    expect(bodyPose('arm-hand', 3, 4, 'female').angles).toEqual(bodyPose('arm-hand', 3, 4, 'male').angles);
  });
  it('stay within each joint range and give unit rotations', () => {
    for (const type of TYPES) for (const id of Object.keys(BODY_SETS)) for (let index = 0; index < 40; index++) {
      const pose = bodyPose(id, 11, index, type);
      expect(Math.hypot(...pose.orientation)).toBeCloseTo(1, 9);
      for (const [joint, angles] of Object.entries(pose.angles) as [JointId, Record<string, number>][]) {
        for (const d of MODELS[type].joints[joint].dofs) {
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
