import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CONNECTIONS, connectionById } from './connections';
import { BODY_SETS, PARTS, bodyPose, type JointId } from './body';
import { createTarget, type JointRotations } from './scene/target';
import { parseSettings } from './settings';

const rotations = (pose: ReturnType<typeof bodyPose>): JointRotations =>
  Object.fromEntries(Object.entries(pose.joints).map(([id, q]) => [id as JointId, new THREE.Quaternion(...q!)]));

describe('connection items', () => {
  it('restores preferences, repairs unknown values and migrates old ids', () => {
    expect(parseSettings({ connectionId: 'leg-foot', guidePreset: 'test' })).toMatchObject({ connectionId: 'leg-foot', guidePreset: 'test' });
    expect(parseSettings({ connectionId: 'missing', guidePreset: 'missing' })).toMatchObject({ connectionId: 'head-neck-thorax', guidePreset: 'standard' });
    expect(connectionById('head-chest').id).toBe('head-neck-thorax');
    expect(connectionById('thigh-shin').id).toBe('leg-foot');
    expect(parseSettings({ connectionId: 'chest-pelvis' }).connectionId).toBe('thorax-abdomen-pelvis');
  });
  it('offers the six requested groupings, each backed by a body set', () => {
    expect(CONNECTIONS.map(item => item.label)).toEqual(['頭・首・胸郭', '胸郭・肩・上腕', '上腕・肘・前腕・手', '胸郭・腹部・腰', '腰・太もも', '太もも・膝・ふくらはぎ・足']);
    for (const item of CONNECTIONS) expect(BODY_SETS[item.id]?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('body targets', () => {
  it('build every part under its parent and dispose cleanly', () => {
    for (const item of CONNECTIONS) {
      const target = createTarget('square', item.id);
      for (const link of BODY_SETS[item.id]) {
        const node = target.root.getObjectByName(PARTS[link.part].label);
        expect(node, link.part).toBeTruthy();
        if (link.parent) expect(node!.parent!.name).toBe(PARTS[link.parent].label);
      }
      expect(new THREE.Box3().setFromObject(target.root).isEmpty()).toBe(false);
      target.setGuides('learning');target.setGuides('test');target.setAppearance(true, 0, 75);target.dispose();
    }
  });
  it('bends children around their joints while the root stays put', () => {
    const target = createTarget('square', 'arm-hand');
    const world = (label: string) => target.root.getObjectByName(label)!.getWorldPosition(new THREE.Vector3());
    target.root.updateMatrixWorld(true);
    const upper = world('右上腕'), forearm = world('右前腕'), hand = world('右手');
    target.setPose({ elbowR: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2) });
    target.root.updateMatrixWorld(true);
    expect(world('右上腕').distanceTo(upper)).toBeLessThan(1e-9);
    expect(world('右前腕').distanceTo(forearm)).toBeLessThan(1e-9);
    expect(world('右手').distanceTo(hand)).toBeGreaterThan(.1);
    // 肘を曲げると、手首は前（+Z）へ出る
    expect(world('右手').z).toBeGreaterThan(hand.z);
    target.dispose();
  });
  it('keeps every random pose and view inside the frame', () => {
    // 表示枠の半分は約1.93（焦点距離50mm・距離5.5）。大きさを決めた時とは別の種のポーズで確かめる。
    for (const item of CONNECTIONS) {
      const target = createTarget('square', item.id), pivot = new THREE.Group();pivot.add(target.root);
      let largest = 0;
      for (let index = 0; index < 60; index++) {
        const pose = bodyPose(item.id, 7, index);
        target.setPose(rotations(pose));pivot.quaternion.set(...pose.orientation);pivot.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(pivot);
        for (const v of [box.min, box.max]) for (const c of [v.x, v.y, v.z]) largest = Math.max(largest, Math.abs(c));
      }
      expect(largest, item.id).toBeLessThan(1.85);
      expect(largest, item.id).toBeGreaterThan(.9);
      target.dispose();
    }
  });
});
