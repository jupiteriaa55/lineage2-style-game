import * as THREE from "three";
import { isInsideObstacle, WORLD_SIZE } from "./world";
import type { Entity } from "./types";

const HALF = WORLD_SIZE / 2 - 2;

export function moveEntity(
  e: Entity,
  speed: number,
  dt: number,
  obstacleBoxes: THREE.Box3[],
): void {
  if (!e.moveTarget) return;
  const dir = new THREE.Vector3().subVectors(e.moveTarget, e.position);
  dir.y = 0;
  const dist = dir.length();
  if (dist < 0.15) {
    e.moveTarget = null;
    return;
  }
  dir.normalize();
  const step = Math.min(dist, speed * dt);
  const next = e.position.clone().add(dir.clone().multiplyScalar(step));
  next.x = THREE.MathUtils.clamp(next.x, -HALF, HALF);
  next.z = THREE.MathUtils.clamp(next.z, -HALF, HALF);
  if (!isInsideObstacle(next, obstacleBoxes, 0.7)) {
    e.position.x = next.x;
    e.position.z = next.z;
  } else {
    const slideX = e.position.clone();
    slideX.x = next.x;
    if (!isInsideObstacle(slideX, obstacleBoxes, 0.7)) {
      e.position.x = slideX.x;
    } else {
      const slideZ = e.position.clone();
      slideZ.z = next.z;
      if (!isInsideObstacle(slideZ, obstacleBoxes, 0.7)) {
        e.position.z = slideZ.z;
      } else {
        e.moveTarget = null;
      }
    }
  }
  if (dir.lengthSq() > 0.0001) {
    const targetRot = Math.atan2(dir.x, dir.z);
    const cur = e.group.rotation.y;
    let diff = targetRot - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    e.group.rotation.y = cur + diff * Math.min(1, dt * 10);
  }
}

export function bobAnimation(e: Entity, t: number): void {
  const moving = !!e.moveTarget;
  if (moving) {
    e.group.position.y = Math.abs(Math.sin(t * 12)) * 0.06;
  } else {
    e.group.position.y *= 0.85;
  }
}
