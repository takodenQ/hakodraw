import * as THREE from 'three';

/** Geometry and original appearance belong to the target, never the session. */
export function createSquare() {
  const root = new THREE.Group();
  root.name = 'square';
  const geometry = new THREE.PlaneGeometry(2, 2);
  const front = new THREE.MeshBasicMaterial({ color: '#f3dfc5', side: THREE.FrontSide });
  const back = new THREE.MeshBasicMaterial({ color: '#d5b5b2', side: THREE.BackSide });
  root.add(new THREE.Mesh(geometry, front), new THREE.Mesh(geometry, back));
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#76604a' });
  root.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
  return { root,
    setTheme(dark: boolean) {
      front.color.set(dark ? '#c7d0c7' : '#f3dfc5');
      back.color.set(dark ? '#b99895' : '#d5b5b2');
      edgeMaterial.color.set(dark ? '#56675d' : '#76604a');
    },
    dispose() { geometry.dispose(); front.dispose(); back.dispose(); edgeGeometry.dispose(); edgeMaterial.dispose(); },
  };
}
