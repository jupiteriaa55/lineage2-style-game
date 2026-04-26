import * as THREE from "three";
import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { createWorld, WORLD_SIZE } from "./world";
import {
  createEnemy,
  createPlayer,
  ENEMY_TEMPLATES,
  updateHpBar,
} from "./entities";
import { createHUD } from "./hud";
import { createSkillBook, tickSkills } from "./skills";
import {
  applyHeal,
  grantXP,
  newXPState,
  performAttack,
  tickEffects,
  tryUseSkill,
  type Effect,
} from "./combat";
import { tickEnemyAI } from "./ai";
import { bobAnimation, moveEntity } from "./movement";
import type { Entity } from "./types";

registerSW({ immediate: true });

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
const cameraOffset = new THREE.Vector3(0, 22, 16);
const cameraLookAhead = new THREE.Vector3();

const player = createPlayer(scene);
player.position.set(0, 0, 0);

const enemies: Entity[] = [];
const SPAWN_POINTS: Array<{ key: keyof typeof ENEMY_TEMPLATES; pos: [number, number] }> = [
  { key: "goblin", pos: [12, 5] },
  { key: "goblin", pos: [15, -3] },
  { key: "goblin", pos: [-10, 8] },
  { key: "goblin", pos: [-14, -2] },
  { key: "wolf", pos: [22, -12] },
  { key: "wolf", pos: [-22, 14] },
  { key: "wolf", pos: [25, 18] },
  { key: "orc", pos: [30, 0] },
  { key: "orc", pos: [-32, -8] },
  { key: "orc", pos: [0, 28] },
  { key: "goblin", pos: [-18, 22] },
  { key: "wolf", pos: [-28, -22] },
];
for (const sp of SPAWN_POINTS) {
  const enemy = createEnemy(
    scene,
    sp.key,
    new THREE.Vector3(sp.pos[0], 0, sp.pos[1]),
  );
  enemies.push(enemy);
}

const skills = createSkillBook();
const xpState = newXPState();

const hud = createHUD();
hud.setPlayer(player);
hud.updatePlayerStats(player, xpState.xp, xpState.toNext);
hud.updateSkills(skills, player.stats.mp);

const effects: Effect[] = [];

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
    } else if (player.attackTarget === target || target.attackTarget === player) {
      hud.log(`${target.name} takes ${amount}${isCrit ? " (crit!)" : ""}`, "dmg");
    }
  },
  onHeal(target: Entity, amount: number) {
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
        hud.log(`Level up! You are now Lv. ${player.level}`, "system");
      }
      if (player.attackTarget === victim) player.attackTarget = null;
    } else if (victim === player) {
      hud.log(`You were defeated by ${killer.name}`, "system");
      respawnPlayer();
    }
    if (victim !== player) {
      victim.group.visible = false;
    }
  },
};

function respawnPlayer() {
  player.position.set(0, 0, 0);
  player.stats.hp = player.stats.hpMax;
  player.stats.mp = player.stats.mpMax;
  player.alive = true;
  player.attackTarget = null;
  player.moveTarget = null;
  hud.log("You respawned at the starting point.", "system");
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pointerToWorld(clientX: number, clientY: number): {
  hit: THREE.Vector3 | null;
  enemy: Entity | null;
} {
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
  const result = tryUseSkill(player, skill, hooks, scene, effects);
  if (!result.used && result.reason) {
    hud.log(`${skill.name}: ${result.reason}`, "system");
  } else if (result.used) {
    hud.log(`Used ${skill.name}`, "system");
  }
}

hud.onSkillClick(tryUseSkillByIndex);
hud.onMenuAction((action) => {
  if (action === "reset") {
    player.level = 1;
    player.stats.hpMax = 200;
    player.stats.mpMax = 100;
    player.stats.attack = 18;
    player.stats.defense = 6;
    player.stats.hp = player.stats.hpMax;
    player.stats.mp = player.stats.mpMax;
    xpState.xp = 0;
    xpState.toNext = 100;
    for (const s of skills) s.cooldownLeft = 0;
    respawnPlayer();
    hud.log("Character reset.", "system");
  }
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 2) {
    player.attackTarget = null;
    return;
  }
  const { hit, enemy } = pointerToWorld(e.clientX, e.clientY);
  if (enemy) {
    player.attackTarget = enemy;
    player.moveTarget = enemy.position.clone();
    hud.log(`Targeted ${enemy.name}`, "system");
  } else if (hit) {
    player.attackTarget = null;
    player.moveTarget = hit.clone();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.key >= "1" && e.key <= "5") {
    tryUseSkillByIndex(parseInt(e.key, 10) - 1);
  } else if (e.key === "Escape") {
    player.attackTarget = null;
    player.moveTarget = null;
  }
});

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

  tickSkills(skills, dt);
  tickEffects(scene, effects, dt);

  if (player.attackTarget && !player.attackTarget.alive) {
    player.attackTarget = null;
  }

  if (player.alive) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    const t = player.attackTarget;
    if (t && t.alive) {
      const d = player.position.distanceTo(t.position);
      if (d <= player.stats.attackRange) {
        player.moveTarget = null;
        if (player.attackCooldown <= 0) {
          performAttack(player, t, hooks);
          player.attackCooldown = player.stats.attackSpeed;
          const dir = new THREE.Vector3()
            .subVectors(t.position, player.position)
            .normalize();
          player.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      } else {
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
    moveEntity(player, 6, dt, world.obstacleBoxes);
    bobAnimation(player, now);
  }

  for (const enemy of enemies) {
    if (!enemy.alive) {
      if (enemy.respawn && now >= enemy.respawn.at && enemy.respawn.at > 0) {
        enemy.alive = true;
        enemy.stats.hp = enemy.stats.hpMax;
        enemy.position.copy(enemy.respawn.spawn);
        enemy.group.visible = true;
        enemy.attackTarget = null;
        enemy.moveTarget = null;
        updateHpBar(enemy);
      }
      continue;
    }
    tickEnemyAI(enemy, player, dt, hooks);
    moveEntity(enemy, 3.2, dt, world.obstacleBoxes);
    bobAnimation(enemy, now * (0.7 + (enemy.id.length % 3) * 0.1));
  }

  if (player.stats.hp <= 0 && player.alive) {
    player.alive = false;
    hooks.onKill(
      enemies.find((e) => e.attackTarget === player) ?? player,
      player,
    );
    applyHeal(player, player.stats.hpMax, hooks);
  }

  cameraLookAhead.copy(player.position);
  const camTarget = cameraLookAhead.clone().add(cameraOffset);
  camera.position.lerp(camTarget, 0.12);
  camera.lookAt(cameraLookAhead);
  world.sun.position.copy(player.position).add(new THREE.Vector3(40, 60, 25));
  world.sun.target.position.copy(player.position);

  hud.updatePlayerStats(player, xpState.xp, xpState.toNext);
  hud.updateTargetStats(player.attackTarget);
  hud.updateSkills(skills, player.stats.mp);
  hud.drawMinimap(player, enemies);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function start() {
  hud.show();
  hud.hideLoading();
  hud.log("Welcome to Chronicle Elfs.", "system");
  hud.log("Click to move. Click an enemy to attack.", "system");
  requestAnimationFrame(tick);
}

const dummy = new THREE.Vector3();
camera.position.copy(player.position).add(cameraOffset);
camera.lookAt(player.position);
void dummy;
void WORLD_SIZE;

if (document.readyState === "complete") {
  start();
} else {
  window.addEventListener("load", start);
}
