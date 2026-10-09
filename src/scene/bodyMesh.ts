import * as THREE from 'three';
import type { BodyShape, Rect } from '../body';

const deg = Math.PI / 180;
const vec = (v: readonly number[]) => new THREE.Vector3(v[0], v[1], v[2]);

/** 断面の4隅：後ろ左・後ろ右・前右・前左。 */
export function rectCorners(r: Rect): THREE.Vector3[] {
  const u = new THREE.Vector3(Math.cos(r.roll * deg), Math.sin(r.roll * deg), 0);
  const v = new THREE.Vector3(0, -Math.sin(r.tilt * deg), Math.cos(r.tilt * deg));
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => vec(r.c).addScaledVector(u, sx * r.w / 2).addScaledVector(v, sz * r.d / 2));
}

/**
 * 凸な立体を、面ごとに平らな法線で作る。面の向きは立体の中心から外向きにそろえる。
 * 輪郭線（三角形の分割線ではなく、立体の辺と目印の線）は userData.contours に入れる。
 */
function solid(points: THREE.Vector3[], polygons: number[][], edges: [number, number][], extra: [THREE.Vector3, THREE.Vector3][] = []) {
  const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(points.length);
  const positions: number[] = [];
  for (const polygon of polygons) {
    const normal = new THREE.Vector3(), mid = new THREE.Vector3();
    polygon.forEach((index, i) => {
      const a = points[index], b = points[polygon[(i + 1) % polygon.length]];
      normal.x += (a.y - b.y) * (a.z + b.z);normal.y += (a.z - b.z) * (a.x + b.x);normal.z += (a.x - b.x) * (a.y + b.y);
      mid.add(a);
    });
    mid.divideScalar(polygon.length);
    const ordered = normal.dot(mid.sub(center)) < 0 ? [...polygon].reverse() : polygon;
    for (let i = 1; i < ordered.length - 1; i++) for (const index of [ordered[0], ordered[i], ordered[i + 1]]) positions.push(points[index].x, points[index].y, points[index].z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const lines: number[] = [];
  for (const [a, b] of edges) lines.push(...points[a].toArray(), ...points[b].toArray());
  for (const [a, b] of extra) lines.push(...a.toArray(), ...b.toArray());
  geometry.userData.contours = new THREE.BufferGeometry();
  geometry.userData.contours.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  return geometry;
}

function loft(shape: Extract<BodyShape, { kind: 'loft' }>) {
  const bottom = rectCorners(shape.bottom), top = rectCorners(shape.top), points = [...bottom, ...top];
  const polygons = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const extra: [THREE.Vector3, THREE.Vector3][] = [];
  for (const f of shape.marks ?? []) {
    const ring = bottom.map((b, i) => b.clone().lerp(top[i], f));
    ring.forEach((p, i) => extra.push([p, ring[(i + 1) % 4]]));
  }
  if (shape.midline) {
    const middle = (a: THREE.Vector3, b: THREE.Vector3) => a.clone().add(b).multiplyScalar(.5);
    extra.push([middle(bottom[2], bottom[3]), middle(top[2], top[3])], [middle(bottom[0], bottom[1]), middle(top[0], top[1])]);
  }
  return solid(points, polygons, edges, extra);
}

function prism(shape: Extract<BodyShape, { kind: 'prism' }>) {
  const n = shape.profile.length, side: THREE.Vector3[][] = [[], []];
  for (const [z, y] of shape.profile) {
    const t = (y - shape.bottom.y) / (shape.top.y - shape.bottom.y);
    const cx = THREE.MathUtils.lerp(shape.bottom.cx, shape.top.cx, t), w = THREE.MathUtils.lerp(shape.bottom.w, shape.top.w, t);
    side[0].push(new THREE.Vector3(cx - w / 2, y, z));side[1].push(new THREE.Vector3(cx + w / 2, y, z));
  }
  const points = [...side[0], ...side[1]], ring = Array.from({ length: n }, (_, i) => i);
  const polygons = [ring, ring.map(i => n + i), ...ring.map(i => [i, (i + 1) % n, n + (i + 1) % n, n + i])];
  const edges: [number, number][] = ring.flatMap(i => [[i, (i + 1) % n], [n + i, n + (i + 1) % n], [i, n + i]] as [number, number][]);
  return solid(points, polygons, edges);
}

function sphere(shape: Extract<BodyShape, { kind: 'ball' }>) {
  const geometry = new THREE.SphereGeometry(shape.r, 24, 16).translate(...shape.c);
  // 向きが分かるよう、直交する3本の大円を輪郭として描く。
  const lines: number[] = [], steps = 48;
  for (const axis of ['x', 'y', 'z'] as const) for (let i = 0; i < steps; i++) for (const k of [i, i + 1]) {
    const a = k / steps * Math.PI * 2, c = Math.cos(a) * shape.r, s = Math.sin(a) * shape.r;
    const p = axis === 'x' ? [0, c, s] : axis === 'y' ? [c, 0, s] : [c, s, 0];
    lines.push(p[0] + shape.c[0], p[1] + shape.c[1], p[2] + shape.c[2]);
  }
  geometry.userData.contours = new THREE.BufferGeometry();
  geometry.userData.contours.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  return geometry;
}

/** 三面図の座標のまま（基準姿勢の位置で）立体を作る。 */
export function bodyGeometry(shape: BodyShape): THREE.BufferGeometry {
  return shape.kind === 'loft' ? loft(shape) : shape.kind === 'prism' ? prism(shape) : sphere(shape);
}
