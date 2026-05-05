import * as THREE from "three";
import type {
  AIState,
  Entity,
  MobTemplate,
  RaceDef,
  Stats,
} from "./types";
import { buildRaceMesh } from "./races";
import { getMob } from "./mobs";

let nextId = 1;

function makeHpBarSprite(): { bg: THREE.Sprite; fill: THREE.Sprite } {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = 64;
  bgCanvas.height = 8;
  const bgCtx = bgCanvas.getContext("2d")!;
  bgCtx.fillStyle = "rgba(0,0,0,0.85)";
  bgCtx.fillRect(0, 0, 64, 8);
  bgCtx.strokeStyle = "#2a2418";
  bgCtx.lineWidth = 1;
  bgCtx.strokeRect(0.5, 0.5, 63, 7);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  const bg = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: bgTex, depthTest: false, transparent: true }),
  );
  bg.scale.set(2.0, 0.25, 1);
  bg.renderOrder = 999;

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = 62;
  fillCanvas.height = 6;
  const fctx = fillCanvas.getContext("2d")!;
  const grad = fctx.createLinearGradient(0, 0, 0, 6);
  grad.addColorStop(0, "#ff7070");
  grad.addColorStop(1, "#a82525");
  fctx.fillStyle = grad;
  fctx.fillRect(0, 0, 62, 6);
  const fillTex = new THREE.CanvasTexture(fillCanvas);
  fillTex.colorSpace = THREE.SRGBColorSpace;
  const fillMat = new THREE.SpriteMaterial({
    map: fillTex,
    depthTest: false,
    transparent: true,
  });
  const fill = new THREE.Sprite(fillMat);
  fill.scale.set(1.94, 0.18, 1);
  fill.center.set(0, 0.5);
  fill.position.x = -0.97;
  fill.renderOrder = 1000;

  return { bg, fill };
}

function buildHumanoidMesh(palette: {
  primary: number;
  accent: number;
  cloth?: number;
}): THREE.Group {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: palette.primary });
  const accentMat = new THREE.MeshLambertMaterial({ color: palette.accent });
  const clothMat = new THREE.MeshLambertMaterial({
    color: palette.cloth ?? palette.accent,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), clothMat);
  torso.position.y = 1.2;
  torso.castShadow = true;
  g.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.55), accentMat);
  belt.position.y = 0.75;
  belt.castShadow = true;
  g.add(belt);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.4), accentMat);
  legL.position.set(-0.22, 0.43, 0);
  legL.castShadow = true;
  g.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.22;
  g.add(legR);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.85, 0.3), bodyMat);
  armL.position.set(-0.55, 1.2, 0);
  armL.castShadow = true;
  g.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.55;
  g.add(armR);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), bodyMat);
  head.position.y = 2.0;
  head.castShadow = true;
  g.add(head);

  const facing = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  facing.position.set(0, 2.05, 0.3);
  g.add(facing);

  return g;
}

function buildQuadrupedMesh(palette: {
  primary: number;
  accent: number;
}): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: palette.primary });
  const accentMat = new THREE.MeshLambertMaterial({ color: palette.accent });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.7), bodyMat);
  body.position.y = 0.85;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), bodyMat);
  head.position.set(0.85, 1.05, 0);
  head.castShadow = true;
  g.add(head);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.18), bodyMat);
  tail.position.set(-0.95, 0.95, 0);
  tail.castShadow = true;
  g.add(tail);

  for (const sx of [-0.5, 0.55]) {
    for (const sz of [-0.25, 0.25]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.6, 0.18),
        accentMat,
      );
      leg.position.set(sx, 0.3, sz);
      leg.castShadow = true;
      g.add(leg);
    }
  }
  return g;
}

function defaultStats(): Stats {
  return {
    hp: 100,
    hpMax: 100,
    mp: 50,
    mpMax: 50,
    attack: 14,
    defense: 4,
    attackRange: 2.0,
    attackSpeed: 1.6,
  };
}

export interface PlayerCreateOptions {
  race: RaceDef;
  name: string;
  baseStats: Stats;
}

export function createPlayer(
  scene: THREE.Scene,
  opts?: PlayerCreateOptions,
): Entity {
  const group = opts ? buildRaceMesh(opts.race) : buildHumanoidMesh({
    primary: 0xddc7a8,
    accent: 0x6e4a1e,
    cloth: 0x3a5e9e,
  });

  const cape = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 1.1),
    new THREE.MeshLambertMaterial({
      color: 0x9a2828,
      side: THREE.DoubleSide,
    }),
  );
  cape.position.set(0, 1.25, -0.3);
  cape.rotation.x = -0.05;
  cape.castShadow = true;
  group.add(cape);

  const sword = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.2, 0.04),
    new THREE.MeshLambertMaterial({ color: 0xc0c0d0 }),
  );
  sword.position.set(0.65, 1.4, 0.25);
  sword.rotation.x = -0.6;
  sword.castShadow = true;
  group.add(sword);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.06, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x8a6a1e }),
  );
  guard.position.copy(sword.position);
  guard.position.y -= 0.55;
  guard.rotation.copy(sword.rotation);
  group.add(guard);

  scene.add(group);

  const stats = opts?.baseStats ?? defaultStats();
  if (!opts) {
    stats.hp = 200;
    stats.hpMax = 200;
    stats.mp = 100;
    stats.mpMax = 100;
    stats.attack = 18;
    stats.defense = 6;
  }

  const e: Entity = {
    id: `player-${nextId++}`,
    kind: "player",
    name: opts?.name ?? "Adventurer",
    level: 1,
    stats,
    group,
    position: group.position,
    velocity: new THREE.Vector3(),
    target: null,
    moveTarget: null,
    attackTarget: null,
    attackCooldown: 0,
    alive: true,
  };
  return e;
}

/* ---------------- Mobs ---------------- */

export const ENEMY_TEMPLATES: Record<string, { name: string; level: number }> =
  {};

function statsFromMob(t: MobTemplate): Stats {
  const base = defaultStats();
  return {
    hp: t.stats.hpMax ?? base.hpMax,
    hpMax: t.stats.hpMax ?? base.hpMax,
    mp: 0,
    mpMax: 0,
    attack: t.stats.attack ?? base.attack,
    defense: t.stats.defense ?? base.defense,
    attackRange: t.stats.attackRange ?? base.attackRange,
    attackSpeed: t.stats.attackSpeed ?? base.attackSpeed,
  };
}

export function createMob(
  scene: THREE.Scene,
  mobId: string,
  spawn: THREE.Vector3,
): Entity | null {
  const t = getMob(mobId);
  if (!t) return null;
  const group =
    t.mesh === "quadruped"
      ? buildQuadrupedMesh(t.palette)
      : buildHumanoidMesh(t.palette);
  group.scale.setScalar(t.scale);
  group.position.copy(spawn);
  scene.add(group);

  const hpBar = makeHpBarSprite();
  const headY = (t.mesh === "quadruped" ? 1.6 : 2.7) * t.scale;
  hpBar.bg.position.set(0, headY, 0);
  hpBar.fill.position.set(-0.97, headY, 0);
  group.add(hpBar.bg);
  group.add(hpBar.fill);

  const ai: AIState = {
    spawn: spawn.clone(),
    aggroRange: 9,
    leashRange: 22,
    patrolRadius: 6,
    nextPatrolAt: 0,
  };

  const e: Entity = {
    id: `${mobId}-${nextId++}`,
    kind: "enemy",
    name: t.name,
    level: t.level,
    stats: statsFromMob(t),
    group,
    position: group.position,
    velocity: new THREE.Vector3(),
    target: null,
    moveTarget: null,
    attackTarget: null,
    attackCooldown: 0,
    alive: true,
    hpBar,
    ai,
    respawn: { at: 0, spawn: spawn.clone() },
    mobKind: mobId,
  };
  return e;
}

/** Build a simple bot-player mesh visible on the world map. */
export function createBotPlayer(
  scene: THREE.Scene,
  spawn: THREE.Vector3,
  color: number,
  name: string,
  level: number,
): Entity {
  const group = buildHumanoidMesh({
    primary: 0xe0c8a0,
    accent: 0x4a3a28,
    cloth: color,
  });
  group.position.copy(spawn);
  scene.add(group);

  const stats = defaultStats();
  stats.hp = 60 + level * 8;
  stats.hpMax = stats.hp;

  const e: Entity = {
    id: `bot-${nextId++}`,
    kind: "npc",
    name,
    level,
    stats,
    group,
    position: group.position,
    velocity: new THREE.Vector3(),
    target: null,
    moveTarget: null,
    attackTarget: null,
    attackCooldown: 0,
    alive: true,
  };
  return e;
}

export function getXpReward(_e: Entity): number {
  return 20;
}

export function updateHpBar(e: Entity): void {
  if (!e.hpBar) return;
  const pct = Math.max(0, Math.min(1, e.stats.hp / e.stats.hpMax));
  e.hpBar.fill.scale.x = 1.94 * pct;
}
