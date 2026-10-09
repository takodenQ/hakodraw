// 三面図の仕様（src/models/*.json）から起こした図形人体モデル（男性・女性）と、接続練習のパーツ分け・関節の可動域・ランダムなポーズ。
// 仕様の座標：1頭身 = 100、y は 0 が頭頂・750 が接地（下向き正）、正面図の +x は画面右、側面図の +x は顔の向き。
// 3Dの座標：足裏が Y=0、Yが上、+Zが正面、−Xが人物の右側。正面図の x → X、y → Y（750 − y）、側面図の x → Z。
// 仕様の `_L` は正面図で見て左、つまり人物の右半身なので、ここでは「右（R）」として扱う。左半身は左右反転で作る。
import { Euler, Quaternion, Vector3 } from 'three';
import { mulberry32, questionSeed } from './random';
import maleSpec from './models/body-male.json';
import femaleSpec from './models/body-female.json';

export type V3 = [number, number, number];
export type Q4 = [number, number, number, number];
const HEIGHT = 750;
const deg = Math.PI / 180;

export type BodyType = 'male' | 'female';
export const BODY_TYPES: { id: BodyType; label: string }[] = [{ id: 'male', label: '男性' }, { id: 'female', label: '女性' }];
export const bodyTypeLabel = (type: BodyType) => BODY_TYPES.find(item => item.id === type)!.label;

/** 断面の長方形。c：中心、w：左右の幅、d：前後の奥行き、tilt：X軸まわりの傾き、roll：Z軸まわりの傾き（度）。 */
export interface Rect { c: V3; w: number; d: number; tilt: number; roll: number }
export type BodyShape =
  /** 上下2つの断面をつないだ角柱（台形の箱）。marks：上下方向の割合で描く輪郭線、midline：前後の面の中心線。 */
  | { kind: 'loft'; bottom: Rect; top: Rect; marks?: number[]; midline?: boolean }
  /** 関節の球。 */
  | { kind: 'ball'; c: V3; r: number }
  /** 側面の輪郭を左右に押し出した立体（足）。幅と左右位置は高さに応じて変わる。 */
  | { kind: 'prism'; profile: [z: number, y: number][]; top: { y: number; cx: number; w: number }; bottom: { y: number; cx: number; w: number } };

type P2 = [number, number];
type Edge = [number, number, number, number];
/** 正面図の左端・右端 [x, y, x, y] と、側面図の後端・前端 [x, y, x, y]（y は上から）から断面を作る。 */
function rect(front: Edge, side: Edge): Rect {
  const [xl, yl, xr, yr] = front, [zb, yb, zf, yf] = side;
  const w = Math.hypot(xr - xl, yr - yl), d = Math.hypot(zf - zb, yf - yb);
  return {
    c: [(xl + xr) / 2, HEIGHT - ((yl + yr) / 2 + (yb + yf) / 2) / 2, (zb + zf) / 2], w, d,
    roll: Math.atan2(-(yr - yl), xr - xl) / deg, tilt: Math.asin((yf - yb) / d) / deg,
  };
}
const centered = (x: number, y: number, z: number, w: number, d: number): Rect => ({ c: [x, HEIGHT - y, z], w, d, tilt: 0, roll: 0 });
const point = (x: number, frontY: number, sideY: number, z: number): V3 => [x, HEIGHT - (frontY + sideY) / 2, z];
const mid = (a: P2, b: P2): P2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const edge = (a: P2, b: P2): Edge => a[0] <= b[0] ? [...a, ...b] : [...b, ...a];

/** SVGのパス（M・L・Q・Z）の頂点。Q の制御点は使わず、終点だけを頂点とする。 */
export function pathAnchors(d: string): P2[] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const anchors: P2[] = [];
  let command = '';
  for (let i = 0; i < tokens.length;) {
    if (/[A-Za-z]/.test(tokens[i])) { command = tokens[i].toUpperCase();i++;continue; }
    if (command === 'Q') { anchors.push([+tokens[i + 2], +tokens[i + 3]]);i += 4; }
    else { anchors.push([+tokens[i], +tokens[i + 1]]);i += 2; }
  }
  // 最後に始点へ戻る曲線（上腕など）で閉じるパスは、始点を二重に数えない。
  const same = (a: P2, b: P2) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
  return anchors.filter((p, i) => i === 0 ? !same(p, anchors[anchors.length - 1]) || anchors.length === 1 : !same(p, anchors[i - 1]));
}
/** 四角形のパスの上の辺と下の辺（それぞれ左→右、側面図では後→前）。 */
function topBottom(points: P2[]) {
  const byY = [...points].sort((a, b) => a[1] - b[1]);
  return { top: edge(byY[0], byY[1]), bottom: edge(byY[byY.length - 2], byY[byY.length - 1]) };
}

function mirrorShape(shape: BodyShape): BodyShape {
  const rectM = (r: Rect): Rect => ({ ...r, c: [-r.c[0], r.c[1], r.c[2]], roll: -r.roll });
  if (shape.kind === 'loft') return { ...shape, bottom: rectM(shape.bottom), top: rectM(shape.top) };
  if (shape.kind === 'ball') return { ...shape, c: [-shape.c[0], shape.c[1], shape.c[2]] };
  return { ...shape, top: { ...shape.top, cx: -shape.top.cx }, bottom: { ...shape.bottom, cx: -shape.bottom.cx } };
}

// ---- パーツ ----
const LIMBS = ['shoulder', 'upperArm', 'elbow', 'forearm', 'wristBall', 'hand', 'hipBall', 'thigh', 'knee', 'shin', 'ankleBall', 'foot'] as const;
type Limb = typeof LIMBS[number];
export type PartId = 'head' | 'neck' | 'thorax' | 'abdomen' | 'pelvis' | `${Limb}${'R' | 'L'}`;
const LIMB_LABELS: Record<Limb, string> = {
  shoulder: '肩', upperArm: '上腕', elbow: '肘', forearm: '前腕', wristBall: '手首', hand: '手',
  hipBall: '股関節', thigh: '太もも', knee: '膝', shin: 'ふくらはぎ', ankleBall: '足首', foot: '足',
};
export const PART_LABELS = {
  head: '頭', neck: '首', thorax: '胸郭', abdomen: '腹部', pelvis: '腰',
  ...Object.fromEntries(LIMBS.flatMap(limb => [[`${limb}R`, `右${LIMB_LABELS[limb]}`], [`${limb}L`, `左${LIMB_LABELS[limb]}`]])),
} as Record<PartId, string>;

interface SpecPart { name: string; type: string; d?: string; center?: number[]; r?: number }
interface SpecView { parts: SpecPart[]; pivots: Record<string, number[]> }
export interface BodySpec { head_count: number; views: { front: SpecView; side: SpecView } }

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
const SIDE_JOINTS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'] as const;
type SideJoint = typeof SIDE_JOINTS[number];
export type JointId = 'neck' | 'head' | 'thoracic' | 'lumbar' | `${SideJoint}${'R' | 'L'}`;
const RANGES: Record<'neck' | 'head' | 'thoracic' | 'lumbar' | SideJoint, { label: string; dofs: Dof[] }> = {
  neck: { label: '首（頸椎）', dofs: [dof('x', -10, 30, '前屈・後屈'), dof('z', -20, 20, '側屈'), dof('twist', -30, 30, '回旋')] },
  head: { label: '頭の付け根', dofs: [dof('x', -15, 20, 'うなずき'), dof('z', -10, 10, '傾げ'), dof('twist', -40, 40, '回旋')] },
  thoracic: { label: '胸椎', dofs: [dof('x', -10, 25, '前屈・後屈'), dof('z', -15, 15, '側屈'), dof('twist', -25, 25, '回旋')] },
  lumbar: { label: '腰椎', dofs: [dof('x', -15, 30, '前屈・後屈'), dof('z', -15, 15, '側屈'), dof('twist', -10, 10, '回旋')] },
  shoulder: { label: '肩関節', dofs: [dof('x', -120, 30, '屈曲・伸展'), dof('z', -100, 10, '外転・内転'), dof('twist', -40, 60, '内旋・外旋')] },
  elbow: { label: '肘関節', dofs: [dof('x', -140, 0, '屈曲'), dof('twist', -80, 80, '回内・回外')] },
  wrist: { label: '手関節', dofs: [dof('z', -60, 70, '背屈・掌屈'), dof('x', -20, 30, '橈屈・尺屈')] },
  hip: { label: '股関節', dofs: [dof('x', -100, 20, '屈曲・伸展'), dof('z', -40, 15, '外転・内転'), dof('twist', -35, 35, '内旋・外旋')] },
  knee: { label: '膝関節', dofs: [dof('x', 0, 130, '屈曲'), dof('twist', -10, 10, '回旋')] },
  ankle: { label: '足関節', dofs: [dof('x', -20, 45, '背屈・底屈'), dof('z', -15, 20, '外返し・内返し'), dof('twist', -10, 10, '外転・内転')] },
};
/** 左右反転：X成分と、z・ひねりの向きを反転する（解剖学的に同じ動きになる）。 */
function mirrorJoint(joint: Joint): Joint {
  return { ...joint, pivot: [-joint.pivot[0], joint.pivot[1], joint.pivot[2]], twistAxis: [-joint.twistAxis[0], joint.twistAxis[1], joint.twistAxis[2]],
    dofs: joint.dofs.map(d => d.axis === 'x' ? d : { ...d, min: -d.max, max: -d.min }) };
}

export interface BodyModel { parts: Record<PartId, BodyShape[]>; joints: Record<JointId, Joint> }
/** 仕様の正面図・側面図のパーツとピボットから、立体と関節を組み立てる。 */
export function buildModel(spec: BodySpec): BodyModel {
  const view = (v: SpecView, name: string) => {
    const part = v.parts.find(p => p.name === name);
    if (!part) throw new Error(`三面図の仕様に ${name} がありません`);
    return part;
  };
  const front = (name: string) => view(spec.views.front, name), side = (name: string) => view(spec.views.side, name);
  const loftOf = (frontName: string, sideName: string, extra: { marks?: number[]; midline?: boolean } = {}): BodyShape => {
    const f = topBottom(pathAnchors(front(frontName).d!)), s = topBottom(pathAnchors(side(sideName).d!));
    return { kind: 'loft', top: rect(f.top, s.top), bottom: rect(f.bottom, s.bottom), ...extra };
  };
  const ballOf = (frontName: string, sideName: string): BodyShape => {
    const f = front(frontName), s = side(sideName);
    return { kind: 'ball', c: point(f.center![0], f.center![1], s.center![1], s.center![0]), r: (f.r! + s.r!) / 2 };
  };
  // 手：手のひら・指（指の付け根で分ける）・親指。頂点の並びは両モデル共通。
  const hf = pathAnchors(front('hand_L').d!), hs = pathAnchors(side('hand').d!);
  const thumbBase = mid(hf[5], hf[8]), thumbTip = mid(hf[6], hf[7]);
  const palmWidth = Math.abs(hf[0][0] - hf[9][0]);
  const hand: BodyShape[] = [
    { kind: 'loft', top: rect(edge(hf[9], hf[0]), edge(hs[0], hs[8])), bottom: rect(edge(hf[4], hf[1]), edge(hs[1], hs[4])) },
    { kind: 'loft', top: rect(edge(hf[4], hf[1]), edge(hs[1], hs[4])), bottom: rect(edge(hf[3], hf[2]), edge(hs[2], hs[3])) },
    { kind: 'loft', top: centered(thumbBase[0], thumbBase[1], hs[5][0] - 2, palmWidth * .32, 8), bottom: centered(thumbTip[0], thumbTip[1], mid(hs[6], hs[7])[0], palmWidth * .21, 5) },
  ];
  // 足：側面の輪郭を、正面図の上端・下端の幅で左右に押し出す。
  const ff = pathAnchors(front('foot_L').d!), fs = pathAnchors(side('foot').d!);
  const footTop = Math.min(...ff.map(p => p[1])), footBottom = Math.max(...ff.map(p => p[1]));
  const span = (ys: (y: number) => boolean) => { const xs = ff.filter(p => ys(p[1])).map(p => p[0]);return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, w: Math.max(...xs) - Math.min(...xs) }; };
  const foot: BodyShape = { kind: 'prism', profile: fs.map(([z, y]) => [z, HEIGHT - y] as [number, number]),
    top: { y: HEIGHT - footTop, ...span(y => y <= footTop + 1) }, bottom: { y: HEIGHT - footBottom, ...span(y => y >= footBottom - 6) } };
  const right: Record<Limb, BodyShape[]> = {
    shoulder: [ballOf('shoulder_L', 'shoulder')], upperArm: [loftOf('upperarm_L', 'upperarm')], elbow: [ballOf('elbow_L', 'elbow')],
    forearm: [loftOf('forearm_L', 'forearm')], wristBall: [ballOf('wristball_L', 'wristball')], hand,
    hipBall: [ballOf('hipball_L', 'hipball')], thigh: [loftOf('thigh_L', 'thigh')], knee: [ballOf('knee_L', 'knee')],
    shin: [loftOf('shin_L', 'shin')], ankleBall: [ballOf('ankleball_L', 'ankleball')], foot: [foot],
  };
  const parts = {
    head: [loftOf('head', 'head', { marks: [.5], midline: true })], neck: [loftOf('neck', 'neck')],
    thorax: [loftOf('chest', 'chest', { midline: true })], abdomen: [loftOf('waist', 'waist', { midline: true })], pelvis: [loftOf('pelvis', 'pelvis', { midline: true })],
    ...Object.fromEntries(LIMBS.flatMap(limb => [[`${limb}R`, right[limb]], [`${limb}L`, right[limb].map(mirrorShape)]])),
  } as Record<PartId, BodyShape[]>;

  const fp = spec.views.front.pivots, sp = spec.views.side.pivots;
  const pivot = (frontName: string, sideName: string) => point(fp[frontName][0], fp[frontName][1], sp[sideName][1], sp[sideName][0]);
  const fingertip = point(mid(hf[2], hf[3])[0], mid(hf[2], hf[3])[1], mid(hs[2], hs[3])[1], mid(hs[2], hs[3])[0]);
  const P = {
    head: pivot('head', 'head'), neck: pivot('neck_base', 'neck_base'), thoracic: pivot('spine_upper', 'spine_upper'), lumbar: pivot('spine_lower', 'spine_lower'),
    shoulder: pivot('shoulder_L', 'shoulder'), elbow: pivot('elbow_L', 'elbow'), wrist: pivot('wrist_L', 'wrist'),
    hip: pivot('hip_L', 'hip'), knee: pivot('knee_L', 'knee'), ankle: pivot('ankle_L', 'ankle'),
  };
  const axis: Record<SideJoint, V3> = {
    shoulder: towards(P.shoulder, P.elbow), elbow: towards(P.elbow, P.wrist), wrist: towards(P.wrist, fingertip),
    hip: towards(P.hip, P.knee), knee: towards(P.knee, P.ankle), ankle: UP,
  };
  const joints = {
    neck: { ...RANGES.neck, pivot: P.neck, twistAxis: UP }, head: { ...RANGES.head, pivot: P.head, twistAxis: UP },
    thoracic: { ...RANGES.thoracic, pivot: P.thoracic, twistAxis: UP }, lumbar: { ...RANGES.lumbar, pivot: P.lumbar, twistAxis: UP },
    ...Object.fromEntries(SIDE_JOINTS.flatMap(name => {
      const joint: Joint = { ...RANGES[name], pivot: P[name], twistAxis: axis[name] };
      return [[`${name}R`, { ...joint, label: `右${joint.label}` }], [`${name}L`, { ...mirrorJoint(joint), label: `左${joint.label}` }]];
    })),
  } as Record<JointId, Joint>;
  return { parts, joints };
}
export const MODELS: Record<BodyType, BodyModel> = { male: buildModel(maleSpec as BodySpec), female: buildModel(femaleSpec as BodySpec) };

// ---- 接続練習の組み合わせ：先頭が土台。joint がない子は親に固定（肩・肘・手首・股関節・膝・足首の球） ----
export interface Link { part: PartId; parent?: PartId; joint?: JointId }
type Side = 'R' | 'L';
const arm = (s: Side, parent: PartId): Link[] => [
  { part: `shoulder${s}`, parent }, { part: `upperArm${s}`, parent: `shoulder${s}`, joint: `shoulder${s}` },
  { part: `elbow${s}`, parent: `upperArm${s}` }, { part: `forearm${s}`, parent: `elbow${s}`, joint: `elbow${s}` },
  { part: `wristBall${s}`, parent: `forearm${s}` }, { part: `hand${s}`, parent: `wristBall${s}`, joint: `wrist${s}` },
];
const leg = (s: Side, parent: PartId): Link[] => [
  { part: `hipBall${s}`, parent }, { part: `thigh${s}`, parent: `hipBall${s}`, joint: `hip${s}` },
  { part: `knee${s}`, parent: `thigh${s}` }, { part: `shin${s}`, parent: `knee${s}`, joint: `knee${s}` },
  { part: `ankleBall${s}`, parent: `shin${s}` }, { part: `foot${s}`, parent: `ankleBall${s}`, joint: `ankle${s}` },
];
const spine: Link[] = [{ part: 'pelvis' }, { part: 'abdomen', parent: 'pelvis', joint: 'lumbar' }, { part: 'thorax', parent: 'abdomen', joint: 'thoracic' }];
const neckHead: Link[] = [{ part: 'neck', parent: 'thorax', joint: 'neck' }, { part: 'head', parent: 'neck', joint: 'head' }];
export const BODY_SETS: Record<string, Link[]> = {
  'head-neck-thorax': [{ part: 'thorax' }, ...neckHead],
  'thorax-shoulder-arm': [{ part: 'thorax' }, ...(['R', 'L'] as const).flatMap(s => arm(s, 'thorax').slice(0, 2))],
  'arm-hand': arm('R', 'thorax').slice(1).map((link, i) => i === 0 ? { part: link.part } : link),
  'thorax-abdomen-pelvis': spine,
  'pelvis-thighs': [{ part: 'pelvis' }, ...(['R', 'L'] as const).flatMap(s => leg(s, 'pelvis').slice(0, 2))],
  'leg-foot': leg('R', 'pelvis').slice(1).map((link, i) => i === 0 ? { part: link.part } : link),
  'trunk-head': [...spine, ...neckHead],
  'thorax-arms': [{ part: 'thorax' }, ...arm('R', 'thorax'), ...arm('L', 'thorax')],
  'pelvis-legs': [{ part: 'pelvis' }, ...leg('R', 'pelvis'), ...leg('L', 'pelvis')],
  'full-body': [...spine, ...neckHead, ...arm('R', 'thorax'), ...arm('L', 'thorax'), ...leg('R', 'pelvis'), ...leg('L', 'pelvis')],
};

export function shapeCenter(shape: BodyShape): V3 {
  if (shape.kind === 'ball') return shape.c;
  if (shape.kind === 'loft') return shape.top.c.map((v, i) => (v + shape.bottom.c[i]) / 2) as V3;
  const zs = shape.profile.map(p => p[0]);
  return [(shape.top.cx + shape.bottom.cx) / 2, (shape.top.y + shape.bottom.y) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
}
/** パーツが回転・固定される点。関節があればそのピボット、固定の球はその中心、土台は形の中心。 */
export function linkPivot(link: Link, model: BodyModel): V3 {
  if (link.joint) return model.joints[link.joint].pivot;
  return shapeCenter(model.parts[link.part][0]);
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
/** 出題の範囲：左右はどこからでも、上下は ±60°、傾きは ±40°。 */
export const VIEW_RANGE = { pitch: 60, roll: 40 };
/**
 * その問題のポーズ。各関節を可動域の中でランダムに曲げ・ひねり、全体もランダムな向きにする。
 * 同じ種と問題番号からは同じポーズになる（前へ戻っても同じ形）。
 */
export function bodyPose(setId: string, seed: number, index: number, type: BodyType = 'male'): BodyPose {
  const random = mulberry32(questionSeed(seed, index));
  const between = (min: number, max: number) => min + (max - min) * random();
  const joints: BodyPose['joints'] = {}, angles: BodyPose['angles'] = {};
  for (const link of BODY_SETS[setId] ?? []) {
    if (!link.joint) continue;
    const joint = MODELS[type].joints[link.joint];
    const values: Partial<Record<Dof['axis'], number>> = {};
    for (const d of joint.dofs) values[d.axis] = between(d.min, d.max);
    angles[link.joint] = values;
    joints[link.joint] = toQ4(jointRotation(joint, values));
  }
  const view = new Euler(between(-VIEW_RANGE.pitch, VIEW_RANGE.pitch) * deg, between(0, 360) * deg, between(-VIEW_RANGE.roll, VIEW_RANGE.roll) * deg, 'YXZ');
  return { orientation: toQ4(new Quaternion().setFromEuler(view)), joints, angles };
}
