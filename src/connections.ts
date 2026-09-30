export type GuidePreset = 'learning' | 'standard' | 'test';
type Vec3 = [number, number, number];
export interface ConnectionPart { id: string; parent?: string; kind: 'box' | 'sphere' | 'cylinder'; size: Vec3; position: Vec3; rotation: Vec3 }

// 身長180cmの成人男性の平均的な体格を基準にした寸法（単位：m）。size は [幅, 高さ, 奥行き]、円柱は [直径, 長さ, 直径]。
// 高さは足裏を0として、頭頂180 / 顎157 / 肩峰147 / 胸郭120〜150 / 腸骨稜108 / 股関節93 / 恥骨87 / 膝49 / 足首8。
const chest: ConnectionPart = { id: '胸郭', kind: 'box', size: [.32, .3, .23], position: [0, 0, 0], rotation: [8, 0, -8] };
const pelvis: ConnectionPart = { id: '骨盤', kind: 'box', size: [.32, .21, .22], position: [0, 0, 0], rotation: [-8, 0, 8] };
// 胸郭中心(135)から見た各パーツの位置。
const NECK_Y = .19, HEAD_Y = .145, SHOULDER_Y = .09, SHOULDER_X = .19, PELVIS_Y = -.375;
const THIGH_LENGTH = .44, SHIN_LENGTH = .42, HIP_X = .09, HIP_Y = -.045;
const shoulder = (side: number): ConnectionPart => ({ id: side > 0 ? '右肩' : '左肩', parent: '胸郭', kind: 'sphere', size: [.12, .12, .12], position: [side * SHOULDER_X, SHOULDER_Y, -.01], rotation: [0, 0, 0] });
export const CONNECTIONS: { id: string; label: string; hint: string; parts: ConnectionPart[] }[] = [
  { id: 'head-chest', label: '頭・首・胸郭', hint: '胸郭の上面を基準に、首の傾きと頭の向きを観察', parts: [chest, { id: '首', parent: '胸郭', kind: 'cylinder', size: [.115, .1, .115], position: [0, NECK_Y, -.01], rotation: [-6, 0, 5] }, { id: '頭', parent: '首', kind: 'box', size: [.155, .23, .195], position: [0, HEAD_Y, .03], rotation: [0, 15, 0] }] },
  { id: 'chest-shoulders', label: '胸郭・両肩', hint: '胸郭に対する左右の肩の位置と奥行きを観察', parts: [chest, shoulder(-1), shoulder(1)] },
  { id: 'shoulder-arm', label: '右肩・上腕', hint: '肩の中心から上腕が伸びる方向を観察', parts: [{ ...shoulder(1), parent: undefined, position: [0, 0, 0] }, { id: '上腕', parent: '右肩', kind: 'cylinder', size: [.095, .33, .095], position: [.056, -.155, .02], rotation: [-8, 0, 20] }] },
  { id: 'chest-pelvis', label: '胸郭・骨盤', hint: '胸郭と骨盤の間隔、傾き、ひねりを観察', parts: [chest, { ...pelvis, parent: '胸郭', position: [0, PELVIS_Y, .01], rotation: [-16, -15, 16] }] },
  { id: 'pelvis-thighs', label: '骨盤・両大腿', hint: '骨盤から伸びる左右の脚と重なりを観察', parts: [pelvis, ...[-1, 1].map(side => ({ id: side > 0 ? '右大腿' : '左大腿', parent: '骨盤', kind: 'cylinder' as const, size: [.15, THIGH_LENGTH, .15] as Vec3, position: [side * (HIP_X + .023), HIP_Y - .219, -side * .023] as Vec3, rotation: [side * 6, 0, side * 6] as Vec3 }))] },
  { id: 'thigh-shin', label: '右大腿・下腿', hint: '膝の位置を基準に、二つの円柱の方向を観察', parts: [{ id: '大腿', kind: 'cylinder', size: [.15, THIGH_LENGTH, .15], position: [0, 0, 0], rotation: [0, 0, 0] }, { id: '下腿', parent: '大腿', kind: 'cylinder', size: [.095, SHIN_LENGTH, .095], position: [0, -.398, -.111], rotation: [32, 0, 0] }] },
];
export const connectionById = (id?: string) => CONNECTIONS.find(item => item.id === id) ?? CONNECTIONS[0];

// 「人体」モード用：頭・胸郭・骨盤を同じ寸法で独立配置（胸郭中心が原点）。
export const FIGURE_PARTS: ConnectionPart[] = [
  { id: 'head', kind: 'box', size: [.155, .23, .195], position: [-.015, NECK_Y + HEAD_Y, .01], rotation: [-5, -10, 3] },
  { id: 'thorax', kind: 'box', size: [.32, .3, .23], position: [0, 0, 0], rotation: [10, 18, -16] },
  { id: 'pelvis', kind: 'box', size: [.32, .21, .22], position: [.015, PELVIS_Y, .01], rotation: [-8, -14, 13] },
];
