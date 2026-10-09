/** 種から決まる乱数列（同じ種なら同じ問題を再現できる）。 */
export const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
/** 練習ごとの種と問題番号から、その問題専用の種を作る。 */
export const questionSeed = (seed: number, index: number) => (seed ^ Math.imul(index + 1, 0x9E3779B1)) >>> 0;
