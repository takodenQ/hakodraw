import * as THREE from 'three';
import type { Shape } from '../shapes';

/** Shared display passes keep hidden edges readable without triangle wireframes. */
export function createTarget(shape: Shape) {
  const root = new THREE.Group(); root.name = shape;
  const resources: { dispose(): void }[] = [];
  const faces: { material: THREE.MeshBasicMaterial; back: boolean }[] = [];
  const lines: THREE.LineBasicMaterial[] = [];
  const hiddenLines: THREE.LineBasicMaterial[] = [];
  function addPart(name: string, geometry: THREE.BufferGeometry, position: number[], rotation: number[], planar = false, circle = false) {
    const part = new THREE.Group();part.name = name;
    part.position.set(position[0], position[1], position[2]);
    part.rotation.set(...rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    root.add(part);resources.push(geometry);
    // Populate nearest-surface depth independently of face opacity, including at 0%.
    const depth = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const mask = new THREE.Mesh(geometry, depth);mask.renderOrder = -1;part.add(mask);resources.push(depth);
    for (const back of planar ? [false, true] : [false]) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide });
      const mesh = new THREE.Mesh(geometry, material);mesh.renderOrder = 1;part.add(mesh);resources.push(material);faces.push({ material, back });
    }
    const edges = circle ? new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos(i * Math.PI / 64), Math.sin(i * Math.PI / 64), 0))) : new THREE.EdgesGeometry(geometry);
    resources.push(edges);
    for (const hidden of [true, false]) {
      const material = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, depthFunc: hidden ? THREE.GreaterDepth : THREE.LessEqualDepth, opacity: hidden ? .32 : 1 });
      const edge = circle ? new THREE.LineLoop(edges, material) : new THREE.LineSegments(edges, material);
      edge.renderOrder = hidden ? 2 : 3;part.add(edge);resources.push(material);(hidden ? hiddenLines : lines).push(material);
    }
  }
  if (shape === 'figure') {
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
    setAppearance(dark: boolean, opacity: number, brightness: number) {
      const key = `${dark}:${opacity}:${brightness}`;if (key === appearance) return;appearance = key;
      for (const { material, back } of faces) {
        material.opacity = opacity / 100;
        material.color.setHSL(back ? .01 : dark ? .36 : .09, back ? .2 : dark ? .08 : .28, Math.max(0, brightness / 100 - (back ? .12 : 0)), THREE.SRGBColorSpace);
      }
      for (const material of [...lines, ...hiddenLines]) material.color.set(dark ? '#d5ded9' : '#655144');
    },
    dispose() { resources.forEach(resource => resource.dispose()); },
  };
}
