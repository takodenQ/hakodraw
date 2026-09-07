export const SHAPES = [
  { id: 'square', label: '正方形', hint: '面の傾きを観察' },
  { id: 'circle', label: '円', hint: '楕円への変化を観察' },
  { id: 'cube', label: '立方体', hint: '面のつながりを観察' },
  { id: 'cuboid', label: '直方体', hint: '長さと奥行きを観察' },
  { id: 'figure', label: '人体', hint: '頭・胸郭・骨盤の傾きとひねりを観察' },
] as const;
export type Shape = typeof SHAPES[number]['id'];
export const shapeLabel = (shape: Shape) => SHAPES.find(item => item.id === shape)!.label;
