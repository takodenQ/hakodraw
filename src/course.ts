import type { Shape } from './shapes';
import type { Axis } from './settings';
import type { GuidePreset } from './connections';
import type { PracticeLog, PracticeMode } from './progress';

/** はじめてのコースの1ステップ。回転・接続・パースの既存モードに、初心者向けの設定と説明を付けたもの。 */
export interface CourseStep {
  id: string; title: string; aim: string; tip: string;
  mode: PracticeMode; count: number; seconds: number;
  shape?: Shape; connectionId?: string; axis?: Axis; guidePreset?: GuidePreset;
}
const rotation = (id: string, title: string, shape: Shape, axis: Axis, count: number, seconds: number, aim: string, tip: string): CourseStep => ({ id, title, aim, tip, mode: 'rotation', shape, axis, count, seconds });
const connection = (id: string, title: string, connectionId: string, guidePreset: GuidePreset, aim: string, tip: string): CourseStep => ({ id, title, aim, tip, mode: 'connection', connectionId, guidePreset, count: 6, seconds: 60 });

export const COURSE: CourseStep[] = [
  rotation('square', '正方形を回す', 'square', 'Y', 5, 45, '面が回ると、正方形がどんな形に見えるかを観察します。', '角度によって横に細くなり、真横では線になります。まず外側の輪郭だけを、迷わず描いてみましょう。'),
  rotation('circle', '円を回す', 'circle', 'X', 5, 45, '円が傾くと、楕円に変わる様子を観察します。', '楕円は「つぶれた円」です。長い方向と短い方向を見つけて、ゆるやかな曲線で描きます。'),
  rotation('cube', '立方体を回す', 'cube', 'Y', 6, 60, '面のつながりと、辺が奥へ縮んで見える様子を観察します。', '手前の辺から描き始め、平行な辺は同じ方向へ少しずつ縮むことを意識します。'),
  rotation('cuboid', '直方体を回す', 'cuboid', 'X', 6, 60, '長さ・幅・奥行きの比率を保ったまま回る形を観察します。', '一番長い辺を先に決めると、残りの辺の長さを比べやすくなります。'),
  { id: 'perspective-cube', title: 'パース線をなぞって立方体', aim: '向きと目線の高さが変わる立方体を、薄いパース線をなぞって描きます。平行な辺が、アイレベル上の一点に向かって集まる様子を体験します。', tip: '補助線の色は辺の方向（X赤・Y緑・Z青）を表します。線に沿って描き、迷ったら「答えを重ねる」で確認しましょう。', mode: 'perspective', count: 4, seconds: 90 },
  rotation('figure', '頭・胸郭・骨盤の3ブロック', 'figure', 'Y', 6, 60, '3つのブロックの傾きとひねりが、回すとどう見えるかを観察します。', '3つのブロックは別々に傾いています。ブロックごとに「どちらを向いているか」を矢印で考えます。'),
  // 接続練習のステップIDは以前のまま（進み具合を引き継ぐため）。内容は三面図の人体モデルの組み合わせ。
  connection('head-chest', '頭・首・胸郭', 'head-neck-thorax', 'learning', '胸郭の上に首が立ち、その上に頭が乗る関係を観察します。', '「学習」表示では中心線と接続点が見えます。首は胸郭の中心より少し前から立ち上がり、頭は首よりも前に張り出します。'),
  connection('chest-shoulders', '胸郭・肩・上腕', 'thorax-shoulder-arm', 'learning', '胸郭の上の角にある肩と、そこから伸びる左右の上腕を観察します。', '上腕は肩の球の中心から伸びます。まず左右の肩の位置を結ぶ線を引き、そこから腕の向きを決めます。'),
  connection('shoulder-arm', '上腕・肘・前腕・手', 'arm-hand', 'standard', '肘の曲がりと前腕のひねりで、手の向きが変わる様子を観察します。', '肘は前にしか曲がりません。前腕は肘から手首に向かって細くなり、手は親指の側で向きを確かめます。'),
  connection('chest-pelvis', '胸郭・腹部・腰', 'thorax-abdomen-pelvis', 'standard', '背骨の曲げとひねりで、胸郭と腰の向きがずれる様子を観察します。', '胸郭と腰は、腹部をはさんで別々に傾きます。2つの箱の正面の中心線が、どちらを向いているかを比べます。'),
  connection('pelvis-thighs', '腰・太もも', 'pelvis-thighs', 'standard', '腰の下の股関節から、左右の太ももが伸びる位置と重なりを観察します。', '股関節は腰の横の下側にあります。手前の脚が奥の脚を隠すところを見逃さないでください。'),
  connection('thigh-shin', '太もも・膝・ふくらはぎ・足', 'leg-foot', 'test', '膝と足首の曲がりで、すねと足の向きが変わる様子を、補助表示なしで観察します。', '最終ステップです。膝は後ろにしか曲がりません。かかとからつま先へのびる足の向きも確かめましょう。'),
];
export const courseStepById = (id?: string) => COURSE.find(step => step.id === id);

export function completedStepIds(logs: PracticeLog[]): Set<string> {
  return new Set(logs.filter(log => log.completed && log.stepId).map(log => log.stepId!));
}
export function nextStep(logs: PracticeLog[]): CourseStep | undefined {
  const done = completedStepIds(logs);
  return COURSE.find(step => !done.has(step.id));
}

export interface StepPlan { step: CourseStep; count: number; seconds: number; note: string }
const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
/** 直近の感想に合わせて、次の練習量を少しだけ調整する（むずかしい→時間を長く、もの足りない→問題を増やす）。 */
export function planFor(step: CourseStep, logs: PracticeLog[]): StepPlan {
  const feeling = [...logs].reverse().find(log => log.feeling)?.feeling;
  if (feeling === 'hard') return { step, count: Math.max(3, step.count - 1), seconds: Math.min(3600, roundTo5(step.seconds * 1.5)), note: '前回はむずかしかったので、1問の時間を長めにしました。' };
  if (feeling === 'easy') return { step, count: Math.min(360, step.count + 2), seconds: step.seconds, note: '前回はもの足りなかったので、問題を少し増やしました。' };
  return { step, count: step.count, seconds: step.seconds, note: '' };
}
/** 1日の最初の一歩として、ほんの短い練習量に絞る（続けることを優先する）。 */
export const quickPlan = (step: CourseStep): StepPlan => ({ step, count: 2, seconds: 30, note: '' });
