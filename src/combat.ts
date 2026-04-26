import * as THREE from "three";
import { getXpReward, updateHpBar } from "./entities";
import {
  startAttackAnim,
  startCastAnim,
  startDeathAnim,
  startHitFlash,
} from "./animation";
import type { Entity, Skill } from "./types";

export interface CombatHooks {
  onDamage(target: Entity, amount: number, isCrit: boolean): void;
  onHeal(target: Entity, amount: number): void;
  onKill(killer: Entity, victim: Entity): void;
  shake?: (intensity: number, duration: number) => void;
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
  startHitFlash(target);
  if (isCrit && hooks.shake) hooks.shake(0.5, 0.18);
  if (target.stats.hp <= 0) {
    target.alive = false;
    startDeathAnim(target);
    if (target.respawn) {
      target.respawn.at = performance.now() / 1000 + 14;
    }
    hooks.onKill(attacker, target);
  }
}

export function applyHeal(
  target: Entity,
  amount: number,
  hooks: CombatHooks,
): void {
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
  enemies?: Entity[],
): SkillResult {
  if (skill.cooldownLeft > 0) return { used: false, reason: "On cooldown" };
  if (player.stats.mp < skill.manaCost)
    return { used: false, reason: "Not enough MP" };

  // ---------- self / buff skills ----------
  if (skill.id === "iron_will" || skill.id === "greater_heal") {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.5);
    applyHeal(player, skill.heal ?? 60, hooks);
    spawnHealEffect(scene, effects, player);
    return { used: true };
  }
  if (skill.id === "resurrection") {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.7);
    applyHeal(player, player.stats.hpMax, hooks);
    applyBuff(player, "invuln", 4, { defenseBonus: 9999 });
    spawnHealEffect(scene, effects, player);
    spawnRoarEffect(scene, effects, player.position);
    if (hooks.shake) hooks.shake(0.4, 0.3);
    return { used: true };
  }
  if (skill.id === "battle_roar") {
    player.stats.mp = player.stats.mpMax;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.4);
    spawnRoarEffect(scene, effects, player.position);
    if (hooks.shake) hooks.shake(0.6, 0.3);
    return { used: true };
  }
  if (skill.id === "bless") {
    player.stats.mp = player.stats.mpMax;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.5);
    applyBuff(player, "bless", 12, {
      attackBonus: Math.round(player.stats.attack * 0.2),
    });
    spawnBuffAura(scene, effects, player, 0xfff4b0);
    return { used: true };
  }
  if (skill.id === "rage") {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.4);
    const cost = Math.round(player.stats.hpMax * 0.1);
    player.stats.hp = Math.max(1, player.stats.hp - cost);
    applyBuff(player, "rage", 8, {
      attackBonus: Math.round(player.stats.attack * 0.5),
    });
    spawnBuffAura(scene, effects, player, 0xff5040);
    if (hooks.shake) hooks.shake(0.4, 0.2);
    return { used: true };
  }
  if (skill.id === "berserker") {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.5);
    applyBuff(player, "berserker", 10, {
      attackBonus: Math.round(player.stats.attack * 0.5),
      attackSpeedMult: 0.5,
    });
    spawnBuffAura(scene, effects, player, 0xff2020);
    if (hooks.shake) hooks.shake(0.5, 0.3);
    return { used: true };
  }
  if (skill.id === "shield_wall") {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.4);
    applyHeal(player, Math.round(player.stats.hpMax * 0.25), hooks);
    applyBuff(player, "shield_wall", 6, {
      defenseBonus: Math.round(player.stats.defense * 0.5),
    });
    spawnBuffAura(scene, effects, player, 0xa0c8ff);
    return { used: true };
  }
  if (skill.id === "dash") {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    startCastAnim(player, 0.2);
    applyHeal(player, skill.heal ?? 30, hooks);
    // dash forward 4m
    const fwd = new THREE.Vector3(
      Math.sin(player.group.rotation.y),
      0,
      Math.cos(player.group.rotation.y),
    );
    player.position.add(fwd.multiplyScalar(4));
    spawnDashEffect(scene, effects, player.position);
    return { used: true };
  }

  // ---------- AoE around self ----------
  if (
    skill.id === "earth_quake" ||
    skill.id === "cleave" ||
    skill.id === "whirlwind"
  ) {
    player.stats.mp -= skill.manaCost;
    skill.cooldownLeft = skill.cooldown;
    startAttackAnim(player);
    const radius = skill.range || 3;
    const color = skill.id === "earth_quake" ? 0x8a6633 : 0xfff0a0;
    spawnAoeRing(scene, effects, player.position, radius, color);
    if (enemies) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (e.position.distanceTo(player.position) <= radius) {
          performAttack(player, e, hooks, skill.damage);
        }
      }
    }
    if (hooks.shake) hooks.shake(skill.id === "earth_quake" ? 1.0 : 0.5, 0.3);
    return { used: true };
  }

  // ---------- targeted skills ----------
  const target = player.attackTarget;
  if (!target || !target.alive) return { used: false, reason: "No target" };
  const dist = player.position.distanceTo(target.position);
  if (dist > skill.range) return { used: false, reason: "Out of range" };

  player.stats.mp -= skill.manaCost;
  skill.cooldownLeft = skill.cooldown;

  if (skill.id === "wind_slash") {
    startCastAnim(player, 0.35);
    spawnWindBlade(scene, effects, player.position, target.position, () => {
      performAttack(player, target, hooks, skill.damage);
    }, 0xa0e8ff);
  } else if (skill.id === "ice_lance") {
    startCastAnim(player, 0.4);
    spawnWindBlade(scene, effects, player.position, target.position, () => {
      performAttack(player, target, hooks, skill.damage);
      applyBuff(target, "slow", 3, { speedMult: -0.4 });
    }, 0x88e0ff);
  } else if (skill.id === "arrow_shot" || skill.id === "double_shot") {
    startCastAnim(player, 0.25);
    spawnArrow(scene, effects, player.position, target.position, () => {
      performAttack(player, target, hooks, skill.damage);
    });
    if (skill.id === "double_shot") {
      setTimeout(() => {
        if (!target.alive) return;
        spawnArrow(scene, effects, player.position, target.position, () => {
          performAttack(player, target, hooks, Math.round(skill.damage * 0.6));
        });
      }, 200);
    }
  } else if (skill.id === "poison_arrow") {
    startCastAnim(player, 0.3);
    spawnArrow(scene, effects, player.position, target.position, () => {
      performAttack(player, target, hooks, skill.damage);
      applyBuff(target, "poison", 4, { dotPerSec: skill.damage / 4 });
    }, 0x88ff66);
  } else if (skill.id === "fireball" || skill.id === "flame_burst") {
    startCastAnim(player, 0.5);
    spawnFireball(scene, effects, player.position, target.position, () => {
      spawnExplosion(scene, effects, target.position);
      performAttack(player, target, hooks, skill.damage);
      if (hooks.shake) hooks.shake(0.8, 0.25);
    });
  } else if (skill.id === "blizzard" || skill.id === "rain_of_arrows") {
    startCastAnim(player, 0.6);
    const col = skill.id === "blizzard" ? 0x88e0ff : 0xffe080;
    spawnAoeRing(scene, effects, target.position, 3.5, col);
    if (enemies) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (e.position.distanceTo(target.position) <= 3.5) {
          performAttack(player, e, hooks, skill.damage);
        }
      }
    }
    if (hooks.shake) hooks.shake(0.6, 0.3);
  } else if (skill.id === "meteor") {
    startCastAnim(player, 0.7);
    spawnMeteor(scene, effects, target.position, () => {
      spawnExplosion(scene, effects, target.position);
      if (enemies) {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (e.position.distanceTo(target.position) <= 5) {
            performAttack(player, e, hooks, skill.damage);
          }
        }
      }
      if (hooks.shake) hooks.shake(1.5, 0.5);
    });
  } else if (skill.id === "holy_smite") {
    startCastAnim(player, 0.5);
    spawnHolyPillar(scene, effects, target.position, () => {
      performAttack(player, target, hooks, skill.damage);
      if (hooks.shake) hooks.shake(0.4, 0.2);
    });
  } else if (skill.id === "charge") {
    startCastAnim(player, 0.2);
    // dash player to target
    const dir = new THREE.Vector3()
      .subVectors(target.position, player.position)
      .setY(0)
      .normalize();
    const stopDist = Math.max(0.1, target.position.distanceTo(player.position) - 1.6);
    player.position.add(dir.clone().multiplyScalar(stopDist));
    player.group.rotation.y = Math.atan2(dir.x, dir.z);
    spawnDashEffect(scene, effects, player.position);
    performAttack(player, target, hooks, skill.damage);
    spawnSlashEffect(scene, effects, target.position);
    if (hooks.shake) hooks.shake(0.6, 0.2);
  } else if (skill.id === "shield_bash") {
    startAttackAnim(player);
    performAttack(player, target, hooks, skill.damage);
    spawnSlashEffect(scene, effects, target.position);
    if (hooks.shake) hooks.shake(0.5, 0.18);
  } else {
    startAttackAnim(player);
    performAttack(player, target, hooks, skill.damage);
    spawnSlashEffect(scene, effects, target.position);
    if (hooks.shake) hooks.shake(0.3, 0.12);
  }
  return { used: true };
}

// ---------- buff system ----------
interface BuffData {
  attackBonus?: number;
  defenseBonus?: number;
  speedMult?: number;
  attackSpeedMult?: number;
  dotPerSec?: number;
}

function applyBuff(
  e: Entity,
  id: string,
  duration: number,
  data: BuffData,
): void {
  if (!e.progress) {
    e.progress = {
      classId: "",
      learned: new Set(),
      skillPoints: 0,
      buffs: {},
    };
  }
  const existing = e.progress.buffs[id];
  if (existing) revertBuff(e, id);
  if (data.attackBonus) e.stats.attack += data.attackBonus;
  if (data.defenseBonus) e.stats.defense += data.defenseBonus;
  if (data.attackSpeedMult)
    e.stats.attackSpeed = Math.max(0.1, e.stats.attackSpeed * data.attackSpeedMult);
  e.progress.buffs[id] = {
    until: performance.now() / 1000 + duration,
    data: data as unknown as Record<string, number>,
  };
}

function revertBuff(e: Entity, id: string): void {
  if (!e.progress) return;
  const b = e.progress.buffs[id];
  if (!b) return;
  const data = b.data as unknown as BuffData;
  if (data.attackBonus) e.stats.attack -= data.attackBonus;
  if (data.defenseBonus) e.stats.defense -= data.defenseBonus;
  if (data.attackSpeedMult)
    e.stats.attackSpeed = e.stats.attackSpeed / data.attackSpeedMult;
  delete e.progress.buffs[id];
}

export function tickBuffs(e: Entity, dt: number, hooks: CombatHooks): void {
  if (!e.progress) return;
  const now = performance.now() / 1000;
  for (const id of Object.keys(e.progress.buffs)) {
    const b = e.progress.buffs[id];
    const data = b.data as unknown as BuffData;
    if (data.dotPerSec && e.alive) {
      const dmg = Math.max(1, Math.round(data.dotPerSec * dt));
      e.stats.hp = Math.max(0, e.stats.hp - dmg);
      hooks.onDamage(e, dmg, false);
      if (e.stats.hp <= 0) e.alive = false;
    }
    if (now > b.until) revertBuff(e, id);
  }
}

// ---------- new effects ----------
function spawnArrow(
  scene: THREE.Scene,
  effects: Effect[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  onHit: () => void,
  color = 0xddccaa,
): void {
  const arrow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  const start = from.clone().add(new THREE.Vector3(0, 1.3, 0));
  const end = to.clone().add(new THREE.Vector3(0, 1.2, 0));
  arrow.position.copy(start);
  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  scene.add(arrow);
  const speed = 38;
  const total = start.distanceTo(end);
  let traveled = 0;
  let hit = false;
  effects.push({
    obj: arrow,
    update(dt) {
      if (hit) return false;
      traveled += speed * dt;
      const t = Math.min(1, traveled / total);
      arrow.position.lerpVectors(start, end, t);
      if (t >= 1) {
        hit = true;
        onHit();
        return false;
      }
      return true;
    },
    cleanup() {
      arrow.geometry.dispose();
      (arrow.material as THREE.Material).dispose();
    },
  });
}

function spawnHolyPillar(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
  onHit: () => void,
): void {
  const grp = new THREE.Group();
  grp.position.copy(pos);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 8, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff8c0,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    }),
  );
  pillar.position.y = 4;
  grp.add(pillar);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.1, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfff0a0,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  grp.add(ring);

  const light = new THREE.PointLight(0xfff4c8, 2.2, 14);
  light.position.y = 2;
  grp.add(light);

  scene.add(grp);
  let life = 0.7;
  let fired = false;
  effects.push({
    obj: grp,
    update(dt) {
      life -= dt;
      const t = 1 - life / 0.7;
      (pillar.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.7 - t * 0.7,
      );
      ring.scale.setScalar(1 + t * 1.6);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t);
      if (!fired && t >= 0.2) {
        fired = true;
        onHit();
      }
      return life > 0;
    },
    cleanup() {
      pillar.geometry.dispose();
      (pillar.material as THREE.Material).dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    },
  });
}

function spawnAoeRing(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
  radius: number,
  color: number,
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.4, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(pos);
  ring.position.y = 0.06;
  scene.add(ring);
  let life = 0.6;
  effects.push({
    obj: ring,
    update(dt) {
      life -= dt;
      const t = 1 - life / 0.6;
      ring.scale.setScalar(0.5 + t * radius * 2.2);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t);
      return life > 0;
    },
    cleanup() {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    },
  });
}

function spawnDashEffect(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
): void {
  spawnAoeRing(scene, effects, pos, 1.2, 0xc8ffe0);
}

function spawnBuffAura(
  scene: THREE.Scene,
  effects: Effect[],
  target: Entity,
  color: number,
): void {
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.6, 2.4, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  cyl.position.copy(target.position);
  cyl.position.y += 1.2;
  scene.add(cyl);
  let life = 0.8;
  effects.push({
    obj: cyl,
    update(dt) {
      life -= dt;
      cyl.position.copy(target.position);
      cyl.position.y += 1.2;
      cyl.rotation.y += dt * 4;
      cyl.scale.setScalar(1 + (0.8 - life) * 0.5);
      (cyl.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        life * 0.5,
      );
      return life > 0;
    },
    cleanup() {
      cyl.geometry.dispose();
      (cyl.material as THREE.Material).dispose();
    },
  });
}

function spawnMeteor(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
  onHit: () => void,
): void {
  const grp = new THREE.Group();
  const meteor = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff7022 }),
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff5022,
      transparent: true,
      opacity: 0.55,
    }),
  );
  grp.add(meteor);
  grp.add(halo);
  const light = new THREE.PointLight(0xff8844, 3.5, 16);
  grp.add(light);
  const start = pos.clone().add(new THREE.Vector3(0, 22, 0));
  const end = pos.clone().add(new THREE.Vector3(0, 0.5, 0));
  grp.position.copy(start);
  scene.add(grp);
  let traveled = 0;
  const total = start.distanceTo(end);
  const speed = 28;
  let hit = false;
  effects.push({
    obj: grp,
    update(dt) {
      if (hit) return false;
      traveled += speed * dt;
      const t = Math.min(1, traveled / total);
      grp.position.lerpVectors(start, end, t);
      meteor.rotation.x += dt * 8;
      meteor.rotation.y += dt * 6;
      if (t >= 1) {
        hit = true;
        onHit();
        return false;
      }
      return true;
    },
    cleanup() {
      meteor.geometry.dispose();
      (meteor.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
    },
  });
}

export interface Effect {
  obj: THREE.Object3D;
  update: (dt: number) => boolean;
  cleanup: () => void;
}

export function tickEffects(
  scene: THREE.Scene,
  effects: Effect[],
  dt: number,
): void {
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
  // arc trail at target position
  const arcGeo = new THREE.TorusGeometry(0.7, 0.08, 6, 16, Math.PI * 0.9);
  const arcMat = new THREE.MeshBasicMaterial({
    color: 0xfff0a0,
    transparent: true,
    opacity: 0.95,
  });
  const arc = new THREE.Mesh(arcGeo, arcMat);
  arc.position.copy(pos).y += 1.2;
  arc.rotation.z = Math.random() * Math.PI;
  scene.add(arc);
  let life = 0.35;
  effects.push({
    obj: arc,
    update(dt) {
      life -= dt;
      arc.rotation.z += dt * 6;
      arc.scale.multiplyScalar(1 + dt * 3);
      arcMat.opacity = Math.max(0, life / 0.35);
      return life > 0;
    },
    cleanup() {
      arcGeo.dispose();
      arcMat.dispose();
    },
  });

  // sparks
  const count = 18;
  const sparksGeo = new THREE.BufferGeometry();
  const verts = new Float32Array(count * 3);
  const dirs: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    verts[i * 3] = pos.x;
    verts[i * 3 + 1] = pos.y + 1.0;
    verts[i * 3 + 2] = pos.z;
    dirs.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4,
      ),
    );
  }
  sparksGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  const sparkMat = new THREE.PointsMaterial({
    color: 0xffe580,
    size: 0.15,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
  });
  const sparks = new THREE.Points(sparksGeo, sparkMat);
  scene.add(sparks);
  let sparkLife = 0.5;
  effects.push({
    obj: sparks,
    update(dt) {
      sparkLife -= dt;
      const arr = sparksGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3] += dirs[i].x * dt;
        arr[i * 3 + 1] += dirs[i].y * dt;
        arr[i * 3 + 2] += dirs[i].z * dt;
        dirs[i].y -= 9 * dt;
      }
      sparksGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = Math.max(0, sparkLife / 0.5);
      return sparkLife > 0;
    },
    cleanup() {
      sparksGeo.dispose();
      sparkMat.dispose();
    },
  });
}

function spawnHealEffect(
  scene: THREE.Scene,
  effects: Effect[],
  target: Entity,
): void {
  const grp = new THREE.Group();
  grp.position.copy(target.position);

  const geom = new THREE.CylinderGeometry(0.7, 0.5, 2.4, 24, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x88ff96,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const cyl = new THREE.Mesh(geom, mat);
  cyl.position.y = 1.2;
  grp.add(cyl);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.95, 32),
    new THREE.MeshBasicMaterial({
      color: 0xb0ffaa,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  ring.position.y = 0.05;
  ring.rotation.x = -Math.PI / 2;
  grp.add(ring);

  const partCount = 24;
  const pgeo = new THREE.BufferGeometry();
  const pverts = new Float32Array(partCount * 3);
  const pSpeeds: number[] = [];
  for (let i = 0; i < partCount; i++) {
    const a = (i / partCount) * Math.PI * 2;
    const r = 0.5 + Math.random() * 0.4;
    pverts[i * 3] = Math.cos(a) * r;
    pverts[i * 3 + 1] = Math.random() * 0.4;
    pverts[i * 3 + 2] = Math.sin(a) * r;
    pSpeeds.push(1.5 + Math.random() * 1.5);
  }
  pgeo.setAttribute("position", new THREE.BufferAttribute(pverts, 3));
  const pmat = new THREE.PointsMaterial({
    color: 0xc8ffc0,
    size: 0.18,
    transparent: true,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(pgeo, pmat);
  grp.add(points);

  scene.add(grp);
  let life = 1.1;
  effects.push({
    obj: grp,
    update(dt) {
      life -= dt;
      grp.position.copy(target.position);
      cyl.rotation.y += dt * 3;
      ring.scale.x = ring.scale.y = 1 + (1.1 - life) * 0.5;
      mat.opacity = Math.max(0, life * 0.5);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        life * 0.9,
      );
      const arr = pgeo.attributes.position.array as Float32Array;
      for (let i = 0; i < partCount; i++) {
        arr[i * 3 + 1] += pSpeeds[i] * dt;
        if (arr[i * 3 + 1] > 2.5) arr[i * 3 + 1] = 0;
      }
      pgeo.attributes.position.needsUpdate = true;
      pmat.opacity = Math.max(0, life);
      return life > 0;
    },
    cleanup() {
      geom.dispose();
      mat.dispose();
      (ring.geometry as THREE.BufferGeometry).dispose();
      (ring.material as THREE.Material).dispose();
      pgeo.dispose();
      pmat.dispose();
    },
  });
}

function spawnRoarEffect(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.6, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffd24a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  ring.position.copy(pos);
  ring.position.y = 0.05;
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const ring2 = ring.clone();
  ring2.material = (ring.material as THREE.MeshBasicMaterial).clone();
  scene.add(ring2);
  let life = 1.0;
  effects.push({
    obj: ring,
    update(dt) {
      life -= dt;
      ring.scale.multiplyScalar(1 + dt * 9);
      ring2.scale.multiplyScalar(1 + dt * 6);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, life);
      (ring2.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        life * 0.6,
      );
      return life > 0;
    },
    cleanup() {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      (ring2.material as THREE.Material).dispose();
      // ring2 added to scene separately; remove it manually
      ring2.removeFromParent();
    },
  });
}

function spawnFireball(
  scene: THREE.Scene,
  effects: Effect[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  onHit: () => void,
): void {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd066 }),
  );
  grp.add(core);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0.55,
    }),
  );
  grp.add(halo);
  const light = new THREE.PointLight(0xffaa44, 1.6, 8);
  grp.add(light);

  const start = from.clone().add(new THREE.Vector3(0, 1.4, 0));
  const end = to.clone().add(new THREE.Vector3(0, 1.2, 0));
  grp.position.copy(start);
  scene.add(grp);

  // trail particles
  const trailCount = 30;
  const tgeo = new THREE.BufferGeometry();
  const tverts = new Float32Array(trailCount * 3);
  const tlifeArr: number[] = [];
  for (let i = 0; i < trailCount; i++) {
    tverts[i * 3] = start.x;
    tverts[i * 3 + 1] = start.y;
    tverts[i * 3 + 2] = start.z;
    tlifeArr.push(0);
  }
  tgeo.setAttribute("position", new THREE.BufferAttribute(tverts, 3));
  const tmat = new THREE.PointsMaterial({
    color: 0xff7733,
    size: 0.32,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const trail = new THREE.Points(tgeo, tmat);
  scene.add(trail);

  const totalDist = start.distanceTo(end);
  const speed = 22;
  let traveled = 0;
  let hit = false;
  let writeIdx = 0;

  effects.push({
    obj: grp,
    update(dt) {
      if (hit) return false;
      const step = speed * dt;
      traveled += step;
      const t = Math.min(1, traveled / totalDist);
      grp.position.lerpVectors(start, end, t);
      halo.scale.setScalar(0.9 + Math.sin(performance.now() / 60) * 0.1);
      core.rotation.y += dt * 6;

      const arr = tgeo.attributes.position.array as Float32Array;
      arr[writeIdx * 3] = grp.position.x + (Math.random() - 0.5) * 0.2;
      arr[writeIdx * 3 + 1] = grp.position.y + (Math.random() - 0.5) * 0.2;
      arr[writeIdx * 3 + 2] = grp.position.z + (Math.random() - 0.5) * 0.2;
      tlifeArr[writeIdx] = 0.5;
      writeIdx = (writeIdx + 1) % trailCount;
      tgeo.attributes.position.needsUpdate = true;

      if (t >= 1) {
        hit = true;
        onHit();
        return false;
      }
      return true;
    },
    cleanup() {
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      tgeo.dispose();
      tmat.dispose();
      trail.removeFromParent();
    },
  });
}

function spawnWindBlade(
  scene: THREE.Scene,
  effects: Effect[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  onHit: () => void,
  color = 0xa0e8ff,
): void {
  const blade = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.35),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  const start = from.clone().add(new THREE.Vector3(0, 1.2, 0));
  const end = to.clone().add(new THREE.Vector3(0, 1.2, 0));
  blade.position.copy(start);
  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  blade.lookAt(end);
  blade.rotateY(Math.PI / 2);
  scene.add(blade);

  // glow
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.7),
    new THREE.MeshBasicMaterial({
      color: 0xc8f0ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  glow.position.copy(blade.position);
  glow.rotation.copy(blade.rotation);
  scene.add(glow);

  const speed = 30;
  const totalDist = start.distanceTo(end);
  let traveled = 0;
  let hit = false;
  effects.push({
    obj: blade,
    update(dt) {
      if (hit) return false;
      const step = speed * dt;
      traveled += step;
      const t = Math.min(1, traveled / totalDist);
      blade.position.lerpVectors(start, end, t);
      glow.position.copy(blade.position);
      blade.position.add(dir.clone().multiplyScalar(0));
      if (t >= 1) {
        hit = true;
        onHit();
        return false;
      }
      return true;
    },
    cleanup() {
      blade.geometry.dispose();
      (blade.material as THREE.Material).dispose();
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
      glow.removeFromParent();
    },
  });
}

function spawnExplosion(
  scene: THREE.Scene,
  effects: Effect[],
  pos: THREE.Vector3,
): void {
  const grp = new THREE.Group();
  grp.position.copy(pos);
  grp.position.y += 0.8;

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xfff0a0,
      transparent: true,
      opacity: 1,
    }),
  );
  grp.add(core);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff7833,
      transparent: true,
      opacity: 0.85,
    }),
  );
  grp.add(halo);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.7, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.7;
  grp.add(ring);

  const light = new THREE.PointLight(0xffaa44, 4, 10);
  grp.add(light);

  // shrapnel particles
  const count = 30;
  const sgeo = new THREE.BufferGeometry();
  const sverts = new Float32Array(count * 3);
  const sdirs: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    sverts[i * 3] = 0;
    sverts[i * 3 + 1] = 0;
    sverts[i * 3 + 2] = 0;
    sdirs.push(
      new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.6 + 0.3,
        Math.random() - 0.5,
      )
        .normalize()
        .multiplyScalar(4 + Math.random() * 4),
    );
  }
  sgeo.setAttribute("position", new THREE.BufferAttribute(sverts, 3));
  const smat = new THREE.PointsMaterial({
    color: 0xff9933,
    size: 0.18,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(sgeo, smat);
  grp.add(points);

  scene.add(grp);

  let life = 0.7;
  effects.push({
    obj: grp,
    update(dt) {
      life -= dt;
      const t = 1 - life / 0.7;
      core.scale.setScalar(1 + t * 2.5);
      halo.scale.setScalar(1 + t * 3.5);
      ring.scale.setScalar(1 + t * 5);
      (core.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        1 - t * 1.4,
      );
      (halo.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.85 - t,
      );
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t);
      light.intensity = Math.max(0, 4 * (1 - t));
      const arr = sgeo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3] += sdirs[i].x * dt;
        arr[i * 3 + 1] += sdirs[i].y * dt;
        arr[i * 3 + 2] += sdirs[i].z * dt;
        sdirs[i].y -= 8 * dt;
      }
      sgeo.attributes.position.needsUpdate = true;
      smat.opacity = Math.max(0, 1 - t);
      return life > 0;
    },
    cleanup() {
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      halo.geometry.dispose();
      (halo.material as THREE.Material).dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      sgeo.dispose();
      smat.dispose();
    },
  });
}
