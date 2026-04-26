import * as THREE from "three";
import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { createWorld, WORLD_SIZE, isInsideObstacle } from "./world";
import {
  createEnemy,
  createPlayer,
  ENEMY_TEMPLATES,
  updateHpBar,
} from "./entities";
import { createHUD } from "./hud";
import { tickSkills } from "./skills";
import {
  applyHeal,
  grantXP,
  newXPState,
  performAttack,
  tickBuffs,
  tickEffects,
  tryUseSkill,
  type Effect,
} from "./combat";
import { tickEnemyAI } from "./ai";
import { startAttackAnim, tickAnimation } from "./animation";
import { createInputController } from "./input";
import { moveEntity } from "./movement";
import type { Entity, Skill } from "./types";
import { CLASSES, type ClassId } from "./classes";
import { SKILL_NODES } from "./skilltree";
import { getSavedClass, showClassSelect, clearSavedClass } from "./ui_classselect";
import { createSkillTreeUI } from "./ui_skilltree";
import { Inventory } from "./inventory";
import { rollDrops, ITEMS, type ItemDef } from "./items";
import {
  spawnGroundItem,
  tickGroundItems,
  despawnGroundItem,
  type GroundItem,
} from "./drops";
import { tickObelisk, type Settlement } from "./settlements";
import { createInventoryUI } from "./ui_inventory";
import { createCraftingUI } from "./ui_crafting";
import { createTeleportUI, fadeTeleport } from "./ui_teleport";

registerSW({ immediate: true });

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  matchMedia("(pointer: coarse)").matches;
if (isTouch) document.body.classList.add("touch");

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const world = createWorld();
const scene = world.scene;

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);

let cameraDistance = 22;
let cameraYaw = 0;
const CAM_PITCH = 0.95; // ~ tan-1 of height/horiz
let cameraShakeTime = 0;
let cameraShakeIntensity = 0;
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();

function shake(intensity: number, duration: number) {
  cameraShakeIntensity = Math.max(cameraShakeIntensity, intensity);
  cameraShakeTime = Math.max(cameraShakeTime, duration);
}

const player = createPlayer(scene);
player.position.set(0, 0, 0);
player.progress = {
  classId: "knight",
  learned: new Set(),
  skillPoints: 0,
  buffs: {},
};

function applyClassToPlayer(classId: ClassId) {
  const def = CLASSES[classId];
  player.progress!.classId = classId;
  player.name = def.name;
  player.stats.hpMax = def.baseStats.hpMax;
  player.stats.mpMax = def.baseStats.mpMax;
  player.stats.attack = def.baseStats.attack;
  player.stats.defense = def.baseStats.defense;
  player.stats.attackRange = def.baseStats.attackRange;
  player.stats.attackSpeed = def.baseStats.attackSpeed;
  player.stats.hp = player.stats.hpMax;
  player.stats.mp = player.stats.mpMax;
  // grant starting skills
  for (const id of def.startingSkills) {
    player.progress!.learned.add(id);
  }
  // give 1 starting point
  if (player.progress!.skillPoints < 1) {
    player.progress!.skillPoints = Math.max(player.progress!.skillPoints, 1);
  }
}

const enemies: Entity[] = [];
// Spawn enemies from biome-based zones defined by world
for (const zone of world.spawnZones) {
  for (let i = 0; i < zone.count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * zone.radius;
    const px = zone.center.x + Math.cos(a) * r;
    const pz = zone.center.z + Math.sin(a) * r;
    const enemyType = zone.enemies[
      Math.floor(Math.random() * zone.enemies.length)
    ];
    const enemy = createEnemy(
      scene,
      enemyType as keyof typeof ENEMY_TEMPLATES,
      new THREE.Vector3(px, 0, pz),
    );
    enemies.push(enemy);
  }
}

let skills: Skill[] = [];
const xpState = newXPState();

function rebuildHotbar() {
  const learned = player.progress?.learned ?? new Set<string>();
  const ordered: Skill[] = [];
  // keep existing skill cooldown state if same id
  const oldById = new Map(skills.map((s) => [s.id, s]));
  for (const id of learned) {
    const node = SKILL_NODES[id];
    if (!node) continue;
    const existing = oldById.get(id);
    if (existing) {
      ordered.push(existing);
    } else {
      ordered.push({ ...node.skill, cooldownLeft: 0 });
    }
  }
  // sort: tier asc, then minLevel asc
  ordered.sort((a, b) => {
    const na = SKILL_NODES[a.id];
    const nb = SKILL_NODES[b.id];
    if (na.tier !== nb.tier) return na.tier - nb.tier;
    return na.minLevel - nb.minLevel;
  });
  // assign hotkeys 1..5
  ordered.forEach((s, i) => {
    s.hotkey = i < 5 ? String(i + 1) : "";
  });
  skills = ordered.slice(0, 8);
}

const hud = createHUD();
hud.setPlayer(player);
hud.updatePlayerStats(player, xpState.xp, xpState.toNext);
rebuildHotbar();
hud.updateSkills(skills, player.stats.mp);

const effects: Effect[] = [];

// target reticle
const targetRing = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 1.05, 32),
  new THREE.MeshBasicMaterial({
    color: 0xff5050,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthTest: false,
  }),
);
targetRing.rotation.x = -Math.PI / 2;
targetRing.visible = false;
targetRing.renderOrder = 5;
scene.add(targetRing);

// movement target marker
const moveMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.35, 0.5, 24),
  new THREE.MeshBasicMaterial({
    color: 0xffe07a,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: false,
  }),
);
moveMarker.rotation.x = -Math.PI / 2;
moveMarker.visible = false;
moveMarker.renderOrder = 4;
scene.add(moveMarker);
let moveMarkerLife = 0;

const hooks = {
  onDamage(target: Entity, amount: number, isCrit: boolean) {
    hud.spawnFloat(
      {
        worldPos: target.position,
        text: String(amount),
        type: isCrit ? "crit" : "dmg",
      },
      camera,
    );
    if (target === player) {
      hud.log(`You take ${amount} damage`, "dmg");
      vibrate(20);
    } else if (
      player.attackTarget === target ||
      target.attackTarget === player
    ) {
      hud.log(`${target.name} takes ${amount}${isCrit ? " (crit!)" : ""}`, "dmg");
    }
  },
  onHeal(target: Entity, amount: number) {
    if (amount <= 0) return;
    hud.spawnFloat(
      { worldPos: target.position, text: `+${amount}`, type: "heal" },
      camera,
    );
    if (target === player) hud.log(`You are healed for ${amount}`, "heal");
  },
  onKill(killer: Entity, victim: Entity) {
    if (killer === player) {
      const r = grantXP(player, xpState, victim);
      hud.log(`Defeated ${victim.name} (+${r.xpGained} XP)`, "xp");
      if (r.leveledUp) {
        if (player.progress) player.progress.skillPoints += 1;
        hud.log(
          `Level up! You are now Lv. ${player.level} (+1 skill point)`,
          "system",
        );
        skillTreeUI.refresh();
        vibrate([20, 40, 20]);
      }
      if (player.attackTarget === victim) player.attackTarget = null;
      // Item drops
      if (victim.enemyType) {
        const drops = rollDrops(victim.enemyType);
        for (const d of drops) {
          const gi = spawnGroundItem(scene, d.id, d.amount, victim.position);
          groundItems.push(gi);
        }
      }
    } else if (victim === player) {
      hud.log(`You were defeated by ${killer.name}`, "system");
      respawnPlayer();
    }
    if (victim !== player) {
      // hide after death animation finishes
      setTimeout(() => {
        if (!victim.alive) victim.group.visible = false;
      }, 800);
    }
  },
  shake,
};

function vibrate(pattern: number | number[]): void {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

function respawnPlayer() {
  player.position.set(0, 0, 0);
  player.stats.hp = player.stats.hpMax;
  player.stats.mp = player.stats.mpMax;
  player.alive = true;
  player.attackTarget = null;
  player.moveTarget = null;
  if (player.anim) {
    player.anim.state = "idle";
    player.anim.stateTime = 0;
  }
  if (player.rig) {
    player.rig.body.rotation.x = 0;
    player.rig.body.position.y = 0;
  }
  hud.log("You respawned at the starting point.", "system");
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pointerToWorld(
  clientX: number,
  clientY: number,
): { hit: THREE.Vector3 | null; enemy: Entity | null } {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const enemyMeshes: THREE.Object3D[] = [];
  for (const e of enemies) if (e.alive) enemyMeshes.push(e.group);
  const enemyHits = raycaster.intersectObjects(enemyMeshes, true);
  if (enemyHits.length > 0) {
    let g: THREE.Object3D | null = enemyHits[0].object;
    while (g && g.parent && !enemies.find((e) => e.group === g)) {
      g = g.parent;
    }
    const found = enemies.find((e) => e.group === g) ?? null;
    if (found && found.alive) {
      return { hit: enemyHits[0].point, enemy: found };
    }
  }

  const groundHit = raycaster.intersectObject(world.ground, false);
  if (groundHit.length > 0) {
    return { hit: groundHit[0].point, enemy: null };
  }
  return { hit: null, enemy: null };
}

function tryUseSkillByIndex(i: number) {
  const skill = skills[i];
  if (!skill) return;
  const result = tryUseSkill(player, skill, hooks, scene, effects, enemies);
  if (!result.used && result.reason) {
    hud.log(`${skill.name}: ${result.reason}`, "system");
  } else if (result.used) {
    hud.log(`Used ${skill.name}`, "system");
    vibrate(15);
  }
}

hud.onSkillClick(tryUseSkillByIndex);

const skillTreeUI = createSkillTreeUI(player, (node) => {
  hud.log(`Learned ${node.skill.name}`, "xp");
  rebuildHotbar();
  hud.updateSkills(skills, player.stats.mp);
});
const skillsBtn = document.getElementById("skills-button");
skillsBtn?.addEventListener("click", () => skillTreeUI.toggle());

// ---- Inventory ----
const inventory = new Inventory();
inventory.add("potion_hp", 3);
inventory.add("potion_mp", 2);

const groundItems: GroundItem[] = [];

function useItem(def: ItemDef): boolean {
  const eff = def.effect;
  if (!eff) return false;
  if (eff.hp) {
    const before = player.stats.hp;
    player.stats.hp = Math.min(player.stats.hpMax, player.stats.hp + eff.hp);
    hud.log(`Restored ${player.stats.hp - before} HP`, "heal");
  }
  if (eff.mp) {
    const before = player.stats.mp;
    player.stats.mp = Math.min(player.stats.mpMax, player.stats.mp + eff.mp);
    hud.log(`Restored ${player.stats.mp - before} MP`, "system");
  }
  if (eff.attackBonus) {
    player.stats.attack += eff.attackBonus;
    hud.log(`+${eff.attackBonus} Attack (permanent)`, "xp");
  }
  if (eff.defenseBonus) {
    player.stats.defense += eff.defenseBonus;
    hud.log(`+${eff.defenseBonus} Defense (permanent)`, "xp");
  }
  if (eff.hpMaxBonus) {
    player.stats.hpMax += eff.hpMaxBonus;
    player.stats.hp += eff.hpMaxBonus;
    hud.log(`+${eff.hpMaxBonus} Max HP (permanent)`, "xp");
  }
  if (eff.mpMaxBonus) {
    player.stats.mpMax += eff.mpMaxBonus;
    player.stats.mp += eff.mpMaxBonus;
    hud.log(`+${eff.mpMaxBonus} Max MP (permanent)`, "xp");
  }
  hud.setPlayer(player);
  return true;
}

const inventoryUI = createInventoryUI({
  inv: inventory,
  onUse: useItem,
  log: (m) => hud.log(m, "system"),
});
const craftingUI = createCraftingUI({
  inv: inventory,
  log: (m) => hud.log(m, "system"),
  onCrafted: () => inventoryUI.refresh(),
});
const teleportUI = createTeleportUI({
  settlements: world.settlements,
  onTeleport: (s) => {
    fadeTeleport(() => {
      player.position.set(s.position.x, 0, s.position.z + 4);
      camera.position.set(
        player.position.x + 12,
        camera.position.y,
        player.position.z + 14,
      );
      hud.log(`Teleported to ${s.name}`, "system");
    });
  },
});

const inventoryBtn = document.getElementById("inventory-button");
inventoryBtn?.addEventListener("click", () => inventoryUI.toggle());

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "k") skillTreeUI.toggle();
  if (e.key.toLowerCase() === "i") inventoryUI.toggle();
  if (e.key === "Escape") {
    inventoryUI.close();
    craftingUI.close();
    teleportUI.close();
  }
  if (e.key.toLowerCase() === "f") tryInteract();
});

function findCurrentSettlementId(): string {
  let nearest = world.settlements[0];
  let best = Infinity;
  for (const s of world.settlements) {
    const d = s.position.distanceTo(player.position);
    if (d < best) { best = d; nearest = s; }
  }
  return nearest.id;
}

function nearestObelisk(): { settlement: Settlement; distance: number } | null {
  let best: { settlement: Settlement; distance: number } | null = null;
  for (const o of world.obelisks) {
    const d = o.group.position.distanceTo(player.position);
    if (!best || d < best.distance) best = { settlement: o.settlement, distance: d };
  }
  return best;
}

function tryInteract(): void {
  const ob = nearestObelisk();
  if (ob && ob.distance < 4.5) {
    teleportUI.open(findCurrentSettlementId());
    return;
  }
  if (world.crafterPosition.distanceTo(player.position) < 3.5) {
    craftingUI.open();
    return;
  }
}

function updateInteractPrompt(): void {
  const el = document.getElementById("interact-prompt");
  if (!el) return;
  const ob = nearestObelisk();
  if (ob && ob.distance < 4.5) {
    el.textContent = `[F] Travel — ${ob.settlement.name} Obelisk`;
    el.classList.remove("hidden");
    return;
  }
  if (world.crafterPosition.distanceTo(player.position) < 3.5) {
    el.textContent = "[F] Forge & Alchemy";
    el.classList.remove("hidden");
    return;
  }
  el.classList.add("hidden");
}

function tryPickupNearby(): void {
  for (const it of [...groundItems]) {
    if (it.position.distanceTo(player.position) < 1.6) {
      if (inventory.add(it.id, it.amount)) {
        const def = ITEMS[it.id];
        hud.log(
          `Picked up ${def?.icon ?? ""} ${def?.name ?? it.id} ×${it.amount}`,
          "xp",
        );
        despawnGroundItem(scene, groundItems, it);
        if (inventoryUI.isOpen()) inventoryUI.refresh();
      } else {
        hud.log("Inventory is full!", "system");
      }
    }
  }
}

hud.onMenuAction((action) => {
  if (action === "reset") {
    clearSavedClass();
    player.level = 1;
    if (player.progress) {
      player.progress.learned = new Set();
      player.progress.skillPoints = 0;
      player.progress.buffs = {};
    }
    xpState.xp = 0;
    xpState.toNext = 100;
    location.reload();
  }
});

// ---- input controller setup ----
const joyEl = document.getElementById("joystick") as HTMLDivElement | null;
const joyKnob = document.getElementById(
  "joystick-knob",
) as HTMLDivElement | null;
const input = createInputController({
  canvas,
  joystick: joyEl && joyKnob ? { el: joyEl, knob: joyKnob } : null,
});

input.on("skill1", () => tryUseSkillByIndex(0));
input.on("skill2", () => tryUseSkillByIndex(1));
input.on("skill3", () => tryUseSkillByIndex(2));
input.on("skill4", () => tryUseSkillByIndex(3));
input.on("skill5", () => tryUseSkillByIndex(4));
input.on("target_next", () => targetNext());
input.on("deselect", () => {
  player.attackTarget = null;
  player.moveTarget = null;
});
input.on("attack_held", () => {
  if (player.attackTarget && player.attackTarget.alive) {
    /* let main loop attack */
  } else {
    targetNext();
  }
});

input.setOnTapWorld((cx, cy) => {
  const { hit, enemy } = pointerToWorld(cx, cy);
  if (enemy) {
    player.attackTarget = enemy;
    player.moveTarget = enemy.position.clone();
    hud.log(`Targeted ${enemy.name}`, "system");
    vibrate(8);
  } else if (hit) {
    player.attackTarget = null;
    player.moveTarget = hit.clone();
    moveMarker.position.copy(hit);
    moveMarker.position.y = 0.04;
    moveMarker.visible = true;
    moveMarkerLife = 0.6;
    spawnTapRipple(cx, cy);
  }
});

function spawnTapRipple(x: number, y: number) {
  const r = document.createElement("div");
  r.className = "tap-ripple";
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// canvas mouse click → tap world (so desktop click = move/target)
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse") {
    if (e.button === 2) {
      player.attackTarget = null;
      return;
    }
    if (e.button !== 0) return;
    const { hit, enemy } = pointerToWorld(e.clientX, e.clientY);
    if (enemy) {
      player.attackTarget = enemy;
      player.moveTarget = enemy.position.clone();
      hud.log(`Targeted ${enemy.name}`, "system");
    } else if (hit) {
      player.attackTarget = null;
      player.moveTarget = hit.clone();
      moveMarker.position.copy(hit);
      moveMarker.position.y = 0.04;
      moveMarker.visible = true;
      moveMarkerLife = 0.6;
    }
  }
});

// touch action buttons
const btnAttack = document.getElementById("btn-attack");
const btnTarget = document.getElementById("btn-target");
const btnDeselect = document.getElementById("btn-deselect");
btnAttack?.addEventListener("click", () => {
  if (!player.attackTarget || !player.attackTarget.alive) targetNext();
  vibrate(15);
});
btnTarget?.addEventListener("click", () => {
  targetNext();
  vibrate(10);
});
btnDeselect?.addEventListener("click", () => {
  player.attackTarget = null;
  player.moveTarget = null;
  vibrate(8);
});

function targetNext() {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = e.position.distanceTo(player.position);
    if (e === player.attackTarget) continue;
    if (d < bestD && d < 30) {
      bestD = d;
      best = e;
    }
  }
  if (best) {
    player.attackTarget = best;
    hud.log(`Targeted ${best.name}`, "system");
    vibrate(8);
  }
}

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

let lastTime = performance.now() / 1000;

function tick() {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - lastTime);
  lastTime = now;

  input.consume();

  // drain camera deltas
  cameraDistance = THREE.MathUtils.clamp(
    cameraDistance + input.state.zoomDelta * 1.5,
    10,
    40,
  );
  cameraYaw += input.state.rotateDelta * dt * 2;
  input.state.zoomDelta = 0;
  input.state.rotateDelta = 0;

  tickSkills(skills, dt);
  tickEffects(scene, effects, dt);
  tickBuffs(player, dt, hooks);

  if (player.attackTarget && !player.attackTarget.alive) {
    player.attackTarget = null;
  }

  // resolve directional movement from input (world-relative, taking yaw into account)
  let movingFromInput = false;
  if (input.state.moveIntensity > 0.05 && player.alive) {
    const ix = input.state.moveX;
    const iy = input.state.moveY;
    const cs = Math.cos(cameraYaw);
    const sn = Math.sin(cameraYaw);
    // screen-y forward maps to -world Z (camera looks toward player from +Z+yaw)
    const wx = ix * cs + iy * sn;
    const wz = -ix * sn + iy * cs;
    const dirLen = Math.hypot(wx, wz);
    if (dirLen > 0.001) {
      const len = Math.min(1, input.state.moveIntensity);
      const speed = 6;
      const step = speed * dt * len;
      const next = player.position
        .clone()
        .add(new THREE.Vector3((wx / dirLen) * step, 0, (wz / dirLen) * step));
      const HALF = WORLD_SIZE / 2 - 2;
      next.x = THREE.MathUtils.clamp(next.x, -HALF, HALF);
      next.z = THREE.MathUtils.clamp(next.z, -HALF, HALF);
      if (!isInsideObstacle(next, world.obstacleBoxes, 0.7)) {
        player.position.x = next.x;
        player.position.z = next.z;
      } else {
        const sx = player.position.clone();
        sx.x = next.x;
        if (!isInsideObstacle(sx, world.obstacleBoxes, 0.7))
          player.position.x = sx.x;
        const sz = player.position.clone();
        sz.z = next.z;
        if (!isInsideObstacle(sz, world.obstacleBoxes, 0.7))
          player.position.z = sz.z;
      }
      const yaw = Math.atan2(wx / dirLen, wz / dirLen);
      const cur = player.group.rotation.y;
      let diff = yaw - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.group.rotation.y = cur + diff * Math.min(1, dt * 12);
      player.moveTarget = null; // direct input cancels click-to-move
      movingFromInput = true;
    }
  }

  if (player.alive) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    const t = player.attackTarget;
    if (t && t.alive) {
      const d = player.position.distanceTo(t.position);
      if (d <= player.stats.attackRange) {
        if (!movingFromInput) player.moveTarget = null;
        if (player.attackCooldown <= 0) {
          startAttackAnim(player);
          performAttack(player, t, hooks);
          player.attackCooldown = player.stats.attackSpeed;
          const dir = new THREE.Vector3()
            .subVectors(t.position, player.position)
            .normalize();
          player.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      } else if (!movingFromInput) {
        player.moveTarget = t.position.clone();
      }
    }
    if (player.stats.mp < player.stats.mpMax) {
      player.stats.mp = Math.min(
        player.stats.mpMax,
        player.stats.mp + 2 * dt,
      );
    }
    if (player.stats.hp < player.stats.hpMax && !t) {
      player.stats.hp = Math.min(
        player.stats.hpMax,
        player.stats.hp + 1.5 * dt,
      );
    }
    if (!movingFromInput) {
      moveEntity(player, 6, dt, world.obstacleBoxes);
    }
  }

  for (const enemy of enemies) {
    if (!enemy.alive) {
      tickAnimation(enemy, dt, false);
      if (enemy.respawn && now >= enemy.respawn.at && enemy.respawn.at > 0) {
        enemy.alive = true;
        enemy.stats.hp = enemy.stats.hpMax;
        enemy.position.copy(enemy.respawn.spawn);
        enemy.group.visible = true;
        enemy.attackTarget = null;
        enemy.moveTarget = null;
        if (enemy.anim) {
          enemy.anim.state = "idle";
          enemy.anim.stateTime = 0;
        }
        if (enemy.rig) {
          enemy.rig.body.rotation.x = 0;
          enemy.rig.body.position.y = 0;
        }
        updateHpBar(enemy);
      }
      continue;
    }
    tickEnemyAI(enemy, player, dt, hooks);
    moveEntity(enemy, 3.2, dt, world.obstacleBoxes);
    tickAnimation(enemy, dt, !!enemy.moveTarget);
  }

  tickAnimation(player, dt, movingFromInput || !!player.moveTarget);

  if (player.stats.hp <= 0 && player.alive) {
    player.alive = false;
    hooks.onKill(
      enemies.find((e) => e.attackTarget === player) ?? player,
      player,
    );
    applyHeal(player, player.stats.hpMax, hooks);
  }

  // movement marker fade
  if (moveMarker.visible) {
    moveMarkerLife -= dt;
    if (moveMarkerLife <= 0) moveMarker.visible = false;
    else {
      const m = moveMarker.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, moveMarkerLife / 0.6) * 0.9;
      moveMarker.rotation.z += dt * 4;
    }
  }

  // ground items, obelisks, auto-pickup, interact prompt
  const t = performance.now() / 1000;
  tickGroundItems(groundItems, t);
  for (const o of world.obelisks) tickObelisk(o, t);
  tryPickupNearby();
  updateInteractPrompt();

  // target ring follow
  if (player.attackTarget && player.attackTarget.alive) {
    targetRing.visible = true;
    targetRing.position.copy(player.attackTarget.position);
    targetRing.position.y = 0.05;
    targetRing.rotation.z += dt * 1.5;
  } else {
    targetRing.visible = false;
  }

  // camera (orbit yaw + zoom + smooth follow + shake)
  const horiz = cameraDistance * Math.cos(CAM_PITCH);
  const cy = cameraDistance * Math.sin(CAM_PITCH);
  _camDesired.set(
    player.position.x + Math.sin(cameraYaw) * horiz,
    player.position.y + cy,
    player.position.z + Math.cos(cameraYaw) * horiz,
  );
  camera.position.lerp(_camDesired, 0.15);

  let shakeX = 0,
    shakeY = 0;
  if (cameraShakeTime > 0) {
    cameraShakeTime = Math.max(0, cameraShakeTime - dt);
    const k = cameraShakeIntensity * (cameraShakeTime > 0 ? 1 : 0);
    shakeX = (Math.random() - 0.5) * k;
    shakeY = (Math.random() - 0.5) * k;
    if (cameraShakeTime <= 0) cameraShakeIntensity = 0;
  }
  camera.position.x += shakeX;
  camera.position.y += shakeY;

  _camTarget.copy(player.position);
  _camTarget.y += 1;
  camera.lookAt(_camTarget);
  world.sun.position.copy(player.position).add(new THREE.Vector3(40, 60, 25));
  world.sun.target.position.copy(player.position);

  hud.updatePlayerStats(player, xpState.xp, xpState.toNext);
  hud.updateTargetStats(player.attackTarget);
  hud.updateSkills(skills, player.stats.mp);
  hud.drawMinimap(player, enemies);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

async function start() {
  // hide loading immediately so the class select can be seen
  hud.hideLoading();

  let saved = getSavedClass();
  if (!saved) {
    saved = await showClassSelect();
  }
  applyClassToPlayer(saved);
  rebuildHotbar();
  hud.setPlayer(player);
  hud.updateSkills(skills, player.stats.mp);
  skillTreeUI.refresh();

  hud.show();
  const cls = CLASSES[saved];
  hud.log(`Welcome, ${cls.name}.`, "system");
  hud.log("Press K (or ✦) to open your skill tree.", "system");
  if (isTouch) {
    hud.log("Joystick: move | tap enemy: target | ⚔ attack", "system");
  } else {
    hud.log("WASD/click: move | Tab: next target | 1–5: skills", "system");
  }
  requestAnimationFrame(tick);
}

camera.position.set(
  player.position.x,
  cameraDistance * Math.sin(CAM_PITCH),
  player.position.z + cameraDistance * Math.cos(CAM_PITCH),
);
camera.lookAt(player.position);
start();
