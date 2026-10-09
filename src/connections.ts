export type GuidePreset = 'learning' | 'standard' | 'test';
type Vec3 = [number, number, number];

/**
 * 接続練習の項目。パーツの形・関節・可動域は src/body.ts（三面図の人体モデル）にあり、同じIDで対応する。
 * 問題ごとに、関節を可動域の中でランダムに曲げ・ひねり、全体もランダムな向きで出題する。
 */
export const CONNECTIONS: { id: string; label: string; hint: string }[] = [
  { id: 'head-neck-thorax', label: '頭・首・胸郭', hint: '胸郭の上から首がどう立ち上がり、その上に頭がどう乗るかを観察' },
  { id: 'thorax-shoulder-arm', label: '胸郭・肩・上腕', hint: '胸郭の上の角にある肩から、左右の上腕がどの向きに伸びるかを観察' },
  { id: 'arm-hand', label: '上腕・肘・前腕・手', hint: '肘の曲がりと前腕のひねりで、手の向きがどう変わるかを観察' },
  { id: 'thorax-abdomen-pelvis', label: '胸郭・腹部・腰', hint: '背骨の曲げとひねりで、胸郭と腰の向きがどうずれるかを観察' },
  { id: 'pelvis-thighs', label: '腰・太もも', hint: '腰の下の股関節から、左右の太ももが伸びる方向を観察' },
  { id: 'leg-foot', label: '太もも・膝・ふくらはぎ・足', hint: '膝と足首の曲がりで、すねと足の向きがどう変わるかを観察' },
  // 部分ごとの練習を、より大きなまとまりで組み合わせる項目
  { id: 'trunk-head', label: '体幹（腰〜頭）', hint: '腰から頭まで、背骨と首の曲げ・ひねりが積み重なって全体の流れになる様子を観察' },
  { id: 'thorax-arms', label: '胸郭・両腕', hint: '胸郭を土台に、左右の腕がそれぞれどの向きに伸び、どう重なるかを観察' },
  { id: 'pelvis-legs', label: '腰・両脚', hint: '腰を土台に、左右の脚の向きと前後の重なりを観察' },
  { id: 'full-body', label: '全身', hint: 'これまでの組み合わせをすべてつないで、全身のつながりを観察' },
];
/** 以前の項目IDは、近い内容の新しい項目へ読み替える（保存済みの設定のため）。 */
const LEGACY_IDS: Record<string, string> = {
  'head-chest': 'head-neck-thorax', 'chest-shoulders': 'thorax-shoulder-arm', 'shoulder-arm': 'arm-hand',
  'chest-pelvis': 'thorax-abdomen-pelvis', 'thigh-shin': 'leg-foot',
};
export const connectionById = (id?: string) => CONNECTIONS.find(item => item.id === (id && LEGACY_IDS[id] || id)) ?? CONNECTIONS[0];

// 「人体」モード（回転練習）用：身長180cmの成人男性の体格で、頭・胸郭・骨盤を独立配置（単位：m、胸郭中心が原点）。
export interface FigurePart { id: string; size: Vec3; position: Vec3; rotation: Vec3 }
const NECK_Y = .19, HEAD_Y = .145, PELVIS_Y = -.375;
export const FIGURE_PARTS: FigurePart[] = [
  { id: 'head', size: [.155, .23, .195], position: [-.015, NECK_Y + HEAD_Y, .01], rotation: [-5, -10, 3] },
  { id: 'thorax', size: [.32, .3, .23], position: [0, 0, 0], rotation: [10, 18, -16] },
  { id: 'pelvis', size: [.32, .21, .22], position: [.015, PELVIS_Y, .01], rotation: [-8, -14, 13] },
];
