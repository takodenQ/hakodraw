export type GuidePreset = 'learning' | 'standard' | 'test';
type Vec3 = [number, number, number];
export interface ConnectionPart { id: string; parent?: string; kind: 'box' | 'sphere' | 'cylinder'; size: Vec3; position: Vec3; rotation: Vec3 }
const chest: ConnectionPart = { id: '胸郭', kind: 'box', size: [.95, 1, .6], position: [0, 0, 0], rotation: [8, 0, -8] };
const pelvis: ConnectionPart = { id: '骨盤', kind: 'box', size: [.85, .6, .6], position: [0, 0, 0], rotation: [-8, 0, 8] };
const shoulder = (side: number): ConnectionPart => ({ id: side > 0 ? '右肩' : '左肩', parent: '胸郭', kind: 'sphere', size: [.34, .34, .34], position: [side * .63, .28, 0], rotation: [0, 0, 0] });
export const CONNECTIONS: { id: string; label: string; hint: string; parts: ConnectionPart[] }[] = [
  { id: 'head-chest', label: '頭・首・胸郭', hint: '胸郭の上面を基準に、首の傾きと頭の向きを観察', parts: [chest, { id: '首', parent: '胸郭', kind: 'cylinder', size: [.24, .32, .24], position: [0, .64, 0], rotation: [-8, 0, 8] }, { id: '頭', parent: '首', kind: 'box', size: [.48, .6, .48], position: [0, .44, .02], rotation: [0, 15, 0] }] },
  { id: 'chest-shoulders', label: '胸郭・両肩', hint: '胸郭に対する左右の肩の位置と奥行きを観察', parts: [chest, shoulder(-1), shoulder(1)] },
  { id: 'shoulder-arm', label: '右肩・上腕', hint: '肩の中心から上腕が伸びる方向を観察', parts: [{ ...shoulder(1), parent: undefined, position: [0, .65, 0] }, { id: '上腕', parent: '右肩', kind: 'cylinder', size: [.3, 1.1, .3], position: [.2, -.58, .08], rotation: [-8, 0, 20] }] },
  { id: 'chest-pelvis', label: '胸郭・骨盤', hint: '胸郭と骨盤の間隔、傾き、ひねりを観察', parts: [chest, { ...pelvis, parent: '胸郭', position: [0, -1.1, .03], rotation: [-16, -15, 16] }] },
  { id: 'pelvis-thighs', label: '骨盤・両大腿', hint: '骨盤から伸びる左右の脚と重なりを観察', parts: [pelvis, ...[-1, 1].map(side => ({ id: side > 0 ? '右大腿' : '左大腿', parent: '骨盤', kind: 'cylinder' as const, size: [.38, 1.2, .38] as Vec3, position: [side * .3, -.86, 0] as Vec3, rotation: [side * 8, 0, side * 8] as Vec3 }))] },
  { id: 'thigh-shin', label: '右大腿・下腿', hint: '膝の位置を基準に、二つの円柱の方向を観察', parts: [{ id: '大腿', kind: 'cylinder', size: [.4, 1.15, .4], position: [0, .6, 0], rotation: [0, 0, 0] }, { id: '下腿', parent: '大腿', kind: 'cylinder', size: [.28, 1.1, .28], position: [0, -1.02, -.3], rotation: [32, 0, 0] }] },
];
export const connectionById = (id?: string) => CONNECTIONS.find(item => item.id === id) ?? CONNECTIONS[0];
