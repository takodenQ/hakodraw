import { expect, it } from 'vitest';
import * as THREE from 'three';
import { CONNECTIONS } from './connections';
import { createTarget } from './scene/target';
import { parseSettings } from './settings';

it('restores connection preferences and repairs unknown values', () => {
  expect(parseSettings({ connectionId: 'thigh-shin', guidePreset: 'test' })).toMatchObject({ connectionId: 'thigh-shin', guidePreset: 'test' });
  expect(parseSettings({ connectionId: 'missing', guidePreset: 'missing' })).toMatchObject({ connectionId: 'head-chest', guidePreset: 'standard' });
});
it('builds every hierarchy and preserves relative transforms under full rotation', () => {
  for (const definition of CONNECTIONS) {
    const target = createTarget('square', definition.id);
    for (const part of definition.parts) {
      const node = target.root.getObjectByName(part.id)!;
      expect(node).toBeTruthy();
      if (part.parent) expect(node.parent!.name).toBe(part.parent);
      const before = node.position.clone();
      target.root.rotateY(Math.PI / 3);target.root.updateMatrixWorld(true);
      expect(node.position.equals(before)).toBe(true);
    }
    expect(new THREE.Box3().setFromObject(target.root).isEmpty()).toBe(false);
    target.setGuides('test');target.setAppearance(false, 0, 75);target.dispose();
  }
});
