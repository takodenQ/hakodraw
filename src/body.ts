// 三面図（正面・側面・背面）から起こした図形人体モデルと、接続練習のパーツ分け・関節の可動域・ランダムなポーズ。
// 座標は三面図の単位をそのまま使う：1頭身 = 100、身長 7.5頭身 = 750、足裏が Y=0、Yが上、+Zが正面、-Xが人物の右側。
// 正面図の x → X、上からの y → Y（750 - y）、側面図の x（つま先側が +）→ Z。詳細は docs/connection-practice.md。
import { Euler, Quaternion, Vector3 } from 'three';
import { mulberry32, questionSeed } from './random';

export type V3 = [number, number, number];
export type Q4 = [number, number, number, number];
const HEIGHT = 750;
const deg = Math.PI / 180;

/** 断面の長方形。c：中心、w：左右の幅、d：前後の奥行き、tilt：X軸まわりの傾き、roll：Z軸まわりの傾き（度）。 */
export interface Rect { c: V3; w: number; d: number; tilt: number; roll: number }
export type BodyShape =
  /** 上下2つの断面をつないだ角柱（台形の箱）。marks：上下方向の割合で描く輪郭線、midline：前後の面の中心線。 */
  | { kind: 'loft'; bottom: Rect; top: Rect; marks?: number[]; midline?: boolean }
  /** 関節の球。 */
  | { kind: 'ball'; c: V3; r: number }
  /** 側面の輪郭を左右に押し出した立体（足）。幅と左右位置は高さに応じて変わる。 */
  | { kind: 'prism'; profile: [z: number, y: number][]; top: { y: number; cx: number; w: number }; bottom: { y: number; cx: number; w: number } };

/** 三面図の数値から断面を作る。front：正面図の左端・右端 [x, y, x, y]、side：側面図の後端・前端 [x, y, x, y]（yは上から）。 */
function rect(front: [number, number, number, number], side: [number, number, number, number]): Rect {
  const [xl, yl, xr, yr] = front, [zb, yb, zf, yf] = side;
  const w = Math.hypot(xr - xl, yr - yl), d = Math.hypot(zf - zb, yf - yb);
  return {
    c: [(xl + xr) / 2, HEIGHT - ((yl + yr) / 2 + (yb + yf) / 2) / 2, (zb + zf) / 2], w, d,
    roll: Math.atan2(-(yr - yl), xr - xl) / deg, tilt: Math.asin((yf - yb) / d) / deg,
  };
}
const centered = (x: number, y: number, z: number, w: number, d: number): Rect => ({ c: [x, HEIGHT - y, z], w, d, tilt: 0, roll: 0 });
const ball = (x: number, y: number, z: number, r: number): BodyShape => ({ kind: 'ball', c: [x, HEIGHT - y, z], r });
const point = (x: number, frontY: number, sideY: number, z: number): V3 => [x, HEIGHT - (frontY + sideY) / 2, z];

function mirrorShape(shape: BodyShape): BodyShape {
  const rectM = (r: Rect): Rect => ({ ...r, c: [-r.c[0], r.c[1], r.c[2]], roll: -r.roll });
  if (shape.kind === 'loft') return { ...shape, bottom: rectM(shape.bottom), top: rectM(shape.top) };
  if (shape.kind === 'ball') return { ...shape, c: [-shape.c[0], shape.c[1], shape.c[2]] };
  return { ...shape, top: { ...shape.top, cx: -shape.top.cx }, bottom: { ...shape.bottom, cx: -shape.bottom.cx } };
}

// ---- パーツ（右側を三面図から写し、左側は左右反転） ----
const RIGHT = {
  shoulder: [ball(-64, 146, -12, 14.5)],
  upperArm: [{ kind: 'loft', top: rect([-81.5, 160.5, -51.8, 165.1], [-25.3, 163.8, 0.7, 164.2]), bottom: rect([-90.4, 236.3, -66.7, 240.1], [-24.7, 237.8, -2.7, 238.2]) }],
  elbow: [ball(-81, 254, -14, 13)],
  forearm: [{ kind: 'loft', top: rect([-97.9, 264.6, -75.5, 273.2], [-22.6, 271.4, -0.8, 268.3]), bottom: rect([-130.9, 360.2, -115.0, 366.2], [-6.3, 364.2, 9.5, 361.9]) }],
  hand: [
    // 手のひら・指・親指。指の付け根（y=398）で分ける。
    { kind: 'loft', top: rect([-134.3, 367.9, -114.4, 370.1], [-3.6, 369.7, 8.3, 368.2]), bottom: rect([-139.0, 397.6, -115.9, 398.1], [-0.7, 396.6, 11.9, 397.0]) },
    { kind: 'loft', top: rect([-139.0, 397.6, -115.9, 398.1], [-0.7, 396.6, 11.9, 397.0]), bottom: rect([-136.3, 423.0, -124.2, 423.3], [6.1, 422.9, 13.0, 422.1]) },
    { kind: 'loft', top: centered(-138, 378, 9, 8, 7), bottom: centered(-147, 391, 16, 6, 5) },
  ],
  thigh: [{ kind: 'loft', top: rect([-73, 381, -8, 381], [-30, 378, 16, 378]), bottom: rect([-45, 516, -8, 516], [-25, 516, 14, 516]) }],
  knee: [ball(-25, 537, -6, 18)],
  shin: [{ kind: 'loft', top: rect([-44, 559, -10, 559], [-35, 559, 1, 559]), bottom: rect([-30, 681, -12, 681], [-42, 681, -6, 681]) }],
  foot: [{ kind: 'prism', profile: [[-40, 687], [-6, 687], [44, 730], [52, 744], [50, 750], [-44, 750], [-51, 740], [-48, 714]].map(([z, y]) => [z, HEIGHT - y] as [number, number]),
    top: { y: HEIGHT - 687, cx: -20.5, w: 17 }, bottom: { y: HEIGHT - 750, cx: -26.5, w: 37 } }],
} satisfies Record<string, BodyShape[]>;
const left = (shapes: BodyShape[]) => shapes.map(mirrorShape);

export const PARTS = {
  head: { label: '頭', shapes: [{ kind: 'loft', top: rect([-31, 0, 31, 0], [-41, 0, 49, 0]), bottom: rect([-31, 92, 31, 92], [-41, 92, 49, 92]), marks: [.5], midline: true }] },
  neck: { label: '首', shapes: [{ kind: 'loft', top: rect([-13, 96, 13, 96], [-5, 96, 23, 96]), bottom: rect([-15, 125, 15, 125], [-13, 125, 25, 125]) }] },
  thorax: { label: '胸郭', shapes: [{ kind: 'loft', top: rect([-48, 130, 48, 130], [-43, 140.6, 26.1, 129.1]), bottom: rect([-48, 257, 48, 257], [-22.1, 266.9, 47, 255.4]), midline: true }] },
  abdomen: { label: '腹部', shapes: [{ kind: 'loft', top: rect([-44, 262, 44, 262], [-20, 271, 45, 260]), bottom: rect([-42, 301, 42, 301], [-24, 304, 33, 311]), midline: true }] },
  pelvis: { label: '腰', shapes: [{ kind: 'loft', top: rect([-56, 305, 56, 305], [-26.4, 308.4, 35.2, 316]), bottom: rect([-73, 374, 73, 374], [-33.2, 364, 28.4, 371.6]), midline: true }] },
  shoulderR: { label: '右肩', shapes: RIGHT.shoulder },
  shoulderL: { label: '左肩', shapes: left(RIGHT.shoulder) },
  upperArmR: { label: '右上腕', shapes: RIGHT.upperArm },
  upperArmL: { label: '左上腕', shapes: left(RIGHT.upperArm) },
  elbowR: { label: '右肘', shapes: RIGHT.elbow },
  forearmR: { label: '右前腕', shapes: RIGHT.forearm },
  handR: { label: '右手', shapes: RIGHT.hand },
  thighR: { label: '右太もも', shapes: RIGHT.thigh },
  thighL: { label: '左太もも', shapes: left(RIGHT.thigh) },
  kneeR: { label: '右膝', shapes: RIGHT.knee },
  shinR: { label: '右ふくらはぎ', shapes: RIGHT.shin },
  footR: { label: '右足', shapes: RIGHT.foot },
} satisfies Record<string, { label: string; shapes: BodyShape[] }>;
export type PartId = keyof typeof PARTS;

// ---- 関節：ピボット（三面図のオレンジの点）と、解剖学的な可動域を描画練習向けに狭めた範囲 ----
/**
 * x：X軸まわり（前後に曲げる）、z：Z軸まわり（左右に曲げる）、twist：骨の向きを軸にしたひねり。単位は度、右側の向きで定義。
 * 符号：体幹と首は +x が前屈。腕と脚は −x が前へ振り出す向き（肩・股関節の屈曲、肘の屈曲）、膝は +x が屈曲、足首は +x が底屈。
 * 肩・股関節は −z が外転、手首は +z が掌屈・−x が橈屈、足首は +z が内返し。
 */
export interface Dof { axis: 'x' | 'z' | 'twist'; min: number; max: number; name: string }
export interface Joint { label: string; pivot: V3; twistAxis: V3; dofs: Dof[] }
const UP: V3 = [0, 1, 0];
const dof = (axis: Dof['axis'], min: number, max: number, name: string): Dof => ({ axis, min, max, name });
const towards = (from: V3, to: V3): V3 => { const v = new Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();return [v.x, v.y, v.z]; };

const P = {
  head: point(0, 94, 94, 9), neck: point(0, 127.5, 127, 6), thoracic: point(0, 259.5, 264, 12), lumbar: point(0, 302.5, 307, 5),
  shoulder: point(-64, 146, 146, -12), elbow: point(-81, 254, 254, -14), wrist: point(-124, 366, 366, 2), fingertip: point(-130, 423, 423, 9.5),
  hip: point(-38, 377, 376, -7), knee: point(-25, 537, 537, -6), ankle: point(-20, 684, 684, -22),
};
const RIGHT_JOINTS = {
  shoulder: { label: '肩関節', pivot: P.shoulder, twistAxis: towards(P.shoulder, P.elbow), dofs: [dof('x', -120, 30, '屈曲・伸展'), dof('z', -100, 10, '外転・内転'), dof('twist', -40, 60, '内旋・外旋')] },
  elbow: { label: '肘関節', pivot: P.elbow, twistAxis: towards(P.elbow, P.wrist), dofs: [dof('x', -140, 0, '屈曲'), dof('twist', -80, 80, '回内・回外')] },
  wrist: { label: '手関節', pivot: P.wrist, twistAxis: towards(P.wrist, P.fingertip), dofs: [dof('z', -60, 70, '背屈・掌屈'), dof('x', -20, 30, '橈屈・尺屈')] },
  hip: { label: '股関節', pivot: P.hip, twistAxis: towards(P.hip, P.knee), dofs: [dof('x', -100, 20, '屈曲・伸展'), dof('z', -40, 15, '外転・内転'), dof('twist', -35, 35, '内旋・外旋')] },
  knee: { label: '膝関節', pivot: P.knee, twistAxis: towards(P.knee, P.ankle), dofs: [dof('x', 0, 130, '屈曲'), dof('twist', -10, 10, '回旋')] },
  ankle: { label: '足関節', pivot: P.ankle, twistAxis: UP, dofs: [dof('x', -20, 45, '背屈・底屈'), dof('z', -15, 20, '外返し・内返し'), dof('twist', -10, 10, '外転・内転')] },
} satisfies Record<string, Joint>;
/** 左右反転：X成分と、z・ひねりの向きを反転する（解剖学的に同じ動きになる）。 */
function mirrorJoint(joint: Joint): Joint {
  return { ...joint, pivot: [-joint.pivot[0], joint.pivot[1], joint.pivot[2]], twistAxis: [-joint.twistAxis[0], joint.twistAxis[1], joint.twistAxis[2]],
    dofs: joint.dofs.map(d => d.axis === 'x' ? d : { ...d, min: -d.max, max: -d.min }) };
}
export const JOINTS = {
  neck: { label: '首（頸椎）', pivot: P.neck, twistAxis: UP, dofs: [dof('x', -10, 30, '前屈・後屈'), dof('z', -20, 20, '側屈'), dof('twist', -30, 30, '回旋')] },
  head: { label: '頭の付け根', pivot: P.head, twistAxis: UP, dofs: [dof('x', -15, 20, 'うなずき'), dof('z', -10, 10, '傾げ'), dof('twist', -40, 40, '回旋')] },
  thoracic: { label: '胸椎', pivot: P.thoracic, twistAxis: UP, dofs: [dof('x', -10, 25, '前屈・後屈'), dof('z', -15, 15, '側屈'), dof('twist', -25, 25, '回旋')] },
  lumbar: { label: '腰椎', pivot: P.lumbar, twistAxis: UP, dofs: [dof('x', -15, 30, '前屈・後屈'), dof('z', -15, 15, '側屈'), dof('twist', -10, 10, '回旋')] },
  shoulderR: { ...RIGHT_JOINTS.shoulder, label: '右肩関節' }, shoulderL: { ...mirrorJoint(RIGHT_JOINTS.shoulder), label: '左肩関節' },
  elbowR: { ...RIGHT_JOINTS.elbow, label: '右肘関節' }, wristR: { ...RIGHT_JOINTS.wrist, label: '右手関節' },
  hipR: { ...RIGHT_JOINTS.hip, label: '右股関節' }, hipL: { ...mirrorJoint(RIGHT_JOINTS.hip), label: '左股関節' },
  kneeR: { ...RIGHT_JOINTS.knee, label: '右膝関節' }, ankleR: { ...RIGHT_JOINTS.ankle, label: '右足関節' },
} satisfies Record<string, Joint>;
export type JointId = keyof typeof JOINTS;

// ---- 接続練習の組み合わせ：先頭が土台。joint がない子は親に固定（肩・肘・膝の球） ----
export interface Link { part: PartId; parent?: PartId; joint?: JointId }
export const BODY_SETS: Record<string, Link[]> = {
  'head-neck-thorax': [{ part: 'thorax' }, { part: 'neck', parent: 'thorax', joint: 'neck' }, { part: 'head', parent: 'neck', joint: 'head' }],
  'thorax-shoulder-arm': [{ part: 'thorax' }, { part: 'shoulderR', parent: 'thorax' }, { part: 'shoulderL', parent: 'thorax' },
    { part: 'upperArmR', parent: 'shoulderR', joint: 'shoulderR' }, { part: 'upperArmL', parent: 'shoulderL', joint: 'shoulderL' }],
  'arm-hand': [{ part: 'upperArmR' }, { part: 'elbowR', parent: 'upperArmR' }, { part: 'forearmR', parent: 'elbowR', joint: 'elbowR' }, { part: 'handR', parent: 'forearmR', joint: 'wristR' }],
  'thorax-abdomen-pelvis': [{ part: 'pelvis' }, { part: 'abdomen', parent: 'pelvis', joint: 'lumbar' }, { part: 'thorax', parent: 'abdomen', joint: 'thoracic' }],
  'pelvis-thighs': [{ part: 'pelvis' }, { part: 'thighR', parent: 'pelvis', joint: 'hipR' }, { part: 'thighL', parent: 'pelvis', joint: 'hipL' }],
  'leg-foot': [{ part: 'thighR' }, { part: 'kneeR', parent: 'thighR' }, { part: 'shinR', parent: 'kneeR', joint: 'kneeR' }, { part: 'footR', parent: 'shinR', joint: 'ankleR' }],
};

/** パーツが回転・固定される点。関節があればそのピボット、固定の球はその中心、土台は形の中心。 */
export function linkPivot(link: Link): V3 {
  if (link.joint) return JOINTS[link.joint].pivot;
  const first = PARTS[link.part].shapes[0];
  if (first.kind === 'ball') return first.c;
  return shapeCenter(first);
}
export function shapeCenter(shape: BodyShape): V3 {
  if (shape.kind === 'ball') return shape.c;
  if (shape.kind === 'loft') return shape.top.c.map((v, i) => (v + shape.bottom.c[i]) / 2) as V3;
  const zs = shape.profile.map(p => p[0]);
  return [(shape.top.cx + shape.bottom.cx) / 2, (shape.top.y + shape.bottom.y) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
}

// ---- ポーズ ----
export interface BodyPose { orientation: Q4; joints: Partial<Record<JointId, Q4>>; angles: Partial<Record<JointId, Partial<Record<Dof['axis'], number>>>> }
const toQ4 = (q: Quaternion): Q4 => [q.x, q.y, q.z, q.w];
/** 関節の角度（度）を、親パーツの向きでの回転にする：骨の向きでひねり → 前後 → 左右の順。 */
export function jointRotation(joint: Joint, angles: Partial<Record<Dof['axis'], number>>): Quaternion {
  const twist = new Quaternion().setFromAxisAngle(new Vector3(...joint.twistAxis), (angles.twist ?? 0) * deg);
  const x = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (angles.x ?? 0) * deg);
  const z = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (angles.z ?? 0) * deg);
  return z.multiply(x).multiply(twist);
}
/** 練習前のプレビュー：基準姿勢を、少し斜め上から。 */
export const PREVIEW_ORIENTATION: Q4 = toQ4(new Quaternion().setFromEuler(new Euler(14 * deg, -32 * deg, 0, 'YXZ')));
export function restPose(): BodyPose { return { orientation: PREVIEW_ORIENTATION, joints: {}, angles: {} }; }
/** 出題の範囲：左右はどこからでも、上下は ±60°、傾きは ±40°。 */
export const VIEW_RANGE = { pitch: 60, roll: 40 };
/**
 * その問題のポーズ。各関節を可動域の中でランダムに曲げ・ひねり、全体もランダムな向きにする。
 * 同じ種と問題番号からは同じポーズになる（前へ戻っても同じ形）。
 */
export function bodyPose(setId: string, seed: number, index: number): BodyPose {
  const random = mulberry32(questionSeed(seed, index));
  const between = (min: number, max: number) => min + (max - min) * random();
  const joints: BodyPose['joints'] = {}, angles: BodyPose['angles'] = {};
  for (const link of BODY_SETS[setId] ?? []) {
    if (!link.joint) continue;
    const joint = JOINTS[link.joint];
    const values: Partial<Record<Dof['axis'], number>> = {};
    for (const d of joint.dofs) values[d.axis] = between(d.min, d.max);
    angles[link.joint] = values;
    joints[link.joint] = toQ4(jointRotation(joint, values));
  }
  const view = new Euler(between(-VIEW_RANGE.pitch, VIEW_RANGE.pitch) * deg, between(0, 360) * deg, between(-VIEW_RANGE.roll, VIEW_RANGE.roll) * deg, 'YXZ');
  return { orientation: toQ4(new Quaternion().setFromEuler(view)), joints, angles };
}
