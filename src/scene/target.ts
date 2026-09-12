import * as THREE from 'three';
import type { Shape } from '../shapes';
import { BODY_PARTS, bodyGeometry } from './mannequin';
import { connectionById, type GuidePreset } from '../connections';

/** Shared display passes keep hidden edges readable without triangle wireframes. */
export function createTarget(shape: Shape, connectionId?: string) {
  const root = new THREE.Group(); root.name = shape;
  const resources: { dispose(): void }[] = [];
  const faces: { material: THREE.MeshBasicMaterial | THREE.MeshLambertMaterial; back: boolean; joint: boolean }[] = [];
  const lines: THREE.LineBasicMaterial[] = [];
  const hiddenLines: THREE.LineBasicMaterial[] = [];
  const markers: THREE.MeshBasicMaterial[] = [];
  const standardGuides = new THREE.Group(), learningGuides = new THREE.Group();
  root.add(standardGuides, learningGuides);
  function addPart(name: string, geometry: THREE.BufferGeometry, position: number[], rotation: number[], planar = false, circle = false, joint = false) {
    const part = new THREE.Group();part.name = name;
    part.position.set(position[0], position[1], position[2]);
    part.rotation.set(...rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    root.add(part);resources.push(geometry);
    // Populate nearest-surface depth independently of face opacity, including at 0%.
    const depth = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const mask = new THREE.Mesh(geometry, depth);mask.renderOrder = -1;part.add(mask);resources.push(depth);
    for (const back of planar ? [false, true] : [false]) {
      const Material = shape === 'mannequin' ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial;
      const material = new Material({ transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide });
      const mesh = new THREE.Mesh(geometry, material);mesh.renderOrder = 1;part.add(mesh);resources.push(material);faces.push({ material, back, joint });
    }
    const edges = geometry.userData.contours ?? (circle ? new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos(i * Math.PI / 64), Math.sin(i * Math.PI / 64), 0))) : new THREE.EdgesGeometry(geometry));
    resources.push(edges);
    for (const hidden of [true, false]) {
      const material = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, depthFunc: hidden ? THREE.GreaterDepth : THREE.LessEqualDepth, opacity: hidden ? (shape === 'mannequin' ? .16 : .32) : (shape === 'mannequin' ? .65 : 1) });
      const edge = circle ? new THREE.LineLoop(edges, material) : new THREE.LineSegments(edges, material);
      edge.renderOrder = hidden ? 2 : 3;part.add(edge);resources.push(material);(hidden ? hiddenLines : lines).push(material);
    }
    return part;
  }
  if (connectionId) {
    const nodes = new Map<string, THREE.Group>();
    const definition = connectionById(connectionId);
    for (const p of definition.parts) {
      const geometry = p.kind === 'box' ? new THREE.BoxGeometry(...p.size) : p.kind === 'sphere' ? new THREE.SphereGeometry(.5, 24, 16).scale(...p.size) : new THREE.CylinderGeometry(p.size[0] / 2, p.size[0] / 2, p.size[1], 24);
      const part = addPart(p.id, geometry, p.position, p.rotation);
      if (p.parent) nodes.get(p.parent)!.add(part);
      nodes.set(p.id, part);
    }
    root.updateMatrixWorld(true);
    const guideLine = (points: THREE.Vector3[], group: THREE.Group) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ depthTest: false, depthWrite: false, transparent: true, opacity: .85 });
      const line = new THREE.Line(geometry, material);line.renderOrder = 5;group.add(line);resources.push(geometry, material);lines.push(material);
    };
    for (const p of definition.parts) {
      const node = nodes.get(p.id)!;
      const point = (x: number, y: number, z: number) => node.localToWorld(new THREE.Vector3(x, y, z));
      guideLine([point(0, -p.size[1] / 2, 0), point(0, p.size[1] / 2, 0)], standardGuides);
      // Positive front direction has a small arrowhead; horizontal line marks left/right.
      guideLine([point(-p.size[0] / 2, 0, 0), point(p.size[0] / 2, 0, 0)], learningGuides);
      guideLine([point(0, 0, 0), point(0, 0, p.size[2] / 2 + .16), point(.06, 0, p.size[2] / 2 + .08)], learningGuides);
      if (p.parent) {
        const parent = nodes.get(p.parent)!;
        const parentDefinition = definition.parts.find(item => item.id === p.parent)!;
        const localCenter = parent.worldToLocal(point(0, 0, 0));
        const anchor = localCenter.clone();
        anchor.x = THREE.MathUtils.clamp(anchor.x, -parentDefinition.size[0] / 2, parentDefinition.size[0] / 2);
        anchor.y = THREE.MathUtils.clamp(anchor.y, -parentDefinition.size[1] / 2, parentDefinition.size[1] / 2);
        anchor.z = THREE.MathUtils.clamp(anchor.z, -parentDefinition.size[2] / 2, parentDefinition.size[2] / 2);
        parent.localToWorld(anchor);
        guideLine([anchor, point(0, 0, 0)], learningGuides);
        const geometry = new THREE.SphereGeometry(.045, 12, 8);
        const material = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false });
        const marker = new THREE.Mesh(geometry, material);marker.position.copy(anchor);marker.renderOrder = 6;standardGuides.add(marker);resources.push(geometry, material);
        markers.push(material);
      }
    }
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const factor = 2.5 / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(factor);root.position.copy(center.multiplyScalar(-factor));
  } else if (shape === 'mannequin') {
    for(const p of BODY_PARTS) addPart(p.name,bodyGeometry(p.rings),p.position,p.rotation,false,false,!!p.joint);
    root.scale.setScalar(.40);root.position.y = -7.5 / 2 * .40;
  } else if (shape === 'figure') {
    // Approximation of the user's reference: three separated blocks, opposing tilts.
    addPart('head', new THREE.BoxGeometry(.48, .58, .46), [-.04, 1.02, .02], [-5, -10, 3]);
    addPart('thorax', new THREE.BoxGeometry(.82, .85, .5), [0, .19, 0], [10, 18, -16]);
    addPart('pelvis', new THREE.BoxGeometry(.65, .55, .46), [.04, -.7, .03], [-8, -14, 13]);
  } else {
    const planar = shape === 'square' || shape === 'circle';
    const geometry = shape === 'circle' ? new THREE.CircleGeometry(1, 128) : shape === 'cube' ? new THREE.BoxGeometry(2, 2, 2) : shape === 'cuboid' ? new THREE.BoxGeometry(1.4, 2.2, 1) : new THREE.PlaneGeometry(2, 2);
    addPart(shape, geometry, [0, 0, 0], [0, 0, 0], planar, shape === 'circle');
  }
  let appearance = '';
  return { root,
    setGuides(preset: GuidePreset, complete = false) { standardGuides.visible = !complete && preset !== 'test';learningGuides.visible = !complete && preset === 'learning'; },
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
