import * as THREE from "three";
import { getXpReward, updateHpBar } from "./entities";
import type { Entity, Skill } from "./types";

export interface CombatHooks {
  onDamage(target: Entity, amount: number, isCrit: boolean): void;
  onHeal(target: Entity, amount: number): void;
  onKill(killer: Entity, victim: Entity): void;
}

export function performAttack(
  attacker: Entity,
  target: Entity,
  hooks: CombatHooks,
  baseDamage?: number,
): void {
  if (!target.alive || !attacker.alive) return;
  const base =
    baseDamage ??
    Math.max(1, attacker.stats.attack - target.stats.defense * 0.5);
  const variance = 0.85 + Math.random() * 0.3;
  const isCrit = Math.random() < 0.12;
  const dmg = Math.round(base * variance * (isCrit ? 1.8 : 1));
  target.stats.hp = Math.max(0, target.stats.hp - dmg);
  updateHpBar(target);
  hooks.onDamage(target, dmg, isCrit);
  if (target.stats.hp <= 0) {
    target.alive = false;
    if (target.respawn) {
      target.respawn.at = performance.now() / 1000 + 14;
    }
    hooks.onKill(attacker, target);
  }
}

export function applyHeal(target: Entity, amount: number, hooks: CombatHooks): void {
  if (!target.alive) return;
  const before = target.stats.hp;
  target.stats.hp = Math.min(target.stats.hpMax, target.stats.hp + amount);
  const real = target.stats.hp - before;
  hooks.onHeal(target, real);
}

export interface XPState {
  xp: number;
  toNext: number;
}

export function newXPState(): XPState {
  return { xp: 0, toNext: 100 };
}

export function grantXP(
  player: Entity,
  state: XPState,
  victim: Entity,
): { leveledUp: boolean; xpGained: number } {
  const reward = getXpReward(victim);
  state.xp += reward;
  let leveledUp = false;
  while (state.xp >= state.toNext) {
    state.xp -= state.toNext;
    player.level += 1;
    state.toNext = Math.round(state.toNext * 1.55);
    player.stats.hpMax += 30;
    player.stats.mpMax += 12;
    player.stats.attack += 3;
    player.stats.defense += 1;
    player.stats.hp = player.stats.hpMax;
    player.stats.mp = player.stats.mpMax;
    leveledUp = true;
  }
  return { leveledUp, xpGained: reward };
}

export interface SkillResult {
  used: boolean;
  reason?: string;
}

export function tryUseSkill(
  player: Entity,
  skill: Skill,
  hooks: CombatHooks,
  scene: THREE.Scene,
  effects: Effect[],
): SkillResult {
  if (skill.cooldownLeft > 0) return { used: false, reason: "On cooldown" };
  if (player.stats.mp < skill.manaCost) return { used: false, reason: "Not enough MP" };

  if (skill.id === "iron_will") {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    applyHeal(player, skill.heal ?? 50, hooks);
    spawnHealEffect(scene, effects, player.position);
    return { used: true };
  }
  if (skill.id === "battle_roar") {
    player.stats.mp = player.stats.mpMax;
    skill.cooldownLeft = skill.cooldown;
    spawnRoarEffect(scene, effects, player.position);
    return { used: true };
  }
  const target = player.attackTarget;
  if (!target || !target.alive) return { used: false, reason: "No target" };
  const dist = player.position.distanceTo(target.position);
  if (dist > skill.range) return { used: false, reason: "Out of range" };

  player.stats.mp -= skill.manaCost;
  skill.cooldownLeft = skill.cooldown;

  if (skill.id === "wind_slash") {
    spawnProjectile(scene, effects, player.position, target.position, 0xa0d8ff, 24, () => {
      performAttack(player, target, hooks, skill.damage);
    });
  } else if (skill.id === "fireball") {
    spawnProjectile(scene, effects, player.position, target.position, 0xff7a2a, 18, () => {
      spawnExplosion(scene, effects, target.position);
      performAttack(player, target, hooks, skill.damage);
    });
  } else {
    performAttack(player, target, hooks, skill.damage);
    spawnSlashEffect(scene, effects, target.position);
  }
  return { used: true };
}

export interface Effect {
  obj: THREE.Object3D;
  update: (dt: number) => boolean;
  cleanup: () => void;
}

export function tickEffects(scene: THREE.Scene, effects: Effect[], dt: number): void {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    if (!e.update(dt)) {
      e.cleanup();
      scene.remove(e.obj);
      effects.splice(i, 1);
    }
  }
}

function spawnSlashEffect(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.7, 16),
    new THREE.MeshBasicMaterial({
      color: 0xfff0a0,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  ring.position.copy(pos).y += 1.0;
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  let life = 0.4;
  effects.push({
    obj: ring,
    update(dt) {
      life -= dt;
      ring.scale.multiplyScalar(1 + dt * 4);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, life / 0.4);
      return life > 0;
    },
    cleanup() {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    },
  });
}

function spawnHealEffect(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
): void {
  const geom = new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x88ff88,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const cyl = new THREE.Mesh(geom, mat);
  cyl.position.copy(pos).y += 1.1;
  scene.add(cyl);
  let life = 1.0;
  effects.push({
    obj: cyl,
    update(dt) {
      life -= dt;
      cyl.rotation.y += dt * 4;
      mat.opacity = Math.max(0, life * 0.6);
      cyl.scale.x = cyl.scale.z = 1 + (1 - life) * 0.6;
      return life > 0;
    },
    cleanup() {
      geom.dispose();
      mat.dispose();
    },
  });
}

function spawnRoarEffect(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.6, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffd24a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  ring.position.copy(pos).y = 0.05;
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  let life = 0.9;
  effects.push({
    obj: ring,
    update(dt) {
      life -= dt;
      ring.scale.multiplyScalar(1 + dt * 8);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, life);
      return life > 0;
    },
    cleanup() {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    },
  });
}

function spawnProjectile(
  scene: THREE.Scene,
  effects: Effect[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: number,
  speed: number,
  onHit: () => void,
): void {
  const geo = new THREE.SphereGeometry(0.25, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  const start = from.clone().add(new THREE.Vector3(0, 1.2, 0));
  const end = to.clone().add(new THREE.Vector3(0, 1.2, 0));
  mesh.position.copy(start);

  const light = new THREE.PointLight(color, 0.8, 6);
  mesh.add(light);
  scene.add(mesh);

  const totalDist = start.distanceTo(end);
  let traveled = 0;
  let hit = false;

  effects.push({
    obj: mesh,
    update(dt) {
      if (hit) return false;
      const step = speed * dt;
      traveled += step;
      const t = Math.min(1, traveled / totalDist);
      mesh.position.lerpVectors(start, end, t);
      if (t >= 1) {
        hit = true;
        onHit();
        return false;
      }
      return true;
    },
    cleanup() {
      geo.dispose();
      mat.dispose();
    },
  });
}

function spawnExplosion(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
): void {
  const geo = new THREE.SphereGeometry(0.5, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos).y += 1.0;
  scene.add(mesh);
  let life = 0.5;
  effects.push({
    obj: mesh,
    update(dt) {
      life -= dt;
      mesh.scale.multiplyScalar(1 + dt * 6);
      mat.opacity = Math.max(0, life * 1.8);
      return life > 0;
    },
    cleanup() {
      geo.dispose();
      mat.dispose();
    },
  });
}
