// 紙を見て描いている間も切り替えに気づけるよう、やわらかい合図音をWeb Audioで鳴らす（音声ファイルは使わない）。
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
let context: AudioContext | null = null;

/** ブラウザの自動再生制限を避けるため、開始ボタンなどの操作の中で呼ぶ。 */
export function primeAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
  } catch { /* 音が出せない環境でも練習は続けられる */ }
}
function tone(frequency: number, start: number, length: number, volume: number) {
  if (!context) return;
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.type = 'sine';oscillator.frequency.value = frequency;
  const at = context.currentTime + start;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(volume, at + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, at + length);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(at);oscillator.stop(at + length + .05);
}
export function chime(kind: 'next' | 'done') {
  try {
    if (!context || context.state !== 'running') return;
    if (kind === 'next') { tone(784, 0, .35, .07);tone(1047, .12, .45, .06); }
    else [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .14, .6, .07));
  } catch { /* 無視 */ }
}
