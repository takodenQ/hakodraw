import * as THREE from 'three';
import { createSquare } from './target';
import type { Axis } from '../settings';
import type { Phase } from '../session';

export interface ViewState {
  axis: Axis; angle: number; phase: Phase; showAxes: boolean; dark: boolean;
  completedAt: number; reducedMotion: boolean; axisPulseAt: number;
}
export interface LabelPosition { axis: Axis; x: number; y: number; depth: number }
const directions = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
const identity = new THREE.Quaternion();

export function createScene(host: HTMLDivElement, labels: (positions: LabelPosition[]) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Three.jsで描画した正方形');
  renderer.domElement.setAttribute('role', 'img');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.setFocalLength(50);
  camera.position.set(0, 0, 5.5);
  camera.lookAt(0, 0, 0);
  const target = createSquare();
  const pivot = new THREE.Group();
  pivot.add(target.root);scene.add(pivot);
  const axes = new THREE.Group();pivot.add(axes);
  const arrows = (['X', 'Y', 'Z'] as Axis[]).map(axis => {
    const arrow = new THREE.ArrowHelper(directions[axis], new THREE.Vector3(), .72, '#000000', .09, .045);
    arrow.line.renderOrder = 10;arrow.cone.renderOrder = 10;
    const materials = [arrow.line.material, arrow.cone.material].flat() as THREE.Material[];
    materials.forEach(m => { m.depthTest = false; m.depthWrite = false; m.transparent = true; });
    axes.add(arrow);return { axis, arrow, materials };
  });
  let lastDark: boolean | undefined;
  const resize = () => {
    const side = Math.max(1, host.clientWidth);
    renderer.setSize(side, side, false);
    camera.aspect = 1;camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);observer.observe(host);resize();
  const initial = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  return {
    render(state: ViewState, now: number) {
      if (lastDark !== state.dark) {
        lastDark = state.dark;
        renderer.setClearColor(state.dark ? '#303532' : '#fffdf9');target.setTheme(state.dark);
        const colors = state.dark ? ['#ea9098', '#69a881', '#7b9fe0'] : ['#a63d42', '#287044', '#315db0'];
        arrows.forEach(({ arrow }, i) => arrow.setColor(new THREE.Color(colors[i])));
      }
      initial.setFromAxisAngle(directions[state.axis], state.angle);
      pivot.quaternion.copy(initial);pivot.position.set(0, 0, 0);
      let celebration = 0;
      if (state.phase === 'complete') {
        celebration = state.reducedMotion ? 1 : Math.min(1, Math.max(0, (now - state.completedAt) / 2000));
        const settle = Math.min(1, celebration / .65);
        const ease = 1 - (1 - settle) ** 3;
        pivot.quaternion.slerp(identity, ease);
        spin.setFromAxisAngle(directions.Z, 2 * Math.PI * ease + .1 * Math.sin(Math.PI * Math.max(0, (celebration - .65) / .35)));
        pivot.quaternion.premultiply(spin);
        pivot.position.y = .32 * ease + .28 * Math.sin(Math.PI * settle);
      }
      axes.visible = state.showAxes && state.phase !== 'complete';
      for (const { axis, arrow } of arrows) {
        const pulse = !state.reducedMotion && state.phase === 'setup' ? Math.max(0, 1 - (now - state.axisPulseAt) / 650) : 0;
        arrow.setLength(.72, .09, .045 * (axis === state.axis ? 1 + .8 * Math.sin(pulse * Math.PI) : 1));
      }
      pivot.updateMatrixWorld(true);
      labels(arrows.map(({ axis }) => {
        const endpoint = directions[axis].clone().multiplyScalar(.88).applyMatrix4(pivot.matrixWorld);
        const depth = endpoint.z;endpoint.project(camera);
        return { axis, x: (endpoint.x + 1) * 50, y: (1 - endpoint.y) * 50, depth };
      }));
      renderer.render(scene, camera);
      return celebration;
    },
    dispose() {
      observer.disconnect();target.dispose();
      arrows.forEach(({ arrow, materials }) => { arrow.line.geometry.dispose();arrow.cone.geometry.dispose();materials.forEach(m => m.dispose()); });
      renderer.dispose();renderer.domElement.remove();
    },
  };
}
