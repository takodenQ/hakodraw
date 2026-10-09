import * as THREE from 'three';
import type { Shape } from '../shapes';
import { BODY_PARTS, bodyGeometry as mannequinGeometry } from './mannequin';
import { connectionById, FIGURE_PARTS, type GuidePreset } from '../connections';
import { BODY_SETS, MODELS, PART_LABELS, bodyPose, linkPivot, type BodyType, type JointId, type PartId } from '../body';
import { bodyGeometry, rectCorners } from './bodyMesh';

export type JointRotations = Partial<Record<JointId, THREE.Quaternion>>;

/** Shared display passes keep hidden edges readable without triangle wireframes. */
export function createTarget(shape: Shape, connectionId?: string, bodyType: BodyType = 'male') {
  const root = new THREE.Group(); root.name = shape;
  const resources: { dispose(): void }[] = [];
  const faces: { material: THREE.MeshBasicMaterial | THREE.MeshLambertMaterial; back: boolean; joint: boolean }[] = [];
  const lines: THREE.LineBasicMaterial[] = [];
  const hiddenLines: THREE.LineBasicMaterial[] = [];
  const markers: THREE.MeshBasicMaterial[] = [];
  const standardGuides: THREE.Object3D[] = [], learningGuides: THREE.Object3D[] = [];
  const jointGroups: [JointId, THREE.Group][] = [];
  const lit = shape === 'mannequin' || !!connectionId;
  /** 面（不透明度0%でも奥行き判定を保つマスクつき）と、手前・奥の輪郭線を持つ部品を作る。 */
  function createMesh(name: string, geometry: THREE.BufferGeometry, planar = false, circle = false, joint = false) {
    const part = new THREE.Group();part.name = name;resources.push(geometry);
    // Populate nearest-surface depth independently of face opacity, including at 0%.
    const depth = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const mask = new THREE.Mesh(geometry, depth);mask.renderOrder = -1;part.add(mask);resources.push(depth);
    for (const back of planar ? [false, true] : [false]) {
      const Material = lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial;
      const material = new Material({ transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide });
      const mesh = new THREE.Mesh(geometry, material);mesh.renderOrder = 1;part.add(mesh);resources.push(material);faces.push({ material, back, joint });
    }
    const edges = geometry.userData.contours ?? (circle ? new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos(i * Math.PI / 64), Math.sin(i * Math.PI / 64), 0))) : new THREE.EdgesGeometry(geometry));
    resources.push(edges);
    for (const hidden of [true, false]) {
      const material = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, depthFunc: hidden ? THREE.GreaterDepth : THREE.LessEqualDepth, opacity: hidden ? (lit ? .2 : .32) : (lit ? .8 : 1) });
      const edge = circle ? new THREE.LineLoop(edges, material) : new THREE.LineSegments(edges, material);
      edge.renderOrder = hidden ? 2 : 3;part.add(edge);resources.push(material);(hidden ? hiddenLines : lines).push(material);
    }
    return part;
  }
  function addPart(name: string, geometry: THREE.BufferGeometry, position: number[], rotation: number[], planar = false, circle = false, joint = false) {
    const part = createMesh(name, geometry, planar, circle, joint);
    part.position.set(position[0], position[1], position[2]);
    part.rotation.set(...rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    root.add(part);
    return part;
  }
  /** Real-scale (metre) bodies are normalised to the same on-screen size as the other targets. */
  function fitToView() {
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const factor = 2.5 / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(factor);root.position.copy(center.multiplyScalar(-factor));
  }
  if (connectionId) buildBody(connectionById(connectionId).id);
  else if (shape === 'mannequin') {
    for(const p of BODY_PARTS) addPart(p.name,mannequinGeometry(p.rings),p.position,p.rotation,false,false,!!p.joint);
    root.scale.setScalar(.40);root.position.y = -7.5 / 2 * .40;
  } else if (shape === 'figure') {
    // Three separated blocks with opposing tilts, sized for a 180cm adult male.
    for (const p of FIGURE_PARTS) addPart(p.id, new THREE.BoxGeometry(...p.size), p.position, p.rotation);
    fitToView();
  } else {
    const planar = shape === 'square' || shape === 'circle';
    const geometry = shape === 'circle' ? new THREE.CircleGeometry(1, 128) : shape === 'cube' ? new THREE.BoxGeometry(2, 2, 2) : shape === 'cuboid' ? new THREE.BoxGeometry(1.4, 2.2, 1) : new THREE.PlaneGeometry(2, 2);
    addPart(shape, geometry, [0, 0, 0], [0, 0, 0], planar, shape === 'circle');
  }

  /**
   * 三面図の人体モデルから、接続練習の組み合わせを組み立てる。各パーツは関節のピボットを原点にしたグループで、
   * setPose で関節を回すと子パーツも一緒に動く。どんなポーズ・向きでも画面に収まる大きさにそろえる。
   */
  function buildBody(setId: string) {
    const links = BODY_SETS[setId], model = MODELS[bodyType];
    const groups = new Map<PartId, THREE.Group>(), pivots = new Map<PartId, THREE.Vector3>();
    // 大きさを決めるための代表点（角柱の角、球は中心と半径）
    const probes: { group: THREE.Group; point: THREE.Vector3; pad: number }[] = [];
    for (const link of links) {
      const pivot = new THREE.Vector3(...linkPivot(link, model)), parentPivot = link.parent ? pivots.get(link.parent)! : new THREE.Vector3();
      const group = new THREE.Group();group.name = PART_LABELS[link.part];
      group.position.copy(pivot).sub(parentPivot);
      (link.parent ? groups.get(link.parent)! : root).add(group);
      groups.set(link.part, group);pivots.set(link.part, pivot);
      if (link.joint) jointGroups.push([link.joint, group]);
      for (const s of model.parts[link.part]) {
        const geometry = bodyGeometry(s);
        geometry.translate(-pivot.x, -pivot.y, -pivot.z);geometry.userData.contours.translate(-pivot.x, -pivot.y, -pivot.z);
        group.add(createMesh(PART_LABELS[link.part], geometry, false, false, s.kind === 'ball'));
        if (s.kind === 'ball') probes.push({ group, point: new THREE.Vector3(...s.c).sub(pivot), pad: s.r });
        else {
          const positions = geometry.getAttribute('position');
          for (let i = 0; i < positions.count; i++) probes.push({ group, point: new THREE.Vector3().fromBufferAttribute(positions, i), pad: 0 });
        }
      }
    }
    // 基準姿勢での全体の中心（ここを中心に回す）と、ランダムなポーズで中心から最も離れる距離。
    const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
    let radius = 0;
    const world = new THREE.Vector3(), sampleRotations: JointRotations = {};
    for (let index = -1; index < 240; index++) {
      const pose = index < 0 ? null : bodyPose(setId, 0x5eed, index, bodyType);
      for (const [id] of jointGroups) sampleRotations[id] = new THREE.Quaternion(...(pose?.joints[id] ?? [0, 0, 0, 1]));
      for (const [id, group] of jointGroups) group.quaternion.copy(sampleRotations[id]!);
      root.updateMatrixWorld(true);
      for (const probe of probes) radius = Math.max(radius, world.copy(probe.point).applyMatrix4(probe.group.matrixWorld).distanceTo(center) + probe.pad);
    }
    for (const [, group] of jointGroups) group.quaternion.identity();
    // 試したポーズより少し大きく広がっても収まるよう、余裕を持たせる（表示の半径は約1.9）。
    const factor = 1.5 / radius, unit = 1 / factor;
    root.scale.setScalar(factor);root.position.copy(center).multiplyScalar(-factor);

    // ---- 補助表示（パーツと一緒に動くよう、各グループの中に置く） ----
    const guideLine = (group: THREE.Group, points: THREE.Vector3[], list: THREE.Object3D[]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ depthTest: false, depthWrite: false, transparent: true, opacity: .85 });
      const line = new THREE.Line(geometry, material);line.renderOrder = 5;group.add(line);resources.push(geometry, material);lines.push(material);list.push(line);
    };
    const markerGeometry = new THREE.SphereGeometry(.045 * unit, 12, 8);resources.push(markerGeometry);
    for (const link of links) {
      const group = groups.get(link.part)!, pivot = pivots.get(link.part)!;
      const local = (v: readonly number[]) => new THREE.Vector3(v[0], v[1], v[2]).sub(pivot);
      // 中心線（標準）、左右の線と正面の矢印（学習）。手のように複数の形があるパーツは、最初の形（手のひら）だけに付ける。
      const s = model.parts[link.part][0];
      if (s.kind === 'loft') {
        const bottom = local(s.bottom.c), top = local(s.top.c), mid = bottom.clone().lerp(top, .5);
        guideLine(group, [bottom, top], standardGuides);
        const corners = rectCorners({ ...s.bottom, c: [mid.x + pivot.x, mid.y + pivot.y, mid.z + pivot.z] }).map(c => c.sub(pivot));
        const right = corners[1].clone().add(corners[2]).multiplyScalar(.5), leftSide = corners[0].clone().add(corners[3]).multiplyScalar(.5);
        const front = corners[2].clone().add(corners[3]).multiplyScalar(.5).sub(mid);
        const tip = mid.clone().add(front.clone().setLength(front.length() + .16 * unit));
        guideLine(group, [leftSide, right], learningGuides);
        guideLine(group, [mid, tip, tip.clone().add(new THREE.Vector3(.06 * unit, 0, -.08 * unit))], learningGuides);
      }
      // 接続点（標準）と、関節の軸（学習）。固定の関節球は、その先のパーツの関節と同じ点なので印を重ねない。
      if (!link.parent || (!link.joint && s.kind === 'ball')) continue;
      const material = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false });
      const marker = new THREE.Mesh(markerGeometry, material);marker.renderOrder = 6;group.add(marker);resources.push(material);markers.push(material);standardGuides.push(marker);
      if (link.joint) {
        const joint = model.joints[link.joint];
        guideLine(group, [new THREE.Vector3(), new THREE.Vector3(...joint.twistAxis).multiplyScalar(.3 * unit)], learningGuides);
        if (joint.dofs.length <= 2 && joint.dofs[0].axis === 'x') guideLine(group, [new THREE.Vector3(-.18 * unit, 0, 0), new THREE.Vector3(.18 * unit, 0, 0)], learningGuides);
      }
    }
  }

  let appearance = '';
  return { root,
    setGuides(preset: GuidePreset, complete = false) {
      for (const object of standardGuides) object.visible = !complete && preset !== 'test';
      for (const object of learningGuides) object.visible = !complete && preset === 'learning';
    },
    /** 関節の回転（親パーツの向きでの回転）を当てる。指定のない関節は基準姿勢に戻す。 */
    setPose(joints: JointRotations) {
      for (const [id, group] of jointGroups) { const q = joints[id];if (q) group.quaternion.copy(q);else group.quaternion.identity(); }
    },
    jointIds(): JointId[] { return jointGroups.map(([id]) => id); },
    setAppearance(dark: boolean, opacity: number, brightness: number) {
      const key = `${dark}:${opacity}:${brightness}`;if (key === appearance) return;appearance = key;
      for (const { material, back, joint } of faces) {
        material.opacity = opacity / 100;
        material.color.setHSL(back ? .01 : dark ? .36 : .09, back ? .2 : dark ? .08 : .28, Math.max(0, brightness / 100 - (back ? .12 : joint ? .30 : 0)), THREE.SRGBColorSpace);
      }
      for (const material of [...lines, ...hiddenLines]) material.color.set(dark ? '#d5ded9' : '#655144');
      for (const material of markers) material.color.set(dark ? '#ffd49b' : '#8c3b13');
    },
    dispose() { resources.forEach(resource => resource.dispose()); },
  };
}
