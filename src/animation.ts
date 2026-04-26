import * as THREE from "three";
import type { Entity } from "./types";

const _restColor = new THREE.Color();
const _hitColor = new THREE.Color(2.0, 0.6, 0.6);

export function startAttackAnim(e: Entity): void {
  if (!e.anim) return;
  e.anim.state = "attack";
  e.anim.stateTime = 0;
  e.anim.attackProgress = 0;
  e.anim.swingDir = e.anim.swingDir === 1 ? -1 : 1;
}

export function startCastAnim(e: Entity, duration = 0.45): void {
  if (!e.anim) return;
  e.anim.state = "cast";
  e.anim.stateTime = 0;
  e.anim.castProgress = 0;
  e.anim.attackProgress = duration;
}

export function startHitFlash(e: Entity, duration = 0.18): void {
  if (!e.anim) return;
  e.anim.hitFlash = duration;
}

export function startDeathAnim(e: Entity): void {
  if (!e.anim) return;
  e.anim.state = "death";
  e.anim.stateTime = 0;
}

export function tickAnimation(
  e: Entity,
  dt: number,
  isMoving: boolean,
): void {
  if (!e.rig || !e.anim) return;
  const rig = e.rig;
  const anim = e.anim;
  anim.stateTime += dt;

  if (anim.hitFlash > 0) {
    anim.hitFlash = Math.max(0, anim.hitFlash - dt);
    const t = anim.hitFlash > 0 ? Math.min(1, anim.hitFlash / 0.18) : 0;
    for (const m of rig.bodyMaterials) {
      _restColor.set(0xffffff);
      m.color.copy(_restColor).lerp(_hitColor, t * 0.5);
    }
  }

  // resolve current animation state
  if (anim.state === "death") {
    const t = Math.min(1, anim.stateTime / 0.7);
    rig.body.rotation.x = -Math.PI * 0.5 * t;
    rig.body.position.y = -t * 0.2;
    return;
  } else {
    rig.body.rotation.x = 0;
    rig.body.position.y = 0;
  }

  e.bobTime = (e.bobTime ?? 0) + dt;

  if (anim.state === "attack") {
    const dur = 0.42;
    anim.attackProgress = Math.min(1, anim.stateTime / dur);
    const p = anim.attackProgress;
    // wind-up 0..0.4, swing 0.4..0.85, return 0.85..1
    let swing = 0;
    if (p < 0.4) swing = -1.0 * (p / 0.4);
    else if (p < 0.85) swing = -1.0 + 3.6 * ((p - 0.4) / 0.45);
    else swing = 2.6 * (1 - (p - 0.85) / 0.15) - 0;
    rig.armR.rotation.x = -swing * 0.85;
    rig.armR.rotation.z = anim.swingDir * 0.4 * Math.sin(p * Math.PI);
    rig.armL.rotation.x = -0.3 * Math.sin(p * Math.PI);
    if (rig.weaponPivot) {
      rig.weaponPivot.rotation.x = -0.5 - swing * 0.4;
      rig.weaponPivot.rotation.z = anim.swingDir * 0.7 * Math.sin(p * Math.PI);
    }
    if (p >= 1) {
      anim.state = isMoving ? "walk" : "idle";
      anim.stateTime = 0;
    }
    return;
  }

  if (anim.state === "cast") {
    const p = Math.min(1, anim.stateTime / (anim.attackProgress || 0.45));
    // raise both arms forward and up
    const lift = Math.sin(p * Math.PI);
    rig.armL.rotation.x = -1.8 * lift;
    rig.armR.rotation.x = -1.8 * lift;
    rig.armL.rotation.z = 0.3 * lift;
    rig.armR.rotation.z = -0.3 * lift;
    if (rig.weaponPivot) {
      rig.weaponPivot.rotation.x = -0.5 - 1.0 * lift;
      rig.weaponPivot.rotation.z = 0;
    }
    if (p >= 1) {
      anim.state = isMoving ? "walk" : "idle";
      anim.stateTime = 0;
    }
    return;
  }

  // idle / walk loop
  if (isMoving) {
    anim.state = "walk";
    const t = (e.bobTime ?? 0) * 8;
    const swing = Math.sin(t) * 0.55;
    rig.legL.rotation.x = swing;
    rig.legR.rotation.x = -swing;
    rig.armL.rotation.x = -swing * 0.7 + 0.1;
    rig.armR.rotation.x = swing * 0.7 + 0.1;
    rig.armL.rotation.z = -0.05;
    rig.armR.rotation.z = 0.05;
    if (rig.weaponPivot) rig.weaponPivot.rotation.x = -0.5;
    rig.body.position.y = Math.abs(Math.sin(t)) * 0.06;
  } else {
    anim.state = "idle";
    const t = (e.bobTime ?? 0) * 1.6;
    const breath = Math.sin(t) * 0.04;
    rig.body.position.y = breath;
    const armSway = Math.sin(t) * 0.04;
    rig.armL.rotation.x = 0.1 + armSway;
    rig.armR.rotation.x = 0.1 + armSway;
    rig.armL.rotation.z = -0.05;
    rig.armR.rotation.z = 0.05;
    rig.legL.rotation.x = 0;
    rig.legR.rotation.x = 0;
    if (rig.weaponPivot) rig.weaponPivot.rotation.x = -0.5;
  }
}

export function resetEntityVisuals(e: Entity): void {
  if (!e.rig) return;
  e.rig.body.rotation.x = 0;
  e.rig.body.position.y = 0;
  e.rig.armL.rotation.set(0.1, 0, -0.05);
  e.rig.armR.rotation.set(0.1, 0, 0.05);
  e.rig.legL.rotation.set(0, 0, 0);
  e.rig.legR.rotation.set(0, 0, 0);
  if (e.rig.weaponPivot) e.rig.weaponPivot.rotation.set(-0.5, 0, 0);
  for (const m of e.rig.bodyMaterials) m.color.set(0xffffff);
  if (e.anim) {
    e.anim.state = "idle";
    e.anim.stateTime = 0;
    e.anim.hitFlash = 0;
  }
}
